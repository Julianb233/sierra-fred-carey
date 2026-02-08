/**
 * Re-engagement Candidate Detector
 * Phase 31-02: Email Engagement
 *
 * Identifies inactive users eligible for re-engagement emails.
 * Uses batch queries to avoid N+1 patterns.
 */

import { createServiceClient } from '@/lib/supabase/server';
import { shouldSendEmail } from '@/lib/email/preferences';
import { logger } from '@/lib/logger';
import type { ReEngagementCandidate, ReEngagementTier } from './types';

/**
 * Find users eligible for re-engagement emails.
 *
 * Process:
 * 1. Fetch all onboarded users with emails
 * 2. Batch-query last activity timestamps from journey_events
 * 3. Categorize into tiers (day7, day14, day30)
 * 4. Filter by email preferences and idempotency (14-day cooldown)
 */
export async function getReEngagementCandidates(): Promise<ReEngagementCandidate[]> {
  try {
    const supabase = createServiceClient();

    // Batch 1: Get all onboarded users with email
    const { data: users, error: usersError } = await supabase
      .from('profiles')
      .select('id, name, email')
      .eq('onboarding_completed', true)
      .not('email', 'is', null);

    if (usersError || !users || users.length === 0) {
      if (usersError) {
        logger.error('[Re-engagement] Failed to fetch users', usersError);
      }
      return [];
    }

    // Batch 2: Get last activity for all users in one query
    // Query journey_events ordered by created_at DESC, first occurrence per user = latest
    const userIds = users.map((u) => u.id);
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

    const now = new Date();
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();

    // Batch 3: Check recent re-engagement sends for all users
    const { data: recentSends } = await supabase
      .from('email_sends')
      .select('user_id')
      .eq('email_type', 're_engagement')
      .gte('created_at', fourteenDaysAgo)
      .in('user_id', userIds);

    const recentlySentSet = new Set(
      (recentSends || []).map((s: { user_id: string }) => s.user_id),
    );

    const candidates: ReEngagementCandidate[] = [];

    for (const user of users) {
      const lastActivity = activityMap.get(user.id);

      // If no activity at all, treat as 30+ days inactive
      const inactiveDays = lastActivity
        ? Math.floor((now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24))
        : 999;

      // Skip active users (< 7 days)
      if (inactiveDays < 7) continue;

      // Determine tier
      let tier: ReEngagementTier;
      if (inactiveDays >= 30) {
        tier = 'day30';
      } else if (inactiveDays >= 14) {
        tier = 'day14';
      } else {
        tier = 'day7';
      }

      // Skip if already sent re-engagement in last 14 days
      if (recentlySentSet.has(user.id)) continue;

      // Check email preferences
      const shouldSend = await shouldSendEmail(user.id, 're_engagement');
      if (!shouldSend) continue;

      candidates.push({
        userId: user.id,
        email: user.email,
        name: user.name || 'Founder',
        inactiveDays,
        tier,
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
