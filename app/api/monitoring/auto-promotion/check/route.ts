import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/auth/admin";
import {
  autoCheckPromotions,
  DEFAULT_PROMOTION_CONFIG,
  type PromotionConfig,
} from "@/lib/monitoring/auto-promotion";

/**
 * POST /api/monitoring/auto-promotion/check
 * Run auto-promotion check on all active experiments
 * This endpoint should be called periodically (e.g., hourly via cron)
 *
 * Body:
 *   - userId: string (required, for notifications)
 *   - config: PromotionConfig (optional)
 *   - cronSecret: string (optional, for security)
 *
 * SECURITY: Requires AUTO_PROMOTION_CRON_SECRET or admin auth
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, config = DEFAULT_PROMOTION_CONFIG, cronSecret } = body;

    // SECURITY: Require cron secret or admin auth
    const expectedSecret = process.env.AUTO_PROMOTION_CRON_SECRET;
    const hasCronSecret = expectedSecret && cronSecret === expectedSecret;
    const hasAdminAuth = isAdminRequest(request);

    if (!hasCronSecret && !hasAdminAuth) {
      console.error("[Auto-Promotion] Unauthorized access attempt");
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized",
          message: "Valid cron secret or admin authentication required",
        },
        { status: 401 }
      );
    }

    // Validate userId
    if (!userId || typeof userId !== "string") {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request",
          message: "userId is required",
        },
        { status: 400 }
      );
    }

    logger.log("[Auto-Promotion] Starting auto-check cycle", {
      userId,
      config,
    });

    const results = await autoCheckPromotions(userId, config);

    return NextResponse.json({
      success: true,
      data: results,
      message:
        results.promoted > 0
          ? `Auto-promoted ${results.promoted} experiment(s)`
          : "No experiments eligible for auto-promotion",
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("[Auto-Promotion] Error in auto-check:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Auto-promotion check failed",
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/monitoring/auto-promotion/check
 * Get information about auto-promotion configuration
 *
 * SECURITY: Requires admin authentication
 */
export async function GET(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    success: true,
    data: {
      enabled: process.env.AUTO_PROMOTION_ENABLED !== "false",
      requireManualApproval:
        process.env.AUTO_PROMOTION_REQUIRE_MANUAL === "true",
      defaultConfig: DEFAULT_PROMOTION_CONFIG,
      cronSecretConfigured: !!process.env.AUTO_PROMOTION_CRON_SECRET,
    },
    timestamp: new Date().toISOString(),
  });
}
