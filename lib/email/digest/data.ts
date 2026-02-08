/**
 * Weekly Digest Data Aggregation
 * Phase 31: Email Engagement
 *
 * Aggregates founder activity from existing DB tables into a DigestData
 * object for the weekly digest email template.
 *
 * Data sources:
 *  - milestones: completed/in-progress milestones
 *  - journey_events: timeline events
 *  - fred_red_flags: active risk alerts
 *  - agent_tasks: completed agent tasks
 *  - fred_episodic_memory: conversation count
 */

import { createServiceClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { format } from 'date-fns';
import type { DigestData, DigestHighlight } from '../types';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://sahara.app';

/**
 * Aggregate activity data for a user since the given date.
 * Returns null if the user has zero activity (skip empty digests).
 */
export async function getDigestData(
  userId: string,
  since: Date,
): Promise<DigestData | null> {
  try {
    const supabase = createServiceClient();

    // Fetch user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('name, email')
      .eq('id', userId)
      .maybeSingle();

    if (profileError || !profile) {
      logger.warn('[Email:Digest] No profile found', { userId });
      return null;
    }

    const sinceISO = since.toISOString();

    // Run parallel queries against existing tables
    const [
      milestonesResult,
      journeyEventsResult,
      redFlagsResult,
      tasksResult,
      conversationsResult,
    ] = await Promise.all([
      // Completed or in-progress milestones since period
      supabase
        .from('milestones')
        .select('id, title, status')
        .eq('user_id', userId)
        .in('status', ['completed', 'in_progress'])
        .gte('updated_at', sinceISO)
        .limit(10),

      // Journey events since period
      supabase
        .from('journey_events')
        .select('id, event_type, event_data')
        .eq('user_id', userId)
        .gte('created_at', sinceISO)
        .order('created_at', { ascending: false })
        .limit(10),

      // Active red flags
      supabase
        .from('fred_red_flags')
        .select('id')
        .eq('user_id', userId)
        .eq('status', 'active')
        .limit(5),

      // Completed agent tasks since period
      supabase
        .from('agent_tasks')
        .select('id, description')
        .eq('user_id', userId)
        .eq('status', 'complete')
        .gte('updated_at', sinceISO)
        .limit(10),

      // Conversation count since period (count only)
      supabase
        .from('fred_episodic_memory')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('event_type', 'conversation')
        .gte('created_at', sinceISO),
    ]);

    const milestones = milestonesResult.data ?? [];
    const journeyEvents = journeyEventsResult.data ?? [];
    const redFlags = redFlagsResult.data ?? [];
    const completedTasks = tasksResult.data ?? [];
    const conversationCount = conversationsResult.count ?? 0;

    // Calculate total activity
    const totalActivity =
      milestones.length +
      journeyEvents.length +
      completedTasks.length +
      conversationCount;

    if (totalActivity === 0) {
      logger.info('[Email:Digest] No activity for user, skipping digest', { userId });
      return null;
    }

    // Build highlights (max 5)
    const highlights: DigestHighlight[] = [];

    for (const m of milestones.slice(0, 3)) {
      highlights.push({
        title: m.title || 'Milestone',
        description: m.status === 'completed' ? 'Completed!' : 'In progress',
        type: 'milestone',
      });
    }

    for (const t of completedTasks.slice(0, 2)) {
      highlights.push({
        title: t.description || 'Task',
        description: 'Completed',
        type: 'task',
      });
    }

    // Fill remaining slots with journey events
    const remainingSlots = 5 - highlights.length;
    for (const e of journeyEvents.slice(0, remainingSlots)) {
      const eventData = e.event_data as Record<string, unknown> | null;
      highlights.push({
        title: (eventData?.title as string) || e.event_type || 'Event',
        description: (eventData?.description as string) || e.event_type || '',
        type: 'event',
      });
    }

    const founderName = profile.name || 'Founder';

    return {
      founderName,
      weekOf: format(since, 'MMMM d, yyyy'),
      stats: {
        conversationCount,
        completedMilestones: milestones.filter((m) => m.status === 'completed').length,
        completedTasks: completedTasks.length,
        newJourneyEvents: journeyEvents.length,
      },
      highlights,
      activeRedFlags: redFlags.length,
      appUrl: APP_URL,
      unsubscribeUrl: `${APP_URL}/dashboard/settings`,
    };
  } catch (err) {
    logger.error('[Email:Digest] Error aggregating digest data', {
      userId,
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}
