/**
 * Pre-registration template for A/B experiments
 *
 * Phase 75 (REQ-A3): Captures hypothesis, primary/secondary metrics,
 * minimum sample size, and expected duration before experiment starts.
 * Stored in the ab_experiments metadata JSONB column.
 */

import { sql } from "@/lib/db/supabase-sql"
import { createExperiment } from "@/lib/ai/ab-testing"
import { logger } from "@/lib/logger"

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

// ============================================================================
// Experiment creation with pre-registration
// ============================================================================

export async function createPreRegisteredExperiment(params: {
  name: string
  description: string
  variants: Array<{
    variantName: string
    promptId?: string
    configOverrides?: Record<string, unknown>
    trafficPercentage: number
  }>
  preRegistration: PreRegistration
  userId: string
}): Promise<string> {
  const { name, description, variants, preRegistration, userId } = params

  const validation = validatePreRegistration(preRegistration)
  if (!validation.valid) {
    throw new Error(
      `Pre-registration validation failed: ${validation.errors.join(", ")}`
    )
  }

  const experimentId = await createExperiment(name, description, variants, userId)

  try {
    await sql`
      UPDATE ab_experiments
      SET metadata = ${JSON.stringify({ preRegistration })}
      WHERE id = ${experimentId}
    `
    logger.log(
      `[PreRegistration] Stored pre-registration for experiment ${experimentId}`
    )
  } catch (error) {
    logger.warn(
      "[PreRegistration] Failed to store pre-registration metadata:",
      error
    )
  }

  return experimentId
}

/**
 * Retrieve pre-registration data for an experiment.
 */
export async function getPreRegistration(
  experimentId: string
): Promise<PreRegistration | null> {
  try {
    const result = await sql`
      SELECT metadata
      FROM ab_experiments
      WHERE id = ${experimentId}
    `

    if (result.length === 0) return null

    const metadata = result[0].metadata as Record<string, unknown> | null
    if (!metadata || !metadata.preRegistration) return null

    return metadata.preRegistration as PreRegistration
  } catch (error) {
    logger.warn("[PreRegistration] Failed to get pre-registration:", error)
    return null
  }
}
