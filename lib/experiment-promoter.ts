/**
 * Experiment Promoter - Core Promotion Logic
 * Provides utility functions for checking statistical significance,
 * determining clear winners, and applying promotions with audit logging
 */

import { sql } from "@/lib/db/supabase-sql";
import type { VariantMetrics } from "@/lib/monitoring/ab-test-metrics";
import type {
  PromotionConfig,
  PromotionResult,
  PromotionAuditLog,
} from "@/types/promotion";

/**
 * Statistical significance thresholds
 */
const STATISTICAL_THRESHOLDS = {
  /** Z-score for 90% confidence (1.645) */
  CONFIDENCE_90: 1.645,
  /** Z-score for 95% confidence (1.96) */
  CONFIDENCE_95: 1.96,
  /** Z-score for 99% confidence (2.576) */
  CONFIDENCE_99: 2.576,
  /** Z-score for 99.9% confidence (3.291) */
  CONFIDENCE_99_9: 3.291,
} as const;

/**
 * Check if experiment has reached statistical significance
 * Uses Z-test for comparing two proportions
 */
export function hasStatisticalSignificance(
  variant: VariantMetrics,
  control: VariantMetrics,
  confidenceLevel: number = 95
): {
  hasSignificance: boolean;
  zScore: number;
  pValue: number;
  confidence: number;
} {
  // Validate minimum sample sizes
  const MIN_SAMPLE = 30; // Minimum for Central Limit Theorem
  if (variant.sampleSize < MIN_SAMPLE || control.sampleSize < MIN_SAMPLE) {
    return {
      hasSignificance: false,
      zScore: 0,
      pValue: 1,
      confidence: 0,
    };
  }

  const p1 = variant.successRate;
  const p2 = control.successRate;
  const n1 = variant.sampleSize;
  const n2 = control.sampleSize;

  // Pooled proportion
  const pooledP = (p1 * n1 + p2 * n2) / (n1 + n2);

  // Standard error
  const standardError = Math.sqrt(pooledP * (1 - pooledP) * (1 / n1 + 1 / n2));

  // Z-score
  const zScore = Math.abs((p1 - p2) / standardError);

  // Determine required threshold based on confidence level
  let threshold: number;
  switch (confidenceLevel) {
    case 90:
      threshold = STATISTICAL_THRESHOLDS.CONFIDENCE_90;
      break;
    case 95:
      threshold = STATISTICAL_THRESHOLDS.CONFIDENCE_95;
      break;
    case 99:
      threshold = STATISTICAL_THRESHOLDS.CONFIDENCE_99;
      break;
    case 99.9:
      threshold = STATISTICAL_THRESHOLDS.CONFIDENCE_99_9;
      break;
    default:
      threshold = STATISTICAL_THRESHOLDS.CONFIDENCE_95;
  }

  // Calculate p-value (two-tailed)
  const pValue = 2 * (1 - normalCDF(Math.abs(zScore)));

  // Determine actual confidence level achieved
  let actualConfidence = 0;
  if (zScore >= STATISTICAL_THRESHOLDS.CONFIDENCE_99_9) {
    actualConfidence = 99.9;
  } else if (zScore >= STATISTICAL_THRESHOLDS.CONFIDENCE_99) {
    actualConfidence = 99.0;
  } else if (zScore >= STATISTICAL_THRESHOLDS.CONFIDENCE_95) {
    actualConfidence = 95.0;
  } else if (zScore >= STATISTICAL_THRESHOLDS.CONFIDENCE_90) {
    actualConfidence = 90.0;
  }

  return {
    hasSignificance: zScore >= threshold,
    zScore,
    pValue,
    confidence: actualConfidence,
  };
}

/**
 * Calculate if variant has a clear winner (95%+ confidence and meaningful improvement)
 */
export function hasClearWinner(
  variants: VariantMetrics[],
  config: PromotionConfig
): {
  hasWinner: boolean;
  winnerVariant: VariantMetrics | null;
  controlVariant: VariantMetrics | null;
  confidence: number;
  improvement: number;
  reasons: string[];
} {
  // Find control variant
  const control = variants.find((v) => v.variantName.toLowerCase() === "control");
  if (!control) {
    return {
      hasWinner: false,
      winnerVariant: null,
      controlVariant: null,
      confidence: 0,
      improvement: 0,
      reasons: ["No control variant found"],
    };
  }

  // Find best performing variant (excluding control)
  const candidates = variants.filter((v) => v.variantName !== control.variantName);
  if (candidates.length === 0) {
    return {
      hasWinner: false,
      winnerVariant: null,
      controlVariant: control,
      confidence: 0,
      improvement: 0,
      reasons: ["No variant candidates found"],
    };
  }

  const bestCandidate = candidates.reduce((best, current) =>
    current.successRate > best.successRate ? current : best
  );

  // Calculate statistical significance
  const { hasSignificance, confidence, zScore } = hasStatisticalSignificance(
    bestCandidate,
    control,
    config.minConfidenceLevel
  );

  // Calculate improvement percentage
  const improvement =
    ((bestCandidate.successRate - control.successRate) / control.successRate) * 100;

  // Validation reasons
  const reasons: string[] = [];

  // Check sample size
  if (bestCandidate.sampleSize < config.minSampleSize) {
    reasons.push(
      `Insufficient sample size: ${bestCandidate.sampleSize} < ${config.minSampleSize}`
    );
  }

  if (control.sampleSize < config.minSampleSize) {
    reasons.push(
      `Insufficient control sample: ${control.sampleSize} < ${config.minSampleSize}`
    );
  }

  // Check statistical significance
  if (!hasSignificance) {
    reasons.push(
      `Statistical significance not reached (z-score: ${zScore.toFixed(3)}, confidence: ${confidence}%)`
    );
  }

  // Check improvement threshold
  if (improvement < config.minImprovementPercent) {
    reasons.push(
      `Improvement ${improvement.toFixed(2)}% below threshold ${config.minImprovementPercent}%`
    );
  }

  // Check error rate
  if (bestCandidate.errorRate > config.maxErrorRate) {
    reasons.push(
      `Error rate ${(bestCandidate.errorRate * 100).toFixed(2)}% exceeds max ${(config.maxErrorRate * 100).toFixed(2)}%`
    );
  }

  // Determine if we have a clear winner
  const hasWinner =
    hasSignificance &&
    improvement >= config.minImprovementPercent &&
    bestCandidate.sampleSize >= config.minSampleSize &&
    control.sampleSize >= config.minSampleSize &&
    bestCandidate.errorRate <= config.maxErrorRate;

  return {
    hasWinner,
    winnerVariant: hasWinner ? bestCandidate : null,
    controlVariant: control,
    confidence,
    improvement,
    reasons: hasWinner
      ? [`Variant ${bestCandidate.variantName} is a clear winner`]
      : reasons,
  };
}

/**
 * Apply promotion by updating traffic split to 100% winner
 */
export async function applyPromotion(
  experimentId: string,
  winnerVariantId: string,
  strategy: "immediate" | "gradual" = "immediate"
): Promise<PromotionResult> {
  try {
    if (strategy === "gradual") {
      // Gradual rollout: first set to 75%, then 100% after validation
      await sql`
        UPDATE ab_variants
        SET traffic_percentage = CASE
          WHEN id = ${winnerVariantId} THEN 75
          ELSE 25 / (SELECT COUNT(*) - 1 FROM ab_variants WHERE experiment_id = ${experimentId})
        END
        WHERE experiment_id = ${experimentId}
      `;

      console.log(
        `[Promoter] Applied gradual promotion: 75% traffic to winner ${winnerVariantId}`
      );

      return {
        success: true,
        experimentId,
        winnerVariantId,
        strategy: "gradual",
        trafficPercentage: 75,
        message: "Gradual promotion applied (75% traffic)",
        appliedAt: new Date(),
      };
    } else {
      // Immediate rollout: set winner to 100%
      await sql`
        UPDATE ab_variants
        SET traffic_percentage = CASE
          WHEN id = ${winnerVariantId} THEN 100
          ELSE 0
        END
        WHERE experiment_id = ${experimentId}
      `;

      console.log(
        `[Promoter] Applied immediate promotion: 100% traffic to winner ${winnerVariantId}`
      );

      return {
        success: true,
        experimentId,
        winnerVariantId,
        strategy: "immediate",
        trafficPercentage: 100,
        message: "Immediate promotion applied (100% traffic)",
        appliedAt: new Date(),
      };
    }
  } catch (error) {
    console.error(`[Promoter] Error applying promotion:`, error);
    throw new Error(
      `Failed to apply promotion: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Create promotion audit log for compliance
 */
export async function createPromotionAuditLog(
  experimentId: string,
  experimentName: string,
  winnerVariantId: string,
  winnerVariantName: string,
  controlVariantId: string,
  controlVariantName: string,
  metadata: {
    confidence: number;
    improvement: number;
    sampleSize: number;
    promotionType: "auto" | "manual";
    promotedBy?: string;
    strategy: "immediate" | "gradual";
    safetyChecks: Record<string, boolean>;
  }
): Promise<PromotionAuditLog> {
  try {
    const result = await sql`
      INSERT INTO experiment_promotions (
        experiment_id,
        experiment_name,
        promoted_variant_id,
        promoted_variant_name,
        control_variant_id,
        control_variant_name,
        confidence,
        improvement,
        sample_size,
        promotion_type,
        promoted_by,
        promoted_at,
        metadata
      )
      VALUES (
        ${experimentId},
        ${experimentName},
        ${winnerVariantId},
        ${winnerVariantName},
        ${controlVariantId},
        ${controlVariantName},
        ${metadata.confidence},
        ${metadata.improvement},
        ${metadata.sampleSize},
        ${metadata.promotionType},
        ${metadata.promotedBy || null},
        NOW(),
        ${JSON.stringify({
          strategy: metadata.strategy,
          safetyChecks: metadata.safetyChecks,
          timestamp: new Date().toISOString(),
        })}
      )
      RETURNING
        id,
        experiment_id as "experimentId",
        experiment_name as "experimentName",
        promoted_variant_id as "promotedVariantId",
        promoted_variant_name as "promotedVariantName",
        control_variant_id as "controlVariantId",
        control_variant_name as "controlVariantName",
        confidence,
        improvement,
        sample_size as "sampleSize",
        promotion_type as "promotionType",
        promoted_by as "promotedBy",
        promoted_at as "promotedAt",
        rollback_at as "rollbackAt",
        rollback_reason as "rollbackReason",
        metadata
    `;

    const auditLog = result[0] as PromotionAuditLog;

    console.log(
      `[Promoter] Created audit log ${auditLog.id} for experiment ${experimentName}`
    );

    return auditLog;
  } catch (error) {
    console.error(`[Promoter] Error creating audit log:`, error);
    throw new Error(
      `Failed to create audit log: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Archive losing variants (optional cleanup)
 */
export async function archiveLosingVariants(
  experimentId: string,
  winnerVariantId: string
): Promise<void> {
  try {
    await sql`
      UPDATE ab_variants
      SET
        is_archived = true,
        archived_at = NOW()
      WHERE experiment_id = ${experimentId}
        AND id != ${winnerVariantId}
        AND is_archived = false
    `;

    console.log(
      `[Promoter] Archived losing variants for experiment ${experimentId}, keeping winner ${winnerVariantId}`
    );
  } catch (error) {
    console.error(`[Promoter] Error archiving variants:`, error);
    // Don't throw - archiving is optional cleanup
    console.warn(`[Promoter] Continuing despite archival failure`);
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Approximation of the cumulative distribution function for standard normal distribution
 * Using Abramowitz and Stegun approximation
 */
function normalCDF(x: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989423 * Math.exp((-x * x) / 2);
  const prob =
    d *
    t *
    (0.3193815 +
      t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return x > 0 ? 1 - prob : prob;
}
