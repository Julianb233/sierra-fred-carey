import { NextRequest, NextResponse } from "next/server";
import { getMonitoringDashboard } from "@/lib/monitoring/ab-test-metrics";

/**
 * GET /api/monitoring/dashboard
 * Real-time A/B test monitoring dashboard
 * Returns active experiments, metrics, and critical alerts
 */
export async function GET(request: NextRequest) {
  try {
    console.log("[Monitoring API] Fetching dashboard data");

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
        message: error.message,
      },
      { status: 500 }
    );
  }
}
