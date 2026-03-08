/**
 * Reality Lens State -- DB Helpers
 *
 * Manages the reality_lens_complete flag and oases_stage
 * in the profiles table. Used by the Quick Reality Lens flow
 * to persist initial stage placement after assessment.
 *
 * Phase 81: Reality Lens First
 */

import { createServiceClient } from "@/lib/supabase/server";
import type { OasesStage } from "@/types/oases";

// ============================================================================
// Types
// ============================================================================

export interface RealityLensStatus {
  complete: boolean;
  stage: OasesStage | null;
  score: number | null;
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Mark the Reality Lens as complete for a user.
 * Sets reality_lens_complete = true, oases_stage, and reality_lens_score.
 */
export async function markRealityLensComplete(
  userId: string,
  stage: OasesStage,
  score: number
): Promise<void> {
  const supabase = createServiceClient();

  const { error } = await supabase
    .from("profiles")
    .update({
      reality_lens_complete: true,
      reality_lens_score: score,
      oases_stage: stage,
    })
    .eq("id", userId);

  if (error) {
    console.error(
      "[Reality Lens State] Failed to mark complete:",
      error
    );
    throw new Error(`Failed to update profile: ${error.message}`);
  }
}

/**
 * Get the current Reality Lens status for a user.
 */
export async function getRealityLensStatus(
  userId: string
): Promise<RealityLensStatus> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("profiles")
    .select("reality_lens_complete, reality_lens_score, oases_stage")
    .eq("id", userId)
    .single();

  if (error) {
    console.error(
      "[Reality Lens State] Failed to get status:",
      error
    );
    // Return default -- treat as not complete
    return { complete: false, stage: null, score: null };
  }

  return {
    complete: data?.reality_lens_complete ?? false,
    stage: (data?.oases_stage as OasesStage) ?? null,
    score: data?.reality_lens_score ?? null,
  };
}
