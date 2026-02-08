/**
 * Push Notification Preferences
 *
 * Manages per-category notification preferences for web push notifications.
 * Preferences are stored as JSON in the `metadata` column of the
 * `notification_configs` table with channel='push'.
 *
 * Categories:
 *  - red_flags: Red flag detection alerts
 *  - wellbeing_alerts: Wellbeing / burnout alerts
 *  - agent_completions: Agent task completion notifications
 *  - inbox_messages: New inbox message notifications
 *  - weekly_digest: Weekly summary digest
 *
 * Default behaviour is opt-out: all categories are enabled by default.
 */

import { logger } from "@/lib/logger";

// ---------- Types ----------

export type PushCategory =
  | "red_flags"
  | "wellbeing_alerts"
  | "agent_completions"
  | "inbox_messages"
  | "weekly_digest";

export interface PushCategoryConfig {
  enabled: boolean;
  label: string;
  description: string;
}

export type PushPreferences = Record<PushCategory, PushCategoryConfig>;

// ---------- Defaults ----------

export const PUSH_CATEGORY_DEFAULTS: PushPreferences = {
  red_flags: {
    enabled: true,
    label: "Red Flag Alerts",
    description: "Get notified when potential risks are detected in your startup data",
  },
  wellbeing_alerts: {
    enabled: true,
    label: "Wellbeing Alerts",
    description: "Receive burnout and wellbeing check-in notifications",
  },
  agent_completions: {
    enabled: true,
    label: "Agent Completions",
    description: "Get notified when an AI agent finishes a task",
  },
  inbox_messages: {
    enabled: true,
    label: "Inbox Messages",
    description: "Receive notifications for new inbox messages",
  },
  weekly_digest: {
    enabled: true,
    label: "Weekly Digest",
    description: "Receive a weekly summary of your startup activity",
  },
};

export const PUSH_CATEGORIES = Object.keys(PUSH_CATEGORY_DEFAULTS) as PushCategory[];

// ---------- Public API ----------

/**
 * Get push notification preferences for a user.
 * Returns defaults for any missing categories.
 */
export async function getPreferences(userId: string): Promise<PushPreferences> {
  try {
    const { createServiceClient } = await import("@/lib/supabase/server");
    const supabase = createServiceClient();

    const { data, error } = await supabase
      .from("push_subscriptions")
      .select("id")
      .eq("user_id", userId)
      .limit(1);

    if (error) {
      logger.error("[push/preferences] Failed to query push_subscriptions", error);
      return { ...PUSH_CATEGORY_DEFAULTS };
    }

    // If the user has no push subscriptions at all, just return defaults
    if (!data || data.length === 0) {
      return { ...PUSH_CATEGORY_DEFAULTS };
    }

    // Look for a push-specific preference record in notification_configs
    const { data: configData, error: configError } = await supabase
      .from("notification_configs")
      .select("metadata")
      .eq("user_id", userId)
      .eq("channel", "push")
      .limit(1)
      .maybeSingle();

    if (configError) {
      logger.error("[push/preferences] Failed to read notification_configs", configError);
      return { ...PUSH_CATEGORY_DEFAULTS };
    }

    if (!configData || !configData.metadata) {
      return { ...PUSH_CATEGORY_DEFAULTS };
    }

    // Merge stored preferences with defaults (so new categories get defaults)
    return mergePreferences(configData.metadata as Partial<Record<PushCategory, { enabled: boolean }>>);
  } catch (err) {
    logger.error("[push/preferences] Unexpected error in getPreferences", err);
    return { ...PUSH_CATEGORY_DEFAULTS };
  }
}

/**
 * Update a specific push notification category preference.
 * Creates the notification_configs row for channel='push' if it does not exist.
 */
export async function updatePreferences(
  userId: string,
  category: PushCategory,
  enabled: boolean,
): Promise<PushPreferences> {
  try {
    if (!PUSH_CATEGORIES.includes(category)) {
      throw new Error(`Invalid push category: ${category}`);
    }

    const { createServiceClient } = await import("@/lib/supabase/server");
    const supabase = createServiceClient();

    // Read existing config
    const { data: existing, error: readError } = await supabase
      .from("notification_configs")
      .select("id, metadata")
      .eq("user_id", userId)
      .eq("channel", "push")
      .limit(1)
      .maybeSingle();

    if (readError) {
      logger.error("[push/preferences] Failed to read config for update", readError);
      throw readError;
    }

    // Build updated metadata
    const currentMetadata = (existing?.metadata ?? {}) as Record<string, { enabled: boolean }>;
    const updatedMetadata = {
      ...currentMetadata,
      [category]: { enabled },
    };

    if (existing) {
      // Update existing row
      const { error: updateError } = await supabase
        .from("notification_configs")
        .update({
          metadata: updatedMetadata,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);

      if (updateError) {
        logger.error("[push/preferences] Failed to update preferences", updateError);
        throw updateError;
      }
    } else {
      // Insert new row for push channel
      const { error: insertError } = await supabase
        .from("notification_configs")
        .insert({
          user_id: userId,
          channel: "push",
          enabled: true,
          alert_levels: ["info", "warning", "critical"],
          metadata: updatedMetadata,
        });

      if (insertError) {
        logger.error("[push/preferences] Failed to insert preferences", insertError);
        throw insertError;
      }
    }

    logger.info("[push/preferences] Updated preference", { userId, category, enabled });

    return mergePreferences(updatedMetadata as Partial<Record<PushCategory, { enabled: boolean }>>);
  } catch (err) {
    logger.error("[push/preferences] Unexpected error in updatePreferences", err);
    throw err;
  }
}

/**
 * Check if a specific push category is enabled for a user.
 * Used by trigger functions to gate notifications.
 */
export async function isCategoryEnabled(
  userId: string,
  category: PushCategory,
): Promise<boolean> {
  const prefs = await getPreferences(userId);
  return prefs[category]?.enabled ?? true;
}

// ---------- Internal Helpers ----------

/**
 * Merge stored preference overrides with category defaults.
 */
function mergePreferences(
  stored: Partial<Record<PushCategory, { enabled: boolean }>>,
): PushPreferences {
  const result = { ...PUSH_CATEGORY_DEFAULTS };

  for (const category of PUSH_CATEGORIES) {
    if (stored[category] !== undefined) {
      result[category] = {
        ...result[category],
        enabled: stored[category]!.enabled,
      };
    }
  }

  return result;
}
