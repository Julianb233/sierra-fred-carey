/**
 * Investor Matcher Tool
 *
 * FRED tool that suggests relevant investor firms from the curated knowledge
 * base based on a founder's stage, sector, and raise amount. Fred can
 * reference specific firms, explain what they look for, and help founders
 * structure their pitch for each investor's thesis.
 *
 * Linear: AI-1285
 */

import { tool } from "ai";
import { z } from "zod";
import { matchFirms, findSimilarFirms } from "@/lib/investors/firm-matcher";
import { getFirmById } from "@/lib/investors/knowledge-base";

export const matchInvestorFirmsTool = tool({
  description:
    "Find investor firms that match a founder's stage, sector, and fundraising needs. Use when a founder asks about which investors to target, wants investor recommendations, asks about specific firms (YC, a16z, Sequoia, etc.), or is preparing for fundraising. Also use when comparing firms or finding alternatives to a specific investor.",
  inputSchema: z.object({
    stage: z
      .string()
      .describe("Founder's current stage (idea, pre-seed, seed, series-a, series-b, growth)"),
    sector: z
      .string()
      .optional()
      .describe("Industry or sector (e.g., fintech, healthcare, AI, SaaS, marketplace)"),
    raiseAmount: z
      .number()
      .optional()
      .describe("Target raise amount in USD (e.g., 500000 for $500K)"),
    preferredType: z
      .string()
      .optional()
      .describe("Preferred investor type (accelerator, venture, angel-group, corporate-vc, growth-equity)"),
    specificFirmId: z
      .string()
      .optional()
      .describe("Look up a specific firm by ID slug (e.g., 'y-combinator', 'a16z', 'sequoia') or find similar firms"),
    findSimilar: z
      .boolean()
      .default(false)
      .describe("If true and specificFirmId is provided, find firms similar to that one"),
  }),
  execute: async ({ stage, sector, raiseAmount, preferredType, specificFirmId, findSimilar: findSimilarFlag }) => {
    try {
      // Case 1: Look up a specific firm
      if (specificFirmId && !findSimilarFlag) {
        const firm = getFirmById(specificFirmId);
        if (!firm) {
          // Try fuzzy match on name
          const { INVESTOR_FIRMS } = await import("@/lib/investors/knowledge-base");
          const fuzzy = INVESTOR_FIRMS.find((f) =>
            f.name.toLowerCase().includes(specificFirmId.toLowerCase()) ||
            f.id.includes(specificFirmId.toLowerCase())
          );

          if (!fuzzy) {
            return {
              status: "not_found" as const,
              message: `I don't have detailed data on "${specificFirmId}" in my knowledge base, but I can help you research them or suggest similar firms I do know well.`,
              suggestion: "Try asking about specific well-known firms like YC, a16z, Sequoia, Benchmark, or Techstars.",
            };
          }

          return {
            status: "success" as const,
            mode: "detail" as const,
            firm: formatFirmDetail(fuzzy),
          };
        }

        return {
          status: "success" as const,
          mode: "detail" as const,
          firm: formatFirmDetail(firm),
        };
      }

      // Case 2: Find similar firms
      if (specificFirmId && findSimilarFlag) {
        const similar = findSimilarFirms(specificFirmId);
        if (similar.length === 0) {
          return {
            status: "no_results" as const,
            message: `Could not find similar firms. The firm ID "${specificFirmId}" may not be in the knowledge base.`,
          };
        }

        return {
          status: "success" as const,
          mode: "similar" as const,
          referenceFirm: specificFirmId,
          matches: similar.map((m) => ({
            name: m.firm.name,
            id: m.firm.id,
            type: m.firm.type,
            score: m.score,
            roundFocus: m.firm.roundFocus,
            sectorFocus: m.firm.sectorFocus.slice(0, 4),
            matchReason: m.matchReason,
            fredNote: m.firm.fredNote,
          })),
        };
      }

      // Case 3: Match based on criteria
      const matches = matchFirms({
        stage,
        sector,
        raiseAmount,
        preferredType,
        limit: 8,
      });

      if (matches.length === 0) {
        return {
          status: "no_results" as const,
          stage,
          sector,
          message: "No strong investor matches found for this criteria. This may indicate you're at an unusual intersection — which can actually be an advantage if you position it right.",
        };
      }

      return {
        status: "success" as const,
        mode: "match" as const,
        criteria: { stage, sector, raiseAmount },
        matches: matches.map((m) => ({
          name: m.firm.name,
          id: m.firm.id,
          type: m.firm.type,
          score: m.score,
          stageScore: m.stageScore,
          sectorScore: m.sectorScore,
          sizeScore: m.sizeScore,
          roundFocus: m.firm.roundFocus,
          checkSize: m.firm.checkSize,
          thesis: m.firm.thesis,
          whatTheyLookFor: m.firm.whatTheyLookFor.slice(0, 3),
          sectorFocus: m.firm.sectorFocus.slice(0, 4),
          portfolioExamples: m.firm.portfolioExamples.slice(0, 3),
          accessPath: m.firm.accessPath,
          matchReason: m.matchReason,
          fredNote: m.firm.fredNote,
        })),
      };
    } catch {
      return {
        status: "error" as const,
        message: "Investor matching temporarily unavailable. I can still advise on fundraising strategy based on my experience.",
      };
    }
  },
});

// ============================================================================
// Helpers
// ============================================================================

function formatFirmDetail(firm: import("@/lib/investors/knowledge-base").InvestorFirm) {
  return {
    name: firm.name,
    id: firm.id,
    type: firm.type,
    location: firm.location,
    founded: firm.founded,
    website: firm.website,
    roundFocus: firm.roundFocus,
    checkSize: firm.checkSize,
    thesis: firm.thesis,
    whatTheyLookFor: firm.whatTheyLookFor,
    sectorFocus: firm.sectorFocus,
    portfolioExamples: firm.portfolioExamples,
    specialPrograms: firm.specialPrograms,
    accessPath: firm.accessPath,
    fredNote: firm.fredNote,
  };
}
