/**
 * 7-Factor Scoring Engine Types
 *
 * Defines types for FRED's decision scoring framework based on Fred Cary's methodology.
 * Each decision is evaluated across 7 factors with calibrated weights.
 */

// ============================================================================
// Factor Score Types
// ============================================================================

/**
 * Individual factor score with reasoning and evidence
 */
export interface FactorScore {
  /** Normalized score (0-1) */
  value: number;
  /** Weight for this factor in composite calculation */
  weight: number;
  /** Confidence in this score (0-1) */
  confidence: number;
  /** Human-readable reasoning for the score */
  reasoning: string;
  /** Evidence supporting this score */
  evidence: string[];
}

/**
 * All 7 factor scores for a decision
 */
export interface FactorScores {
  /** Does this align with long-term vision and goals? */
  strategicAlignment: FactorScore;
  /** What's the multiplier effect? Does this create compounding value? */
  leverage: FactorScore;
  /** How quickly can this be executed and show results? */
  speed: FactorScore;
  /** Direct or indirect revenue impact */
  revenue: FactorScore;
  /** Time investment required (inverted: higher = less time needed) */
  time: FactorScore;
  /** Downside exposure (inverted: higher = lower risk) */
  risk: FactorScore;
  /** Impact on key relationships (investors, customers, team, partners) */
  relationships: FactorScore;
}

/**
 * Factor names as a type
 */
export type FactorName = keyof FactorScores;

/**
 * All factor names as an array for iteration
 */
export const FACTOR_NAMES: FactorName[] = [
  "strategicAlignment",
  "leverage",
  "speed",
  "revenue",
  "time",
  "risk",
  "relationships",
];

// ============================================================================
// Composite Score Types
// ============================================================================

/**
 * Recommendation level based on composite score
 */
export type RecommendationLevel =
  | "strong_yes" // 0.8+
  | "yes" // 0.65-0.8
  | "maybe" // 0.45-0.65
  | "no" // 0.3-0.45
  | "strong_no"; // <0.3

/**
 * Composite score combining all factors
 */
export interface CompositeScore {
  /** Weighted composite score (0-1) */
  value: number;
  /** Human-readable percentage (0-100) */
  percentage: number;
  /** Aggregate confidence across all factors */
  confidence: number;
  /** Recommendation based on score */
  recommendation: RecommendationLevel;
  /** All factor scores */
  factors: FactorScores;
  /** 95% confidence interval */
  uncertaintyRange: [number, number];
  /** Overall reasoning summary */
  summary: string;
}

// ============================================================================
// Decision Type Configuration
// ============================================================================

/**
 * Weight configuration for a decision type
 */
export type FactorWeights = Record<FactorName, number>;

/**
 * Decision type with customized weights
 */
export interface DecisionType {
  /** Unique identifier */
  id: string;
  /** Human-readable name */
  name: string;
  /** Description of when this type applies */
  description: string;
  /** Custom weights for each factor (should sum to 1) */
  weights: FactorWeights;
  /** Keywords that indicate this decision type */
  keywords: string[];
}

/**
 * Pre-defined decision types with calibrated weights
 */
export const DECISION_TYPES: Record<string, DecisionType> = {
  fundraising: {
    id: "fundraising",
    name: "Fundraising Decision",
    description: "Decisions related to raising capital, investor relations, or financial strategy",
    weights: {
      strategicAlignment: 0.2,
      leverage: 0.15,
      speed: 0.1,
      revenue: 0.1,
      time: 0.1,
      risk: 0.2,
      relationships: 0.15,
    },
    keywords: [
      "fundraise", "raise", "investor", "investment", "vc", "angel",
      "seed", "series", "valuation", "term sheet", "cap table", "dilution"
    ],
  },

  product: {
    id: "product",
    name: "Product Decision",
    description: "Decisions about product features, roadmap, or technical direction",
    weights: {
      strategicAlignment: 0.25,
      leverage: 0.2,
      speed: 0.15,
      revenue: 0.15,
      time: 0.1,
      risk: 0.1,
      relationships: 0.05,
    },
    keywords: [
      "product", "feature", "roadmap", "build", "ship", "launch",
      "mvp", "iteration", "pivot", "technical", "architecture"
    ],
  },

  hiring: {
    id: "hiring",
    name: "Hiring Decision",
    description: "Decisions about team composition, hiring, or people management",
    weights: {
      strategicAlignment: 0.15,
      leverage: 0.2,
      speed: 0.05,
      revenue: 0.1,
      time: 0.15,
      risk: 0.15,
      relationships: 0.2,
    },
    keywords: [
      "hire", "hiring", "candidate", "offer", "team", "employee",
      "contractor", "cofounder", "fire", "terminate", "culture"
    ],
  },

  partnership: {
    id: "partnership",
    name: "Partnership Decision",
    description: "Decisions about strategic partnerships, integrations, or collaborations",
    weights: {
      strategicAlignment: 0.2,
      leverage: 0.25,
      speed: 0.1,
      revenue: 0.15,
      time: 0.05,
      risk: 0.1,
      relationships: 0.15,
    },
    keywords: [
      "partner", "partnership", "integrate", "integration", "collaborate",
      "alliance", "joint", "channel", "reseller", "distribution"
    ],
  },

  marketing: {
    id: "marketing",
    name: "Marketing Decision",
    description: "Decisions about go-to-market, marketing channels, or growth strategies",
    weights: {
      strategicAlignment: 0.15,
      leverage: 0.2,
      speed: 0.15,
      revenue: 0.2,
      time: 0.1,
      risk: 0.1,
      relationships: 0.1,
    },
    keywords: [
      "marketing", "growth", "acquisition", "cac", "ltv", "campaign",
      "channel", "brand", "content", "ads", "seo", "viral"
    ],
  },

  pricing: {
    id: "pricing",
    name: "Pricing Decision",
    description: "Decisions about pricing strategy, monetization, or business model",
    weights: {
      strategicAlignment: 0.15,
      leverage: 0.15,
      speed: 0.1,
      revenue: 0.3,
      time: 0.05,
      risk: 0.15,
      relationships: 0.1,
    },
    keywords: [
      "price", "pricing", "monetize", "monetization", "revenue model",
      "subscription", "freemium", "tier", "discount", "margin"
    ],
  },

  operations: {
    id: "operations",
    name: "Operations Decision",
    description: "Decisions about processes, tools, or operational efficiency",
    weights: {
      strategicAlignment: 0.1,
      leverage: 0.2,
      speed: 0.2,
      revenue: 0.1,
      time: 0.2,
      risk: 0.1,
      relationships: 0.1,
    },
    keywords: [
      "operations", "process", "workflow", "tool", "automation",
      "efficiency", "scale", "infrastructure", "vendor", "cost"
    ],
  },

  general: {
    id: "general",
    name: "General Decision",
    description: "General business decisions that don't fit other categories",
    weights: {
      strategicAlignment: 0.15,
      leverage: 0.15,
      speed: 0.15,
      revenue: 0.15,
      time: 0.1,
      risk: 0.15,
      relationships: 0.15,
    },
    keywords: [],
  },
};

// ============================================================================
// Context Types
// ============================================================================

/**
 * Context provided for scoring a decision
 */
export interface DecisionContext {
  /** Name of the startup/company */
  startupName?: string;
  /** Current stage (idea, pre-seed, seed, series-a, etc.) */
  stage?: string;
  /** Industry or market */
  industry?: string;
  /** Current goals or OKRs */
  goals?: string[];
  /** Recent decision history for context */
  recentDecisions?: Array<{
    summary: string;
    outcome?: string;
  }>;
  /** Any additional context */
  additionalContext?: Record<string, unknown>;
}

// ============================================================================
// Calibration Types
// ============================================================================

/**
 * Record of a prediction for calibration tracking
 */
export interface CalibrationRecord {
  /** Unique identifier */
  id: string;
  /** Associated decision ID */
  decisionId: string;
  /** User ID */
  userId: string;
  /** Predicted composite score (0-1) */
  predictedScore: number;
  /** Confidence in prediction (0-1) */
  predictedConfidence: number;
  /** Predicted uncertainty range */
  predictedRange: [number, number];
  /** Decision type used */
  decisionType: string;
  /** All factor scores */
  factors: FactorScores;
  /** Actual outcome once recorded (0-1, null until recorded) */
  actualOutcome: number | null;
  /** Notes about the actual outcome */
  outcomeNotes: string | null;
  /** When the prediction was made */
  predictedAt: Date;
  /** When the outcome was recorded */
  outcomeRecordedAt: Date | null;
}

/**
 * Calibration metrics for assessing scoring accuracy
 */
export interface CalibrationMetrics {
  /** Total number of predictions with outcomes */
  sampleSize: number;
  /** Brier score (lower is better, 0 = perfect) */
  brierScore: number;
  /** Mean absolute error */
  mae: number;
  /** Correlation between prediction and outcome */
  correlation: number;
  /** Calibration by confidence bucket */
  calibrationByConfidence: Array<{
    confidenceRange: [number, number];
    count: number;
    averagePrediction: number;
    averageOutcome: number;
    accuracy: number;
  }>;
  /** Calibration by decision type */
  calibrationByType: Record<string, {
    count: number;
    brierScore: number;
    mae: number;
  }>;
}

// ============================================================================
// Scoring Configuration
// ============================================================================

/**
 * Configuration for the scoring engine
 */
export interface ScoringConfig {
  /** Minimum confidence threshold for auto-decisions */
  minConfidenceForAuto: number;
  /** Score threshold for "strong_yes" recommendation */
  strongYesThreshold: number;
  /** Score threshold for "yes" recommendation */
  yesThreshold: number;
  /** Score threshold for "maybe" recommendation */
  maybeThreshold: number;
  /** Score threshold for "no" recommendation */
  noThreshold: number;
  /** Default decision type if none detected */
  defaultDecisionType: string;
  /** Whether to use AI-powered scoring (vs heuristic) */
  useAIScoring: boolean;
  /** Model to use for AI scoring */
  aiModel: string;
}

/**
 * Default scoring configuration
 */
export const DEFAULT_SCORING_CONFIG: ScoringConfig = {
  minConfidenceForAuto: 0.75,
  strongYesThreshold: 0.8,
  yesThreshold: 0.65,
  maybeThreshold: 0.45,
  noThreshold: 0.3,
  defaultDecisionType: "general",
  useAIScoring: false, // heuristics are sufficient for P50 quality; avoids hidden sequential GPT-4o call
  aiModel: "gpt-4o",
};
