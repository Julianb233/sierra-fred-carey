/**
 * Onboarding Email Notifications — Cron Endpoint
 * Phase 168: Onboarding Email Notifications
 *
 * POST /api/email/onboarding
 *
 * Triggers batch onboarding email jobs:
 * - onboarding_reminder: 24h after signup if not completed
 * - weekly_engagement: founders inactive 7+ days
 * - all: runs both jobs
 *
 * Protected by CRON_SECRET header to prevent unauthorized access.
 *
 * Usage:
 *   curl -X POST https://joinsahara.com/api/email/onboarding \
 *     -H "Authorization: Bearer <CRON_SECRET>" \
 *     -H "Content-Type: application/json" \
 *     -d '{"job": "all"}'
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import {
  sendOnboardingReminders,
  sendWeeklyEngagementEmails,
} from '@/lib/email/onboarding/triggers';

type JobType = 'onboarding_reminder' | 'weekly_engagement' | 'all';

export async function POST(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const job: JobType = body.job || 'all';

    const results: Record<string, { sent: number; skipped: number }> = {};

    if (job === 'onboarding_reminder' || job === 'all') {
      results.onboarding_reminder = await sendOnboardingReminders();
    }

    if (job === 'weekly_engagement' || job === 'all') {
      results.weekly_engagement = await sendWeeklyEngagementEmails();
    }

    logger.info('[Email/Onboarding] Cron job completed', { job, results });

    return NextResponse.json({ success: true, job, results });
  } catch (error) {
    logger.error('[Email/Onboarding] Cron job failed', {
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
