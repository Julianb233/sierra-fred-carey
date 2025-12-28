import { NextRequest, NextResponse } from "next/server";
import { getMonitoringDashboard } from "@/lib/monitoring/ab-test-metrics";

/**
 * GET /api/monitoring/alerts
 * Get critical alerts across all active experiments
 * Query params:
 *   - level: Filter by alert level (info, warning, critical)
 *   - type: Filter by alert type (performance, errors, traffic, significance)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const levelFilter = searchParams.get("level");
    const typeFilter = searchParams.get("type");

    console.log("[Monitoring API] Fetching alerts", { levelFilter, typeFilter });

    const dashboard = await getMonitoringDashboard();

    // Collect all alerts from all experiments
    let allAlerts = dashboard.activeExperiments.flatMap((exp) => exp.alerts);

    // Apply filters
    if (levelFilter) {
      allAlerts = allAlerts.filter((alert) => alert.level === levelFilter);
    }

    if (typeFilter) {
      allAlerts = allAlerts.filter((alert) => alert.type === typeFilter);
    }

    // Sort by severity and timestamp
    const severityOrder = { critical: 0, warning: 1, info: 2 };
    allAlerts.sort((a, b) => {
      const severityDiff =
        severityOrder[a.level] - severityOrder[b.level];
      if (severityDiff !== 0) return severityDiff;
      return b.timestamp.getTime() - a.timestamp.getTime();
    });

    return NextResponse.json({
      success: true,
      data: {
        alerts: allAlerts,
        total: allAlerts.length,
        breakdown: {
          critical: allAlerts.filter((a) => a.level === "critical").length,
          warning: allAlerts.filter((a) => a.level === "warning").length,
          info: allAlerts.filter((a) => a.level === "info").length,
        },
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("[Monitoring API] Error fetching alerts:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch alerts",
        message: error.message,
      },
      { status: 500 }
    );
  }
}
