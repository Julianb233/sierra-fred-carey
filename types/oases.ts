/**
 * Oases Stage System — Type Definitions
 *
 * The 5-stage venture journey: Clarity → Validation → Build → Launch → Grow
 * Each stage has steps that must be completed before advancing.
 */

export type OasesStage = "clarity" | "validation" | "build" | "launch" | "grow"

export const OASES_STAGES: OasesStage[] = [
  "clarity",
  "validation",
  "build",
  "launch",
  "grow",
]

/**
 * Founder Archetype — categorizes where a founder is in their venture lifecycle.
 * Used to personalize FRED's coaching approach and map to Oases stages.
 *
 * - discovery: Pre-idea, exploring possibilities
 * - ideation: Has an idea, needs validation and refinement
 * - pre_seed: Building product/team, seeking initial funding
 * - seed: Has traction, actively fundraising
 */
export type FounderArchetype = "discovery" | "ideation" | "pre_seed" | "seed"

export const FOUNDER_ARCHETYPES: FounderArchetype[] = [
  "discovery",
  "ideation",
  "pre_seed",
  "seed",
]

export interface StageStep {
  id: string
  label: string
  description: string
  completionCheck:
    | "profile_complete"
    | "reality_lens_done"
    | "chat_sessions"
    | "document_created"
    | "pitch_deck_uploaded"
    | "investor_readiness_scored"
    | "strategy_complete"
    | "boardy_ready"
    | "manual"
  threshold?: number
}

export interface StageConfig {
  id: OasesStage
  name: string
  tagline: string
  description: string
  icon: string
  color: string
  steps: StageStep[]
  unlockedFeatures: string[]
  gatedRoutes: string[]
}

export interface OasesProgress {
  currentStage: OasesStage
  stageIndex: number
  stages: {
    id: OasesStage
    name: string
    status: "completed" | "current" | "locked"
    stepsCompleted: number
    stepsTotal: number
    completedStepIds: string[]
  }[]
  journeyPercentage: number
  canAdvance: boolean
}
