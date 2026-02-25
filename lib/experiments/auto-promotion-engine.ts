/**
 * A/B Test Auto-Promotion Engine
 * Monitors experiments and automatically promotes winners based on configured thresholds
 */

import { logger } from "@/lib/logger";
import { sql } from "@/lib/db/supabase-sql";
import {
  ExperimentComparison,
  VariantMetrics,
  Alert,
  compareExperimentVariants,
} from "@/lib/monitoring/ab-test-metrics";
import { sendNotification, NotificationPayload } from "@/lib/notifications";
import {
  AutoPromotionConfig,
  loadAutoPromotionConfig,
  validateAutoPromotionConfig,
} from "./auto-promotion-config";

/**
 * Safety check result
 */
export interface SafetyCheckResult {
  name: string;
  passed: boolean;
  message: string;
  value?: number;
  threshold?: number;
  severity: "info" | "warning" | "critical";
}

/**
 * Promotion eligibility result
 */
export interface PromotionEligibility {
  eligible: boolean;
  experimentName: string;
  experimentId: string;
  winningVariant?: VariantMetrics;
  controlVariant?: VariantMetrics;
  confidence?: number;
  improvement?: number;
  safetyChecks: SafetyCheckResult[];
  reasons: string[];
}

/**
 * Promotion execution result
 */
export interface PromotionResult {
  success: boolean;
  experimentName: string;
  experimentId: string;
  promotedVariantName?: string;
  promotedVariantId?: string;
  confidence?: number;
  improvement?: number;
  promotionId?: string;
  error?: string;
  dryRun: boolean;
  notificationsSent: number;
}

/**
 * Check if experiment is eligible for auto-promotion
 */
export async function checkPromotionEligibility(
  experimentName: string,
  config: AutoPromotionConfig
): Promise<PromotionEligibility> {
  const result: PromotionEligibility = {
    eligible: false,
    experimentName,
    experimentId: "",
    safetyChecks: [],
    reasons: [],
  };

  try {
    // Check if auto-promotion is enabled
    if (!config.enabled) {
      result.reasons.push("Auto-promotion is disabled");
      return result;
    }

    // Check if experiment is excluded
    if (config.excludedExperiments.includes(experimentName)) {
      result.reasons.push("Experiment is in exclusion list");
      return result;
    }

    // Get experiment data
    const experimentData = await sql`
      SELECT id, name, is_active, start_date, end_date
      FROM ab_experiments
      WHERE name = ${experimentName}
      LIMIT 1
    `;

    if (experimentData.length === 0) {
      result.reasons.push("Experiment not found");
      return result;
    }

    const experiment = experimentData[0] as Record<string, string>;
    result.experimentId = experiment.id;

    // Check if experiment is active
    if (!experiment.is_active) {
      result.reasons.push("Experiment is not active");
      return result;
    }

    // Check runtime
    const runtimeHours =
      (Date.now() - new Date(experiment.start_date).getTime()) / (1000 * 60 * 60);
    if (runtimeHours < config.thresholds.minRuntimeHours) {
      result.reasons.push(
        `Insufficient runtime: ${runtimeHours.toFixed(1)}h < ${config.thresholds.minRuntimeHours}h`
      );
      return result;
    }

    // Check for existing active promotion
    const existingPromotion = await sql`
      SELECT id FROM experiment_promotions
      WHERE experiment_id = ${experiment.id}
        AND rollback_at IS NULL
      LIMIT 1
    `;

    if (existingPromotion.length > 0) {
      result.reasons.push("Experiment already has an active promotion");
      return result;
    }

    // Get experiment metrics
    const comparison = await compareExperimentVariants(experimentName);

    // Check statistical significance
    if (!comparison.hasStatisticalSignificance) {
      result.reasons.push("No statistical significance detected");
      return result;
    }

    if (!comparison.winningVariant) {
      result.reasons.push("No winning variant identified");
      return result;
    }

    if (!comparison.confidenceLevel) {
      result.reasons.push("Confidence level not calculated");
      return result;
    }

    // Find winning and control variants
    const winningVariant = comparison.variants.find(
      (v) => v.variantName === comparison.winningVariant
    );
    const controlVariant =
      comparison.variants.find((v) => v.variantName === "control") ||
      comparison.variants.find(
        (v) => v.variantName !== comparison.winningVariant
      );

    if (!winningVariant || !controlVariant) {
      result.reasons.push("Could not identify winning or control variant");
      return result;
    }

    result.winningVariant = winningVariant;
    result.controlVariant = controlVariant;
    result.confidence = comparison.confidenceLevel;

    // Calculate improvement
    const improvement =
      ((winningVariant.successRate - controlVariant.successRate) /
        controlVariant.successRate) *
      100;
    result.improvement = improvement;

    // Check thresholds
    if (comparison.confidenceLevel < config.thresholds.minConfidence) {
      result.reasons.push(
        `Confidence too low: ${comparison.confidenceLevel}% < ${config.thresholds.minConfidence}%`
      );
    }

    if (winningVariant.sampleSize < config.thresholds.minSampleSize) {
      result.reasons.push(
        `Sample size too small: ${winningVariant.sampleSize} < ${config.thresholds.minSampleSize}`
      );
    }

    if (improvement < config.thresholds.minImprovement) {
      result.reasons.push(
        `Improvement too small: ${improvement.toFixed(2)}% < ${config.thresholds.minImprovement}%`
      );
    }

    // Run safety checks
    const safetyChecks = await runSafetyChecks(
      winningVariant,
      controlVariant,
      comparison,
      config
    );
    result.safetyChecks = safetyChecks;

    const failedChecks = safetyChecks.filter((c) => !c.passed);
    if (failedChecks.length > 0) {
      result.reasons.push(
        `Failed safety checks: ${failedChecks.map((c) => c.name).join(", ")}`
      );
    }

    // Determine eligibility
    result.eligible = result.reasons.length === 0;

    return result;
  } catch (error: unknown) {
    console.error(`[Auto-Promotion] Error checking eligibility:`, error);
    result.reasons.push(`Error: ${error instanceof Error ? error.message : String(error)}`);
    return result;
  }
}

/**
 * Run safety checks on winning variant
 */
async function runSafetyChecks(
  winner: VariantMetrics,
  control: VariantMetrics,
  comparison: ExperimentComparison,
  config: AutoPromotionConfig
): Promise<SafetyCheckResult[]> {
  const checks: SafetyCheckResult[] = [];

  // Check error rates
  if (config.safetyChecks.checkErrorRates) {
    const errorCheck: SafetyCheckResult = {
      name: "Error Rate Check",
      passed: winner.errorRate <= config.thresholds.maxErrorRate,
      message: `Winner error rate: ${(winner.errorRate * 100).toFixed(2)}%`,
      value: winner.errorRate,
      threshold: config.thresholds.maxErrorRate,
      severity: winner.errorRate > config.thresholds.maxErrorRate ? "critical" : "info",
    };
    checks.push(errorCheck);
  }

  // Check latency degradation
  if (config.safetyChecks.checkLatency) {
    const latencyIncrease =
      ((winner.p95LatencyMs - control.p95LatencyMs) / control.p95LatencyMs) * 100;
    const latencyCheck: SafetyCheckResult = {
      name: "Latency Degradation Check",
      passed: latencyIncrease <= config.thresholds.maxLatencyDegradation,
      message: `P95 latency change: ${latencyIncrease > 0 ? "+" : ""}${latencyIncrease.toFixed(1)}%`,
      value: latencyIncrease,
      threshold: config.thresholds.maxLatencyDegradation,
      severity: latencyIncrease > config.thresholds.maxLatencyDegradation ? "warning" : "info",
    };
    checks.push(latencyCheck);
  }

  // Check traffic balance
  if (config.safetyChecks.checkTrafficBalance) {
    const totalRequests = comparison.variants.reduce((sum, v) => sum + v.totalRequests, 0);
    const actualTraffic = totalRequests > 0 ? winner.totalRequests / totalRequests : 0;
    const expectedTraffic = winner.trafficPercentage / 100;
    const trafficDelta = Math.abs(actualTraffic - expectedTraffic) / expectedTraffic;

    const trafficCheck: SafetyCheckResult = {
      name: "Traffic Balance Check",
      passed: trafficDelta < 0.5, // Allow 50% deviation
      message: `Actual traffic: ${(actualTraffic * 100).toFixed(1)}% (expected ${(expectedTraffic * 100).toFixed(0)}%)`,
      value: actualTraffic,
      threshold: expectedTraffic,
      severity: trafficDelta >= 0.5 ? "warning" : "info",
    };
    checks.push(trafficCheck);
  }

  // Check recent alerts
  if (config.safetyChecks.checkRecentAlerts) {
    const recentAlerts = comparison.alerts.filter(
      (alert) =>
        alert.variantName === winner.variantName &&
        alert.timestamp.getTime() >
          Date.now() - config.safetyChecks.alertLookbackHours * 60 * 60 * 1000
    );

    const criticalAlerts = recentAlerts.filter((a) => a.level === "critical");

    const alertCheck: SafetyCheckResult = {
      name: "Recent Alerts Check",
      passed: criticalAlerts.length <= config.safetyChecks.maxCriticalAlerts,
      message: `Critical alerts in last ${config.safetyChecks.alertLookbackHours}h: ${criticalAlerts.length}`,
      value: criticalAlerts.length,
      threshold: config.safetyChecks.maxCriticalAlerts,
      severity: criticalAlerts.length > 0 ? "critical" : "info",
    };
    checks.push(alertCheck);
  }

  return checks;
}

/**
 * Execute promotion of winning variant
 */
export async function promoteWinner(
  experimentName: string,
  config: AutoPromotionConfig,
  userId?: string
): Promise<PromotionResult> {
  const result: PromotionResult = {
    success: false,
    experimentName,
    experimentId: "",
    dryRun: config.dryRun,
    notificationsSent: 0,
  };

  try {
    // Check eligibility
    const eligibility = await checkPromotionEligibility(experimentName, config);
    result.experimentId = eligibility.experimentId;

    if (!eligibility.eligible) {
      result.error = `Not eligible: ${eligibility.reasons.join("; ")}`;
      logger.log(`[Auto-Promotion] ${experimentName} not eligible:`, eligibility.reasons);
      return result;
    }

    if (!eligibility.winningVariant || !eligibility.controlVariant) {
      result.error = "Missing variant data";
      return result;
    }

    result.promotedVariantName = eligibility.winningVariant.variantName;
    result.promotedVariantId = eligibility.winningVariant.variantId;
    result.confidence = eligibility.confidence;
    result.improvement = eligibility.improvement;

    // Dry run mode - log but don't execute
    if (config.dryRun) {
      logger.log(`[Auto-Promotion] DRY RUN - Would promote ${result.promotedVariantName} in ${experimentName}`);
      logger.log(`  Confidence: ${result.confidence}%`);
      logger.log(`  Improvement: ${result.improvement?.toFixed(2)}%`);
      logger.log(`  Safety checks:`, eligibility.safetyChecks);
      result.success = true;
      return result;
    }

    // Insert promotion record
    const promotionRecord = await sql`
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
        metadata
      )
      VALUES (
        ${eligibility.experimentId},
        ${experimentName},
        ${eligibility.winningVariant.variantId},
        ${eligibility.winningVariant.variantName},
        ${eligibility.controlVariant.variantId},
        ${eligibility.controlVariant.variantName},
        ${eligibility.confidence},
        ${eligibility.improvement},
        ${eligibility.winningVariant.sampleSize},
        ${userId ? "manual" : "auto"},
        ${userId || null},
        ${JSON.stringify({
          safetyChecks: eligibility.safetyChecks,
          winnerMetrics: {
            successRate: eligibility.winningVariant.successRate,
            errorRate: eligibility.winningVariant.errorRate,
            p95LatencyMs: eligibility.winningVariant.p95LatencyMs,
          },
          controlMetrics: {
            successRate: eligibility.controlVariant.successRate,
            errorRate: eligibility.controlVariant.errorRate,
            p95LatencyMs: eligibility.controlVariant.p95LatencyMs,
          },
        })}
      )
      RETURNING id
    `;

    result.promotionId = promotionRecord[0].id as string;
    result.success = true;

    logger.log(
      `[Auto-Promotion] Successfully promoted ${result.promotedVariantName} in ${experimentName}`
    );

    // Send notifications
    if (config.notifications.enabled) {
      result.notificationsSent = await sendPromotionNotifications(
        result,
        eligibility,
        config
      );
    }

    return result;
  } catch (error: unknown) {
    console.error(`[Auto-Promotion] Error promoting ${experimentName}:`, error);
    result.error = error instanceof Error ? error.message : String(error);
    return result;
  }
}

/**
 * Send notifications about promotion
 */
async function sendPromotionNotifications(
  promotion: PromotionResult,
  eligibility: PromotionEligibility,
  config: AutoPromotionConfig
): Promise<number> {
  try {
    // Get subscribers (users with notification configs)
    const subscribers = await sql`
      SELECT DISTINCT user_id
      FROM notification_configs
      WHERE enabled = true
        AND 'info' = ANY(alert_levels)
    `;

    let notificationCount = 0;

    for (const subscriber of subscribers) {
      const payload: NotificationPayload = {
        userId: subscriber.user_id as string,
        level: "info",
        type: "winner",
        title: `[${promotion.experimentName}] A/B Test Winner Promoted`,
        message: `${promotion.promotedVariantName} has been automatically promoted with ${promotion.confidence}% confidence and ${promotion.improvement?.toFixed(1)}% improvement.`,
        experimentName: promotion.experimentName,
        variantName: promotion.promotedVariantName,
        metadata: {
          promotionId: promotion.promotionId,
          confidence: promotion.confidence,
          improvement: promotion.improvement,
          safetyChecks: config.notifications.includeDetailedMetrics
            ? eligibility.safetyChecks
            : undefined,
          winnerMetrics: config.notifications.includeDetailedMetrics
            ? {
                successRate: eligibility.winningVariant?.successRate,
                errorRate: eligibility.winningVariant?.errorRate,
                p95LatencyMs: eligibility.winningVariant?.p95LatencyMs,
                sampleSize: eligibility.winningVariant?.sampleSize,
              }
            : undefined,
        },
      };

      const results = await sendNotification(payload);
      if (results.some((r) => r.success)) {
        notificationCount++;
      }
    }

    logger.log(
      `[Auto-Promotion] Sent ${notificationCount} promotion notifications`
    );
    return notificationCount;
  } catch (error) {
    console.error("[Auto-Promotion] Error sending notifications:", error);
    return 0;
  }
}

/**
 * Scan all active experiments and promote eligible winners
 */
export async function scanAndPromoteWinners(
  config?: AutoPromotionConfig
): Promise<{
  scanned: number;
  eligible: number;
  promoted: number;
  results: PromotionResult[];
}> {
  const finalConfig = config || loadAutoPromotionConfig();

  // Validate configuration
  const validation = validateAutoPromotionConfig(finalConfig);
  if (!validation.valid) {
    throw new Error(`Invalid configuration: ${validation.errors.join(", ")}`);
  }

  logger.log(`[Auto-Promotion] Starting scan (dryRun: ${finalConfig.dryRun})`);

  const stats = {
    scanned: 0,
    eligible: 0,
    promoted: 0,
    results: [] as PromotionResult[],
  };

  try {
    // Get all active experiments
    const experiments = await sql`
      SELECT name
      FROM ab_experiments
      WHERE is_active = true
        AND (end_date IS NULL OR end_date > NOW())
      ORDER BY start_date ASC
    `;

    stats.scanned = experiments.length;
    logger.log(`[Auto-Promotion] Found ${stats.scanned} active experiments`);

    // Check current promotions count
    const currentPromotions = await sql`
      SELECT COUNT(*) as count
      FROM experiment_promotions
      WHERE rollback_at IS NULL
        AND promoted_at > NOW() - INTERVAL '1 hour'
    `;

    const recentPromotions = parseInt(currentPromotions[0].count as string, 10);
    const remainingSlots = finalConfig.maxConcurrentPromotions - recentPromotions;

    if (remainingSlots <= 0) {
      logger.log(
        `[Auto-Promotion] Max concurrent promotions reached (${recentPromotions}/${finalConfig.maxConcurrentPromotions})`
      );
      return stats;
    }

    // Process each experiment
    for (const exp of experiments) {
      if (stats.promoted >= remainingSlots && !finalConfig.dryRun) {
        logger.log(
          `[Auto-Promotion] Reached promotion limit (${remainingSlots}), stopping scan`
        );
        break;
      }

      const eligibility = await checkPromotionEligibility(exp.name as string, finalConfig);

      if (eligibility.eligible) {
        stats.eligible++;
        const result = await promoteWinner(exp.name as string, finalConfig);
        stats.results.push(result);

        if (result.success) {
          stats.promoted++;
        }
      }
    }

    logger.log(
      `[Auto-Promotion] Scan complete: ${stats.eligible} eligible, ${stats.promoted} promoted`
    );

    return stats;
  } catch (error) {
    console.error("[Auto-Promotion] Error scanning experiments:", error);
    throw error;
  }
}

/**
 * Rollback a promotion
 */
export async function rollbackPromotion(
  promotionId: string,
  reason: string,
  userId?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await sql`
      UPDATE experiment_promotions
      SET rollback_at = NOW(),
          rollback_reason = ${reason}
      WHERE id = ${promotionId}
        AND rollback_at IS NULL
    `;

    logger.log(`[Auto-Promotion] Rolled back promotion ${promotionId}: ${reason}`);

    return { success: true };
  } catch (error: unknown) {
    console.error(`[Auto-Promotion] Error rolling back promotion:`, error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}
