/**
 * Feedback-to-Fix Linker
 *
 * Phase 76 REQ-L1: Track which feedback signals contributed to
 * which prompt patches or bug fixes. Provides bidirectional linking:
 *
 * Forward: feedback_signals -> prompt_patches (via source_signal_ids)
 * Reverse: feedback_insights -> prompt_patches (via source_insight_id)
 *
 * Also manages insight lifecycle transitions:
 * - When patch approved -> source insight marked 'actioned'
 * - When patch validation succeeds -> source insight marked 'resolved'
 */
import { createServiceClient } from "@/lib/supabase/server"
import type { PromptPatch } from "@/lib/feedback/types"

/**
 * Link a feedback insight to a prompt patch (called when patch is created
 * from an insight via generatePatchFromInsight).
 * This is handled automatically by the patch generator, but exposed for manual linking.
 */
export async function linkInsightToPatch(
  insightId: string,
  patchId: string
): Promise<void> {
  const supabase = createServiceClient()
  const { error } = await supabase
    .from("prompt_patches")
    .update({
      source_insight_id: insightId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", patchId)
  if (error) throw error
}

/**
 * Mark the source insight as 'actioned' when a patch is approved.
 * Called by the patch status update flow.
 */
export async function markInsightActioned(patchId: string): Promise<void> {
  const supabase = createServiceClient()

  // Get patch to find source insight
  const { data: patch, error: patchErr } = await supabase
    .from("prompt_patches")
    .select("source_insight_id")
    .eq("id", patchId)
    .single()

  if (patchErr || !patch?.source_insight_id) return

  const { error } = await supabase
    .from("feedback_insights")
    .update({
      status: "actioned",
      actioned_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", patch.source_insight_id)
    .in("status", ["new", "reviewed"]) // Only transition from earlier states

  if (error) {
    console.error("[feedback-linker] Failed to mark insight actioned:", error.message)
  }
}

/**
 * Mark the source insight as 'resolved' when patch validation shows improvement.
 * Called by finalizePatchTracking when improvement > 0.
 */
export async function markInsightResolved(patchId: string): Promise<void> {
  const supabase = createServiceClient()

  const { data: patch, error: patchErr } = await supabase
    .from("prompt_patches")
    .select("source_insight_id")
    .eq("id", patchId)
    .single()

  if (patchErr || !patch?.source_insight_id) return

  const { error } = await supabase
    .from("feedback_insights")
    .update({
      status: "resolved",
      resolved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", patch.source_insight_id)

  if (error) {
    console.error("[feedback-linker] Failed to mark insight resolved:", error.message)
  }
}

/**
 * Get all prompt patches linked to a specific feedback insight.
 */
export async function getLinkedPatches(insightId: string): Promise<PromptPatch[]> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from("prompt_patches")
    .select("*")
    .eq("source_insight_id", insightId)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("[feedback-linker] Failed to get linked patches:", error.message)
    return []
  }

  return (data ?? []) as PromptPatch[]
}

/**
 * Get all feedback signal IDs that contributed to a specific patch.
 * Returns signal IDs from the patch's source_signal_ids field.
 */
export async function getContributingSignals(patchId: string): Promise<string[]> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from("prompt_patches")
    .select("source_signal_ids")
    .eq("id", patchId)
    .single()

  if (error || !data) return []
  return (data.source_signal_ids as string[]) || []
}
