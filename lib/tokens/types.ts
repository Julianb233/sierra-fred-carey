/**
 * Token Tracking and Budgeting System Types
 *
 * Comprehensive type definitions for tracking token usage across AI models,
 * managing budgets, and alerting on usage thresholds.
 */

/**
 * Supported AI model identifiers with their pricing
 */
export type AIModel =
  | "gpt-4-turbo-preview"
  | "gpt-4"
  | "gpt-3.5-turbo"
  | "claude-3-5-sonnet-20241022"
  | "claude-3-opus-20240229"
  | "claude-3-sonnet-20240229"
  | "claude-3-haiku-20240307"
  | "gemini-1.5-flash"
  | "gemini-1.5-pro";

/**
 * Token usage breakdown for a single request
 */
export interface TokenUsage {
  id: string;
  userId: string;
  requestId: string;
  model: AIModel;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCost: number;
  experimentId?: string;
  variantId?: string;
  analyzer?: string;
  createdAt: Date;
}

/**
 * Aggregated token usage statistics
 */
export interface TokenUsageStats {
  totalTokens: number;
  totalCost: number;
  totalRequests: number;
  byModel: UsageByModel[];
  byExperiment?: UsageByExperiment[];
  byAnalyzer?: UsageByAnalyzer[];
  period: {
    start: Date;
    end: Date;
  };
}

/**
 * Token usage aggregated by model
 */
export interface UsageByModel {
  model: AIModel;
  totalTokens: number;
  promptTokens: number;
  completionTokens: number;
  requestCount: number;
  totalCost: number;
  avgTokensPerRequest: number;
  percentOfTotal: number;
}

/**
 * Token usage aggregated by experiment
 */
export interface UsageByExperiment {
  experimentId: string;
  experimentName: string;
  totalTokens: number;
  totalCost: number;
  requestCount: number;
  avgTokensPerRequest: number;
  variants: UsageByVariant[];
}

/**
 * Token usage by experiment variant
 */
export interface UsageByVariant {
  variantId: string;
  variantName: string;
  totalTokens: number;
  totalCost: number;
  requestCount: number;
  avgTokensPerRequest: number;
}

/**
 * Token usage aggregated by analyzer type
 */
export interface UsageByAnalyzer {
  analyzer: string;
  totalTokens: number;
  totalCost: number;
  requestCount: number;
  avgTokensPerRequest: number;
  percentOfTotal: number;
}

/**
 * Budget period types
 */
export type BudgetPeriod = "daily" | "weekly" | "monthly" | "yearly";

/**
 * Alert severity levels
 */
export type AlertSeverity = "info" | "warning" | "critical";

/**
 * Budget configuration
 */
export interface TokenBudget {
  id: string;
  userId: string;
  period: BudgetPeriod;
  limitTokens?: number;
  limitCost?: number;
  currentTokens: number;
  currentCost: number;
  percentUsed: number;
  resetAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Budget alert threshold configuration
 */
export interface BudgetAlertThreshold {
  id: string;
  budgetId: string;
  thresholdPercent: number;
  severity: AlertSeverity;
  notified: boolean;
  notifiedAt?: Date;
}

/**
 * Budget alert event
 */
export interface TokenAlert {
  id: string;
  budgetId: string;
  userId: string;
  alertType: "threshold" | "limit_exceeded" | "anomaly";
  severity: AlertSeverity;
  thresholdPercent?: number;
  currentUsage: {
    tokens: number;
    cost: number;
    percentUsed: number;
  };
  message: string;
  acknowledged: boolean;
  acknowledgedAt?: Date;
  createdAt: Date;
}

/**
 * Model pricing configuration (cost per 1M tokens)
 */
export interface ModelPricing {
  model: AIModel;
  inputCostPer1M: number;
  outputCostPer1M: number;
  currency: "USD";
}

/**
 * Token usage tracking request
 */
export interface TrackTokenUsageRequest {
  userId: string;
  requestId: string;
  model: AIModel;
  promptTokens: number;
  completionTokens: number;
  experimentId?: string;
  variantId?: string;
  analyzer?: string;
}

/**
 * Budget creation/update request
 */
export interface BudgetRequest {
  period: BudgetPeriod;
  limitTokens?: number;
  limitCost?: number;
}

/**
 * Budget status response
 */
export interface BudgetStatus {
  budget: TokenBudget;
  alerts: TokenAlert[];
  projectedUsage: {
    tokensAtPeriodEnd: number;
    costAtPeriodEnd: number;
    willExceedLimit: boolean;
    daysUntilReset: number;
  };
}

/**
 * Token usage query filters
 */
export interface UsageQueryFilters {
  userId: string;
  startDate?: Date;
  endDate?: Date;
  model?: AIModel;
  experimentId?: string;
  variantId?: string;
  analyzer?: string;
  period?: "day" | "week" | "month" | "year" | "all";
}

/**
 * API Response wrapper for token endpoints
 */
export interface TokenAPIResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

/**
 * Usage trends data point
 */
export interface UsageTrendDataPoint {
  date: string;
  totalTokens: number;
  totalCost: number;
  requestCount: number;
  avgTokensPerRequest: number;
}

/**
 * Cost optimization recommendations
 */
export interface CostOptimizationRecommendation {
  type: "model_switch" | "prompt_optimization" | "caching" | "batching";
  title: string;
  description: string;
  currentCost: number;
  projectedCost: number;
  potentialSavings: number;
  savingsPercent: number;
  priority: "low" | "medium" | "high";
}

/**
 * Token budget rollover configuration
 */
export interface BudgetRollover {
  enabled: boolean;
  maxRolloverPercent: number;
  rolloverTokens: number;
  rolloverCost: number;
  expiresAt: Date;
}
