import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual, createHmac } from "crypto";
import { isAdminRequest } from "@/lib/auth/admin";
import { runAlertNotificationCheck } from "@/lib/monitoring/alert-scheduler";
import { logger } from "@/lib/logger";

/**
 * GET /api/monitoring/alerts/check
 * Trigger alert notification check manually or via cron
 *
 * This endpoint can be:
 * 1. Called by Vercel Cron (configured in vercel.json)
 * 2. Called manually for testing
 * 3. Called by external schedulers
 *
 * SECURITY: Requires CRON_SECRET authorization
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();

  // SECURITY: Require CRON_SECRET or admin auth for alert check triggers (timing-safe)
  const authHeader = request.headers.get("authorization");
  const expectedToken = process.env.CRON_SECRET;
  let hasCronSecret = false;
  if (expectedToken && authHeader) {
    const expected = `Bearer ${expectedToken}`;
    const hmac1 = createHmac("sha256", "cron-auth").update(authHeader).digest();
    const hmac2 = createHmac("sha256", "cron-auth").update(expected).digest();
    hasCronSecret = timingSafeEqual(hmac1, hmac2);
  }
  const hasAdminAuth = isAdminRequest(request);

  if (!hasCronSecret && !hasAdminAuth) {
    console.warn("[Alert Check API] Unauthorized access attempt");
    return NextResponse.json(
      {
        success: false,
        error: "Unauthorized",
      },
      { status: 401 }
    );
  }

  try {
    logger.log("[Alert Check API] Running scheduled alert notification check...");

    const result = await runAlertNotificationCheck();

    const duration = Date.now() - startTime;

    return NextResponse.json({
      success: result.success,
      message: result.message,
      duration: `${duration}ms`,
      timestamp: result.timestamp,
    });
  } catch (error: unknown) {
    console.error("[Alert Check API] Error running alert check:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to run alert check",
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/monitoring/alerts/check
 * Trigger alert check with custom parameters
 *
 * Security: Requires CRON_SECRET authorization
 */
export async function POST(request: NextRequest) {
  try {
    // SECURITY: Require CRON_SECRET or admin auth for alert check triggers (timing-safe)
    const authHeader = request.headers.get("authorization");
    const expectedToken = process.env.CRON_SECRET;
    let hasCronSecret = false;
    if (expectedToken && authHeader) {
      const expected = `Bearer ${expectedToken}`;
      const hmac1 = createHmac("sha256", "cron-auth").update(authHeader).digest();
      const hmac2 = createHmac("sha256", "cron-auth").update(expected).digest();
      hasCronSecret = timingSafeEqual(hmac1, hmac2);
    }
    const hasAdminAuth = isAdminRequest(request);

    if (!hasCronSecret && !hasAdminAuth) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { minimumLevel = "warning" } = body;

    logger.log(
      `[Alert Check API] Running manual alert check (minimumLevel: ${minimumLevel})`
    );

    // For manual checks, we can customize the notification behavior
    const result = await runAlertNotificationCheck();

    return NextResponse.json({
      success: result.success,
      message: result.message,
      timestamp: result.timestamp,
      config: {
        minimumLevel,
      },
    });
  } catch (error: unknown) {
    console.error("[Alert Check API] Error in manual alert check:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to run manual alert check",
      },
      { status: 500 }
    );
  }
}
