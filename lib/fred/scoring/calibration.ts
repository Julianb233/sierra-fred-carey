/**
 * Calibration Tracking
 *
 * Tracks predicted scores vs actual outcomes to measure and improve scoring accuracy.
 * This enables FRED to learn from past predictions and maintain well-calibrated scores.
 */

import type {
  CalibrationRecord,
  CalibrationMetrics,
  FactorScores,
  CompositeScore,
} from "./types";
import { createServiceClient } from "@/lib/supabase/server";

// ============================================================================
// Calibration Record Management
// ============================================================================

/**
 * Record a new prediction for calibration tracking
 */
export async function recordPrediction(
  userId: string,
  decisionId: string,
  score: CompositeScore,
  decisionType: string
): Promise<CalibrationRecord> {
  const supabase = createServiceClient();

  const record: Omit<CalibrationRecord, "id"> = {
    decisionId,
    userId,
    predictedScore: score.value,
    predictedConfidence: score.confidence,
    predictedRange: score.uncertaintyRange,
    decisionType,
    factors: score.factors,
    actualOutcome: null,
    outcomeNotes: null,
    predictedAt: new Date(),
    outcomeRecordedAt: null,
  };

  const { data, error } = await supabase
    .from("fred_calibration_records")
    .insert({
      decision_id: record.decisionId,
      user_id: record.userId,
      predicted_score: record.predictedScore,
      predicted_confidence: record.predictedConfidence,
      predicted_range: record.predictedRange,
      decision_type: record.decisionType,
      factors: record.factors,
      predicted_at: record.predictedAt.toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error("[FRED Calibration] Error recording prediction:", error);
    throw error;
  }

  return transformCalibrationRow(data);
}

/**
 * Record the actual outcome for a prediction
 */
export async function recordOutcome(
  decisionId: string,
  actualOutcome: number,
  outcomeNotes?: string
): Promise<CalibrationRecord> {
  const supabase = createServiceClient();

  // Validate outcome is between 0 and 1
  if (actualOutcome < 0 || actualOutcome > 1) {
    throw new Error("Outcome must be between 0 and 1");
  }

  const { data, error } = await supabase
    .from("fred_calibration_records")
    .update({
      actual_outcome: actualOutcome,
      outcome_notes: outcomeNotes || null,
      outcome_recorded_at: new Date().toISOString(),
    })
    .eq("decision_id", decisionId)
    .select()
    .single();

  if (error) {
    console.error("[FRED Calibration] Error recording outcome:", error);
    throw error;
  }

  return transformCalibrationRow(data);
}

/**
 * Get a calibration record by decision ID
 */
export async function getCalibrationRecord(
  decisionId: string
): Promise<CalibrationRecord | null> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("fred_calibration_records")
    .select("*")
    .eq("decision_id", decisionId)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null; // Not found
    console.error("[FRED Calibration] Error getting record:", error);
    throw error;
  }

  return transformCalibrationRow(data);
}

/**
 * Get all calibration records for a user
 */
export async function getUserCalibrationRecords(
  userId: string,
  options: {
    limit?: number;
    onlyWithOutcomes?: boolean;
  } = {}
): Promise<CalibrationRecord[]> {
  const supabase = createServiceClient();
  const { limit = 100, onlyWithOutcomes = false } = options;

  let query = supabase
    .from("fred_calibration_records")
    .select("*")
    .eq("user_id", userId)
    .order("predicted_at", { ascending: false })
    .limit(limit);

  if (onlyWithOutcomes) {
    query = query.not("actual_outcome", "is", null);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[FRED Calibration] Error getting user records:", error);
    throw error;
  }

  return data.map(transformCalibrationRow);
}

// ============================================================================
// Calibration Metrics Calculation
// ============================================================================

/**
 * Calculate calibration metrics from recorded outcomes
 */
export async function getCalibrationMetrics(
  options: {
    userId?: string;
    decisionType?: string;
    minSamples?: number;
  } = {}
): Promise<CalibrationMetrics | null> {
  const supabase = createServiceClient();
  const { userId, decisionType, minSamples = 10 } = options;

  // Build query
  let query = supabase
    .from("fred_calibration_records")
    .select("*")
    .not("actual_outcome", "is", null);

  if (userId) {
    query = query.eq("user_id", userId);
  }

  if (decisionType) {
    query = query.eq("decision_type", decisionType);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[FRED Calibration] Error getting metrics:", error);
    throw error;
  }

  const records = data.map(transformCalibrationRow);

  if (records.length < minSamples) {
    return null; // Not enough data for meaningful metrics
  }

  return calculateMetrics(records);
}

/**
 * Calculate metrics from records
 */
function calculateMetrics(records: CalibrationRecord[]): CalibrationMetrics {
  const n = records.length;

  // Calculate Brier score (mean squared error of probability predictions)
  let brierSum = 0;
  let maeSum = 0;

  for (const record of records) {
    const predicted = record.predictedScore;
    const actual = record.actualOutcome!;
    brierSum += Math.pow(predicted - actual, 2);
    maeSum += Math.abs(predicted - actual);
  }

  const brierScore = brierSum / n;
  const mae = maeSum / n;

  // Calculate correlation
  const correlation = calculateCorrelation(
    records.map((r) => r.predictedScore),
    records.map((r) => r.actualOutcome!)
  );

  // Calculate calibration by confidence buckets
  const calibrationByConfidence = calculateConfidenceBuckets(records);

  // Calculate calibration by decision type
  const calibrationByType = calculateTypeCalibration(records);

  return {
    sampleSize: n,
    brierScore,
    mae,
    correlation,
    calibrationByConfidence,
    calibrationByType,
  };
}

/**
 * Calculate Pearson correlation coefficient
 */
function calculateCorrelation(x: number[], y: number[]): number {
  const n = x.length;
  if (n === 0) return 0;

  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((total, xi, i) => total + xi * y[i], 0);
  const sumX2 = x.reduce((total, xi) => total + xi * xi, 0);
  const sumY2 = y.reduce((total, yi) => total + yi * yi, 0);

  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt(
    (n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY)
  );

  return denominator === 0 ? 0 : numerator / denominator;
}

/**
 * Calculate calibration by confidence buckets
 */
function calculateConfidenceBuckets(
  records: CalibrationRecord[]
): CalibrationMetrics["calibrationByConfidence"] {
  const buckets: Array<{
    confidenceRange: [number, number];
    predictions: number[];
    outcomes: number[];
  }> = [
    { confidenceRange: [0, 0.4], predictions: [], outcomes: [] },
    { confidenceRange: [0.4, 0.6], predictions: [], outcomes: [] },
    { confidenceRange: [0.6, 0.8], predictions: [], outcomes: [] },
    { confidenceRange: [0.8, 1.0], predictions: [], outcomes: [] },
  ];

  for (const record of records) {
    const confidence = record.predictedConfidence;
    const bucket = buckets.find(
      (b) => confidence >= b.confidenceRange[0] && confidence < b.confidenceRange[1]
    );

    if (bucket) {
      bucket.predictions.push(record.predictedScore);
      bucket.outcomes.push(record.actualOutcome!);
    }
  }

  return buckets.map((bucket) => {
    const count = bucket.predictions.length;
    if (count === 0) {
      return {
        confidenceRange: bucket.confidenceRange,
        count: 0,
        averagePrediction: 0,
        averageOutcome: 0,
        accuracy: 0,
      };
    }

    const avgPrediction =
      bucket.predictions.reduce((a, b) => a + b, 0) / count;
    const avgOutcome = bucket.outcomes.reduce((a, b) => a + b, 0) / count;

    // Accuracy = 1 - |avg_prediction - avg_outcome|
    const accuracy = 1 - Math.abs(avgPrediction - avgOutcome);

    return {
      confidenceRange: bucket.confidenceRange,
      count,
      averagePrediction: avgPrediction,
      averageOutcome: avgOutcome,
      accuracy,
    };
  });
}

/**
 * Calculate calibration by decision type
 */
function calculateTypeCalibration(
  records: CalibrationRecord[]
): CalibrationMetrics["calibrationByType"] {
  const byType: Record<
    string,
    { predictions: number[]; outcomes: number[] }
  > = {};

  for (const record of records) {
    if (!byType[record.decisionType]) {
      byType[record.decisionType] = { predictions: [], outcomes: [] };
    }
    byType[record.decisionType].predictions.push(record.predictedScore);
    byType[record.decisionType].outcomes.push(record.actualOutcome!);
  }

  const result: CalibrationMetrics["calibrationByType"] = {};

  for (const [type, data] of Object.entries(byType)) {
    const n = data.predictions.length;
    if (n === 0) continue;

    let brierSum = 0;
    let maeSum = 0;

    for (let i = 0; i < n; i++) {
      brierSum += Math.pow(data.predictions[i] - data.outcomes[i], 2);
      maeSum += Math.abs(data.predictions[i] - data.outcomes[i]);
    }

    result[type] = {
      count: n,
      brierScore: brierSum / n,
      mae: maeSum / n,
    };
  }

  return result;
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Transform database row to CalibrationRecord
 */
function transformCalibrationRow(row: any): CalibrationRecord {
  return {
    id: row.id,
    decisionId: row.decision_id,
    userId: row.user_id,
    predictedScore: row.predicted_score,
    predictedConfidence: row.predicted_confidence,
    predictedRange: row.predicted_range,
    decisionType: row.decision_type,
    factors: row.factors,
    actualOutcome: row.actual_outcome,
    outcomeNotes: row.outcome_notes,
    predictedAt: new Date(row.predicted_at),
    outcomeRecordedAt: row.outcome_recorded_at
      ? new Date(row.outcome_recorded_at)
      : null,
  };
}

/**
 * Check if a prediction was within its uncertainty range
 */
export function wasWithinRange(record: CalibrationRecord): boolean | null {
  if (record.actualOutcome === null) return null;

  const [low, high] = record.predictedRange;
  return record.actualOutcome >= low && record.actualOutcome <= high;
}

/**
 * Calculate prediction error
 */
export function getPredictionError(record: CalibrationRecord): number | null {
  if (record.actualOutcome === null) return null;
  return record.predictedScore - record.actualOutcome;
}
