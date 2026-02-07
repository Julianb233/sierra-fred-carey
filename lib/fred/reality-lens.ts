/**
 * Reality Lens Assessment Engine
 *
 * AI-powered 5-factor startup assessment providing founders with a
 * clear-eyed view of their venture's viability.
 *
 * Factors:
 * - Feasibility: Can this actually be built?
 * - Economics: Do the unit economics work?
 * - Demand: Is there real market demand?
 * - Distribution: Can you reach customers?
 * - Timing: Is the market ready?
 */

import { z } from "zod";
import { generateStructuredReliable } from "@/lib/ai";
import {
  FRED_BIO,
  FRED_IDENTITY,
  FRED_COMMUNICATION_STYLE,
  getExperienceStatement,
  getCredibilityStatement,
} from "@/lib/fred-brain";
import {
  type RealityLensInput,
  type RealityLensResult,
  type RealityLensContext,
  type FactorsResult,
  type FactorAssessment,
  type RealityLensFactor,
  type Verdict,
  RealityLensInputSchema,
  RealityLensResultSchema,
  FactorsResultSchema,
  FactorAssessmentSchema,
  REALITY_LENS_FACTORS,
  FACTOR_DESCRIPTIONS,
  FACTOR_WEIGHTS,
  VERDICT_DESCRIPTIONS,
  getVerdictFromScore,
  calculateOverallScore,
} from "./schemas/reality-lens";
import { nanoid } from "nanoid";
import { logger } from "@/lib/logger";

// ============================================================================
// Types
// ============================================================================

export interface AssessmentOptions {
  /** Use heuristics instead of AI (for testing/fallback) */
  useHeuristics?: boolean;
  /** Include detailed debug info */
  debug?: boolean;
}

export interface AssessmentDebugInfo {
  timings: {
    total: number;
    perFactor: Record<string, number>;
  };
  model?: string;
  fallbacksUsed?: number;
}

// ============================================================================
// Prompts
// ============================================================================

const SYSTEM_PROMPT = `You are ${FRED_IDENTITY.name}, serial entrepreneur, investor, and startup advisor with over ${FRED_BIO.yearsExperience} years of experience building companies and evaluating startup ideas.

${getExperienceStatement()}

${getCredibilityStatement()}

I use the Reality Lens framework to give founders my honest assessment across 5 dimensions. ${FRED_COMMUNICATION_STYLE.voice.primary}. ${FRED_COMMUNICATION_STYLE.voice.tone}.

Guidelines:
1. Be specific and actionable in your feedback
2. Score based on evidence, not potential
3. A score of 50 is "average" - most ideas should cluster around 40-60
4. Reserve scores above 80 for truly exceptional factors
5. Reserve scores below 20 for severe problems
6. When uncertain, say so and reflect it in confidence level
7. Focus on what can be validated or improved`;

/**
 * Build the assessment prompt for a specific factor
 */
function buildFactorPrompt(
  factor: RealityLensFactor,
  idea: string,
  context?: RealityLensContext
): string {
  const contextInfo = context
    ? `
Context about the startup:
- Stage: ${context.stage || "Unknown"}
- Funding: ${context.funding || "Unknown"}
- Team size: ${context.teamSize || "Unknown"}
- Industry: ${context.industry || "Unknown"}
- Target market: ${context.targetMarket || "Unknown"}
- Current MRR: ${context.mrr !== undefined ? `$${context.mrr}` : "Unknown"}
- Customer count: ${context.customerCount ?? "Unknown"}
- Runway: ${context.runwayMonths !== undefined ? `${context.runwayMonths} months` : "Unknown"}`
    : "";

  return `Analyze this startup idea for the "${factor.toUpperCase()}" factor:

IDEA:
${idea}
${contextInfo}

FACTOR DEFINITION - ${factor.toUpperCase()}:
${FACTOR_DESCRIPTIONS[factor]}

Provide a thorough assessment of this factor. Be specific, cite evidence from the idea description, and provide actionable recommendations.

Remember:
- Score 0-100 where 50 is average
- Be calibrated - most scores should be 30-70
- High confidence only when you have clear evidence
- Low confidence when making assumptions`;
}

/**
 * Build the synthesis prompt for overall assessment
 */
function buildSynthesisPrompt(
  idea: string,
  factors: FactorsResult,
  overallScore: number,
  context?: RealityLensContext
): string {
  const factorSummaries = REALITY_LENS_FACTORS.map(
    (f) =>
      `- ${f.charAt(0).toUpperCase() + f.slice(1)}: ${factors[f].score}/100 - ${factors[f].summary}`
  ).join("\n");

  return `Based on the following 5-factor analysis, provide a synthesis of this startup idea:

IDEA:
${idea}

FACTOR SCORES:
${factorSummaries}

OVERALL SCORE: ${overallScore}/100

Provide:
1. Top 3 overall strengths (across all factors)
2. Top 3 critical risks that must be addressed
3. 3-5 prioritized next steps the founder should take
4. A brief executive summary (1 paragraph)

Be specific and actionable. Reference the factor analysis where relevant.`;
}

// ============================================================================
// Assessment Engine
// ============================================================================

/**
 * Assess a single factor
 */
async function assessFactor(
  factor: RealityLensFactor,
  idea: string,
  context?: RealityLensContext
): Promise<FactorAssessment> {
  const prompt = buildFactorPrompt(factor, idea, context);

  try {
    const result = await generateStructuredReliable(
      prompt,
      FactorAssessmentSchema,
      {
        system: SYSTEM_PROMPT,
        temperature: 0.3, // Lower temperature for consistent scoring
        maxOutputTokens: 1500,
      }
    );

    return result.object;
  } catch (error) {
    console.error(`[Reality Lens] Factor ${factor} assessment failed:`, error);
    // Return a conservative fallback
    return getHeuristicFactorAssessment(factor, idea);
  }
}

/**
 * Get heuristic-based factor assessment (fallback)
 */
function getHeuristicFactorAssessment(
  factor: RealityLensFactor,
  idea: string
): FactorAssessment {
  const lowerIdea = idea.toLowerCase();

  // Simple keyword-based scoring
  const positiveSignals: Record<RealityLensFactor, string[]> = {
    feasibility: [
      "built",
      "launched",
      "working",
      "prototype",
      "mvp",
      "technical",
      "experience",
    ],
    economics: [
      "revenue",
      "profit",
      "margin",
      "subscription",
      "saas",
      "recurring",
      "paying",
    ],
    demand: [
      "customers",
      "users",
      "waitlist",
      "demand",
      "need",
      "pain",
      "problem",
    ],
    distribution: [
      "viral",
      "organic",
      "channel",
      "marketing",
      "sales",
      "network",
      "community",
    ],
    timing: [
      "now",
      "trend",
      "growing",
      "emerging",
      "shift",
      "change",
      "opportunity",
    ],
  };

  const negativeSignals: Record<RealityLensFactor, string[]> = {
    feasibility: ["complex", "hard", "difficult", "years", "expensive", "new"],
    economics: ["free", "expensive", "low margin", "commoditized"],
    demand: ["niche", "small", "unclear", "assuming", "think"],
    distribution: ["crowded", "competitive", "saturated", "dominated"],
    timing: ["early", "late", "mature", "declining", "saturated"],
  };

  const positiveCount = positiveSignals[factor].filter((s) =>
    lowerIdea.includes(s)
  ).length;
  const negativeCount = negativeSignals[factor].filter((s) =>
    lowerIdea.includes(s)
  ).length;

  // Base score starts at 50 (average)
  const baseScore = 50 + positiveCount * 8 - negativeCount * 10;
  const score = Math.max(20, Math.min(80, baseScore));

  return {
    score,
    confidence: "low",
    summary: `Heuristic assessment based on keyword analysis. Score may not reflect actual ${factor}.`,
    strengths:
      positiveCount > 0
        ? [`Some positive signals detected for ${factor}`]
        : [],
    weaknesses:
      negativeCount > 0
        ? [`Some concerns detected for ${factor}`]
        : ["Insufficient information to assess"],
    questions: [`What specific evidence supports the ${factor} of this idea?`],
    recommendations: [
      `Provide more specific details about ${factor} to improve assessment accuracy`,
    ],
  };
}

/**
 * Perform synthesis to get top-level insights
 */
async function synthesizeAssessment(
  idea: string,
  factors: FactorsResult,
  overallScore: number,
  context?: RealityLensContext
): Promise<{
  topStrengths: string[];
  criticalRisks: string[];
  nextSteps: string[];
  executiveSummary: string;
}> {
  const prompt = buildSynthesisPrompt(idea, factors, overallScore, context);

  const SynthesisSchema = z.object({
    topStrengths: z.array(z.string()).max(3),
    criticalRisks: z.array(z.string()).max(3),
    nextSteps: z.array(z.string()).max(5),
    executiveSummary: z.string().max(1000),
  });

  try {
    const result = await generateStructuredReliable(prompt, SynthesisSchema, {
      system: SYSTEM_PROMPT,
      temperature: 0.4,
      maxOutputTokens: 1500,
    });

    return result.object;
  } catch (error) {
    console.error("[Reality Lens] Synthesis failed:", error);
    // Return heuristic synthesis
    return getHeuristicSynthesis(factors, overallScore);
  }
}

/**
 * Get heuristic synthesis (fallback)
 */
function getHeuristicSynthesis(
  factors: FactorsResult,
  overallScore: number
): {
  topStrengths: string[];
  criticalRisks: string[];
  nextSteps: string[];
  executiveSummary: string;
} {
  // Find top and bottom factors
  const sortedFactors = REALITY_LENS_FACTORS.map((f) => ({
    name: f,
    score: factors[f].score,
  })).sort((a, b) => b.score - a.score);

  const topFactor = sortedFactors[0];
  const bottomFactor = sortedFactors[sortedFactors.length - 1];

  const verdict = getVerdictFromScore(overallScore);

  return {
    topStrengths: [
      `${topFactor.name.charAt(0).toUpperCase() + topFactor.name.slice(1)} is the strongest factor (${topFactor.score}/100)`,
    ],
    criticalRisks: [
      `${bottomFactor.name.charAt(0).toUpperCase() + bottomFactor.name.slice(1)} needs attention (${bottomFactor.score}/100)`,
    ],
    nextSteps: [
      `Focus on improving ${bottomFactor.name}`,
      "Gather more specific data for accurate assessment",
      "Validate assumptions with potential customers",
    ],
    executiveSummary: `This idea scores ${overallScore}/100 overall, placing it in the "${verdict}" category. The strongest factor is ${topFactor.name} while ${bottomFactor.name} needs the most attention. This assessment is based on limited information - providing more specific details would improve accuracy.`,
  };
}

// ============================================================================
// Main Assessment Function
// ============================================================================

/**
 * Perform a complete Reality Lens assessment
 *
 * @example
 * const result = await assessIdea({
 *   idea: "An AI-powered tool that helps founders make better decisions...",
 *   context: { stage: "mvp", funding: "pre-seed" }
 * });
 *
 * logger.log(result.overallScore); // 72
 * logger.log(result.verdict); // "promising"
 */
export async function assessIdea(
  input: RealityLensInput,
  options: AssessmentOptions = {}
): Promise<RealityLensResult> {
  const startTime = Date.now();
  const assessmentId = nanoid();

  logger.log(`[Reality Lens] Starting assessment ${assessmentId}`, {
    ideaLength: input.idea.length,
    hasContext: !!input.context,
    useHeuristics: options.useHeuristics,
  });

  // Assess all 5 factors (in parallel for speed)
  const factorAssessments = await Promise.all(
    REALITY_LENS_FACTORS.map(async (factor) => {
      if (options.useHeuristics) {
        return {
          factor,
          assessment: getHeuristicFactorAssessment(factor, input.idea),
        };
      }
      return {
        factor,
        assessment: await assessFactor(factor, input.idea, input.context),
      };
    })
  );

  // Build factors result object
  const factors: FactorsResult = {
    feasibility: factorAssessments.find((f) => f.factor === "feasibility")!
      .assessment,
    economics: factorAssessments.find((f) => f.factor === "economics")!
      .assessment,
    demand: factorAssessments.find((f) => f.factor === "demand")!.assessment,
    distribution: factorAssessments.find((f) => f.factor === "distribution")!
      .assessment,
    timing: factorAssessments.find((f) => f.factor === "timing")!.assessment,
  };

  // Calculate overall score
  const overallScore = calculateOverallScore(factors);

  // Get verdict
  const verdict = getVerdictFromScore(overallScore);
  const verdictDescription = VERDICT_DESCRIPTIONS[verdict];

  // Synthesize top-level insights
  const synthesis = options.useHeuristics
    ? getHeuristicSynthesis(factors, overallScore)
    : await synthesizeAssessment(
        input.idea,
        factors,
        overallScore,
        input.context
      );

  const processingTimeMs = Date.now() - startTime;

  const result: RealityLensResult = {
    overallScore,
    verdict,
    verdictDescription,
    factors,
    topStrengths: synthesis.topStrengths,
    criticalRisks: synthesis.criticalRisks,
    nextSteps: synthesis.nextSteps,
    executiveSummary: synthesis.executiveSummary,
    metadata: {
      assessmentId,
      timestamp: new Date().toISOString(),
      version: "1.0",
      processingTimeMs,
    },
  };

  logger.log(`[Reality Lens] Assessment ${assessmentId} complete`, {
    overallScore,
    verdict,
    processingTimeMs,
  });

  return result;
}

/**
 * Validate assessment input
 */
export function validateInput(
  input: unknown
): { valid: true; data: RealityLensInput } | { valid: false; errors: string[] } {
  const result = RealityLensInputSchema.safeParse(input);

  if (result.success) {
    return { valid: true, data: result.data };
  }

  return {
    valid: false,
    errors: result.error.issues.map(
      (e) => `${e.path.join(".")}: ${e.message}`
    ),
  };
}

// ============================================================================
// Exports
// ============================================================================

export {
  type RealityLensInput,
  type RealityLensResult,
  type RealityLensContext,
  type FactorsResult,
  type FactorAssessment,
  type RealityLensFactor,
  type Verdict,
  REALITY_LENS_FACTORS,
  FACTOR_DESCRIPTIONS,
  FACTOR_WEIGHTS,
  VERDICT_THRESHOLDS,
  VERDICT_DESCRIPTIONS,
  getVerdictFromScore,
  calculateOverallScore,
} from "./schemas/reality-lens";
