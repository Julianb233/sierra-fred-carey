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
