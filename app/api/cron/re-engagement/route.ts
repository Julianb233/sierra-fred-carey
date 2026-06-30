/**
 * Re-engagement Cron Endpoint
 * Phase 31-02: Email Engagement
 * AI-3525: now dispatches BOTH email and text/SMS engagement reminders
 *
 * Triggered by Vercel Cron daily at 14:00 UTC. Sends graduated re-engagement
 * reminders to inactive users across email and SMS. Each channel is dispatched
 * independently — a missing/disabled email provider no longer blocks the SMS
 * channel and vice versa.
 *
 * GET /api/cron/re-engagement
 *
 * Authorization: Bearer {CRON_SECRET}
 *
 * Idempotency: each (tier, channel) send is logged in email_sends with
 * email_type = 're_engagement'. Email keeps email_subtype = `${tier}`; SMS uses
 * email_subtype = `${tier}_sms` with metadata.channel = 'sms'. The detector
 * enforces a 14-day per-channel cooldown from those records.
 */

import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual, createHmac } from 'crypto';
import { getReEngagementCandidates } from '@/lib/email/re-engagement/detector';
import {
  RE_ENGAGEMENT_MESSAGES,
  RE_ENGAGEMENT_EMAIL_TYPE,
} from '@/lib/email/re-engagement/types';
import { getReEngagementSmsBody } from '@/lib/email/re-engagement/messages';
import { ReEngagementEmail } from '@/lib/email/templates/re-engagement';
import { sendEmail } from '@/lib/email/send';
import { sendSMS } from '@/lib/sms/client';
import { createServiceClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import type { ReEngagementEmailData } from '@/lib/email/re-engagement/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const LOG_PREFIX = '[Cron: Re-engagement]';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://sahara.app';

function isAuthorized(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || !authHeader) {
    if (!cronSecret) logger.error(`${LOG_PREFIX} CRON_SECRET not configured`);
    return false;
  }

  const expectedToken = `Bearer ${cronSecret}`;
  // Hash both sides so timingSafeEqual gets equal-length buffers regardless of input length.
  const hmac1 = createHmac('sha256', 'cron-auth').update(authHeader).digest();
  const hmac2 = createHmac('sha256', 'cron-auth').update(expectedToken).digest();
  return timingSafeEqual(hmac1, hmac2);
}

/** Record an SMS reminder dispatch in email_sends for cross-channel idempotency. */
async function recordSmsSend(
  userId: string,
  subtype: string,
  status: 'sent' | 'failed',
): Promise<void> {
  try {
    const supabase = createServiceClient();
    await supabase.from('email_sends').insert({
      user_id: userId,
      email_type: RE_ENGAGEMENT_EMAIL_TYPE,
      email_subtype: subtype,
      status,
      metadata: { channel: 'sms' },
    });
  } catch (err) {
    logger.error(`${LOG_PREFIX} Failed to record SMS send`, {
      userId,
      subtype,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  logger.info(`${LOG_PREFIX} Starting daily dispatch`);

  // SECURITY: auth check first, before disclosing any config state.
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let emailsSent = 0;
  let smsSent = 0;
  let skipped = 0;
  let failed = 0;

  try {
    const candidates = await getReEngagementCandidates();
    const processed = candidates.length;

    const emailConfigured = !!process.env.RESEND_API_KEY;
    const smsConfigured =
      !!process.env.TWILIO_ACCOUNT_SID && !!process.env.TWILIO_MESSAGING_SERVICE_SID;

    if (!emailConfigured) {
      logger.warn(`${LOG_PREFIX} Email service not configured — email channel skipped`);
    }
    if (!smsConfigured) {
      logger.warn(`${LOG_PREFIX} SMS service not configured — text channel skipped`);
    }

    for (const candidate of candidates) {
      const message = RE_ENGAGEMENT_MESSAGES[candidate.tier];

      // ---- Email channel ----
      if (candidate.email && !candidate.emailAlreadySent) {
        if (!emailConfigured) {
          skipped++;
        } else {
          try {
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
                { name: 'category', value: RE_ENGAGEMENT_EMAIL_TYPE },
                { name: 'tier', value: candidate.tier },
              ],
              tracking: {
                userId: candidate.userId,
                emailType: RE_ENGAGEMENT_EMAIL_TYPE,
                emailSubtype: candidate.tier,
              },
            });

            if (result.success) emailsSent++;
            else {
              failed++;
              logger.warn(`${LOG_PREFIX} Email send failed`, {
                userId: candidate.userId,
                tier: candidate.tier,
                error: result.error,
              });
            }
          } catch (err) {
            failed++;
            logger.error(`${LOG_PREFIX} Email send error`, {
              userId: candidate.userId,
              error: err instanceof Error ? err.message : String(err),
            });
          }
        }
      }

      // ---- SMS / text channel ----
      if (candidate.phoneNumber && !candidate.smsAlreadySent) {
        const subtype = `${candidate.tier}_sms`;
        if (!smsConfigured) {
          skipped++;
        } else {
          try {
            const body = getReEngagementSmsBody(candidate.name, candidate.tier);
            await sendSMS(candidate.phoneNumber, body);
            await recordSmsSend(candidate.userId, subtype, 'sent');
            smsSent++;
          } catch (err) {
            failed++;
            await recordSmsSend(candidate.userId, subtype, 'failed');
            logger.error(`${LOG_PREFIX} SMS send failed`, {
              userId: candidate.userId,
              error: err instanceof Error ? err.message : String(err),
            });
          }
        }
      }
    }

    const duration = Date.now() - startTime;
    logger.info(`${LOG_PREFIX} Completed`, {
      processed,
      emailsSent,
      smsSent,
      skipped,
      failed,
      duration: `${duration}ms`,
    });

    return NextResponse.json({
      success: true,
      processed,
      emailsSent,
      smsSent,
      // Back-compat: previous callers/tests read `sent` as the email count.
      sent: emailsSent,
      skipped,
      failed,
      duration: `${duration}ms`,
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.error(`${LOG_PREFIX} Fatal error after ${duration}ms`, errorMsg);

    return NextResponse.json(
      { error: 'Re-engagement dispatch failed', duration: `${duration}ms` },
      { status: 500 },
    );
  }
}
