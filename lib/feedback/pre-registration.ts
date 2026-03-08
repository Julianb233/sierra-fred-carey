/**
 * Pre-registration template for A/B experiments (server-only).
 *
 * Phase 75 (REQ-A3): Captures hypothesis, primary/secondary metrics,
 * minimum sample size, and expected duration before experiment starts.
 * Stored in the ab_experiments metadata JSONB column.
 *
 * Types, constants, and validation are in pre-registration-shared.ts
 * so client components can import them without pulling in server deps.
 */

import { sql } from "@/lib/db/supabase-sql"
import { createExperiment } from "@/lib/ai/ab-testing"
import { logger } from "@/lib/logger"

// Re-export everything from the shared module for backward compatibility
export {
  PRESET_METRICS,
  validatePreRegistration,
} from "./pre-registration-shared"

export type {
  PreRegistration,
  PreRegistrationMetric,
} from "./pre-registration-shared"

// Import types for local use
import type { PreRegistration } from "./pre-registration-shared"
import { validatePreRegistration } from "./pre-registration-shared"

// ============================================================================
// Experiment creation with pre-registration (server-only)
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
