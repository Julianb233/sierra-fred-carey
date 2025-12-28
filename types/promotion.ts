/**
 * Promotion Types for A/B Test Experiment Promotion
 */

/**
 * Configuration for promotion decision making
 */
export interface PromotionConfig {
  /** Minimum confidence level required (e.g., 95 for 95%) */
  minConfidenceLevel: number;
  /** Minimum sample size per variant */
  minSampleSize: number;
  /** Minimum improvement percentage over control */
  minImprovementPercent: number;
  /** Minimum experiment runtime in hours before promotion can occur */
  minRuntimeHours: number;
  /** Maximum acceptable error rate */
  maxErrorRate: number;
  /** Whether manual approval is required for promotion */
  requireManualApproval: boolean;
  /** Optional: Enable gradual rollout */
  enableGradualRollout?: boolean;
  /** Optional: Auto-archive losing variants */
  autoArchiveLosingVariants?: boolean;
}

/**
 * Result of applying a promotion
 */
export interface PromotionResult {
  /** Whether the promotion was successful */
  success: boolean;
  /** The experiment ID */
  experimentId: string;
  /** The winning variant ID */
  winnerVariantId: string;
  /** Promotion strategy used */
  strategy: "immediate" | "gradual";
  /** Traffic percentage assigned to winner */
  trafficPercentage: number;
  /** Human-readable message */
  message: string;
  /** When the promotion was applied */
  appliedAt: Date;
  /** Error message if failed */
  error?: string;
}

/**
 * Audit log entry for promotion compliance tracking
 */
export interface PromotionAuditLog {
  /** Unique audit log ID */
  id: string;
  /** The experiment ID */
  experimentId: string;
  /** The experiment name */
  experimentName: string;
  /** The promoted variant ID */
  promotedVariantId: string;
  /** The promoted variant name */
  promotedVariantName: string;
  /** The control variant ID */
  controlVariantId: string;
  /** The control variant name */
  controlVariantName: string;
  /** Statistical confidence level achieved */
  confidence: number;
  /** Improvement percentage over control */
  improvement: number;
  /** Sample size at time of promotion */
  sampleSize: number;
  /** Whether promotion was automatic or manual */
  promotionType: "auto" | "manual";
  /** User who triggered promotion (for manual) */
  promotedBy: string | null;
  /** When the promotion was applied */
  promotedAt: Date;
  /** When the promotion was rolled back (if applicable) */
  rollbackAt: Date | null;
  /** Reason for rollback (if applicable) */
  rollbackReason: string | null;
  /** Additional metadata */
  metadata: {
    strategy: "immediate" | "gradual";
    safetyChecks: Record<string, boolean>;
    timestamp: string;
    [key: string]: unknown;
  };
}

/**
 * Safety Check Result
 * Individual safety check performed before promotion
 */
export interface SafetyCheckResult {
  /** Name of the safety check */
  checkName: string;
  /** Whether the check passed */
  passed: boolean;
  /** Human-readable message about the check */
  message: string;
  /** Severity level of a failed check */
  severity: "info" | "warning" | "critical";
  /** Actual value measured */
  value?: number;
  /** Threshold that was checked against */
  threshold?: number;
}

/**
 * Promotion Eligibility Analysis
 * Comprehensive analysis of whether an experiment is ready for promotion
 */
export interface PromotionEligibilityAnalysis {
  /** Whether the experiment is eligible for promotion */
  isEligible: boolean;
  /** Name of the experiment */
  experimentName: string;
  /** ID of the experiment */
  experimentId: string;
  /** Winning variant name (if eligible) */
  winnerVariant?: string;
  /** Winning variant ID (if eligible) */
  winnerVariantId?: string;
  /** Control variant name */
  controlVariant?: string;
  /** Control variant ID */
  controlVariantId?: string;
  /** Statistical confidence level achieved */
  confidence: number;
  /** Improvement percentage over control */
  improvement: number;
  /** All safety checks performed */
  safetyChecks: SafetyCheckResult[];
  /** Recommendation: promote, wait, or manual review */
  recommendation: "promote" | "wait" | "manual_review" | "not_ready";
  /** Reasons for the recommendation */
  reasons: string[];
  /** Warnings that don't prevent promotion but should be noted */
  warnings: string[];
}

/**
 * Promotion Strategy Options
 */
export type PromotionStrategy = "immediate" | "gradual";

/**
 * Promotion Status
 */
export type PromotionStatus =
  | "pending"
  | "in_progress"
  | "completed"
  | "rolled_back"
  | "failed";

/**
 * Promotion Action
 * Represents a promotion action in the system
 */
export interface PromotionAction {
  /** Action type */
  action: "promote" | "rollback" | "archive";
  /** Experiment ID */
  experimentId: string;
  /** Variant ID */
  variantId: string;
  /** Action status */
  status: PromotionStatus;
  /** When the action was initiated */
  initiatedAt: Date;
  /** When the action was completed */
  completedAt?: Date;
  /** Error if action failed */
  error?: string;
}

/**
 * Rollback Options
 */
export interface RollbackOptions {
  /** Reason for the rollback */
  reason: string;
  /** User ID who initiated the rollback */
  rolledBackBy?: string;
  /** Whether to restore equal traffic distribution */
  restoreEqualTraffic?: boolean;
  /** Custom traffic distribution to restore */
  customTrafficDistribution?: Record<string, number>;
  /** Whether to send notifications about the rollback */
  sendNotifications?: boolean;
}

/**
 * Rollback Result
 */
export interface RollbackResult {
  /** Whether the rollback was successful */
  success: boolean;
  /** ID of the experiment */
  experimentId: string;
  /** Name of the experiment */
  experimentName: string;
  /** ID of the variant that was rolled back to */
  rolledBackToVariantId?: string;
  /** Human-readable message */
  message: string;
  /** Timestamp when rollback occurred */
  rolledBackAt: Date;
  /** Error message if rollback failed */
  error?: string;
}

/**
 * Promotion History Entry
 * Summary of a promotion for history display
 */
export interface PromotionHistoryEntry {
  /** Promotion ID */
  id: string;
  /** Experiment name */
  experimentName: string;
  /** Promoted variant name */
  variantName: string;
  /** Promotion type */
  promotionType: "auto" | "manual";
  /** Who promoted it (for manual) */
  promotedBy?: string;
  /** When it was promoted */
  promotedAt: Date;
  /** Whether it was rolled back */
  wasRolledBack: boolean;
  /** When it was rolled back */
  rolledBackAt?: Date;
  /** Confidence level */
  confidence: number;
  /** Improvement percentage */
  improvement: number;
}

/**
 * Batch Promotion Check Result
 * Result from checking multiple experiments at once
 */
export interface BatchPromotionCheckResult {
  /** Total experiments checked */
  totalChecked: number;
  /** Number eligible for promotion */
  totalEligible: number;
  /** Number actually promoted */
  totalPromoted: number;
  /** List of experiments checked */
  experiments: Array<{
    name: string;
    isEligible: boolean;
    wasPromoted: boolean;
    reason: string;
  }>;
  /** Errors encountered during checking */
  errors: Array<{
    experimentName: string;
    error: string;
  }>;
  /** When the check was run */
  checkedAt: Date;
}

/**
 * Archive Options
 * Options for archiving losing variants
 */
export interface ArchiveOptions {
  /** Whether to actually delete variant data */
  hardDelete?: boolean;
  /** Retention period in days before hard delete */
  retentionDays?: number;
  /** Whether to archive variant configurations */
  archiveConfig?: boolean;
}

/**
 * Default promotion configuration
 */
export const DEFAULT_PROMOTION_CONFIG: PromotionConfig = {
  minConfidenceLevel: 95,
  minSampleSize: 1000,
  minImprovementPercent: 5,
  minRuntimeHours: 48,
  maxErrorRate: 0.05,
  requireManualApproval: false,
  enableGradualRollout: false,
  autoArchiveLosingVariants: true,
};
