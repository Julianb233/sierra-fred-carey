/**
 * A/B Testing Auto-Promotion Engine
 * Automatically promotes winning variants based on statistical significance
 * with comprehensive audit logging and rollback capabilities
 */

import { sql } from "@/lib/db/supabase-sql";
import { compareExperimentVariants, type VariantMetrics } from "@/lib/monitoring/ab-test-metrics";
import {
  evaluatePromotionEligibility,
  type PromotionRules,
  type PromotionEligibility,
} from "./promotion-rules";

export interface PromotionAuditLog {
  id: string;
  experimentId: string;
  experimentName: string;
  winningVariantId: string;
  winningVariantName: string;
  previousWinnerId: string | null;
  action: "promoted" | "rolled_back" | "promotion_attempted";
  triggeredBy: "auto" | "manual";
  userId: string | null;
  confidenceLevel: number;
  improvement: number;
  sampleSize: number;
  safetyChecksJson: string; // JSON of safety checks
  reason: string;
  promotedAt: Date;
  rolledBackAt?: Date;
  rollbackReason?: string;
}

export interface PromotionResult {
  success: boolean;
  experimentId: string;
  experimentName: string;
  winningVariant: string | null;
  action: "promoted" | "already_promoted" | "ineligible" | "failed";
  message: string;
  auditLogId?: string;
  eligibility?: PromotionEligibility;
  error?: string;
}

export interface RollbackResult {
  success: boolean;
  experimentId: string;
  experimentName: string;
  rolledBackTo: string | null;
  message: string;
  auditLogId?: string;
  error?: string;
}

/**
 * Check if an experiment has reached statistical significance
 * and is ready for promotion
 */
export async function checkPromotionEligibility(
  experimentName: string,
  customRules?: Partial<PromotionRules>
): Promise<PromotionEligibility> {
  console.log(`[Auto-Promotion] Checking eligibility for ${experimentName}`);

  try {
    // Get experiment data from monitoring system
    const comparison = await compareExperimentVariants(experimentName);

    // Get experiment details
    const experimentResult = await sql`
      SELECT
        id,
        name,
        start_date as "startDate",
        is_active as "isActive"
      FROM ab_experiments
      WHERE name = ${experimentName}
    `;

    if (experimentResult.length === 0) {
      throw new Error(`Experiment not found: ${experimentName}`);
    }

    const experiment = experimentResult[0] as any;

    // Calculate test duration
    const startDate = new Date(experiment.startDate);
    const now = new Date();
    const testDurationHours = (now.getTime() - startDate.getTime()) / (1000 * 60 * 60);

    // Find winning variant and control
    let winningVariant: VariantMetrics | null = null;
    let controlVariant: VariantMetrics | null = null;

    if (comparison.hasStatisticalSignificance && comparison.winningVariant) {
      winningVariant = comparison.variants.find(
        (v) => v.variantName === comparison.winningVariant
      ) || null;
      controlVariant = comparison.variants.find(
        (v) => v.variantName === "control"
      ) || comparison.variants.find(
        (v) => v.variantName !== comparison.winningVariant
      ) || null;
    }

    // Evaluate eligibility
    const eligibility = evaluatePromotionEligibility(
      {
        experimentId: experiment.id,
        experimentName: experiment.name,
        winningVariant: winningVariant ? {
          variantName: winningVariant.variantName,
          sampleSize: winningVariant.sampleSize,
          errorRate: winningVariant.errorRate,
          p95LatencyMs: winningVariant.p95LatencyMs,
          successRate: winningVariant.successRate,
        } : null,
        controlVariant: controlVariant ? {
          variantName: controlVariant.variantName,
          sampleSize: controlVariant.sampleSize,
          errorRate: controlVariant.errorRate,
          p95LatencyMs: controlVariant.p95LatencyMs,
          successRate: controlVariant.successRate,
        } : null,
        confidenceLevel: comparison.confidenceLevel || null,
        testDurationHours,
      },
      customRules
    );

    console.log(
      `[Auto-Promotion] Eligibility for ${experimentName}: ${eligibility.recommendation} - ${eligibility.reason}`
    );

    return eligibility;
  } catch (error) {
    console.error(`[Auto-Promotion] Error checking eligibility:`, error);
    throw error;
  }
}

/**
 * Automatically promote the winning variant
 * Sets winning variant to 100% traffic and deactivates others
 */
export async function promoteWinningVariant(
  experimentName: string,
  options: {
    userId?: string;
    triggeredBy?: "auto" | "manual";
    customRules?: Partial<PromotionRules>;
    force?: boolean; // Skip safety checks (use with caution!)
  } = {}
): Promise<PromotionResult> {
  const { userId = null, triggeredBy = "auto", customRules, force = false } = options;

  console.log(`[Auto-Promotion] Promoting winner for ${experimentName} (triggered by: ${triggeredBy})`);

  try {
    // Check eligibility (unless forced)
    if (!force) {
      const eligibility = await checkPromotionEligibility(experimentName, customRules);

      if (!eligibility.eligible && eligibility.recommendation !== "manual_review") {
        console.log(`[Auto-Promotion] Not eligible for promotion: ${eligibility.reason}`);
        return {
          success: false,
          experimentId: eligibility.experimentId,
          experimentName: eligibility.experimentName,
          winningVariant: eligibility.winningVariant,
          action: "ineligible",
          message: eligibility.reason,
          eligibility,
        };
      }

      // If manual review recommended but auto-triggered, don't promote
      if (eligibility.recommendation === "manual_review" && triggeredBy === "auto") {
        console.log(`[Auto-Promotion] Manual review required, skipping auto-promotion`);
        return {
          success: false,
          experimentId: eligibility.experimentId,
          experimentName: eligibility.experimentName,
          winningVariant: eligibility.winningVariant,
          action: "ineligible",
          message: "Manual review required",
          eligibility,
        };
      }
    }

    // Get experiment and variants
    const experimentResult = await sql`
      SELECT id, name
      FROM ab_experiments
      WHERE name = ${experimentName}
        AND is_active = true
    `;

    if (experimentResult.length === 0) {
      throw new Error(`Active experiment not found: ${experimentName}`);
    }

    const experiment = experimentResult[0] as any;

    // Get current comparison to find winner
    const comparison = await compareExperimentVariants(experimentName);

    if (!comparison.hasStatisticalSignificance || !comparison.winningVariant) {
      return {
        success: false,
        experimentId: experiment.id,
        experimentName: experiment.name,
        winningVariant: null,
        action: "ineligible",
        message: "No statistically significant winner found",
      };
    }

    // Get variant IDs
    const variantsResult = await sql`
      SELECT
        id,
        variant_name as "variantName",
        traffic_percentage as "trafficPercentage"
      FROM ab_variants
      WHERE experiment_id = ${experiment.id}
    `;

    const winningVariant = variantsResult.find(
      (v: any) => v.variantName === comparison.winningVariant
    );

    if (!winningVariant) {
      throw new Error(`Winning variant not found: ${comparison.winningVariant}`);
    }

    // Check if already promoted (100% traffic)
    if (parseFloat(winningVariant.trafficPercentage) === 100) {
      console.log(`[Auto-Promotion] Already promoted: ${comparison.winningVariant}`);
      return {
        success: true,
        experimentId: experiment.id,
        experimentName: experiment.name,
        winningVariant: comparison.winningVariant,
        action: "already_promoted",
        message: `Variant '${comparison.winningVariant}' is already at 100% traffic`,
      };
    }

    // Find previous winner (variant with highest traffic)
    const previousWinner = variantsResult.reduce((prev: any, curr: any) => {
      return parseFloat(curr.trafficPercentage) > parseFloat(prev.trafficPercentage)
        ? curr
        : prev;
    }, variantsResult[0]);

    // Promote: Set winner to 100%, others to 0%
    const promotionTimestamp = new Date();

    for (const variant of variantsResult) {
      const newTraffic = variant.id === winningVariant.id ? 100 : 0;

      await sql`
        UPDATE ab_variants
        SET traffic_percentage = ${newTraffic}
        WHERE id = ${variant.id}
      `;
    }

    // Get eligibility data for audit log
    const eligibility = force
      ? null
      : await checkPromotionEligibility(experimentName, customRules);

    // Create audit log entry
    const auditLogResult = await sql`
      INSERT INTO ab_promotion_audit_log (
        experiment_id,
        experiment_name,
        winning_variant_id,
        winning_variant_name,
        previous_winner_id,
        action,
        triggered_by,
        user_id,
        confidence_level,
        improvement,
        sample_size,
        safety_checks_json,
        reason,
        promoted_at
      )
      VALUES (
        ${experiment.id},
        ${experiment.name},
        ${winningVariant.id},
        ${winningVariant.variantName},
        ${previousWinner.id},
        'promoted',
        ${triggeredBy},
        ${userId},
        ${eligibility?.confidenceLevel || null},
        ${eligibility?.improvement || null},
        ${comparison.variants.find(v => v.variantName === comparison.winningVariant)?.sampleSize || 0},
        ${JSON.stringify(eligibility?.safetyChecks || [])},
        ${eligibility?.reason || "Forced promotion"},
        ${promotionTimestamp.toISOString()}
      )
      RETURNING id
    `;

    const auditLogId = auditLogResult[0]?.id as string;

    console.log(
      `[Auto-Promotion] Successfully promoted ${comparison.winningVariant} to 100% (audit log: ${auditLogId})`
    );

    return {
      success: true,
      experimentId: experiment.id,
      experimentName: experiment.name,
      winningVariant: comparison.winningVariant,
      action: "promoted",
      message: `Successfully promoted '${comparison.winningVariant}' to 100% traffic`,
      auditLogId,
      eligibility: eligibility || undefined,
    };
  } catch (error) {
    console.error(`[Auto-Promotion] Error promoting variant:`, error);
    return {
      success: false,
      experimentId: "",
      experimentName: experimentName,
      winningVariant: null,
      action: "failed",
      message: "Failed to promote variant",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Rollback a promotion to previous state
 * Useful if issues are detected after promotion
 */
export async function rollbackPromotion(
  experimentName: string,
  options: {
    userId?: string;
    reason: string;
    restoreTraffic?: Record<string, number>; // Optional manual traffic distribution
  }
): Promise<RollbackResult> {
  const { userId = null, reason, restoreTraffic } = options;

  console.log(`[Auto-Promotion] Rolling back promotion for ${experimentName}`);

  try {
    // Get experiment
    const experimentResult = await sql`
      SELECT id, name
      FROM ab_experiments
      WHERE name = ${experimentName}
    `;

    if (experimentResult.length === 0) {
      throw new Error(`Experiment not found: ${experimentName}`);
    }

    const experiment = experimentResult[0] as any;

    // Get most recent promotion
    const promotionResult = await sql`
      SELECT
        id,
        winning_variant_id as "winningVariantId",
        winning_variant_name as "winningVariantName",
        previous_winner_id as "previousWinnerId",
        promoted_at as "promotedAt"
      FROM ab_promotion_audit_log
      WHERE experiment_id = ${experiment.id}
        AND action = 'promoted'
        AND rolled_back_at IS NULL
      ORDER BY promoted_at DESC
      LIMIT 1
    `;

    if (promotionResult.length === 0) {
      throw new Error(`No active promotion found for ${experimentName}`);
    }

    const promotion = promotionResult[0] as any;

    // Get all variants
    const variantsResult = await sql`
      SELECT
        id,
        variant_name as "variantName"
      FROM ab_variants
      WHERE experiment_id = ${experiment.id}
    `;

    // Determine rollback traffic distribution
    let trafficDistribution: Record<string, number>;

    if (restoreTraffic) {
      // Use provided traffic distribution
      trafficDistribution = restoreTraffic;
    } else {
      // Default: equal distribution among all variants
      const equalTraffic = 100 / variantsResult.length;
      trafficDistribution = {};
      for (const variant of variantsResult) {
        trafficDistribution[variant.id] = equalTraffic;
      }
    }

    // Validate traffic sums to 100%
    const totalTraffic = Object.values(trafficDistribution).reduce((a, b) => a + b, 0);
    if (Math.abs(totalTraffic - 100) > 0.01) {
      throw new Error(
        `Traffic distribution must sum to 100%, got ${totalTraffic.toFixed(2)}%`
      );
    }

    // Apply rollback traffic
    for (const [variantId, traffic] of Object.entries(trafficDistribution)) {
      await sql`
        UPDATE ab_variants
        SET traffic_percentage = ${traffic}
        WHERE id = ${variantId}
      `;
    }

    // Update audit log
    const rollbackTimestamp = new Date();
    await sql`
      UPDATE ab_promotion_audit_log
      SET
        rolled_back_at = ${rollbackTimestamp.toISOString()},
        rollback_reason = ${reason}
      WHERE id = ${promotion.id}
    `;

    // Create rollback audit entry
    const rollbackAuditResult = await sql`
      INSERT INTO ab_promotion_audit_log (
        experiment_id,
        experiment_name,
        winning_variant_id,
        winning_variant_name,
        previous_winner_id,
        action,
        triggered_by,
        user_id,
        reason,
        promoted_at
      )
      VALUES (
        ${experiment.id},
        ${experiment.name},
        ${promotion.previousWinnerId},
        'rolled_back',
        ${promotion.winningVariantId},
        'rolled_back',
        'manual',
        ${userId},
        ${reason},
        ${rollbackTimestamp.toISOString()}
      )
      RETURNING id
    `;

    const rollbackAuditId = rollbackAuditResult[0]?.id as string;

    console.log(
      `[Auto-Promotion] Successfully rolled back promotion for ${experimentName} (audit log: ${rollbackAuditId})`
    );

    return {
      success: true,
      experimentId: experiment.id,
      experimentName: experiment.name,
      rolledBackTo: promotion.previousWinnerId,
      message: `Successfully rolled back promotion: ${reason}`,
      auditLogId: rollbackAuditId,
    };
  } catch (error) {
    console.error(`[Auto-Promotion] Error rolling back promotion:`, error);
    return {
      success: false,
      experimentId: "",
      experimentName: experimentName,
      rolledBackTo: null,
      message: "Failed to rollback promotion",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get promotion history for an experiment
 */
export async function getPromotionHistory(
  experimentName: string
): Promise<PromotionAuditLog[]> {
  try {
    const result = await sql`
      SELECT
        id,
        experiment_id as "experimentId",
        experiment_name as "experimentName",
        winning_variant_id as "winningVariantId",
        winning_variant_name as "winningVariantName",
        previous_winner_id as "previousWinnerId",
        action,
        triggered_by as "triggeredBy",
        user_id as "userId",
        confidence_level as "confidenceLevel",
        improvement,
        sample_size as "sampleSize",
        safety_checks_json as "safetyChecksJson",
        reason,
        promoted_at as "promotedAt",
        rolled_back_at as "rolledBackAt",
        rollback_reason as "rollbackReason"
      FROM ab_promotion_audit_log
      WHERE experiment_name = ${experimentName}
      ORDER BY promoted_at DESC
    `;

    return result.map((row: any) => ({
      ...row,
      promotedAt: new Date(row.promotedAt),
      rolledBackAt: row.rolledBackAt ? new Date(row.rolledBackAt) : undefined,
    }));
  } catch (error) {
    console.error(`[Auto-Promotion] Error fetching promotion history:`, error);
    throw error;
  }
}

/**
 * Check all active experiments for auto-promotion eligibility
 * Useful for scheduled jobs that check experiments periodically
 */
export async function checkAllExperimentsForPromotion(
  customRules?: Partial<PromotionRules>
): Promise<{
  checked: number;
  eligible: string[];
  promoted: string[];
  errors: Array<{ experimentName: string; error: string }>;
}> {
  console.log(`[Auto-Promotion] Checking all active experiments`);

  try {
    // Get all active experiments
    const experimentsResult = await sql`
      SELECT name
      FROM ab_experiments
      WHERE is_active = true
        AND (end_date IS NULL OR end_date > NOW())
      ORDER BY start_date ASC
    `;

    const results = {
      checked: experimentsResult.length,
      eligible: [] as string[],
      promoted: [] as string[],
      errors: [] as Array<{ experimentName: string; error: string }>,
    };

    for (const experiment of experimentsResult) {
      const experimentName = (experiment as any).name;

      try {
        // Check eligibility
        const eligibility = await checkPromotionEligibility(
          experimentName,
          customRules
        );

        if (eligibility.eligible && eligibility.recommendation === "promote") {
          results.eligible.push(experimentName);

          // Attempt auto-promotion
          const promotionResult = await promoteWinningVariant(experimentName, {
            triggeredBy: "auto",
            customRules,
          });

          if (promotionResult.success && promotionResult.action === "promoted") {
            results.promoted.push(experimentName);
          }
        }
      } catch (error) {
        console.error(
          `[Auto-Promotion] Error checking experiment ${experimentName}:`,
          error
        );
        results.errors.push({
          experimentName,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    console.log(
      `[Auto-Promotion] Checked ${results.checked} experiments, found ${results.eligible.length} eligible, promoted ${results.promoted.length}`
    );

    return results;
  } catch (error) {
    console.error(`[Auto-Promotion] Error checking experiments:`, error);
    throw error;
  }
}
