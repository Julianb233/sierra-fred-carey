/**
 * Funnel → Full Platform Migration
 *
 * Migrates anonymous funnel session data (chat messages + journey progress)
 * into the full Sahara platform tables when a user signs up.
 *
 * Linear: AI-2276
 */

import { createServiceClient } from "@/lib/supabase/server";

// ============================================================================
// Types
// ============================================================================

interface FunnelChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string; // ISO 8601
}

interface FunnelSessionRow {
  id: string;
  session_id: string;
  chat_messages: FunnelChatMessage[];
  journey_progress: Record<string, boolean>;
  funnel_version: string;
  migrated_to_user_id: string | null;
  migrated_at: string | null;
}

export interface MigrationResult {
  success: boolean;
  userId?: string;
  chatMessagesCount: number;
  milestonesCount: number;
  error?: string;
  alreadyMigrated?: boolean;
}

// ============================================================================
// Constants
// ============================================================================

const LOG_PREFIX = "[funnel-migration]";

/**
 * Funnel journey stages → platform milestone data.
 * Each stage has 4 milestones (index 0-3).
 */
const STAGE_MILESTONES: Record<
  string,
  { category: string; milestones: string[] }
> = {
  idea: {
    category: "product",
    milestones: [
      "Define the problem you solve",
      "Identify your target customer",
      "Validate demand (10+ conversations)",
      "Create a one-page business brief",
    ],
  },
  build: {
    category: "product",
    milestones: [
      "Build an MVP (minimum viable product)",
      "Get 10 paying customers or active users",
      "Establish key metrics & KPIs",
      "Create a pitch deck draft",
    ],
  },
  launch: {
    category: "growth",
    milestones: [
      "Launch publicly",
      "Achieve consistent growth (10%+ MoM)",
      "Reach $1K MRR or 100 active users",
      "Refine your go-to-market strategy",
    ],
  },
  scale: {
    category: "growth",
    milestones: [
      "Hire first key team members",
      "Reach $10K+ MRR",
      "Complete investor readiness assessment",
      "Build investor pipeline",
    ],
  },
  fund: {
    category: "fundraising",
    milestones: [
      "Finalize pitch deck with Fred",
      "Complete due diligence prep",
      "Secure term sheet",
      "Close your round",
    ],
  },
};

// ============================================================================
// Core Migration Function
// ============================================================================

/**
 * Migrate a funnel session's data to the full platform.
 *
 * @param sessionId - The funnel session ID (from localStorage/sync)
 * @param userId    - The authenticated user's ID (from auth.users)
 * @returns MigrationResult with counts and success status
 */
export async function migrateFunnelSession(
  sessionId: string,
  userId: string
): Promise<MigrationResult> {
  const supabase = createServiceClient();

  // 1. Fetch the funnel session
  const { data: session, error: fetchError } = await supabase
    .from("funnel_sessions")
    .select("*")
    .eq("session_id", sessionId)
    .single();

  if (fetchError || !session) {
    console.warn(`${LOG_PREFIX} Session not found: ${sessionId}`);
    return {
      success: false,
      chatMessagesCount: 0,
      milestonesCount: 0,
      error: "Funnel session not found",
    };
  }

  const row = session as FunnelSessionRow;

  // 2. Check if already migrated
  if (row.migrated_to_user_id) {
    console.info(
      `${LOG_PREFIX} Session ${sessionId} already migrated to user ${row.migrated_to_user_id}`
    );
    return {
      success: true,
      userId: row.migrated_to_user_id,
      chatMessagesCount: 0,
      milestonesCount: 0,
      alreadyMigrated: true,
    };
  }

  let chatCount = 0;
  let milestoneCount = 0;

  // 3. Migrate chat messages
  const messages = Array.isArray(row.chat_messages) ? row.chat_messages : [];
  if (messages.length > 0) {
    const chatRows = messages
      .filter((m) => m.content && m.role)
      .map((m) => ({
        user_id: userId,
        session_id: sessionId,
        role: m.role,
        content: m.content,
        created_at: m.timestamp || new Date().toISOString(),
      }));

    if (chatRows.length > 0) {
      const { error: chatError } = await supabase
        .from("chat_messages")
        .insert(chatRows);

      if (chatError) {
        console.error(`${LOG_PREFIX} Chat insert error:`, chatError.message);
        return {
          success: false,
          chatMessagesCount: 0,
          milestonesCount: 0,
          error: `Failed to migrate chat messages: ${chatError.message}`,
        };
      }
      chatCount = chatRows.length;
    }
  }

  // 4. Migrate journey progress → milestones + journey_events
  const progress = row.journey_progress || {};
  const milestoneRows: Array<Record<string, unknown>> = [];
  const eventRows: Array<Record<string, unknown>> = [];
  const now = new Date().toISOString();

  for (const [key, completed] of Object.entries(progress)) {
    const parsed = parseJourneyKey(key);
    if (!parsed) continue;

    const { stage, milestoneIndex } = parsed;
    const stageConfig = STAGE_MILESTONES[stage];
    if (!stageConfig || milestoneIndex >= stageConfig.milestones.length) continue;

    const title = stageConfig.milestones[milestoneIndex];

    milestoneRows.push({
      user_id: userId,
      title,
      description: `Founder journey: ${stage} stage`,
      category: stageConfig.category,
      status: completed ? "completed" : "pending",
      completed_at: completed ? now : null,
      metadata: {
        source: "funnel",
        funnel_version: row.funnel_version,
        funnel_key: key,
      },
    });

    if (completed) {
      eventRows.push({
        user_id: userId,
        event_type: "milestone_achieved",
        event_data: {
          source: "funnel_migration",
          stage,
          milestone: title,
          funnel_key: key,
        },
      });
    }
  }

  if (milestoneRows.length > 0) {
    const { error: milestoneError } = await supabase
      .from("milestones")
      .insert(milestoneRows);

    if (milestoneError) {
      console.error(`${LOG_PREFIX} Milestone insert error:`, milestoneError.message);
      // Non-fatal — chat messages already migrated
      console.warn(`${LOG_PREFIX} Continuing despite milestone error`);
    } else {
      milestoneCount = milestoneRows.length;
    }
  }

  if (eventRows.length > 0) {
    const { error: eventError } = await supabase
      .from("journey_events")
      .insert(eventRows);

    if (eventError) {
      console.warn(`${LOG_PREFIX} Journey event insert error (non-fatal):`, eventError.message);
    }
  }

  // 5. Mark session as migrated
  const { error: updateError } = await supabase
    .from("funnel_sessions")
    .update({
      migrated_to_user_id: userId,
      migrated_at: now,
    })
    .eq("session_id", sessionId);

  if (updateError) {
    console.error(`${LOG_PREFIX} Failed to mark session as migrated:`, updateError.message);
  }

  console.info(
    `${LOG_PREFIX} Migrated session ${sessionId} → user ${userId}: ${chatCount} messages, ${milestoneCount} milestones`
  );

  return {
    success: true,
    userId,
    chatMessagesCount: chatCount,
    milestonesCount: milestoneCount,
  };
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Parse a funnel journey key like "idea-0" into stage and milestoneIndex.
 */
function parseJourneyKey(
  key: string
): { stage: string; milestoneIndex: number } | null {
  const match = key.match(/^([a-z]+)-(\d+)$/);
  if (!match) {
    console.warn(`${LOG_PREFIX} Invalid journey key format: "${key}"`);
    return null;
  }
  return {
    stage: match[1],
    milestoneIndex: parseInt(match[2], 10),
  };
}

/**
 * Look up a funnel session by session ID (for checking if it exists).
 */
export async function getFunnelSession(sessionId: string) {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("funnel_sessions")
    .select("id, session_id, migrated_to_user_id, migrated_at, last_synced_at, created_at")
    .eq("session_id", sessionId)
    .single();

  if (error) return null;
  return data;
}
