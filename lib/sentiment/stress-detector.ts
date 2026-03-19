/**
 * Stress pattern detection for Founder Mindset Monitor
 *
 * Phase 83: Analyzes rolling window of sentiment signals to detect
 * founder stress patterns. Uses exponential decay weighting so
 * recent messages matter more than older ones.
 *
 * This module does NOT call any LLM -- it uses simple math and
 * keyword extraction for speed. Runs inline (before the LLM call)
 * so interventions can be injected into the system prompt.
 */

import type { SentimentResult } from "@/lib/feedback/sentiment"
import {
  getRecentSentimentSignals,
  wasInterventionTriggeredRecently,
  type SentimentSignalRow,
} from "@/lib/db/sentiment-log"

// ============================================================================
// Types
// ============================================================================

export type StressLevel = "low" | "moderate" | "high" | "critical"

export interface StressSignal {
  level: StressLevel
  score: number
  trend: "improving" | "stable" | "worsening"
  dominantEmotion: string
  topics: string[]
}

// ============================================================================
// Constants
// ============================================================================

/** Score weight by sentiment label */
const LABEL_SCORES: Record<string, number> = {
  frustrated: 1.0,
  negative: 0.6,
  neutral: 0.1,
  positive: -0.2,
}

/** Map score ranges to stress levels */
function scoreToLevel(score: number): StressLevel {
  if (score >= 0.7) return "critical"
  if (score >= 0.5) return "high"
  if (score >= 0.2) return "moderate"
  return "low"
}

// ============================================================================
// Stress topic keywords (simple extraction, no LLM)
// ============================================================================

const TOPIC_KEYWORDS: Record<string, string[]> = {
  fundraising: ["investor", "funding", "raise", "pitch", "vc", "capital", "valuation", "term sheet"],
  product: ["product", "feature", "build", "ship", "launch", "mvp", "prototype", "bug"],
  team: ["team", "hire", "cofounder", "co-founder", "employee", "talent", "culture"],
  revenue: ["revenue", "sales", "customer", "churn", "mrr", "arr", "growth", "pricing"],
  burnout: ["tired", "exhausted", "overwhelm", "burnout", "sleep", "stress", "anxiety", "quit", "can't sleep", "woke up", "insomnia", "panic", "breaking point", "giving up", "drowning", "falling apart", "crying", "can't stop thinking"],
  competition: ["competitor", "competition", "market share", "losing", "behind"],
  legal: ["legal", "lawsuit", "ip", "patent", "compliance", "regulation"],
  personal: ["family", "health", "relationship", "lonely", "isolated", "depressed", "divorce", "sick", "hospital", "therapy", "counseling", "medication", "mental health", "suicidal", "worthless", "hopeless"],
}

/**
 * Extract topic labels from a list of recent signals and current message context.
 * Simple keyword match -- no LLM involved.
 */
function extractTopics(signals: SentimentSignalRow[]): string[] {
  // Gather all existing topics from signals
  const allTopics = new Set<string>()
  for (const s of signals) {
    if (s.topics) {
      for (const t of s.topics) {
        allTopics.add(t)
      }
    }
  }
  return Array.from(allTopics).slice(0, 5)
}

/**
 * Extract topics from a raw user message using keyword matching.
 */
export function extractTopicsFromMessage(message: string): string[] {
  const lower = message.toLowerCase()
  const found: string[] = []
  for (const [topic, keywords] of Object.entries(TOPIC_KEYWORDS)) {
    for (const kw of keywords) {
      if (lower.includes(kw)) {
        found.push(topic)
        break
      }
    }
  }
  return found
}

// ============================================================================
// Core detection
// ============================================================================

/**
 * Compute a weighted stress score from a list of sentiment signals.
 * Applies exponential decay: most recent signal gets weight 1.0,
 * oldest gets weight 0.5. Signals should be in chronological order
 * (most recent first from DB, reversed here for weighting).
 */
function computeWeightedScore(signals: SentimentSignalRow[]): number {
  if (signals.length === 0) return 0

  const reversed = [...signals].reverse() // oldest first for weighting
  let totalWeight = 0
  let weightedSum = 0

  for (let i = 0; i < reversed.length; i++) {
    // Exponential decay: weight goes from 0.5 (oldest) to 1.0 (newest)
    const weight = 0.5 + 0.5 * (i / Math.max(reversed.length - 1, 1))
    const labelScore = LABEL_SCORES[reversed[i].label] ?? 0.1
    weightedSum += labelScore * weight
    totalWeight += weight
  }

  return totalWeight > 0 ? weightedSum / totalWeight : 0
}

/**
 * Determine the dominant emotion from recent signals.
 */
function getDominantEmotion(
  signals: SentimentSignalRow[],
  currentLabel: string
): string {
  const counts: Record<string, number> = {}
  // Include current label
  counts[currentLabel] = (counts[currentLabel] || 0) + 2 // Weight current higher
  for (const s of signals) {
    counts[s.label] = (counts[s.label] || 0) + 1
  }
  let max = 0
  let dominant = currentLabel
  for (const [label, count] of Object.entries(counts)) {
    if (count > max) {
      max = count
      dominant = label
    }
  }
  return dominant
}

/**
 * Detect stress patterns from a rolling window of sentiment signals.
 *
 * This runs BEFORE the LLM call so the intervention can be injected
 * into the system prompt. The DB query for 5 recent signals is lightweight.
 *
 * @param userId - The user to check
 * @param currentSentiment - The sentiment of the current message (just extracted)
 * @returns A StressSignal with level, score, trend, and topics
 */
export async function detectStressPattern(
  userId: string,
  currentSentiment: SentimentResult
): Promise<StressSignal> {
  // Fetch last 10 signals to compute both current and previous window
  const recentSignals = await getRecentSentimentSignals(userId, 10)

  // Current window: most recent 5 signals (or fewer if not enough history)
  const currentWindow = recentSignals.slice(0, 5)

  // Include the current message sentiment as a virtual signal for score computation
  const currentAsRow: SentimentSignalRow = {
    id: "",
    user_id: userId,
    message_id: null,
    label: currentSentiment.label,
    confidence: currentSentiment.confidence,
    stress_level: 0,
    topics: null,
    intervention_triggered: false,
    created_at: new Date().toISOString(),
  }
  const windowWithCurrent = [currentAsRow, ...currentWindow].slice(0, 5)

  // Compute current score
  const currentScore = computeWeightedScore(windowWithCurrent)
  const level = scoreToLevel(currentScore)

  // Compute previous window score for trend
  const previousWindow = recentSignals.slice(5, 10)
  let trend: "improving" | "stable" | "worsening" = "stable"
  if (previousWindow.length >= 2) {
    const previousScore = computeWeightedScore(previousWindow)
    const diff = currentScore - previousScore
    if (diff > 0.15) trend = "worsening"
    else if (diff < -0.15) trend = "improving"
  }

  // Extract topics and dominant emotion
  const topics = extractTopics(recentSignals)
  const dominantEmotion = getDominantEmotion(
    currentWindow,
    currentSentiment.label
  )

  return {
    level,
    score: Math.round(currentScore * 100) / 100,
    trend,
    dominantEmotion,
    topics,
  }
}

/**
 * Determine whether FRED should proactively intervene based on stress signal.
 *
 * Rules:
 * - Returns true if level is 'critical' (regardless of trend)
 * - Returns true if level is 'high' AND trend is 'worsening' or 'stable'
 * - Returns false if an intervention was triggered in the last 3 messages (cooldown)
 * - Returns false for 'low' or 'moderate' stress
 */
export async function shouldIntervene(
  signal: StressSignal,
  userId: string
): Promise<boolean> {
  // Only intervene at high or critical levels
  if (signal.level !== "high" && signal.level !== "critical") {
    return false
  }

  // Critical always qualifies (but still check cooldown)
  // High only if trend is worsening or stable
  if (signal.level === "high" && signal.trend === "improving") {
    return false
  }

  // Check cooldown: no intervention if one was triggered in last 3 messages
  const recentIntervention = await wasInterventionTriggeredRecently(userId, 3)
  if (recentIntervention) {
    return false
  }

  return true
}
