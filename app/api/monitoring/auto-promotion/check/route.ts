import { NextRequest, NextResponse } from "next/server";
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
 * Security: Recommend using Vercel Cron or similar with secret validation
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, config = DEFAULT_PROMOTION_CONFIG, cronSecret } = body;

    // Validate cron secret if configured
    const expectedSecret = process.env.AUTO_PROMOTION_CRON_SECRET;
    if (expectedSecret && cronSecret !== expectedSecret) {
      console.error("[Auto-Promotion] Invalid cron secret");
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized",
          message: "Invalid cron secret",
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

    console.log("[Auto-Promotion] Starting auto-check cycle", {
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
        message: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/monitoring/auto-promotion/check
 * Get information about auto-promotion configuration
 */
export async function GET(request: NextRequest) {
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
