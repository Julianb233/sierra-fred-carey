/**
 * Onboarding Reminder Types
 * AI-3492: Automated email + text reminders for user engagement
 *
 * Graduated onboarding nudges for users who signed up but have not yet
 * completed onboarding. Mirrors the structure of the re-engagement system
 * (lib/email/re-engagement) but targets the early activation window instead
 * of inactive returning users.
 */

/** Graduated onboarding reminder tiers, keyed by account age in days. */
export type OnboardingReminderTier = 'day1' | 'day3' | 'day7';

/** Delivery channel for a reminder. */
export type ReminderChannel = 'email' | 'sms';

/**
 * The email_sends.email_type value used to log and de-duplicate
 * onboarding reminders across both channels.
 */
export const ONBOARDING_REMINDER_EMAIL_TYPE = 'onboarding_reminder';

export const INCOMPLETE_ONBOARDING_PROFILE_FILTER =
  'onboarding_completed.is.null,onboarding_completed.eq.false';

/** A user eligible to receive an onboarding reminder. */
export interface OnboardingReminderCandidate {
  userId: string;
  /** May be null if the profile has no email on file. */
  email: string | null;
  name: string;
  /** Whole days since the account was created. */
  accountAgeDays: number;
  tier: OnboardingReminderTier;
  /** Verified, opted-in phone number (E.164) or null when SMS is unavailable. */
  phoneNumber: string | null;
}

/** Data passed to the onboarding reminder email template. */
export interface OnboardingReminderEmailData {
  founderName: string;
  tier: OnboardingReminderTier;
  headline: string;
  fredMessage: string;
  ctaLabel: string;
  appUrl: string;
  unsubscribeUrl: string;
}

/** Per-run dispatch summary returned by the cron handler. */
export interface OnboardingReminderResult {
  processed: number;
  emailsSent: number;
  smsSent: number;
  skipped: number;
  failed: number;
}
