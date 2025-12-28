/**
 * A/B Test Auto-Promotion Configuration
 * Defines thresholds and safety rules for automatic winner promotion
 */

/**
 * Auto-promotion threshold configuration
 * Controls when experiments are eligible for automatic promotion
 */
export interface AutoPromotionThresholds {
  /** Minimum statistical confidence level required (0-100) */
  minConfidence: number;

  /** Minimum sample size per variant */
  minSampleSize: number;

  /** Minimum improvement percentage required (0-100) */
  minImprovement: number;

  /** Minimum runtime in hours before promotion is allowed */
  minRuntimeHours: number;

  /** Maximum error rate threshold (0-1) */
  maxErrorRate: number;

  /** Maximum latency degradation allowed (percentage) */
  maxLatencyDegradation: number;
}

/**
 * Safety check configuration
 * Defines checks that must pass before auto-promotion
 */
export interface SafetyCheckConfig {
  /** Check error rates don't exceed threshold */
  checkErrorRates: boolean;

  /** Check latency hasn't degraded significantly */
  checkLatency: boolean;

  /** Check traffic distribution is balanced */
  checkTrafficBalance: boolean;

  /** Check for recent alerts on winning variant */
  checkRecentAlerts: boolean;

  /** Lookback window for alert checking (hours) */
  alertLookbackHours: number;

  /** Maximum critical alerts allowed */
  maxCriticalAlerts: number;
}

/**
 * Notification configuration for promotions
 */
export interface PromotionNotificationConfig {
  /** Enable notifications for auto-promotions */
  enabled: boolean;

  /** Notification channels to use */
  channels: Array<"slack" | "email" | "pagerduty">;

  /** Minimum alert level for promotion notifications */
  minimumLevel: "info" | "warning" | "critical";

  /** Include detailed metrics in notification */
  includeDetailedMetrics: boolean;
}

/**
 * Complete auto-promotion configuration
 */
export interface AutoPromotionConfig {
  /** Enable auto-promotion system */
  enabled: boolean;

  /** Threshold settings */
  thresholds: AutoPromotionThresholds;

  /** Safety check settings */
  safetyChecks: SafetyCheckConfig;

  /** Notification settings */
  notifications: PromotionNotificationConfig;

  /** Dry run mode - log actions without executing */
  dryRun: boolean;

  /** Experiments to exclude from auto-promotion (by name) */
  excludedExperiments: string[];

  /** Maximum concurrent promotions allowed */
  maxConcurrentPromotions: number;
}

/**
 * Default auto-promotion configuration
 * Conservative defaults for production safety
 */
export const DEFAULT_AUTO_PROMOTION_CONFIG: AutoPromotionConfig = {
  enabled: process.env.AUTO_PROMOTION_ENABLED === "true",
  thresholds: {
    minConfidence: 95.0,
    minSampleSize: 1000,
    minImprovement: 5.0,
    minRuntimeHours: 24,
    maxErrorRate: 0.05,
    maxLatencyDegradation: 20.0,
  },
  safetyChecks: {
    checkErrorRates: true,
    checkLatency: true,
    checkTrafficBalance: true,
    checkRecentAlerts: true,
    alertLookbackHours: 24,
    maxCriticalAlerts: 0,
  },
  notifications: {
    enabled: true,
    channels: ["slack", "email"],
    minimumLevel: "info",
    includeDetailedMetrics: true,
  },
  dryRun: process.env.AUTO_PROMOTION_DRY_RUN === "true",
  excludedExperiments: (process.env.AUTO_PROMOTION_EXCLUDED || "")
    .split(",")
    .filter(Boolean),
  maxConcurrentPromotions: 3,
};

/**
 * Preset configurations for different environments
 */
export const AUTO_PROMOTION_PRESETS: Record<string, Partial<AutoPromotionConfig>> = {
  /** Aggressive promotion for high-traffic sites */
  aggressive: {
    thresholds: {
      minConfidence: 90.0,
      minSampleSize: 500,
      minImprovement: 3.0,
      minRuntimeHours: 12,
      maxErrorRate: 0.08,
      maxLatencyDegradation: 30.0,
    },
  },

  /** Conservative promotion for critical systems */
  conservative: {
    thresholds: {
      minConfidence: 99.0,
      minSampleSize: 5000,
      minImprovement: 10.0,
      minRuntimeHours: 72,
      maxErrorRate: 0.02,
      maxLatencyDegradation: 10.0,
    },
    safetyChecks: {
      checkErrorRates: true,
      checkLatency: true,
      checkTrafficBalance: true,
      checkRecentAlerts: true,
      alertLookbackHours: 48,
      maxCriticalAlerts: 0,
    },
  },

  /** Balanced settings for most use cases */
  balanced: {
    thresholds: {
      minConfidence: 95.0,
      minSampleSize: 2000,
      minImprovement: 5.0,
      minRuntimeHours: 24,
      maxErrorRate: 0.05,
      maxLatencyDegradation: 20.0,
    },
  },
};

/**
 * Load auto-promotion configuration with environment overrides
 */
export function loadAutoPromotionConfig(
  preset?: keyof typeof AUTO_PROMOTION_PRESETS
): AutoPromotionConfig {
  const baseConfig = { ...DEFAULT_AUTO_PROMOTION_CONFIG };

  // Apply preset if specified
  if (preset && AUTO_PROMOTION_PRESETS[preset]) {
    Object.assign(baseConfig, AUTO_PROMOTION_PRESETS[preset]);
  }

  // Environment variable overrides
  if (process.env.AUTO_PROMOTION_MIN_CONFIDENCE) {
    baseConfig.thresholds.minConfidence = parseFloat(
      process.env.AUTO_PROMOTION_MIN_CONFIDENCE
    );
  }

  if (process.env.AUTO_PROMOTION_MIN_SAMPLE_SIZE) {
    baseConfig.thresholds.minSampleSize = parseInt(
      process.env.AUTO_PROMOTION_MIN_SAMPLE_SIZE,
      10
    );
  }

  if (process.env.AUTO_PROMOTION_MIN_IMPROVEMENT) {
    baseConfig.thresholds.minImprovement = parseFloat(
      process.env.AUTO_PROMOTION_MIN_IMPROVEMENT
    );
  }

  if (process.env.AUTO_PROMOTION_MIN_RUNTIME_HOURS) {
    baseConfig.thresholds.minRuntimeHours = parseFloat(
      process.env.AUTO_PROMOTION_MIN_RUNTIME_HOURS
    );
  }

  return baseConfig;
}

/**
 * Validate auto-promotion configuration
 */
export function validateAutoPromotionConfig(
  config: AutoPromotionConfig
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Validate thresholds
  if (config.thresholds.minConfidence < 0 || config.thresholds.minConfidence > 100) {
    errors.push("minConfidence must be between 0 and 100");
  }

  if (config.thresholds.minSampleSize < 1) {
    errors.push("minSampleSize must be at least 1");
  }

  if (config.thresholds.minImprovement < 0) {
    errors.push("minImprovement must be non-negative");
  }

  if (config.thresholds.minRuntimeHours < 0) {
    errors.push("minRuntimeHours must be non-negative");
  }

  if (config.thresholds.maxErrorRate < 0 || config.thresholds.maxErrorRate > 1) {
    errors.push("maxErrorRate must be between 0 and 1");
  }

  if (config.thresholds.maxLatencyDegradation < 0) {
    errors.push("maxLatencyDegradation must be non-negative");
  }

  // Validate safety checks
  if (config.safetyChecks.alertLookbackHours < 0) {
    errors.push("alertLookbackHours must be non-negative");
  }

  if (config.safetyChecks.maxCriticalAlerts < 0) {
    errors.push("maxCriticalAlerts must be non-negative");
  }

  // Validate concurrency
  if (config.maxConcurrentPromotions < 1) {
    errors.push("maxConcurrentPromotions must be at least 1");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
