/**
 * Onboarding Reminder Candidate Detector
 * AI-3492: Automated email + text reminders for user engagement
 *
 * Identifies users who created an account but have not completed onboarding,
 * buckets them into graduated tiers by account age, and attaches verified SMS
 * phone numbers. Uses batch queries to avoid N+1 patterns (mirrors the
 * re-engagement detector).
 *
 * Idempotency is enforced against the existing `email_sends` table using
 * email_type = 'onboarding_reminder'. Each (tier, channel) pair is logged with
 * email_subtype = `${tier}_${channel}`, so a user receives each tier's nudge at
 * most once per channel.
 */

import { createServiceClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import {
  INCOMPLETE_ONBOARDING_PROFILE_FILTER,
  ONBOARDING_REMINDER_EMAIL_TYPE,
  type OnboardingReminderCandidate,
  type OnboardingReminderTier,
} from './types';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Resolve account age (whole days) to a reminder tier, or null if outside the window. */
export function tierForAge(accountAgeDays: number): OnboardingReminderTier | null {
  if (accountAgeDays >= 7) return 'day7';
  if (accountAgeDays >= 3) return 'day3';
  if (accountAgeDays >= 1) return 'day1';
  return null;
}

/**
 * Find users eligible for onboarding reminders.
 *
 * Process:
 * 1. Fetch profiles where onboarding_completed is false or unset.
 * 2. Bucket by account age into day1 / day3 / day7 tiers.
 * 3. Batch-load verified, opted-in phone numbers from user_sms_preferences.
 * 4. Filter out anyone who already received this tier on the relevant channel.
 *
 * The returned candidate is eligible for AT LEAST one channel. Per-channel
 * idempotency flags are returned separately so the cron can decide what to send.
 */
export async function getOnboardingReminderCandidates(): Promise<
  Array<
    OnboardingReminderCandidate & {
      emailAlreadySent: boolean;
      smsAlreadySent: boolean;
    }
  >
> {
  try {
    const supabase = createServiceClient();

    // Batch 1: profiles that have not completed onboarding.
    // NULL is treated as incomplete, so include both explicit false and absent values.
    const { data: users, error: usersError } = await supabase
      .from('profiles')
      .select('id, name, email, created_at, onboarding_completed')
      .or(INCOMPLETE_ONBOARDING_PROFILE_FILTER);

    if (usersError || !users || users.length === 0) {
      if (usersError) {
        logger.error('[Onboarding Reminders] Failed to fetch profiles', usersError);
      }
      return [];
    }

    const now = Date.now();
    const userIds = users.map((u) => u.id);

    // Batch 2: verified, opted-in phone numbers.
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

    // Batch 3: prior onboarding reminder sends, for idempotency.
    const { data: priorSends } = await supabase
      .from('email_sends')
      .select('user_id, email_subtype')
      .eq('email_type', ONBOARDING_REMINDER_EMAIL_TYPE)
      .in('user_id', userIds);

    const sentSet = new Set<string>(
      (priorSends || []).map(
        (s: { user_id: string; email_subtype: string | null }) =>
          `${s.user_id}:${s.email_subtype ?? ''}`,
      ),
    );

    const candidates: Array<
      OnboardingReminderCandidate & {
        emailAlreadySent: boolean;
        smsAlreadySent: boolean;
      }
    > = [];

    for (const user of users) {
      if (!user.created_at) continue;

      const accountAgeDays = Math.floor(
        (now - new Date(user.created_at).getTime()) / DAY_MS,
      );
      const tier = tierForAge(accountAgeDays);
      if (!tier) continue; // Account too new — give them a day before nudging.

      const phoneNumber = phoneMap.get(user.id) ?? null;
      const hasEmail = !!user.email;

      const emailAlreadySent = sentSet.has(`${user.id}:${tier}_email`);
      const smsAlreadySent = sentSet.has(`${user.id}:${tier}_sms`);

      // Determine what channels are still actionable for this tier.
      const canEmail = hasEmail && !emailAlreadySent;
      const canSms = !!phoneNumber && !smsAlreadySent;
      if (!canEmail && !canSms) continue;

      candidates.push({
        userId: user.id,
        email: user.email ?? null,
        name: user.name || 'Founder',
        accountAgeDays,
        tier,
        phoneNumber,
        emailAlreadySent,
        smsAlreadySent,
      });
    }

    logger.info('[Onboarding Reminders] Found candidates', {
      count: candidates.length,
    });
    return candidates;
  } catch (err) {
    logger.error('[Onboarding Reminders] Error detecting candidates', {
      error: err instanceof Error ? err.message : String(err),
    });
    return [];
  }
}
