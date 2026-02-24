/**
 * Provider Finder Tool
 *
 * Searches the Sahara service marketplace for providers who can help
 * the founder with professional services.
 *
 * Status: Stub for Phase 68/69 — returns structured "coming soon" response.
 */

import { tool } from "ai";
import { z } from "zod";

export const findProviderTool = tool({
  description:
    "Search the Sahara service marketplace for providers who can help the founder with professional services. Use when a founder needs legal, accounting, design, development, or marketing help.",
  inputSchema: z.object({
    serviceType: z
      .string()
      .describe("Type of service needed (e.g., legal, accounting, design)"),
    budget: z
      .enum(["low", "medium", "high", "unknown"])
      .default("unknown"),
    urgency: z
      .enum(["low", "medium", "high"])
      .default("medium"),
  }),
  execute: async ({ serviceType }) => {
    return {
      status: "coming_soon" as const,
      serviceType,
      message: `Service marketplace is being built. I can help you think through what to look for in a ${serviceType} provider.`,
      suggestedQuestions: [
        `What specific ${serviceType} tasks do you need help with?`,
        "What's your timeline?",
      ],
    };
  },
});
