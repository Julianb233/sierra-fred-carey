/**
 * Iteration Tracker
 *
 * Phase 90: User Testing Loop
 * Tracks feedback-to-fix cycle metrics with 48-hour SLA compliance.
 *
 * Queries feedback_signals and prompt_patches tables to compute:
 * - Signal status breakdown (new, triaged, resolved)
 * - Average time from signal to patch
 * - Percentage resolved within 48 hours
 * - Daily timeline of signals received vs resolved
 */

import { createServiceClient } from "@/lib/supabase/server"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface IterationMetrics {
  totalSignals: number
  statusBreakdown: {
    new: number
    triaged: number
    resolved: number
    other: number
  }
  triagedPercent: number
  resolvedIn48hPercent: number
  avgResolutionHours: number | null
  patchCount: number
  avgSignalToPatchHours: number | null
}

export interface IterationTimelineEntry {
  date: string
  received: number
  resolved: number
}

// ---------------------------------------------------------------------------
// Metrics
// ---------------------------------------------------------------------------

export async function getIterationMetrics(
  sinceDays: number
): Promise<IterationMetrics> {
  const supabase = createServiceClient()
  const since = new Date(
    Date.now() - sinceDays * 24 * 60 * 60 * 1000
  ).toISOString()

  // Fetch signals in the window
  const { data: signals } = await supabase
    .from("feedback_signals")
    .select("id, status, created_at, metadata")
    .gte("created_at", since)
    .order("created_at", { ascending: false })

  const all = signals || []

  // Status breakdown
  const statusBreakdown = { new: 0, triaged: 0, resolved: 0, other: 0 }
  for (const s of all) {
    if (s.status === "new") statusBreakdown.new++
    else if (s.status === "triaged") statusBreakdown.triaged++
    else if (s.status === "resolved") statusBreakdown.resolved++
    else statusBreakdown.other++
  }

  const totalSignals = all.length
  const triagedPercent =
    totalSignals > 0
      ? Math.round(
          ((statusBreakdown.triaged + statusBreakdown.resolved) /
            totalSignals) *
            100
        )
      : 0

  // Fetch patches created in response to feedback
  const { data: patches } = await supabase
    .from("prompt_patches")
    .select("id, created_at, source_signal_ids")
    .gte("created_at", since)

  const patchList = patches || []

  // Calculate avg signal-to-patch time
  let totalPatchHours = 0
  let patchTimeCount = 0

  for (const patch of patchList) {
    const signalIds = (patch.source_signal_ids as string[]) || []
    if (signalIds.length === 0) continue

    // Find earliest signal that contributed to this patch
    const contributingSignals = all.filter((s) => signalIds.includes(s.id))
    if (contributingSignals.length === 0) continue

    const earliestSignal = contributingSignals.reduce((a, b) =>
      new Date(a.created_at) < new Date(b.created_at) ? a : b
    )

    const hours =
      (new Date(patch.created_at).getTime() -
        new Date(earliestSignal.created_at).getTime()) /
      (1000 * 60 * 60)
    totalPatchHours += hours
    patchTimeCount++
  }

  // Calculate 48h SLA: signals resolved within 48 hours
  const resolvedSignals = all.filter((s) => s.status === "resolved")
  let resolvedIn48h = 0
  let totalResolutionHours = 0

  for (const s of resolvedSignals) {
    // Use metadata.resolved_at if available, otherwise estimate
    const resolvedAt =
      (s.metadata as Record<string, string>)?.resolved_at || null
    if (resolvedAt) {
      const hours =
        (new Date(resolvedAt).getTime() -
          new Date(s.created_at).getTime()) /
        (1000 * 60 * 60)
      totalResolutionHours += hours
      if (hours <= 48) resolvedIn48h++
    }
  }

  const resolvedIn48hPercent =
    resolvedSignals.length > 0
      ? Math.round((resolvedIn48h / resolvedSignals.length) * 100)
      : 0

  const avgResolutionHours =
    resolvedSignals.length > 0 && totalResolutionHours > 0
      ? Math.round((totalResolutionHours / resolvedSignals.length) * 10) / 10
      : null

  return {
    totalSignals,
    statusBreakdown,
    triagedPercent,
    resolvedIn48hPercent,
    avgResolutionHours,
    patchCount: patchList.length,
    avgSignalToPatchHours:
      patchTimeCount > 0
        ? Math.round((totalPatchHours / patchTimeCount) * 10) / 10
        : null,
  }
}

// ---------------------------------------------------------------------------
// Timeline
// ---------------------------------------------------------------------------

export async function getIterationTimeline(
  sinceDays: number
): Promise<IterationTimelineEntry[]> {
  const supabase = createServiceClient()
  const since = new Date(
    Date.now() - sinceDays * 24 * 60 * 60 * 1000
  ).toISOString()

  const { data: signals } = await supabase
    .from("feedback_signals")
    .select("id, status, created_at, metadata")
    .gte("created_at", since)
    .order("created_at", { ascending: true })

  const all = signals || []

  // Group by date
  const dateMap = new Map<string, { received: number; resolved: number }>()

  for (const s of all) {
    const date = new Date(s.created_at).toISOString().slice(0, 10)
    const entry = dateMap.get(date) || { received: 0, resolved: 0 }
    entry.received++
    if (s.status === "resolved") entry.resolved++
    dateMap.set(date, entry)
  }

  return Array.from(dateMap.entries())
    .map(([date, counts]) => ({ date, ...counts }))
    .sort((a, b) => a.date.localeCompare(b.date))
}
