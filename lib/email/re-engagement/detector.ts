/**
 * Re-engagement Candidate Detector
 * Phase 31-02: Email Engagement
 * AI-3525: extended with the text/SMS channel for user engagement reminders
 *
 * Identifies inactive users eligible for re-engagement reminders on email
 * and/or SMS. Uses batch queries to avoid N+1 patterns. Per-channel idempotency
 * (14-day cooldown per channel) is enforced against the existing `email_sends`
 * table so a returning user is never double-nudged on the same channel.
 */

import { createServiceClient } from '@/lib/supabase/server';
import { shouldSendEmail } from '@/lib/email/preferences';
import { logger } from '@/lib/logger';
import {
  RE_ENGAGEMENT_EMAIL_TYPE,
  type ReEngagementCandidate,
  type ReEngagementTier,
} from './types';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Resolve days-since-last-activity to a re-engagement tier, or null if active. */
export function tierForInactiveDays(inactiveDays: number): ReEngagementTier | null {
  if (inactiveDays >= 30) return 'day30';
  if (inactiveDays >= 14) return 'day14';
  if (inactiveDays >= 7) return 'day7';
  return null; // Active (< 7 days) — nothing to do.
}

/**
 * Find users eligible for re-engagement reminders.
 *
 * Process:
 * 1. Fetch all onboarded users (with their profile email).
 * 2. Batch-query last activity timestamps from journey_events.
 * 3. Categorize into tiers (day7, day14, day30).
 * 4. Batch-load verified, opted-in phone numbers from user_sms_preferences.
 * 5. Apply per-channel idempotency (14-day cooldown) + email preferences.
 *
 * Each returned candidate is eligible for AT LEAST one channel. The per-channel
 * `emailAlreadySent` / `smsAlreadySent` flags let the cron decide what to send.
 * `emailAlreadySent` also folds in the user's email preference, so an opted-out
 * user is simply skipped on email while SMS can still proceed.
 */
export async function getReEngagementCandidates(): Promise<
  Array<
    ReEngagementCandidate & {
      emailAlreadySent: boolean;
      smsAlreadySent: boolean;
    }
  >
> {
  try {
    const supabase = createServiceClient();

    // Batch 1: Get all onboarded users with their (optional) email
    const { data: users, error: usersError } = await supabase
      .from('profiles')
      .select('id, name, email')
      .eq('onboarding_completed', true);

    if (usersError || !users || users.length === 0) {
      if (usersError) {
        logger.error('[Re-engagement] Failed to fetch users', usersError);
      }
      return [];
    }

    const userIds = users.map((u) => u.id);

    // Batch 2: Get last activity for all users in one query.
    // journey_events ordered by created_at DESC; first occurrence per user = latest.
    const { data: events } = await supabase
      .from('journey_events')
      .select('user_id, created_at')
      .in('user_id', userIds)
      .order('created_at', { ascending: false });

    const activityMap = new Map<string, Date>();
    for (const event of events || []) {
      if (!activityMap.has(event.user_id)) {
        activityMap.set(event.user_id, new Date(event.created_at));
      }
    }

    // Batch 3: verified, opted-in phone numbers for the SMS channel.
    const { data: smsPrefs } = await supabase
      .from('user_sms_preferences')
      .select('user_id, phone_number, phone_verified, checkin_enabled')
      .in('user_id', userIds);

    const phoneMap = new Map<string, string>();
    for (const pref of smsPrefs || []) {
      if (pref.phone_verified && pref.checkin_enabled && pref.phone_number) {
        phoneMap.set(pref.user_id as string, pref.phone_number as string);
      }
    }

    // Batch 4: recent re-engagement sends (last 14 days) for per-channel idempotency.
    const fourteenDaysAgo = new Date(Date.now() - 14 * DAY_MS).toISOString();
    const { data: recentSends } = await supabase
      .from('email_sends')
      .select('user_id, email_subtype, metadata')
      .eq('email_type', RE_ENGAGEMENT_EMAIL_TYPE)
      .gte('created_at', fourteenDaysAgo)
      .in('user_id', userIds);

    const emailSentSet = new Set<string>();
    const smsSentSet = new Set<string>();
    for (const send of recentSends || []) {
      const subtype = (send as { email_subtype: string | null }).email_subtype ?? '';
      const channel = (send as { metadata?: { channel?: string } }).metadata?.channel;
      const isSms = channel === 'sms' || subtype.endsWith('_sms');
      if (isSms) {
        smsSentSet.add(send.user_id as string);
      } else {
        emailSentSet.add(send.user_id as string);
      }
    }

    const now = new Date();
    const candidates: Array<
      ReEngagementCandidate & { emailAlreadySent: boolean; smsAlreadySent: boolean }
    > = [];

    for (const user of users) {
      const lastActivity = activityMap.get(user.id);

      // No activity at all → treat as 30+ days inactive.
      const inactiveDays = lastActivity
        ? Math.floor((now.getTime() - lastActivity.getTime()) / DAY_MS)
        : 999;

      const tier = tierForInactiveDays(inactiveDays);
      if (!tier) continue; // Active user — skip.

      const phoneNumber = phoneMap.get(user.id) ?? null;
      const hasEmail = !!user.email;

      // Email channel: blocked if recently sent OR the user opted out of re_engagement email.
      let emailAlreadySent = !hasEmail || emailSentSet.has(user.id);
      if (hasEmail && !emailAlreadySent) {
        const allowed = await shouldSendEmail(user.id, 're_engagement');
        if (!allowed) emailAlreadySent = true;
      }

      // SMS channel: blocked if no opted-in phone OR recently texted.
      const smsAlreadySent = !phoneNumber || smsSentSet.has(user.id);

      // Drop users with nothing actionable on either channel.
      if (emailAlreadySent && smsAlreadySent) continue;

      candidates.push({
        userId: user.id,
        email: user.email ?? null,
        name: user.name || 'Founder',
        inactiveDays,
        tier,
        phoneNumber,
        emailAlreadySent,
        smsAlreadySent,
      });
    }

    logger.info('[Re-engagement] Found candidates', { count: candidates.length });
    return candidates;
  } catch (err) {
    logger.error('[Re-engagement] Error detecting candidates', {
      error: err instanceof Error ? err.message : String(err),
    });
    return [];
  }
}
