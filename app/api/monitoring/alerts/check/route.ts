import { NextRequest, NextResponse } from "next/server";
import { runAlertNotificationCheck } from "@/lib/monitoring/alert-scheduler";

/**
 * GET /api/monitoring/alerts/check
 * Trigger alert notification check manually or via cron
 *
 * This endpoint can be:
 * 1. Called by Vercel Cron (configured in vercel.json)
 * 2. Called manually for testing
 * 3. Called by external schedulers
 *
 * Security: Consider adding API key authentication in production
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();

  // Optional: Check for authorization token
  const authHeader = request.headers.get("authorization");
  const expectedToken = process.env.CRON_SECRET;

  if (expectedToken && authHeader !== `Bearer ${expectedToken}`) {
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
    console.log("[Alert Check API] Running scheduled alert notification check...");

    const result = await runAlertNotificationCheck();

    const duration = Date.now() - startTime;

    return NextResponse.json({
      success: result.success,
      message: result.message,
      duration: `${duration}ms`,
      timestamp: result.timestamp,
    });
  } catch (error: any) {
    console.error("[Alert Check API] Error running alert check:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to run alert check",
        message: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/monitoring/alerts/check
 * Trigger alert check with custom parameters
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { minimumLevel = "warning" } = body;

    console.log(
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
  } catch (error: any) {
    console.error("[Alert Check API] Error in manual alert check:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to run manual alert check",
        message: error.message,
      },
      { status: 500 }
    );
  }
}
