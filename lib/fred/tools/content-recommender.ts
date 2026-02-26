/**
 * Content Recommender Tool
 *
 * Searches the Sahara content library for courses, articles, or videos
 * relevant to the founder's current situation.
 */

import { tool } from "ai";
import { z } from "zod";
import { searchContentLibrary } from "@/lib/db/content";

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
  execute: async ({ query, stage, format }) => {
    try {
      const courses = await searchContentLibrary({ query, stage, format });

      if (courses.length === 0) {
        return {
          status: "no_results" as const,
          query,
          message: `No content found for "${query}" yet. I'll guide you directly on this topic.`,
          courses: [],
        };
      }

      return {
        status: "success" as const,
        query,
        courses: courses.map((c) => ({
          id: c.id,
          title: c.title,
          description: c.description,
          stage: c.stage ?? undefined,
          topic: c.topic ?? undefined,
          tier_required: c.tier_required,
          slug: c.slug,
        })),
      };
    } catch {
      // Graceful degradation — if DB query fails, fall back to stub behavior
      return {
        status: "coming_soon" as const,
        query,
        message: `Content library search temporarily unavailable. Based on "${query}", I'll guide you directly.`,
        suggestedTopics: [] as string[],
      };
    }
  },
});
