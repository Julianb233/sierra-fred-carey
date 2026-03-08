/**
 * Prompt Patches DB Helpers
 * Phase 76: RLHF-Lite + Close-the-Loop
 *
 * CRUD operations for the prompt_patches table. Supports the full
 * lifecycle: draft -> pending_review -> approved -> active -> retired.
 */

import { createServiceClient } from "@/lib/supabase/server"
import type {
  PromptPatch,
  PromptPatchInsert,
  PromptPatchStatus,
} from "@/lib/feedback/types"

// ============================================================================
// Insert / Update
// ============================================================================

export async function insertPromptPatch(
  patch: PromptPatchInsert
): Promise<PromptPatch> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from("prompt_patches")
    .insert(patch)
    .select()
    .single()
  if (error) throw error
  return data as PromptPatch
}

export async function updatePatchStatus(
  id: string,
  status: PromptPatchStatus,
  extra?: Partial<PromptPatch> | Record<string, unknown>
): Promise<PromptPatch> {
  const supabase = createServiceClient()
  const update: Record<string, unknown> = { status, ...extra }
  if (status === "approved") {
    update.approved_at = new Date().toISOString()
  }
  if (status === "active") {
    update.tracking_started_at = new Date().toISOString()
    update.tracking_ends_at = new Date(
      Date.now() + 14 * 24 * 60 * 60 * 1000
    ).toISOString()
  }
  const { data, error } = await supabase
    .from("prompt_patches")
    .update(update)
    .eq("id", id)
    .select()
    .single()
  if (error) throw error
  return data as PromptPatch
}

// ============================================================================
// Queries
// ============================================================================

export async function getPatchesByStatus(
  status: PromptPatchStatus | PromptPatchStatus[],
  limit = 50
): Promise<PromptPatch[]> {
  const supabase = createServiceClient()
  const statuses = Array.isArray(status) ? status : [status]
  const { data, error } = await supabase
    .from("prompt_patches")
    .select("*")
    .in("status", statuses)
    .order("created_at", { ascending: false })
    .limit(limit)
  if (error) throw error
  return (data ?? []) as PromptPatch[]
}

export async function getPatchById(id: string): Promise<PromptPatch | null> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from("prompt_patches")
    .select("*")
    .eq("id", id)
    .maybeSingle()
  if (error) throw error
  return (data as PromptPatch) ?? null
}

export async function getActivePatchesForTopic(
  topic: string
): Promise<PromptPatch[]> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from("prompt_patches")
    .select("*")
    .eq("status", "active")
    .eq("topic", topic)
    .order("version", { ascending: false })
  if (error) throw error
  return (data ?? []) as PromptPatch[]
}

export async function getAllActivePatches(): Promise<PromptPatch[]> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from("prompt_patches")
    .select("*")
    .eq("status", "active")
    .order("topic", { ascending: true })
  if (error) throw error
  return (data ?? []) as PromptPatch[]
}

/**
 * Get active supplemental_instruction patches for prompt assembly.
 * Returns only active supplemental instructions (not few-shot examples).
 * Used by buildPromptWithDBPatches() in prompt-layers.ts.
 */
export async function getActiveSupplementalPatches(): Promise<PromptPatch[]> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from("prompt_patches")
    .select("*")
    .eq("status", "active")
    .eq("patch_type", "supplemental_instruction")
    .order("topic", { ascending: true })
  if (error) throw error
  return (data ?? []) as PromptPatch[]
}

export async function getPatchesPendingReview(
  limit = 50
): Promise<PromptPatch[]> {
  return getPatchesByStatus(["draft", "pending_review"], limit)
}

// ============================================================================
// Tracking queries (Phase 76-03)
// ============================================================================

/** Get patches with active tracking windows that have ended */
export async function getPatchesWithExpiredTracking(): Promise<PromptPatch[]> {
  const supabase = createServiceClient()
  const now = new Date().toISOString()
  const { data, error } = await supabase
    .from("prompt_patches")
    .select("*")
    .eq("status", "active")
    .not("tracking_ends_at", "is", null)
    .lte("tracking_ends_at", now)
    .is("thumbs_up_after", null)
  if (error) throw error
  return (data ?? []) as PromptPatch[]
}

/** Update tracking results after evaluation */
export async function updatePatchTrackingResults(
  id: string,
  thumbsUpAfter: number,
  metadata?: Record<string, unknown>
): Promise<PromptPatch> {
  const supabase = createServiceClient()
  const update: Record<string, unknown> = {
    thumbs_up_after: thumbsUpAfter,
  }
  if (metadata) {
    update.metadata = metadata
  }
  const { data, error } = await supabase
    .from("prompt_patches")
    .update(update)
    .eq("id", id)
    .select()
    .single()
  if (error) throw error
  return data as PromptPatch
}

/** Get recently activated patches (for digest email) */
export async function getRecentlyActivatedPatches(
  sinceDate: string,
  minSeverity: string = "medium"
): Promise<PromptPatch[]> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from("prompt_patches")
    .select("*, feedback_insights!source_insight_id(severity)")
    .eq("status", "active")
    .gte("tracking_started_at", sinceDate)
    .order("tracking_started_at", { ascending: false })
  if (error) {
    // Fallback: query without join if feedback_insights join fails
    const { data: fallbackData, error: fallbackError } = await supabase
      .from("prompt_patches")
      .select("*")
      .eq("status", "active")
      .gte("tracking_started_at", sinceDate)
      .order("tracking_started_at", { ascending: false })
    if (fallbackError) throw fallbackError
    return (fallbackData ?? []) as PromptPatch[]
  }

  // Filter by severity if join worked
  const severityOrder: Record<string, number> = {
    low: 1,
    medium: 2,
    high: 3,
    critical: 4,
  }
  const minSev = severityOrder[minSeverity] ?? 2

  return ((data ?? []) as Array<PromptPatch & { feedback_insights?: { severity: string } }>).filter(
    (p) => {
      const sev = p.feedback_insights?.severity
      if (!sev) return true // include patches without insight link
      return (severityOrder[sev] ?? 0) >= minSev
    }
  ) as PromptPatch[]
}

// ============================================================================
// Linking insights to patches
// ============================================================================

export async function linkInsightToPatch(
  insightId: string,
  patchId: string
): Promise<void> {
  const supabase = createServiceClient()
  const { error } = await supabase
    .from("feedback_insights")
    .update({
      resolved_by_patch_id: patchId,
      status: "actioned",
      actioned_at: new Date().toISOString(),
    })
    .eq("id", insightId)
  if (error) throw error
}

export async function linkPatchToExperiment(
  patchId: string,
  experimentId: string
): Promise<void> {
  const supabase = createServiceClient()
  const { error } = await supabase
    .from("prompt_patches")
    .update({ experiment_id: experimentId })
    .eq("id", patchId)
  if (error) throw error
}

export async function markInsightResolved(insightId: string): Promise<void> {
  const supabase = createServiceClient()
  const { error } = await supabase
    .from("feedback_insights")
    .update({
      status: "resolved",
      resolved_at: new Date().toISOString(),
    })
    .eq("id", insightId)
  if (error) throw error
}
