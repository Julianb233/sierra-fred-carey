/**
 * Onboarding Email Triggers
 * Phase 168: Onboarding Email Notifications
 *
 * Trigger functions for onboarding-related emails:
 * - sendWelcomeEmail: Immediate, called from onboard route
 * - sendOnboardingReminder: Batch, finds users 24h+ without completion
 * - sendFirstSessionEmail: Immediate, called after first FRED chat
 * - sendWeeklyEngagementEmails: Batch, finds founders inactive 7+ days
 *
 * All functions are non-blocking: failures are logged but never thrown.
 */

import { createServiceClient } from '@/lib/supabase/server';
import { shouldSendEmail } from '@/lib/email/preferences';
import { sendEmail } from '@/lib/email/send';
import { logger } from '@/lib/logger';
import type {
  OnboardingReminderEmailData,
  FirstSessionEmailData,
  WeeklyEngagementEmailData,
} from './types';
import { ONBOARDING_STEPS } from './types';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://joinsahara.com';

// ---------------------------------------------------------------------------
// 1. Welcome Email (sent immediately after signup)
// ---------------------------------------------------------------------------

/**
 * Send a welcome email to a newly registered founder.
 * Called from the onboard API route after successful account creation.
 */
export async function sendWelcomeEmail(
  userId: string,
  email: string,
  founderName: string,
): Promise<void> {
  try {
    // Import template dynamically to keep this module light
    const { WelcomeEmail } = await import('@/lib/email/templates/welcome');

    await sendEmail({
      to: email,
      subject: `Welcome to Sahara, ${founderName || 'Founder'} — your founder journey starts now`,
      react: WelcomeEmail({ founderName: founderName || 'Founder', appUrl: APP_URL }),
      tags: [
        { name: 'category', value: 'onboarding' },
        { name: 'onboarding_type', value: 'welcome' },
      ],
      tracking: {
        userId,
        emailType: 'onboarding',
        emailSubtype: 'welcome',
      },
    });

    logger.info('[Onboarding] Welcome email sent', { userId, email });
  } catch (err) {
    logger.error('[Onboarding] Failed to send welcome email', {
      userId,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

// ---------------------------------------------------------------------------
// 2. Onboarding Progress Reminder (24h after signup, not completed)
// ---------------------------------------------------------------------------

/**
 * Find users who signed up 24-48h ago but have not completed onboarding,
 * and send them a progress reminder email.
 *
 * Designed to be called from a cron/scheduled endpoint.
 */
export async function sendOnboardingReminders(): Promise<{ sent: number; skipped: number }> {
  let sent = 0;
  let skipped = 0;

  try {
    const supabase = createServiceClient();

    // Find users created 24-48h ago who have NOT completed onboarding
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

    const { data: users, error } = await supabase
      .from('profiles')
      .select('id, name, email, onboarding_completed, created_at')
      .gte('created_at', fortyEightHoursAgo)
      .lte('created_at', twentyFourHoursAgo)
      .or('onboarding_completed.is.null,onboarding_completed.eq.false')
      .not('email', 'is', null);

    if (error || !users || users.length === 0) {
      if (error) logger.error('[Onboarding] Failed to fetch reminder candidates', error);
      return { sent, skipped };
    }

    // Check for already-sent reminders
    const userIds = users.map((u) => u.id);
    const { data: alreadySent } = await supabase
      .from('email_sends')
      .select('user_id')
      .eq('email_type', 'onboarding')
      .eq('email_subtype', 'onboarding_reminder')
      .in('user_id', userIds);

    const alreadySentSet = new Set((alreadySent || []).map((s) => s.user_id));

    for (const user of users) {
      if (alreadySentSet.has(user.id)) {
        skipped++;
        continue;
      }

      const canSend = await shouldSendEmail(user.id, 'onboarding');
      if (!canSend) {
        skipped++;
        continue;
      }

      // Determine completed vs pending steps
      const completedSteps = [ONBOARDING_STEPS[0]]; // Account created
      const pendingSteps = [ONBOARDING_STEPS[1], ONBOARDING_STEPS[2], ONBOARDING_STEPS[3]];

      const emailData: OnboardingReminderEmailData = {
        founderName: user.name || 'Founder',
        completedSteps: completedSteps as unknown as string[],
        pendingSteps: pendingSteps as unknown as string[],
        appUrl: APP_URL,
      };

      const { OnboardingReminderEmail } = await import(
        '@/lib/email/templates/onboarding-reminder'
      );

      await sendEmail({
        to: user.email,
        subject: `You're almost there — finish setting up Sahara`,
        react: OnboardingReminderEmail(emailData),
        tags: [
          { name: 'category', value: 'onboarding' },
          { name: 'onboarding_type', value: 'onboarding_reminder' },
        ],
        tracking: {
          userId: user.id,
          emailType: 'onboarding',
          emailSubtype: 'onboarding_reminder',
        },
      });

      sent++;
    }

    logger.info('[Onboarding] Reminder batch complete', { sent, skipped });
  } catch (err) {
    logger.error('[Onboarding] Reminder batch failed', {
      error: err instanceof Error ? err.message : String(err),
    });
  }

  return { sent, skipped };
}

// ---------------------------------------------------------------------------
// 3. First Session Completed Email
// ---------------------------------------------------------------------------

/**
 * Send a congratulatory email after a founder's first FRED conversation.
 * Called from the chat API route when first_chat milestone is detected.
 */
export async function sendFirstSessionEmail(
  userId: string,
  sessionHighlight?: string,
): Promise<void> {
  try {
    const canSend = await shouldSendEmail(userId, 'onboarding');
    if (!canSend) {
      logger.info('[Onboarding] First session email preference disabled', { userId });
      return;
    }

    const supabase = createServiceClient();

    // Idempotency: skip if already sent
    const { data: existing } = await supabase
      .from('email_sends')
      .select('id')
      .eq('user_id', userId)
      .eq('email_type', 'onboarding')
      .eq('email_subtype', 'first_session')
      .limit(1)
      .maybeSingle();

    if (existing) {
      logger.info('[Onboarding] First session email already sent, skipping', { userId });
      return;
    }

    // Fetch profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('name, email')
      .eq('id', userId)
      .maybeSingle();

    if (!profile?.email) {
      logger.warn('[Onboarding] No email on profile for first session email', { userId });
      return;
    }

    // Get a Fred quote
    const { getRandomQuote } = await import('@/lib/fred-brain');
    const fredQuote = getRandomQuote();

    const emailData: FirstSessionEmailData = {
      founderName: profile.name || 'Founder',
      sessionHighlight:
        sessionHighlight ||
        'You had your first conversation with FRED and took the first step on your founder journey.',
      fredQuote,
      appUrl: APP_URL,
    };

    const { FirstSessionEmail } = await import('@/lib/email/templates/first-session');

    await sendEmail({
      to: profile.email,
      subject: `Great first session, ${profile.name || 'Founder'} — here's what's next`,
      react: FirstSessionEmail(emailData),
      tags: [
        { name: 'category', value: 'onboarding' },
        { name: 'onboarding_type', value: 'first_session' },
      ],
      tracking: {
        userId,
        emailType: 'onboarding',
        emailSubtype: 'first_session',
      },
    });

    logger.info('[Onboarding] First session email sent', { userId });
  } catch (err) {
    logger.error('[Onboarding] Failed to send first session email', {
      userId,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

// ---------------------------------------------------------------------------
// 4. Weekly Engagement Emails (7+ days inactive)
// ---------------------------------------------------------------------------

/** Suggested prompts to rotate through in engagement emails */
const SUGGESTED_PROMPTS = [
  'What is the biggest risk my startup faces right now?',
  'Help me prepare a 60-second elevator pitch for my startup.',
  'What should I focus on this week to move my startup forward?',
  'Can you review my current business model and give me honest feedback?',
  'What are the top 3 things investors will ask me about?',
  'Help me think through my go-to-market strategy.',
];

/** Fred messages for weekly engagement, rotated by week number */
const ENGAGEMENT_MESSAGES = [
  "It's been a little while since we last connected. Building a startup can feel isolating — but you don't have to figure everything out alone. I've got some ideas I'd love to run by you.",
  "I've been thinking about where we left off. There are a few things I want to make sure we cover before your next big decision. Can we reconnect?",
  "The founders who make progress are the ones who keep showing up — even when it's hard. I've got a question for you that might change how you think about your next move.",
];

/**
 * Find founders who haven't chatted with FRED in 7+ days and send
 * a weekly engagement nudge email.
 *
 * Designed to be called from a cron/scheduled endpoint (weekly).
 */
export async function sendWeeklyEngagementEmails(): Promise<{ sent: number; skipped: number }> {
  let sent = 0;
  let skipped = 0;

  try {
    const supabase = createServiceClient();

    // Get all onboarded users with emails
    const { data: users, error: usersError } = await supabase
      .from('profiles')
      .select('id, name, email')
      .eq('onboarding_completed', true)
      .not('email', 'is', null);

    if (usersError || !users || users.length === 0) {
      if (usersError) logger.error('[Onboarding] Failed to fetch engagement candidates', usersError);
      return { sent, skipped };
    }

    const userIds = users.map((u) => u.id);

    // Get last conversation timestamp per user from fred_episodic_memory
    const { data: memories } = await supabase
      .from('fred_episodic_memory')
      .select('user_id, created_at')
      .in('user_id', userIds)
      .order('created_at', { ascending: false });

    const lastChatMap = new Map<string, Date>();
    for (const mem of memories || []) {
      if (!lastChatMap.has(mem.user_id)) {
        lastChatMap.set(mem.user_id, new Date(mem.created_at));
      }
    }

    const now = new Date();
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    const fourteenDaysMs = 14 * 24 * 60 * 60 * 1000;

    // Check for recently sent engagement emails (7-day cooldown)
    const sevenDaysAgo = new Date(Date.now() - sevenDaysMs).toISOString();
    const { data: recentSends } = await supabase
      .from('email_sends')
      .select('user_id')
      .eq('email_type', 'onboarding')
      .eq('email_subtype', 'weekly_engagement')
      .gte('created_at', sevenDaysAgo)
      .in('user_id', userIds);

    const recentlySentSet = new Set((recentSends || []).map((s) => s.user_id));

    // Week number for rotating messages
    const weekNumber = Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000));

    for (const user of users) {
      const lastChat = lastChatMap.get(user.id);
      const daysSinceLastChat = lastChat
        ? Math.floor((now.getTime() - lastChat.getTime()) / (1000 * 60 * 60 * 24))
        : 999;

      // Only target 7-13 day window (re-engagement handles 14+ days)
      if (daysSinceLastChat < 7 || daysSinceLastChat >= 14) {
        skipped++;
        continue;
      }

      if (recentlySentSet.has(user.id)) {
        skipped++;
        continue;
      }

      const canSend = await shouldSendEmail(user.id, 'onboarding');
      if (!canSend) {
        skipped++;
        continue;
      }

      const promptIdx = weekNumber % SUGGESTED_PROMPTS.length;
      const messageIdx = weekNumber % ENGAGEMENT_MESSAGES.length;

      const emailData: WeeklyEngagementEmailData = {
        founderName: user.name || 'Founder',
        daysSinceLastChat,
        suggestedPrompt: SUGGESTED_PROMPTS[promptIdx],
        fredMessage: ENGAGEMENT_MESSAGES[messageIdx],
        appUrl: APP_URL,
      };

      const { WeeklyEngagementEmail } = await import(
        '@/lib/email/templates/weekly-engagement'
      );

      await sendEmail({
        to: user.email,
        subject: `${user.name || 'Founder'}, FRED has a question for you`,
        react: WeeklyEngagementEmail(emailData),
        tags: [
          { name: 'category', value: 'onboarding' },
          { name: 'onboarding_type', value: 'weekly_engagement' },
        ],
        tracking: {
          userId: user.id,
          emailType: 'onboarding',
          emailSubtype: 'weekly_engagement',
        },
      });

      sent++;
    }

    logger.info('[Onboarding] Weekly engagement batch complete', { sent, skipped });
  } catch (err) {
    logger.error('[Onboarding] Weekly engagement batch failed', {
      error: err instanceof Error ? err.message : String(err),
    });
  }

  return { sent, skipped };
}
