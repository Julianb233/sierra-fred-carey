/**
 * PagerDuty Notification Service
 * Sends incidents to PagerDuty Events API v2
 */

import {
  NotificationPayload,
  NotificationResult,
  PagerDutyEvent,
  AlertLevel,
} from "./types";

const PAGERDUTY_EVENTS_API = "https://events.pagerduty.com/v2/enqueue";

/**
 * Send notification to PagerDuty
 */
export async function sendPagerDutyNotification(
  routingKey: string,
  payload: NotificationPayload
): Promise<NotificationResult> {
  try {
    const event = formatPagerDutyEvent(routingKey, payload);

    const response = await fetch(PAGERDUTY_EVENTS_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/vnd.pagerduty+json;version=2",
      },
      body: JSON.stringify(event),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        `PagerDuty API error: ${response.status} - ${errorData.message || "Unknown error"}`
      );
    }

    const responseData = await response.json();

    return {
      success: true,
      channel: "pagerduty",
      messageId: responseData.dedup_key,
      timestamp: new Date(),
    };
  } catch (error: any) {
    console.error("[PagerDuty] Failed to send notification:", error);
    return {
      success: false,
      channel: "pagerduty",
      error: error.message,
      timestamp: new Date(),
    };
  }
}

/**
 * Format notification payload into PagerDuty event
 */
function formatPagerDutyEvent(
  routingKey: string,
  payload: NotificationPayload
): PagerDutyEvent {
  // Generate dedup key for event grouping
  const dedupKey = generateDedupKey(payload);

  // Map alert level to PagerDuty severity
  const severity = mapAlertLevelToSeverity(payload.level);

  // Build custom details
  const customDetails: Record<string, any> = {
    alert_type: payload.type,
    level: payload.level,
  };

  if (payload.experimentName) {
    customDetails.experiment = payload.experimentName;
  }

  if (payload.variantName) {
    customDetails.variant = payload.variantName;
  }

  if (payload.metric && payload.value !== undefined) {
    customDetails.metric = payload.metric;
    customDetails.value = payload.value;
  }

  if (payload.threshold !== undefined) {
    customDetails.threshold = payload.threshold;
  }

  if (payload.metadata) {
    customDetails.metadata = payload.metadata;
  }

  const event: PagerDutyEvent = {
    routing_key: routingKey,
    event_action: "trigger",
    dedup_key: dedupKey,
    payload: {
      summary: `${payload.title}: ${payload.message}`,
      severity,
      source: "sierra-fred-carey-monitoring",
      timestamp: new Date().toISOString(),
      component: payload.experimentName || "monitoring",
      group: payload.type,
      class: payload.level,
      custom_details: customDetails,
    },
    client: "Sierra Fred Carey",
    client_url: process.env.NEXT_PUBLIC_APP_URL || "https://app.example.com",
  };

  // Add links to dashboard if available
  if (payload.experimentName) {
    event.links = [
      {
        href: `${process.env.NEXT_PUBLIC_APP_URL || ""}/admin/intelligence?tab=monitoring`,
        text: "View Monitoring Dashboard",
      },
    ];
  }

  return event;
}

/**
 * Generate deduplication key for event grouping
 */
function generateDedupKey(payload: NotificationPayload): string {
  const parts = [
    payload.type,
    payload.experimentName || "global",
    payload.variantName || "all",
    payload.metric || "alert",
  ];

  return parts.join("-").toLowerCase();
}

/**
 * Map alert level to PagerDuty severity
 */
function mapAlertLevelToSeverity(
  level: AlertLevel
): "info" | "warning" | "error" | "critical" {
  switch (level) {
    case "critical":
      return "critical";
    case "warning":
      return "warning";
    case "info":
      return "info";
    default:
      return "info";
  }
}

/**
 * Resolve a PagerDuty incident
 */
export async function resolvePagerDutyIncident(
  routingKey: string,
  dedupKey: string
): Promise<NotificationResult> {
  try {
    const event: PagerDutyEvent = {
      routing_key: routingKey,
      event_action: "resolve",
      dedup_key: dedupKey,
      payload: {
        summary: "Alert resolved",
        severity: "info",
        source: "sierra-fred-carey-monitoring",
      },
    };

    const response = await fetch(PAGERDUTY_EVENTS_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/vnd.pagerduty+json;version=2",
      },
      body: JSON.stringify(event),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        `PagerDuty API error: ${response.status} - ${errorData.message || "Unknown error"}`
      );
    }

    return {
      success: true,
      channel: "pagerduty",
      timestamp: new Date(),
    };
  } catch (error: any) {
    console.error("[PagerDuty] Failed to resolve incident:", error);
    return {
      success: false,
      channel: "pagerduty",
      error: error.message,
      timestamp: new Date(),
    };
  }
}

/**
 * Test PagerDuty integration configuration
 */
export async function testPagerDutyIntegration(
  routingKey: string
): Promise<NotificationResult> {
  const testPayload: NotificationPayload = {
    userId: "test",
    level: "info",
    type: "significance",
    title: "PagerDuty Integration Test",
    message: "Your PagerDuty integration is configured correctly! Critical alerts will be sent to your configured service.",
    experimentName: "test-experiment",
  };

  return sendPagerDutyNotification(routingKey, testPayload);
}
