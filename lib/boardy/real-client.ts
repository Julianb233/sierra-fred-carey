/**
 * Real Boardy Client - API Integration
 * AI-3587: Boardy.ai warm investor introductions ($249 tier)
 *
 * Connects to the Boardy API for real investor/advisor matching.
 * Activated when BOARDY_API_KEY is set. Falls back to MockBoardyClient otherwise.
 *
 * Boardy flow:
 * 1. Founder requests a Boardy call → Boardy AI profiles them via voice
 * 2. Boardy matches founder with investors/advisors in their network
 * 3. Double opt-in: both parties must agree before intro is made
 * 4. Boardy sends webhook → we create match records
 * 5. Founder prepares for intro using Sahara's prep tools
 */

import { logger } from "@/lib/logger";
import {
  createMatch,
  getMatches as dbGetMatches,
  deleteMatchesByStatus,
} from "@/lib/db/boardy";
import { createServiceClient } from "@/lib/supabase/server";
import type {
  BoardyClientInterface,
  BoardyMatch,
  BoardyCallRequest,
  BoardyCallResponse,
  MatchRequest,
} from "./types";

// ============================================================================
// Constants
// ============================================================================

const BOARDY_API_BASE = "https://api.boardy.ai";
const BOARDY_PARTNER_SLUG = "sahara";
const REQUEST_TIMEOUT_MS = 15_000;

// ============================================================================
// Real Client Implementation
// ============================================================================

export class RealBoardyClient implements BoardyClientInterface {
  private apiKey: string;
  readonly isLive = true;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Get matches from the database.
   * Real matches come in via webhooks — this just reads what's stored.
   * If no matches exist, we trigger AI-generated suggestions as a fallback
   * while the founder waits for real Boardy matches.
   */
  async getMatches(request: MatchRequest): Promise<BoardyMatch[]> {
    const supabase = createServiceClient();
    const existing = await dbGetMatches(supabase, request.userId, {
      limit: request.limit ?? 10,
    });

    if (existing.length > 0) {
      return existing;
    }

    // No real matches yet — generate AI suggestions as interim results
    // This gives founders something useful while they wait for Boardy profiling
    logger.log(
      `[RealBoardy] No matches for ${request.userId}, falling back to AI suggestions`
    );
    return this.generateFallbackMatches(request);
  }

  /**
   * Refresh: fetch latest matches from Boardy API + clear stale suggestions.
   */
  async refreshMatches(userId: string): Promise<BoardyMatch[]> {
    const supabase = createServiceClient();

    // Try to fetch real matches from Boardy
    try {
      const response = await this.apiFetch("/v1/matches", {
        method: "POST",
        body: JSON.stringify({
          partnerId: BOARDY_PARTNER_SLUG,
          externalUserId: userId,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.matches && Array.isArray(data.matches)) {
          // Clear old AI-generated suggestions
          await deleteMatchesByStatus(supabase, userId, "suggested");

          // Store real matches
          const stored: BoardyMatch[] = [];
          for (const m of data.matches) {
            const match = await createMatch(supabase, {
              userId,
              matchType: this.mapMatchType(m.type),
              matchName: this.formatMatchName(m),
              matchDescription: m.description || m.bio || "",
              matchScore: m.score ?? 0.75,
              status: "suggested",
              boardyReferenceId: m.referenceId || m.id,
              metadata: {
                source: "boardy_api",
                linkedinUrl: m.linkedinUrl,
                company: m.company,
                title: m.title,
                ...m.metadata,
              },
            });
            stored.push(match);
          }

          logger.log(
            `[RealBoardy] Stored ${stored.length} real matches for ${userId}`
          );
          return stored;
        }
      }
    } catch (err) {
      logger.log(
        `[RealBoardy] API fetch failed, falling back to AI suggestions: ${err instanceof Error ? err.message : String(err)}`
      );
    }

    // Fallback: delete old suggestions and generate new AI ones
    await deleteMatchesByStatus(supabase, userId, "suggested");
    return this.generateFallbackMatches({
      userId,
      startupStage: "seed",
      sector: "technology",
      matchTypes: ["investor", "advisor"],
      limit: 5,
    });
  }

  /**
   * Request a Boardy AI voice call for founder profiling.
   * This is the primary handoff point: founder provides phone number,
   * Boardy calls them, conducts a natural conversation, and builds their profile.
   */
  async requestCall(request: BoardyCallRequest): Promise<BoardyCallResponse> {
    try {
      const response = await this.apiFetch("/user/upsert-and-call-public", {
        method: "POST",
        body: JSON.stringify({
          phoneNumber: request.phoneNumber,
          name: request.name,
          email: request.email,
          slug: request.slug || BOARDY_PARTNER_SLUG,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => "Unknown error");
        logger.log(`[RealBoardy] Call request failed: ${response.status} ${errorText}`);
        return {
          success: false,
          message: `Boardy call request failed (${response.status})`,
        };
      }

      const data = await response.json().catch(() => ({}));
      logger.log(`[RealBoardy] Call requested for ${request.name || "unknown"}`);

      return {
        success: true,
        message: "Boardy will call you shortly to learn about your startup.",
        referenceId: data.referenceId || data.id,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.log(`[RealBoardy] Call request error: ${msg}`);
      return {
        success: false,
        message: "Failed to request Boardy call. Please try again.",
      };
    }
  }

  getDeepLink(userId: string): string {
    return `https://www.boardy.ai/?ref=${BOARDY_PARTNER_SLUG}&uid=${userId}`;
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private async apiFetch(path: string, init?: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      return await fetch(`${BOARDY_API_BASE}${path}`, {
        ...init,
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
          "X-Partner": BOARDY_PARTNER_SLUG,
          ...(init?.headers || {}),
        },
      });
    } finally {
      clearTimeout(timeout);
    }
  }

  private mapMatchType(type: string): "investor" | "advisor" | "mentor" | "partner" {
    const normalized = type?.toLowerCase() || "";
    if (normalized.includes("invest") || normalized.includes("vc") || normalized.includes("angel")) {
      return "investor";
    }
    if (normalized.includes("mentor")) return "mentor";
    if (normalized.includes("partner")) return "partner";
    return "advisor";
  }

  private formatMatchName(match: { name?: string; company?: string; title?: string }): string {
    if (match.name && match.company) {
      return `${match.name}, ${match.company}`;
    }
    return match.name || "Unknown";
  }

  /**
   * Generate AI-powered fallback matches using the mock client.
   * Lazy-imported to avoid circular dependency.
   */
  private async generateFallbackMatches(request: MatchRequest): Promise<BoardyMatch[]> {
    const { MockBoardyClient } = await import("./mock");
    const mock = new MockBoardyClient();
    return mock.getMatches(request);
  }
}
