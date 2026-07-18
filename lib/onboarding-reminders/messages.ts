/**
 * Onboarding Reminder Copy
 * AI-3492: Automated email + text reminders for user engagement
 *
 * Tier-specific copy for both channels. Email copy is rendered through the
 * branded OnboardingReminderEmail template; SMS copy is kept under the single
 * 160-character GSM segment where possible and built dynamically so the
 * founder's first name never pushes the body over the limit.
 */

import type { OnboardingReminderTier } from './types';

/** Per-tier email copy (channel-agnostic strings rendered by the template). */
export const ONBOARDING_EMAIL_COPY: Record<
  OnboardingReminderTier,
  { subject: string; headline: string; fredMessage: string; ctaLabel: string }
> = {
  day1: {
    subject: 'Finish setting up Sahara (2 minutes)',
    headline: "Let's get you off the ground",
    fredMessage:
      "Welcome to Sahara. You created your account but haven't finished setup yet — and that last step is what unlocks your personalized founder roadmap. It takes about two minutes, and once it's done I can start working for you.",
    ctaLabel: 'Finish Setup',
  },
  day3: {
    subject: 'Your founder roadmap is waiting',
    headline: 'Your roadmap is one step away',
    fredMessage:
      "A few days in and your Sahara setup is still incomplete. The founders who win are the ones who finish what they start. Wrap up onboarding and I'll hand you a clear, prioritized plan for what to build next.",
    ctaLabel: 'Complete Onboarding',
  },
  day7: {
    subject: 'Still here when you are',
    headline: "Let's pick up where you left off",
    fredMessage:
      "It's been a week since you signed up. No pressure — but everything you started is still saved, and finishing onboarding is the fastest way to get real value out of Sahara. Whenever you're ready, I'm here.",
    ctaLabel: 'Get Started',
  },
};

const MAX_SMS_LENGTH = 160;

/**
 * Build the SMS reminder body for a given tier, fitting the founder's name in
 * without exceeding a single SMS segment. Falls back to a name-less variant if
 * needed.
 */
export function getOnboardingSmsBody(
  founderName: string,
  tier: OnboardingReminderTier,
): string {
  const named: Record<OnboardingReminderTier, string> = {
    day1: `Hey ${founderName}, it's Fred. You're almost set up on Sahara — finish onboarding (2 min) to unlock your founder roadmap. Reply STOP to opt out.`,
    day3: `Hey ${founderName}, Fred here. Your Sahara roadmap is one step away. Finish setup and I'll map your next moves. Reply STOP to opt out.`,
    day7: `Hey ${founderName}, Fred again. Everything you started on Sahara is still saved. Finish onboarding whenever you're ready. Reply STOP to opt out.`,
  };

  const fallback: Record<OnboardingReminderTier, string> = {
    day1: `It's Fred. Finish setting up Sahara (2 min) to unlock your founder roadmap. Reply STOP to opt out.`,
    day3: `Fred here. Your Sahara roadmap is one step away — finish setup. Reply STOP to opt out.`,
    day7: `Fred here. Your Sahara progress is saved. Finish onboarding anytime. Reply STOP to opt out.`,
  };

  const candidate = named[tier];
  if (candidate.length <= MAX_SMS_LENGTH) {
    return candidate;
  }
  return fallback[tier].slice(0, MAX_SMS_LENGTH);
}
