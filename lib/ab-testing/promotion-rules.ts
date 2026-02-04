/**
 * A/B Testing Auto-Promotion Rules Engine
 * Configurable rules for when to auto-promote winning variants
 * with comprehensive safety checks and validation
 */

export interface PromotionRules {
  /** Minimum sample size required per variant */
  minSampleSize: number;

  /** Minimum confidence level (90, 95, 99, 99.9) */
  minConfidenceLevel: number;

  /** Minimum improvement over control (e.g., 0.05 = 5% improvement) */
  minImprovement: number;

  /** Maximum error rate threshold (0.10 = 10%) */
  maxErrorRate: number;

  /** Maximum p95 latency in milliseconds */
  maxP95LatencyMs: number;

  /** Minimum test duration in hours */
  minTestDurationHours: number;

  /** Maximum test duration in hours before forcing review */
  maxTestDurationHours: number;

  /** Require manual approval for promotions */
  requireManualApproval: boolean;
}

export interface PromotionSafetyCheck {
  passed: boolean;
  checkName: string;
  message: string;
  severity: "info" | "warning" | "critical";
  value?: number;
  threshold?: number;
}

export interface PromotionEligibility {
  eligible: boolean;
  experimentId: string;
  experimentName: string;
  winningVariant: string | null;
  confidenceLevel: number | null;
  improvement: number | null;
  safetyChecks: PromotionSafetyCheck[];
  recommendation: "promote" | "wait" | "manual_review" | "not_ready";
  reason: string;
}

/**
 * Default promotion rules - conservative settings for production safety
 */
export const DEFAULT_PROMOTION_RULES: PromotionRules = {
  minSampleSize: 1000, // Require 1000+ samples per variant
  minConfidenceLevel: 95, // 95% confidence (z-score >= 1.96)
  minImprovement: 0.02, // 2% minimum improvement
  maxErrorRate: 0.05, // 5% maximum error rate
  maxP95LatencyMs: 3000, // 3 second p95 latency limit
  minTestDurationHours: 24, // Run for at least 24 hours
  maxTestDurationHours: 168, // Force review after 7 days
  requireManualApproval: true, // Default to manual approval
};

/**
 * Aggressive promotion rules - for fast iteration in development
 */
export const AGGRESSIVE_PROMOTION_RULES: PromotionRules = {
  minSampleSize: 100,
  minConfidenceLevel: 90,
  minImprovement: 0.01,
  maxErrorRate: 0.10,
  maxP95LatencyMs: 5000,
  minTestDurationHours: 1,
  maxTestDurationHours: 72,
  requireManualApproval: false,
};

/**
 * Experiments that should NEVER auto-promote (require manual review)
 */
export const AUTO_PROMOTION_EXCLUDE_LIST: Set<string> = new Set([
  // Add experiment names that require manual review
  // Example: "critical-payment-flow"
]);

/**
 * Environment-based rule selection
 */
export function getPromotionRulesForEnvironment(): PromotionRules {
  const env = process.env.NODE_ENV || "development";
  const customRules = process.env.AB_PROMOTION_RULES;

  if (customRules) {
    try {
      return JSON.parse(customRules);
    } catch (error) {
      console.warn(
        "[Promotion Rules] Failed to parse custom rules, using defaults"
      );
    }
  }

  // Use aggressive rules in development, conservative in production
  return env === "production"
    ? DEFAULT_PROMOTION_RULES
    : AGGRESSIVE_PROMOTION_RULES;
}

/**
 * Check if an experiment is excluded from auto-promotion
 */
export function isExcludedFromAutoPromotion(experimentName: string): boolean {
  return AUTO_PROMOTION_EXCLUDE_LIST.has(experimentName);
}

/**
 * Perform comprehensive safety checks before promotion
 */
export function performSafetyChecks(
  experimentData: {
    experimentName: string;
    winningVariant: {
      variantName: string;
      sampleSize: number;
      errorRate: number;
      p95LatencyMs: number;
      successRate: number;
    };
    controlVariant: {
      variantName: string;
      sampleSize: number;
      errorRate: number;
      p95LatencyMs: number;
      successRate: number;
    };
    confidenceLevel: number;
    testDurationHours: number;
  },
  rules: PromotionRules
): PromotionSafetyCheck[] {
  const checks: PromotionSafetyCheck[] = [];
  const { winningVariant, controlVariant, confidenceLevel, testDurationHours } =
    experimentData;

  // Check 1: Exclusion list
  if (isExcludedFromAutoPromotion(experimentData.experimentName)) {
    checks.push({
      passed: false,
      checkName: "exclusion_list",
      message: "Experiment is on auto-promotion exclusion list",
      severity: "critical",
    });
  } else {
    checks.push({
      passed: true,
      checkName: "exclusion_list",
      message: "Experiment is eligible for auto-promotion",
      severity: "info",
    });
  }

  // Check 2: Sample size (winner)
  const winnerSampleCheck = winningVariant.sampleSize >= rules.minSampleSize;
  checks.push({
    passed: winnerSampleCheck,
    checkName: "winner_sample_size",
    message: winnerSampleCheck
      ? `Winner has sufficient sample size: ${winningVariant.sampleSize}`
      : `Winner sample size too low: ${winningVariant.sampleSize} < ${rules.minSampleSize}`,
    severity: winnerSampleCheck ? "info" : "critical",
    value: winningVariant.sampleSize,
    threshold: rules.minSampleSize,
  });

  // Check 3: Sample size (control)
  const controlSampleCheck = controlVariant.sampleSize >= rules.minSampleSize;
  checks.push({
    passed: controlSampleCheck,
    checkName: "control_sample_size",
    message: controlSampleCheck
      ? `Control has sufficient sample size: ${controlVariant.sampleSize}`
      : `Control sample size too low: ${controlVariant.sampleSize} < ${rules.minSampleSize}`,
    severity: controlSampleCheck ? "info" : "critical",
    value: controlVariant.sampleSize,
    threshold: rules.minSampleSize,
  });

  // Check 4: Statistical confidence
  const confidenceCheck = confidenceLevel >= rules.minConfidenceLevel;
  checks.push({
    passed: confidenceCheck,
    checkName: "statistical_confidence",
    message: confidenceCheck
      ? `Confidence level ${confidenceLevel}% meets minimum ${rules.minConfidenceLevel}%`
      : `Confidence level ${confidenceLevel}% below minimum ${rules.minConfidenceLevel}%`,
    severity: confidenceCheck ? "info" : "critical",
    value: confidenceLevel,
    threshold: rules.minConfidenceLevel,
  });

  // Check 5: Improvement threshold
  const improvement =
    (winningVariant.successRate - controlVariant.successRate) /
    controlVariant.successRate;
  const improvementCheck = improvement >= rules.minImprovement;
  checks.push({
    passed: improvementCheck,
    checkName: "improvement_threshold",
    message: improvementCheck
      ? `Improvement ${(improvement * 100).toFixed(2)}% meets minimum ${(rules.minImprovement * 100).toFixed(2)}%`
      : `Improvement ${(improvement * 100).toFixed(2)}% below minimum ${(rules.minImprovement * 100).toFixed(2)}%`,
    severity: improvementCheck ? "info" : "warning",
    value: improvement,
    threshold: rules.minImprovement,
  });

  // Check 6: Error rate (winner)
  const winnerErrorCheck = winningVariant.errorRate <= rules.maxErrorRate;
  checks.push({
    passed: winnerErrorCheck,
    checkName: "winner_error_rate",
    message: winnerErrorCheck
      ? `Winner error rate ${(winningVariant.errorRate * 100).toFixed(2)}% within limit`
      : `Winner error rate ${(winningVariant.errorRate * 100).toFixed(2)}% exceeds limit ${(rules.maxErrorRate * 100).toFixed(2)}%`,
    severity: winnerErrorCheck ? "info" : "critical",
    value: winningVariant.errorRate,
    threshold: rules.maxErrorRate,
  });

  // Check 7: Error rate comparison (winner should not be worse than control)
  const errorRateComparison =
    winningVariant.errorRate <= controlVariant.errorRate * 1.1; // Allow 10% tolerance
  checks.push({
    passed: errorRateComparison,
    checkName: "error_rate_comparison",
    message: errorRateComparison
      ? `Winner error rate comparable to control`
      : `Winner error rate significantly worse than control`,
    severity: errorRateComparison ? "info" : "critical",
    value: winningVariant.errorRate,
    threshold: controlVariant.errorRate,
  });

  // Check 8: Latency (winner)
  const winnerLatencyCheck =
    winningVariant.p95LatencyMs <= rules.maxP95LatencyMs;
  checks.push({
    passed: winnerLatencyCheck,
    checkName: "winner_latency",
    message: winnerLatencyCheck
      ? `Winner P95 latency ${winningVariant.p95LatencyMs.toFixed(0)}ms within limit`
      : `Winner P95 latency ${winningVariant.p95LatencyMs.toFixed(0)}ms exceeds limit ${rules.maxP95LatencyMs}ms`,
    severity: winnerLatencyCheck ? "info" : "warning",
    value: winningVariant.p95LatencyMs,
    threshold: rules.maxP95LatencyMs,
  });

  // Check 9: Latency comparison (winner should not be significantly slower)
  const latencyComparison =
    winningVariant.p95LatencyMs <= controlVariant.p95LatencyMs * 1.2; // Allow 20% tolerance
  checks.push({
    passed: latencyComparison,
    checkName: "latency_comparison",
    message: latencyComparison
      ? `Winner latency comparable to control`
      : `Winner latency significantly worse than control`,
    severity: latencyComparison ? "info" : "warning",
    value: winningVariant.p95LatencyMs,
    threshold: controlVariant.p95LatencyMs,
  });

  // Check 10: Test duration (minimum)
  const minDurationCheck = testDurationHours >= rules.minTestDurationHours;
  checks.push({
    passed: minDurationCheck,
    checkName: "min_test_duration",
    message: minDurationCheck
      ? `Test duration ${testDurationHours.toFixed(1)}h meets minimum ${rules.minTestDurationHours}h`
      : `Test duration ${testDurationHours.toFixed(1)}h below minimum ${rules.minTestDurationHours}h`,
    severity: minDurationCheck ? "info" : "critical",
    value: testDurationHours,
    threshold: rules.minTestDurationHours,
  });

  // Check 11: Test duration (maximum) - force review after too long
  const maxDurationCheck = testDurationHours <= rules.maxTestDurationHours;
  checks.push({
    passed: maxDurationCheck,
    checkName: "max_test_duration",
    message: maxDurationCheck
      ? `Test duration ${testDurationHours.toFixed(1)}h within limit`
      : `Test running for ${testDurationHours.toFixed(1)}h - manual review recommended`,
    severity: maxDurationCheck ? "info" : "warning",
    value: testDurationHours,
    threshold: rules.maxTestDurationHours,
  });

  // Check 12: Manual approval requirement
  if (rules.requireManualApproval) {
    checks.push({
      passed: false,
      checkName: "manual_approval_required",
      message: "Manual approval is required by promotion rules",
      severity: "info",
    });
  }

  return checks;
}

/**
 * Determine if a variant is eligible for auto-promotion
 */
export function evaluatePromotionEligibility(
  experimentData: {
    experimentId: string;
    experimentName: string;
    winningVariant: {
      variantName: string;
      sampleSize: number;
      errorRate: number;
      p95LatencyMs: number;
      successRate: number;
    } | null;
    controlVariant: {
      variantName: string;
      sampleSize: number;
      errorRate: number;
      p95LatencyMs: number;
      successRate: number;
    } | null;
    confidenceLevel: number | null;
    testDurationHours: number;
  },
  customRules?: Partial<PromotionRules>
): PromotionEligibility {
  const rules = {
    ...getPromotionRulesForEnvironment(),
    ...customRules,
  };

  // Early return if no winning variant
  if (!experimentData.winningVariant || !experimentData.controlVariant) {
    return {
      eligible: false,
      experimentId: experimentData.experimentId,
      experimentName: experimentData.experimentName,
      winningVariant: null,
      confidenceLevel: null,
      improvement: null,
      safetyChecks: [],
      recommendation: "not_ready",
      reason: "No winning variant detected yet",
    };
  }

  // Perform all safety checks
  const safetyChecks = performSafetyChecks(
    {
      experimentName: experimentData.experimentName,
      winningVariant: experimentData.winningVariant,
      controlVariant: experimentData.controlVariant,
      confidenceLevel: experimentData.confidenceLevel || 0,
      testDurationHours: experimentData.testDurationHours,
    },
    rules
  );

  // Count check results
  const criticalFailed = safetyChecks.filter(
    (c) => !c.passed && c.severity === "critical"
  ).length;
  const warningFailed = safetyChecks.filter(
    (c) => !c.passed && c.severity === "warning"
  ).length;
  const allPassed = safetyChecks.every((c) => c.passed);

  // Calculate improvement
  const improvement =
    (experimentData.winningVariant.successRate -
      experimentData.controlVariant.successRate) /
    experimentData.controlVariant.successRate;

  // Determine eligibility and recommendation
  let eligible = false;
  let recommendation: "promote" | "wait" | "manual_review" | "not_ready" =
    "not_ready";
  let reason = "";

  if (criticalFailed > 0) {
    recommendation = "not_ready";
    reason = `${criticalFailed} critical safety check(s) failed`;
  } else if (rules.requireManualApproval) {
    recommendation = "manual_review";
    reason = "Manual approval required by promotion rules";
  } else if (warningFailed > 0) {
    recommendation = "manual_review";
    reason = `${warningFailed} warning-level check(s) failed - manual review recommended`;
  } else if (allPassed) {
    eligible = true;
    recommendation = "promote";
    reason = "All safety checks passed - ready for auto-promotion";
  } else {
    recommendation = "wait";
    reason = "Continue monitoring - not ready for promotion";
  }

  return {
    eligible,
    experimentId: experimentData.experimentId,
    experimentName: experimentData.experimentName,
    winningVariant: experimentData.winningVariant.variantName,
    confidenceLevel: experimentData.confidenceLevel,
    improvement,
    safetyChecks,
    recommendation,
    reason,
  };
}
