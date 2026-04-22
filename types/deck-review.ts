/**
 * Pitch Deck Scoring Types
 *
 * Types for the 7-dimension pitch deck scoring feature.
 * Used by the deck-scoring AI pipeline and scorecard UI.
 */

export interface DeckDimension {
  name: string
  score: number // 1-10
  explanation: string // 1-2 sentence justification
  suggestions: string[] // 1-3 improvement suggestions
  vcWantToSee: string // what VCs specifically look for in this dimension
}

export interface DeckScorecard {
  overallScore: number // weighted average 1-10
  dimensions: DeckDimension[]
  summary: string // 2-3 sentence overall assessment
  topStrength: string
  biggestGap: string
  createdAt: string
}

export interface DeckReviewRequest {
  fileName: string
  textContent: string // extracted PDF text
}

export const DECK_DIMENSIONS = [
  "Problem Clarity",
  "Market Size & Opportunity",
  "Team & Founder Fit",
  "Traction & Validation",
  "Go-to-Market Strategy",
  "Narrative & Storytelling",
  "Investability",
] as const

export type DeckDimensionName = (typeof DECK_DIMENSIONS)[number]

/** Weights for each dimension when computing overall score */
export const DIMENSION_WEIGHTS: Record<DeckDimensionName, number> = {
  "Problem Clarity": 0.15,
  "Market Size & Opportunity": 0.15,
  "Team & Founder Fit": 0.15,
  "Traction & Validation": 0.15,
  "Go-to-Market Strategy": 0.10,
  "Narrative & Storytelling": 0.10,
  "Investability": 0.20,
}
