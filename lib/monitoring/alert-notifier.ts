/**
 * Alert Notifier Service
 * Automatically sends notifications when alerts are generated
 * Integrates with the notification system to deliver multi-channel alerts
 */

import { sendNotification, NotificationPayload } from "@/lib/notifications";
import { Alert } from "./ab-test-metrics";
import { sql } from "@/lib/db/supabase-sql";
import { logger } from "@/lib/logger";

/**
 * Configuration for alert notification behavior
 */
export interface AlertNotificationConfig {
  // Whether to send notifications immediately (default: true)
  immediate?: boolean;
  // Minimum alert level to trigger notifications (default: 'warning')
  minimumLevel?: "info" | "warning" | "critical";
  // Experiment name context
  experimentName?: string;
  // Experiment ID for tracking
  experimentId?: string;
}

/**
 * User alert subscription preferences
 */
interface UserAlertSubscription {
  userId: string;
  experimentName?: string; // If set, only subscribe to this experiment
  levels: ("info" | "warning" | "critical")[];
  enabled: boolean;
}

/**
 * Send notifications for an array of alerts
 * This is the main entry point for alert notification
 */
export async function notifyAlerts(
  alerts: Alert[],
  config: AlertNotificationConfig = {}
): Promise<{
  totalAlerts: number;
  notificationsSent: number;
  notificationsFailed: number;
  errors: string[];
}> {
  const {
    immediate = true,
    minimumLevel = "warning",
    experimentName,
    experimentId,
  } = config;

  const stats = {
    totalAlerts: alerts.length,
    notificationsSent: 0,
    notificationsFailed: 0,
    errors: [] as string[],
  };

  if (alerts.length === 0) {
    logger.log("[Alert Notifier] No alerts to notify");
    return stats;
  }

  // Filter alerts by minimum level
  const levelOrder = { info: 0, warning: 1, critical: 2 };
  const minLevelValue = levelOrder[minimumLevel];
  const filteredAlerts = alerts.filter(
    (alert) => levelOrder[alert.level] >= minLevelValue
  );

  if (filteredAlerts.length === 0) {
    logger.log(
      `[Alert Notifier] No alerts meet minimum level: ${minimumLevel}`
    );
    return stats;
  }

  logger.log(
    `[Alert Notifier] Processing ${filteredAlerts.length} alerts (minimum level: ${minimumLevel})`
  );

  try {
    // Get users who should be notified
    const subscribers = await getAlertSubscribers(experimentName);

    if (subscribers.length === 0) {
      logger.log(
        "[Alert Notifier] No subscribers found for alerts, skipping notifications"
      );
      return stats;
    }

    logger.log(
      `[Alert Notifier] Found ${subscribers.length} subscribers to notify`
    );

    // Group alerts by level for batching
    const criticalAlerts = filteredAlerts.filter((a) => a.level === "critical");
    const warningAlerts = filteredAlerts.filter((a) => a.level === "warning");
    const infoAlerts = filteredAlerts.filter((a) => a.level === "info");

    // Send notifications to each subscriber
    for (const subscriber of subscribers) {
      // Determine which alerts to send to this subscriber
      const subscriberAlerts = filteredAlerts.filter((alert) =>
        subscriber.levels.includes(alert.level)
      );

      if (subscriberAlerts.length === 0) {
        continue;
      }

      // Send notifications for each alert
      const results = await Promise.allSettled(
        subscriberAlerts.map((alert) =>
          notifySingleAlert(alert, subscriber.userId, {
            experimentName,
            experimentId,
          })
        )
      );

      // Track results
      results.forEach((result, index) => {
        if (result.status === "fulfilled" && result.value.success) {
          stats.notificationsSent++;
        } else {
          stats.notificationsFailed++;
          const error =
            result.status === "rejected"
              ? result.reason
              : result.value.error || "Unknown error";
          stats.errors.push(
            `Alert ${subscriberAlerts[index].type}: ${error}`
          );
        }
      });
    }

    logger.log(
      `[Alert Notifier] Sent ${stats.notificationsSent} notifications, ${stats.notificationsFailed} failed`
    );
  } catch (error: unknown) {
    console.error("[Alert Notifier] Error processing alerts:", error);
    stats.errors.push(error instanceof Error ? error.message : String(error));
  }

  return stats;
}

/**
 * Send notification for a single alert
 */
async function notifySingleAlert(
  alert: Alert,
  userId: string,
  context: {
    experimentName?: string;
    experimentId?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const payload: NotificationPayload = {
      userId,
      level: alert.level,
      type: alert.type,
      title: buildAlertTitle(alert, context.experimentName),
      message: alert.message,
      experimentName: context.experimentName,
      variantName: alert.variantName,
      metric: alert.metric,
      value: alert.value,
      threshold: alert.threshold,
      metadata: {
        alertTimestamp: alert.timestamp.toISOString(),
        experimentId: context.experimentId,
      },
    };

    const results = await sendNotification(payload);

    // Check if at least one channel succeeded
    const hasSuccess = results.some((r) => r.success);
    const errors = results.filter((r) => !r.success).map((r) => r.error);

    return {
      success: hasSuccess,
      error: errors.length > 0 ? errors.join(", ") : undefined,
    };
  } catch (error: unknown) {
    console.error("[Alert Notifier] Error sending notification:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Build a descriptive title for the alert
 */
function buildAlertTitle(alert: Alert, experimentName?: string): string {
  const prefix = experimentName ? `[${experimentName}]` : "[Alert]";
  const levelEmoji = {
    critical: "🚨",
    warning: "⚠️",
    info: "ℹ️",
  }[alert.level];

  const variantContext = alert.variantName ? ` - ${alert.variantName}` : "";

  return `${levelEmoji} ${prefix} ${alert.type.toUpperCase()}${variantContext}`;
}

/**
 * Get users who are subscribed to alert notifications
 * This queries the notification_configs table to find enabled subscriptions
 */
async function getAlertSubscribers(
  experimentName?: string
): Promise<UserAlertSubscription[]> {
  try {
    // For now, we get all users with any enabled notification config
    // In the future, we can add experiment-specific subscriptions
    const result = await sql`
      SELECT DISTINCT
        user_id as "userId",
        alert_levels as "levels",
        enabled
      FROM notification_configs
      WHERE enabled = true
        AND array_length(alert_levels, 1) > 0
    `;

    return result.map((row: Record<string, unknown>) => ({
      userId: row.userId as string,
      experimentName: experimentName,
      levels: (row.levels as ("info" | "warning" | "critical")[]) || ["critical"],
      enabled: Boolean(row.enabled),
    }));
  } catch (error) {
    console.error("[Alert Notifier] Error fetching subscribers:", error);
    return [];
  }
}

/**
 * Notify alerts for a specific user (useful for manual triggers)
 */
export async function notifyUserAlerts(
  userId: string,
  alerts: Alert[],
  config: AlertNotificationConfig = {}
): Promise<number> {
  const {
    minimumLevel = "warning",
    experimentName,
    experimentId,
  } = config;

  // Filter alerts by minimum level
  const levelOrder = { info: 0, warning: 1, critical: 2 };
  const minLevelValue = levelOrder[minimumLevel];
  const filteredAlerts = alerts.filter(
    (alert) => levelOrder[alert.level] >= minLevelValue
  );

  if (filteredAlerts.length === 0) {
    return 0;
  }

  const results = await Promise.allSettled(
    filteredAlerts.map((alert) =>
      notifySingleAlert(alert, userId, { experimentName, experimentId })
    )
  );

  return results.filter(
    (r) => r.status === "fulfilled" && r.value.success
  ).length;
}

/**
 * Schedule periodic alert checks (for use in cron jobs or background tasks)
 * This can be called periodically to check for new alerts and notify subscribers
 */
export async function scheduleAlertNotifications(): Promise<void> {
  logger.log("[Alert Notifier] Running scheduled alert check...");

  try {
    // Import here to avoid circular dependencies
    const { getMonitoringDashboard } = await import("./ab-test-metrics");

    // Get current monitoring dashboard
    const dashboard = await getMonitoringDashboard();

    // Process critical alerts first
    if (dashboard.criticalAlerts.length > 0) {
      logger.log(
        `[Alert Notifier] Found ${dashboard.criticalAlerts.length} critical alerts`
      );
      await notifyAlerts(dashboard.criticalAlerts, {
        immediate: true,
        minimumLevel: "critical",
      });
    }

    // Process alerts from all active experiments
    for (const experiment of dashboard.activeExperiments) {
      if (experiment.alerts.length > 0) {
        logger.log(
          `[Alert Notifier] Processing ${experiment.alerts.length} alerts for experiment: ${experiment.experimentName}`
        );

        await notifyAlerts(experiment.alerts, {
          immediate: true,
          minimumLevel: "warning",
          experimentName: experiment.experimentName,
          experimentId: experiment.experimentId,
        });
      }
    }

    logger.log("[Alert Notifier] Scheduled alert check completed");
  } catch (error) {
    console.error("[Alert Notifier] Error in scheduled check:", error);
  }
}

/**
 * Schedule periodic auto-promotion checks
 * Checks for experiments eligible for auto-promotion and promotes winners
 * Should be called periodically (e.g., hourly via cron)
 */
export async function scheduleAutoPromotionChecks(
  userId: string
): Promise<void> {
  logger.log("[Alert Notifier] Running scheduled auto-promotion check...");

  try {
    // Import here to avoid circular dependencies
    const { autoCheckPromotions, DEFAULT_PROMOTION_CONFIG } = await import(
      "./auto-promotion"
    );

    // Run auto-promotion check
    const results = await autoCheckPromotions(userId, {
      ...DEFAULT_PROMOTION_CONFIG,
      // Override with environment variables if set
      minSampleSize: process.env.AUTO_PROMOTION_MIN_SAMPLE_SIZE
        ? parseInt(process.env.AUTO_PROMOTION_MIN_SAMPLE_SIZE, 10)
        : DEFAULT_PROMOTION_CONFIG.minSampleSize,
      minConfidenceLevel: process.env.AUTO_PROMOTION_MIN_CONFIDENCE
        ? parseFloat(process.env.AUTO_PROMOTION_MIN_CONFIDENCE)
        : DEFAULT_PROMOTION_CONFIG.minConfidenceLevel,
      requireManualApproval:
        process.env.AUTO_PROMOTION_REQUIRE_MANUAL === "true",
    });

    if (results.promoted > 0) {
      logger.log(
        `[Alert Notifier] Auto-promoted ${results.promoted} experiment(s): ${results.promoted_experiments.join(", ")}`
      );
    } else if (results.eligible.length > 0) {
      logger.log(
        `[Alert Notifier] ${results.eligible.length} experiment(s) eligible but awaiting manual approval: ${results.eligible.join(", ")}`
      );
    } else {
      logger.log(
        `[Alert Notifier] No experiments eligible for auto-promotion (checked: ${results.checked})`
      );
    }
  } catch (error) {
    console.error("[Alert Notifier] Error in auto-promotion check:", error);
  }
}
