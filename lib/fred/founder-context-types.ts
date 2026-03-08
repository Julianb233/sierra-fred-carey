/**
 * Founder Context Types
 * Phase 79: Type aliases for the active founder memory layer
 *
 * This module provides the FounderContext, MemoryConfidence, and
 * FounderContextField types required by the plan spec. These are
 * re-exports/aliases of the canonical types in founder-memory-types.ts
 * to satisfy the must_have artifact contract while keeping a single
 * source of truth for the underlying data structures.
 */

import type { MemoryField, FounderMemory, CoreMemoryFieldKey } from "./founder-memory-types"

// ============================================================================
// Plan-specified type aliases
// ============================================================================

/**
 * Confidence level for a founder context field.
 * Maps numeric confidence (0-1) to categorical labels:
 * - "high": confidence >= 0.8
 * - "medium": confidence >= 0.5
 * - "low": confidence > 0
 * - "unknown": no value / confidence 0
 */
export type MemoryConfidence = "high" | "medium" | "low" | "unknown"

/**
 * A single field in the founder context with value, confidence, source, and recency.
 * Wraps the underlying MemoryField type from founder-memory-types.ts.
 */
export type FounderContextField = MemoryField

/**
 * The full founder context struct. Contains all 7 core fields plus additional
 * facts from semantic memory. Each field carries confidence scoring,
 * source tracking, and staleness detection.
 *
 * Core fields:
 * 1. founder_name
 * 2. company_name
 * 3. stage
 * 4. market
 * 5. co_founder
 * 6. biggest_challenge
 * 7. oases_stage (journey stage)
 */
export type FounderContext = FounderMemory

/**
 * What the LLM extraction returns -- structured facts extracted
 * from a chat message pair.
 */
export interface ExtractedFacts {
  companyName?: string
  stage?: string
  market?: string
  coFounder?: string
  biggestChallenge?: string
  ninetyDayGoal?: string
  productStatus?: string
  revenueStatus?: string
  teamSize?: string
  fundingStatus?: string
}

// ============================================================================
// Confidence conversion helpers
// ============================================================================

/**
 * Convert a numeric confidence score (0-1) to a categorical MemoryConfidence label.
 */
export function toMemoryConfidence(score: number | null, hasValue: boolean): MemoryConfidence {
  if (!hasValue || score === null) return "unknown"
  if (score >= 0.8) return "high"
  if (score >= 0.5) return "medium"
  return "low"
}

/**
 * Convert a MemoryConfidence label back to a representative numeric score.
 */
export function fromMemoryConfidence(level: MemoryConfidence): number {
  switch (level) {
    case "high": return 0.9
    case "medium": return 0.7
    case "low": return 0.3
    case "unknown": return 0
  }
}

// Re-export the core field key type for convenience
export type { CoreMemoryFieldKey }
