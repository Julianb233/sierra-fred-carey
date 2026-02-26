/**
 * Provider Finder Tool
 *
 * Searches the Sahara service marketplace for providers who can help
 * the founder with professional services. Upgraded from stub (Phase 68)
 * to query the real service_providers table.
 */

import { tool } from "ai";
import { z } from "zod";
import { getProviders } from "@/lib/db/marketplace";

// Map common service type keywords to marketplace categories
function mapServiceTypeToCategory(
  serviceType: string
): string | undefined {
  const lower = serviceType.toLowerCase();
  if (lower.includes("legal") || lower.includes("lawyer") || lower.includes("attorney") || lower.includes("contract")) {
    return "legal";
  }
  if (lower.includes("financ") || lower.includes("account") || lower.includes("tax") || lower.includes("cfo")) {
    return "finance";
  }
  if (lower.includes("market") || lower.includes("brand") || lower.includes("pr") || lower.includes("public relation")) {
    return "marketing";
  }
  if (lower.includes("growth") || lower.includes("acqui") || lower.includes("retention") || lower.includes("funnel")) {
    return "growth";
  }
  if (lower.includes("tech") || lower.includes("dev") || lower.includes("engineer") || lower.includes("software") || lower.includes("code")) {
    return "tech";
  }
  if (lower.includes("hr") || lower.includes("recruit") || lower.includes("hiring") || lower.includes("talent") || lower.includes("people")) {
    return "hr";
  }
  if (lower.includes("operat") || lower.includes("process") || lower.includes("supply chain") || lower.includes("logistics")) {
    return "operations";
  }
  return undefined;
}

export const findProviderTool = tool({
  description:
    "Search the Sahara service marketplace for providers who can help the founder with professional services. Use when a founder needs legal, accounting, design, development, marketing, or other professional help.",
  inputSchema: z.object({
    serviceType: z
      .string()
      .describe("Type of service needed (e.g., legal, accounting, design, marketing, tech)"),
    stage: z
      .enum(["idea", "pre-seed", "seed", "series-a", "growth"])
      .optional()
      .describe("Founder's current startup stage for relevance filtering"),
    budget: z
      .enum(["low", "medium", "high", "unknown"])
      .default("unknown")
      .describe("Budget range (informational — not used for filtering yet)"),
  }),
  execute: async ({ serviceType, stage }) => {
    try {
      const category = mapServiceTypeToCategory(serviceType);
      const providers = await getProviders({
        category,
        stage: stage ?? undefined,
      });

      if (providers.length === 0) {
        return {
          status: "no_results" as const,
          serviceType,
          message: `No ${serviceType} providers are listed in the marketplace yet. I can help you think through what to look for in a ${serviceType} provider.`,
          providers: [],
          suggestedQuestions: [
            `What specific ${serviceType} tasks do you need help with?`,
            "What's your timeline for getting this done?",
            "Have you worked with a ${serviceType} provider before?",
          ],
        };
      }

      return {
        status: "success" as const,
        serviceType,
        providers: providers.slice(0, 5).map((p) => ({
          id: p.id,
          name: p.name,
          slug: p.slug,
          tagline: p.tagline,
          category: p.category,
          stage_fit: p.stage_fit,
          rating: p.rating,
          review_count: p.review_count,
          is_verified: p.is_verified,
        })),
      };
    } catch {
      // Graceful degradation — if DB query fails, guide the founder directly
      return {
        status: "coming_soon" as const,
        serviceType,
        message: `Service marketplace search temporarily unavailable. I can help you think through what to look for in a ${serviceType} provider.`,
        suggestedQuestions: [
          `What specific ${serviceType} tasks do you need help with?`,
          "What's your timeline?",
        ],
      };
    }
  },
});
