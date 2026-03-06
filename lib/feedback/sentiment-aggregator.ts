/**
 * Session-level sentiment aggregation and spike detection
 *
 * Phase 73: Aggregates per-message sentiment scores into session-level
 * metrics, detects sharp sentiment degradation, and flags sessions
 * that need admin attention.
 */

import { getFeedbackSignalsBySession, upsertFeedbackSession } from "@/lib/db/feedback"
import type { FeedbackSession } from "@/lib/feedback/types"

// ============================================================================
// Sentiment label → numeric score mapping
// ============================================================================

export const SENTIMENT_SCORE_MAP: Record<string, number> = {
  positive: 1,
  neutral: 0,
  negative: -0.5,
  frustrated: -1,
}

// ============================================================================
// Spike detection
// ============================================================================

/**
 * Detect sharp sentiment degradation in a sequence of scores.
 *
 * A spike is detected when:
 * 1. The last 3 messages average < -0.5 AND the previous 3 messages averaged > 0 (sharp drop)
 * 2. Any single message has sentiment < -0.8 with confidence > 0.7
 */
export function detectSentimentSpike(
  scores: number[],
  confidences?: number[]
): { spiked: boolean; reason: string } {
  if (scores.length < 2) {
    return { spiked: false, reason: "" }
  }

  // Check for single extreme negative with high confidence
  if (confidences && confidences.length === scores.length) {
    for (let i = 0; i < scores.length; i++) {
      if (scores[i] < -0.8 && confidences[i] > 0.7) {
        return {
          spiked: true,
          reason: `Extreme negative sentiment detected (score: ${scores[i].toFixed(2)}, confidence: ${confidences[i].toFixed(2)}) at message ${i + 1}`,
        }
      }
    }
  }

  // Check for sharp drop: last 3 vs previous 3
  if (scores.length >= 6) {
    const lastThree = scores.slice(-3)
    const prevThree = scores.slice(-6, -3)
    const lastAvg = lastThree.reduce((a, b) => a + b, 0) / lastThree.length
    const prevAvg = prevThree.reduce((a, b) => a + b, 0) / prevThree.length

    if (lastAvg < -0.5 && prevAvg > 0) {
      return {
        spiked: true,
        reason: `Sharp sentiment degradation: avg dropped from ${prevAvg.toFixed(2)} to ${lastAvg.toFixed(2)} over last 6 messages`,
      }
    }
  }

  // Shorter sequences: check last 3 if available
  if (scores.length >= 3) {
    const lastThree = scores.slice(-3)
    const lastAvg = lastThree.reduce((a, b) => a + b, 0) / lastThree.length
    const allButLast = scores.slice(0, -3)
    if (allButLast.length > 0) {
      const prevAvg = allButLast.reduce((a, b) => a + b, 0) / allButLast.length
      if (lastAvg < -0.5 && prevAvg > 0) {
        return {
          spiked: true,
          reason: `Sharp sentiment degradation: avg dropped from ${prevAvg.toFixed(2)} to ${lastAvg.toFixed(2)} over last ${scores.length} messages`,
        }
      }
    }
  }

  return { spiked: false, reason: "" }
}

// ============================================================================
// Session aggregation
// ============================================================================

/**
 * Determine the sentiment trend from a sequence of scores.
 */
function determineTrend(scores: number[]): FeedbackSession['sentiment_trend'] {
  if (scores.length < 3) return 'stable'

  const firstHalf = scores.slice(0, Math.floor(scores.length / 2))
  const secondHalf = scores.slice(Math.floor(scores.length / 2))
  const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length
  const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length

  const diff = secondAvg - firstAvg
  if (diff > 0.3) return 'improving'
  if (diff < -0.3) return 'degrading'
  return 'stable'
}

/**
 * Aggregate all sentiment signals for a session, compute averages,
 * detect spikes, and upsert the feedback_sessions record.
 */
export async function aggregateSessionSentiment(
  sessionId: string,
  userId: string
): Promise<void> {
  try {
    const signals = await getFeedbackSignalsBySession(sessionId, 'sentiment')

    if (!signals || signals.length === 0) return

    const scores: number[] = []
    const confidences: number[] = []

    for (const signal of signals) {
      if (signal.sentiment_score !== null && signal.sentiment_score !== undefined) {
        scores.push(signal.sentiment_score)
        confidences.push(signal.sentiment_confidence ?? 0)
      }
    }

    if (scores.length === 0) return

    // Weighted average by confidence
    let totalWeight = 0
    let weightedSum = 0
    for (let i = 0; i < scores.length; i++) {
      const w = confidences[i] > 0 ? confidences[i] : 0.3
      weightedSum += scores[i] * w
      totalWeight += w
    }
    const sentimentAvg = totalWeight > 0 ? weightedSum / totalWeight : 0

    // Detect spikes
    const spike = detectSentimentSpike(scores, confidences)
    const trend = spike.spiked ? 'spike_negative' : determineTrend(scores)

    await upsertFeedbackSession({
      id: sessionId,
      user_id: userId,
      channel: 'chat',
      started_at: signals[0]?.created_at ?? new Date().toISOString(),
      ended_at: signals[signals.length - 1]?.created_at ?? null,
      message_count: signals.length,
      sentiment_avg: Math.round(sentimentAvg * 100) / 100,
      sentiment_trend: trend,
      flagged: spike.spiked,
      flag_reason: spike.spiked ? spike.reason : null,
      metadata: {
        scores,
        lastUpdated: new Date().toISOString(),
      },
    })
  } catch (err) {
    console.warn("[SentimentAggregator] Session aggregation failed (non-blocking):", err)
  }
}
