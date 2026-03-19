/**
 * Prompt Patch Generator
 *
 * Phase 76 (REQ-R2): LLM-powered prompt patch generation from feedback clusters.
 * When pattern detection identifies a recurring complaint, this module generates
 * supplemental prompt instructions for that coaching topic.
 *
 * All generated patches start with status 'draft' — never auto-deployed.
 */

import { generateObject } from "ai"
import { z } from "zod"
import { getModel } from "@/lib/ai/providers"
import { getModelForTier } from "@/lib/ai/tier-routing"
import { sql } from "@/lib/db/supabase-sql"
import type {
  PromptPatch,
  PatchGenerationRequest,
  PatchGenerationResult,
} from "@/lib/rlhf/types"
import { getTopFewShotExamples } from "@/lib/rlhf/few-shot-store"
import { logger } from "@/lib/logger"

// ============================================================================
// LLM Schema for Structured Output
// ============================================================================

const patchSchema = z.object({
  title: z.string().describe(
    "Short descriptive title for the patch, e.g. 'Reduce generic responses for fundraising questions'"
  ),
  content: z.string().describe(
    "The supplemental prompt instruction text. 2-5 sentences. Specific and actionable. " +
    "This will be appended after the core system prompt."
  ),
  topic: z.string().nullable().describe(
    "Coaching topic this targets (fundraising, strategy, operations, etc.), or null if general"
  ),
  rationale: z.string().describe(
    "Why this patch addresses the feedback pattern"
  ),
  expectedImprovement: z.string().describe(
    "What metric should improve and estimated magnitude"
  ),
  confidence: z.enum(["low", "medium", "high"]).describe(
    "Confidence that this patch will improve the metric"
  ),
})

// ============================================================================
// DB Row Mapping
// ============================================================================

function mapPatchRow(row: Record<string, unknown>): PromptPatch {
  return {
    id: String(row.id),
    title: String(row.title),
    content: String(row.content),
    topic: row.topic ? String(row.topic) : null,
    source: String(row.source) as PromptPatch["source"],
    sourceId: row.source_id ? String(row.source_id) : null,
    sourceSignalIds: (row.source_signal_ids as string[]) || [],
    status: String(row.status) as PromptPatch["status"],
    version: Number(row.version),
    parentPatchId: row.parent_patch_id ? String(row.parent_patch_id) : null,
    experimentId: row.experiment_id ? String(row.experiment_id) : null,
    approvedBy: row.approved_by ? String(row.approved_by) : null,
    approvedAt: row.approved_at ? String(row.approved_at) : null,
    activatedAt: row.activated_at ? String(row.activated_at) : null,
    deactivatedAt: row.deactivated_at ? String(row.deactivated_at) : null,
    performanceMetrics: (row.performance_metrics as PromptPatch["performanceMetrics"]) || {},
    metadata: (row.metadata as Record<string, unknown>) || {},
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  }
}

// ============================================================================
// Patch Generation
// ============================================================================

/**
 * Generate a prompt patch from a feedback cluster using LLM structured output.
 */
export async function generatePromptPatch(
  request: PatchGenerationRequest
): Promise<PatchGenerationResult> {
  // Build context for the LLM
  const signalCommentsList = request.signalComments
    .slice(0, 20)
    .map((c, i) => `${i + 1}. "${c.slice(0, 200)}"`)
    .join("\n")

  const posExamples = request.fewShotExamples
    .filter((e) => e.exampleType === "positive")
    .slice(0, 5)
    .map(
      (e) =>
        `[GOOD] User: "${e.userMessage.slice(0, 150)}" → FRED: "${e.assistantResponse.slice(0, 200)}"`
    )
    .join("\n")

  const negExamples = request.fewShotExamples
    .filter((e) => e.exampleType === "negative")
    .slice(0, 3)
    .map(
      (e) =>
        `[BAD] User: "${e.userMessage.slice(0, 150)}" → FRED: "${e.assistantResponse.slice(0, 200)}" (Feedback: ${e.comment || e.category || "thumbs down"})`
    )
    .join("\n")

  const existingPatchesList = request.existingPatches
    .map((p) => `- "${p.title}": ${p.content.slice(0, 100)}...`)
    .join("\n")

  const prompt = `You are a prompt engineer improving an AI startup mentor called FRED.

A recurring feedback pattern has been detected:

**Theme:** ${request.clusterTheme}
**Description:** ${request.clusterDescription}
**Category:** ${request.category || "mixed"}
**Severity:** ${request.severity}

**User complaints (${request.signalComments.length} signals):**
${signalCommentsList || "No specific comments available."}

${posExamples ? `**Examples of good FRED responses on this topic:**\n${posExamples}\n` : ""}
${negExamples ? `**Examples of bad FRED responses (to avoid):**\n${negExamples}\n` : ""}
${existingPatchesList ? `**Already active patches for this topic (avoid duplication):**\n${existingPatchesList}\n` : ""}

Generate a supplemental prompt instruction that will be APPENDED to FRED's system prompt.
The patch should:
1. Be specific and actionable (not vague platitudes)
2. Address the core complaint pattern
3. Include concrete behavioral instructions (do X, avoid Y)
4. Be 2-5 sentences long
5. Not duplicate any existing patches listed above

The instruction will be appended after FRED's core identity prompt. FRED is a startup coach with 40+ years experience who gives direct, evidence-based advice.`

  const providerKey = getModelForTier("free", "structured")
  const model = getModel(providerKey)

  const result = await generateObject({
    model,
    schema: patchSchema,
    prompt,
  })

  logger.log(
    `[patch-generator] Generated patch "${result.object.title}" (confidence: ${result.object.confidence})`
  )

  return result.object
}

/**
 * Orchestrator: generate a patch from a feedback cluster and save to DB.
 * Gets few-shot context, checks existing patches, generates, and saves as draft.
 */
export async function generatePatchFromCluster(params: {
  clusterTheme: string
  clusterDescription: string
  category: string | null
  severity: string
  signalIds: string[]
  signalComments: string[]
}): Promise<PromptPatch> {
  // Determine topic from category (best-effort mapping)
  const topic = params.category || "general"

  // Get few-shot examples for context
  const fewShotExamples = await getTopFewShotExamples(topic)
  const allExamples = [...fewShotExamples.positive, ...fewShotExamples.negative]

  // Get existing active patches to avoid duplication
  const existingPatches = await getActivePatches(topic)

  // Generate the patch via LLM
  const patchResult = await generatePromptPatch({
    clusterTheme: params.clusterTheme,
    clusterDescription: params.clusterDescription,
    category: params.category,
    severity: params.severity,
    signalComments: params.signalComments,
    fewShotExamples: allExamples,
    existingPatches,
  })

  // Save to DB with status 'draft' — never auto-deployed
  return savePatchToDB({
    title: patchResult.title,
    content: patchResult.content,
    topic: patchResult.topic,
    source: "feedback",
    sourceId: params.clusterTheme, // use theme as source identifier
    sourceSignalIds: params.signalIds,
    status: "draft",
    version: 1,
    parentPatchId: null,
    experimentId: null,
    approvedBy: null,
    approvedAt: null,
    activatedAt: null,
    deactivatedAt: null,
    performanceMetrics: {},
    metadata: {
      rationale: patchResult.rationale,
      expectedImprovement: patchResult.expectedImprovement,
      confidence: patchResult.confidence,
      severity: params.severity,
    },
  })
}

// ============================================================================
// DB Operations
// ============================================================================

/**
 * Save a prompt patch to the database.
 */
export async function savePatchToDB(
  patch: Omit<PromptPatch, "id" | "createdAt" | "updatedAt">
): Promise<PromptPatch> {
  const rows = await sql`
    INSERT INTO prompt_patches (
      title, content, topic, source, source_id,
      source_signal_ids, status, version, parent_patch_id,
      experiment_id, approved_by, approved_at,
      activated_at, deactivated_at, performance_metrics, metadata
    ) VALUES (
      ${patch.title}, ${patch.content}, ${patch.topic}, ${patch.source}, ${patch.sourceId},
      ${patch.sourceSignalIds as unknown as string}, ${patch.status}, ${patch.version}, ${patch.parentPatchId},
      ${patch.experimentId}, ${patch.approvedBy}, ${patch.approvedAt},
      ${patch.activatedAt}, ${patch.deactivatedAt}, ${JSON.stringify(patch.performanceMetrics)}, ${JSON.stringify(patch.metadata)}
    )
    RETURNING *
  `

  logger.log(`[patch-generator] Saved patch "${patch.title}" with status=${patch.status}`)
  return mapPatchRow(rows[0] as Record<string, unknown>)
}

/**
 * Get active patches, optionally filtered by topic.
 */
export async function getActivePatches(topic?: string): Promise<PromptPatch[]> {
  let rows: Record<string, unknown>[]

  if (topic) {
    rows = (await sql`
      SELECT * FROM prompt_patches
      WHERE status = 'active'
        AND (topic = ${topic} OR topic IS NULL)
      ORDER BY created_at DESC
    `) as Record<string, unknown>[]
  } else {
    rows = (await sql`
      SELECT * FROM prompt_patches
      WHERE status = 'active'
      ORDER BY created_at DESC
    `) as Record<string, unknown>[]
  }

  return rows.map(mapPatchRow)
}
