/**
 * Re-engagement SMS Copy
 * AI-3525: Automated email + text reminders for user engagement
 *
 * The email channel renders branded copy from RE_ENGAGEMENT_MESSAGES (types.ts)
 * through the ReEngagementEmail template. This module adds the text/SMS channel:
 * tier-specific copy kept under a single 160-character GSM segment where
 * possible, built dynamically so the founder's first name never pushes the body
 * over the limit. Mirrors lib/onboarding-reminders/messages.ts.
 */

import type { ReEngagementTier } from './types';

const MAX_SMS_LENGTH = 160;

/**
 * Build the SMS re-engagement body for a given inactivity tier, fitting the
 * founder's name in without exceeding a single SMS segment. Falls back to a
 * name-less variant (truncated as a final guard) when a long name would
 * overflow the segment.
 */
export function getReEngagementSmsBody(
  founderName: string,
  tier: ReEngagementTier,
): string {
  const named: Record<ReEngagementTier, string> = {
    day7: `Hey ${founderName}, it's Fred. It's been a week — your Sahara progress is still saved. Pick up where you left off anytime. Reply STOP to opt out.`,
    day14: `Hey ${founderName}, Fred here. Two weeks out, but your roadmap and milestones are right where you left them. Ready when you are. Reply STOP to opt out.`,
    day30: `Hey ${founderName}, Fred again. No pressure — everything on Sahara is exactly where you left it whenever you want back in. Reply STOP to opt out.`,
  };

  const fallback: Record<ReEngagementTier, string> = {
    day7: `It's Fred. Your Sahara progress is saved — pick up where you left off anytime. Reply STOP to opt out.`,
    day14: `Fred here. Your Sahara roadmap and milestones are right where you left them. Reply STOP to opt out.`,
    day30: `Fred here. Everything on Sahara is where you left it whenever you want back in. Reply STOP to opt out.`,
  };

  const candidate = named[tier];
  if (candidate.length <= MAX_SMS_LENGTH) {
    return candidate;
  }
  return fallback[tier].slice(0, MAX_SMS_LENGTH);
}
