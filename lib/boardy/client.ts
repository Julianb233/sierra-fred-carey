/**
 * Boardy Client - Abstraction Layer (Strategy Pattern)
 * AI-3587: Boardy.ai warm investor introductions ($249 tier)
 *
 * Delegates to an underlying implementation:
 * - RealBoardyClient: when BOARDY_API_KEY is set (real Boardy API)
 * - MockBoardyClient: fallback with AI-generated match suggestions
 *
 * Callers use getBoardyClient() factory and never need to know which is active.
 */

import type {
  BoardyClientInterface,
  BoardyMatch,
  BoardyCallRequest,
  BoardyCallResponse,
  MatchRequest,
} from "./types";
import { MockBoardyClient } from "./mock";
import { logger } from "@/lib/logger";

// ============================================================================
// Client Class
// ============================================================================

/**
 * BoardyClient wraps an implementation of BoardyClientInterface.
 * This is the strategy pattern: swap implementations without changing callers.
 */
export class BoardyClient implements BoardyClientInterface {
  private implementation: BoardyClientInterface;

  constructor(implementation: BoardyClientInterface) {
    this.implementation = implementation;
  }

  get isLive(): boolean {
    return this.implementation.isLive;
  }

  async getMatches(request: MatchRequest): Promise<BoardyMatch[]> {
    return this.implementation.getMatches(request);
  }

  async refreshMatches(userId: string): Promise<BoardyMatch[]> {
    return this.implementation.refreshMatches(userId);
  }

  getDeepLink(userId: string): string {
    return this.implementation.getDeepLink(userId);
  }

  async requestCall(request: BoardyCallRequest): Promise<BoardyCallResponse> {
    if (this.implementation.requestCall) {
      return this.implementation.requestCall(request);
    }
    return {
      success: false,
      message: "Boardy calls are not available in demo mode.",
    };
  }
}

// ============================================================================
// Factory
// ============================================================================

/** Singleton instance */
let _client: BoardyClient | null = null;

/**
 * Get the Boardy client singleton.
 *
 * If BOARDY_API_KEY is set, uses the real Boardy API client.
 * Otherwise falls back to MockBoardyClient which uses AI to generate
 * contextual match suggestions.
 */
export function getBoardyClient(): BoardyClient {
  if (!_client) {
    const apiKey = process.env.BOARDY_API_KEY;

    if (apiKey) {
      // Lazy import to avoid loading real client code when not needed
      const { RealBoardyClient } = require("./real-client");
      const implementation = new RealBoardyClient(apiKey);
      _client = new BoardyClient(implementation);
      logger.log("[Boardy] Initialized with RealBoardyClient (live API)");
    } else {
      const implementation = new MockBoardyClient();
      _client = new BoardyClient(implementation);
      logger.log("[Boardy] Initialized with MockBoardyClient (AI-generated matches)");
    }
  }
  return _client;
}
