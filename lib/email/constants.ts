/**
 * Email Engagement Constants
 * Phase 31: Email Engagement
 *
 * Shared constants for the email engagement system.
 */

import type { EmailCategory } from './types';

/**
 * Maps email categories to notification preference keys.
 * These keys correspond to fields in profiles.metadata.notification_prefs.
 */
export const EMAIL_CATEGORIES: Record<EmailCategory, string> = {
  weekly_digest: 'weekly',
  milestone: 'email',
  re_engagement: 'marketing',
};

/** Minimum total activity items required to send a digest (0 means any activity triggers send) */
export const DIGEST_SKIP_THRESHOLD = 0;

/** Graduated re-engagement nudge cadence (days of inactivity) */
export const RE_ENGAGEMENT_DAYS = [7, 14, 30];

/** Resend batch send limit per API call */
export const BATCH_SIZE = 100;
