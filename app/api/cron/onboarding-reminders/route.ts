/**
 * Onboarding Reminders Cron Endpoint
 * AI-3492: Automated email + text reminders for user engagement
 *
 * Triggered by Vercel Cron daily. Sends graduated onboarding nudges (email and
 * SMS) to users who created an account but have not completed onboarding.
 *
 * GET /api/cron/onboarding-reminders
 * Authorization: Bearer {CRON_SECRET}
 *
 * Idempotency: each (tier, channel) send is logged in email_sends with
 * email_type = 'onboarding_reminder' and email_subtype = `${tier}_${channel}`,
 * so a user receives each tier on each channel at most once.
 */

import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual, createHmac } from 'crypto';
import { getOnboardingReminderCandidates } from '@/lib/onboarding-reminders/detector';
import {
  ONBOARDING_EMAIL_COPY,
  getOnboardingSmsBody,
} from '@/lib/onboarding-reminders/messages';
import {
  isEmailChannelConfigured,
  isSmsChannelConfigured,
} from '@/lib/onboarding-reminders/config';
import { ONBOARDING_REMINDER_EMAIL_TYPE } from '@/lib/onboarding-reminders/types';
import { OnboardingReminderEmail } from '@/lib/email/templates/onboarding-reminder';
import { sendEmail } from '@/lib/email/send';
import { shouldSendEmail } from '@/lib/email/preferences';
import { sendSMS } from '@/lib/sms/client';
import { createServiceClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import type { OnboardingReminderResult } from '@/lib/onboarding-reminders/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const LOG_PREFIX = '[Cron: Onboarding Reminders]';
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
      email_type: ONBOARDING_REMINDER_EMAIL_TYPE,
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

  const result: OnboardingReminderResult = {
    processed: 0,
    emailsSent: 0,
    smsSent: 0,
    skipped: 0,
    failed: 0,
  };

  try {
    const candidates = await getOnboardingReminderCandidates();
    result.processed = candidates.length;

    const emailConfigured = isEmailChannelConfigured();
    const smsConfigured = isSmsChannelConfigured();

    for (const candidate of candidates) {
      const copy = ONBOARDING_EMAIL_COPY[candidate.tier];

      // ---- Email channel ----
      if (candidate.email && !candidate.emailAlreadySent) {
        try {
          if (!emailConfigured) {
            result.skipped++;
          } else {
            const allowed = await shouldSendEmail(candidate.userId, 'onboarding');
            if (!allowed) {
              result.skipped++;
            } else {
              const send = await sendEmail({
                to: candidate.email,
                subject: copy.subject,
                react: OnboardingReminderEmail({
                  founderName: candidate.name,
                  tier: candidate.tier,
                  headline: copy.headline,
                  fredMessage: copy.fredMessage,
                  ctaLabel: copy.ctaLabel,
                  appUrl: APP_URL,
                  unsubscribeUrl: `${APP_URL}/dashboard/settings`,
                }),
                tags: [
                  { name: 'type', value: ONBOARDING_REMINDER_EMAIL_TYPE },
                  { name: 'tier', value: candidate.tier },
                ],
                tracking: {
                  userId: candidate.userId,
                  emailType: ONBOARDING_REMINDER_EMAIL_TYPE,
                  emailSubtype: `${candidate.tier}_email`,
                },
              });
              if (send.success) result.emailsSent++;
              else result.failed++;
            }
          }
        } catch (err) {
          result.failed++;
          logger.error(`${LOG_PREFIX} Email send failed`, {
            userId: candidate.userId,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }

      // ---- SMS channel ----
      if (candidate.phoneNumber && !candidate.smsAlreadySent) {
        const subtype = `${candidate.tier}_sms`;
        try {
          if (!smsConfigured) {
            result.skipped++;
          } else {
            const body = getOnboardingSmsBody(candidate.name, candidate.tier);
            await sendSMS(candidate.phoneNumber, body);
            await recordSmsSend(candidate.userId, subtype, 'sent');
            result.smsSent++;
          }
        } catch (err) {
          result.failed++;
          await recordSmsSend(candidate.userId, subtype, 'failed');
          logger.error(`${LOG_PREFIX} SMS send failed`, {
            userId: candidate.userId,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }
    }

    logger.info(`${LOG_PREFIX} Complete`, {
      ...result,
      durationMs: Date.now() - startTime,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    logger.error(`${LOG_PREFIX} Unhandled error`, {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { success: false, error: 'Internal server error', ...result },
      { status: 500 },
    );
  }
}
