/**
 * Journey Completion Logic
 * Phase 85: Journey-Gated Fund Matching
 *
 * Calculates venture journey completion percentage from Oases stage progress.
 * Used to gate features (like Boardy fund matching) behind journey completion.
 */

import { createServiceClient } from "@/lib/supabase/server"
import { STAGE_ORDER } from "@/lib/oases/stage-config"
import type { OasesStage } from "@/types/oases"

// ============================================================================
// Types
// ============================================================================

export interface JourneyCompletion {
  /** Completion percentage 0-100 */
  percent: number
  /** Current stage id */
  stage: string
  /** Whether the journey is fully complete (grow stage reached) */
  isComplete: boolean
  /** List of completed stage ids */
  stagesCompleted: string[]
  /** The next stage to reach, or null if complete */
  nextStage: string | null
}

// ============================================================================
// Stage Weights
// ============================================================================

/**
 * Each stage maps to a cumulative completion percentage.
 * Reaching "grow" means 100% journey completion.
 */
export const STAGE_WEIGHTS: Record<string, number> = {
  clarity: 20,
  validation: 40,
  build: 60,
  launch: 80,
  grow: 100,
}

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Get the journey completion data for a user.
 * Queries the profiles table for oases_stage and computes completion.
 */
export async function getJourneyCompletion(
  userId: string
): Promise<JourneyCompletion> {
  const supabase = createServiceClient()

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("oases_stage")
    .eq("id", userId)
    .single()

  if (error || !profile) {
    return {
      percent: 0,
      stage: "clarity",
      isComplete: false,
      stagesCompleted: [],
      nextStage: "clarity",
    }
  }

  const currentStage = (profile.oases_stage ?? "clarity") as OasesStage
  const percent = STAGE_WEIGHTS[currentStage] ?? 0
  const currentIndex = STAGE_ORDER.indexOf(currentStage)

  const stagesCompleted = STAGE_ORDER.filter(
    (_stage, idx) => idx < currentIndex
  )

  // If user is at "grow", they've completed the journey
  const isComplete = currentStage === "grow"

  // Include current stage in completed list if journey is complete
  if (isComplete) {
    stagesCompleted.push("grow")
  }

  const nextStage =
    currentIndex < STAGE_ORDER.length - 1
      ? STAGE_ORDER[currentIndex + 1]
      : null

  return {
    percent,
    stage: currentStage,
    isComplete,
    stagesCompleted,
    nextStage,
  }
}

/**
 * Shorthand: returns true if user has completed the full venture journey.
 */
export async function isJourneyComplete(userId: string): Promise<boolean> {
  const completion = await getJourneyCompletion(userId)
  return completion.isComplete
}
