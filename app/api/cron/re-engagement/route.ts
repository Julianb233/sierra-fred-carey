/**
 * Re-engagement Cron Endpoint
 * Phase 31-02: Email Engagement
 *
 * Triggered by Vercel Cron daily at 14:00 UTC.
 * Sends graduated re-engagement emails to inactive users.
 *
 * GET /api/cron/re-engagement
 *
 * Authorization: Bearer {CRON_SECRET}
 */

import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual, createHmac } from "crypto";
import { getReEngagementCandidates } from '@/lib/email/re-engagement/detector';
import { RE_ENGAGEMENT_MESSAGES } from '@/lib/email/re-engagement/types';
import { ReEngagementEmail } from '@/lib/email/templates/re-engagement';
import { sendEmail } from '@/lib/email/send';
import { logger } from '@/lib/logger';
import type { ReEngagementEmailData } from '@/lib/email/re-engagement/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://sahara.app';

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  logger.info('[Cron: Re-engagement] Starting daily dispatch');

  try {
    // Verify authorization via CRON_SECRET
    // SECURITY: Auth check MUST come first to avoid leaking config state to unauthenticated callers
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || !authHeader) {
      if (!cronSecret) {
        logger.error('[Cron: Re-engagement] CRON_SECRET not configured');
      }
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const expectedToken = `Bearer ${cronSecret}`;
    const hmac1 = createHmac("sha256", "cron-auth").update(authHeader).digest();
    const hmac2 = createHmac("sha256", "cron-auth").update(expectedToken).digest();
    if (!timingSafeEqual(hmac1, hmac2)) {
      logger.warn('[Cron: Re-engagement] Invalid authorization');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check Resend is configured (safe to disclose after auth)
    if (!process.env.RESEND_API_KEY) {
      logger.error('[Cron: Re-engagement] Email service not configured');
      return NextResponse.json(
        { error: 'Email service not configured', code: 'EMAIL_NOT_CONFIGURED' },
        { status: 503 },
      );
    }

    // Get qualifying inactive users
    const candidates = await getReEngagementCandidates();

    let sent = 0;
    let skipped = 0;
    let failed = 0;

    for (const candidate of candidates) {
      try {
        const message = RE_ENGAGEMENT_MESSAGES[candidate.tier];

        const emailData: ReEngagementEmailData = {
          founderName: candidate.name,
          tier: candidate.tier,
          inactiveDays: candidate.inactiveDays,
          fredMessage: message.fredMessage,
          featureHighlight: message.featureHighlight,
          appUrl: APP_URL,
          unsubscribeUrl: `${APP_URL}/dashboard/settings`,
        };

        const result = await sendEmail({
          to: candidate.email,
          subject: message.subject,
          react: ReEngagementEmail(emailData),
          tags: [
            { name: 'category', value: 're_engagement' },
            { name: 'tier', value: candidate.tier },
          ],
          tracking: {
            userId: candidate.userId,
            emailType: 're_engagement',
            emailSubtype: candidate.tier,
          },
        });

        if (result.success) {
          sent++;
        } else {
          failed++;
          logger.warn('[Cron: Re-engagement] Send failed', {
            userId: candidate.userId,
            tier: candidate.tier,
            error: result.error,
          });
        }
      } catch (err) {
        failed++;
        logger.error('[Cron: Re-engagement] Error processing candidate', {
          userId: candidate.userId,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    const duration = Date.now() - startTime;
    logger.info('[Cron: Re-engagement] Completed', {
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
    logger.error(`[Cron: Re-engagement] Fatal error after ${duration}ms`, errorMsg);

    return NextResponse.json(
      { error: 'Re-engagement dispatch failed', duration: `${duration}ms` },
      { status: 500 },
    );
  }
}
