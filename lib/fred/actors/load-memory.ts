/**
 * Load Memory Actor
 * Phase 21: Tier-aware memory loading with configurable depth
 * Phase 63: Embedding-based semantic retrieval merged with recency
 *
 * Loads relevant context from FRED's memory systems before processing.
 * The amount of memory loaded is gated by the user's subscription tier:
 * - Free:   5 recent episodes, no episodic memory, no persistent facts
 * - Pro:    20 recent episodes, 10 episodic items, 30-day retention
 * - Studio: 50 recent episodes, 25 episodic items, 90-day retention
 *
 * When currentMessage is provided, embedding-based similarity search runs
 * in parallel with recency queries. Results are merged and deduplicated.
 * Embedding failures fall back silently to recency-only behavior.
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
 * @param preloadedFacts - Pre-loaded semantic facts to avoid duplicate DB calls
 * @param currentMessage - Current user message for embedding-based retrieval
 * @returns MemoryContext with tier-appropriate depth
 */
export async function loadMemoryActor(
  userId: string,
  sessionId: string,
  tier: string = "free",
  preloadedFacts?: Array<{ category: string; key: string; value: Record<string, unknown> }>,
  currentMessage?: string
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
      searchEpisodesByEmbedding,
      searchFactsByEmbedding,
    } = await import("@/lib/db/fred-memory");

    // Phase 63: Generate embedding for current message (if provided)
    // This runs in parallel with recency queries below.
    let embeddingPromise: Promise<number[] | null> = Promise.resolve(null);
    if (config.loadEpisodic && currentMessage) {
      embeddingPromise = (async () => {
        try {
          const { generateEmbedding } = await import("@/lib/ai/fred-client");
          const result = await generateEmbedding(currentMessage.slice(0, 8000));
          return result.embedding;
        } catch (error) {
          console.warn("[FRED] Embedding generation for memory search failed (falling back to recency):", error);
          return null;
        }
      })();
    }

    // Load in parallel for efficiency, applying tier-based limits.
    // If facts were pre-loaded by buildFounderContext, skip the duplicate DB call.
    const [episodes, facts, decisions, embedding] = await Promise.all([
      config.loadEpisodic
        ? retrieveRecentEpisodes(userId, { limit: config.maxEpisodicItems }).catch(() => [])
        : Promise.resolve([]),
      preloadedFacts
        ? Promise.resolve(preloadedFacts)
        : getAllUserFacts(userId).then((f) => f.map((fact) => ({ category: fact.category, key: fact.key, value: fact.value }))).catch(() => []),
      getRecentDecisions(userId, { limit: Math.min(config.maxMessages, 10) }).catch(() => []),
      embeddingPromise,
    ]);

    // Phase 63: If embedding available, run similarity search and merge results
    let mergedEpisodes = episodes;
    let mergedFacts = facts;

    if (embedding) {
      try {
        const [similarEpisodes, similarFacts] = await Promise.all([
          searchEpisodesByEmbedding(userId, embedding, {
            limit: 5,
            similarityThreshold: 0.75,
          }).catch(() => []),
          searchFactsByEmbedding(userId, embedding, {
            limit: 5,
            similarityThreshold: 0.7,
          }).catch(() => []),
        ]);

        // Merge and deduplicate episodes by ID
        if (similarEpisodes.length > 0) {
          const seenIds = new Set(episodes.map((e) => e.id));
          const newEpisodes = similarEpisodes.filter((e) => !seenIds.has(e.id));
          mergedEpisodes = [...episodes, ...newEpisodes].slice(0, config.maxEpisodicItems);
        }

        // Merge and deduplicate facts by category+key composite key
        if (similarFacts.length > 0) {
          const seenKeys = new Set(
            (facts as Array<{ category: string; key: string; value: Record<string, unknown> }>)
              .map((f) => `${f.category}:${f.key}`)
          );
          const newFacts = similarFacts
            .filter((f) => !seenKeys.has(`${f.category}:${f.key}`))
            .map((f) => ({ category: f.category, key: f.key, value: f.value }));
          mergedFacts = [...(facts as Array<{ category: string; key: string; value: Record<string, unknown> }>), ...newFacts];
        }
      } catch (error) {
        // Embedding search failed — fall back to recency-only (already have results)
        console.warn("[FRED] Embedding-based memory search failed (using recency only):", error);
      }
    }

    return {
      recentEpisodes: mergedEpisodes
        .slice(0, config.maxEpisodicItems)
        .map((e) => ({
          eventType: e.eventType,
          content: e.content,
          createdAt: e.createdAt,
        })),
      relevantFacts: (mergedFacts as Array<{ category: string; key: string; value: Record<string, unknown> }>).map((f) => ({
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
