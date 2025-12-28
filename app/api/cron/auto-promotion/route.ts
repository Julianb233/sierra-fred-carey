import { NextRequest, NextResponse } from "next/server";
import { checkExperimentsForPromotion } from "@/lib/auto-promotion-scheduler";

/**
 * GET /api/cron/auto-promotion
 * Vercel Cron endpoint for auto-promotion checks
 *
 * This endpoint is called by Vercel Cron on schedule.
 * It validates the CRON_SECRET and runs the auto-promotion scheduler.
 *
 * Security: Vercel automatically sends CRON_SECRET in Authorization header
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Validate cron secret (Vercel sends this in Authorization header)
    const authHeader = request.headers.get("authorization");
    const expectedSecret = process.env.CRON_SECRET;

    if (expectedSecret && authHeader !== `Bearer ${expectedSecret}`) {
      console.error("[Cron Auto-Promotion] Invalid or missing CRON_SECRET");
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    console.log("[Cron Auto-Promotion] Starting scheduled auto-promotion check");

    // Run the auto-promotion scheduler
    const result = await checkExperimentsForPromotion({
      // Use system notification user from env, or default to a system account
      notificationUserId: process.env.AUTO_PROMOTION_NOTIFICATION_USER_ID || "system",
    });

    const duration = Date.now() - startTime;

    console.log("[Cron Auto-Promotion] Completed", {
      duration: `${duration}ms`,
      checked: result.experimentsChecked,
      eligible: result.experimentsEligible,
      promoted: result.experimentsPromoted,
      errors: result.errors.length,
    });

    return NextResponse.json({
      success: true,
      data: {
        runId: result.runId,
        experimentsChecked: result.experimentsChecked,
        experimentsEligible: result.experimentsEligible,
        experimentsPromoted: result.experimentsPromoted,
        promotions: result.promotions,
        errors: result.errors,
        durationMs: duration,
      },
      message:
        result.experimentsPromoted > 0
          ? `Auto-promoted ${result.experimentsPromoted} experiment(s)`
          : result.experimentsEligible > 0
            ? `${result.experimentsEligible} experiment(s) eligible but require manual approval`
            : "No experiments eligible for auto-promotion",
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error("[Cron Auto-Promotion] Error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Auto-promotion cron failed",
        message: error.message,
        durationMs: duration,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

// Vercel Cron configuration
export const runtime = "nodejs";
export const maxDuration = 60; // Allow up to 60 seconds for the cron job
