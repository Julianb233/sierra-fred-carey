/**
 * Prompt Patch Generator (Feedback Layer)
 *
 * Phase 76 Plan 02 (REQ-R2): Generates supplemental prompt patches from
 * feedback insights/clusters. Works alongside lib/rlhf/patch-generator.ts
 * which handles the core LLM generation. This module provides the
 * insight-driven entry point and manual patch creation for admins.
 *
 * All generated patches start with status 'pending_review' — never auto-deployed.
 */

import { generateText } from "ai"
import { getModel } from "@/lib/ai/providers"
import { getModelForTier } from "@/lib/ai/tier-routing"
import { insertPromptPatch } from "@/lib/db/prompt-patches"
import type {
  FeedbackInsight,
  PromptPatch,
  PromptPatchInsert,
} from "@/lib/feedback/types"
import { logger } from "@/lib/logger"

// ============================================================================
// Generate patch from a feedback insight
// ============================================================================

/**
 * Generate a prompt patch from a feedback insight (cluster).
 *
 * Takes the insight's theme, description, category, and severity,
 * then uses an LLM to draft a supplemental prompt instruction.
 *
 * The generated patch is stored with status 'pending_review' awaiting admin approval.
 */
export async function generatePatchFromInsight(
  insight: FeedbackInsight
): Promise<{ patchId: string; content: string } | null> {
  try {
    const topic = insight.category || "general"

    const prompt = `You are helping improve an AI startup mentor called FRED (on joinsahara.com).

FRED has received recurring negative feedback about this topic:
- Theme: ${insight.title}
- Description: ${insight.description || "No description"}
- Category: ${insight.category || "mixed"}
- Signal count: ${insight.signal_count} complaints
- Severity: ${insight.severity}

Write a SHORT supplemental prompt instruction (3-5 sentences max) that:
1. Addresses the specific complaint pattern
2. Gives FRED clear guidance on how to handle this topic better
3. Does NOT contradict FRED's core identity (blunt truth-teller, startup mentor, reframe-before-prescribe)
4. Uses imperative voice ("When X, do Y" or "For X topics, always Z")

Return ONLY the instruction text, no explanations or metadata.`

    const providerKey = getModelForTier("pro", "chat")
    const model = getModel(providerKey)

    const result = await generateText({
      model,
      prompt,
      maxTokens: 300,
      temperature: 0.3,
    })

    const patchContent = result.text.trim()

    if (!patchContent || patchContent.length < 20) {
      logger.warn("[patch-generator] Generated patch too short, skipping")
      return null
    }

    // Store as pending_review patch
    const patch = await insertPromptPatch({
      topic,
      patch_type: "supplemental_instruction",
      content: patchContent,
      status: "pending_review",
      source_insight_id: insight.id,
      source_signal_ids: insight.signal_ids,
      generated_by: "system",
      approved_by: null,
      approved_at: null,
      experiment_id: null,
      thumbs_up_before: null,
      thumbs_up_after: null,
      tracking_started_at: null,
      tracking_ends_at: null,
      metadata: {
        title: `[Auto] ${insight.title}`,
        generated_at: new Date().toISOString(),
        insight_severity: insight.severity,
        signal_count: insight.signal_count,
      },
    })

    logger.info("[patch-generator] Generated patch from insight", {
      patchId: patch.id,
      insightId: insight.id,
      topic,
    })

    return { patchId: patch.id, content: patchContent }
  } catch (err) {
    logger.error("[patch-generator] Failed to generate patch from insight", { error: err })
    return null
  }
}

// ============================================================================
// Manual patch creation (admin)
// ============================================================================

/**
 * Generate a prompt patch from raw text (manual creation via admin).
 * Stored immediately with status 'draft'.
 */
export async function generatePromptPatch(params: {
  title: string
  content: string
  topic?: string
  createdBy: string
}): Promise<string> {
  const patch = await insertPromptPatch({
    topic: params.topic || "general",
    patch_type: "supplemental_instruction",
    content: params.content,
    status: "draft",
    source_insight_id: null,
    source_signal_ids: [],
    generated_by: params.createdBy,
    approved_by: null,
    approved_at: null,
    experiment_id: null,
    thumbs_up_before: null,
    thumbs_up_after: null,
    tracking_started_at: null,
    tracking_ends_at: null,
    metadata: {
      title: params.title,
      created_at: new Date().toISOString(),
      source: "manual",
    },
  })

  logger.info("[patch-generator] Manual patch created", {
    patchId: patch.id,
    title: params.title,
  })

  return patch.id
}
