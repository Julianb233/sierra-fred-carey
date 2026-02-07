import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/auth/admin";
import { getMonitoringDashboard } from "@/lib/monitoring/ab-test-metrics";
import { sendNotification, NotificationPayload } from "@/lib/notifications";
import { notifyAlerts } from "@/lib/monitoring/alert-notifier";
import { logger } from "@/lib/logger";

/**
 * GET /api/monitoring/alerts
 * Get critical alerts across all active experiments
 * Query params:
 *   - level: Filter by alert level (info, warning, critical)
 *   - type: Filter by alert type (performance, errors, traffic, significance)
 *   - notify: If true, send notifications for new alerts (default: false)
 *
 * SECURITY: Requires admin authentication
 */
export async function GET(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const levelFilter = searchParams.get("level");
    const typeFilter = searchParams.get("type");
    const shouldNotify = searchParams.get("notify") === "true";

    logger.log("[Monitoring API] Fetching alerts", { levelFilter, typeFilter, shouldNotify });

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

    // Send notifications if requested
    if (shouldNotify && allAlerts.length > 0) {
      logger.log(`[Monitoring API] Sending notifications for ${allAlerts.length} alerts`);

      // Use the enhanced alert notifier to send to all subscribed users
      notifyAlerts(allAlerts, {
        immediate: true,
        minimumLevel: levelFilter as any || "warning",
      })
        .then((stats) => {
          logger.log(
            `[Monitoring API] Notified ${stats.notificationsSent} subscribers (${stats.notificationsFailed} failed)`
          );
          if (stats.errors.length > 0) {
            console.error(
              `[Monitoring API] Notification errors: ${stats.errors.join(", ")}`
            );
          }
        })
        .catch((error) => {
          console.error("[Monitoring API] Failed to notify alerts:", error);
        });
    }

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
  } catch (error) {
    console.error("[Monitoring Alerts] Error fetching alerts:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch alerts",
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/monitoring/alerts
 * Manually trigger notifications for specific alerts
 *
 * Body:
 *   - userId: User to notify
 *   - level: Alert level
 *   - type: Alert type
 *   - title: Alert title
 *   - message: Alert message
 *   - experimentName: (optional) Experiment name
 *   - variantName: (optional) Variant name
 *   - metadata: (optional) Additional metadata
 */
export async function POST(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      userId,
      level,
      type,
      title,
      message,
      experimentName,
      variantName,
      metric,
      value,
      threshold,
      metadata = {},
    } = body;

    // Validation
    if (!userId || !level || !type || !title || !message) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields: userId, level, type, title, message",
        },
        { status: 400 }
      );
    }

    const validLevels = ["info", "warning", "critical"];
    if (!validLevels.includes(level)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid level. Must be one of: ${validLevels.join(", ")}`,
        },
        { status: 400 }
      );
    }

    const validTypes = ["performance", "errors", "traffic", "significance"];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid type. Must be one of: ${validTypes.join(", ")}`,
        },
        { status: 400 }
      );
    }

    // Create notification payload
    const payload: NotificationPayload = {
      userId,
      level,
      type,
      title,
      message,
      experimentName,
      variantName,
      metric,
      value,
      threshold,
      metadata,
    };

    logger.log("[Monitoring API] Sending manual notification:", payload);

    // Send notification
    const results = await sendNotification(payload);

    return NextResponse.json({
      success: true,
      data: {
        sent: results.filter((r) => r.success).length,
        failed: results.filter((r) => !r.success).length,
        results,
      },
    });
  } catch (error) {
    console.error("[Monitoring Alerts] Error sending notification:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to send notification",
      },
      { status: 500 }
    );
  }
}
