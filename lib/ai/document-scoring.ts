/**
 * Document AI Scoring & A-F Grading
 *
 * AI-3580: Generic document scoring that works for any document type.
 * Returns an A-F letter grade, numeric score, and actionable feedback.
 *
 * Grade scale:
 *   A (90-100): Exceptional — investor/partner ready
 *   B (75-89):  Strong — needs minor polish
 *   C (60-74):  Adequate — has gaps that need addressing
 *   D (45-59):  Weak — significant issues to resolve
 *   F (0-44):   Needs major rework
 */

import { generateTrackedResponse, type ChatMessage } from "@/lib/ai/client"
import { logger } from "@/lib/logger"

export type DocumentGrade = "A" | "B" | "C" | "D" | "F"

export interface DocumentScore {
  grade: DocumentGrade
  numericScore: number
  summary: string
  strengths: string[]
  weaknesses: string[]
  suggestions: string[]
  dimensions: {
    name: string
    score: number
    feedback: string
  }[]
}

export type ScoringDocType =
  | "pitch_deck"
  | "financial"
  | "strategy"
  | "legal"
  | "business_plan"
  | "other"

/**
 * Convert a numeric score (0-100) to a letter grade.
 */
export function scoreToGrade(score: number): DocumentGrade {
  if (score >= 90) return "A"
  if (score >= 75) return "B"
  if (score >= 60) return "C"
  if (score >= 45) return "D"
  return "F"
}

/**
 * Get the color class for a grade badge.
 */
export function gradeColor(grade: DocumentGrade): string {
  switch (grade) {
    case "A": return "text-emerald-600 bg-emerald-50 border-emerald-200"
    case "B": return "text-blue-600 bg-blue-50 border-blue-200"
    case "C": return "text-amber-600 bg-amber-50 border-amber-200"
    case "D": return "text-orange-600 bg-orange-50 border-orange-200"
    case "F": return "text-red-600 bg-red-50 border-red-200"
  }
}

const SCORING_DIMENSIONS: Record<ScoringDocType, string[]> = {
  pitch_deck: [
    "Problem Clarity",
    "Market Opportunity",
    "Team & Founder Fit",
    "Traction & Validation",
    "Go-to-Market Strategy",
    "Narrative & Storytelling",
    "Investability",
  ],
  financial: [
    "Revenue Model Clarity",
    "Unit Economics",
    "Assumptions & Sensitivity",
    "Cash Flow Projections",
    "Funding Use",
  ],
  strategy: [
    "Market Understanding",
    "Competitive Positioning",
    "Execution Plan",
    "Risk Assessment",
    "Measurable Goals",
  ],
  legal: [
    "Completeness",
    "Clarity & Readability",
    "Risk Coverage",
    "Compliance",
    "Enforceability",
  ],
  business_plan: [
    "Executive Summary",
    "Market Analysis",
    "Business Model",
    "Operations Plan",
    "Financial Projections",
    "Risk Mitigation",
  ],
  other: [
    "Clarity & Structure",
    "Completeness",
    "Professionalism",
    "Actionability",
  ],
}

function buildScoringPrompt(docType: ScoringDocType, textContent: string): string {
  const dimensions = SCORING_DIMENSIONS[docType]
  const dimList = dimensions
    .map((d, i) => `${i + 1}. ${d} (1-10)`)
    .join("\n")

  return `You are Fred Cary, a seasoned venture investor reviewing a founder's document.

DOCUMENT TYPE: ${docType.replace(/_/g, " ").toUpperCase()}

Score this document across these dimensions:
${dimList}

SCORING GUIDELINES:
- Be honest and direct. A 7+ means genuinely strong.
- If information is missing, score it low and say what's missing.
- Provide specific, actionable feedback for each dimension.

After scoring all dimensions, compute an overall weighted score (0-100):
- Average all dimension scores, then multiply by 10.

Respond ONLY with valid JSON (no markdown code fences):
{
  "numericScore": <0-100>,
  "summary": "<2-3 sentence overall assessment>",
  "strengths": ["<strength 1>", "<strength 2>"],
  "weaknesses": ["<weakness 1>", "<weakness 2>"],
  "suggestions": ["<improvement 1>", "<improvement 2>"],
  "dimensions": [
    {"name": "<dimension>", "score": <1-10>, "feedback": "<specific feedback>"}
  ]
}

DOCUMENT CONTENT:
${textContent.slice(0, 15000)}`
}

/**
 * Score a document using AI and return an A-F grade with feedback.
 */
export async function scoreDocument(
  textContent: string,
  docType: ScoringDocType = "other",
  userId?: string
): Promise<DocumentScore> {
  const prompt = buildScoringPrompt(docType, textContent)

  try {
    const response = await generateTrackedResponse(
      [{ role: "user", content: prompt }],
      "You are an expert document evaluator. Score documents honestly and provide actionable feedback.",
      {
        userId,
        analyzer: "document-scoring",
      }
    )

    const text = response.content

    // Parse JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error("No JSON found in scoring response")
    }

    const result = JSON.parse(jsonMatch[0])
    const numericScore = Math.max(0, Math.min(100, Math.round(result.numericScore || 0)))

    return {
      grade: scoreToGrade(numericScore),
      numericScore,
      summary: result.summary || "Unable to generate summary",
      strengths: Array.isArray(result.strengths) ? result.strengths : [],
      weaknesses: Array.isArray(result.weaknesses) ? result.weaknesses : [],
      suggestions: Array.isArray(result.suggestions) ? result.suggestions : [],
      dimensions: Array.isArray(result.dimensions)
        ? result.dimensions.map((d: { name: string; score: number; feedback: string }) => ({
            name: d.name,
            score: Math.max(1, Math.min(10, Math.round(d.score || 1))),
            feedback: d.feedback || "",
          }))
        : [],
    }
  } catch (error) {
    logger.error("[Document Scoring] Failed to score document:", error)
    throw new Error("Failed to score document")
  }
}
