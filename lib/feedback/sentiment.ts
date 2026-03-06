/**
 * Per-message sentiment extraction
 *
 * Phase 73: Extracts sentiment from FRED chat interactions using either
 * LLM-based structured output (primary) or keyword heuristics (fallback).
 * Designed to run as a fire-and-forget background task -- never blocks
 * the user-facing response.
 */

import { generateObject } from "ai"
import { z } from "zod"
import { getModel } from "@/lib/ai/providers"
import { getModelForTier } from "@/lib/ai/tier-routing"

// ============================================================================
// Types
// ============================================================================

export interface SentimentResult {
  label: 'positive' | 'neutral' | 'negative' | 'frustrated'
  confidence: number // 0-1
  isCoachingDiscomfort: boolean // true when negative sentiment stems from FRED challenging assumptions (working as designed)
}

const SENTIMENT_LABELS = ['positive', 'neutral', 'negative', 'frustrated'] as const

// ============================================================================
// LLM-based extraction (primary)
// ============================================================================

const sentimentSchema = z.object({
  label: z.enum(SENTIMENT_LABELS).describe(
    "Overall sentiment of the user message. 'frustrated' indicates strong negative emotion beyond simple dissatisfaction."
  ),
  confidence: z.number().min(0).max(1).describe(
    "How confident you are in this classification, from 0 (guessing) to 1 (certain)."
  ),
  isCoachingDiscomfort: z.boolean().describe(
    "True ONLY when negative sentiment is a reaction to FRED giving valid tough-love feedback or challenging assumptions. Examples: 'That's harsh', 'I don't want to hear that', 'You're being too direct' when FRED gave constructive criticism. False for genuine quality complaints."
  ),
})

const NEUTRAL_FALLBACK: SentimentResult = {
  label: 'neutral',
  confidence: 0,
  isCoachingDiscomfort: false,
}

/**
 * Extract sentiment from a user message in the context of FRED's response.
 * Uses a small/fast model via generateObject for structured output.
 * Wrapped in try/catch -- always returns a result, never throws.
 */
export async function extractSentiment(
  userMessage: string,
  fredResponse: string
): Promise<SentimentResult> {
  try {
    // Skip LLM call for very short messages -- use heuristic instead
    if (userMessage.trim().length < 10) {
      return extractSentimentFromText(userMessage)
    }

    const providerKey = getModelForTier('free', 'structured')
    const model = getModel(providerKey)

    const result = await generateObject({
      model,
      schema: sentimentSchema,
      prompt: `Classify the sentiment of this user message in a startup coaching conversation.

User message: "${userMessage}"

FRED's response (for context only): "${fredResponse.slice(0, 500)}"

Consider:
- Is the user expressing frustration, negativity, positivity, or neutrality?
- If the user seems upset, is it because the AI coach challenged their assumptions (coaching discomfort) or because the response was genuinely unhelpful?
- Coaching discomfort examples: "That's harsh", "I disagree with your assessment", "You don't understand my vision" -- these are signs of the coach doing its job.
- Quality complaints: "That didn't make sense", "You repeated yourself", "This is useless" -- these indicate real issues.`,
    })

    return {
      label: result.object.label,
      confidence: result.object.confidence,
      isCoachingDiscomfort: result.object.isCoachingDiscomfort,
    }
  } catch (err) {
    console.warn("[Sentiment] LLM extraction failed, using heuristic fallback:", err)
    return extractSentimentFromText(userMessage)
  }
}

// ============================================================================
// Heuristic fallback (sync, keyword-based)
// ============================================================================

const FRUSTRATED_PATTERNS = [
  /\bfrustrat/i,
  /\bannoyed?\b/i,
  /\bwaste of time\b/i,
  /\buseless\b/i,
  /\bterrible\b/i,
  /\bawful\b/i,
  /\brigdiculous\b/i,
  /\bpointless\b/i,
]

const NEGATIVE_PATTERNS = [
  /\bbad\b/i,
  /\bwrong\b/i,
  /\bnot helpful\b/i,
  /\bdisappoint/i,
  /\bconfused?\b/i,
  /\bunhelpful\b/i,
  /\bdoesn'?t (make sense|work)\b/i,
  /\bnot (good|great|useful)\b/i,
]

const POSITIVE_PATTERNS = [
  /\bthanks?\b/i,
  /\bthank you\b/i,
  /\bgreat\b/i,
  /\bhelpful\b/i,
  /\bamazing\b/i,
  /\blove\b/i,
  /\bexcellent\b/i,
  /\bperfect\b/i,
  /\bawesome\b/i,
  /\bwonderful\b/i,
]

/**
 * Sync heuristic-based sentiment extraction.
 * Used for very short messages or as fallback when LLM call fails.
 */
export function extractSentimentFromText(text: string): SentimentResult {
  const lower = text.toLowerCase()

  // Check frustrated first (strongest signal)
  for (const pattern of FRUSTRATED_PATTERNS) {
    if (pattern.test(lower)) {
      return { label: 'frustrated', confidence: 0.6, isCoachingDiscomfort: false }
    }
  }

  // Check negative
  for (const pattern of NEGATIVE_PATTERNS) {
    if (pattern.test(lower)) {
      return { label: 'negative', confidence: 0.5, isCoachingDiscomfort: false }
    }
  }

  // Check positive
  for (const pattern of POSITIVE_PATTERNS) {
    if (pattern.test(lower)) {
      return { label: 'positive', confidence: 0.5, isCoachingDiscomfort: false }
    }
  }

  // Default: neutral with low confidence
  return { label: 'neutral', confidence: 0.3, isCoachingDiscomfort: false }
}
