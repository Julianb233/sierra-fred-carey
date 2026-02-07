/**
 * Boardy Client - Abstraction Layer (Strategy Pattern)
 * Phase 04: Studio Tier Features - Plan 06
 *
 * Delegates to an underlying implementation (MockBoardyClient or future real API client).
 * Callers use getBoardyClient() factory and never need to know which implementation is active.
 */

import type {
  BoardyClientInterface,
  BoardyMatch,
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

  async getMatches(request: MatchRequest): Promise<BoardyMatch[]> {
    return this.implementation.getMatches(request);
  }

  async refreshMatches(userId: string): Promise<BoardyMatch[]> {
    return this.implementation.refreshMatches(userId);
  }

  getDeepLink(userId: string): string {
    return this.implementation.getDeepLink(userId);
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
 * If BOARDY_API_KEY is set, will use the real API client (future).
 * Otherwise falls back to MockBoardyClient which uses AI to generate
 * contextual match suggestions.
 */
export function getBoardyClient(): BoardyClient {
  if (!_client) {
    // Future: if (process.env.BOARDY_API_KEY) { _client = new BoardyClient(new RealBoardyClient()); }
    const implementation = new MockBoardyClient();
    _client = new BoardyClient(implementation);
    logger.log("[Boardy] Initialized with MockBoardyClient (AI-generated matches)");
  }
  return _client;
}
