/**
 * Prompt Patch Performance Tracker
 *
 * Phase 76 (REQ-R5): After prompt patch deploys, tracks thumbs-up ratio
 * improvement over a 2-week window.
 */

import { sql } from "@/lib/db/supabase-sql"
import { chiSquaredTest, meetsMinimumSampleSize } from "@/lib/statistics/significance"
import type { PromptPatch } from "@/lib/rlhf/types"
import { logger } from "@/lib/logger"

export const TRACKING_WINDOW_DAYS = 14

// ============================================================================
// Tracking Lifecycle
// ============================================================================

/**
 * Start performance tracking for a patch by recording baseline thumbs ratio.
 * Called when a patch is activated or launched as an A/B test.
 */
export async function startPatchTracking(
  patchId: string,
  topic: string
): Promise<void> {
  // Query baseline thumbs ratio for this topic from the past 14 days
  const baseline = await sql`
    SELECT
      COUNT(*) FILTER (WHERE rating = 1) as thumbs_up,
      COUNT(*) FILTER (WHERE rating = -1) as thumbs_down
    FROM feedback_signals
    WHERE created_at > NOW() - INTERVAL '14 days'
      AND signal_type IN ('thumbs_up', 'thumbs_down')
      AND metadata->>'topic' = ${topic}
  `

  const thumbsUp = parseInt(String((baseline[0] as Record<string, unknown>).thumbs_up), 10) || 0
  const thumbsDown = parseInt(String((baseline[0] as Record<string, unknown>).thumbs_down), 10) || 0
  const total = thumbsUp + thumbsDown
  const baselineRatio = total > 0 ? thumbsUp / total : 0

  const trackingSince = new Date().toISOString()
  const trackingUntil = new Date(
    Date.now() + TRACKING_WINDOW_DAYS * 24 * 60 * 60 * 1000
  ).toISOString()

  await sql`
    UPDATE prompt_patches
    SET performance_metrics = ${JSON.stringify({
      baselineThumbsRatio: baselineRatio,
      baselineThumbsUp: thumbsUp,
      baselineThumbsDown: thumbsDown,
      trackingSince,
      trackingUntil,
    })},
    updated_at = NOW()
    WHERE id = ${patchId}
  `

  logger.log(
    `[patch-tracker] Started tracking patch ${patchId}: baseline ratio=${baselineRatio.toFixed(3)} (${thumbsUp}/${total})`
  )
}

// ============================================================================
// Performance Queries
// ============================================================================

export interface PatchPerformance {
  baseline: number
  current: number
  improvement: number // percentage change
  daysRemaining: number
  significant: boolean
  thumbsUp: number
  thumbsDown: number
  baselineThumbsUp: number
  baselineThumbsDown: number
}

/**
 * Get current performance metrics for a tracked patch.
 */
export async function getPatchPerformance(
  patchId: string
): Promise<PatchPerformance | null> {
  // Get the patch
  const patchRows = await sql`
    SELECT topic, performance_metrics FROM prompt_patches WHERE id = ${patchId}
  `
  if (patchRows.length === 0) return null

  const row = patchRows[0] as Record<string, unknown>
  const metrics = row.performance_metrics as Record<string, unknown>

  if (!metrics?.trackingSince) return null

  const topic = row.topic ? String(row.topic) : null
  const trackingSince = String(metrics.trackingSince)
  const trackingUntil = String(metrics.trackingUntil)
  const baselineRatio = Number(metrics.baselineThumbsRatio) || 0
  const baselineThumbsUp = Number(metrics.baselineThumbsUp) || 0
  const baselineThumbsDown = Number(metrics.baselineThumbsDown) || 0

  // Query current thumbs ratio since tracking started
  let currentData: Record<string, unknown>[]
  if (topic) {
    currentData = (await sql`
      SELECT
        COUNT(*) FILTER (WHERE rating = 1) as thumbs_up,
        COUNT(*) FILTER (WHERE rating = -1) as thumbs_down
      FROM feedback_signals
      WHERE created_at > ${trackingSince}
        AND signal_type IN ('thumbs_up', 'thumbs_down')
        AND metadata->>'topic' = ${topic}
    `) as Record<string, unknown>[]
  } else {
    currentData = (await sql`
      SELECT
        COUNT(*) FILTER (WHERE rating = 1) as thumbs_up,
        COUNT(*) FILTER (WHERE rating = -1) as thumbs_down
      FROM feedback_signals
      WHERE created_at > ${trackingSince}
        AND signal_type IN ('thumbs_up', 'thumbs_down')
    `) as Record<string, unknown>[]
  }

  const thumbsUp = parseInt(String(currentData[0].thumbs_up), 10) || 0
  const thumbsDown = parseInt(String(currentData[0].thumbs_down), 10) || 0
  const total = thumbsUp + thumbsDown
  const currentRatio = total > 0 ? thumbsUp / total : 0

  // Calculate improvement
  const improvement =
    baselineRatio > 0
      ? ((currentRatio - baselineRatio) / baselineRatio) * 100
      : 0

  // Days remaining
  const untilDate = new Date(trackingUntil)
  const daysRemaining = Math.max(
    0,
    Math.ceil((untilDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000))
  )

  // Statistical significance via chi-squared
  const baselineTotal = baselineThumbsUp + baselineThumbsDown
  let significant = false
  if (meetsMinimumSampleSize(baselineTotal, total, 100)) {
    const result = chiSquaredTest(
      [baselineThumbsUp, baselineThumbsDown],
      [thumbsUp, thumbsDown]
    )
    significant = result.significant
  }

  return {
    baseline: baselineRatio,
    current: currentRatio,
    improvement,
    daysRemaining,
    significant,
    thumbsUp,
    thumbsDown,
    baselineThumbsUp,
    baselineThumbsDown,
  }
}

/**
 * Check if a patch is improving, degrading, or neutral.
 */
export async function checkPatchImprovement(
  patchId: string
): Promise<"improving" | "neutral" | "degrading" | "insufficient_data"> {
  const perf = await getPatchPerformance(patchId)
  if (!perf) return "insufficient_data"

  const totalSignals = perf.thumbsUp + perf.thumbsDown
  if (totalSignals < 100) return "insufficient_data"

  if (perf.significant && perf.improvement > 5) return "improving"
  if (perf.significant && perf.improvement < -5) return "degrading"
  return "neutral"
}

/**
 * Update performance metrics for all active/testing patches.
 * Called by daily Trigger.dev job.
 */
export async function updateAllPatchMetrics(): Promise<void> {
  const activePatches = await sql`
    SELECT id, topic, performance_metrics
    FROM prompt_patches
    WHERE status IN ('active', 'testing')
      AND performance_metrics->>'trackingSince' IS NOT NULL
  `

  for (const row of activePatches) {
    const patchRow = row as Record<string, unknown>
    const patchId = String(patchRow.id)

    try {
      const perf = await getPatchPerformance(patchId)
      if (perf) {
        const existingMetrics = (patchRow.performance_metrics as Record<string, unknown>) || {}
        await sql`
          UPDATE prompt_patches
          SET performance_metrics = ${JSON.stringify({
            ...existingMetrics,
            currentThumbsRatio: perf.current,
            thumbsImprovement: perf.improvement,
          })},
          updated_at = NOW()
          WHERE id = ${patchId}
        `
      }
    } catch (err) {
      logger.log(`[patch-tracker] Failed to update metrics for patch ${patchId}: ${err}`)
    }
  }

  logger.log(`[patch-tracker] Updated metrics for ${activePatches.length} patches`)
}
