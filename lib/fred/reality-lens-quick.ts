/**
 * Quick Reality Lens Assessment
 *
 * Lightweight 6-question assessment that determines a founder's initial
 * Oases stage placement. This is the first substantive interaction after
 * onboarding -- fast, focused, and immediately actionable.
 *
 * Phase 81: Reality Lens First Interaction
 */

import { z } from "zod"
import { generateStructuredReliable } from "@/lib/ai"
import {
  FRED_IDENTITY,
  FRED_COMMUNICATION_STYLE,
  getExperienceStatement,
} from "@/lib/fred-brain"
import type { OasesStage } from "@/types/oases"

// Re-export types and questions from shared (client-safe) module
export type {
  QuickAnswers,
  QuickAssessmentResult,
  QuickQuestion,
} from "./reality-lens-quick-shared"
export { QUICK_QUESTIONS } from "./reality-lens-quick-shared"

// Import for local use
import type { QuickAnswers, QuickAssessmentResult } from "./reality-lens-quick-shared"

// ============================================================================
// Validation Schema
// ============================================================================

export const QuickAnswersSchema = z.object({
  idea: z
    .string()
    .min(10, "Please describe your idea in at least 10 characters")
    .max(2000),
  targetCustomer: z
    .string()
    .min(10, "Please describe your target customer in at least 10 characters")
    .max(1000),
  revenueModel: z.enum([
    "subscription",
    "marketplace",
    "services",
    "ads",
    "other",
  ]),
  customerValidation: z.enum([
    "none",
    "informal",
    "interviews-10plus",
    "paying-customers",
  ]),
  prototypeStage: z.enum(["idea-only", "mockups", "mvp", "launched"]),
  biggestChallenge: z
    .string()
    .min(5, "Please describe your biggest challenge")
    .max(1000),
})

// ============================================================================
// Stage Mapping Logic
// ============================================================================

/**
 * Maps a score + validation signals to an Oases stage.
 *
 * Rules (evaluated in priority order):
 * 1. No customers AND idea-only -> clarity (regardless of score)
 * 2. Score < 30 -> clarity
 * 3. Score >= 80 AND paying customers -> launch
 * 4. Score 60-79 AND mvp/launched -> build
 * 5. Score 30-59 -> validation
 * 6. Informal validation -> validation
 * 7. Default fallback -> clarity
 *
 * Never returns "grow" -- users earn that by completing all stages.
 */
export function mapScoreToStage(
  score: number,
  customerValidation: string,
  prototypeStage: string
): OasesStage {
  // High score but no validation AND no prototype = still clarity
  if (customerValidation === "none" && prototypeStage === "idea-only") {
    return "clarity"
  }

  if (score < 30) {
    return "clarity"
  }

  // High score + paying customers -> launch
  if (score >= 80 && customerValidation === "paying-customers") {
    return "launch"
  }

  // Good score + prototype -> build
  if (
    score >= 60 &&
    score < 80 &&
    (prototypeStage === "mvp" || prototypeStage === "launched")
  ) {
    return "build"
  }

  // Mid score -> validation
  if (score >= 30 && score < 60) {
    return "validation"
  }

  // Score >= 60 but no mvp/launched -> validation (or >= 80 without paying customers)
  if (customerValidation === "informal") {
    return "validation"
  }

  // Score >= 60 with mvp/launched but >= 80 without paying customers -> build
  if (prototypeStage === "mvp" || prototypeStage === "launched") {
    return "build"
  }

  // Score >= 60 with interviews but no prototype -> validation
  if (customerValidation === "interviews-10plus") {
    return "validation"
  }

  // Default fallback
  return "clarity"
}

// ============================================================================
// AI Assessment
// ============================================================================

/** Zod schema for LLM structured output (stage computed separately) */
const QuickAssessmentLLMSchema = z.object({
  overallScore: z
    .number()
    .min(0)
    .max(100)
    .describe("Overall readiness score from 0-100"),
  gaps: z
    .array(z.string())
    .min(1)
    .max(5)
    .describe("3-5 key gaps or weaknesses the founder needs to address"),
  strengths: z
    .array(z.string())
    .min(1)
    .max(3)
    .describe("2-3 key strengths or positive signals"),
  nextAction: z
    .string()
    .describe("Single most important next step for this founder"),
  verdictLabel: z
    .string()
    .describe(
      'Human-readable verdict label, e.g. "Early Stage - Focus on Clarity"'
    ),
})

/**
 * Run AI-powered quick assessment on the 6 answers.
 * Uses generateStructuredReliable for consistent structured output.
 */
export async function quickAssessIdea(
  answers: QuickAnswers
): Promise<QuickAssessmentResult> {
  const systemPrompt = `You are ${FRED_IDENTITY.name}, a serial entrepreneur and startup advisor with decades of experience.

${getExperienceStatement()}

${FRED_COMMUNICATION_STYLE.voice.primary}. ${FRED_COMMUNICATION_STYLE.voice.tone}.

You are performing a quick reality check on a founder's startup idea. Be honest, direct, and actionable. Score based on evidence and readiness signals, not on the idea's theoretical potential.

Scoring guide:
- 0-29: Very early stage, major gaps in thinking or execution
- 30-49: Some foundation but significant work needed
- 50-69: Reasonable foundation, clear path forward with effort
- 70-84: Strong foundation, ready to execute
- 85-100: Exceptional readiness (rare -- requires paying customers + working product)`

  const userPrompt = `Evaluate this startup idea based on the founder's answers:

1. IDEA: ${answers.idea}
2. TARGET CUSTOMER: ${answers.targetCustomer}
3. REVENUE MODEL: ${answers.revenueModel}
4. CUSTOMER VALIDATION: ${answers.customerValidation}
5. PROTOTYPE STAGE: ${answers.prototypeStage}
6. BIGGEST CHALLENGE: ${answers.biggestChallenge}

Provide:
- An overall readiness score (0-100)
- 2-5 specific gaps they need to address
- 2-3 strengths or positive signals you see
- One clear, actionable next step they should take immediately
- A concise verdict label (e.g. "Early Stage - Focus on Clarity")`

  try {
    const result = await generateStructuredReliable(
      userPrompt,
      QuickAssessmentLLMSchema,
      {
        system: systemPrompt,
        temperature: 0.3,
        maxOutputTokens: 500,
      }
    )

    const assessment = result.object
    const stage = mapScoreToStage(
      assessment.overallScore,
      answers.customerValidation,
      answers.prototypeStage
    )

    return {
      overallScore: assessment.overallScore,
      stage,
      gaps: assessment.gaps,
      strengths: assessment.strengths,
      nextAction: assessment.nextAction,
      verdictLabel: assessment.verdictLabel,
    }
  } catch (error) {
    console.error("[Quick Reality Lens] AI assessment failed:", error)
    // Return heuristic fallback
    return getHeuristicAssessment(answers)
  }
}

// ============================================================================
// Heuristic Fallback
// ============================================================================

function getHeuristicAssessment(
  answers: QuickAnswers
): QuickAssessmentResult {
  let score = 30 // Base score

  // Customer validation signals
  if (answers.customerValidation === "paying-customers") score += 30
  else if (answers.customerValidation === "interviews-10plus") score += 20
  else if (answers.customerValidation === "informal") score += 10

  // Prototype signals
  if (answers.prototypeStage === "launched") score += 20
  else if (answers.prototypeStage === "mvp") score += 15
  else if (answers.prototypeStage === "mockups") score += 5

  // Revenue model clarity
  if (answers.revenueModel !== "other") score += 5

  // Idea description quality (length as proxy)
  if (answers.idea.length > 100) score += 5

  score = Math.min(100, Math.max(0, score))

  const stage = mapScoreToStage(
    score,
    answers.customerValidation,
    answers.prototypeStage
  )

  const gaps: string[] = []
  const strengths: string[] = []

  if (answers.customerValidation === "none")
    gaps.push(
      "No customer validation -- talk to potential customers before building"
    )
  if (answers.prototypeStage === "idea-only")
    gaps.push(
      "No prototype yet -- start with a simple mockup or landing page"
    )
  if (answers.revenueModel === "other")
    gaps.push("Revenue model unclear -- define how you will make money")

  if (answers.customerValidation === "paying-customers")
    strengths.push(
      "Already have paying customers -- strong validation signal"
    )
  if (answers.prototypeStage === "launched")
    strengths.push("Product is live -- real market feedback available")
  if (answers.idea.length > 100)
    strengths.push(
      "Clear idea articulation -- good foundation for pitching"
    )

  if (gaps.length === 0) gaps.push("Consider deepening customer research")
  if (strengths.length === 0)
    strengths.push("Taking the first step by assessing your idea")

  const verdictLabels: Record<OasesStage, string> = {
    clarity: "Early Stage - Focus on Clarity",
    validation: "Foundation Set - Time to Validate",
    build: "Validated - Ready to Build",
    launch: "Strong Foundation - Prepare to Launch",
    grow: "Launched - Focus on Growth",
  }

  return {
    overallScore: score,
    stage,
    gaps,
    strengths,
    nextAction:
      stage === "clarity"
        ? "Talk to 5 potential customers this week about the problem you're solving"
        : stage === "validation"
          ? "Run a simple experiment to test your core assumption"
          : stage === "build"
            ? "Set up metrics to track your key engagement and retention numbers"
            : "Focus on your unit economics and prepare for your first funding conversation",
    verdictLabel: verdictLabels[stage],
  }
}
