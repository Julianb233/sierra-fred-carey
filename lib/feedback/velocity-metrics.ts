/**
 * Feedback-to-Fix Velocity Metrics
 *
 * AI-4118: Measures how long from feedback signal to resolution,
 * broken down by category, severity, and time period.
 * Powers the /api/admin/feedback/metrics endpoint.
 */
import { createServiceClient } from "@/lib/supabase/server"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface VelocityMetrics {
  overview: {
    totalSignals: number
    totalResolved: number
    totalInsights: number
    totalPatches: number
    avgSignalToInsightHours: number | null
    avgInsightToActionHours: number | null
    avgSignalToResolutionHours: number | null
    medianResolutionHours: number | null
    resolvedIn24hPercent: number
    resolvedIn48hPercent: number
    resolvedIn7dPercent: number
  }
  byCategory: CategoryVelocity[]
  bySeverity: SeverityVelocity[]
  trends: VelocityTrend[]
  bottlenecks: Bottleneck[]
}

export interface CategoryVelocity {
  category: string
  count: number
  resolvedCount: number
  avgResolutionHours: number | null
  medianResolutionHours: number | null
  p95ResolutionHours: number | null
  oldestUnresolvedDays: number | null
}

export interface SeverityVelocity {
  severity: string
  count: number
  resolvedCount: number
  avgResolutionHours: number | null
}

export interface VelocityTrend {
  week: string // ISO week start date
  signalsReceived: number
  signalsResolved: number
  insightsCreated: number
  avgResolutionHours: number | null
  backlogSize: number
}

export interface Bottleneck {
  stage: "signal_to_insight" | "insight_to_action" | "action_to_resolution"
  avgHours: number | null
  description: string
}

// ---------------------------------------------------------------------------
// Main query
// ---------------------------------------------------------------------------

export async function getVelocityMetrics(
  sinceDays = 90
): Promise<VelocityMetrics> {
  const supabase = createServiceClient()
  const since = new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000).toISOString()

  // Parallel fetch: signals, insights, patches
  const [signalsRes, insightsRes, patchesRes] = await Promise.all([
    supabase
      .from("feedback_signals")
      .select("id, category, signal_type, rating, created_at, processing_status, metadata")
      .gte("created_at", since)
      .order("created_at", { ascending: true }),
    supabase
      .from("feedback_insights")
      .select("id, title, category, severity, status, signal_ids, signal_count, actioned_at, resolved_at, created_at")
      .gte("created_at", since)
      .order("created_at", { ascending: true }),
    supabase
      .from("prompt_patches")
      .select("id, status, source_insight_id, source_signal_ids, created_at")
      .gte("created_at", since),
  ])

  const signals = signalsRes.data || []
  const insights = insightsRes.data || []
  const patches = patchesRes.data || []

  // Build lookup maps
  const signalMap = new Map(signals.map((s) => [s.id, s]))
  const insightsBySignalId = new Map<string, typeof insights[0]>()
  for (const insight of insights) {
    const ids = (insight.signal_ids as string[]) || []
    for (const sid of ids) {
      if (!insightsBySignalId.has(sid)) {
        insightsBySignalId.set(sid, insight)
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Overview metrics
  // ---------------------------------------------------------------------------

  const resolvedInsights = insights.filter((i) => i.resolved_at)
  const actionedInsights = insights.filter((i) => i.actioned_at)

  // Signal → Insight velocity (time from earliest signal to insight creation)
  const signalToInsightHours: number[] = []
  for (const insight of insights) {
    const ids = (insight.signal_ids as string[]) || []
    const signalDates = ids
      .map((id) => signalMap.get(id)?.created_at)
      .filter(Boolean)
      .map((d) => new Date(d!).getTime())

    if (signalDates.length > 0) {
      const earliest = Math.min(...signalDates)
      const hours = (new Date(insight.created_at).getTime() - earliest) / (1000 * 60 * 60)
      signalToInsightHours.push(hours)
    }
  }

  // Insight → Action velocity
  const insightToActionHours: number[] = []
  for (const insight of actionedInsights) {
    const hours =
      (new Date(insight.actioned_at!).getTime() - new Date(insight.created_at).getTime()) /
      (1000 * 60 * 60)
    insightToActionHours.push(hours)
  }

  // Signal → Resolution velocity (end-to-end)
  const signalToResolutionHours: number[] = []
  for (const insight of resolvedInsights) {
    const ids = (insight.signal_ids as string[]) || []
    const signalDates = ids
      .map((id) => signalMap.get(id)?.created_at)
      .filter(Boolean)
      .map((d) => new Date(d!).getTime())

    if (signalDates.length > 0) {
      const earliest = Math.min(...signalDates)
      const hours = (new Date(insight.resolved_at!).getTime() - earliest) / (1000 * 60 * 60)
      signalToResolutionHours.push(hours)
    }
  }

  const overview = {
    totalSignals: signals.length,
    totalResolved: resolvedInsights.length,
    totalInsights: insights.length,
    totalPatches: patches.length,
    avgSignalToInsightHours: avg(signalToInsightHours),
    avgInsightToActionHours: avg(insightToActionHours),
    avgSignalToResolutionHours: avg(signalToResolutionHours),
    medianResolutionHours: median(signalToResolutionHours),
    resolvedIn24hPercent: percentWithin(signalToResolutionHours, 24),
    resolvedIn48hPercent: percentWithin(signalToResolutionHours, 48),
    resolvedIn7dPercent: percentWithin(signalToResolutionHours, 168),
  }

  // ---------------------------------------------------------------------------
  // By category
  // ---------------------------------------------------------------------------

  const categoryMap = new Map<string, { count: number; resolvedHours: number[]; unresolvedDates: Date[] }>()

  for (const insight of insights) {
    const cat = insight.category || "uncategorized"
    const entry = categoryMap.get(cat) || { count: 0, resolvedHours: [], unresolvedDates: [] }
    entry.count++

    if (insight.resolved_at) {
      const ids = (insight.signal_ids as string[]) || []
      const signalDates = ids
        .map((id) => signalMap.get(id)?.created_at)
        .filter(Boolean)
        .map((d) => new Date(d!).getTime())
      if (signalDates.length > 0) {
        const earliest = Math.min(...signalDates)
        entry.resolvedHours.push(
          (new Date(insight.resolved_at).getTime() - earliest) / (1000 * 60 * 60)
        )
      }
    } else {
      entry.unresolvedDates.push(new Date(insight.created_at))
    }

    categoryMap.set(cat, entry)
  }

  const byCategory: CategoryVelocity[] = Array.from(categoryMap.entries())
    .map(([category, data]) => {
      const oldestUnresolved = data.unresolvedDates.length > 0
        ? Math.min(...data.unresolvedDates.map((d) => d.getTime()))
        : null

      return {
        category,
        count: data.count,
        resolvedCount: data.resolvedHours.length,
        avgResolutionHours: avg(data.resolvedHours),
        medianResolutionHours: median(data.resolvedHours),
        p95ResolutionHours: percentile(data.resolvedHours, 95),
        oldestUnresolvedDays: oldestUnresolved
          ? Math.round((Date.now() - oldestUnresolved) / (1000 * 60 * 60 * 24) * 10) / 10
          : null,
      }
    })
    .sort((a, b) => (b.avgResolutionHours || 0) - (a.avgResolutionHours || 0))

  // ---------------------------------------------------------------------------
  // By severity
  // ---------------------------------------------------------------------------

  const severityMap = new Map<string, { count: number; resolvedHours: number[] }>()

  for (const insight of insights) {
    const sev = insight.severity || "low"
    const entry = severityMap.get(sev) || { count: 0, resolvedHours: [] }
    entry.count++

    if (insight.resolved_at) {
      const ids = (insight.signal_ids as string[]) || []
      const signalDates = ids
        .map((id) => signalMap.get(id)?.created_at)
        .filter(Boolean)
        .map((d) => new Date(d!).getTime())
      if (signalDates.length > 0) {
        const earliest = Math.min(...signalDates)
        entry.resolvedHours.push(
          (new Date(insight.resolved_at).getTime() - earliest) / (1000 * 60 * 60)
        )
      }
    }

    severityMap.set(sev, entry)
  }

  const bySeverity: SeverityVelocity[] = Array.from(severityMap.entries())
    .map(([severity, data]) => ({
      severity,
      count: data.count,
      resolvedCount: data.resolvedHours.length,
      avgResolutionHours: avg(data.resolvedHours),
    }))
    .sort((a, b) => {
      const order: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 }
      return (order[a.severity] ?? 4) - (order[b.severity] ?? 4)
    })

  // ---------------------------------------------------------------------------
  // Weekly trends
  // ---------------------------------------------------------------------------

  const weekMap = new Map<string, { received: number; resolved: number; insightsCreated: number; resolutionHours: number[] }>()

  for (const signal of signals) {
    const week = getWeekStart(new Date(signal.created_at))
    const entry = weekMap.get(week) || { received: 0, resolved: 0, insightsCreated: 0, resolutionHours: [] }
    entry.received++
    weekMap.set(week, entry)
  }

  for (const insight of insights) {
    const week = getWeekStart(new Date(insight.created_at))
    const entry = weekMap.get(week) || { received: 0, resolved: 0, insightsCreated: 0, resolutionHours: [] }
    entry.insightsCreated++

    if (insight.resolved_at) {
      const resolvedWeek = getWeekStart(new Date(insight.resolved_at))
      const rEntry = weekMap.get(resolvedWeek) || { received: 0, resolved: 0, insightsCreated: 0, resolutionHours: [] }
      rEntry.resolved++
      weekMap.set(resolvedWeek, rEntry)

      // Resolution time
      const ids = (insight.signal_ids as string[]) || []
      const signalDates = ids
        .map((id) => signalMap.get(id)?.created_at)
        .filter(Boolean)
        .map((d) => new Date(d!).getTime())
      if (signalDates.length > 0) {
        const earliest = Math.min(...signalDates)
        entry.resolutionHours.push(
          (new Date(insight.resolved_at).getTime() - earliest) / (1000 * 60 * 60)
        )
      }
    }

    weekMap.set(week, entry)
  }

  // Calculate running backlog
  let backlog = 0
  const sortedWeeks = Array.from(weekMap.keys()).sort()
  const trends: VelocityTrend[] = sortedWeeks.map((week) => {
    const data = weekMap.get(week)!
    backlog += data.insightsCreated - data.resolved
    return {
      week,
      signalsReceived: data.received,
      signalsResolved: data.resolved,
      insightsCreated: data.insightsCreated,
      avgResolutionHours: avg(data.resolutionHours),
      backlogSize: Math.max(0, backlog),
    }
  })

  // ---------------------------------------------------------------------------
  // Bottleneck analysis
  // ---------------------------------------------------------------------------

  const bottlenecks: Bottleneck[] = ([
    {
      stage: "signal_to_insight" as const,
      avgHours: avg(signalToInsightHours),
      description: "Time from first feedback signal to pattern/insight detection",
    },
    {
      stage: "insight_to_action" as const,
      avgHours: avg(insightToActionHours),
      description: "Time from insight creation to patch/fix initiated",
    },
    {
      stage: "action_to_resolution" as const,
      avgHours:
        insightToActionHours.length > 0 && signalToResolutionHours.length > 0
          ? round((avg(signalToResolutionHours) || 0) - (avg(signalToInsightHours) || 0) - (avg(insightToActionHours) || 0))
          : null,
      description: "Time from fix initiated to issue fully resolved",
    },
  ] satisfies Bottleneck[]).sort((a, b) => (b.avgHours || 0) - (a.avgHours || 0))

  return { overview, byCategory, bySeverity, trends, bottlenecks }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function avg(arr: number[]): number | null {
  if (arr.length === 0) return null
  return round(arr.reduce((a, b) => a + b, 0) / arr.length)
}

function median(arr: number[]): number | null {
  if (arr.length === 0) return null
  const sorted = [...arr].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return round(sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2)
}

function percentile(arr: number[], p: number): number | null {
  if (arr.length === 0) return null
  const sorted = [...arr].sort((a, b) => a - b)
  const idx = Math.ceil((p / 100) * sorted.length) - 1
  return round(sorted[Math.max(0, idx)])
}

function percentWithin(arr: number[], hours: number): number {
  if (arr.length === 0) return 0
  const count = arr.filter((h) => h <= hours).length
  return Math.round((count / arr.length) * 100)
}

function round(n: number): number {
  return Math.round(n * 10) / 10
}

function getWeekStart(date: Date): string {
  const d = new Date(date)
  const day = d.getDay()
  d.setDate(d.getDate() - day) // Sunday
  return d.toISOString().slice(0, 10)
}
