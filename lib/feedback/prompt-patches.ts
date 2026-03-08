/**
 * Prompt Patches — Few-Shot Extraction + Patch Generation
 * Phase 76: RLHF-Lite (REQ-R1, REQ-R2)
 *
 * Extracts few-shot examples from feedback signals and generates
 * supplemental prompt patches when clustering finds recurring complaints.
 */

import { generateObject } from "ai"
import { z } from "zod"
import { getModel } from "@/lib/ai/providers"
import { getModelForTier } from "@/lib/ai/tier-routing"
import { logger } from "@/lib/logger"
import type {
  FeedbackSignal,
  FeedbackCluster,
  PatchGenerationResult,
  PromptPatchInsert,
} from "@/lib/feedback/types"

// ============================================================================
// Constants
// ============================================================================

const MIN_CLUSTER_SIGNALS_FOR_PATCH = 5
const MAX_FEW_SHOT_CONTENT_LENGTH = 1000

// ============================================================================
// Few-Shot Example Extraction (REQ-R1)
// ============================================================================

const fewShotSchema = z.object({
  topic: z.string().describe("Coaching topic, e.g. 'fundraising', 'positioning', 'unit_economics'"),
  quality: z.enum(["low", "medium", "high"]).describe("Quality assessment of the example"),
  summary: z.string().describe("1-sentence summary of what makes this a good/bad example"),
  shouldStore: z.boolean().describe("Whether this example is worth storing (skip trivial thanks/greetings)"),
})

/**
 * Extract a few-shot example from a feedback signal.
 * Uses LLM to determine topic, quality, and whether to store.
 *
 * @param userMessage - The user's original message
 * @param fredResponse - FRED's response that received feedback
 * @param rating - 1 for thumbs up, -1 for thumbs down
 * @param comment - Optional user comment about the response
 */
export async function extractFewShotExample(
  userMessage: string,
  fredResponse: string,
  rating: 1 | -1,
  comment?: string | null
): Promise<{
  topic: string
  quality: string
  summary: string
  shouldStore: boolean
  content: string
}> {
  const ratingLabel = rating === 1 ? "positive (thumbs up)" : "negative (thumbs down)"
  const commentNote = comment ? `\nUser comment: "${comment}"` : ""

  try {
    const providerKey = getModelForTier("free", "structured")
    const model = getModel(providerKey)

    const result = await generateObject({
      model,
      schema: fewShotSchema,
      temperature: 0.2,
      maxOutputTokens: 256,
      prompt: `Analyze this ${ratingLabel} feedback on a startup coaching AI response.

User message: "${userMessage.slice(0, 500)}"
AI response: "${fredResponse.slice(0, 500)}"${commentNote}

Determine:
1. What coaching topic this relates to (use lowercase_snake_case)
2. Quality of the example for training (low/medium/high)
3. Whether to store it (skip trivial greetings, "thanks", or unclear context)
4. A 1-sentence summary of what makes this response ${rating === 1 ? "good" : "bad"}`,
    })

    // Build the few-shot content
    const content = buildFewShotContent(userMessage, fredResponse, rating, result.object.summary)

    return {
      topic: result.object.topic,
      quality: result.object.quality,
      summary: result.object.summary,
      shouldStore: result.object.shouldStore,
      content,
    }
  } catch (error) {
    logger.error("[prompt-patches] Few-shot extraction failed", { error })
    // Fallback: store with generic topic
    return {
      topic: "general",
      quality: "low",
      summary: "Auto-extracted from feedback",
      shouldStore: false,
      content: "",
    }
  }
}

function buildFewShotContent(
  userMessage: string,
  fredResponse: string,
  rating: 1 | -1,
  summary: string
): string {
  const trimmedUser = userMessage.slice(0, MAX_FEW_SHOT_CONTENT_LENGTH / 2)
  const trimmedResponse = fredResponse.slice(0, MAX_FEW_SHOT_CONTENT_LENGTH / 2)
  const label = rating === 1 ? "GOOD EXAMPLE" : "AVOID THIS PATTERN"

  return `[${label}] ${summary}
User: ${trimmedUser}
Response: ${trimmedResponse}`
}

/**
 * Process a feedback signal and create a few-shot example patch if worthy.
 * Returns the insert object or null if not worth storing.
 */
export function buildFewShotPatchInsert(
  signal: FeedbackSignal,
  extraction: {
    topic: string
    quality: string
    shouldStore: boolean
    content: string
  }
): PromptPatchInsert | null {
  if (!extraction.shouldStore || !extraction.content) {
    return null
  }

  return {
    topic: extraction.topic,
    patch_type: signal.rating === 1 ? "few_shot_positive" : "few_shot_negative",
    content: extraction.content,
    status: "draft",
    source_insight_id: null,
    source_signal_ids: [signal.id],
    generated_by: "system",
    approved_by: null,
    approved_at: null,
    experiment_id: null,
    thumbs_up_before: null,
    thumbs_up_after: null,
    tracking_started_at: null,
    tracking_ends_at: null,
    metadata: {
      quality: extraction.quality,
      extracted_at: new Date().toISOString(),
    },
  }
}

// ============================================================================
// Prompt Patch Generation (REQ-R2)
// ============================================================================

const patchGenerationSchema = z.object({
  patches: z.array(z.object({
    title: z.string().describe("Short title for the patch, e.g. 'Improve fundraising response depth'"),
    content: z.string().describe("The supplemental prompt instruction to add to FRED's system prompt"),
    topic: z.string().describe("Coaching topic in lowercase_snake_case"),
    rationale: z.string().describe("Why this patch addresses the recurring complaint"),
    confidence: z.enum(["low", "medium", "high"]).describe("Confidence the patch will help"),
  })),
})

/**
 * Generate supplemental prompt patches from a feedback cluster.
 * Called when clustering pipeline finds a recurring complaint theme.
 *
 * @param cluster - The feedback cluster with theme, description, and signal data
 * @param sampleComments - Sample user comments from the cluster signals
 * @returns Array of generated patch suggestions
 */
export async function generatePromptPatches(
  cluster: FeedbackCluster,
  sampleComments: string[]
): Promise<PatchGenerationResult[]> {
  if (cluster.signalCount < MIN_CLUSTER_SIGNALS_FOR_PATCH) {
    logger.info("[prompt-patches] Cluster too small for patch generation", {
      theme: cluster.theme,
      signalCount: cluster.signalCount,
      minimum: MIN_CLUSTER_SIGNALS_FOR_PATCH,
    })
    return []
  }

  try {
    const providerKey = getModelForTier("pro", "structured")
    const model = getModel(providerKey)

    const commentsBlock = sampleComments
      .slice(0, 10)
      .map((c, i) => `${i + 1}. "${c}"`)
      .join("\n")

    const result = await generateObject({
      model,
      schema: patchGenerationSchema,
      temperature: 0.3,
      maxOutputTokens: 1024,
      prompt: `You are improving a startup coaching AI called FRED. A recurring feedback pattern has been detected:

Theme: "${cluster.theme}"
Description: ${cluster.description}
Category: ${cluster.category || "uncategorized"}
Severity: ${cluster.severity}
Signal count: ${cluster.signalCount} (weighted: ${cluster.weightedCount})

Sample user comments:
${commentsBlock || "(no comments provided)"}

Generate 1-2 supplemental prompt instructions that would address this pattern. Each instruction should:
1. Be specific and actionable (not vague guidance)
2. Focus on FRED's response behavior, not the user's behavior
3. Preserve FRED's core identity (direct, honest mentor — not a people-pleaser)
4. Address the root cause of the complaint, not the symptom
5. Be concise (2-4 sentences max)

IMPORTANT: Do NOT generate instructions that would make FRED less honest or less direct. If the complaint is about FRED being "too harsh" on a valid point, that's coaching discomfort (working as designed) — acknowledge it but don't soften.`,
    })

    return result.object.patches

  } catch (error) {
    logger.error("[prompt-patches] Patch generation failed", {
      theme: cluster.theme,
      error,
    })
    return []
  }
}

/**
 * Build insert objects for generated patches.
 */
export function buildPatchInserts(
  patches: PatchGenerationResult[],
  insightId: string,
  signalIds: string[]
): PromptPatchInsert[] {
  return patches.map((patch) => ({
    topic: patch.topic,
    patch_type: "supplemental_instruction" as const,
    content: patch.content,
    status: "pending_review" as const,
    source_insight_id: insightId,
    source_signal_ids: signalIds,
    generated_by: "system",
    approved_by: null,
    approved_at: null,
    experiment_id: null,
    thumbs_up_before: null,
    thumbs_up_after: null,
    tracking_started_at: null,
    tracking_ends_at: null,
    metadata: {
      title: patch.title,
      rationale: patch.rationale,
      confidence: patch.confidence,
      generated_at: new Date().toISOString(),
    },
  }))
}
