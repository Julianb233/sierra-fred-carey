import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/auth/admin";
import { getMonitoringDashboard } from "@/lib/monitoring/ab-test-metrics";
import { logger } from "@/lib/logger";

/**
 * GET /api/monitoring/dashboard
 * Real-time A/B test monitoring dashboard
 * Returns active experiments, metrics, and critical alerts
 *
 * SECURITY: Requires admin authentication
 */
export async function GET(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    logger.log("[Monitoring API] Fetching dashboard data");

    const dashboard = await getMonitoringDashboard();

    return NextResponse.json({
      success: true,
      data: dashboard,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("[Monitoring API] Dashboard error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch monitoring dashboard",
      },
      { status: 500 }
    );
  }
}
