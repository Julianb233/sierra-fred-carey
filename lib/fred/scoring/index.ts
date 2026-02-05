/**
 * FRED 7-Factor Scoring Engine
 *
 * Exports for the scoring module.
 */

// Main scoring functions
export {
  scoreDecision,
  detectDecisionType,
  getDecisionType,
  listDecisionTypes,
} from "./engine";

// Calibration tracking
export {
  recordPrediction,
  recordOutcome,
  getCalibrationRecord,
  getUserCalibrationRecords,
  getCalibrationMetrics,
  wasWithinRange,
  getPredictionError,
} from "./calibration";

// Prompts (for advanced usage)
export {
  buildScoringPrompt,
  buildDecisionTypeDetectionPrompt,
  buildScoringSummaryPrompt,
} from "./prompts";

// Types
export type {
  FactorScore,
  FactorScores,
  FactorName,
  CompositeScore,
  RecommendationLevel,
  DecisionType,
  DecisionContext,
  FactorWeights,
  CalibrationRecord,
  CalibrationMetrics,
  ScoringConfig,
} from "./types";

export {
  FACTOR_NAMES,
  DECISION_TYPES,
  DEFAULT_SCORING_CONFIG,
} from "./types";
