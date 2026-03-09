/**
 * Admin Sentiment Database Queries
 *
 * Phase 83-02: Admin-scoped sentiment queries for the Founder Mindset
 * Monitor dashboard. Uses service client to bypass RLS.
 */

import { createServiceClient } from "@/lib/supabase/server"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SentimentOverview {
  totalSignals: number
  labelDistribution: Array<{ label: string; count: number }>
  interventionCount: number
  highStressFounders: Array<{
    user_id: string
    name: string
    avg_stress_level: number
    signal_count: number
    last_signal_at: string
  }>
}

export interface InterventionEvent {
  id: string
  user_id: string
  name: string
  label: string
  stress_level: number
  topics: string[]
  created_at: string
}

export interface UserSentimentEntry {
  label: string
  confidence: number
  stress_level: number
  topics: string[] | null
  intervention_triggered: boolean
  created_at: string
}

// ---------------------------------------------------------------------------
// Query: Sentiment overview with high-stress founders
// ---------------------------------------------------------------------------

export async function getSentimentOverview(
  days: number = 7
): Promise<SentimentOverview> {
  const supabase = createServiceClient()
  const since = new Date()
  since.setDate(since.getDate() - days)
  const sinceStr = since.toISOString()

  // Fetch all signals in the period
  const { data: signals, error: signalsErr } = await supabase
    .from("sentiment_signals")
    .select("user_id, label, stress_level, intervention_triggered, created_at")
    .gte("created_at", sinceStr)

  if (signalsErr) {
    console.error("[sentiment-admin] Overview query failed:", signalsErr.message)
    return { totalSignals: 0, labelDistribution: [], interventionCount: 0, highStressFounders: [] }
  }

  const all = signals ?? []
  const totalSignals = all.length

  // Label distribution
  const labelCounts: Record<string, number> = {}
  let interventionCount = 0
  const userStats: Record<string, { totalStress: number; count: number; lastAt: string }> = {}

  for (const s of all) {
    labelCounts[s.label] = (labelCounts[s.label] || 0) + 1
    if (s.intervention_triggered) interventionCount++

    // Accumulate per-user stats
    if (!userStats[s.user_id]) {
      userStats[s.user_id] = { totalStress: 0, count: 0, lastAt: s.created_at }
    }
    userStats[s.user_id].totalStress += s.stress_level ?? 0
    userStats[s.user_id].count++
    if (s.created_at > userStats[s.user_id].lastAt) {
      userStats[s.user_id].lastAt = s.created_at
    }
  }

  const labelDistribution = Object.entries(labelCounts)
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)

  // Find high-stress founders (avg stress > 0.5)
  const highStressUserIds = Object.entries(userStats)
    .filter(([, stats]) => stats.count > 0 && stats.totalStress / stats.count > 0.5)
    .sort((a, b) => (b[1].totalStress / b[1].count) - (a[1].totalStress / a[1].count))
    .slice(0, 20)
    .map(([userId]) => userId)

  // Fetch names for high-stress founders
  let highStressFounders: SentimentOverview["highStressFounders"] = []
  if (highStressUserIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, display_name, email")
      .in("id", highStressUserIds)

    const profileMap = new Map<string, string>()
    for (const p of profiles ?? []) {
      profileMap.set(p.id, p.display_name || p.email || "Unknown")
    }

    highStressFounders = highStressUserIds.map((uid) => {
      const stats = userStats[uid]
      return {
        user_id: uid,
        name: profileMap.get(uid) || "Unknown",
        avg_stress_level: Math.round((stats.totalStress / stats.count) * 100) / 100,
        signal_count: stats.count,
        last_signal_at: stats.lastAt,
      }
    })
  }

  return { totalSignals, labelDistribution, interventionCount, highStressFounders }
}

// ---------------------------------------------------------------------------
// Query: Intervention log
// ---------------------------------------------------------------------------

export async function getInterventionLog(
  limit: number = 50
): Promise<InterventionEvent[]> {
  const supabase = createServiceClient()

  const { data: interventions, error } = await supabase
    .from("sentiment_signals")
    .select("id, user_id, label, stress_level, topics, created_at")
    .eq("intervention_triggered", true)
    .order("created_at", { ascending: false })
    .limit(limit)

  if (error) {
    console.error("[sentiment-admin] Intervention log query failed:", error.message)
    return []
  }

  if (!interventions || interventions.length === 0) return []

  // Fetch names
  const userIds = [...new Set(interventions.map((i) => i.user_id))]
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, display_name, email")
    .in("id", userIds)

  const profileMap = new Map<string, string>()
  for (const p of profiles ?? []) {
    profileMap.set(p.id, p.display_name || p.email || "Unknown")
  }

  return interventions.map((i) => ({
    id: i.id,
    user_id: i.user_id,
    name: profileMap.get(i.user_id) || "Unknown",
    label: i.label,
    stress_level: i.stress_level,
    topics: i.topics ?? [],
    created_at: i.created_at,
  }))
}

// ---------------------------------------------------------------------------
// Query: Per-user sentiment history
// ---------------------------------------------------------------------------

export async function getUserSentimentHistory(
  userId: string,
  days: number = 30
): Promise<UserSentimentEntry[]> {
  const supabase = createServiceClient()
  const since = new Date()
  since.setDate(since.getDate() - days)

  const { data, error } = await supabase
    .from("sentiment_signals")
    .select("label, confidence, stress_level, topics, intervention_triggered, created_at")
    .eq("user_id", userId)
    .gte("created_at", since.toISOString())
    .order("created_at", { ascending: true })

  if (error) {
    console.error("[sentiment-admin] User history query failed:", error.message)
    return []
  }

  return (data ?? []) as UserSentimentEntry[]
}
