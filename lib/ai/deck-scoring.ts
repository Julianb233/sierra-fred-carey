/**
 * Pitch Deck AI Scoring
 *
 * Scores pitch decks on 7 investor-relevant dimensions using AI.
 * Returns a structured DeckScorecard with scores, explanations, and suggestions.
 */

import { generateTrackedResponse } from "@/lib/ai/client"
import { logger } from "@/lib/logger"
import type { DeckScorecard, DeckDimension, DeckDimensionName } from "@/types/deck-review"
import { DECK_DIMENSIONS, DIMENSION_WEIGHTS } from "@/types/deck-review"

export { DECK_DIMENSIONS }

export const DECK_SCORING_PROMPT = `You are Fred Cary, a seasoned venture investor and startup advisor. You are reviewing a founder's pitch deck and scoring it across 7 key dimensions that matter to investors.

SCORING RUBRIC:

1. Problem Clarity (1-10)
   - 1-3: Vague, generic problem statement. No evidence of real pain.
   - 4-6: Problem is defined but not validated. Unclear who has the problem or how severe it is.
   - 7-10: Specific, validated, urgent problem. Clear who suffers and what it costs them.

2. Market Size & Opportunity (1-10)
   - 1-3: No market sizing or wildly speculative TAM. No credible path to revenue.
   - 4-6: Market size mentioned but not well-sourced. Reasonable but unvalidated.
   - 7-10: Bottom-up TAM with credible sources. Clear beachhead market and expansion path.

3. Team & Founder Fit (1-10)
   - 1-3: No team info or team lacks relevant experience. No clear why-this-team narrative.
   - 4-6: Team has some relevant experience but gaps in key areas.
   - 7-10: Exceptional team with deep domain expertise, prior exits, or unfair advantages.

4. Traction & Validation (1-10)
   - 1-3: No traction, no users, no revenue, no LOIs. Pure idea stage.
   - 4-6: Some early signals -- waitlists, pilot users, early revenue. Growth unclear.
   - 7-10: Strong metrics -- growing MRR, user retention, enterprise contracts, clear momentum.

5. Go-to-Market Strategy (1-10)
   - 1-3: No GTM plan or "we'll go viral" without substance.
   - 4-6: Basic GTM outlined but not tested. Channels identified but unvalidated.
   - 7-10: Tested channels with known CAC, clear sales motion, distribution advantage.

6. Narrative & Storytelling (1-10)
   - 1-3: Deck is confusing, disorganized, or reads like a feature list.
   - 4-6: Logical flow but lacks compelling narrative arc. Forgettable.
   - 7-10: Compelling story that builds urgency. Memorable, clear, emotionally engaging.

7. Investability (1-10)
   - 1-3: No clear ask, no use of funds, unclear business model or unit economics.
   - 4-6: Ask is stated but rationale is weak. Business model exists but margins unclear.
   - 7-10: Clear ask with specific use of funds. Strong unit economics. Obvious why now.

IMPORTANT SCORING GUIDELINES:
- Be honest and direct. A 7+ means genuinely strong. Most first drafts score 4-6.
- Do not inflate scores to be encouraging. Founders need real feedback.
- If information is missing for a dimension, score it low and say what's missing.
- For vcWantToSee: Write a specific, actionable sentence about what VCs look for in THIS deck's context for each dimension. Do not use generic rubric text -- tailor it to the actual deck content.

Respond ONLY with valid JSON (no markdown code fences):
{
  "dimensions": [
    {
      "name": "Problem Clarity",
      "score": <number 1-10>,
      "explanation": "<1-2 sentence justification>",
      "suggestions": ["<improvement 1>", "<improvement 2>"],
      "vcWantToSee": "<what VCs specifically want to see for this dimension>"
    },
    {
      "name": "Market Size & Opportunity",
      "score": <number 1-10>,
      "explanation": "<1-2 sentence justification>",
      "suggestions": ["<improvement 1>", "<improvement 2>"],
      "vcWantToSee": "<what VCs specifically want to see for this dimension>"
    },
    {
      "name": "Team & Founder Fit",
      "score": <number 1-10>,
      "explanation": "<1-2 sentence justification>",
      "suggestions": ["<improvement 1>", "<improvement 2>"],
      "vcWantToSee": "<what VCs specifically want to see for this dimension>"
    },
    {
      "name": "Traction & Validation",
      "score": <number 1-10>,
      "explanation": "<1-2 sentence justification>",
      "suggestions": ["<improvement 1>", "<improvement 2>"],
      "vcWantToSee": "<what VCs specifically want to see for this dimension>"
    },
    {
      "name": "Go-to-Market Strategy",
      "score": <number 1-10>,
      "explanation": "<1-2 sentence justification>",
      "suggestions": ["<improvement 1>", "<improvement 2>"],
      "vcWantToSee": "<what VCs specifically want to see for this dimension>"
    },
    {
      "name": "Narrative & Storytelling",
      "score": <number 1-10>,
      "explanation": "<1-2 sentence justification>",
      "suggestions": ["<improvement 1>", "<improvement 2>"],
      "vcWantToSee": "<what VCs specifically want to see for this dimension>"
    },
    {
      "name": "Investability",
      "score": <number 1-10>,
      "explanation": "<1-2 sentence justification>",
      "suggestions": ["<improvement 1>", "<improvement 2>"],
      "vcWantToSee": "<what VCs specifically want to see for this dimension>"
    }
  ],
  "summary": "<2-3 sentence overall assessment>",
  "topStrength": "<the single strongest aspect of this deck>",
  "biggestGap": "<the single biggest weakness or missing element>"
}`

/**
 * Score a pitch deck on 7 investor-relevant dimensions using AI.
 *
 * @param textContent - Extracted text from the pitch deck PDF
 * @param founderContext - Optional additional context about the founder/startup
 * @returns Structured DeckScorecard with scores, explanations, and suggestions
 */
export async function scoreDeck(
  textContent: string,
  founderContext?: string
): Promise<DeckScorecard> {
  const userPrompt = `Score this pitch deck on all 7 dimensions.

${founderContext ? `FOUNDER CONTEXT:\n${founderContext}\n\n` : ""}PITCH DECK CONTENT:
${textContent}`

  logger.log("[Deck Scoring] Starting AI scoring...")

  const result = await generateTrackedResponse(
    [{ role: "user", content: userPrompt }],
    DECK_SCORING_PROMPT,
    {
      analyzer: "deck_scoring",
    }
  )

  // Parse the JSON response
  const cleanResponse = result.content
    .replace(/```json\n?/g, "")
    .replace(/```\n?/g, "")
    .trim()

  let parsed: {
    dimensions: DeckDimension[]
    summary: string
    topStrength: string
    biggestGap: string
  }

  try {
    parsed = JSON.parse(cleanResponse)
  } catch (parseError) {
    logger.log("[Deck Scoring] Failed to parse AI response:", String(parseError))
    logger.log("[Deck Scoring] Raw response:", result.content)
    throw new Error("Failed to parse deck scoring response from AI")
  }

  // Validate dimensions
  if (!parsed.dimensions || !Array.isArray(parsed.dimensions)) {
    throw new Error("AI response missing dimensions array")
  }

  // Fallback VC recommendations per dimension when AI doesn't provide one
  const vcWantToSeeDefaults: Record<string, string> = {
    "Problem Clarity": "VCs want to see a specific, quantified pain point with evidence of real customer suffering.",
    "Market Size & Opportunity": "VCs want to see bottom-up TAM calculation with credible sources, not top-down guesses.",
    "Team & Founder Fit": "VCs want to see domain expertise, prior exits, or clear unfair advantages.",
    "Traction & Validation": "VCs want to see month-over-month growth metrics, retention data, or signed LOIs.",
    "Go-to-Market Strategy": "VCs want to see tested acquisition channels with known CAC and conversion rates.",
    "Narrative & Storytelling": "VCs want to see a compelling story arc that builds urgency and is memorable.",
    "Investability": "VCs want to see a clear ask, specific use of funds, and strong unit economics.",
  }

  // Ensure all 7 dimensions are present and scores are valid
  const validatedDimensions: DeckDimension[] = DECK_DIMENSIONS.map((name) => {
    const found = parsed.dimensions.find(
      (d) => d.name.toLowerCase() === name.toLowerCase()
    )
    return {
      name,
      score: Math.min(10, Math.max(1, Math.round(found?.score ?? 1))),
      explanation: found?.explanation || "Not enough information in the deck to evaluate this dimension.",
      suggestions: found?.suggestions?.slice(0, 3) || [],
      vcWantToSee: found?.vcWantToSee || vcWantToSeeDefaults[name] || "",
    }
  })

  // Calculate weighted overall score
  const overallScore = Math.round(
    validatedDimensions.reduce((total, dim) => {
      const weight = DIMENSION_WEIGHTS[dim.name as DeckDimensionName] || 0.1
      return total + dim.score * weight
    }, 0) * 10
  ) / 10

  const scorecard: DeckScorecard = {
    overallScore,
    dimensions: validatedDimensions,
    summary: parsed.summary || "Unable to generate summary.",
    topStrength: parsed.topStrength || "No clear strengths identified.",
    biggestGap: parsed.biggestGap || "Multiple areas need improvement.",
    createdAt: new Date().toISOString(),
  }

  logger.log(`[Deck Scoring] Complete. Overall score: ${scorecard.overallScore}`)

  return scorecard
}
