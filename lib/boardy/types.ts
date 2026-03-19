/**
 * Boardy Integration Types
 * Phase 04: Studio Tier Features - Plan 06
 *
 * Types for investor/advisor matching via Boardy.
 * Matches the boardy_matches database schema (migration 030).
 */

// ============================================================================
// Enums / Union Types
// ============================================================================

/** Type of match */
export type BoardyMatchType = "investor" | "advisor" | "mentor" | "partner";

/** Status of a match in the workflow */
export type BoardyMatchStatus =
  | "suggested"
  | "connected"
  | "intro_sent"
  | "meeting_scheduled"
  | "declined";

// ============================================================================
// Data Interfaces
// ============================================================================

/** A single Boardy match record */
export interface BoardyMatch {
  id: string;
  userId: string;
  matchType: BoardyMatchType;
  matchName: string;
  matchDescription: string;
  matchScore: number;
  status: BoardyMatchStatus;
  boardyReferenceId?: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

/** Request parameters for generating matches */
export interface MatchRequest {
  userId: string;
  startupStage: string;
  sector: string;
  fundraisingTarget?: string;
  matchTypes: BoardyMatchType[];
  limit?: number;
}

// ============================================================================
// Boardy API Types
// ============================================================================

/** Request to initiate a Boardy AI call for founder profiling */
export interface BoardyCallRequest {
  phoneNumber: string;
  name?: string;
  email?: string;
  slug?: string;
}

/** Response from Boardy call initiation */
export interface BoardyCallResponse {
  success: boolean;
  message?: string;
  referenceId?: string;
}

/** Webhook payload from Boardy when a match is found (double opt-in) */
export interface BoardyWebhookPayload {
  event: "match.created" | "match.accepted" | "match.declined" | "intro.completed";
  referenceId: string;
  match?: {
    name: string;
    title?: string;
    company?: string;
    type: string;
    description?: string;
    score?: number;
    linkedinUrl?: string;
  };
  metadata?: Record<string, unknown>;
  timestamp: string;
}

// ============================================================================
// Client Interface (Strategy Pattern)
// ============================================================================

/**
 * BoardyClientInterface - abstraction for match generation.
 * Implementations: MockBoardyClient (AI-generated), RealBoardyClient (API).
 */
export interface BoardyClientInterface {
  /** Get match suggestions for a user based on their profile */
  getMatches(request: MatchRequest): Promise<BoardyMatch[]>;

  /** Refresh matches: delete old suggestions, generate new ones */
  refreshMatches(userId: string): Promise<BoardyMatch[]>;

  /** Get a deep link to the Boardy platform */
  getDeepLink(userId: string): string;

  /** Request a Boardy AI call for founder profiling. Returns false if not supported. */
  requestCall?(request: BoardyCallRequest): Promise<BoardyCallResponse>;

  /** Whether this client connects to the real Boardy API */
  readonly isLive: boolean;
}

// ============================================================================
// Validation Helpers
// ============================================================================

export const VALID_MATCH_TYPES: BoardyMatchType[] = [
  "investor",
  "advisor",
  "mentor",
  "partner",
];

export const VALID_MATCH_STATUSES: BoardyMatchStatus[] = [
  "suggested",
  "connected",
  "intro_sent",
  "meeting_scheduled",
  "declined",
];

export function isValidMatchType(value: string): value is BoardyMatchType {
  return VALID_MATCH_TYPES.includes(value as BoardyMatchType);
}

export function isValidMatchStatus(value: string): value is BoardyMatchStatus {
  return VALID_MATCH_STATUSES.includes(value as BoardyMatchStatus);
}
