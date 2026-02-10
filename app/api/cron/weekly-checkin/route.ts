/**
 * Weekly Check-in Cron Endpoint
 * Phase 04: Studio Tier Features - Plan 05
 *
 * Triggered by Vercel Cron every Monday at 2 PM UTC.
 * Dispatches weekly check-in SMS to all opted-in Studio users.
 *
 * GET /api/cron/weekly-checkin
 *
 * Authorization: Bearer {CRON_SECRET}
 */

import { NextRequest, NextResponse } from 'next/server';
import { sendWeeklyCheckins } from '@/lib/sms/scheduler';
import { logger } from "@/lib/logger";
import { timingSafeEqual, createHmac } from "crypto";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  logger.log('[Cron: Weekly Check-in] Starting scheduled dispatch');

  try {
    // Verify authorization via CRON_SECRET
    // SECURITY: Auth check MUST come first to avoid leaking config state to unauthenticated callers
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || !authHeader) {
      if (!cronSecret) {
        console.error('[Cron: Weekly Check-in] CRON_SECRET not configured');
      }
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const expectedToken = `Bearer ${cronSecret}`;
    const hmac1 = createHmac("sha256", "cron-auth").update(authHeader).digest();
    const hmac2 = createHmac("sha256", "cron-auth").update(expectedToken).digest();
    if (!timingSafeEqual(hmac1, hmac2)) {
      console.warn('[Cron: Weekly Check-in] Invalid authorization');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if Twilio is configured (safe to disclose after auth)
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
      console.error('[Cron: Weekly Check-in] Twilio credentials not configured');
      return NextResponse.json(
        {
          error: 'SMS service not configured',
          code: 'SMS_NOT_CONFIGURED',
        },
        { status: 503 }
      );
    }

    // Dispatch weekly check-ins
    const result = await sendWeeklyCheckins();
    const duration = Date.now() - startTime;

    logger.log(
      `[Cron: Weekly Check-in] Completed in ${duration}ms:`,
      JSON.stringify({
        sent: result.sent,
        failed: result.failed,
        skipped: result.skipped,
        errorCount: result.errors.length,
      })
    );

    // Log individual errors for debugging
    if (result.errors.length > 0) {
      console.error(
        '[Cron: Weekly Check-in] Errors:',
        JSON.stringify(result.errors)
      );
    }

    return NextResponse.json({
      success: true,
      sent: result.sent,
      failed: result.failed,
      skipped: result.skipped,
      duration: `${duration}ms`,
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(
      `[Cron: Weekly Check-in] Fatal error after ${duration}ms:`,
      errorMsg
    );

    return NextResponse.json(
      {
        error: 'Weekly check-in dispatch failed',
        duration: `${duration}ms`,
      },
      { status: 500 }
    );
  }
}
