/**
 * Oases Progress Calculation & Stage Advancement
 *
 * Server-side module for computing a user's journey progress and
 * advancing them to the next stage when all steps are complete.
 */

import { createClient } from "@/lib/supabase/server"
import type { OasesProgress, OasesStage } from "@/types/oases"
import { UserTier } from "@/lib/constants"
import { STAGE_CONFIG, STAGE_ORDER, getStageIndex } from "./stage-config"
import { isStageTierGated, getTierCeilingLabel } from "./founder-archetype"

/**
 * Compute journey percentage from completed vs total steps.
 */
export function computeJourneyPercentage(
  completedSteps: number,
  totalSteps: number
): number {
  if (totalSteps === 0) return 0
  return Math.round((completedSteps / totalSteps) * 100)
}

/**
 * Get detailed progress from the journey_steps table.
 * Returns per-stage step counts from the granular 120-step journey_steps table
 * and completed counts from oases_progress. Used for the progress percentage bar.
 * Each stage contributes 20% to the total (equal weight).
 */
export async function getDetailedProgress(
  userId: string
): Promise<{ journeyPercentage: number; perStage: Record<string, { total: number; completed: number }> }> {
  const supabase = await createClient()

  // Get per-stage step counts from journey_steps
  const { data: stepCounts, error: stepError } = await supabase
    .from("journey_steps")
    .select("stage")
    .eq("active", true)

  if (stepError || !stepCounts) {
    // Fallback: return 0
    return { journeyPercentage: 0, perStage: {} }
  }

  // Count steps per stage
  const stageTotals: Record<string, number> = {}
  for (const row of stepCounts) {
    stageTotals[row.stage] = (stageTotals[row.stage] || 0) + 1
  }

  // Get completed step counts from oases_progress
  const { data: completedRows, error: completedError } = await supabase
    .from("oases_progress")
    .select("stage, step_id")
    .eq("user_id", userId)

  if (completedError) {
    return { journeyPercentage: 0, perStage: {} }
  }

  const stageCompleted: Record<string, number> = {}
  for (const row of (completedRows ?? [])) {
    stageCompleted[row.stage] = (stageCompleted[row.stage] || 0) + 1
  }

  // Compute per-stage data and weighted percentage (each stage = 20%)
  const perStage: Record<string, { total: number; completed: number }> = {}
  let weightedSum = 0
  const stageNames = STAGE_ORDER

  for (const stage of stageNames) {
    const total = stageTotals[stage] || 0
    const completed = Math.min(stageCompleted[stage] || 0, total)
    perStage[stage] = { total, completed }
    if (total > 0) {
      weightedSum += (completed / total) * 20
    }
  }

  return {
    journeyPercentage: Math.round(weightedSum),
    perStage,
  }
}

/**
 * Fetch the user's full Oases progress including current stage,
 * per-stage step completion, and overall journey percentage.
 */
export async function getUserOasesProgress(
  userId: string
): Promise<OasesProgress> {
  const supabase = await createClient()

  // Fetch the user's current stage from profiles
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("oases_stage")
    .eq("id", userId)
    .single()

  if (profileError || !profile) {
    throw new Error("Failed to load user profile for Oases progress")
  }

  const currentStage = (profile.oases_stage ?? "clarity") as OasesStage
  const currentStageIndex = getStageIndex(currentStage)

  // Fetch all completed progress rows for this user
  const { data: progressRows, error: progressError } = await supabase
    .from("oases_progress")
    .select("stage, step_id")
    .eq("user_id", userId)

  if (progressError) {
    throw new Error("Failed to load Oases progress data")
  }

  const completedSet = new Set(
    (progressRows ?? []).map((r) => `${r.stage}:${r.step_id}`)
  )

  let totalCompleted = 0
  let totalSteps = 0

  const stages = STAGE_CONFIG.map((stageConfig) => {
    const stageIndex = getStageIndex(stageConfig.id)
    const completedStepIds = stageConfig.steps
      .filter((step) => completedSet.has(`${stageConfig.id}:${step.id}`))
      .map((step) => step.id)

    const stepsCompleted = completedStepIds.length
    const stepsTotal = stageConfig.steps.length

    totalCompleted += stepsCompleted
    totalSteps += stepsTotal

    let status: "completed" | "current" | "locked"
    if (stageIndex < currentStageIndex) {
      status = "completed"
    } else if (stageIndex === currentStageIndex) {
      status = "current"
    } else {
      status = "locked"
    }

    return {
      id: stageConfig.id,
      name: stageConfig.name,
      status,
      stepsCompleted,
      stepsTotal,
      completedStepIds,
    }
  })

  // Check if all steps in current stage are complete
  const currentStageData = stages.find((s) => s.id === currentStage)
  const canAdvance =
    !!currentStageData &&
    currentStageData.stepsCompleted === currentStageData.stepsTotal &&
    currentStage !== "grow"

  return {
    currentStage,
    stageIndex: currentStageIndex,
    stages,
    journeyPercentage: computeJourneyPercentage(totalCompleted, totalSteps),
    canAdvance,
  }
}

/**
 * Advance the user to the next Oases stage if all current steps are complete.
 * AI-3581: Now enforces tier-based stage ceiling — Free users cannot progress
 * past Validation, Pro users cannot progress past Launch.
 */
export async function advanceStage(
  userId: string,
  userTier: UserTier = UserTier.FREE
): Promise<{ success: boolean; newStage?: OasesStage; error?: string; tierGated?: boolean }> {
  const progress = await getUserOasesProgress(userId)

  if (progress.currentStage === "grow") {
    return { success: false, error: "Already at the final stage" }
  }

  if (!progress.canAdvance) {
    return {
      success: false,
      error: "Complete all steps in your current stage before advancing",
    }
  }

  const nextIndex = progress.stageIndex + 1
  if (nextIndex >= STAGE_ORDER.length) {
    return { success: false, error: "No next stage available" }
  }

  const newStage = STAGE_ORDER[nextIndex]

  // AI-3581: Tier-based stage ceiling enforcement
  if (isStageTierGated(newStage, userTier)) {
    const ceilingLabel = getTierCeilingLabel(userTier)
    return {
      success: false,
      tierGated: true,
      error: `Your current plan allows progress through ${ceilingLabel}. Upgrade to unlock ${newStage.charAt(0).toUpperCase() + newStage.slice(1)} and beyond.`,
    }
  }

  const supabase = await createClient()

  const { error } = await supabase
    .from("profiles")
    .update({ oases_stage: newStage })
    .eq("id", userId)

  if (error) {
    return { success: false, error: "Failed to update stage" }
  }

  return { success: true, newStage }
}
