/**
 * Load Memory Actor
 * Phase 21: Tier-aware memory loading with configurable depth
 *
 * Loads relevant context from FRED's memory systems before processing.
 * The amount of memory loaded is gated by the user's subscription tier:
 * - Free:   5 recent episodes, no episodic memory, no persistent facts
 * - Pro:    20 recent episodes, 10 episodic items, 30-day retention
 * - Studio: 50 recent episodes, 25 episodic items, 90-day retention
 */

import { MEMORY_CONFIG } from "@/lib/constants";
import type { MemoryTier } from "@/lib/constants";
import type { MemoryContext } from "../types";

/**
 * Load memory context for a session, gated by user tier.
 * This provides FRED with historical context about the user.
 *
 * @param userId - Authenticated user ID
 * @param sessionId - Current session ID
 * @param tier - User subscription tier (defaults to "free")
 * @returns MemoryContext with tier-appropriate depth
 */
export async function loadMemoryActor(
  userId: string,
  sessionId: string,
  tier: string = "free",
  preloadedFacts?: Array<{ category: string; key: string; value: Record<string, unknown> }>
): Promise<MemoryContext> {
  // Resolve tier config with graceful fallback
  const normalizedTier = (tier?.toLowerCase() || "free") as MemoryTier;
  const config = MEMORY_CONFIG[normalizedTier] || MEMORY_CONFIG.free;

  try {
    // If retention is 0 (Free tier), skip persistent memory entirely
    if (config.retentionDays === 0) {
      return {
        recentEpisodes: [],
        relevantFacts: preloadedFacts ?? [],
        recentDecisions: [],
      };
    }

    // Dynamically import to avoid circular dependencies
    const {
      retrieveRecentEpisodes,
      getAllUserFacts,
      getRecentDecisions,
    } = await import("@/lib/db/fred-memory");

    // Load in parallel for efficiency, applying tier-based limits.
    // If facts were pre-loaded by buildFounderContext, skip the duplicate DB call.
    const [episodes, facts, decisions] = await Promise.all([
      config.loadEpisodic
        ? retrieveRecentEpisodes(userId, { limit: config.maxEpisodicItems }).catch(() => [])
        : Promise.resolve([]),
      preloadedFacts
        ? Promise.resolve(preloadedFacts)
        : getAllUserFacts(userId).then((f) => f.map((fact) => ({ category: fact.category, key: fact.key, value: fact.value }))).catch(() => []),
      getRecentDecisions(userId, { limit: Math.min(config.maxMessages, 10) }).catch(() => []),
    ]);

    return {
      recentEpisodes: episodes
        .slice(0, config.maxEpisodicItems)
        .map((e) => ({
          eventType: e.eventType,
          content: e.content,
          createdAt: e.createdAt,
        })),
      relevantFacts: facts.map((f) => ({
        category: f.category,
        key: f.key,
        value: f.value,
      })),
      recentDecisions: decisions
        .slice(0, Math.min(config.maxMessages, 10))
        .map((d) => ({
          decisionType: d.decisionType,
          recommendation: d.recommendation || {},
          outcome: d.outcome,
        })),
    };
  } catch (error) {
    console.error("[FRED] Error loading memory:", error);
    // Return empty context on error - memory is non-critical
    return {
      recentEpisodes: [],
      relevantFacts: preloadedFacts ?? [],
      recentDecisions: [],
    };
  }
}
