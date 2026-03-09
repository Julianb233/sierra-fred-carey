/**
 * Memory Extraction Prompt
 * Phase 79: LLM prompt for extracting founder facts from chat messages
 *
 * After each conversation exchange, this prompt is sent to the LLM to identify
 * new or updated founder facts. Only explicit statements from the founder are
 * extracted -- never inferences from FRED's questions or generic statements.
 *
 * Designed for fast, deterministic extraction (temperature 0.2, max 256 tokens).
 */

import type { MemoryUpdate, CoreMemoryFieldKey } from "@/lib/fred/founder-memory-types"
import { CORE_MEMORY_FIELDS } from "@/lib/fred/founder-memory-types"

// ============================================================================
// Extraction Prompt
// ============================================================================

export const MEMORY_EXTRACTION_PROMPT = `You are a fact extraction engine. Your job is to identify NEW or UPDATED founder facts from the user's message in a conversation with a startup mentor.

## RULES

1. Only extract facts the FOUNDER explicitly stated. Never infer from the mentor's questions.
2. Only extract high-signal facts. Skip noise, filler, and vague statements.
3. Assign confidence 0.7-1.0 based on how explicit the statement was:
   - 1.0: Direct statement ("My co-founder is Sarah Chen")
   - 0.9: Clear but contextual ("We just pivoted to B2B healthcare")
   - 0.8: Reasonably clear ("Our main problem right now is distribution")
   - 0.7: Implicit but likely ("Sarah and I have been working on this" -> co_founder = "Sarah")
4. Only return facts that are NEW information or UPDATE existing knowledge.
5. Map facts to these core fields when possible:
   - founder_name: The founder's name
   - company_name: Their company/startup name
   - stage: Their startup stage (idea, pre-seed, seed, series-a, growth)
   - market: Their industry, sector, or target market
   - co_founder: Co-founder name(s) or "solo founder"
   - biggest_challenge: Their primary challenge or blocker
   - oases_stage: Their journey stage (clarity, validation, build, launch, grow)
   - traction: User count, signups, waitlist size, partnerships, pilot customers
   - revenue_status: Current revenue, MRR, ARR, or "pre-revenue"
   - funding_status: Bootstrapped, raised $X, seeking funding, etc.
   - team_size: Number of team members or "solo founder"
   - product_status: MVP, beta, launched, pre-product, etc.
   - ninety_day_goal: What they want to achieve in the next 90 days
   - key_decisions: Important decisions they've made or need to make (comma-separated)
6. When the founder describes a decision they've made or a significant pivot, extract it as key_decisions.
7. REPHRASE RULE: For biggest_challenge, traction, and key_decisions, rephrase the founder's words into a concise 1-sentence summary rather than quoting verbatim. Example: User says "I keep trying to get people to sign up but nobody wants to pay" -> biggest_challenge: "Struggling with conversion from free users to paid subscribers"

## INPUT

You will receive:
- USER_MESSAGE: The founder's latest message
- ASSISTANT_RESPONSE: The mentor's response (for context only -- do NOT extract from this)

## OUTPUT

Return ONLY a JSON object with this structure:
{"updates": [{"field": "<field_name>", "value": "<extracted_value>", "confidence": <0.7-1.0>}]}

If no new facts are found, return: {"updates": []}

Do NOT include any text outside the JSON object.`

// ============================================================================
// Result Parser
// ============================================================================

/**
 * Safely parse the LLM's JSON output into MemoryUpdate[].
 * Falls back to empty array on any parse failure.
 */
export function parseExtractionResult(raw: string): MemoryUpdate[] {
  try {
    // Strip any markdown code fences the LLM might wrap around JSON
    const cleaned = raw
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```\s*$/, "")
      .trim()

    const parsed = JSON.parse(cleaned)

    if (!parsed || !Array.isArray(parsed.updates)) {
      return []
    }

    const validFields = new Set<string>([...CORE_MEMORY_FIELDS])

    return parsed.updates
      .filter(
        (u: Record<string, unknown>) =>
          typeof u.field === "string" &&
          typeof u.value === "string" &&
          typeof u.confidence === "number" &&
          u.value.length > 0 &&
          u.confidence >= 0.7 &&
          u.confidence <= 1.0
      )
      .map((u: Record<string, unknown>) => ({
        field: u.field as CoreMemoryFieldKey | string,
        value: u.value as string,
        confidence: u.confidence as number,
        source: "conversation" as const,
      }))
  } catch {
    // Parse failure -- return empty array, never throw
    return []
  }
}

/**
 * Build the full extraction prompt with the user/assistant messages injected.
 */
export function buildExtractionInput(
  userMessage: string,
  assistantResponse: string
): string {
  return `${MEMORY_EXTRACTION_PROMPT}

## CONVERSATION EXCHANGE

USER_MESSAGE:
${userMessage}

ASSISTANT_RESPONSE:
${assistantResponse}`
}
