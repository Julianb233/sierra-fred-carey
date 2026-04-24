/**
 * Active Founder Memory Builder
 * Phase 79: Core engine for assembling and updating founder memory
 *
 * Merges profile data, semantic memory facts, and enrichment data into
 * a unified FounderMemory struct with confidence scoring per field.
 * Also provides LLM-based extraction of new facts from chat exchanges
 * and persistence back to both profiles table and semantic memory.
 */

import { createServiceClient } from "@/lib/supabase/server"
import type { SemanticCategory } from "@/lib/db/fred-memory"
import type {
  FounderMemory,
  MemoryField,
  MemoryUpdate,
  CoreMemoryFieldKey,
} from "@/lib/fred/founder-memory-types"
import {
  CORE_MEMORY_FIELDS,
  emptyFounderMemory,
  getStaleFields,
  getMissingFields,
} from "@/lib/fred/founder-memory-types"
import {
  buildExtractionInput,
  parseExtractionResult,
} from "@/lib/ai/memory-extraction-prompt"
import type { MemoryConfidence } from "@/lib/fred/founder-context-types"

// ============================================================================
// Memory Builder
// ============================================================================

/**
 * Build a complete FounderMemory by merging profile, semantic facts, and
 * enrichment data. Each field gets a confidence score and source tag.
 *
 * Data priority (highest wins):
 * 1. Semantic memory facts (most recent, from conversations)
 * 2. Profile columns (set during onboarding)
 * 3. Enrichment data JSONB (heuristic extraction fallback)
 *
 * @param userId - Authenticated user ID
 * @param hasPersistentMemory - Whether this tier has persistent memory (Pro+)
 * @param preloadedProfile - Optional pre-loaded profile row to avoid duplicate profiles query
 * @param preloadedFacts - Optional pre-loaded semantic facts to avoid duplicate getAllUserFacts call
 */
export async function buildActiveFounderMemory(
  userId: string,
  hasPersistentMemory: boolean,
  preloadedProfile?: Record<string, unknown> | null,
  preloadedFacts?: Array<{ category: string; key: string; value: Record<string, unknown> }>
): Promise<FounderMemory> {
  const memory = emptyFounderMemory()

  // 1. Load profile from profiles table (skip if pre-loaded)
  let profile: Record<string, unknown> | null = preloadedProfile ?? null
  if (preloadedProfile === undefined) {
    const supabase = createServiceClient()
    const { data } = await supabase
      .from("profiles")
      .select(
        "name, company_name, stage, industry, co_founder, challenges, oases_stage, enrichment_data, updated_at, team_size, revenue_range, funding_history"
      )
      .eq("id", userId)
      .single()
    profile = data as Record<string, unknown> | null
  }

  if (profile) {
    const profileDate = profile.updated_at
      ? new Date(profile.updated_at as string)
      : null

    if (profile.name) {
      memory.founder_name = makeField(
        String(profile.name),
        0.9,
        "profile",
        profileDate
      )
    }
    if (profile.company_name) {
      memory.company_name = makeField(
        String(profile.company_name),
        0.9,
        "profile",
        profileDate
      )
    }
    if (profile.stage) {
      memory.stage = makeField(String(profile.stage), 0.8, "profile", profileDate)
    }
    if (profile.industry) {
      memory.market = makeField(String(profile.industry), 0.8, "profile", profileDate)
    }
    if (profile.co_founder) {
      memory.co_founder = makeField(
        String(profile.co_founder),
        0.9,
        "profile",
        profileDate
      )
    }
    if (
      Array.isArray(profile.challenges) &&
      profile.challenges.length > 0
    ) {
      memory.biggest_challenge = makeField(
        String(profile.challenges[0]),
        0.7,
        "profile",
        profileDate
      )
    }
    if (profile.oases_stage) {
      memory.oases_stage = makeField(
        String(profile.oases_stage),
        1.0,
        "profile",
        profileDate
      )
    }

    // Populate new fields from profile columns
    if (profile.team_size) {
      memory.team_size = makeField(
        String(profile.team_size),
        0.8,
        "profile",
        profileDate
      )
    }
    if (profile.revenue_range) {
      memory.revenue_status = makeField(
        String(profile.revenue_range),
        0.8,
        "profile",
        profileDate
      )
    }
    if (profile.funding_history) {
      memory.funding_status = makeField(
        String(profile.funding_history),
        0.8,
        "profile",
        profileDate
      )
    }

    // 3. Enrichment data as fallback for missing fields
    if (profile.enrichment_data && typeof profile.enrichment_data === "object") {
      const ed = profile.enrichment_data as Record<string, unknown>
      if (!memory.market.value && typeof ed.industry === "string") {
        memory.market = makeField(ed.industry, 0.6, "enrichment", profileDate)
      }
      if (
        !memory.biggest_challenge.value &&
        Array.isArray(ed.challenges) &&
        ed.challenges.length > 0
      ) {
        memory.biggest_challenge = makeField(
          String(ed.challenges[0]),
          0.5,
          "enrichment",
          profileDate
        )
      }
      if (!memory.traction.value && typeof ed.revenueHint === "string") {
        memory.traction = makeField(ed.revenueHint, 0.5, "enrichment", profileDate)
      }
      if (!memory.revenue_status.value && typeof ed.revenueHint === "string") {
        memory.revenue_status = makeField(ed.revenueHint, 0.5, "enrichment", profileDate)
      }
      if (!memory.funding_status.value && typeof ed.fundingHint === "string") {
        memory.funding_status = makeField(ed.fundingHint, 0.5, "enrichment", profileDate)
      }
    }
  }

  // 2. Load semantic memory facts (overrides profile with higher confidence)
  // Use preloadedFacts when available to avoid duplicate DB query
  if (hasPersistentMemory) {
    try {
      let facts: Array<{ category: string; key: string; value: Record<string, unknown>; confidence?: number; updatedAt?: Date | null; createdAt?: Date | null }>
      if (preloadedFacts) {
        facts = preloadedFacts as typeof facts
      } else {
        const { getAllUserFacts } = await import("@/lib/db/fred-memory")
        facts = await getAllUserFacts(userId)
      }

      for (const fact of facts) {
        const factValue = extractFactString(fact.value)
        if (!factValue) continue

        const factDate = fact.updatedAt || fact.createdAt || null
        const factConfidence = Math.min(
          (fact.confidence ?? 0.8) + 0.05,
          1.0
        )

        // Map known semantic categories to core fields
        if (
          fact.category === "startup_facts" &&
          fact.key === "company_name"
        ) {
          memory.company_name = makeField(
            factValue,
            factConfidence,
            "conversation",
            factDate
          )
        } else if (
          (fact.category === "startup_facts" &&
            (fact.key === "market" || fact.key === "industry")) ||
          fact.category === "market_knowledge"
        ) {
          memory.market = makeField(
            factValue,
            factConfidence,
            "conversation",
            factDate
          )
        } else if (
          (fact.category === "challenges" &&
            (fact.key === "biggest_challenge" ||
              fact.key === "primary_constraint")) ||
          (fact.category === "startup_facts" &&
            fact.key === "primary_constraint")
        ) {
          memory.biggest_challenge = makeField(
            factValue,
            factConfidence,
            "conversation",
            factDate
          )
        } else if (
          fact.category === "team_info" &&
          fact.key === "co_founder"
        ) {
          memory.co_founder = makeField(
            factValue,
            factConfidence,
            "conversation",
            factDate
          )
        } else if (
          fact.category === "metrics" &&
          fact.key === "traction"
        ) {
          memory.traction = makeField(factValue, factConfidence, "conversation", factDate)
        } else if (
          fact.category === "metrics" &&
          fact.key === "revenue"
        ) {
          memory.revenue_status = makeField(factValue, factConfidence, "conversation", factDate)
        } else if (
          fact.category === "startup_facts" &&
          fact.key === "funding_status"
        ) {
          memory.funding_status = makeField(factValue, factConfidence, "conversation", factDate)
        } else if (
          fact.category === "product_details" &&
          fact.key === "product_status"
        ) {
          memory.product_status = makeField(factValue, factConfidence, "conversation", factDate)
        } else if (
          fact.category === "goals" &&
          fact.key === "90_day_goal"
        ) {
          memory.ninety_day_goal = makeField(factValue, factConfidence, "conversation", factDate)
        } else if (
          fact.category === "decisions" &&
          fact.key === "recent_decisions"
        ) {
          memory.key_decisions = makeField(factValue, factConfidence, "conversation", factDate)
        } else {
          // Store as additional context
          const additionalKey = `${fact.category}/${fact.key}`
          memory.additional[additionalKey] = makeField(
            factValue,
            fact.confidence ?? 0.8,
            "conversation",
            factDate
          )
        }
      }
    } catch {
      // Non-blocking: semantic memory load failure is OK
    }
  }

  return memory
}

// ============================================================================
// Memory Formatter
// ============================================================================

/**
 * Format a FounderMemory into a prompt block for injection into the
 * FRED system prompt. Includes stale/missing field instructions.
 */
export function formatMemoryBlock(memory: FounderMemory): string {
  const lines: string[] = []
  lines.push("## ACTIVE FOUNDER CONTEXT")
  lines.push("")

  // Core fields
  if (memory.founder_name.value) {
    lines.push(`**Founder:** ${memory.founder_name.value}`)
  }
  if (memory.company_name.value) {
    lines.push(`**Company:** ${memory.company_name.value}`)
  }
  if (memory.stage.value) {
    lines.push(`**Stage:** ${memory.stage.value}`)
  }
  if (memory.market.value) {
    lines.push(`**Market:** ${memory.market.value}`)
  }
  if (memory.co_founder.value) {
    lines.push(`**Co-Founder:** ${memory.co_founder.value}`)
  }
  if (memory.biggest_challenge.value) {
    lines.push(`**Biggest Challenge:** ${memory.biggest_challenge.value}`)
  }
  if (memory.oases_stage.value) {
    lines.push(`**Journey Stage:** ${memory.oases_stage.value}`)
  }
  if (memory.traction.value) {
    lines.push(`**Traction:** ${memory.traction.value}`)
  }
  if (memory.revenue_status.value) {
    lines.push(`**Revenue:** ${memory.revenue_status.value}`)
  }
  if (memory.funding_status.value) {
    lines.push(`**Funding:** ${memory.funding_status.value}`)
  }
  if (memory.team_size.value) {
    lines.push(`**Team Size:** ${memory.team_size.value}`)
  }
  if (memory.product_status.value) {
    lines.push(`**Product Status:** ${memory.product_status.value}`)
  }
  if (memory.ninety_day_goal.value) {
    lines.push(`**90-Day Goal:** ${memory.ninety_day_goal.value}`)
  }
  if (memory.key_decisions.value) {
    lines.push(`**Key Decisions:** ${memory.key_decisions.value}`)
  }

  lines.push("")
  lines.push(
    `CRITICAL INSTRUCTION: You MUST reference at least one founder-specific detail in EVERY response.
Rules:
1. ALWAYS address the founder by name if known: "Hey ${memory.founder_name.value || "[name]"}..." or "${memory.founder_name.value || "[name]"}, here's what I think..."
2. ALWAYS tie advice to their specific context. Instead of "startups should focus on..." say "Since ${memory.company_name.value || "[company]"} is in the ${memory.market.value || "[market]"} space at ${memory.stage.value || "[stage]"}..."
3. NEVER give advice that could apply to any founder. Every recommendation must reference their specific company, market, challenge, stage, or goals.
4. If you catch yourself writing a generic sentence, rewrite it with their context.
Examples of BAD (generic): "You should focus on product-market fit" / "Most startups struggle with this"
Examples of GOOD (personalized): "For ${memory.company_name.value || "[company]"} in ${memory.market.value || "[market]"}, product-market fit means..." / "Given your challenge with ${memory.biggest_challenge.value || "[challenge]"}..."`
  )

  // Stale fields
  const staleFields = getStaleFields(memory)
  if (staleFields.length > 0) {
    lines.push("")
    const staleList = staleFields
      .map((key) => {
        const field = memory[key]
        return `${formatFieldLabel(key)} (was: "${field.value}")`
      })
      .join(", ")
    lines.push(
      `**Stale Context (needs re-confirmation):** The following details are over 7 days old and may be outdated.
DO NOT assume they are still accurate. Instead, naturally verify them:
${staleList}
Example: "Last time we spoke, you mentioned ${staleFields.length > 0 ? memory[staleFields[0]].value || "[old value]" : "[old value]"}. Is that still where things stand, or has anything changed?"
RULE: If a stale field is directly relevant to the founder's current question, ASK before advising. Do not give advice based on potentially outdated information.`
    )
  }

  // Missing fields
  const missingFields = getMissingFields(memory)
  if (missingFields.length > 0) {
    lines.push("")
    const missingList = missingFields.map(formatFieldLabel).join(", ")
    lines.push(
      `**Missing Context:** I don't have data for: ${missingList}.
RULE: Do NOT guess or assume values for missing fields. Instead:
- If the missing field is relevant to the current conversation, ask about it directly
- Weave questions naturally: "By the way, I don't think you've told me about [field] yet. What's the situation there?"
- Collect at most 2 missing fields per exchange to avoid feeling like an interrogation
- NEVER fabricate or assume company names, market segments, or challenges`
    )
  }

  return lines.join("\n")
}

// ============================================================================
// Memory Extraction
// ============================================================================

/**
 * Extract new/updated founder facts from a chat exchange using LLM.
 * Uses low temperature for deterministic extraction.
 */
export async function extractMemoryUpdates(
  userMessage: string,
  assistantResponse: string
): Promise<MemoryUpdate[]> {
  try {
    const { generate } = await import("@/lib/ai/fred-client")
    const prompt = buildExtractionInput(userMessage, assistantResponse)

    const result = await generate(prompt, {
      temperature: 0.2,
      maxOutputTokens: 256,
    })

    return parseExtractionResult(result.text)
  } catch (error) {
    console.warn(
      "[Active Memory] Failed to extract memory updates (non-blocking):",
      error
    )
    return []
  }
}

// ============================================================================
// Memory Persistence
// ============================================================================

/** Profile column mappings for core memory fields */
const PROFILE_COLUMN_MAP: Partial<Record<CoreMemoryFieldKey, string>> = {
  founder_name: "name",
  company_name: "company_name",
  co_founder: "co_founder",
  stage: "stage",
  market: "industry",
  team_size: "team_size",
  funding_status: "funding_history",
  traction: "traction",
  revenue_status: "revenue_range",
  product_status: "product_status",
  ninety_day_goal: "ninety_day_goal",
  biggest_challenge: "primary_constraint",
}

/** Semantic memory category/key mappings for core memory fields */
const SEMANTIC_MAP: Partial<
  Record<CoreMemoryFieldKey, { category: SemanticCategory; key: string }>
> = {
  biggest_challenge: { category: "challenges", key: "biggest_challenge" },
  company_name: { category: "startup_facts", key: "company_name" },
  market: { category: "startup_facts", key: "market" },
  co_founder: { category: "team_info", key: "co_founder" },
  traction: { category: "metrics", key: "traction" },
  revenue_status: { category: "metrics", key: "revenue" },
  funding_status: { category: "startup_facts", key: "funding_status" },
  product_status: { category: "product_details", key: "product_status" },
  ninety_day_goal: { category: "goals", key: "90_day_goal" },
  key_decisions: { category: "decisions", key: "recent_decisions" },
}

/**
 * Persist extracted memory updates to both the profiles table and semantic
 * memory. Designed to be called fire-and-forget (non-blocking after chat
 * response). Never throws -- logs warnings on failure.
 *
 * @param userId - Authenticated user ID
 * @param updates - Extracted memory updates from conversation
 * @param hasPersistentMemory - Whether to store semantic facts (Pro+ only).
 *   Profile column updates always run for ALL tiers.
 */
export async function persistMemoryUpdates(
  userId: string,
  updates: MemoryUpdate[],
  hasPersistentMemory: boolean = true
): Promise<void> {
  if (updates.length === 0) return

  try {
    const supabase = createServiceClient()

    // Batch profile column updates -- runs for ALL tiers
    const profileUpdates: Record<string, string> = {}
    for (const update of updates) {
      const column =
        PROFILE_COLUMN_MAP[update.field as CoreMemoryFieldKey]
      if (column) {
        profileUpdates[column] = update.value
      }
    }

    // Update profile columns in one query
    if (Object.keys(profileUpdates).length > 0) {
      const { error } = await supabase
        .from("profiles")
        .update(profileUpdates)
        .eq("id", userId)

      if (error) {
        console.warn(
          "[Active Memory] Failed to update profile columns:",
          error.message
        )
      }
    }

    // Store semantic memory facts -- only for Pro+ tiers
    if (hasPersistentMemory) {
      const { storeFact } = await import("@/lib/db/fred-memory")
      for (const update of updates) {
        const mapping =
          SEMANTIC_MAP[update.field as CoreMemoryFieldKey]
        if (mapping) {
          try {
            await storeFact(userId, mapping.category, mapping.key, {
              value: update.value,
            }, {
              confidence: update.confidence,
              source: "conversation",
            })
          } catch (factError) {
            console.warn(
              `[Active Memory] Failed to store fact ${update.field}:`,
              factError
            )
          }
        }
      }
    }
  } catch (error) {
    console.warn(
      "[Active Memory] persistMemoryUpdates failed (non-blocking):",
      error
    )
  }
}

// ============================================================================
// Plan 79-01 Required Exports (aliases + computeConfidence)
// ============================================================================

/**
 * Alias for buildActiveFounderMemory to satisfy plan 79-01 artifact contract.
 * @see buildActiveFounderMemory
 */
export const buildActiveFounderContext = buildActiveFounderMemory

/**
 * Compute a categorical confidence level based on when a field was last updated.
 * - No value -> "unknown"
 * - Updated < 7 days ago -> "high"
 * - Updated 7-30 days ago -> "medium"
 * - Updated > 30 days ago -> "low"
 *
 * Exported for testing as required by the plan spec.
 */
export function computeConfidence(lastUpdated: Date | null): MemoryConfidence {
  if (!lastUpdated) return "unknown"
  const ageMs = Date.now() - lastUpdated.getTime()
  const ageDays = ageMs / (24 * 60 * 60 * 1000)
  if (ageDays < 7) return "high"
  if (ageDays <= 30) return "medium"
  return "low"
}

// ============================================================================
// Helpers
// ============================================================================

/** Create a MemoryField with the given values */
function makeField(
  value: string,
  confidence: number,
  source: MemoryField["source"],
  lastUpdated: Date | null
): MemoryField {
  return { value, confidence, source, lastUpdated }
}

/** Extract a string value from a semantic memory fact's value object */
function extractFactString(value: Record<string, unknown>): string | null {
  if (typeof value === "string") return value
  if (typeof value.value === "string") return value.value
  if (typeof value.text === "string") return value.text
  return null
}

/** Format a core memory field key into a human-readable label */
function formatFieldLabel(key: CoreMemoryFieldKey): string {
  const labels: Record<CoreMemoryFieldKey, string> = {
    founder_name: "Founder Name",
    company_name: "Company Name",
    stage: "Stage",
    market: "Market",
    co_founder: "Co-Founder",
    biggest_challenge: "Biggest Challenge",
    oases_stage: "Journey Stage",
    traction: "Traction",
    revenue_status: "Revenue",
    funding_status: "Funding",
    team_size: "Team Size",
    product_status: "Product Status",
    ninety_day_goal: "90-Day Goal",
    key_decisions: "Key Decisions",
  }
  return labels[key] || key
}
