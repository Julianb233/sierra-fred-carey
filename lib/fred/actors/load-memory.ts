/**
 * Load Memory Actor
 *
 * Loads relevant context from FRED's memory systems before processing.
 */

import type { MemoryContext } from "../types";

/**
 * Load memory context for a session
 * This provides FRED with historical context about the user
 */
export async function loadMemoryActor(
  userId: string,
  sessionId: string
): Promise<MemoryContext> {
  try {
    // Dynamically import to avoid circular dependencies
    const {
      retrieveRecentEpisodes,
      getAllUserFacts,
      getRecentDecisions,
    } = await import("@/lib/db/fred-memory");

    // Load in parallel for efficiency
    const [episodes, facts, decisions] = await Promise.all([
      retrieveRecentEpisodes(userId, { limit: 10 }).catch(() => []),
      getAllUserFacts(userId).catch(() => []),
      getRecentDecisions(userId, { limit: 5 }).catch(() => []),
    ]);

    return {
      recentEpisodes: episodes.map((e) => ({
        eventType: e.eventType,
        content: e.content,
        createdAt: e.createdAt,
      })),
      relevantFacts: facts.map((f) => ({
        category: f.category,
        key: f.key,
        value: f.value,
      })),
      recentDecisions: decisions.map((d) => ({
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
      relevantFacts: [],
      recentDecisions: [],
    };
  }
}
