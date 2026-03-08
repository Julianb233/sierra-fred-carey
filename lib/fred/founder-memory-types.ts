/**
 * Active Founder Memory Types
 * Phase 79: Structured types for FRED's active founder memory layer
 *
 * FounderMemory captures the 7 core fields that FRED must reference in every
 * response, each with confidence scoring, source tracking, and staleness
 * detection. This enables FRED to give personalized advice and naturally
 * re-confirm stale or missing information.
 */

// ============================================================================
// Core Types
// ============================================================================

export interface MemoryField<T = string> {
  value: T | null
  confidence: number // 0-1, how certain we are this is correct
  source: "profile" | "onboarding" | "conversation" | "enrichment"
  lastUpdated: Date | null
}

export const CORE_MEMORY_FIELDS = [
  "founder_name",
  "company_name",
  "stage",
  "market",
  "co_founder",
  "biggest_challenge",
  "oases_stage",
] as const

export type CoreMemoryFieldKey = (typeof CORE_MEMORY_FIELDS)[number]

export interface FounderMemory {
  founder_name: MemoryField
  company_name: MemoryField
  stage: MemoryField // e.g. "pre-seed", "seed", "series-a"
  market: MemoryField // industry/sector
  co_founder: MemoryField // co-founder name(s) or "solo founder"
  biggest_challenge: MemoryField
  oases_stage: MemoryField // Oases journey stage (clarity, validation, build, launch, grow)
  // Extended fields from semantic memory
  additional: Record<string, MemoryField>
}

export interface MemoryUpdate {
  field: CoreMemoryFieldKey | string
  value: string
  confidence: number
  source: "conversation"
}

// ============================================================================
// Staleness Detection
// ============================================================================

/** Default staleness threshold in days */
export const STALENESS_THRESHOLD_DAYS = 7

/** Check if a memory field is stale (older than threshold) */
export function isStale(
  field: MemoryField,
  thresholdDays = STALENESS_THRESHOLD_DAYS
): boolean {
  if (!field.lastUpdated || !field.value) return true
  const ageMs = Date.now() - field.lastUpdated.getTime()
  return ageMs > thresholdDays * 24 * 60 * 60 * 1000
}

/** Get all stale core fields from a FounderMemory */
export function getStaleFields(memory: FounderMemory): CoreMemoryFieldKey[] {
  return CORE_MEMORY_FIELDS.filter((key) => {
    const field = memory[key]
    return field.value && isStale(field)
  })
}

/** Get all missing core fields (no value at all) */
export function getMissingFields(memory: FounderMemory): CoreMemoryFieldKey[] {
  return CORE_MEMORY_FIELDS.filter((key) => !memory[key].value)
}

// ============================================================================
// Factory
// ============================================================================

/** Create an empty MemoryField */
export function emptyField(): MemoryField {
  return {
    value: null,
    confidence: 0,
    source: "profile",
    lastUpdated: null,
  }
}

/** Create a FounderMemory with all fields empty */
export function emptyFounderMemory(): FounderMemory {
  return {
    founder_name: emptyField(),
    company_name: emptyField(),
    stage: emptyField(),
    market: emptyField(),
    co_founder: emptyField(),
    biggest_challenge: emptyField(),
    oases_stage: emptyField(),
    additional: {},
  }
}
