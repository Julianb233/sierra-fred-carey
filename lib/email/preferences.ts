/**
 * Email Preference Checker
 * Phase 31: Email Engagement
 *
 * Reads notification preferences from profiles.metadata.notification_prefs
 * to determine whether a specific email category should be sent to a user.
 *
 * Preference keys:
 *  - email: master toggle (default true)
 *  - weekly: weekly digest toggle (default true)
 *  - marketing: re-engagement / marketing emails (default true)
 *
 * Default behaviour is opt-in: all categories are enabled by default
 * (matching existing settings page behavior).
 */

import { createServiceClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { EMAIL_CATEGORIES } from './constants';
import type { EmailCategory } from './types';

/**
 * Check whether an email of the given category should be sent to the user.
 *
 * Returns false if:
 *  - The master `email` toggle is explicitly false, OR
 *  - The specific category toggle is explicitly false
 *
 * Defaults to true when preferences are not set.
 */
export async function shouldSendEmail(
  userId: string,
  category: EmailCategory,
): Promise<boolean> {
  try {
    const supabase = createServiceClient();

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('metadata')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      logger.error('[Email] Failed to read profile preferences', { userId, error });
      // Default to true so we don't silently suppress emails on DB errors
      return true;
    }

    if (!profile || !profile.metadata) {
      // No preferences set -- default to sending
      return true;
    }

    const prefs = (profile.metadata as Record<string, unknown>)
      .notification_prefs as Record<string, boolean> | undefined;

    if (!prefs) {
      return true;
    }

    // Check master email toggle
    if (prefs.email === false) {
      logger.info('[Email] Master email toggle is off', { userId, category });
      return false;
    }

    // Check category-specific toggle
    const prefKey = EMAIL_CATEGORIES[category];
    if (prefs[prefKey] === false) {
      logger.info('[Email] Category toggle is off', { userId, category, prefKey });
      return false;
    }

    return true;
  } catch (err) {
    logger.error('[Email] Unexpected error checking preferences', { userId, category, err });
    // Default to true on unexpected errors
    return true;
  }
}
