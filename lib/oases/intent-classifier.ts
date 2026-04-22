/**
 * Oases Intent Classifier
 *
 * Regex-based classifier that detects which Oases stage a user message
 * relates to. Scans from highest stage (grow) to lowest (clarity) to
 * catch premature topics first.
 *
 * Phase 80: Added action-verb gating (dual-gate pattern) and mentor
 * override detection. Informational questions ("what is a pitch deck?")
 * no longer trigger redirects — only actionable requests do.
 */

import type { OasesStage } from "@/types/oases"
import { STAGE_TOPIC_MAP } from "./stage-topics"

export interface IntentClassification {
  detectedStage: OasesStage | null
  matchedTopic: string | null
  confidence: "high" | "medium" | "low"
  isOverride: boolean
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
 * Action verbs that indicate the user wants to DO something, not just ask about it.
 * For non-clarity stage matches, BOTH a topic keyword AND an action verb are required.
 * This prevents informational questions from triggering stage-gate redirects.
 */
const ACTION_VERBS = /\b(help|build|create|make|write|review|prepare|start|plan|need|want|should\s*i|how\s*(do\s*i\s*)?to|how\s*can\s*i|ready\s*to|let'?s|work\s*on|get\s*(started|ready)|tell\s*me\s*(about|how)|what\s*(should|do)|guide|coach|advise|show)\b/i

/**
 * Mentor override patterns — user explicitly insists on discussing a topic
 * after being redirected. Detected separately from stage classification.
 */
const OVERRIDE_PATTERNS = [
  /\b(i\s*understand|i\s*know|i\s*(?:get|hear)\s*(?:it|you|that))\b.*\b(but|however|still|anyway|regardless|need\s*to|want\s*to|have\s*to)\b/i,
  /\b(i\s*really\s*need|i\s*insist|please\s*(?:just|help)|can\s*we\s*(?:just|please)|let\s*me\s*(?:just|decide))\b/i,
  /\b(i'?ve\s*already|already\s*(?:done|validated|tested|figured)|skip|move\s*(?:on|ahead|forward))\b/i,
]

/**
 * Classify a user message to determine which Oases stage it relates to.
 *
 * Returns the HIGHEST matching stage (most restrictive) when multiple
 * stages match. Returns null for general conversation that does not
 * match any stage-specific topic.
 *
 * Phase 80: For non-clarity stages, requires BOTH a topic keyword match
 * AND an action verb. This prevents informational questions like
 * "what is a pitch deck?" from triggering redirects.
 */
export function classifyIntent(message: string): IntentClassification {
  const lowerMessage = message.toLowerCase()
  const hasActionVerb = ACTION_VERBS.test(message)
  const isOverride = OVERRIDE_PATTERNS.some(p => p.test(message))

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

    // Phase 80: For non-clarity stages, require an action verb alongside
    // topic keywords. Clarity stage always matches (it's the starting point,
    // and informational questions about basics are fine).
    if (matchCount > 0 && stage !== "clarity" && !hasActionVerb) {
      // Topic matched but no action verb — treat as informational, skip
      continue
    }

    if (matchCount >= 2) {
      return {
        detectedStage: stage,
        matchedTopic: firstMatch,
        confidence: "high",
        isOverride,
      }
    }

    if (matchCount === 1) {
      return {
        detectedStage: stage,
        matchedTopic: firstMatch,
        confidence: "medium",
        isOverride,
      }
    }
  }

  // No stage-specific keywords matched — general conversation
  return {
    detectedStage: null,
    matchedTopic: null,
    confidence: "low",
    isOverride,
  }
}
