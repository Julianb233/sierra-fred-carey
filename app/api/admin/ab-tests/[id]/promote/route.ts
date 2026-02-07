import { NextRequest, NextResponse } from "next/server";
import {
  checkPromotionEligibility,
  promoteWinningVariant,
  getPromotionHistory,
} from "@/lib/ab-testing/auto-promotion";
import { sql } from "@/lib/db/supabase-sql";
import { isAdminRequest } from "@/lib/auth/admin";
import { logger } from "@/lib/logger";

/**
 * GET /api/admin/ab-tests/[id]/promote
 * Check promotion eligibility for an experiment
 * Returns:
 * - Eligibility status
 * - Safety check results
 * - Recommendation (promote, wait, manual_review, not_ready)
 * - Promotion history
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAdminRequest(request)) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const { id: experimentId } = await params;

    logger.log(
      `[Admin AB Promote GET] Checking promotion eligibility for experiment ${experimentId}`
    );

    // Get experiment name
    const experimentResult = await sql`
      SELECT
        id,
        name,
        is_active as "isActive",
        start_date as "startDate",
        end_date as "endDate"
      FROM ab_experiments
      WHERE id = ${experimentId}
    `;

    if (experimentResult.length === 0) {
      return NextResponse.json(
        { success: false, error: "Experiment not found" },
        { status: 404 }
      );
    }

    const experiment = experimentResult[0] as any;

    if (!experiment.isActive) {
      return NextResponse.json(
        {
          success: false,
          error: "Experiment is not active",
          experimentId,
          experimentName: experiment.name,
        },
        { status: 400 }
      );
    }

    // Check eligibility
    const eligibility = await checkPromotionEligibility(experiment.name);

    // Get promotion history
    const history = await getPromotionHistory(experiment.name);

    // Get current traffic distribution
    const variants = await sql`
      SELECT
        id,
        variant_name as "variantName",
        traffic_percentage as "trafficPercentage"
      FROM ab_variants
      WHERE experiment_id = ${experimentId}
      ORDER BY variant_name
    `;

    return NextResponse.json({
      success: true,
      experiment: {
        id: experiment.id,
        name: experiment.name,
        isActive: experiment.isActive,
        startDate: experiment.startDate,
        endDate: experiment.endDate,
      },
      eligibility,
      currentTraffic: variants,
      promotionHistory: history,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Admin AB Promote GET] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to check promotion eligibility",
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/ab-tests/[id]/promote
 * Manually trigger promotion of the winning variant
 * Body (optional): {
 *   force?: boolean,  // Skip safety checks (use with caution!)
 *   customRules?: Partial<PromotionRules>  // Override default promotion rules
 * }
 *
 * Sets winning variant to 100% traffic and deactivates others
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAdminRequest(request)) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const { id: experimentId } = await params;
    const body = await request.json().catch(() => ({}));
    const { force = false, customRules } = body;

    logger.log(
      `[Admin AB Promote POST] Promoting experiment ${experimentId} (force: ${force})`
    );

    // Get experiment name
    const experimentResult = await sql`
      SELECT
        id,
        name,
        is_active as "isActive"
      FROM ab_experiments
      WHERE id = ${experimentId}
    `;

    if (experimentResult.length === 0) {
      return NextResponse.json(
        { success: false, error: "Experiment not found" },
        { status: 404 }
      );
    }

    const experiment = experimentResult[0] as any;

    if (!experiment.isActive) {
      return NextResponse.json(
        {
          success: false,
          error: "Cannot promote inactive experiment",
          experimentId,
          experimentName: experiment.name,
        },
        { status: 400 }
      );
    }

    // Get user ID from header (optional)
    const userId = request.headers.get("x-user-id") || "admin";

    // Attempt promotion
    const result = await promoteWinningVariant(experiment.name, {
      userId,
      triggeredBy: "manual",
      customRules,
      force,
    });

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.message,
          result,
        },
        { status: 400 }
      );
    }

    // Get updated traffic distribution
    const variants = await sql`
      SELECT
        id,
        variant_name as "variantName",
        traffic_percentage as "trafficPercentage"
      FROM ab_variants
      WHERE experiment_id = ${experimentId}
      ORDER BY variant_name
    `;

    logger.log(
      `[Admin AB Promote POST] Successfully promoted ${result.winningVariant} for experiment ${experiment.name}`
    );

    return NextResponse.json({
      success: true,
      message: result.message,
      experiment: {
        id: experiment.id,
        name: experiment.name,
      },
      winningVariant: result.winningVariant,
      action: result.action,
      auditLogId: result.auditLogId,
      updatedTraffic: variants,
      eligibility: result.eligibility,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Admin AB Promote POST] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to promote variant",
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/ab-tests/[id]/promote
 * Rollback a promotion to previous state
 * Body: {
 *   reason: string,  // Required: reason for rollback
 *   restoreTraffic?: Record<string, number>  // Optional: manual traffic distribution
 * }
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAdminRequest(request)) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const { id: experimentId } = await params;
    const body = await request.json();
    const { reason, restoreTraffic } = body;

    if (!reason) {
      return NextResponse.json(
        { success: false, error: "Rollback reason is required" },
        { status: 400 }
      );
    }

    logger.log(
      `[Admin AB Promote DELETE] Rolling back promotion for experiment ${experimentId}`
    );

    // Get experiment name
    const experimentResult = await sql`
      SELECT id, name
      FROM ab_experiments
      WHERE id = ${experimentId}
    `;

    if (experimentResult.length === 0) {
      return NextResponse.json(
        { success: false, error: "Experiment not found" },
        { status: 404 }
      );
    }

    const experiment = experimentResult[0] as any;

    // Get user ID from header (optional)
    const userId = request.headers.get("x-user-id") || "admin";

    // Import rollback function dynamically to avoid circular deps
    const { rollbackPromotion } = await import("@/lib/ab-testing/auto-promotion");

    // Perform rollback
    const result = await rollbackPromotion(experiment.name, {
      userId,
      reason,
      restoreTraffic,
    });

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.message,
          result,
        },
        { status: 400 }
      );
    }

    // Get updated traffic distribution
    const variants = await sql`
      SELECT
        id,
        variant_name as "variantName",
        traffic_percentage as "trafficPercentage"
      FROM ab_variants
      WHERE experiment_id = ${experimentId}
      ORDER BY variant_name
    `;

    logger.log(
      `[Admin AB Promote DELETE] Successfully rolled back promotion for experiment ${experiment.name}`
    );

    return NextResponse.json({
      success: true,
      message: result.message,
      experiment: {
        id: experiment.id,
        name: experiment.name,
      },
      rolledBackTo: result.rolledBackTo,
      reason,
      auditLogId: result.auditLogId,
      updatedTraffic: variants,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Admin AB Promote DELETE] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to rollback promotion",
      },
      { status: 500 }
    );
  }
}
