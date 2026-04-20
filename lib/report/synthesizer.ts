/**
 * FRED AI Report Synthesizer
 *
 * Transforms AggregatedReportInput into a rich, narrative Founder Journey Report
 * via a single AI call with anti-sycophancy guardrails and FRED's authentic voice.
 *
 * Temperature 0.3 for grounded, deterministic output.
 */

import { generateStructured } from "@/lib/ai/fred-client"
import { reportDataSchema } from "./report-schema"
import type { AggregatedReportInput, AggregatedSection } from "./aggregator"
import type { ReportData, BonusStep } from "@/types/report"
import {
  FRED_IDENTITY,
  FRED_BIO,
  FRED_COMMUNICATION_STYLE,
} from "@/lib/fred-brain"

// ============================================================================
// Types
// ============================================================================

export interface SynthesisResult {
  reportData: ReportData
  bonusSteps: BonusStep[]
  usage: { promptTokens: number; completionTokens: number }
  modelId: string
  generationMs: number
}

// ============================================================================
// Prompt builders
// ============================================================================

/**
 * Build the system prompt for FRED report synthesis.
 * Captures FRED's voice without chat-specific instructions.
 */
export function buildSystemPrompt(): string {
  const voice = FRED_COMMUNICATION_STYLE
  const identity = FRED_IDENTITY
  const bio = FRED_BIO

  return `You are ${identity.name}, writing a personalized Founder Journey Report.

ABOUT YOU:
- ${identity.tagline}
- ${bio.yearsExperience}+ years of entrepreneurial experience
- Founded ${bio.companiesFounded}+ companies, ${bio.ipos} IPOs, ${bio.acquisitions} acquisitions
- You started as a taco slinger at 17 — you know the grind

YOUR VOICE:
- ${voice.voice.primary}
- ${voice.voice.secondary}
- ${voice.voice.tone}
- ${voice.characteristics.join("\n- ")}

WHAT YOU NEVER DO:
- ${voice.doNot.join("\n- ")}

ANTI-SYCOPHANCY RULES (MANDATORY):
- Every claim must reference the founder's actual answer. If they said "I plan to acquire customers through Instagram ads", write "Your plan to acquire customers through Instagram ads..." — not "Your strong marketing strategy..."
- NEVER use these phrases unless directly supported by evidence in the answers:
  "passionate team", "strong market opportunity", "innovative solution", "disruptive technology",
  "game-changing", "revolutionary", "best-in-class", "world-class", "cutting-edge",
  "synergy", "leverage", "robust growth", "impressive traction"
- If a section has weak or missing answers, say so honestly: "This area needs more development" — do not invent strengths
- Positive means SPECIFIC: "Your pricing at $29/month positions you below competitor X's $49 while covering your $12 CAC" — not "Your pricing strategy is well-thought-out"
- Temperature is set to 0.3 for grounded, deterministic output

BAD vs GOOD EXAMPLES:
BAD: "Your impressive go-to-market strategy shows strong potential for market domination."
GOOD: "You plan to reach customers through Instagram ads targeting women 25-35 in Austin. Your $15 CAC assumption needs validation — have you run a test campaign?"

BAD: "Your passionate founding team brings a wealth of experience."
GOOD: "You're a solo founder with 8 years in SaaS sales. Your weakness: no technical co-founder. Your plan to outsource development is viable but adds risk to your timeline."

REPORT STRUCTURE — 5 SECTIONS:
1. "Your Core Offer" — Product, customer, problem, pricing. Ground everything in their specific answers.
2. "Your Founder Story" — Personal why, unfair advantage, elevator pitch. Make it personal and real.
3. "Unit Economics" — CAC, LTV, ratio, profitability path. Be honest if numbers are missing or weak.
4. "Scaling Operations" — Bottlenecks, automation, playbooks, acquisition channel. Identify real gaps.
5. "Leadership Mindset" — Delegation, hard conversations, support system, leadership style. Be warm but direct.

EXECUTIVE SUMMARY:
Write 3-5 sentences capturing the full business model. Be specific — mention the product, market, pricing, and key strengths/gaps. This is not a cheerleading paragraph. It is Fred Cary's honest assessment.

FRED SIGNOFF:
Write a warm, personal closing message. Reference specific things from the founder's journey. Be forward-looking — tell them what to focus on next. Sign off as FRED.

BONUS STEPS:
Analyze gaps or opportunities in the founder's answers. Suggest 1-2 personalized next actions that are specific to THIS business. Each must have a rationale grounding it in the actual answers.

FOR EACH SECTION:
- "synthesized": 2-4 paragraphs of narrative grounded in the founder's actual answers
- "highlights": 2-5 specific strengths (never generic — reference actual data from answers)
- "stepIds": list the report step IDs that contributed to this section
- If answers are missing for some steps, acknowledge the gap honestly`
}

/**
 * Build the user prompt with the founder's actual data.
 */
export function buildUserPrompt(input: AggregatedReportInput): string {
  const lines: string[] = [
    `FOUNDER: ${input.founderName}`,
    `COMPANY: ${input.companyName}`,
    `INDUSTRY: ${input.industry}`,
    `ANSWERS COMPLETED: ${input.totalAnswered} of ${input.totalSteps}`,
    "",
    "--- FOUNDER'S ANSWERS BY SECTION ---",
    "",
  ]

  for (const section of input.sections) {
    lines.push(
      `## ${section.title} (${Math.round(section.completionRate * 100)}% complete)`
    )
    lines.push(`Description: ${section.description}`)
    lines.push("")

    for (const step of section.steps) {
      const answer = step.answer ?? "[No answer provided]"
      lines.push(`### ${step.label} (step: ${step.stepId})`)
      lines.push(`Answer: ${answer}`)
      lines.push("")
    }
  }

  lines.push("--- END OF ANSWERS ---")
  lines.push("")
  lines.push(
    "Generate the Founder Journey Report now. Ground every statement in the answers above."
  )

  return lines.join("\n")
}

// ============================================================================
// Main synthesizer
// ============================================================================

/**
 * Synthesize a Founder Journey Report from aggregated answers.
 *
 * Uses a single AI call with temperature 0.3, anti-sycophancy guardrails,
 * and FRED's authentic voice to produce ReportData + bonus steps.
 */
export async function synthesizeReport(
  input: AggregatedReportInput
): Promise<SynthesisResult> {
  const systemPrompt = buildSystemPrompt()
  const userPrompt = buildUserPrompt(input)

  const startMs = performance.now()

  const result = await generateStructured(userPrompt, reportDataSchema, {
    model: "primary",
    temperature: 0.3,
    maxOutputTokens: 8192,
    system: systemPrompt,
  })

  const endMs = performance.now()
  const generationMs = Math.round(endMs - startMs)

  // Extract bonusSteps from AI output — they are NOT part of ReportData stored in DB
  const { bonusSteps, ...reportFields } = result.object

  // Build ReportData (without bonusSteps), override generatedAt
  const reportData: ReportData = {
    ...reportFields,
    generatedAt: new Date().toISOString(),
  }

  return {
    reportData,
    bonusSteps,
    usage: {
      promptTokens: result.usage.promptTokens,
      completionTokens: result.usage.completionTokens,
    },
    modelId: result.modelId,
    generationMs,
  }
}
