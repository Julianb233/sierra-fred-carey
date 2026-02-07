import { sql } from "@/lib/db/supabase-sql";
import crypto from "crypto";
import { logVariantAssignment } from "@/lib/monitoring/ab-test-metrics";
import { logger } from "@/lib/logger";

export interface ABVariant {
  id: string;
  experimentName: string;
  variantName: string;
  promptId: string | null;
  configOverrides: Record<string, any>;
  trafficPercentage: number;
}

interface ABExperiment {
  id: string;
  name: string;
  isActive: boolean;
}

// Cache for active experiments (5 minute TTL)
let experimentsCache: { experiments: ABExperiment[]; expiry: number } | null =
  null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Deterministic hash function for consistent user assignment
 * Same user + same experiment = same variant every time
 */
function hashUserExperiment(userId: string, experimentName: string): number {
  const hash = crypto
    .createHash("md5")
    .update(`${userId}:${experimentName}`)
    .digest("hex");
  // Convert first 8 hex chars to number, mod 100 for percentage
  return parseInt(hash.substring(0, 8), 16) % 100;
}

/**
 * Get active experiments with caching
 */
export async function getActiveExperiments(): Promise<string[]> {
  // Check cache
  if (experimentsCache && experimentsCache.expiry > Date.now()) {
    logger.log("[A/B Test] Using cached experiments");
    return experimentsCache.experiments
      .filter((e) => e.isActive)
      .map((e) => e.name);
  }

  logger.log("[A/B Test] Loading active experiments from database");

  try {
    const result = await sql`
      SELECT
        id,
        name,
        is_active as "isActive"
      FROM ab_experiments
      WHERE is_active = true
        AND (end_date IS NULL OR end_date > NOW())
    `;

    const experiments = result as any as ABExperiment[];

    // Update cache
    experimentsCache = {
      experiments,
      expiry: Date.now() + CACHE_TTL,
    };

    logger.log(`[A/B Test] Found ${experiments.length} active experiments`);
    return experiments.map((e) => e.name);
  } catch (error) {
    console.error("[A/B Test] Error loading experiments:", error);
    throw error;
  }
}

/**
 * Get variant assignment for a user in a specific experiment
 * Uses deterministic hashing for consistent assignment
 *
 * @param userId - User ID for assignment
 * @param experimentName - Name of the experiment
 * @param sessionId - Optional session ID for tracking
 * @returns Assigned variant or null if experiment not active
 */
export async function getVariantAssignment(
  userId: string,
  experimentName: string,
  sessionId?: string
): Promise<ABVariant | null> {
  logger.log(`[A/B Test] Getting variant for user ${userId} in ${experimentName}`);

  try {
    // Get experiment and variants
    const result = await sql`
      SELECT
        v.id,
        e.name as "experimentName",
        v.variant_name as "variantName",
        v.prompt_id as "promptId",
        v.config_overrides as "configOverrides",
        v.traffic_percentage as "trafficPercentage"
      FROM ab_variants v
      JOIN ab_experiments e ON v.experiment_id = e.id
      WHERE e.name = ${experimentName}
        AND e.is_active = true
        AND (e.end_date IS NULL OR e.end_date > NOW())
      ORDER BY v.variant_name
    `;

    if (result.length === 0) {
      logger.log(`[A/B Test] No active experiment found: ${experimentName}`);
      return null;
    }

    const variants = result as any as ABVariant[];

    // Deterministic assignment based on hash
    const hashValue = hashUserExperiment(userId, experimentName);

    // Assign based on traffic percentages
    let cumulativePercentage = 0;
    for (const variant of variants) {
      cumulativePercentage += variant.trafficPercentage;
      if (hashValue < cumulativePercentage) {
        logger.log(
          `[A/B Test] Assigned user ${userId} to variant '${variant.variantName}' (hash: ${hashValue}, threshold: ${cumulativePercentage})`
        );
        
        // Log assignment to monitoring system
        await logVariantAssignment(
          userId,
          variant.id,
          experimentName,
          sessionId
        );
        
        return variant;
      }
    }

    // Fallback to last variant if percentages don't add to 100
    const fallbackVariant = variants[variants.length - 1];
    logger.log(
      `[A/B Test] Fallback assignment to variant '${fallbackVariant.variantName}'`
    );
    
    // Log fallback assignment
    await logVariantAssignment(
      userId,
      fallbackVariant.id,
      experimentName,
      sessionId
    );
    
    return fallbackVariant;
  } catch (error) {
    console.error(
      `[A/B Test] Error getting variant assignment for ${experimentName}:`,
      error
    );
    throw error;
  }
}

/**
 * Record that a variant was used in a request
 * Links the variant to the AI request for analysis
 *
 * @param variantId - The variant ID that was used
 * @param requestId - The AI request ID to link to
 */
export async function recordVariantUsage(
  variantId: string,
  requestId: string
): Promise<void> {
  logger.log(`[A/B Test] Recording variant ${variantId} usage for request ${requestId}`);

  try {
    // The variant_id is already stored in ai_requests table
    // This function is kept for potential future analytics tracking
    // For now, it's a no-op since the link is in ai_requests.variant_id
    logger.log("[A/B Test] Variant usage recorded via ai_requests table");
  } catch (error) {
    console.error("[A/B Test] Error recording variant usage:", error);
    // Don't throw - this is non-critical
  }
}

/**
 * Get variant statistics for an experiment
 * Useful for analyzing A/B test results
 *
 * @param experimentName - Name of the experiment
 * @returns Statistics per variant
 */
export async function getVariantStats(
  experimentName: string
): Promise<
  Array<{
    variantName: string;
    totalRequests: number;
    avgLatency: number;
    errorRate: number;
  }>
> {
  logger.log(`[A/B Test] Getting stats for experiment ${experimentName}`);

  try {
    const result = await sql`
      SELECT
        v.variant_name as "variantName",
        COUNT(req.id) as "totalRequests",
        AVG(resp.latency_ms) as "avgLatency",
        SUM(CASE WHEN resp.error IS NOT NULL THEN 1 ELSE 0 END)::FLOAT / COUNT(req.id) as "errorRate"
      FROM ab_variants v
      JOIN ab_experiments e ON v.experiment_id = e.id
      LEFT JOIN ai_requests req ON req.variant_id = v.id
      LEFT JOIN ai_responses resp ON resp.request_id = req.id
      WHERE e.name = ${experimentName}
      GROUP BY v.id, v.variant_name
      ORDER BY v.variant_name
    `;

    const stats = result.map((row: any) => ({
      variantName: row.variantName,
      totalRequests: parseInt(row.totalRequests, 10),
      avgLatency: parseFloat(row.avgLatency) || 0,
      errorRate: parseFloat(row.errorRate) || 0,
    }));

    logger.log(`[A/B Test] Retrieved stats for ${stats.length} variants`);
    return stats;
  } catch (error) {
    console.error(`[A/B Test] Error getting variant stats:`, error);
    throw error;
  }
}

/**
 * Create a new A/B test experiment
 *
 * @param name - Unique experiment name
 * @param description - Optional description
 * @param variants - Array of variant configurations
 * @param userId - User creating the experiment
 */
export async function createExperiment(
  name: string,
  description: string | null,
  variants: Array<{
    variantName: string;
    promptId?: string;
    configOverrides?: Record<string, any>;
    trafficPercentage: number;
  }>,
  userId: string
): Promise<string> {
  logger.log(`[A/B Test] Creating experiment: ${name}`);

  try {
    // Validate traffic percentages sum to 100
    const totalPercentage = variants.reduce(
      (sum, v) => sum + v.trafficPercentage,
      0
    );
    if (totalPercentage !== 100) {
      throw new Error(
        `Traffic percentages must sum to 100, got ${totalPercentage}`
      );
    }

    // Create experiment
    const experimentResult = await sql`
      INSERT INTO ab_experiments (name, description, created_by)
      VALUES (${name}, ${description}, ${userId})
      RETURNING id
    `;

    const experimentId = experimentResult[0].id as string;

    // Create variants
    for (const variant of variants) {
      await sql`
        INSERT INTO ab_variants (
          experiment_id,
          variant_name,
          prompt_id,
          config_overrides,
          traffic_percentage
        )
        VALUES (
          ${experimentId},
          ${variant.variantName},
          ${variant.promptId || null},
          ${JSON.stringify(variant.configOverrides || {})},
          ${variant.trafficPercentage}
        )
      `;
    }

    // Clear cache
    experimentsCache = null;

    logger.log(`[A/B Test] Created experiment ${name} with ${variants.length} variants`);
    return experimentId;
  } catch (error) {
    console.error(`[A/B Test] Error creating experiment:`, error);
    throw error;
  }
}

/**
 * End an A/B test experiment
 *
 * @param experimentName - Name of the experiment to end
 */
export async function endExperiment(experimentName: string): Promise<void> {
  logger.log(`[A/B Test] Ending experiment: ${experimentName}`);

  try {
    await sql`
      UPDATE ab_experiments
      SET
        is_active = false,
        end_date = NOW()
      WHERE name = ${experimentName}
    `;

    // Clear cache
    experimentsCache = null;

    logger.log(`[A/B Test] Ended experiment: ${experimentName}`);
  } catch (error) {
    console.error(`[A/B Test] Error ending experiment:`, error);
    throw error;
  }
}
