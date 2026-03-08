/**
 * Oases Intent Classifier
 *
 * Regex-based classifier that detects which Oases stage a user message
 * relates to. Scans from highest stage (grow) to lowest (clarity) to
 * catch premature topics first.
 */

import type { OasesStage } from "@/types/oases"
import { STAGE_TOPIC_MAP } from "./stage-topics"

export interface IntentClassification {
  detectedStage: OasesStage | null
  matchedTopic: string | null
  confidence: "high" | "medium" | "low"
}

/** Stages ordered from highest to lowest for conservative matching */
const REVERSE_STAGE_ORDER: OasesStage[] = [
  "grow",
  "launch",
  "build",
  "validation",
  "clarity",
]

/**
 * Classify a user message to determine which Oases stage it relates to.
 *
 * Returns the HIGHEST matching stage (most restrictive) when multiple
 * stages match. Returns null for general conversation that does not
 * match any stage-specific topic.
 */
export function classifyIntent(message: string): IntentClassification {
  const lowerMessage = message.toLowerCase()

  // For each stage from highest to lowest, count keyword matches
  for (const stage of REVERSE_STAGE_ORDER) {
    const entry = STAGE_TOPIC_MAP[stage]
    let matchCount = 0
    let firstMatch: string | null = null

    for (const keyword of entry.keywords) {
      // Reset lastIndex for global regexes (safety)
      keyword.lastIndex = 0
      if (keyword.test(lowerMessage)) {
        matchCount++
        if (!firstMatch) {
          firstMatch = keyword.source
        }
      }
    }

    if (matchCount >= 2) {
      return {
        detectedStage: stage,
        matchedTopic: firstMatch,
        confidence: "high",
      }
    }

    if (matchCount === 1) {
      return {
        detectedStage: stage,
        matchedTopic: firstMatch,
        confidence: "medium",
      }
    }
  }

  // No stage-specific keywords matched — general conversation
  return {
    detectedStage: null,
    matchedTopic: null,
    confidence: "low",
  }
}
