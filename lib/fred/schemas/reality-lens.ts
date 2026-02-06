/**
 * Reality Lens Assessment Schemas
 *
 * Zod schemas for the 5-factor Reality Lens startup assessment engine.
 * Factors: Feasibility, Economics, Demand, Distribution, Timing
 */

import { z } from "zod";

// ============================================================================
// Input Schema
// ============================================================================

/**
 * Context about the startup/idea being assessed
 */
export const RealityLensContextSchema = z.object({
  /** Current development stage */
  stage: z
    .enum(["idea", "mvp", "launched", "scaling"])
    .optional()
    .describe("Current stage of the startup"),
  /** Funding status */
  funding: z
    .enum(["bootstrapped", "pre-seed", "seed", "series-a", "series-b-plus"])
    .optional()
    .describe("Current funding stage"),
  /** Team size */
  teamSize: z
    .number()
    .int()
    .min(1)
    .max(10000)
    .optional()
    .describe("Number of team members"),
  /** Industry vertical */
  industry: z.string().max(100).optional().describe("Industry or sector"),
  /** Target market description */
  targetMarket: z
    .string()
    .max(500)
    .optional()
    .describe("Description of target market"),
  /** Monthly recurring revenue (if any) */
  mrr: z.number().min(0).optional().describe("Current MRR in USD"),
  /** Number of customers/users */
  customerCount: z
    .number()
    .int()
    .min(0)
    .optional()
    .describe("Number of customers or users"),
  /** Runway in months (if known) */
  runwayMonths: z
    .number()
    .int()
    .min(0)
    .optional()
    .describe("Runway remaining in months"),
});

export type RealityLensContext = z.infer<typeof RealityLensContextSchema>;

/**
 * Input for Reality Lens assessment
 */
export const RealityLensInputSchema = z.object({
  /** The startup idea or pivot being assessed */
  idea: z
    .string()
    .min(10, "Idea description must be at least 10 characters")
    .max(5000, "Idea description must be under 5000 characters")
    .describe("Description of the startup idea or pivot to assess"),
  /** Optional context about the startup */
  context: RealityLensContextSchema.optional(),
  /** User ID for tracking */
  userId: z.string().optional(),
});

export type RealityLensInput = z.infer<typeof RealityLensInputSchema>;

// ============================================================================
// Factor Assessment Schema
// ============================================================================

/**
 * Confidence level in the assessment
 */
export const ConfidenceLevelSchema = z.enum(["high", "medium", "low"]);

export type ConfidenceLevel = z.infer<typeof ConfidenceLevelSchema>;

/**
 * Individual factor assessment
 */
export const FactorAssessmentSchema = z.object({
  /** Score from 0-100 */
  score: z
    .number()
    .min(0)
    .max(100)
    .describe("Score from 0-100 for this factor"),
  /** Confidence in this assessment */
  confidence: ConfidenceLevelSchema.describe("Confidence level in this score"),
  /** Brief summary of the assessment */
  summary: z
    .string()
    .min(10)
    .max(500)
    .describe("Brief summary of this factor assessment"),
  /** What's working well */
  strengths: z
    .array(z.string())
    .max(5)
    .describe("Key strengths for this factor"),
  /** Areas of concern */
  weaknesses: z
    .array(z.string())
    .max(5)
    .describe("Key weaknesses or concerns"),
  /** Questions to investigate further */
  questions: z
    .array(z.string())
    .max(5)
    .describe("Questions to help validate this factor"),
  /** Actionable recommendations */
  recommendations: z
    .array(z.string())
    .max(5)
    .describe("Specific recommendations to improve this factor"),
});

export type FactorAssessment = z.infer<typeof FactorAssessmentSchema>;

// ============================================================================
// Factor Definitions
// ============================================================================

/**
 * The 5 Reality Lens factors
 */
export const REALITY_LENS_FACTORS = [
  "feasibility",
  "economics",
  "demand",
  "distribution",
  "timing",
] as const;

export type RealityLensFactor = (typeof REALITY_LENS_FACTORS)[number];

/**
 * Factor descriptions for prompts
 */
export const FACTOR_DESCRIPTIONS: Record<RealityLensFactor, string> = {
  feasibility:
    "Can this actually be built with available resources? Consider technical complexity, team capabilities, capital requirements, and timeline realism.",
  economics:
    "Do the unit economics work? Is it fundable? Consider CAC, LTV, margins, scalability of costs, and ability to raise capital if needed.",
  demand:
    "Is there real market demand? Look for evidence of willingness to pay, market size, problem severity, and customer urgency.",
  distribution:
    "Can you reach customers? What channels exist? Consider go-to-market strategy, customer acquisition, competition for attention, and viral potential.",
  timing:
    "Is the market ready? Not too early, not too late? Consider market maturity, technology readiness, competitive landscape, and macro trends.",
};

/**
 * Factor weights (must sum to 1.0)
 */
export const FACTOR_WEIGHTS: Record<RealityLensFactor, number> = {
  demand: 0.25, // Most critical - no demand = no business
  economics: 0.25, // Must be financially viable
  feasibility: 0.2, // Can you actually build it?
  distribution: 0.15, // How will you reach customers?
  timing: 0.15, // Market readiness
};

// ============================================================================
// Assessment Result Schema
// ============================================================================

/**
 * Verdict based on overall score
 */
export const VerdictSchema = z.enum([
  "strong",
  "promising",
  "needs-work",
  "reconsider",
]);

export type Verdict = z.infer<typeof VerdictSchema>;

/**
 * Verdict thresholds
 */
export const VERDICT_THRESHOLDS: Record<Verdict, { min: number; max: number }> =
  {
    strong: { min: 80, max: 100 },
    promising: { min: 60, max: 79 },
    "needs-work": { min: 40, max: 59 },
    reconsider: { min: 0, max: 39 },
  };

/**
 * Verdict descriptions
 */
export const VERDICT_DESCRIPTIONS: Record<Verdict, string> = {
  strong: "Strong foundation - proceed with confidence",
  promising: "Good potential - address identified weaknesses",
  "needs-work": "Significant concerns need resolution before proceeding",
  reconsider: "Fundamental issues - consider pivoting or abandoning",
};

/**
 * All 5 factor assessments
 */
export const FactorsResultSchema = z.object({
  feasibility: FactorAssessmentSchema,
  economics: FactorAssessmentSchema,
  demand: FactorAssessmentSchema,
  distribution: FactorAssessmentSchema,
  timing: FactorAssessmentSchema,
});

export type FactorsResult = z.infer<typeof FactorsResultSchema>;

/**
 * Assessment metadata
 */
export const AssessmentMetadataSchema = z.object({
  /** Unique assessment ID */
  assessmentId: z.string(),
  /** When the assessment was created */
  timestamp: z.string().datetime(),
  /** Schema version */
  version: z.literal("1.0"),
  /** Processing time in ms */
  processingTimeMs: z.number().optional(),
  /** Model used for assessment */
  model: z.string().optional(),
});

export type AssessmentMetadata = z.infer<typeof AssessmentMetadataSchema>;

/**
 * Complete Reality Lens assessment result
 */
export const RealityLensResultSchema = z.object({
  /** Overall score (0-100) */
  overallScore: z
    .number()
    .min(0)
    .max(100)
    .describe("Weighted overall score from 0-100"),
  /** Verdict based on score */
  verdict: VerdictSchema.describe("Overall assessment verdict"),
  /** Verdict explanation */
  verdictDescription: z.string().describe("Human-readable verdict explanation"),
  /** All 5 factor assessments */
  factors: FactorsResultSchema.describe("Individual factor assessments"),
  /** Top 3 strengths across all factors */
  topStrengths: z
    .array(z.string())
    .max(3)
    .describe("Top 3 overall strengths"),
  /** Top 3 critical risks */
  criticalRisks: z
    .array(z.string())
    .max(3)
    .describe("Top 3 critical risks to address"),
  /** Recommended next steps */
  nextSteps: z
    .array(z.string())
    .max(5)
    .describe("Prioritized list of next steps"),
  /** One-paragraph executive summary */
  executiveSummary: z
    .string()
    .max(1000)
    .describe("Executive summary of the assessment"),
  /** Assessment metadata */
  metadata: AssessmentMetadataSchema,
});

export type RealityLensResult = z.infer<typeof RealityLensResultSchema>;

// ============================================================================
// API Response Schema
// ============================================================================

/**
 * API success response
 */
export const RealityLensAPIResponseSchema = z.object({
  success: z.literal(true),
  data: RealityLensResultSchema,
});

export type RealityLensAPIResponse = z.infer<
  typeof RealityLensAPIResponseSchema
>;

/**
 * API error response
 */
export const RealityLensAPIErrorSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
  }),
});

export type RealityLensAPIError = z.infer<typeof RealityLensAPIErrorSchema>;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get verdict from overall score
 */
export function getVerdictFromScore(score: number): Verdict {
  if (score >= 80) return "strong";
  if (score >= 60) return "promising";
  if (score >= 40) return "needs-work";
  return "reconsider";
}

/**
 * Calculate weighted overall score from factor scores
 */
export function calculateOverallScore(factors: FactorsResult): number {
  let weightedSum = 0;
  let totalWeight = 0;

  for (const factor of REALITY_LENS_FACTORS) {
    const score = factors[factor].score;
    const weight = FACTOR_WEIGHTS[factor];
    weightedSum += score * weight;
    totalWeight += weight;
  }

  return Math.round(weightedSum / totalWeight);
}

/**
 * Validate a complete assessment result
 */
export function validateAssessmentResult(
  data: unknown
): RealityLensResult | null {
  const result = RealityLensResultSchema.safeParse(data);
  return result.success ? result.data : null;
}
