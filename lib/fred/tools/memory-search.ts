/**
 * Memory Search Tool
 *
 * Searches past conversations with a founder to recall what was previously
 * discussed. Uses embedding-based similarity search on episodic memory.
 *
 * Status: Working — uses existing memory infrastructure from Phase 63-01.
 */

import { tool } from "ai";
import { z } from "zod";
import { generateEmbedding } from "@/lib/ai/fred-client";
import { searchEpisodesByEmbedding } from "@/lib/db/fred-memory";

/**
 * Factory function that returns a memory search tool bound to the current user.
 */
export function createMemorySearchTool(userId: string) {
  return tool({
    description:
      "Search your conversation history with this founder to recall what was previously discussed. Use when the founder references a past conversation, asks 'remember when we talked about...', or when you need context about prior decisions.",
    inputSchema: z.object({
      query: z.string().describe("What to search for in past conversations"),
      limit: z
        .number()
        .min(1)
        .max(10)
        .default(5)
        .describe("Number of results"),
    }),
    execute: async ({ query, limit }) => {
      try {
        const embeddingResult = await generateEmbedding(query);
        const episodes = await searchEpisodesByEmbedding(
          userId,
          embeddingResult.embedding,
          { limit, similarityThreshold: 0.65 }
        );

        const results = episodes.map((episode) => ({
          summary:
            (episode.content.content as string) ||
            JSON.stringify(episode.content),
          date: episode.createdAt.toISOString(),
          relevance: episode.similarity,
        }));

        return { results, count: results.length };
      } catch {
        return {
          results: [] as Array<{
            summary: string;
            date: string;
            relevance: number;
          }>,
          count: 0,
          error: "Memory search temporarily unavailable",
        };
      }
    },
  });
}
