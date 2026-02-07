/**
 * 7-Factor Scoring Engine
 *
 * AI-powered decision scoring using Fred Cary's 7-factor methodology.
 * Uses OpenAI with structured outputs for consistent, typed responses.
 */

import OpenAI from "openai";
import { z } from "zod";
// Note: Using standard JSON response format with manual Zod validation
import {
  type FactorScore,
  type FactorScores,
  type CompositeScore,
  type DecisionType,
  type DecisionContext,
  type RecommendationLevel,
  type FactorName,
  FACTOR_NAMES,
  DECISION_TYPES,
  DEFAULT_SCORING_CONFIG,
} from "./types";
import { buildScoringPrompt } from "./prompts";
import { logger } from "@/lib/logger";

// ============================================================================
// Zod Schemas for Structured Output
// ============================================================================

const FactorScoreSchema = z.object({
  value: z.number().min(0).max(1).describe("Score from 0 to 1"),
  confidence: z.number().min(0).max(1).describe("Confidence in this score (0-1)"),
  reasoning: z.string().describe("Brief reasoning for this score"),
  evidence: z.array(z.string()).describe("Evidence supporting this score"),
});

const ScoringResponseSchema = z.object({
  strategicAlignment: FactorScoreSchema.describe("Does this align with long-term vision?"),
  leverage: FactorScoreSchema.describe("Does this create multiplied impact?"),
  speed: FactorScoreSchema.describe("How quickly can this be executed?"),
  revenue: FactorScoreSchema.describe("What is the revenue impact?"),
  time: FactorScoreSchema.describe("Time investment required (higher = less time needed)"),
  risk: FactorScoreSchema.describe("Downside exposure (higher = lower risk)"),
  relationships: FactorScoreSchema.describe("Impact on key relationships"),
});

type ScoringResponse = z.infer<typeof ScoringResponseSchema>;

// ============================================================================
// Scoring Engine
// ============================================================================

/**
 * Score a decision using the 7-factor framework
 */
export async function scoreDecision(
  decision: string,
  context: DecisionContext,
  options: {
    decisionType?: DecisionType;
    useAI?: boolean;
  } = {}
): Promise<CompositeScore> {
  const { useAI = DEFAULT_SCORING_CONFIG.useAIScoring } = options;

  // Detect or use provided decision type
  const decisionType = options.decisionType || detectDecisionType(decision);

  logger.log(`[FRED Scoring] Scoring decision as "${decisionType.name}"`, {
    useAI,
    decision: decision.substring(0, 100),
  });

  // Get factor scores (AI-powered or heuristic)
  const rawFactors = useAI
    ? await getAIScoringFactors(decision, context, decisionType)
    : getHeuristicFactors(decision, context, decisionType);

  // Add weights to factors
  const factors = addWeightsToFactors(rawFactors, decisionType);

  // Calculate composite score
  const compositeValue = calculateComposite(factors, decisionType.weights);

  // Calculate confidence
  const confidence = calculateAggregateConfidence(factors);

  // Get recommendation
  const recommendation = getRecommendation(compositeValue);

  // Calculate uncertainty range
  const uncertaintyRange = calculateUncertaintyRange(factors, compositeValue);

  // Generate summary
  const summary = generateSummary(decision, factors, compositeValue, recommendation);

  return {
    value: compositeValue,
    percentage: Math.round(compositeValue * 100),
    confidence,
    recommendation,
    factors,
    uncertaintyRange,
    summary,
  };
}

/**
 * Get AI-powered factor scores
 */
async function getAIScoringFactors(
  decision: string,
  context: DecisionContext,
  decisionType: DecisionType
): Promise<ScoringResponse> {
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const prompt = buildScoringPrompt(decision, context, decisionType);

  try {
    const completion = await openai.chat.completions.create({
      model: DEFAULT_SCORING_CONFIG.aiModel,
      messages: [
        {
          role: "system",
          content: "You are FRED, an expert startup advisor. Score decisions rigorously and be well-calibrated. Respond with valid JSON only.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.3, // Lower temperature for more consistent scoring
    });

    const content = completion.choices[0].message.content;

    if (!content) {
      console.error("[FRED Scoring] AI returned null response, falling back to heuristics");
      return getHeuristicFactors(decision, context, decisionType);
    }

    // Parse and validate with Zod
    const parsed = ScoringResponseSchema.safeParse(JSON.parse(content));

    if (!parsed.success) {
      console.error("[FRED Scoring] AI response validation failed, falling back to heuristics:", parsed.error);
      return getHeuristicFactors(decision, context, decisionType);
    }

    return parsed.data;
  } catch (error) {
    console.error("[FRED Scoring] AI scoring failed, falling back to heuristics:", error);
    return getHeuristicFactors(decision, context, decisionType);
  }
}

/**
 * Get heuristic-based factor scores (fallback when AI unavailable)
 */
function getHeuristicFactors(
  decision: string,
  context: DecisionContext,
  decisionType: DecisionType
): ScoringResponse {
  const lowerDecision = decision.toLowerCase();

  // Simple keyword-based heuristics
  const positiveSignals = [
    "opportunity", "growth", "revenue", "profit", "scale", "leverage",
    "strategic", "efficient", "innovative", "competitive advantage"
  ];
  const negativeSignals = [
    "risk", "concern", "problem", "issue", "difficult", "expensive",
    "uncertain", "unclear", "complex", "challenging"
  ];
  const urgencySignals = ["asap", "urgent", "immediately", "deadline", "critical"];

  const positiveCount = positiveSignals.filter((s) => lowerDecision.includes(s)).length;
  const negativeCount = negativeSignals.filter((s) => lowerDecision.includes(s)).length;
  const hasUrgency = urgencySignals.some((s) => lowerDecision.includes(s));

  // Base scores with some variance
  const baseScore = 0.5 + (positiveCount - negativeCount) * 0.05;
  const clampedBase = Math.max(0.3, Math.min(0.7, baseScore));

  return {
    strategicAlignment: {
      value: clampedBase + 0.1,
      confidence: 0.5,
      reasoning: "Heuristic assessment based on keyword analysis",
      evidence: ["Automated analysis - limited context available"],
    },
    leverage: {
      value: clampedBase,
      confidence: 0.5,
      reasoning: "Heuristic assessment - leverage potential unclear",
      evidence: ["Automated analysis - limited context available"],
    },
    speed: {
      value: hasUrgency ? 0.7 : clampedBase,
      confidence: 0.5,
      reasoning: hasUrgency ? "Urgency signals detected" : "Standard timeline assumed",
      evidence: hasUrgency ? ["Urgency keywords found"] : ["No urgency signals detected"],
    },
    revenue: {
      value: clampedBase,
      confidence: 0.4,
      reasoning: "Revenue impact uncertain without more context",
      evidence: ["Automated analysis - revenue impact unclear"],
    },
    time: {
      value: hasUrgency ? 0.4 : 0.6,
      confidence: 0.5,
      reasoning: hasUrgency ? "High urgency may indicate time pressure" : "Moderate time investment assumed",
      evidence: ["Automated analysis"],
    },
    risk: {
      value: Math.max(0.3, clampedBase - negativeCount * 0.1),
      confidence: 0.5,
      reasoning: negativeCount > 0 ? "Risk signals detected in input" : "Risk level uncertain",
      evidence: negativeCount > 0 ? ["Negative signals found"] : ["No clear risk signals"],
    },
    relationships: {
      value: clampedBase,
      confidence: 0.5,
      reasoning: "Relationship impact unclear without more context",
      evidence: ["Automated analysis - relationship impact uncertain"],
    },
  };
}

/**
 * Add weights to raw factor scores
 */
function addWeightsToFactors(
  rawFactors: ScoringResponse,
  decisionType: DecisionType
): FactorScores {
  const result: Partial<FactorScores> = {};

  for (const factorName of FACTOR_NAMES) {
    const raw = rawFactors[factorName];
    result[factorName] = {
      ...raw,
      weight: decisionType.weights[factorName],
    };
  }

  return result as FactorScores;
}

/**
 * Calculate weighted composite score
 */
function calculateComposite(
  factors: FactorScores,
  weights: Record<FactorName, number>
): number {
  let weightedSum = 0;
  let totalConfidenceWeight = 0;

  for (const factorName of FACTOR_NAMES) {
    const factor = factors[factorName];
    const weight = weights[factorName];

    // Weight by both factor weight and confidence
    const effectiveWeight = weight * factor.confidence;
    weightedSum += factor.value * effectiveWeight;
    totalConfidenceWeight += effectiveWeight;
  }

  return totalConfidenceWeight > 0 ? weightedSum / totalConfidenceWeight : 0.5;
}

/**
 * Calculate aggregate confidence
 */
function calculateAggregateConfidence(factors: FactorScores): number {
  let weightedConfidence = 0;
  let totalWeight = 0;

  for (const factorName of FACTOR_NAMES) {
    const factor = factors[factorName];
    weightedConfidence += factor.confidence * factor.weight;
    totalWeight += factor.weight;
  }

  return totalWeight > 0 ? weightedConfidence / totalWeight : 0.5;
}

/**
 * Get recommendation level from score
 */
function getRecommendation(score: number): RecommendationLevel {
  const config = DEFAULT_SCORING_CONFIG;

  if (score >= config.strongYesThreshold) return "strong_yes";
  if (score >= config.yesThreshold) return "yes";
  if (score >= config.maybeThreshold) return "maybe";
  if (score >= config.noThreshold) return "no";
  return "strong_no";
}

/**
 * Calculate uncertainty range (95% CI)
 */
function calculateUncertaintyRange(
  factors: FactorScores,
  compositeScore: number
): [number, number] {
  // Calculate average confidence
  const confidences = FACTOR_NAMES.map((name) => factors[name].confidence);
  const avgConfidence = confidences.reduce((a, b) => a + b, 0) / confidences.length;

  // Higher uncertainty (lower confidence) = wider range
  const spreadFactor = (1 - avgConfidence) * 0.4; // Max spread of 40% at 0 confidence

  // Calculate score variance based on factor value variance
  const values = FACTOR_NAMES.map((name) => factors[name].value);
  const variance = calculateVariance(values);
  const varianceSpread = Math.sqrt(variance) * 0.2;

  const totalSpread = spreadFactor + varianceSpread;

  return [
    Math.max(0, compositeScore - totalSpread),
    Math.min(1, compositeScore + totalSpread),
  ];
}

/**
 * Calculate variance of an array
 */
function calculateVariance(values: number[]): number {
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const squaredDiffs = values.map((v) => Math.pow(v - mean, 2));
  return squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
}

/**
 * Detect decision type from input
 */
export function detectDecisionType(decision: string): DecisionType {
  const lowerDecision = decision.toLowerCase();
  let bestMatch = DECISION_TYPES.general;
  let bestScore = 0;

  for (const [typeId, type] of Object.entries(DECISION_TYPES)) {
    if (typeId === "general") continue;

    const matchScore = type.keywords.filter((kw) =>
      lowerDecision.includes(kw.toLowerCase())
    ).length;

    if (matchScore > bestScore) {
      bestScore = matchScore;
      bestMatch = type;
    }
  }

  return bestMatch;
}

/**
 * Generate a summary of the scoring
 */
function generateSummary(
  decision: string,
  factors: FactorScores,
  compositeScore: number,
  recommendation: RecommendationLevel
): string {
  // Find top and bottom factors
  const sortedFactors = FACTOR_NAMES
    .map((name) => ({ name, score: factors[name] }))
    .sort((a, b) => b.score.value * b.score.weight - a.score.value * a.score.weight);

  const topFactor = sortedFactors[0];
  const bottomFactor = sortedFactors[sortedFactors.length - 1];

  const recommendationText: Record<RecommendationLevel, string> = {
    strong_yes: "I strongly recommend proceeding",
    yes: "I recommend proceeding",
    maybe: "This is a balanced decision that could go either way",
    no: "I recommend against this",
    strong_no: "I strongly recommend against this",
  };

  const pct = Math.round(compositeScore * 100);
  const topFactorName = formatFactorName(topFactor.name);
  const bottomFactorName = formatFactorName(bottomFactor.name);

  return `${recommendationText[recommendation]} (Score: ${pct}/100). Strongest factor: ${topFactorName} (${Math.round(topFactor.score.value * 100)}%). ${
    bottomFactor.score.value < 0.5
      ? `Watch out for: ${bottomFactorName} (${Math.round(bottomFactor.score.value * 100)}%).`
      : ""
  }`;
}

/**
 * Format factor name for display
 */
function formatFactorName(factor: string): string {
  const nameMap: Record<string, string> = {
    strategicAlignment: "Strategic Alignment",
    leverage: "Leverage",
    speed: "Speed",
    revenue: "Revenue",
    time: "Time",
    risk: "Risk",
    relationships: "Relationships",
  };
  return nameMap[factor] || factor;
}

/**
 * Get a specific decision type by ID
 */
export function getDecisionType(typeId: string): DecisionType {
  return DECISION_TYPES[typeId] || DECISION_TYPES.general;
}

/**
 * List all available decision types
 */
export function listDecisionTypes(): DecisionType[] {
  return Object.values(DECISION_TYPES);
}
