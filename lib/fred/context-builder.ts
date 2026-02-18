/**
 * Founder Context Builder
 * Phase 34: Dynamic context injection for personalized mentoring
 *
 * Builds the Founder Snapshot (Operating Bible Section 12) by loading
 * profile data and semantic memory facts, then producing a context block
 * that gets injected into the FRED system prompt.
 *
 * Founder Snapshot fields (Section 12):
 * - stage, product status, traction, runway, primary constraint, 90-day goal
 * Plus enrichment: industry, team size, revenue, funding, challenges, metrics
 */

import { createServiceClient } from "@/lib/supabase/server";
import { sanitizeUserInput } from "@/lib/ai/guards/prompt-guard";
import type { SemanticMemory } from "@/lib/db/fred-memory";

// ============================================================================
// Types
// ============================================================================

export interface FounderProfile {
  name: string | null;
  stage: string | null;
  industry: string | null;
  revenueRange: string | null;
  teamSize: number | null;
  fundingHistory: string | null;
  challenges: string[];
  enrichmentData: Record<string, unknown> | null;
  onboardingCompleted: boolean;
}

export interface FounderContextData {
  profile: FounderProfile;
  facts: Array<{ category: string; key: string; value: Record<string, unknown> }>;
  isFirstConversation: boolean;
}

// ============================================================================
// Profile Loader
// ============================================================================

/**
 * Load the founder's profile from the profiles table.
 * Returns null fields for any missing data — callers decide what to show.
 */
async function loadFounderProfile(userId: string): Promise<FounderProfile> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("profiles")
    .select("name, stage, industry, revenue_range, team_size, funding_history, challenges, enrichment_data, onboarding_completed")
    .eq("id", userId)
    .single();

  if (error || !data) {
    return {
      name: null,
      stage: null,
      industry: null,
      revenueRange: null,
      teamSize: null,
      fundingHistory: null,
      challenges: [],
      enrichmentData: null,
      onboardingCompleted: false,
    };
  }

  return {
    name: data.name ?? null,
    stage: data.stage ?? null,
    industry: data.industry ?? null,
    revenueRange: data.revenue_range ?? null,
    teamSize: data.team_size ?? null,
    fundingHistory: data.funding_history ?? null,
    challenges: Array.isArray(data.challenges) ? data.challenges : [],
    enrichmentData: (data.enrichment_data as Record<string, unknown>) ?? null,
    onboardingCompleted: !!data.onboarding_completed,
  };
}

// ============================================================================
// Semantic Memory Loader
// ============================================================================

/**
 * Load relevant semantic facts about the founder from memory.
 * Only loads for tiers with persistent memory.
 */
async function loadSemanticFacts(
  userId: string,
  hasPersistentMemory: boolean
): Promise<Array<{ category: string; key: string; value: Record<string, unknown> }>> {
  if (!hasPersistentMemory) return [];

  try {
    const { getAllUserFacts } = await import("@/lib/db/fred-memory");
    const facts = await getAllUserFacts(userId);
    return facts.map((f: SemanticMemory) => ({
      category: f.category,
      key: f.key,
      value: f.value,
    }));
  } catch {
    return [];
  }
}

// ============================================================================
// First Conversation Detection
// ============================================================================

/**
 * Check if this is the user's first conversation with FRED.
 * Uses the conversation state table — if no row exists, this is a first chat.
 */
async function checkIsFirstConversation(userId: string): Promise<boolean> {
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("fred_conversation_state")
      .select("id")
      .eq("user_id", userId)
      .single();
    // PGRST116 = no rows returned
    if (error?.code === "PGRST116" || !data) return true;
    return false;
  } catch {
    return true; // Default to first conversation if check fails
  }
}

// ============================================================================
// Sanitization Helper
// ============================================================================

/** Sanitize a user-controlled string value before including it in the context block. */
function sanitize(value: string, maxLength = 500): string {
  return sanitizeUserInput(value, maxLength);
}

// ============================================================================
// Fact Value Extractor
// ============================================================================

/**
 * Extract a string value from a semantic memory fact's value object.
 * Facts store values as Record<string, unknown>, so we need to pull
 * the meaningful content out. All extracted values are sanitized.
 */
function extractFactValue(
  facts: Array<{ category: string; key: string; value: Record<string, unknown> }>,
  category: string,
  key: string
): string | null {
  const fact = facts.find((f) => f.category === category && f.key === key);
  if (!fact) return null;
  // Try common patterns: { value: "..." }, { text: "..." }, or the whole object
  if (typeof fact.value === "string") return sanitize(fact.value);
  if (typeof fact.value.value === "string") return sanitize(fact.value.value);
  if (typeof fact.value.text === "string") return sanitize(fact.value.text);
  const str = JSON.stringify(fact.value);
  return str.length <= 200 ? sanitize(str) : null;
}

// ============================================================================
// Context Block Builder
// ============================================================================

/**
 * Build a Founder Snapshot context block from profile + facts.
 * Follows Operating Bible Section 12 structure.
 * Returns an empty string if no meaningful data is available.
 */
function buildContextBlock(data: FounderContextData): string {
  const lines: string[] = [];
  const { profile, facts, isFirstConversation } = data;

  // Check if we have any data at all
  const hasProfileData =
    profile.name ||
    profile.stage ||
    profile.industry ||
    profile.revenueRange ||
    profile.teamSize ||
    profile.fundingHistory ||
    profile.challenges.length > 0;

  // Even with no profile data, if this is the first conversation we need handoff instructions
  if (!hasProfileData && facts.length === 0 && !isFirstConversation) {
    return "";
  }

  lines.push("## FOUNDER SNAPSHOT");
  lines.push("");

  // ---- Core Snapshot Fields (Operating Bible Section 12) ----

  if (profile.name) {
    lines.push(`**Founder:** ${sanitize(profile.name)}`);
  }

  if (profile.stage) {
    const stageLabel = profile.stage.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    lines.push(`**Stage:** ${sanitize(stageLabel)}`);
  }

  if (profile.industry) {
    lines.push(`**Industry:** ${sanitize(profile.industry)}`);
  }

  // Product status — from semantic memory
  const productStatus = extractFactValue(facts, "product_details", "product_status")
    || extractFactValue(facts, "startup_facts", "product_status");
  if (productStatus) {
    lines.push(`**Product Status:** ${productStatus}`);
  }

  // Traction — from semantic memory or enrichment
  const traction = extractFactValue(facts, "metrics", "traction")
    || extractFactValue(facts, "startup_facts", "traction");
  if (traction) {
    lines.push(`**Traction:** ${traction}`);
  } else if (profile.revenueRange) {
    lines.push(`**Revenue:** ${sanitize(profile.revenueRange)}`);
  }

  if (profile.teamSize) {
    lines.push(`**Team:** ${profile.teamSize} ${profile.teamSize === 1 ? "person" : "people"}`);
  }

  if (profile.fundingHistory) {
    lines.push(`**Funding:** ${sanitize(profile.fundingHistory)}`);
  }

  // Runway — from semantic memory
  const runway = extractFactValue(facts, "metrics", "runway")
    || extractFactValue(facts, "startup_facts", "runway");
  if (runway) {
    lines.push(`**Runway:** ${runway}`);
  }

  // Primary constraint — from semantic memory
  const constraint = extractFactValue(facts, "startup_facts", "primary_constraint")
    || extractFactValue(facts, "challenges", "primary_constraint");
  if (constraint) {
    lines.push(`**Primary Constraint:** ${constraint}`);
  }

  // 90-day goal — from semantic memory
  const goal90 = extractFactValue(facts, "goals", "90_day_goal")
    || extractFactValue(facts, "startup_facts", "90_day_goal");
  if (goal90) {
    lines.push(`**90-Day Goal:** ${goal90}`);
  }

  lines.push("");

  // ---- Challenges ----
  if (profile.challenges.length > 0) {
    lines.push("**Current Challenges:**");
    for (const challenge of profile.challenges) {
      const raw = typeof challenge === "string"
        ? challenge.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
        : String(challenge);
      lines.push(`- ${sanitize(raw)}`);
    }
    lines.push("");
  }

  // ---- Enrichment Data (from prior conversations) ----
  if (profile.enrichmentData) {
    const ed = profile.enrichmentData;
    const enrichmentParts: string[] = [];

    if (ed.revenueHint && !traction && !profile.revenueRange) {
      enrichmentParts.push(`Revenue mentioned: ${sanitize(String(ed.revenueHint))}`);
    }
    if (ed.teamSizeHint && !profile.teamSize) {
      enrichmentParts.push(`Team size mentioned: ${sanitize(String(ed.teamSizeHint))}`);
    }
    if (ed.fundingHint && !profile.fundingHistory) {
      enrichmentParts.push(`Funding status: ${sanitize(String(ed.fundingHint))}`);
    }
    if (Array.isArray(ed.competitorsMentioned) && ed.competitorsMentioned.length > 0) {
      enrichmentParts.push(`Competitors mentioned: ${ed.competitorsMentioned.map((c: unknown) => sanitize(String(c))).join(", ")}`);
    }
    if (ed.metricsShared && typeof ed.metricsShared === "object") {
      const metrics = ed.metricsShared as Record<string, string>;
      const metricEntries = Object.entries(metrics);
      if (metricEntries.length > 0) {
        enrichmentParts.push(
          `Metrics shared: ${metricEntries.map(([k, v]) => `${sanitize(k)}: ${sanitize(String(v))}`).join(", ")}`
        );
      }
    }

    if (enrichmentParts.length > 0) {
      lines.push("**From Prior Conversations:**");
      for (const part of enrichmentParts) {
        lines.push(`- ${part}`);
      }
      lines.push("");
    }
  }

  // ---- Additional Semantic Memory Facts ----
  // Only include facts not already surfaced above
  const surfacedKeys = new Set([
    "product_status", "traction", "runway", "primary_constraint", "90_day_goal",
  ]);
  const remainingFacts = facts.filter(
    (f) => !surfacedKeys.has(f.key)
  );

  if (remainingFacts.length > 0) {
    lines.push("**Additional Context (from memory):**");

    // Group by category
    const grouped = new Map<string, Array<{ key: string; value: Record<string, unknown> }>>();
    for (const fact of remainingFacts) {
      const existing = grouped.get(fact.category) || [];
      existing.push({ key: fact.key, value: fact.value });
      grouped.set(fact.category, existing);
    }

    for (const [category, items] of grouped) {
      const categoryLabel = category.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
      lines.push(`  *${categoryLabel}:*`);
      for (const item of items.slice(0, 5)) {
        const rawValue =
          typeof item.value === "string"
            ? item.value
            : typeof item.value.value === "string"
              ? item.value.value
              : JSON.stringify(item.value).slice(0, 200);
        lines.push(`  - ${sanitize(item.key)}: ${sanitize(rawValue)}`);
      }
    }
    lines.push("");
  }

  // ---- Handoff Instructions for FRED ----
  if (isFirstConversation && profile.onboardingCompleted && hasProfileData) {
    // Completed onboarding -> FRED should reference what's known and go deeper
    lines.push("## HANDOFF: FIRST CONVERSATION AFTER ONBOARDING");
    lines.push("");
    lines.push("This founder just completed onboarding and collected the data above. This is your first real conversation.");
    lines.push("- Reference what you already know naturally: \"You mentioned you're at [stage] working in [industry]...\"");
    lines.push("- Do NOT re-ask for stage, industry, challenge, team size, revenue, or funding -- you already have this.");
    lines.push("- Go deeper: ask about the specifics that onboarding didn't capture (product status, traction metrics, runway, 90-day goal, who their buyer is).");
    lines.push("- Apply the Universal Entry Flow with context: since you know their challenge, start there. Ask what they've tried, what's working, what's stuck.");
    lines.push("- Begin building the full Founder Snapshot by filling in the missing fields through natural conversation.");
  } else if (isFirstConversation && !hasProfileData) {
    // Skipped onboarding or no data -> FRED should run the Founder Intake Protocol
    lines.push("## HANDOFF: FIRST CONVERSATION (NO ONBOARDING DATA)");
    lines.push("");
    lines.push("This founder has no onboarding data. They either skipped onboarding or are a new user.");
    lines.push("- Run the Universal Entry Flow: \"What are you building?\", \"Who is it for?\", \"What are you trying to accomplish right now?\"");
    lines.push("- Gather the Founder Snapshot fields naturally through conversation: stage, product status, traction, runway, primary constraint, 90-day goal.");
    lines.push("- Do NOT mention onboarding, forms, or that data is missing. Just mentor naturally.");
    lines.push("- Ask 2-3 questions at a time, respond thoughtfully, then gather more. This is mentoring, not an interrogation.");
  } else {
    // Returning user with context
    lines.push("Use this snapshot to personalize your mentoring. Skip intake questions you already have answers to. Reference what you know naturally. If key snapshot fields are missing (product status, traction, runway, primary constraint, 90-day goal), infer from conversation and state your assumptions.");
  }

  return lines.join("\n");
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Load founder data and build the Founder Snapshot context string for prompt injection.
 *
 * Phase 35: Also detects first-conversation state for onboarding handoff.
 * When this is the first conversation after onboarding, the context block
 * includes handoff instructions so FRED references known data and goes deeper.
 * When onboarding was skipped, instructions tell FRED to run the intake protocol.
 *
 * @param userId - Authenticated user ID
 * @param hasPersistentMemory - Whether this tier has persistent memory (Pro+)
 * @returns Context string to inject into the system prompt, or empty string
 */
export async function buildFounderContext(
  userId: string,
  hasPersistentMemory: boolean
): Promise<string> {
  const result = await buildFounderContextWithFacts(userId, hasPersistentMemory);
  return result.context;
}

/**
 * Build founder context AND return the pre-loaded semantic facts.
 * The facts can be passed into the XState machine to avoid a duplicate
 * getAllUserFacts DB call in loadMemoryActor.
 */
export async function buildFounderContextWithFacts(
  userId: string,
  hasPersistentMemory: boolean
): Promise<{ context: string; facts: Array<{ category: string; key: string; value: Record<string, unknown> }> }> {
  try {
    const [profile, facts, isFirstConversation, progressContext] = await Promise.all([
      loadFounderProfile(userId),
      loadSemanticFacts(userId, hasPersistentMemory),
      checkIsFirstConversation(userId),
      loadProgressContext(userId),
    ]);

    // Phase 35: On first conversation, seed the conversation state founder_snapshot
    // from the profile data collected during onboarding (fire-and-forget)
    if (isFirstConversation && profile.onboardingCompleted) {
      seedFounderSnapshot(userId);
    }

    let context = buildContextBlock({ profile, facts, isFirstConversation });

    // Phase 36: Append step progress if available
    if (progressContext) {
      context += "\n\n" + progressContext;
    }

    return { context, facts };
  } catch (error) {
    console.warn("[FRED Context] Failed to build founder context (non-blocking):", error);
    return { context: "", facts: [] };
  }
}

// ============================================================================
// Progress Context Loader
// ============================================================================

/**
 * Load the step progress context string from the conversation state DAL.
 * Returns null if no state exists or loading fails — never blocks the pipeline.
 */
async function loadProgressContext(userId: string): Promise<string | null> {
  try {
    const { buildProgressContext } = await import("@/lib/db/conversation-state");
    const context = await buildProgressContext(userId);
    return context || null;
  } catch {
    return null;
  }
}

/**
 * Seed the conversation state founder_snapshot from the profile table.
 * Called on first conversation after onboarding completes.
 * Fire-and-forget — errors are logged but never thrown.
 */
function seedFounderSnapshot(userId: string): void {
  (async () => {
    try {
      const { syncSnapshotFromProfile } = await import("@/lib/db/conversation-state");
      await syncSnapshotFromProfile(userId);
    } catch (error) {
      console.warn("[FRED Context] Failed to seed founder snapshot (non-blocking):", error);
    }
  })();
}
