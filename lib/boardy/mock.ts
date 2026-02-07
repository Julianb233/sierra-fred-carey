/**
 * Mock Boardy Client - AI-Generated Match Suggestions
 * Phase 04: Studio Tier Features - Plan 06
 *
 * Uses generateStructuredReliable to create realistic investor/advisor matches
 * based on the founder's profile. This mock implementation provides real value
 * even without a live Boardy API.
 */

import { logger } from "@/lib/logger";
import { z } from "zod";
import { generateStructuredReliable } from "@/lib/ai/fred-client";
import {
  createMatch,
  getMatches as dbGetMatches,
  deleteMatchesByStatus,
} from "@/lib/db/boardy";
import { createServiceClient } from "@/lib/supabase/server";
import type {
  BoardyClientInterface,
  BoardyMatch,
  BoardyMatchType,
  MatchRequest,
} from "./types";

// ============================================================================
// AI Output Schema
// ============================================================================

const matchSuggestionSchema = z.object({
  matches: z.array(
    z.object({
      matchName: z.string().describe("Full name and firm, e.g. 'Sarah Chen, Sequoia Capital'"),
      matchType: z.enum(["investor", "advisor", "mentor", "partner"]),
      matchDescription: z.string().describe("2-3 sentences on background and why they are a fit"),
      matchScore: z.number().min(0).max(1).describe("Relevance score from 0 to 1"),
      reasoning: z.string().describe("Specific reasoning for this match"),
    })
  ),
});

type MatchSuggestion = z.infer<typeof matchSuggestionSchema>;

// ============================================================================
// Mock Client Implementation
// ============================================================================

export class MockBoardyClient implements BoardyClientInterface {
  /**
   * Generate match suggestions using AI and store them in the database.
   */
  async getMatches(request: MatchRequest): Promise<BoardyMatch[]> {
    const limit = request.limit ?? 5;
    const matchTypesStr = request.matchTypes.join(", ");

    const prompt = `Generate ${limit} realistic ${matchTypesStr} match suggestions for a startup founder.

Founder profile:
- Stage: ${request.startupStage}
- Sector: ${request.sector}
${request.fundraisingTarget ? `- Fundraising target: ${request.fundraisingTarget}` : ""}

Requirements:
- Each match should have a real-sounding name with their firm/organization
- Match descriptions should be specific about their investment thesis, expertise, or advisory focus
- Match scores should reflect how well they align with the founder's stage and sector
- Include a mix of the requested types: ${matchTypesStr}
- Higher scores (0.8+) for strong stage+sector alignment, lower for adjacent fits
- Be specific about fund sizes, check sizes, and portfolio focus for investors
- Be specific about domain expertise and track record for advisors/mentors`;

    const systemPrompt =
      "Generate realistic investor/advisor match suggestions for a startup founder. Each match should have a real-sounding name, firm, and specific reasoning for why they're a good fit based on the founder's stage, sector, and fundraising goals. Do NOT use names of real people or firms. Create fictional but realistic-sounding names.";

    try {
      const result = await generateStructuredReliable(prompt, matchSuggestionSchema, {
        system: systemPrompt,
        temperature: 0.7,
        maxOutputTokens: 2048,
      });

      // Store generated matches in DB
      const supabase = createServiceClient();
      const storedMatches: BoardyMatch[] = [];

      for (const suggestion of result.object.matches) {
        const match = await createMatch(supabase, {
          userId: request.userId,
          matchType: suggestion.matchType as BoardyMatchType,
          matchName: suggestion.matchName,
          matchDescription: suggestion.matchDescription,
          matchScore: suggestion.matchScore,
          status: "suggested",
          metadata: { reasoning: suggestion.reasoning, source: "ai_mock" },
        });
        storedMatches.push(match);
      }

      logger.log(
        `[MockBoardy] Generated ${storedMatches.length} matches for user ${request.userId} (provider: ${result.provider})`
      );

      return storedMatches;
    } catch (error) {
      console.error("[MockBoardy] Failed to generate matches:", error);
      throw new Error(
        `Failed to generate match suggestions: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Refresh matches: delete old suggestions and generate new ones.
   * Only deletes matches still in 'suggested' status (preserves connected/active ones).
   */
  async refreshMatches(userId: string): Promise<BoardyMatch[]> {
    // Delete old suggested matches
    const supabase = createServiceClient();
    await deleteMatchesByStatus(supabase, userId, "suggested");

    // Generate new matches with default parameters
    return this.getMatches({
      userId,
      startupStage: "seed",
      sector: "technology",
      matchTypes: ["investor", "advisor"],
      limit: 5,
    });
  }

  /**
   * Get a deep link to the Boardy platform.
   */
  getDeepLink(userId: string): string {
    return `https://www.boardy.ai/?ref=sahara&uid=${userId}`;
  }
}
