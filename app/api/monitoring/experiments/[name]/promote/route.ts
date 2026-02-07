import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/auth/admin";
import {
  checkPromotionEligibility,
  promoteWinner,
  rollbackPromotion,
  getPromotionHistory,
  notifyPromotion,
  DEFAULT_PROMOTION_CONFIG,
  type PromotionConfig,
} from "@/lib/monitoring/auto-promotion";

/**
 * GET /api/monitoring/experiments/[name]/promote
 * Check if experiment is eligible for promotion
 *
 * SECURITY: Requires admin authentication
 * Query params:
 *   - minSampleSize: number (optional)
 *   - minConfidenceLevel: number (optional)
 *   - minImprovementPercent: number (optional)
 *   - minRuntimeHours: number (optional)
 *   - maxErrorRate: number (optional)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { name } = await params;
    const experimentName = decodeURIComponent(name);
    const searchParams = request.nextUrl.searchParams;

    // Build custom config if parameters provided
    const config: PromotionConfig = {
      ...DEFAULT_PROMOTION_CONFIG,
      ...(searchParams.has("minSampleSize") && {
        minSampleSize: parseInt(searchParams.get("minSampleSize")!, 10),
      }),
      ...(searchParams.has("minConfidenceLevel") && {
        minConfidenceLevel: parseFloat(searchParams.get("minConfidenceLevel")!),
      }),
      ...(searchParams.has("minImprovementPercent") && {
        minImprovementPercent: parseFloat(
          searchParams.get("minImprovementPercent")!
        ),
      }),
      ...(searchParams.has("minRuntimeHours") && {
        minRuntimeHours: parseFloat(searchParams.get("minRuntimeHours")!),
      }),
      ...(searchParams.has("maxErrorRate") && {
        maxErrorRate: parseFloat(searchParams.get("maxErrorRate")!),
      }),
    };

    logger.log(
      `[Promotion API] Checking eligibility for experiment: ${experimentName}`,
      { config }
    );

    const eligibility = await checkPromotionEligibility(experimentName, config);

    return NextResponse.json({
      success: true,
      data: {
        experimentName,
        ...eligibility,
        config,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const { name } = await params;
    console.error(
      `[Promotion API] Error checking eligibility for ${name}:`,
      error
    );

    if (error instanceof Error && error.message.includes("not found")) {
      return NextResponse.json(
        {
          success: false,
          error: "Experiment not found",
        },
        { status: 404 }
      );
    }

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
 * POST /api/monitoring/experiments/[name]/promote
 * Promote winning variant to production
 * Body:
 *   - promotionType: "auto" | "manual" (default: "manual")
 *   - promotedBy: string (optional, user ID)
 *   - config: PromotionConfig (optional, custom safety thresholds)
 *   - userId: string (for notifications)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { name } = await params;
    const experimentName = decodeURIComponent(name);
    const body = await request.json();

    const {
      promotionType = "manual",
      promotedBy,
      config = DEFAULT_PROMOTION_CONFIG,
      userId,
    } = body;

    // Validate promotion type
    if (!["auto", "manual"].includes(promotionType)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid promotion type",
          message: "promotionType must be 'auto' or 'manual'",
        },
        { status: 400 }
      );
    }

    logger.log(
      `[Promotion API] Promoting winner for experiment: ${experimentName}`,
      { promotionType, promotedBy }
    );

    // Check eligibility first
    const eligibility = await checkPromotionEligibility(experimentName, config);

    if (!eligibility.isEligible) {
      return NextResponse.json(
        {
          success: false,
          error: "Experiment not eligible for promotion",
          eligibility,
        },
        { status: 400 }
      );
    }

    // Promote the winner
    const record = await promoteWinner(
      experimentName,
      promotionType,
      promotedBy,
      config
    );

    // Send notification if userId provided
    if (userId) {
      try {
        await notifyPromotion(userId, record, eligibility);
      } catch (notifyError) {
        console.error(
          `[Promotion API] Failed to send notification:`,
          notifyError
        );
        // Don't fail the promotion if notification fails
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        promotion: record,
        eligibility,
      },
      message: `Successfully promoted variant ${record.promotedVariantName} to production`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const { name } = await params;
    console.error(`[Promotion API] Error promoting winner for ${name}:`, error);

    if (error instanceof Error && error.message.includes("not eligible")) {
      return NextResponse.json(
        {
          success: false,
          error: "Promotion not allowed",
        },
        { status: 400 }
      );
    }

    if (error instanceof Error && error.message.includes("not found")) {
      return NextResponse.json(
        {
          success: false,
          error: "Experiment not found",
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: "Failed to promote winner",
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/monitoring/experiments/[name]/promote
 * Rollback a promotion (revert to control)
 * Body:
 *   - reason: string (required)
 *   - rolledBackBy: string (optional, user ID)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { name } = await params;
    const experimentName = decodeURIComponent(name);
    const body = await request.json();

    const { reason, rolledBackBy } = body;

    if (!reason || typeof reason !== "string") {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request",
          message: "reason is required and must be a string",
        },
        { status: 400 }
      );
    }

    logger.log(
      `[Promotion API] Rolling back promotion for experiment: ${experimentName}`,
      { reason, rolledBackBy }
    );

    await rollbackPromotion(experimentName, reason, rolledBackBy);

    // Get updated promotion history
    const history = await getPromotionHistory(experimentName);

    return NextResponse.json({
      success: true,
      message: `Successfully rolled back promotion for experiment ${experimentName}`,
      data: {
        history,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const { name } = await params;
    console.error(
      `[Promotion API] Error rolling back promotion for ${name}:`,
      error
    );

    if (error instanceof Error && error.message.includes("not found")) {
      return NextResponse.json(
        {
          success: false,
          error: "No active promotion found",
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: "Failed to rollback promotion",
      },
      { status: 500 }
    );
  }
}
