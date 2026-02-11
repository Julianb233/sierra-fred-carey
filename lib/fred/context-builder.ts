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
}

export interface FounderContextData {
  profile: FounderProfile;
  facts: Array<{ category: string; key: string; value: Record<string, unknown> }>;
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
    .select("name, stage, industry, revenue_range, team_size, funding_history, challenges, enrichment_data")
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
  const { profile, facts } = data;

  // Check if we have any data at all
  const hasProfileData =
    profile.name ||
    profile.stage ||
    profile.industry ||
    profile.revenueRange ||
    profile.teamSize ||
    profile.fundingHistory ||
    profile.challenges.length > 0;

  if (!hasProfileData && facts.length === 0) {
    return "";
  }

  lines.push("## FOUNDER SNAPSHOT");
  lines.push("");

  // ---- Core Snapshot Fields (Operating Bible Section 12) ----

  if (profile.name) {
    lines.push(`**Founder:** ${profile.name}`);
  }

  if (profile.stage) {
    const stageLabel = profile.stage.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    lines.push(`**Stage:** ${stageLabel}`);
  }

  if (profile.industry) {
    lines.push(`**Industry:** ${profile.industry}`);
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
    lines.push(`**Revenue:** ${profile.revenueRange}`);
  }

  if (profile.teamSize) {
    lines.push(`**Team:** ${profile.teamSize} ${profile.teamSize === 1 ? "person" : "people"}`);
  }

  if (profile.fundingHistory) {
    lines.push(`**Funding:** ${profile.fundingHistory}`);
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
      const label = typeof challenge === "string"
        ? challenge.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
        : String(challenge);
      lines.push(`- ${label}`);
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

  // ---- Instructions for FRED ----
  lines.push("Use this snapshot to personalize your mentoring. Skip intake questions you already have answers to. Reference what you know naturally. If key snapshot fields are missing (product status, traction, runway, primary constraint, 90-day goal), infer from conversation and state your assumptions.");

  return lines.join("\n");
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Load founder data and build the Founder Snapshot context string for prompt injection.
 *
 * @param userId - Authenticated user ID
 * @param hasPersistentMemory - Whether this tier has persistent memory (Pro+)
 * @returns Context string to inject into the system prompt, or empty string
 */
export async function buildFounderContext(
  userId: string,
  hasPersistentMemory: boolean
): Promise<string> {
  try {
    const [profile, facts] = await Promise.all([
      loadFounderProfile(userId),
      loadSemanticFacts(userId, hasPersistentMemory),
    ]);

    return buildContextBlock({ profile, facts });
  } catch (error) {
    console.warn("[FRED Context] Failed to build founder context (non-blocking):", error);
    return "";
  }
}
