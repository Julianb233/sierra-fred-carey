/**
 * Milestone Email Triggers
 * Phase 31-02: Email Engagement
 *
 * Sends a celebratory email when a founder completes a milestone.
 * Non-blocking: failures are logged but never thrown.
 */

import { createServiceClient } from '@/lib/supabase/server';
import { shouldSendEmail } from '@/lib/email/preferences';
import { sendEmail } from '@/lib/email/send';
import { logger } from '@/lib/logger';
import { MILESTONE_MESSAGES, type MilestoneType, type MilestoneEmailData } from './types';
import {
  CUSTOMERIO_EVENTS,
  LIFECYCLE_CONSENT,
  trackLifecycleEvent,
} from '@/lib/customerio';
import { shouldSendLegacyMilestoneEmail } from './delivery-policy';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://sahara.app';

/**
 * Send a milestone celebration email.
 *
 * - Checks email preferences
 * - Prevents duplicate sends (24h idempotency window)
 * - Fetches user profile and a random Fred quote
 * - Renders and sends the MilestoneEmail template
 *
 * Failures are caught and logged — never throws.
 */
export async function sendMilestoneEmail(
  userId: string,
  milestoneType: MilestoneType,
  customTitle?: string,
): Promise<void> {
  try {
    // Record the product milestone independently of Sahara's current email
    // channel. Customer.io suppression remains authoritative for future sends.
    await trackLifecycleEvent(
      userId,
      CUSTOMERIO_EVENTS.FOUNDER_MILESTONE,
      {
        source: 'milestone',
        correlationId: milestoneType,
        consent: LIFECYCLE_CONSENT.UNKNOWN,
      },
      { milestone_type: milestoneType, ...(customTitle ? { title: customTitle } : {}) },
      `founder_milestone:${userId}:${milestoneType}`,
    );
    const customerIoMilestoneResult = await trackLifecycleEvent(
      userId,
      CUSTOMERIO_EVENTS.MILESTONE_REACHED,
      {
        source: 'milestone',
        correlationId: milestoneType,
        consent: LIFECYCLE_CONSENT.UNKNOWN,
      },
      { milestone_name: customTitle ?? milestoneType, milestone_type: milestoneType },
      `milestone_reached:${userId}:${milestoneType}`,
    );

    if (
      ['first_chat', 'first_reality_lens', 'first_pitch_review', 'first_strategy_doc'].includes(
        milestoneType,
      )
    ) {
      await trackLifecycleEvent(
        userId,
        CUSTOMERIO_EVENTS.FIRST_VALUE_REACHED,
        {
          source: 'milestone',
          correlationId: milestoneType,
          consent: LIFECYCLE_CONSENT.UNKNOWN,
        },
        { milestone_type: milestoneType },
        `first_value_reached:${userId}`,
      );
    }

    // Customer.io owns milestone-email delivery once it accepts the canonical
    // event. Sending the legacy Resend message as well would deliver the same
    // celebration twice. If Customer.io is unavailable or rejects the event,
    // keep the established Resend path as a fail-safe.
    if (!shouldSendLegacyMilestoneEmail(customerIoMilestoneResult)) {
      logger.info('[Milestones] Customer.io accepted milestone event; legacy email skipped', {
        userId,
        milestoneType,
      });
      return;
    }

    logger.warn('[Milestones] Customer.io milestone event not accepted; using legacy email', {
      userId,
      milestoneType,
      status: customerIoMilestoneResult.status,
      skipped: customerIoMilestoneResult.skipped,
      error: customerIoMilestoneResult.error,
    });

    // Check email preferences
    const shouldSend = await shouldSendEmail(userId, 'milestone');
    if (!shouldSend) {
      logger.info('[Milestones] Email preference disabled, skipping', { userId, milestoneType });
      return;
    }

    const supabase = createServiceClient();

    // Idempotency: skip if we already sent this milestone email in the last 24 hours
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: existing } = await supabase
      .from('email_sends')
      .select('id')
      .eq('user_id', userId)
      .eq('email_type', 'milestone')
      .eq('email_subtype', milestoneType)
      .gte('created_at', twentyFourHoursAgo)
      .limit(1)
      .maybeSingle();

    if (existing) {
      logger.info('[Milestones] Duplicate milestone email, skipping', { userId, milestoneType });
      return;
    }

    // Fetch user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('name, email')
      .eq('id', userId)
      .maybeSingle();

    if (profileError || !profile) {
      logger.warn('[Milestones] No profile found', { userId });
      return;
    }

    if (!profile.email) {
      logger.info('[Milestones] No email on profile, skipping', { userId });
      return;
    }

    // Get a Fred quote (dynamic import to avoid circular deps)
    const { getRandomQuote } = await import('@/lib/fred-brain');
    const fredQuote = getRandomQuote();

    // Look up milestone message
    const message = MILESTONE_MESSAGES[milestoneType];
    const milestoneTitle = customTitle || message.title;

    // Build email data
    const emailData: MilestoneEmailData = {
      founderName: profile.name || 'Founder',
      milestoneTitle,
      milestoneDescription: message.description,
      milestoneType,
      fredQuote,
      nextSuggestion: message.nextSuggestion,
      appUrl: APP_URL,
      unsubscribeUrl: `${APP_URL}/dashboard/settings`,
    };

    // Import template (dynamic to keep this module light)
    const { MilestoneEmail } = await import('@/lib/email/templates/milestone');

    await sendEmail({
      to: profile.email,
      subject: `${milestoneTitle}`,
      react: MilestoneEmail(emailData),
      tags: [
        { name: 'category', value: 'milestone' },
        { name: 'milestone_type', value: milestoneType },
      ],
      tracking: {
        userId,
        emailType: 'milestone',
        emailSubtype: milestoneType,
      },
    });

    logger.info('[Milestones] Milestone email sent', { userId, milestoneType, milestoneTitle });
  } catch (err) {
    logger.error('[Milestones] Failed to send milestone email', {
      userId,
      milestoneType,
      error: err instanceof Error ? err.message : String(err),
    });
    // Never throw — milestone email failures must not break the calling operation
  }
}
