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
import { STEP_TITLES, type StepNumber } from "@/types/startup-process";
import { buildActiveFounderMemory, formatMemoryBlock } from "@/lib/fred/active-memory";
import type { FounderMemory } from "@/lib/fred/founder-memory-types";
import { buildStageGatePromptBlock } from "@/lib/oases/stage-validator";
import type { OasesStage } from "@/types/oases";

// ============================================================================
// Types
// ============================================================================

export interface FounderProfile {
  name: string | null;
  companyName: string | null;
  stage: string | null;
  industry: string | null;
  coFounder: string | null;
  revenueRange: string | null;
  teamSize: number | null;
  fundingHistory: string | null;
  challenges: string[];
  enrichmentData: Record<string, unknown> | null;
  onboardingCompleted: boolean;
  oasesStage: string | null;
  updatedAt: string | null;
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
    .select("name, company_name, stage, industry, co_founder, revenue_range, team_size, funding_history, challenges, enrichment_data, onboarding_completed, oases_stage, updated_at")
    .eq("id", userId)
    .single();

  if (error || !data) {
    return {
      name: null,
      companyName: null,
      stage: null,
      industry: null,
      coFounder: null,
      revenueRange: null,
      teamSize: null,
      fundingHistory: null,
      challenges: [],
      enrichmentData: null,
      onboardingCompleted: false,
      oasesStage: null,
      updatedAt: null,
    };
  }

  return {
    name: data.name ?? null,
    companyName: data.company_name ?? null,
    stage: data.stage ?? null,
    industry: data.industry ?? null,
    coFounder: data.co_founder ?? null,
    revenueRange: data.revenue_range ?? null,
    teamSize: data.team_size ?? null,
    fundingHistory: data.funding_history ?? null,
    challenges: Array.isArray(data.challenges) ? data.challenges : [],
    enrichmentData: (data.enrichment_data as Record<string, unknown>) ?? null,
    onboardingCompleted: !!data.onboarding_completed,
    oasesStage: data.oases_stage ?? null,
    updatedAt: data.updated_at ?? null,
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
// Startup Process Loader
// ============================================================================

/**
 * Load the founder's 9-Step Startup Process progress from the dashboard.
 * Returns null if no process record exists.
 */
async function loadStartupProcessProgress(userId: string): Promise<{
  currentStep: StepNumber;
  completedSteps: StepNumber[];
  completionPercentage: number;
} | null> {
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("startup_processes")
      .select("current_step, step_1_completed, step_2_completed, step_3_completed, step_4_completed, step_5_completed, step_6_completed, step_7_completed, step_8_completed, step_9_completed, completion_percentage")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (error || !data) return null;

    const completedSteps: StepNumber[] = [];
    for (let i = 1; i <= 9; i++) {
      if (data[`step_${i}_completed` as keyof typeof data]) {
        completedSteps.push(i as StepNumber);
      }
    }

    return {
      currentStep: (Number(data.current_step) || 1) as StepNumber,
      completedSteps,
      completionPercentage: Number(data.completion_percentage) || 0,
    };
  } catch {
    return null;
  }
}

// ============================================================================
// First Conversation Detection
// ============================================================================

/**
 * Check if this is the user's first conversation with FRED.
 * Uses the conversation state table — if no row exists, this is a first chat.
 */
/**
 * Derive isFirstConversation from a pre-loaded conversation state.
 * When the route already fetched conversation state via getOrCreateConversationState,
 * pass it here to avoid a duplicate fred_conversation_state DB query.
 * Falls back to a lightweight SELECT when no pre-loaded state is provided (e.g. SMS handler).
 */
async function loadConversationStateContext(
  userId: string,
  preloadedConversationState?: { id: string } | null
): Promise<{
  isFirstConversation: boolean;
}> {
  // If caller provided a pre-loaded state, use it directly (no DB call)
  if (preloadedConversationState !== undefined) {
    return { isFirstConversation: preloadedConversationState === null };
  }

  // Fallback: query DB (used by buildFounderContext without pre-loaded state, e.g. SMS)
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("fred_conversation_state")
      .select("id")
      .eq("user_id", userId)
      .single();
    // PGRST116 = no rows returned
    if (error?.code === "PGRST116" || !data) {
      return { isFirstConversation: true };
    }
    return { isFirstConversation: false };
  } catch {
    return { isFirstConversation: true };
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
 * @deprecated Phase 79: Use formatMemoryBlock(founderMemory) from active-memory.ts instead.
 * This function is kept for backward compatibility with any code paths that
 * still reference it directly. New code should use the active memory layer.
 *
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

  // Cap total additional facts to prevent context window overflow
  const MAX_ADDITIONAL_FACTS_TOTAL = 15;
  if (remainingFacts.length > 0) {
    lines.push("**Additional Context (from memory):**");

    // Group by category
    const grouped = new Map<string, Array<{ key: string; value: Record<string, unknown> }>>();
    for (const fact of remainingFacts) {
      const existing = grouped.get(fact.category) || [];
      existing.push({ key: fact.key, value: fact.value });
      grouped.set(fact.category, existing);
    }

    let totalIncluded = 0;
    for (const [category, items] of grouped) {
      if (totalIncluded >= MAX_ADDITIONAL_FACTS_TOTAL) break;
      const categoryLabel = category.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
      lines.push(`  *${categoryLabel}:*`);
      const remaining = MAX_ADDITIONAL_FACTS_TOTAL - totalIncluded;
      for (const item of items.slice(0, Math.min(5, remaining))) {
        const rawValue =
          typeof item.value === "string"
            ? item.value
            : typeof item.value.value === "string"
              ? item.value.value
              : JSON.stringify(item.value).slice(0, 200);
        lines.push(`  - ${sanitize(item.key)}: ${sanitize(rawValue)}`);
        totalIncluded++;
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
    lines.push("- A personalized goal roadmap has been generated on their dashboard based on their funding stage. Reference it naturally: \"I've mapped out a roadmap for your stage — you can track progress on your dashboard.\"");
  } else if (isFirstConversation && !hasProfileData) {
    // Skipped onboarding or no data -> FRED should run the Founder Intake Protocol
    lines.push("## HANDOFF: FIRST CONVERSATION (NO ONBOARDING DATA)");
    lines.push("");
    lines.push("This founder has no onboarding data. They either skipped onboarding or are a new user.");
    lines.push("- Run the Universal Entry Flow: \"What are you building?\", \"Who is it for?\", \"What are you trying to accomplish right now?\"");
    lines.push("- Collect the Business Fundamentals naturally: business name, sector, positioning, revenue status, team size, funding stage.");
    lines.push("- ALSO gather deeper Founder Snapshot fields over subsequent messages: product status, traction, runway, primary constraint, 90-day goal.");
    lines.push("- Do NOT mention onboarding, forms, or that data is missing. Just mentor naturally.");
    lines.push("- If they jump straight to a specific topic, collect the 2-3 most critical fundamentals for that topic, then help them. Do not block them from getting value.");
    lines.push("- Ask 2-3 questions at a time, respond thoughtfully, then gather more. This is mentoring, not an interrogation.");
    lines.push("- Once you learn their funding stage, a personalized goal roadmap will be generated on their dashboard. Mention it naturally once you know their stage.");
  } else {
    // Returning user with context
    lines.push("Use this snapshot to personalize your mentoring. Skip intake questions you already have answers to. Reference what you know naturally.");
    // Check which business fundamentals are still missing
    const missingFundamentals: string[] = [];
    if (!profile.name) missingFundamentals.push("business name");
    if (!profile.industry) missingFundamentals.push("sector/industry");
    if (!profile.revenueRange && !extractFactValue(facts, "metrics", "traction")) missingFundamentals.push("revenue status");
    if (!profile.teamSize) missingFundamentals.push("team size");
    if (!profile.fundingHistory) missingFundamentals.push("funding stage");
    if (missingFundamentals.length > 0) {
      lines.push(`**Missing business fundamentals:** ${missingFundamentals.join(", ")}. Weave these into the next 1-2 exchanges naturally — do not ask all at once.`);
    }
    lines.push("If deeper snapshot fields are missing (product status, traction, runway, primary constraint, 90-day goal), infer from conversation and state your assumptions.");
  }

  return lines.join("\n");
}

// ============================================================================
// Recent Assessment Scores Loader
// ============================================================================

/**
 * Load the founder's most recent assessment scores (IRS, Reality Lens, Deck Review)
 * so FRED can reference specific numbers and trends in conversation.
 * Returns a formatted context block or null if no assessments exist.
 */
async function loadRecentAssessments(userId: string): Promise<string | null> {
  try {
    const supabase = createServiceClient();
    const lines: string[] = [];

    // Load in parallel: IRS, Reality Lens status, Deck scores, pending next steps
    const [irsResult, realityLensResult, deckResult, nextStepsResult] = await Promise.all([
      supabase
        .from("investor_readiness_scores")
        .select("overall_score, category_scores, strengths, weaknesses, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(2),
      supabase
        .from("profiles")
        .select("reality_lens_complete, reality_lens_score, oases_stage")
        .eq("id", userId)
        .single(),
      supabase
        .from("deck_score_reviews")
        .select("scorecard, file_name, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("next_steps")
        .select("description, priority, completed, created_at")
        .eq("user_id", userId)
        .eq("completed", false)
        .eq("dismissed", false)
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

    let hasData = false;

    // --- IRS Scores ---
    if (irsResult.data && irsResult.data.length > 0) {
      hasData = true;
      const latest = irsResult.data[0];
      const score = Number(latest.overall_score);
      const date = new Date(latest.created_at as string).toLocaleDateString();
      lines.push("## RECENT ASSESSMENT SCORES");
      lines.push("");
      lines.push(`**Investor Readiness Score:** ${score}/100 (assessed ${date})`);

      // Show category breakdown if available
      const cats = latest.category_scores as Record<string, { score: number }> | null;
      if (cats && typeof cats === "object") {
        const catEntries = Object.entries(cats)
          .map(([k, v]) => `${k}: ${typeof v === "object" && v ? (v as { score: number }).score : v}`)
          .slice(0, 6);
        if (catEntries.length > 0) {
          lines.push(`  Categories: ${catEntries.join(", ")}`);
        }
      }

      // Show top weakness for targeted guidance
      const weaknesses = latest.weaknesses as string[] | null;
      if (weaknesses && weaknesses.length > 0) {
        lines.push(`  Biggest gap: ${sanitize(weaknesses[0])}`);
      }

      // Trend if 2+ scores exist
      if (irsResult.data.length >= 2) {
        const prev = Number(irsResult.data[1].overall_score);
        const diff = score - prev;
        const trend = diff > 0 ? `+${diff} (improving)` : diff < 0 ? `${diff} (declining)` : "stable";
        lines.push(`  Trend: ${trend}`);
      }
    }

    // --- Reality Lens ---
    if (realityLensResult.data?.reality_lens_complete) {
      if (!hasData) {
        lines.push("## RECENT ASSESSMENT SCORES");
        lines.push("");
      }
      hasData = true;
      const rlScore = realityLensResult.data.reality_lens_score;
      const rlStage = realityLensResult.data.oases_stage;
      lines.push(`**Reality Lens Score:** ${rlScore}/100 → Stage: ${rlStage || "unknown"}`);
    }

    // --- Deck Score ---
    if (deckResult.data?.scorecard) {
      if (!hasData) {
        lines.push("## RECENT ASSESSMENT SCORES");
        lines.push("");
      }
      hasData = true;
      const sc = deckResult.data.scorecard as Record<string, unknown>;
      const overallScore = sc.overallScore || sc.overall_score;
      const biggestGap = sc.biggestGap || sc.biggest_gap;
      const date = new Date(deckResult.data.created_at as string).toLocaleDateString();
      lines.push(`**Pitch Deck Score:** ${overallScore}/10 (reviewed ${date})`);
      if (biggestGap) {
        lines.push(`  Biggest gap: ${sanitize(String(biggestGap))}`);
      }
    }

    // --- Pending Next Steps (Accountability) ---
    if (nextStepsResult.data && nextStepsResult.data.length > 0) {
      if (!hasData) {
        lines.push("## RECENT ASSESSMENT SCORES");
        lines.push("");
      }
      hasData = true;
      const pending = nextStepsResult.data.filter((s) => !s.completed);
      if (pending.length > 0) {
        lines.push("");
        lines.push(`**Open Action Items:** ${pending.length} pending`);
        for (const step of pending.slice(0, 3)) {
          lines.push(`  - [${step.priority}] ${sanitize(step.description)}`);
        }
        lines.push("");
        lines.push("ACCOUNTABILITY: If the founder's message relates to a pending action item above, acknowledge their progress. If they haven't mentioned working on their actions, gently check in: \"Last time we talked about [action] — how's that going?\"");
      }
    }

    if (!hasData) return null;

    lines.push("");
    lines.push("Reference these scores naturally when relevant. For example: \"Your IRS is at 72 — your Team score is strong but Traction is holding you back. Let's work on that.\"");

    return lines.join("\n");
  } catch (err) {
    console.warn("[FRED Context] Failed to load assessments (non-blocking):", err);
    return null;
  }
}

// ============================================================================
// Red Flags Loader
// ============================================================================

/**
 * Load active red flags for the founder so FRED can reference current risks.
 * Returns a formatted context block string or null if no active flags.
 */
async function loadActiveRedFlags(userId: string): Promise<string | null> {
  try {
    const { getRedFlags } = await import("@/lib/db/red-flags");
    const flags = await getRedFlags(userId, "active");
    if (flags.length === 0) return null;

    const top = flags.slice(0, 5);
    const lines: string[] = [];
    lines.push("## Active Risk Alerts");
    lines.push("");
    for (const flag of top) {
      lines.push(`- **[${flag.severity.toUpperCase()}]** ${sanitize(flag.title)}`);
    }
    return lines.join("\n");
  } catch {
    return null;
  }
}

// ============================================================================
// Boardy Match Count Loader
// ============================================================================

/**
 * Load active Boardy match counts for the founder so FRED can reference
 * matches in conversation. Only loads when journey is 100% complete (grow stage).
 * Returns a formatted context block or null.
 */
async function loadBoardyMatchCounts(userId: string, oasesStage: string | null): Promise<string | null> {
  // Only inject match data for users who've completed the journey (grow stage)
  if (oasesStage !== "grow") return null

  try {
    const { createServiceClient } = await import("@/lib/supabase/server")
    const supabase = createServiceClient()

    const { data, error } = await supabase
      .from("boardy_matches")
      .select("match_type, status")
      .eq("user_id", userId)
      .neq("status", "declined")

    if (error || !data || data.length === 0) return null

    const investors = data.filter((m) => m.match_type === "investor").length
    const advisors = data.filter((m) => m.match_type !== "investor").length
    const active = data.filter((m) => m.status === "connected" || m.status === "intro_sent" || m.status === "meeting_scheduled").length

    const lines: string[] = []
    lines.push("## BOARDY MATCH DATA")
    lines.push("")
    lines.push(`**Total Active Matches:** ${data.length} (${investors} investor${investors !== 1 ? "s" : ""}, ${advisors} advisor${advisors !== 1 ? "s" : ""})`)
    if (active > 0) {
      lines.push(`**In Progress:** ${active} match${active !== 1 ? "es" : ""} with active introductions`)
    }
    lines.push("")
    lines.push("Use this data when the BOARDY MATCH AWARENESS rules apply. Reference exact counts naturally.")

    return lines.join("\n")
  } catch {
    return null
  }
}

// ============================================================================
// Cross-Channel Context Loader
// ============================================================================

/**
 * Load cross-channel conversation context so FRED knows what was discussed
 * via SMS, voice, and chat. Returns a formatted context block string or null.
 */
async function loadChannelContext(userId: string): Promise<string | null> {
  try {
    const { getConversationContext, buildChannelContextBlock } = await import("@/lib/channels/conversation-context");
    const context = await getConversationContext(userId, 20);
    if (context.totalConversations === 0) return null;
    // Only include cross-channel block if there's activity on non-chat channels
    const hasNonChat = context.channelSummaries.some(
      (s) => s.channel !== "chat" && s.messageCount > 0
    );
    if (!hasNonChat) return null;
    return buildChannelContextBlock(context);
  } catch {
    return null;
  }
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
  hasPersistentMemory: boolean,
  preloadedConversationState?: { id: string } | null
): Promise<{ context: string; facts: Array<{ category: string; key: string; value: Record<string, unknown> }>; memory?: FounderMemory; oasesStage: OasesStage }> {
  try {
    // Load profile, facts, and other context in parallel.
    // buildActiveFounderMemory is called AFTER this to reuse profile + facts,
    // eliminating 2 duplicate DB queries (profile + getAllUserFacts).
    const [profile, facts, { isFirstConversation }, startupProcess, channelContext, redFlagsContext, assessmentsContext] = await Promise.all([
      loadFounderProfile(userId),
      loadSemanticFacts(userId, hasPersistentMemory),
      loadConversationStateContext(userId, preloadedConversationState),
      loadStartupProcessProgress(userId),
      hasPersistentMemory
        ? loadChannelContext(userId)
        : Promise.resolve(null),
      loadActiveRedFlags(userId),
      loadRecentAssessments(userId),
    ]);

    // Build active memory using pre-loaded profile + facts to avoid duplicate DB queries.
    const profileForMemory = {
      name: profile.name,
      company_name: profile.companyName,
      stage: profile.stage,
      industry: profile.industry,
      co_founder: profile.coFounder,
      challenges: profile.challenges,
      oases_stage: profile.oasesStage,
      enrichment_data: profile.enrichmentData,
      updated_at: profile.updatedAt,
    };
    const activeMemory = await buildActiveFounderMemory(userId, hasPersistentMemory, profileForMemory, facts);

    // Phase 35: On first conversation, seed the conversation state founder_snapshot
    // from the profile data collected during onboarding (fire-and-forget)
    if (isFirstConversation && profile.onboardingCompleted) {
      seedFounderSnapshot(userId);
    }

    // Phase 79: Use active memory layer for the core founder context block
    // formatMemoryBlock produces the ACTIVE FOUNDER CONTEXT section with
    // CRITICAL INSTRUCTION, stale field prompts, and missing field collection
    let context = formatMemoryBlock(activeMemory);

    // Append handoff instructions for first conversation (from legacy buildContextBlock)
    const hasProfileData =
      profile.name ||
      profile.stage ||
      profile.industry ||
      profile.revenueRange ||
      profile.teamSize ||
      profile.fundingHistory ||
      profile.challenges.length > 0;

    if (isFirstConversation && profile.onboardingCompleted && hasProfileData) {
      context += "\n\n## HANDOFF: FIRST CONVERSATION AFTER ONBOARDING";
      context += "\n\nThis founder just completed onboarding and collected the data above. This is your first real conversation.";
      context += "\n- Reference what you already know naturally: \"You mentioned you're at [stage] working in [industry]...\"";
      context += "\n- Do NOT re-ask for stage, industry, challenge, team size, revenue, or funding -- you already have this.";
      context += "\n- Go deeper: ask about the specifics that onboarding didn't capture (product status, traction metrics, runway, 90-day goal, who their buyer is).";
      context += "\n- Apply the Universal Entry Flow with context: since you know their challenge, start there. Ask what they've tried, what's working, what's stuck.";
      context += "\n- Begin building the full Founder Snapshot by filling in the missing fields through natural conversation.";
      context += "\n- A personalized goal roadmap has been generated on their dashboard based on their funding stage. Reference it naturally: \"I've mapped out a roadmap for your stage — you can track progress on your dashboard.\"";
    } else if (isFirstConversation && !hasProfileData) {
      context += "\n\n## HANDOFF: FIRST CONVERSATION (NO ONBOARDING DATA)";
      context += "\n\nThis founder has no onboarding data. They either skipped onboarding or are a new user.";
      context += "\n- Run the Universal Entry Flow: \"What are you building?\", \"Who is it for?\", \"What are you trying to accomplish right now?\"";
      context += "\n- Collect the Business Fundamentals naturally: business name, sector, positioning, revenue status, team size, funding stage, co-founder status.";
      context += "\n- ALSO gather deeper Founder Snapshot fields over subsequent messages: product status, traction, runway, primary constraint, 90-day goal.";
      context += "\n- Do NOT mention onboarding, forms, or that data is missing. Just mentor naturally.";
      context += "\n- If they jump straight to a specific topic, collect the 2-3 most critical fundamentals for that topic, then help them. Do not block them from getting value.";
      context += "\n- Ask 2-3 questions at a time, respond thoughtfully, then gather more. This is mentoring, not an interrogation.";
      context += "\n- Once you learn their funding stage, a personalized goal roadmap will be generated on their dashboard. Mention it naturally once you know their stage.";
    }

    // Phase 80: Extract current Oases stage from active memory
    const currentOasesStage = (activeMemory.oases_stage?.value as OasesStage) || "clarity"

    // Wire startup_processes dashboard data into FRED's context
    if (startupProcess) {
      const stepTitle = STEP_TITLES[startupProcess.currentStep] || `Step ${startupProcess.currentStep}`;
      const completedLabels = startupProcess.completedSteps
        .map((n) => `${n}. ${STEP_TITLES[n]}`)
        .join(", ");
      const lines: string[] = [];
      lines.push("## STARTUP PROCESS PROGRESS (Dashboard)");
      lines.push("");
      lines.push(`**Current Step:** ${startupProcess.currentStep} — ${stepTitle}`);
      lines.push(`**Overall Progress:** ${startupProcess.completionPercentage}%`);
      if (completedLabels) {
        lines.push(`**Completed Steps:** ${completedLabels}`);
      }
      lines.push("");
      lines.push("The founder has been working through the 9-Step Startup Process on their dashboard. Reference their progress naturally. If their dashboard step differs from your conversation assessment, align to the dashboard step — it reflects their self-reported progress.");
      context += "\n\n" + lines.join("\n");
    }

    // Phase 89: Inject recent assessment scores + pending action items for accountability
    if (assessmentsContext) {
      context += "\n\n" + assessmentsContext;
    }

    // Phase 85: Inject Boardy match counts for FRED match awareness
    const boardyMatchContext = await loadBoardyMatchCounts(userId, profile.oasesStage)
    if (boardyMatchContext) {
      context += "\n\n" + boardyMatchContext
    }

    // Phase 80: Stage-gate enforcement — tell FRED which topics are allowed
    const stageGateBlock = buildStageGatePromptBlock(currentOasesStage)
    if (stageGateBlock) {
      context += "\n\n" + stageGateBlock
    }

    // Phase 42: Append cross-channel context (SMS, voice, chat history)
    if (channelContext) {
      context += "\n\n" + channelContext;
    }

    // Append active red flags so FRED can reference current risks
    if (redFlagsContext) {
      context += "\n\n" + redFlagsContext;
    }

    return { context, facts, memory: activeMemory, oasesStage: currentOasesStage };
  } catch (error) {
    console.warn("[FRED Context] Failed to build founder context (non-blocking):", error);
    return { context: "", facts: [], oasesStage: "clarity" as OasesStage };
  }
}

// ============================================================================
// Progress Context Loader
// ============================================================================

/**
 * Load the step progress context string from the conversation state DAL.
 * Returns null if no state exists or loading fails — never blocks the pipeline.
 */

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
