/**
 * Weekly Digest Cron Endpoint
 * Phase 31: Email Engagement
 *
 * Triggered by Vercel Cron every Monday at 10:00 AM UTC.
 * Dispatches weekly digest emails to all opted-in users with activity.
 *
 * GET /api/cron/weekly-digest
 *
 * Authorization: Bearer {CRON_SECRET}
 *
 * Flow per user:
 *  1. Check email preference (shouldSendEmail)
 *  2. Check idempotency (email_sends for this week)
 *  3. Aggregate digest data (getDigestData)
 *  4. Send email (sendEmail with WeeklyDigest template)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getISOWeek, getISOWeekYear } from 'date-fns';
import { createServiceClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { shouldSendEmail } from '@/lib/email/preferences';
import { getDigestData } from '@/lib/email/digest/data';
import { sendEmail } from '@/lib/email/send';
import { WeeklyDigest } from '@/lib/email/templates/weekly-digest';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  logger.info('[Cron: Weekly Digest] Starting scheduled dispatch');

  try {
    // 1. Verify authorization via CRON_SECRET
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      logger.error('[Cron: Weekly Digest] CRON_SECRET not set');
      return NextResponse.json(
        { error: 'Cron not configured', code: 'CRON_NOT_CONFIGURED' },
        { status: 503 },
      );
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      logger.warn('[Cron: Weekly Digest] Invalid or missing authorization');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Check Resend is configured
    if (!process.env.RESEND_API_KEY) {
      logger.error('[Cron: Weekly Digest] RESEND_API_KEY not set');
      return NextResponse.json(
        { error: 'Resend not configured', code: 'RESEND_NOT_CONFIGURED' },
        { status: 503 },
      );
    }

    // 3. Query all eligible users
    const supabase = createServiceClient();
    const { data: users, error: usersError } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('onboarding_completed', true)
      .not('email', 'is', null);

    if (usersError) {
      logger.error('[Cron: Weekly Digest] Failed to query users', { error: usersError });
      return NextResponse.json(
        { error: 'Failed to query users' },
        { status: 500 },
      );
    }

    if (!users || users.length === 0) {
      logger.info('[Cron: Weekly Digest] No eligible users found');
      return NextResponse.json({
        success: true,
        sent: 0,
        skipped: 0,
        failed: 0,
        duration: `${Date.now() - startTime}ms`,
      });
    }

    // 4. Process each user
    const now = new Date();
    const weekNumber = getISOWeek(now);
    const year = getISOWeekYear(now);
    const since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    let sent = 0;
    let skipped = 0;
    let failed = 0;

    for (const user of users) {
      try {
        const userId = String(user.id);

        // 4a. Check email preferences
        const canSend = await shouldSendEmail(userId, 'weekly_digest');
        if (!canSend) {
          logger.info('[Cron: Weekly Digest] User opted out', { userId });
          skipped++;
          continue;
        }

        // 4b. Idempotency check: has digest already been sent this week?
        const { data: existingSend } = await supabase
          .from('email_sends')
          .select('id')
          .eq('user_id', userId)
          .eq('email_type', 'weekly_digest')
          .eq('week_number', weekNumber)
          .eq('year', year)
          .limit(1)
          .maybeSingle();

        if (existingSend) {
          logger.info('[Cron: Weekly Digest] Already sent this week', {
            userId,
            weekNumber,
            year,
          });
          skipped++;
          continue;
        }

        // 4c. Aggregate digest data
        const digestData = await getDigestData(userId, since);
        if (!digestData) {
          // No activity -- skip
          skipped++;
          continue;
        }

        // 4d. Send email
        const result = await sendEmail({
          to: user.email!,
          subject: 'Your Weekly Sahara Digest',
          react: WeeklyDigest(digestData),
          tags: [
            { name: 'category', value: 'weekly_digest' },
            { name: 'user_id', value: userId },
          ],
          tracking: {
            userId,
            emailType: 'weekly_digest',
            weekNumber,
            year,
          },
        });

        if (result.success) {
          sent++;
          logger.info('[Cron: Weekly Digest] Sent digest', {
            userId,
            resendId: result.resendId,
          });
        } else {
          failed++;
          logger.error('[Cron: Weekly Digest] Send failed', {
            userId,
            error: result.error,
          });
        }
      } catch (err) {
        failed++;
        logger.error('[Cron: Weekly Digest] Error processing user', {
          userId: user.id,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    const duration = Date.now() - startTime;
    logger.info('[Cron: Weekly Digest] Dispatch complete', {
      sent,
      skipped,
      failed,
      duration: `${duration}ms`,
    });

    return NextResponse.json({
      success: true,
      sent,
      skipped,
      failed,
      duration: `${duration}ms`,
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.error(`[Cron: Weekly Digest] Fatal error after ${duration}ms`, {
      error: errorMsg,
    });

    return NextResponse.json(
      { error: 'Weekly digest dispatch failed', duration: `${duration}ms` },
      { status: 500 },
    );
  }
}
