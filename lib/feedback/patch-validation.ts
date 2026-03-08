/**
 * Post-Deploy Patch Validation
 * Phase 76: RLHF-Lite (REQ-R5, REQ-L1)
 *
 * After a prompt patch deploys, tracks whether thumbs-up ratio improves
 * for that topic over a 2-week window. Links feedback insights to patches
 * for bidirectional traceability.
 */

import { createServiceClient } from "@/lib/supabase/server"
import { logger } from "@/lib/logger"
import {
  getPatchesWithExpiredTracking,
  updatePatchTrackingResults,
  linkInsightToPatch,
  markInsightResolved,
} from "@/lib/db/prompt-patches"
import type { PromptPatch } from "@/lib/feedback/types"

// ============================================================================
// Types
// ============================================================================

export interface PatchValidationResult {
  patchId: string
  topic: string
  thumbsBefore: number
  thumbsAfter: number
  improvement: number
  improved: boolean
  sampleSize: number
}

export interface TrackingStatus {
  patchId: string
  topic: string
  status: 'active' | 'expired' | 'completed'
  daysRemaining: number
  thumbsBefore: number | null
  thumbsAfter: number | null
}

// ============================================================================
// Baseline Computation
// ============================================================================

/**
 * Compute the baseline thumbs-up ratio for a topic over the last 30 days.
 * Used to set `thumbs_up_before` when a patch is deployed.
 */
export async function computeTopicThumbsRatio(
  topic: string,
  windowDays = 30
): Promise<{ ratio: number; sampleSize: number }> {
  const supabase = createServiceClient()
  const cutoff = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000).toISOString()

  // We approximate "topic" matching by looking for feedback signals
  // whose associated message content relates to the topic.
  // For now, we look at overall thumbs ratio (topic-agnostic) as baseline.
  const { data, error } = await supabase
    .from('feedback_signals')
    .select('signal_type')
    .in('signal_type', ['thumbs_up', 'thumbs_down'])
    .gte('created_at', cutoff)

  if (error) {
    logger.error('[patch-validation] Failed to compute baseline', { topic, error })
    return { ratio: 0, sampleSize: 0 }
  }

  const signals = data || []
  const thumbsUp = signals.filter((s) => s.signal_type === 'thumbs_up').length
  const total = signals.length

  return {
    ratio: total > 0 ? thumbsUp / total : 0,
    sampleSize: total,
  }
}

// ============================================================================
// Post-Deploy Validation (REQ-R5)
// ============================================================================

/**
 * Compute thumbs-up improvement for a deployed patch.
 * Compares the thumbs ratio during the tracking window to the baseline.
 */
export async function computePatchImprovement(
  patch: PromptPatch
): Promise<PatchValidationResult> {
  const supabase = createServiceClient()

  const startDate = patch.tracking_started_at || new Date().toISOString()
  const endDate = patch.tracking_ends_at || new Date().toISOString()

  const { data, error } = await supabase
    .from('feedback_signals')
    .select('signal_type')
    .in('signal_type', ['thumbs_up', 'thumbs_down'])
    .gte('created_at', startDate)
    .lte('created_at', endDate)

  if (error) {
    logger.error('[patch-validation] Failed to compute improvement', { patchId: patch.id, error })
    return {
      patchId: patch.id,
      topic: patch.topic,
      thumbsBefore: patch.thumbs_up_before || 0,
      thumbsAfter: 0,
      improvement: 0,
      improved: false,
      sampleSize: 0,
    }
  }

  const signals = data || []
  const thumbsUp = signals.filter((s) => s.signal_type === 'thumbs_up').length
  const total = signals.length
  const thumbsAfter = total > 0 ? thumbsUp / total : 0
  const thumbsBefore = patch.thumbs_up_before || 0
  const improvement = thumbsAfter - thumbsBefore

  return {
    patchId: patch.id,
    topic: patch.topic,
    thumbsBefore,
    thumbsAfter,
    improvement,
    improved: improvement > 0,
    sampleSize: total,
  }
}

/**
 * Process all patches with expired tracking windows.
 * Finalizes tracking and updates insights based on results.
 */
export async function processExpiredTracking(): Promise<PatchValidationResult[]> {
  const expiredPatches = await getPatchesWithExpiredTracking()
  const results: PatchValidationResult[] = []

  for (const patch of expiredPatches) {
    try {
      const result = await computePatchImprovement(patch)
      results.push(result)

      // Update the patch with final tracking results
      await updatePatchTrackingResults(patch.id, result.thumbsAfter, {
        validation_result: {
          improvement: result.improvement,
          improved: result.improved,
          sampleSize: result.sampleSize,
          finalized_at: new Date().toISOString(),
        },
      })

      // If improvement positive and insight linked, mark insight resolved
      if (result.improved && patch.source_insight_id) {
        await markInsightResolved(patch.source_insight_id)
        logger.info('[patch-validation] Insight marked resolved due to positive improvement', {
          patchId: patch.id,
          insightId: patch.source_insight_id,
          improvement: result.improvement,
        })
      }

      logger.info('[patch-validation] Tracking finalized', {
        patchId: patch.id,
        topic: patch.topic,
        improvement: result.improvement,
        improved: result.improved,
      })
    } catch (error) {
      logger.error('[patch-validation] Failed to process expired tracking', {
        patchId: patch.id,
        error,
      })
    }
  }

  return results
}

// ============================================================================
// Tracking Status
// ============================================================================

/**
 * Get the status of all patches with active or recently completed tracking.
 */
export async function getTrackingStatuses(): Promise<TrackingStatus[]> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('prompt_patches')
    .select('*')
    .eq('status', 'active')
    .not('tracking_started_at', 'is', null)
    .order('tracking_started_at', { ascending: false })

  if (error) {
    logger.error('[patch-validation] Failed to get tracking statuses', { error })
    return []
  }

  const now = Date.now()

  return ((data || []) as PromptPatch[]).map((patch) => {
    const endTime = patch.tracking_ends_at ? new Date(patch.tracking_ends_at).getTime() : 0
    const daysRemaining = Math.max(0, Math.ceil((endTime - now) / (24 * 60 * 60 * 1000)))

    let status: TrackingStatus['status'] = 'active'
    if (patch.thumbs_up_after !== null) {
      status = 'completed'
    } else if (endTime <= now) {
      status = 'expired'
    }

    return {
      patchId: patch.id,
      topic: patch.topic,
      status,
      daysRemaining,
      thumbsBefore: patch.thumbs_up_before,
      thumbsAfter: patch.thumbs_up_after,
    }
  })
}

// ============================================================================
// Patch Deployment with Tracking (REQ-R5)
// ============================================================================

/**
 * Deploy a patch and start its 2-week tracking window.
 * Sets baseline thumbs ratio and links insight to patch.
 */
export async function deployPatchWithTracking(
  patchId: string
): Promise<{ patch: PromptPatch; baseline: number }> {
  const { getPatchById, updatePatchStatus } = await import("@/lib/db/prompt-patches")

  const patch = await getPatchById(patchId)
  if (!patch) throw new Error(`Patch ${patchId} not found`)
  if (patch.status !== 'approved') {
    throw new Error(`Patch ${patchId} must be approved before deployment (current: ${patch.status})`)
  }

  // Compute baseline
  const { ratio } = await computeTopicThumbsRatio(patch.topic)

  // Deploy with tracking
  const deployed = await updatePatchStatus(patchId, 'active', {
    thumbs_up_before: ratio,
  })

  // Link insight to patch (REQ-L1)
  if (patch.source_insight_id) {
    await linkInsightToPatch(patch.source_insight_id, patchId)
  }

  logger.info('[patch-validation] Patch deployed with tracking', {
    patchId,
    topic: patch.topic,
    baseline: ratio,
  })

  return { patch: deployed, baseline: ratio }
}
