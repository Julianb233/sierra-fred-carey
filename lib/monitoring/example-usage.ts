/**
 * Alert Notification System - Usage Examples
 * This file demonstrates how to use the alert notification system
 */

import {
  notifyAlerts,
  notifyUserAlerts,
  scheduleAlertNotifications,
  runAlertNotificationCheck,
  startGlobalAlertScheduler,
  stopGlobalAlertScheduler,
} from "./index";
import { Alert } from "./ab-test-metrics";

// =============================================================================
// Example 1: Automatic Notifications (Default Behavior)
// =============================================================================

/**
 * Alerts are automatically sent when generated during monitoring
 * No code changes needed - this happens automatically!
 */
export async function exampleAutomaticNotifications() {
  const { compareExperimentVariants } = await import("./ab-test-metrics");

  // When you fetch experiment metrics, alerts are generated
  // and notifications are sent automatically
  const comparison = await compareExperimentVariants("my-experiment");

  console.log(`Found ${comparison.alerts.length} alerts`);
  // Notifications are sent in the background automatically
}

// =============================================================================
// Example 2: Manual Alert Notification
// =============================================================================

/**
 * Manually trigger notifications for specific alerts
 */
export async function exampleManualNotification() {
  // Create a custom alert
  const customAlert: Alert = {
    level: "critical",
    type: "performance",
    message: "P95 latency exceeded 5000ms",
    variantName: "variant-b",
    metric: "p95LatencyMs",
    value: 5500,
    threshold: 5000,
    timestamp: new Date(),
  };

  // Send notifications to all subscribed users
  const stats = await notifyAlerts([customAlert], {
    immediate: true,
    minimumLevel: "warning",
    experimentName: "checkout-flow",
    experimentId: "exp-123",
  });

  console.log(`Notifications sent: ${stats.notificationsSent}`);
  console.log(`Notifications failed: ${stats.notificationsFailed}`);
  console.log(`Errors: ${stats.errors.join(", ")}`);
}

// =============================================================================
// Example 3: User-Specific Notifications
// =============================================================================

/**
 * Send notifications to a specific user
 */
export async function exampleUserSpecificNotification() {
  const alerts: Alert[] = [
    {
      level: "warning",
      type: "errors",
      message: "Error rate at 6%",
      variantName: "variant-a",
      metric: "errorRate",
      value: 0.06,
      threshold: 0.05,
      timestamp: new Date(),
    },
  ];

  // Send to specific user
  const count = await notifyUserAlerts("user-123", alerts, {
    minimumLevel: "warning",
    experimentName: "landing-page-test",
  });

  console.log(`Sent ${count} notifications to user`);
}

// =============================================================================
// Example 4: Scheduled Alert Checks (Background Job)
// =============================================================================

/**
 * Run periodic alert checks using the scheduler
 * Use this for background monitoring
 */
export async function exampleScheduledChecks() {
  // Start the global scheduler (checks every 15 minutes)
  startGlobalAlertScheduler(15);

  console.log("Alert scheduler started");

  // Later, when you want to stop it
  // stopGlobalAlertScheduler();
}

// =============================================================================
// Example 5: One-Time Alert Check (Cron Job)
// =============================================================================

/**
 * Run a single alert check
 * Perfect for cron jobs or manual triggers
 */
export async function exampleOneTimeCheck() {
  const result = await runAlertNotificationCheck();

  console.log(`Check completed: ${result.success}`);
  console.log(`Message: ${result.message}`);
  console.log(`Timestamp: ${result.timestamp}`);
}

// =============================================================================
// Example 6: Integration with API Endpoints
// =============================================================================

/**
 * Example API call to trigger alert check
 */
export async function exampleAPIIntegration() {
  // GET request to fetch alerts with notifications
  const response1 = await fetch(
    "/api/monitoring/alerts?notify=true&level=critical"
  );
  const data1 = await response1.json();
  console.log("Critical alerts:", data1);

  // POST request to manually trigger notifications
  const response2 = await fetch("/api/monitoring/alerts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userId: "user-123",
      level: "critical",
      type: "performance",
      title: "High Latency Alert",
      message: "P95 latency exceeded threshold",
      experimentName: "checkout-flow",
      metric: "p95LatencyMs",
      value: 5500,
      threshold: 5000,
    }),
  });
  const data2 = await response2.json();
  console.log("Notification sent:", data2);

  // Trigger scheduled alert check
  const response3 = await fetch("/api/monitoring/alerts/check", {
    headers: {
      Authorization: `Bearer ${process.env.CRON_SECRET}`,
    },
  });
  const data3 = await response3.json();
  console.log("Alert check result:", data3);
}

// =============================================================================
// Example 7: Custom Alert Generation and Notification
// =============================================================================

/**
 * Generate custom alerts and send notifications
 */
export async function exampleCustomAlertGeneration() {
  // Create multiple alerts
  const alerts: Alert[] = [
    {
      level: "critical",
      type: "performance",
      message: "Critical latency spike detected",
      variantName: "variant-b",
      metric: "p99LatencyMs",
      value: 8000,
      threshold: 5000,
      timestamp: new Date(),
    },
    {
      level: "warning",
      type: "traffic",
      message: "Traffic distribution uneven",
      variantName: "variant-a",
      metric: "trafficPercentage",
      value: 15,
      threshold: 50,
      timestamp: new Date(),
    },
  ];

  // Send to all subscribers with custom config
  const stats = await notifyAlerts(alerts, {
    immediate: true,
    minimumLevel: "info", // Send all levels
    experimentName: "homepage-redesign",
    experimentId: "exp-456",
  });

  console.log("Notification statistics:", stats);
}

// =============================================================================
// Example 8: Disable Automatic Notifications
// =============================================================================

/**
 * Disable automatic notifications via environment variable
 */
export function exampleDisableAutoNotifications() {
  // Set environment variable before starting app:
  // AUTO_NOTIFY_ALERTS=false

  // Or check the current setting:
  const { AUTO_NOTIFY_ALERTS } = require("./ab-test-metrics");
  console.log(`Auto-notify enabled: ${AUTO_NOTIFY_ALERTS}`);
}

// =============================================================================
// Example 9: Query Notification Logs
// =============================================================================

/**
 * Check notification delivery status
 */
export async function exampleCheckNotificationLogs() {
  const { getNotificationLogs } = await import("@/lib/notifications");

  // Get recent logs for a user
  const logs = await getNotificationLogs("user-123", { limit: 50 });

  // Filter failed notifications
  const failures = logs.filter((log) => log.status === "failed");
  console.log(`Found ${failures.length} failed notifications`);

  failures.forEach((log) => {
    console.log(`Failed: ${log.title} - ${log.errorMessage}`);
  });

  // Check success rate
  const sent = logs.filter((log) => log.status === "sent").length;
  const successRate = (sent / logs.length) * 100;
  console.log(`Success rate: ${successRate.toFixed(2)}%`);
}

// =============================================================================
// Example 10: Test Notification Configuration
// =============================================================================

/**
 * Test notification setup before deploying
 */
export async function exampleTestNotifications() {
  const { testNotificationConfig } = await import("@/lib/notifications");

  // Test a specific notification config
  const result = await testNotificationConfig("config-id-123", "user-123");

  if (result.success) {
    console.log("✅ Notification config working!");
  } else {
    console.error("❌ Notification config failed:", result.error);
  }
}
