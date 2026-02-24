/**
 * Content Recommender Tool
 *
 * Searches the Sahara content library for courses, articles, or videos
 * relevant to the founder's current situation.
 *
 * Status: Stub for Phase 66/67 — returns structured "coming soon" response.
 */

import { tool } from "ai";
import { z } from "zod";

export const recommendContentTool = tool({
  description:
    "Search the Sahara content library for courses, articles, or videos relevant to the founder's current situation. Use when a founder asks about learning resources, wants to study a topic, or needs educational content.",
  inputSchema: z.object({
    query: z.string().describe("What the founder wants to learn about"),
    stage: z
      .enum(["idea", "pre-seed", "seed", "series-a", "growth"])
      .optional()
      .describe("Startup stage for relevance filtering"),
    format: z
      .enum(["video", "article", "course", "any"])
      .default("any")
      .describe("Preferred content format"),
  }),
  execute: async ({ query }) => {
    return {
      status: "coming_soon" as const,
      query,
      message: `Content library is being built. Based on your question about "${query}", I'll guide you directly.`,
      suggestedTopics: [] as string[],
    };
  },
});
