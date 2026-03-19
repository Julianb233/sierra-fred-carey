/**
 * Onboarding Email Types
 * Phase 168: Onboarding Email Notifications
 *
 * Type definitions for onboarding-related email notifications:
 * - Welcome email (sent immediately after signup)
 * - Onboarding progress reminder (24h after signup if not completed)
 * - First session completed (after first FRED conversation)
 * - Weekly engagement nudge (founders inactive for 7+ days)
 */

export type OnboardingEmailType =
  | 'welcome'
  | 'onboarding_reminder'
  | 'first_session'
  | 'weekly_engagement';

export interface OnboardingReminderEmailData {
  founderName: string;
  /** Onboarding steps completed so far (e.g. "profile created") */
  completedSteps: string[];
  /** Steps still pending */
  pendingSteps: string[];
  appUrl: string;
}

export interface FirstSessionEmailData {
  founderName: string;
  /** Summary of what was discussed in the first session */
  sessionHighlight: string;
  fredQuote: string;
  appUrl: string;
}

export interface WeeklyEngagementEmailData {
  founderName: string;
  daysSinceLastChat: number;
  /** A suggested topic or prompt to re-engage */
  suggestedPrompt: string;
  fredMessage: string;
  appUrl: string;
}

/** Default onboarding steps used for progress tracking */
export const ONBOARDING_STEPS = [
  'Account created',
  'Profile completed',
  'First conversation with FRED',
  'Reality Lens analysis',
] as const;
