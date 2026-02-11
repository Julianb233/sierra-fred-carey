/**
 * Founder Context Builder
 * Phase 34: Dynamic context injection for personalized mentoring
 *
 * Loads founder profile data and semantic memory facts, then builds
 * a context block that gets injected into the FRED system prompt.
 *
 * This gives FRED awareness of who the founder is, what they're building,
 * their stage, challenges, metrics, and prior conversation history —
 * so every response is grounded in their specific situation.
 */

import { createServiceClient } from "@/lib/supabase/server";
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
// Context Block Builder
// ============================================================================

/**
 * Build a human-readable context block from profile + facts.
 * Returns an empty string if no meaningful data is available.
 */
function buildContextBlock(data: FounderContextData): string {
  const lines: string[] = [];
  const { profile, facts } = data;

  // Check if we have any profile data at all
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

  lines.push("## FOUNDER CONTEXT");
  lines.push("The following is what you know about this founder from their profile and prior conversations. Use this to personalize your mentoring.");
  lines.push("");

  // Profile summary
  if (hasProfileData) {
    const profileParts: string[] = [];

    if (profile.name) {
      profileParts.push(`**Founder**: ${profile.name}`);
    }

    if (profile.stage) {
      const stageLabel = profile.stage.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
      profileParts.push(`**Stage**: ${stageLabel}`);
    }

    if (profile.industry) {
      profileParts.push(`**Industry**: ${profile.industry}`);
    }

    if (profile.revenueRange) {
      profileParts.push(`**Revenue**: ${profile.revenueRange}`);
    }

    if (profile.teamSize) {
      profileParts.push(`**Team Size**: ${profile.teamSize} ${profile.teamSize === 1 ? "person" : "people"}`);
    }

    if (profile.fundingHistory) {
      profileParts.push(`**Funding**: ${profile.fundingHistory}`);
    }

    if (profileParts.length > 0) {
      lines.push(profileParts.join(" | "));
      lines.push("");
    }

    // Challenges
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

    // Enrichment data (revenue hints, competitors, metrics from conversations)
    if (profile.enrichmentData) {
      const ed = profile.enrichmentData;
      const enrichmentParts: string[] = [];

      if (ed.revenueHint) {
        enrichmentParts.push(`Revenue mentioned: ${ed.revenueHint}`);
      }
      if (ed.teamSizeHint) {
        enrichmentParts.push(`Team size mentioned: ${ed.teamSizeHint}`);
      }
      if (ed.fundingHint) {
        enrichmentParts.push(`Funding status: ${ed.fundingHint}`);
      }
      if (Array.isArray(ed.competitorsMentioned) && ed.competitorsMentioned.length > 0) {
        enrichmentParts.push(`Competitors mentioned: ${ed.competitorsMentioned.join(", ")}`);
      }
      if (ed.metricsShared && typeof ed.metricsShared === "object") {
        const metrics = ed.metricsShared as Record<string, string>;
        const metricEntries = Object.entries(metrics);
        if (metricEntries.length > 0) {
          enrichmentParts.push(
            `Metrics shared: ${metricEntries.map(([k, v]) => `${k}: ${v}`).join(", ")}`
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
  }

  // Semantic memory facts
  if (facts.length > 0) {
    lines.push("**Known Facts (from memory):**");

    // Group facts by category for readability
    const grouped = new Map<string, Array<{ key: string; value: Record<string, unknown> }>>();
    for (const fact of facts) {
      const existing = grouped.get(fact.category) || [];
      existing.push({ key: fact.key, value: fact.value });
      grouped.set(fact.category, existing);
    }

    for (const [category, items] of grouped) {
      const categoryLabel = category.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
      lines.push(`  *${categoryLabel}:*`);
      for (const item of items.slice(0, 5)) {
        // Limit per category to prevent prompt bloat
        const valueStr =
          typeof item.value === "string"
            ? item.value
            : JSON.stringify(item.value).slice(0, 200);
        lines.push(`  - ${item.key}: ${valueStr}`);
      }
    }
    lines.push("");
  }

  lines.push("Use this context to skip the intake questions you already have answers to. Reference what you know naturally — e.g., \"Since you're at the seed stage and building in healthcare...\"");

  return lines.join("\n");
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Load founder data and build the dynamic context string for prompt injection.
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
