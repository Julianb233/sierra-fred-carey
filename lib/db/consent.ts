/**
 * Consent Preferences CRUD Module
 *
 * Manages per-category consent preferences for community data sharing.
 * Preferences are stored as individual rows in the `consent_preferences` table
 * with one row per (user_id, category) pair.
 *
 * Categories:
 *  - benchmarks: Anonymized data in community benchmarks
 *  - social_feed: Milestones/achievements in community feed
 *  - directory: Searchable profile in founder directory
 *  - messaging: Direct messages from other founders
 *
 * Default behavior is opt-IN: all categories are disabled by default.
 * The consent_audit_log is populated automatically by a DB trigger on
 * consent_preferences (INSERT or UPDATE), so application code does NOT
 * manually insert audit rows.
 *
 * Follows the structural pattern from lib/push/preferences.ts.
 */

import { logger } from "@/lib/logger";

// ---------- Types ----------

export type ConsentCategory =
  | "benchmarks"
  | "social_feed"
  | "directory"
  | "messaging";
// Note: "investor_intros" exists in DB schema but is NOT exposed in UI until Phase 53

export interface ConsentCategoryConfig {
  enabled: boolean;
  label: string;
  description: string;
}

export type ConsentPreferences = Record<ConsentCategory, ConsentCategoryConfig>;

// ---------- Defaults ----------

export const CONSENT_DEFAULTS: ConsentPreferences = {
  benchmarks: {
    enabled: false,
    label: "Benchmark Data",
    description:
      "Include your anonymized data in community benchmarks so founders can compare progress",
  },
  social_feed: {
    enabled: false,
    label: "Social Feed",
    description:
      "Allow your milestones and achievements to appear in the community feed",
  },
  directory: {
    enabled: false,
    label: "Founder Directory",
    description:
      "Make your community profile searchable in the founder directory",
  },
  messaging: {
    enabled: false,
    label: "Direct Messaging",
    description:
      "Allow other founders to send you direct messages",
  },
};

export const CONSENT_CATEGORIES = Object.keys(
  CONSENT_DEFAULTS,
) as ConsentCategory[];

// ---------- Public API ----------

/**
 * Get consent preferences for a user.
 * Returns defaults for any missing categories (merge-with-defaults pattern).
 */
export async function getConsentPreferences(
  userId: string,
): Promise<ConsentPreferences> {
  try {
    const { createServiceClient } = await import("@/lib/supabase/server");
    const supabase = createServiceClient();

    const { data, error } = await supabase
      .from("consent_preferences")
      .select("category, enabled")
      .eq("user_id", userId);

    if (error) {
      logger.error(
        "[consent] Failed to query consent_preferences",
        error,
      );
      return { ...CONSENT_DEFAULTS };
    }

    if (!data || data.length === 0) {
      return { ...CONSENT_DEFAULTS };
    }

    // Merge stored rows with defaults
    return mergePreferences(data);
  } catch (err) {
    logger.error("[consent] Unexpected error in getConsentPreferences", err);
    return { ...CONSENT_DEFAULTS };
  }
}

/**
 * Update a specific consent category preference.
 * Uses UPSERT for idempotent writes. The consent_audit_log is populated
 * automatically by the DB trigger -- do NOT manually insert audit rows.
 */
export async function updateConsentPreference(
  userId: string,
  category: ConsentCategory,
  enabled: boolean,
): Promise<ConsentPreferences> {
  try {
    if (!CONSENT_CATEGORIES.includes(category)) {
      throw new Error(`Invalid consent category: ${category}`);
    }

    const { createServiceClient } = await import("@/lib/supabase/server");
    const supabase = createServiceClient();

    const { error } = await supabase.from("consent_preferences").upsert(
      {
        user_id: userId,
        category,
        enabled,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,category" },
    );

    if (error) {
      logger.error("[consent] Failed to upsert consent preference", error);
      throw error;
    }

    logger.info("[consent] Updated consent preference", {
      userId,
      category,
      enabled,
    });

    return getConsentPreferences(userId);
  } catch (err) {
    logger.error("[consent] Unexpected error in updateConsentPreference", err);
    throw err;
  }
}

/**
 * Check if a specific consent category is enabled for a user.
 * Shorthand for downstream phases to gate data sharing.
 */
export async function isConsentEnabled(
  userId: string,
  category: ConsentCategory,
): Promise<boolean> {
  const prefs = await getConsentPreferences(userId);
  return prefs[category]?.enabled ?? false;
}

/**
 * Get all user IDs that have consented to a specific category.
 * Used by community listing queries to enforce consent filtering.
 */
export async function getConsentingUserIds(
  category: ConsentCategory,
): Promise<string[]> {
  try {
    const { createServiceClient } = await import("@/lib/supabase/server");
    const supabase = createServiceClient();

    const { data, error } = await supabase
      .from("consent_preferences")
      .select("user_id")
      .eq("category", category)
      .eq("enabled", true);

    if (error) {
      logger.error(
        "[consent] Failed to query consenting user IDs",
        error,
      );
      return [];
    }

    return (data || []).map((row: { user_id: string }) => row.user_id);
  } catch (err) {
    logger.error("[consent] Unexpected error in getConsentingUserIds", err);
    return [];
  }
}

// ---------- Internal Helpers ----------

/**
 * Merge stored consent rows with category defaults.
 */
function mergePreferences(
  stored: Array<{ category: string; enabled: boolean }>,
): ConsentPreferences {
  const result = { ...CONSENT_DEFAULTS };

  // Deep copy each category config to avoid mutating CONSENT_DEFAULTS
  for (const category of CONSENT_CATEGORIES) {
    result[category] = { ...result[category] };
  }

  for (const row of stored) {
    const cat = row.category as ConsentCategory;
    if (CONSENT_CATEGORIES.includes(cat)) {
      result[cat] = {
        ...result[cat],
        enabled: row.enabled,
      };
    }
  }

  return result;
}
