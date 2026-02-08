/**
 * Unified Email Send Function
 * Phase 31: Email Engagement
 *
 * Sends emails via the Resend SDK, logs sends via structured logger,
 * and records each send in the email_sends table for tracking and
 * idempotency enforcement.
 */

import type { ReactElement } from 'react';
import { getResendClient } from './client';
import { createServiceClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import type { EmailSendResult } from './types';

interface SendEmailOptions {
  to: string;
  subject: string;
  react: ReactElement;
  tags?: Array<{ name: string; value: string }>;
  /** Used to record in email_sends for idempotency */
  tracking?: {
    userId: string;
    emailType: string;
    emailSubtype?: string;
    weekNumber?: number;
    year?: number;
  };
}

/**
 * Send an email via Resend and record it in the email_sends table.
 *
 * Returns an EmailSendResult indicating success or failure.
 * Never throws -- all errors are captured in the result object.
 */
export async function sendEmail(options: SendEmailOptions): Promise<EmailSendResult> {
  const { to, subject, react, tags, tracking } = options;

  try {
    const resend = getResendClient();
    if (!resend) {
      logger.warn('[Email] Resend client not available (RESEND_API_KEY missing)');
      return { success: false, error: 'Resend not configured' };
    }

    const fromName = process.env.RESEND_FROM_NAME || 'Sahara';
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@sahara.app';

    const { data, error } = await resend.emails.send({
      from: `${fromName} <${fromEmail}>`,
      to: [to],
      subject,
      react,
      tags,
    });

    if (error) {
      logger.error('[Email] Resend API error', { to, subject, error });

      // Record failure in email_sends
      if (tracking) {
        await recordSend(tracking, null, 'failed');
      }

      return { success: false, error: error.message };
    }

    const resendId = data?.id || undefined;
    logger.info('[Email] Sent successfully', { to, subject, resendId });

    // Record successful send in email_sends
    if (tracking) {
      await recordSend(tracking, resendId ?? null, 'sent');
    }

    return { success: true, resendId };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    logger.error('[Email] Unexpected send error', { to, subject, error: errorMsg });

    if (tracking) {
      await recordSend(tracking, null, 'failed');
    }

    return { success: false, error: errorMsg };
  }
}

/**
 * Record an email send in the email_sends table.
 * Failures here are logged but do not propagate -- email delivery is the priority.
 */
async function recordSend(
  tracking: NonNullable<SendEmailOptions['tracking']>,
  resendId: string | null,
  status: 'sent' | 'failed' | 'skipped',
): Promise<void> {
  try {
    const supabase = createServiceClient();

    await supabase.from('email_sends').insert({
      user_id: tracking.userId,
      email_type: tracking.emailType,
      email_subtype: tracking.emailSubtype ?? null,
      week_number: tracking.weekNumber ?? null,
      year: tracking.year ?? null,
      resend_id: resendId,
      status,
    });
  } catch (err) {
    logger.error('[Email] Failed to record send in email_sends', {
      tracking,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
