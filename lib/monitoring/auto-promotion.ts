/**
 * Auto-Promotion System for Experiment Winners
 * Automatically promotes winning variants to production when statistical significance is reached
 */

import { sql } from "@/lib/db/neon";
import { compareExperimentVariants, VariantMetrics } from "./ab-test-metrics";
import { sendNotification } from "@/lib/notifications";

/**
 * Promotion Configuration
 */
export interface PromotionConfig {
  /** Minimum sample size per variant before promotion is allowed */
  minSampleSize: number;
  /** Minimum statistical confidence level (e.g., 95.0 for 95%) */
  minConfidenceLevel: number;
  /** Minimum improvement percentage over control (e.g., 5.0 for 5%) */
  minImprovementPercent: number;
  /** Minimum experiment runtime in hours */
  minRuntimeHours: number;
  /** Maximum error rate threshold for winner (e.g., 0.05 for 5%) */
  maxErrorRate: number;
  /** Require manual approval for promotion */
  requireManualApproval: boolean;
}

/**
 * Default promotion configuration
 */
export const DEFAULT_PROMOTION_CONFIG: PromotionConfig = {
  minSampleSize: 1000,
  minConfidenceLevel: 95.0,
  minImprovementPercent: 5.0,
  minRuntimeHours: 48,
  maxErrorRate: 0.05,
  requireManualApproval: false,
};

/**
 * Promotion Eligibility Result
 */
export interface PromotionEligibility {
  isEligible: boolean;
  winner?: string;
  winnerVariantId?: string;
  confidence?: number;
  improvement?: number;
  reasons: string[];
  warnings: string[];
  safetyChecks: {
    minSampleSize: boolean;
    minConfidence: boolean;
    minImprovement: boolean;
    minRuntime: boolean;
    errorRateAcceptable: boolean;
  };
}

/**
 * Promotion History Entry
 */
export interface PromotionRecord {
  id: string;
  experimentId: string;
  experimentName: string;
  promotedVariantId: string;
  promotedVariantName: string;
  controlVariantId: string;
  controlVariantName: string;
  confidence: number;
  improvement: number;
  sampleSize: number;
  promotionType: "auto" | "manual";
  promotedBy?: string;
  promotedAt: Date;
  rollbackAt?: Date;
  rollbackReason?: string;
  metadata: Record<string, any>;
}

/**
 * Check if an experiment is eligible for auto-promotion
 */
export async function checkPromotionEligibility(
  experimentName: string,
  config: PromotionConfig = DEFAULT_PROMOTION_CONFIG
): Promise<PromotionEligibility> {
  try {
    // Get experiment comparison
    const comparison = await compareExperimentVariants(experimentName);

    if (!comparison.isActive) {
      return {
        isEligible: false,
        reasons: ["Experiment is not active"],
        warnings: [],
        safetyChecks: {
          minSampleSize: false,
          minConfidence: false,
          minImprovement: false,
          minRuntime: false,
          errorRateAcceptable: false,
        },
      };
    }

    // Find control and winning variants
    const control = comparison.variants.find(
      (v) => v.variantName.toLowerCase() === "control"
    );
    const sorted = [...comparison.variants].sort(
      (a, b) => b.successRate - a.successRate
    );
    const potentialWinner = sorted[0];

    if (!control || !potentialWinner) {
      return {
        isEligible: false,
        reasons: ["Missing control or valid variants"],
        warnings: [],
        safetyChecks: {
          minSampleSize: false,
          minConfidence: false,
          minImprovement: false,
          minRuntime: false,
          errorRateAcceptable: false,
        },
      };
    }

    // If winner is control, no promotion needed
    if (potentialWinner.variantName === control.variantName) {
      return {
        isEligible: false,
        reasons: ["Control is the best performing variant - no promotion needed"],
        warnings: [],
        safetyChecks: {
          minSampleSize: true,
          minConfidence: false,
          minImprovement: false,
          minRuntime: true,
          errorRateAcceptable: true,
        },
      };
    }

    // Run safety checks
    const reasons: string[] = [];
    const warnings: string[] = [];

    // Check 1: Sample size
    const hasSufficientSamples =
      potentialWinner.sampleSize >= config.minSampleSize &&
      control.sampleSize >= config.minSampleSize;

    if (!hasSufficientSamples) {
      reasons.push(
        `Insufficient sample size (winner: ${potentialWinner.sampleSize}, control: ${control.sampleSize}, required: ${config.minSampleSize})`
      );
    }

    // Check 2: Statistical significance
    const hasSignificance = comparison.hasStatisticalSignificance;
    const meetsConfidence =
      comparison.confidenceLevel !== undefined &&
      comparison.confidenceLevel >= config.minConfidenceLevel;

    if (!hasSignificance || !meetsConfidence) {
      reasons.push(
        `Statistical significance not reached (confidence: ${comparison.confidenceLevel?.toFixed(1) || "N/A"}%, required: ${config.minConfidenceLevel}%)`
      );
    }

    // Check 3: Improvement threshold
    const improvement =
      ((potentialWinner.successRate - control.successRate) / control.successRate) * 100;
    const meetsImprovement = improvement >= config.minImprovementPercent;

    if (!meetsImprovement) {
      reasons.push(
        `Improvement below threshold (${improvement.toFixed(1)}% vs required ${config.minImprovementPercent}%)`
      );
    }

    // Check 4: Runtime
    const runtimeHours =
      (new Date().getTime() - comparison.startDate.getTime()) / (1000 * 60 * 60);
    const meetsRuntime = runtimeHours >= config.minRuntimeHours;

    if (!meetsRuntime) {
      reasons.push(
        `Experiment runtime too short (${runtimeHours.toFixed(1)}h vs required ${config.minRuntimeHours}h)`
      );
    }

    // Check 5: Error rate
    const errorRateAcceptable = potentialWinner.errorRate <= config.maxErrorRate;

    if (!errorRateAcceptable) {
      reasons.push(
        `Winner error rate too high (${(potentialWinner.errorRate * 100).toFixed(2)}% vs max ${config.maxErrorRate * 100}%)`
      );
    }

    // Add warnings for edge cases
    if (potentialWinner.errorRate > control.errorRate) {
      warnings.push(
        `Winner has higher error rate than control (${(potentialWinner.errorRate * 100).toFixed(2)}% vs ${(control.errorRate * 100).toFixed(2)}%)`
      );
    }

    if (potentialWinner.p95LatencyMs > control.p95LatencyMs * 1.2) {
      warnings.push(
        `Winner has 20%+ higher latency than control (${potentialWinner.p95LatencyMs.toFixed(0)}ms vs ${control.p95LatencyMs.toFixed(0)}ms)`
      );
    }

    const isEligible =
      hasSufficientSamples &&
      hasSignificance &&
      meetsConfidence &&
      meetsImprovement &&
      meetsRuntime &&
      errorRateAcceptable;

    return {
      isEligible,
      winner: isEligible ? potentialWinner.variantName : undefined,
      winnerVariantId: isEligible ? potentialWinner.variantId : undefined,
      confidence: comparison.confidenceLevel,
      improvement,
      reasons: isEligible
        ? [`All safety checks passed for variant: ${potentialWinner.variantName}`]
        : reasons,
      warnings,
      safetyChecks: {
        minSampleSize: hasSufficientSamples,
        minConfidence: meetsConfidence,
        minImprovement: meetsImprovement,
        minRuntime: meetsRuntime,
        errorRateAcceptable,
      },
    };
  } catch (error: any) {
    console.error(
      `[AutoPromotion] Error checking eligibility for ${experimentName}:`,
      error
    );
    throw new Error(`Failed to check promotion eligibility: ${error.message}`);
  }
}

/**
 * Promote a winning variant to production
 */
export async function promoteWinner(
  experimentName: string,
  promotionType: "auto" | "manual" = "auto",
  promotedBy?: string,
  config: PromotionConfig = DEFAULT_PROMOTION_CONFIG
): Promise<PromotionRecord> {
  try {
    // Check eligibility
    const eligibility = await checkPromotionEligibility(experimentName, config);

    if (!eligibility.isEligible) {
      throw new Error(
        `Experiment not eligible for promotion: ${eligibility.reasons.join(", ")}`
      );
    }

    if (config.requireManualApproval && promotionType === "auto") {
      throw new Error("Manual approval required for promotion");
    }

    // Get experiment and variants
    const comparison = await compareExperimentVariants(experimentName);
    const winner = comparison.variants.find(
      (v) => v.variantId === eligibility.winnerVariantId
    );
    const control = comparison.variants.find(
      (v) => v.variantName.toLowerCase() === "control"
    );

    if (!winner || !control) {
      throw new Error("Winner or control variant not found");
    }

    // Create promotion record
    const promotionResult = await sql`
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
        ${comparison.experimentId},
        ${experimentName},
        ${winner.variantId},
        ${winner.variantName},
        ${control.variantId},
        ${control.variantName},
        ${eligibility.confidence},
        ${eligibility.improvement},
        ${winner.sampleSize},
        ${promotionType},
        ${promotedBy || null},
        NOW(),
        ${JSON.stringify({
          warnings: eligibility.warnings,
          safetyChecks: eligibility.safetyChecks,
          metrics: {
            winner: {
              successRate: winner.successRate,
              errorRate: winner.errorRate,
              p95LatencyMs: winner.p95LatencyMs,
            },
            control: {
              successRate: control.successRate,
              errorRate: control.errorRate,
              p95LatencyMs: control.p95LatencyMs,
            },
          },
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
        metadata
    `;

    const record = promotionResult[0] as PromotionRecord;

    // Update experiment to redirect all traffic to winner
    await sql`
      UPDATE ab_variants
      SET traffic_percentage = CASE
        WHEN id = ${winner.variantId} THEN 100
        ELSE 0
      END
      WHERE experiment_id = ${comparison.experimentId}
    `;

    // Optional: Mark experiment as completed
    await sql`
      UPDATE ab_experiments
      SET
        is_active = false,
        end_date = NOW()
      WHERE id = ${comparison.experimentId}
    `;

    console.log(
      `[AutoPromotion] Successfully promoted variant ${winner.variantName} for experiment ${experimentName}`
    );

    return record;
  } catch (error: any) {
    console.error(
      `[AutoPromotion] Error promoting winner for ${experimentName}:`,
      error
    );
    throw new Error(`Failed to promote winner: ${error.message}`);
  }
}

/**
 * Rollback a promotion (revert to control)
 */
export async function rollbackPromotion(
  experimentName: string,
  reason: string,
  rolledBackBy?: string
): Promise<void> {
  try {
    // Find latest promotion
    const promotionResult = await sql`
      SELECT
        id,
        experiment_id as "experimentId",
        control_variant_id as "controlVariantId"
      FROM experiment_promotions
      WHERE experiment_name = ${experimentName}
        AND rollback_at IS NULL
      ORDER BY promoted_at DESC
      LIMIT 1
    `;

    if (promotionResult.length === 0) {
      throw new Error(`No active promotion found for experiment: ${experimentName}`);
    }

    const promotion = promotionResult[0] as any;

    // Revert traffic to control
    await sql`
      UPDATE ab_variants
      SET traffic_percentage = CASE
        WHEN id = ${promotion.controlVariantId} THEN 100
        ELSE 0
      END
      WHERE experiment_id = ${promotion.experimentId}
    `;

    // Mark promotion as rolled back
    await sql`
      UPDATE experiment_promotions
      SET
        rollback_at = NOW(),
        rollback_reason = ${reason},
        metadata = metadata || jsonb_build_object('rolled_back_by', ${rolledBackBy || null})
      WHERE id = ${promotion.id}
    `;

    // Reactivate experiment
    await sql`
      UPDATE ab_experiments
      SET
        is_active = true,
        end_date = NULL
      WHERE id = ${promotion.experimentId}
    `;

    console.log(
      `[AutoPromotion] Successfully rolled back promotion for experiment ${experimentName}`
    );
  } catch (error: any) {
    console.error(
      `[AutoPromotion] Error rolling back promotion for ${experimentName}:`,
      error
    );
    throw new Error(`Failed to rollback promotion: ${error.message}`);
  }
}

/**
 * Get promotion history for an experiment
 */
export async function getPromotionHistory(
  experimentName: string
): Promise<PromotionRecord[]> {
  try {
    const result = await sql`
      SELECT
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
      FROM experiment_promotions
      WHERE experiment_name = ${experimentName}
      ORDER BY promoted_at DESC
    `;

    return result as PromotionRecord[];
  } catch (error: any) {
    console.error(
      `[AutoPromotion] Error fetching promotion history for ${experimentName}:`,
      error
    );
    throw new Error(`Failed to fetch promotion history: ${error.message}`);
  }
}

/**
 * Send promotion notification to admin
 */
export async function notifyPromotion(
  userId: string,
  record: PromotionRecord,
  eligibility: PromotionEligibility
): Promise<void> {
  try {
    await sendNotification({
      userId,
      level: "info",
      type: "significance",
      title: `🚀 Experiment Winner Auto-Promoted`,
      message: `Variant "${record.promotedVariantName}" has been promoted to production for experiment "${record.experimentName}". Improvement: ${record.improvement.toFixed(1)}%, Confidence: ${record.confidence.toFixed(1)}%`,
      experimentName: record.experimentName,
      variantName: record.promotedVariantName,
      metric: "promotion",
      value: record.improvement,
      threshold: 0,
      metadata: {
        promotionId: record.id,
        promotionType: record.promotionType,
        sampleSize: record.sampleSize,
        warnings: eligibility.warnings,
        promotedAt: record.promotedAt.toISOString(),
      },
    });

    console.log(
      `[AutoPromotion] Sent promotion notification for experiment ${record.experimentName}`
    );
  } catch (error: any) {
    console.error(
      `[AutoPromotion] Error sending promotion notification:`,
      error
    );
    // Don't throw - notification failure shouldn't block promotion
  }
}

/**
 * Auto-check all active experiments for promotion eligibility
 * This should be run periodically (e.g., hourly via cron)
 */
export async function autoCheckPromotions(
  userId: string,
  config: PromotionConfig = DEFAULT_PROMOTION_CONFIG
): Promise<{
  checked: number;
  promoted: number;
  eligible: string[];
  promoted_experiments: string[];
}> {
  try {
    // Get all active experiments
    const experimentsResult = await sql`
      SELECT name
      FROM ab_experiments
      WHERE is_active = true
        AND (end_date IS NULL OR end_date > NOW())
      ORDER BY start_date DESC
    `;

    const checked = experimentsResult.length;
    const eligible: string[] = [];
    const promoted_experiments: string[] = [];

    for (const exp of experimentsResult) {
      try {
        const experimentName = (exp as any).name;
        const eligibility = await checkPromotionEligibility(experimentName, config);

        if (eligibility.isEligible) {
          eligible.push(experimentName);

          // Auto-promote if not requiring manual approval
          if (!config.requireManualApproval) {
            const record = await promoteWinner(experimentName, "auto", undefined, config);
            await notifyPromotion(userId, record, eligibility);
            promoted_experiments.push(experimentName);
          }
        }
      } catch (error: any) {
        console.error(
          `[AutoPromotion] Error checking experiment ${(exp as any).name}:`,
          error
        );
        // Continue checking other experiments
      }
    }

    console.log(
      `[AutoPromotion] Auto-check completed: ${checked} checked, ${promoted_experiments.length} promoted`
    );

    return {
      checked,
      promoted: promoted_experiments.length,
      eligible,
      promoted_experiments,
    };
  } catch (error: any) {
    console.error(`[AutoPromotion] Error in auto-check:`, error);
    throw new Error(`Auto-check failed: ${error.message}`);
  }
}
