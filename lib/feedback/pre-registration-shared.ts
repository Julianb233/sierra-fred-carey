/**
 * Pre-registration types, constants, and validation (client-safe).
 *
 * This module contains everything that can be imported from client components.
 * Server-only functions (createPreRegisteredExperiment, getPreRegistration) live
 * in pre-registration.ts which imports from supabase-sql.
 */

// ============================================================================
// Types
// ============================================================================

export interface PreRegistrationMetric {
  name: string
  type: "binary" | "continuous"
  direction: "higher_is_better" | "lower_is_better"
  minimumDetectableEffect: number
}

export interface PreRegistration {
  hypothesis: string
  primaryMetric: PreRegistrationMetric
  secondaryMetrics: PreRegistrationMetric[]
  minimumSampleSize: number
  expectedDuration: string
  expectedDurationDays: number
  rationale: string
  segmentFilter?: string
  registeredAt: string
  registeredBy: string
}

// ============================================================================
// Preset metrics
// ============================================================================

export const PRESET_METRICS: Record<string, PreRegistrationMetric> = {
  thumbsUpRatio: {
    name: "Thumbs-Up Ratio",
    type: "binary",
    direction: "higher_is_better",
    minimumDetectableEffect: 0.05,
  },
  avgSentimentScore: {
    name: "Average Sentiment Score",
    type: "continuous",
    direction: "higher_is_better",
    minimumDetectableEffect: 0.1,
  },
  sessionCompletionRate: {
    name: "Session Completion Rate",
    type: "binary",
    direction: "higher_is_better",
    minimumDetectableEffect: 0.05,
  },
  errorRate: {
    name: "Error Rate",
    type: "binary",
    direction: "lower_is_better",
    minimumDetectableEffect: 0.02,
  },
  avgLatency: {
    name: "Average Latency",
    type: "continuous",
    direction: "lower_is_better",
    minimumDetectableEffect: 100,
  },
}

// ============================================================================
// Validation
// ============================================================================

export function validatePreRegistration(
  reg: Partial<PreRegistration>
): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!reg.hypothesis || reg.hypothesis.trim().length < 20) {
    errors.push("Hypothesis must be at least 20 characters")
  }

  if (!reg.primaryMetric) {
    errors.push("Primary metric is required")
  } else {
    if (!reg.primaryMetric.name) errors.push("Primary metric name is required")
    if (!reg.primaryMetric.type) errors.push("Primary metric type is required")
    if (!reg.primaryMetric.direction)
      errors.push("Primary metric direction is required")
  }

  if (reg.minimumSampleSize !== undefined && reg.minimumSampleSize < 100) {
    errors.push("Minimum sample size must be at least 100")
  }

  if (reg.expectedDurationDays !== undefined && reg.expectedDurationDays <= 0) {
    errors.push("Expected duration must be greater than 0 days")
  }

  return { valid: errors.length === 0, errors }
}
