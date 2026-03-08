/**
 * Sentiment signal persistence layer
 *
 * Phase 83: Stores and retrieves per-message sentiment signals for
 * the Founder Mindset Monitor stress pattern detection pipeline.
 * Uses the service client (service role) to bypass RLS for inserts.
 */

import { createServiceClient } from "@/lib/supabase/server"

// ============================================================================
// Types
// ============================================================================

export interface SentimentSignalRow {
  id: string
  user_id: string
  message_id: string | null
  label: "positive" | "neutral" | "negative" | "frustrated"
  confidence: number
  stress_level: number
  topics: string[] | null
  intervention_triggered: boolean
  created_at: string
}

export interface SentimentSignalInsert {
  user_id: string
  message_id?: string | null
  label: "positive" | "neutral" | "negative" | "frustrated"
  confidence: number
  stress_level?: number
  topics?: string[]
  intervention_triggered?: boolean
}

// ============================================================================
// DB Operations
// ============================================================================

/**
 * Log a sentiment signal to the database (fire-and-forget).
 * Uses service role client to bypass RLS for inserts.
 */
export async function logSentimentSignal(
  signal: SentimentSignalInsert
): Promise<void> {
  try {
    const supabase = createServiceClient()
    const { error } = await supabase.from("sentiment_signals").insert({
      user_id: signal.user_id,
      message_id: signal.message_id ?? null,
      label: signal.label,
      confidence: signal.confidence,
      stress_level: signal.stress_level ?? 0,
      topics: signal.topics ?? [],
      intervention_triggered: signal.intervention_triggered ?? false,
    })
    if (error) {
      console.warn("[Sentiment Log] Insert failed:", error.message)
    }
  } catch (err) {
    console.warn("[Sentiment Log] Insert failed (non-blocking):", err)
  }
}

/**
 * Retrieve the most recent sentiment signals for a user.
 * Returns signals ordered by created_at DESC (most recent first).
 */
export async function getRecentSentimentSignals(
  userId: string,
  count: number = 5
): Promise<SentimentSignalRow[]> {
  try {
    const supabase = createServiceClient()
    const { data, error } = await supabase
      .from("sentiment_signals")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(count)
    if (error) {
      console.warn("[Sentiment Log] Query failed:", error.message)
      return []
    }
    return (data ?? []) as SentimentSignalRow[]
  } catch (err) {
    console.warn("[Sentiment Log] Query failed (non-blocking):", err)
    return []
  }
}

/**
 * Check if an intervention was triggered within the last N messages.
 * Used to enforce cooldown (no spam interventions).
 */
export async function wasInterventionTriggeredRecently(
  userId: string,
  withinMessages: number = 3
): Promise<boolean> {
  try {
    const supabase = createServiceClient()
    const { data, error } = await supabase
      .from("sentiment_signals")
      .select("intervention_triggered")
      .eq("user_id", userId)
      .eq("intervention_triggered", true)
      .order("created_at", { ascending: false })
      .limit(withinMessages)
    if (error) {
      console.warn("[Sentiment Log] Intervention check failed:", error.message)
      return false
    }
    return (data?.length ?? 0) > 0
  } catch (err) {
    console.warn("[Sentiment Log] Intervention check failed (non-blocking):", err)
    return false
  }
}
