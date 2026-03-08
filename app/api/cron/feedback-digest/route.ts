/**
 * Feedback Digest Cron Endpoint
 * Phase 73-04: Weekly feedback summary email for admin
 *
 * Triggered by Vercel Cron every Monday at 10:00 AM UTC.
 * Fetches feedback stats for the past 7 days and sends a digest email
 * to the configured admin email address.
 *
 * GET /api/cron/feedback-digest
 *
 * Authorization: Bearer {CRON_SECRET}
 *
 * Vercel Cron: Add to vercel.json crons array:
 * { "path": "/api/cron/feedback-digest", "schedule": "0 10 * * 1" }
 * Runs every Monday at 10:00 AM UTC (same as weekly-digest)
 */

import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual, createHmac } from 'crypto';
import { logger } from '@/lib/logger';
import { getDigestSummary } from '@/lib/db/feedback-admin';
import { sendEmail } from '@/lib/email/send';
import { FeedbackDigest } from '@/lib/email/templates/feedback-digest';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  logger.info('[Cron: Feedback Digest] Starting scheduled dispatch');

  try {
    // 1. Verify authorization via CRON_SECRET (timing-safe)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || !authHeader) {
      if (!cronSecret) {
        logger.error('[Cron: Feedback Digest] CRON_SECRET not configured');
      }
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const expectedToken = `Bearer ${cronSecret}`;
    const hmac1 = createHmac('sha256', 'cron-auth').update(authHeader).digest();
    const hmac2 = createHmac('sha256', 'cron-auth').update(expectedToken).digest();
    if (!timingSafeEqual(hmac1, hmac2)) {
      logger.warn('[Cron: Feedback Digest] Invalid authorization');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Determine admin email recipient
    const adminEmail = process.env.ADMIN_EMAIL || process.env.ADMIN_FEEDBACK_EMAIL;
    if (!adminEmail) {
      logger.warn('[Cron: Feedback Digest] No admin email configured (ADMIN_EMAIL or ADMIN_FEEDBACK_EMAIL)');
      return NextResponse.json({
        skipped: true,
        reason: 'No admin email configured',
      });
    }

    // 3. Gather digest data
    const summary = await getDigestSummary(7);

    // 4. Send digest email
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://joinsahara.com';

    const result = await sendEmail({
      to: adminEmail,
      subject: `Sahara Feedback Digest: ${summary.period.from} - ${summary.period.to}`,
      react: FeedbackDigest({
        totalSignals: summary.stats.totalSignals,
        positiveCount: summary.stats.positiveCount,
        negativeCount: summary.stats.negativeCount,
        flaggedSessionCount: summary.stats.flaggedSessionCount,
        topCategories: summary.topCategories,
        dailyVolume: summary.stats.dailyVolume,
        period: summary.period,
        appUrl,
      }),
      tags: [{ name: 'category', value: 'feedback-digest' }],
    });

    const duration = Date.now() - startTime;

    if (result.success) {
      logger.info('[Cron: Feedback Digest] Sent successfully', {
        adminEmail,
        signalCount: summary.stats.totalSignals,
        resendId: result.resendId,
        duration: `${duration}ms`,
      });

      return NextResponse.json({
        success: true,
        signalCount: summary.stats.totalSignals,
        duration: `${duration}ms`,
      });
    } else {
      logger.error('[Cron: Feedback Digest] Send failed', {
        error: result.error,
        duration: `${duration}ms`,
      });

      return NextResponse.json(
        {
          error: 'Failed to send feedback digest',
          detail: result.error,
          duration: `${duration}ms`,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.error(`[Cron: Feedback Digest] Fatal error after ${duration}ms`, {
      error: errorMsg,
    });

    return NextResponse.json(
      { error: 'Feedback digest dispatch failed', duration: `${duration}ms` },
      { status: 500 }
    );
  }
}
