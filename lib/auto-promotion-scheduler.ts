/**
 * Auto-Promotion Scheduler
 * Periodically checks experiments for promotion eligibility and automatically promotes winners
 * Implements rules-based promotion with configurable thresholds and notifications
 */

import { sql } from "@/lib/db/supabase-sql";
import { compareExperimentVariants } from "@/lib/monitoring/ab-test-metrics";
import {
  hasClearWinner,
  applyPromotion,
  createPromotionAuditLog,
  archiveLosingVariants,
} from "@/lib/experiment-promoter";
import { sendNotification } from "@/lib/notifications";
import type { PromotionConfig } from "@/types/promotion";
import { logger } from "@/lib/logger";

/**
 * Scheduler configuration
 */
export interface SchedulerConfig extends PromotionConfig {
  /** Enable auto-promotion (can be disabled globally) */
  enabled: boolean;
  /** Dry run mode - check but don't actually promote */
  dryRun: boolean;
  /** Archive losing variants after promotion */
  archiveLosingVariants: boolean;
  /** Send notifications on promotion */
  sendNotifications: boolean;
  /** User ID to notify (admin) */
  notificationUserId?: string;
}

/**
 * Default scheduler configuration
 */
export const DEFAULT_SCHEDULER_CONFIG: SchedulerConfig = {
  enabled: process.env.AUTO_PROMOTION_ENABLED !== "false",
  dryRun: process.env.AUTO_PROMOTION_DRY_RUN === "true",
  minSampleSize: parseInt(process.env.AUTO_PROMOTION_MIN_SAMPLE || "1000", 10),
  minConfidenceLevel: parseFloat(process.env.AUTO_PROMOTION_MIN_CONFIDENCE || "95"),
  minImprovementPercent: parseFloat(
    process.env.AUTO_PROMOTION_MIN_IMPROVEMENT || "5"
  ),
  minRuntimeHours: parseFloat(process.env.AUTO_PROMOTION_MIN_RUNTIME || "48"),
  maxErrorRate: parseFloat(process.env.AUTO_PROMOTION_MAX_ERROR_RATE || "0.05"),
  requireManualApproval: process.env.AUTO_PROMOTION_REQUIRE_MANUAL === "true",
  archiveLosingVariants: process.env.AUTO_PROMOTION_ARCHIVE_LOSERS !== "false",
  sendNotifications: process.env.AUTO_PROMOTION_SEND_NOTIFICATIONS !== "false",
  notificationUserId: process.env.AUTO_PROMOTION_NOTIFICATION_USER_ID,
};

/**
 * Results from a scheduler run
 */
export interface SchedulerRunResult {
  runId: string;
  startTime: Date;
  endTime: Date;
  durationMs: number;
  experimentsChecked: number;
  experimentsEligible: number;
  experimentsPromoted: number;
  errors: Array<{ experimentName: string; error: string }>;
  promotions: Array<{
    experimentName: string;
    experimentId: string;
    winnerVariant: string;
    confidence: number;
    improvement: number;
  }>;
}

/**
 * Check all experiments ready for promotion
 * Main entry point for the scheduler
 */
export async function checkExperimentsForPromotion(
  config: Partial<SchedulerConfig> = {}
): Promise<SchedulerRunResult> {
  const runId = `auto-promo-${Date.now()}`;
  const startTime = new Date();
  const finalConfig = { ...DEFAULT_SCHEDULER_CONFIG, ...config };

  logger.log(`[Auto-Promotion Scheduler] Starting run ${runId}`, {
    enabled: finalConfig.enabled,
    dryRun: finalConfig.dryRun,
  });

  const result: SchedulerRunResult = {
    runId,
    startTime,
    endTime: new Date(),
    durationMs: 0,
    experimentsChecked: 0,
    experimentsEligible: 0,
    experimentsPromoted: 0,
    errors: [],
    promotions: [],
  };

  // If disabled, return early
  if (!finalConfig.enabled) {
    logger.log(`[Auto-Promotion Scheduler] Auto-promotion is disabled`);
    result.endTime = new Date();
    result.durationMs = result.endTime.getTime() - result.startTime.getTime();
    return result;
  }

  try {
    // Get all active experiments
    const experimentsResult = await sql`
      SELECT
        id,
        name,
        start_date as "startDate",
        is_active as "isActive"
      FROM ab_experiments
      WHERE is_active = true
        AND (end_date IS NULL OR end_date > NOW())
      ORDER BY start_date ASC
    `;

    result.experimentsChecked = experimentsResult.length;

    logger.log(
      `[Auto-Promotion Scheduler] Found ${result.experimentsChecked} active experiments`
    );

    // Check each experiment
    for (const exp of experimentsResult) {
      const experiment = exp as {
        id: string;
        name: string;
        startDate: string;
        isActive: boolean;
      };

      try {
        await checkAndPromoteExperiment(experiment, finalConfig, result);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        console.error(
          `[Auto-Promotion Scheduler] Error processing experiment ${experiment.name}:`,
          errorMessage
        );
        result.errors.push({
          experimentName: experiment.name,
          error: errorMessage,
        });
      }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error(`[Auto-Promotion Scheduler] Critical error:`, errorMessage);
    result.errors.push({
      experimentName: "SYSTEM",
      error: errorMessage,
    });
  }

  result.endTime = new Date();
  result.durationMs = result.endTime.getTime() - result.startTime.getTime();

  logger.log(
    `[Auto-Promotion Scheduler] Run ${runId} completed in ${result.durationMs}ms`,
    {
      checked: result.experimentsChecked,
      eligible: result.experimentsEligible,
      promoted: result.experimentsPromoted,
      errors: result.errors.length,
    }
  );

  return result;
}

/**
 * Check a single experiment and promote if eligible
 */
async function checkAndPromoteExperiment(
  experiment: {
    id: string;
    name: string;
    startDate: string;
    isActive: boolean;
  },
  config: SchedulerConfig,
  result: SchedulerRunResult
): Promise<void> {
  // Check runtime requirement
  const runtimeHours =
    (Date.now() - new Date(experiment.startDate).getTime()) / (1000 * 60 * 60);

  if (runtimeHours < config.minRuntimeHours) {
    logger.log(
      `[Auto-Promotion Scheduler] Experiment ${experiment.name} runtime ${runtimeHours.toFixed(1)}h < required ${config.minRuntimeHours}h - skipping`
    );
    return;
  }

  // Get experiment metrics
  const comparison = await compareExperimentVariants(experiment.name);

  // Determine if there's a clear winner
  const winnerAnalysis = hasClearWinner(comparison.variants, config);

  if (!winnerAnalysis.hasWinner) {
    logger.log(
      `[Auto-Promotion Scheduler] Experiment ${experiment.name} not ready for promotion:`,
      winnerAnalysis.reasons
    );
    return;
  }

  // Mark as eligible
  result.experimentsEligible++;

  logger.log(
    `[Auto-Promotion Scheduler] Experiment ${experiment.name} is eligible for promotion`,
    {
      winner: winnerAnalysis.winnerVariant!.variantName,
      confidence: winnerAnalysis.confidence,
      improvement: winnerAnalysis.improvement.toFixed(2),
    }
  );

  // Check manual approval requirement
  if (config.requireManualApproval) {
    logger.log(
      `[Auto-Promotion Scheduler] Manual approval required for ${experiment.name} - notifying admin`
    );

    if (config.sendNotifications && config.notificationUserId) {
      await sendPromotionNotification(
        config.notificationUserId,
        experiment.name,
        winnerAnalysis,
        "approval_required"
      );
    }

    return;
  }

  // Dry run mode - don't actually promote
  if (config.dryRun) {
    logger.log(
      `[Auto-Promotion Scheduler] DRY RUN: Would promote ${winnerAnalysis.winnerVariant!.variantName} for ${experiment.name}`
    );
    return;
  }

  // Apply promotion
  try {
    const promotionResult = await applyPromotion(
      experiment.id,
      winnerAnalysis.winnerVariant!.variantId,
      "immediate"
    );

    // Create audit log
    const auditLog = await createPromotionAuditLog(
      experiment.id,
      experiment.name,
      winnerAnalysis.winnerVariant!.variantId,
      winnerAnalysis.winnerVariant!.variantName,
      winnerAnalysis.controlVariant!.variantId,
      winnerAnalysis.controlVariant!.variantName,
      {
        confidence: winnerAnalysis.confidence,
        improvement: winnerAnalysis.improvement,
        sampleSize: winnerAnalysis.winnerVariant!.sampleSize,
        promotionType: "auto",
        strategy: "immediate",
        safetyChecks: {
          minSampleSize: true,
          minConfidence: true,
          minImprovement: true,
          minRuntime: true,
          errorRateAcceptable: true,
        },
      }
    );

    // Mark experiment as completed
    await sql`
      UPDATE ab_experiments
      SET
        is_active = false,
        end_date = NOW(),
        winner_variant_id = ${winnerAnalysis.winnerVariant!.variantId}
      WHERE id = ${experiment.id}
    `;

    // Archive losing variants if configured
    if (config.archiveLosingVariants) {
      await archiveLosingVariants(
        experiment.id,
        winnerAnalysis.winnerVariant!.variantId
      );
    }

    // Record success
    result.experimentsPromoted++;
    result.promotions.push({
      experimentName: experiment.name,
      experimentId: experiment.id,
      winnerVariant: winnerAnalysis.winnerVariant!.variantName,
      confidence: winnerAnalysis.confidence,
      improvement: winnerAnalysis.improvement,
    });

    logger.log(
      `[Auto-Promotion Scheduler] Successfully promoted ${winnerAnalysis.winnerVariant!.variantName} for experiment ${experiment.name} (audit log: ${auditLog.id})`
    );

    // Send notification
    if (config.sendNotifications && config.notificationUserId) {
      await sendPromotionNotification(
        config.notificationUserId,
        experiment.name,
        winnerAnalysis,
        "promoted"
      );
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error(
      `[Auto-Promotion Scheduler] Failed to promote experiment ${experiment.name}:`,
      errorMessage
    );
    throw error;
  }
}

/**
 * Send notification about promotion status
 */
async function sendPromotionNotification(
  userId: string,
  experimentName: string,
  winnerAnalysis: ReturnType<typeof hasClearWinner>,
  status: "promoted" | "approval_required"
): Promise<void> {
  try {
    const title =
      status === "promoted"
        ? `🚀 Experiment Auto-Promoted: ${experimentName}`
        : `⚠️ Manual Approval Required: ${experimentName}`;

    const message =
      status === "promoted"
        ? `Winner variant "${winnerAnalysis.winnerVariant!.variantName}" has been automatically promoted to production. Improvement: ${winnerAnalysis.improvement.toFixed(1)}%, Confidence: ${winnerAnalysis.confidence}%`
        : `Experiment is eligible for promotion but requires manual approval. Winner: "${winnerAnalysis.winnerVariant!.variantName}", Improvement: ${winnerAnalysis.improvement.toFixed(1)}%, Confidence: ${winnerAnalysis.confidence}%`;

    await sendNotification({
      userId,
      level: status === "promoted" ? "info" : "warning",
      type: "significance",
      title,
      message,
      experimentName,
      variantName: winnerAnalysis.winnerVariant!.variantName,
      metric: "promotion",
      value: winnerAnalysis.improvement,
      threshold: 0,
      metadata: {
        status,
        confidence: winnerAnalysis.confidence,
        timestamp: new Date().toISOString(),
      },
    });

    logger.log(
      `[Auto-Promotion Scheduler] Sent ${status} notification for ${experimentName}`
    );
  } catch (error) {
    console.error(
      `[Auto-Promotion Scheduler] Failed to send notification:`,
      error
    );
    // Don't throw - notification failure shouldn't block promotion
  }
}

/**
 * Get scheduler status and configuration
 */
export function getSchedulerStatus(): {
  enabled: boolean;
  dryRun: boolean;
  config: SchedulerConfig;
  nextRunEstimate: string;
} {
  const config = DEFAULT_SCHEDULER_CONFIG;

  return {
    enabled: config.enabled,
    dryRun: config.dryRun,
    config,
    nextRunEstimate: "Depends on cron schedule (typically hourly)",
  };
}
