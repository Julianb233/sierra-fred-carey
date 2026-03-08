/**
 * RLHF-Lite Type Definitions
 *
 * Phase 76: Central types for the few-shot example store, prompt patch
 * generation, and approval workflow.
 */

export type ExampleType = 'positive' | 'negative'

export type PatchStatus = 'draft' | 'approved' | 'active' | 'testing' | 'rejected' | 'archived'

export type PatchSource = 'feedback' | 'ab_test' | 'manual'

// ============================================================================
// Few-Shot Examples
// ============================================================================

export interface FewShotExample {
  id: string
  signalId: string
  userId: string
  topic: string
  exampleType: ExampleType
  userMessage: string
  assistantResponse: string
  category: string | null
  comment: string | null
  userTier: 'free' | 'pro' | 'studio'
  weight: number
  metadata: Record<string, unknown>
  createdAt: string
  expiresAt: string | null
}

export type FewShotExampleInsert = Omit<FewShotExample, 'id' | 'createdAt'>

// ============================================================================
// Prompt Patches
// ============================================================================

export interface PromptPatch {
  id: string
  title: string
  content: string
  topic: string | null
  source: PatchSource
  sourceId: string | null
  sourceSignalIds: string[]
  status: PatchStatus
  version: number
  parentPatchId: string | null
  experimentId: string | null
  approvedBy: string | null
  approvedAt: string | null
  activatedAt: string | null
  deactivatedAt: string | null
  performanceMetrics: {
    baselineThumbsRatio?: number
    currentThumbsRatio?: number
    thumbsImprovement?: number
    trackingSince?: string
    trackingUntil?: string
  }
  metadata: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export type PromptPatchInsert = Omit<PromptPatch, 'id' | 'createdAt' | 'updatedAt'>

// ============================================================================
// Patch Generation (LLM structured output)
// ============================================================================

export interface PatchGenerationRequest {
  clusterTheme: string
  clusterDescription: string
  category: string | null
  severity: string
  signalComments: string[]         // user comments from the cluster's signals
  fewShotExamples: FewShotExample[] // relevant positive/negative examples for context
  existingPatches: PromptPatch[]    // active patches for same topic to avoid duplication
}

export interface PatchGenerationResult {
  title: string
  content: string                  // the supplemental prompt text
  topic: string | null
  rationale: string                // why this patch addresses the feedback pattern
  expectedImprovement: string      // what metric should improve and by how much
  confidence: 'low' | 'medium' | 'high'
}
