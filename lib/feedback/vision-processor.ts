/**
 * Vision Processor for Feedback Media
 *
 * AI-4115: Analyzes images/screenshots attached to feedback signals
 * using vision-capable LLMs (Gemini or OpenAI). Extracts descriptions,
 * UI element identification, and issue detection from visual feedback.
 */

import { generateObject } from "ai"
import { z } from "zod"
import { getModel } from "@/lib/ai/providers"
import { getModelForTier } from "@/lib/ai/tier-routing"
import type { VisionAnalysis, MediaType } from "@/lib/feedback/types"

// ============================================================================
// Schema
// ============================================================================

const visionAnalysisSchema = z.object({
  descriptions: z
    .array(z.string())
    .describe("One description per image, summarizing what it shows"),
  ui_elements: z
    .array(z.string())
    .optional()
    .describe("UI elements visible (buttons, forms, modals, etc.)"),
  issues_detected: z
    .array(z.string())
    .optional()
    .describe("Visual issues: layout bugs, broken elements, confusing UX patterns"),
  sentiment: z
    .enum(["positive", "neutral", "negative"])
    .optional()
    .describe("Overall sentiment of the visual feedback"),
  summary: z
    .string()
    .describe("One-paragraph summary of what the images communicate as feedback"),
})

// ============================================================================
// Core Analysis
// ============================================================================

/**
 * Analyze media attachments from a feedback signal using a vision-capable LLM.
 *
 * @param mediaUrls - Array of image/media URLs to analyze
 * @param mediaTypes - Parallel array of media types
 * @param context - Optional text context (user comment, signal category)
 * @returns VisionAnalysis result or null if analysis fails
 */
export async function analyzeMediaFeedback(
  mediaUrls: string[],
  mediaTypes: MediaType[],
  context?: { comment?: string | null; category?: string | null }
): Promise<VisionAnalysis | null> {
  if (!mediaUrls.length) return null

  // Filter to image types only (video/audio not supported by vision API yet)
  const imageIndices = mediaTypes
    .map((type, i) => (type === "image" || type === "screenshot" ? i : -1))
    .filter((i) => i !== -1)

  const imageUrls = imageIndices.map((i) => mediaUrls[i])

  if (!imageUrls.length) return null

  try {
    const providerKey = getModelForTier("pro", "structured")
    const model = getModel(providerKey)

    const contextParts: string[] = []
    if (context?.comment) {
      contextParts.push(`User comment: "${context.comment}"`)
    }
    if (context?.category) {
      contextParts.push(`Feedback category: ${context.category}`)
    }

    const prompt = `Analyze these ${imageUrls.length} image(s) submitted as feedback for a startup coaching AI platform called Sahara.
${contextParts.length > 0 ? "\nContext:\n" + contextParts.join("\n") : ""}

For each image, describe what it shows. Identify any UI elements visible.
Detect any visual issues (layout bugs, broken elements, confusing UX).
Assess the overall sentiment of this visual feedback.
Summarize what the user is trying to communicate through these images.`

    // Build message content with image URLs
    const imageContent = imageUrls.map((url) => ({
      type: "image" as const,
      image: new URL(url),
    }))

    const result = await generateObject({
      model,
      schema: visionAnalysisSchema,
      messages: [
        {
          role: "user",
          content: [
            ...imageContent,
            { type: "text", text: prompt },
          ],
        },
      ],
    })

    return {
      ...result.object,
      model_used: providerKey,
      analyzed_at: new Date().toISOString(),
    }
  } catch (err) {
    console.error("[vision-processor] Analysis failed:", err)
    return null
  }
}

/**
 * Generate a text summary from vision analysis for use in clustering.
 * Combines descriptions, issues, and summary into a single string
 * that can be appended to the signal's comment for clustering purposes.
 */
export function visionAnalysisToText(analysis: VisionAnalysis): string {
  const parts: string[] = []

  if (analysis.summary) {
    parts.push(analysis.summary)
  }

  if (analysis.issues_detected?.length) {
    parts.push(`Issues: ${analysis.issues_detected.join("; ")}`)
  }

  if (analysis.ui_elements?.length) {
    parts.push(`UI elements: ${analysis.ui_elements.join(", ")}`)
  }

  return parts.join(" | ")
}
