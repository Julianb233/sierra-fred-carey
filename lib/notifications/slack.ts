/**
 * Enhanced Slack Notification Service
 * Sends formatted alerts to Slack via webhooks with rich formatting and action buttons
 */

import {
  NotificationPayload,
  NotificationResult,
  SlackMessage,
  SlackBlock,
  AlertLevel,
} from "./types";

/**
 * Alert type configurations for Slack messages
 */
interface AlertTypeConfig {
  title: string;
  description: string;
  actionButtons?: Array<{
    text: string;
    url: string;
    style?: "primary" | "danger";
  }>;
}

/**
 * Get configuration for different alert types
 */
function getAlertTypeConfig(
  type: string,
  payload: NotificationPayload
): AlertTypeConfig {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const experimentUrl = payload.experimentName
    ? `${baseUrl}/experiments/${encodeURIComponent(payload.experimentName)}`
    : baseUrl;

  switch (type) {
    case "significance":
      return {
        title: "Statistical Significance Reached",
        description: "An experiment variant has reached statistical significance",
        actionButtons: [
          {
            text: "View Experiment",
            url: experimentUrl,
            style: "primary",
          },
          {
            text: "View Dashboard",
            url: `${baseUrl}/dashboard`,
          },
        ],
      };

    case "winner":
      return {
        title: "Winner Detected",
        description: "A clear winner has emerged in the experiment",
        actionButtons: [
          {
            text: "View Results",
            url: experimentUrl,
            style: "primary",
          },
          {
            text: "Ship Winner",
            url: `${experimentUrl}/deploy`,
            style: "primary",
          },
        ],
      };

    case "errors":
      return {
        title: "Error Rate Alert",
        description: "Error rate has exceeded the threshold",
        actionButtons: [
          {
            text: "View Errors",
            url: `${experimentUrl}/errors`,
            style: "danger",
          },
          {
            text: "View Logs",
            url: `${baseUrl}/logs`,
          },
        ],
      };

    case "performance":
      return {
        title: "Performance Alert",
        description: "Performance metrics have degraded",
        actionButtons: [
          {
            text: "View Metrics",
            url: `${experimentUrl}/metrics`,
          },
        ],
      };

    case "traffic":
      return {
        title: "Traffic Anomaly",
        description: "Unusual traffic pattern detected",
        actionButtons: [
          {
            text: "View Traffic",
            url: `${baseUrl}/analytics`,
          },
        ],
      };

    default:
      return {
        title: "Alert",
        description: "System alert",
        actionButtons: [
          {
            text: "View Dashboard",
            url: `${baseUrl}/dashboard`,
          },
        ],
      };
  }
}

/**
 * Send notification to Slack webhook with enhanced formatting
 */
export async function sendSlackNotification(
  webhookUrl: string,
  payload: NotificationPayload
): Promise<NotificationResult> {
  try {
    // Validate webhook URL
    if (!webhookUrl || !webhookUrl.startsWith("https://hooks.slack.com/")) {
      throw new Error("Invalid Slack webhook URL");
    }

    const message = formatSlackMessage(payload);

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(message),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Slack API error: ${response.status} - ${errorText}`);
    }

    return {
      success: true,
      channel: "slack",
      timestamp: new Date(),
    };
  } catch (error: unknown) {
    console.error("[Slack] Failed to send notification:", error);
    return {
      success: false,
      channel: "slack",
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date(),
    };
  }
}

/**
 * Format notification payload into Slack message with rich blocks and actions
 */
function formatSlackMessage(payload: NotificationPayload): SlackMessage {
  const color = getAlertColor(payload.level);
  const emoji = getAlertEmoji(payload.level);
  const config = getAlertTypeConfig(payload.type, payload);

  const blocks: SlackBlock[] = [
    // Header with emoji and title
    {
      type: "header",
      text: {
        type: "plain_text",
        text: `${emoji} ${payload.title}`,
        emoji: true,
      },
    },
    // Main message
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*${config.description}*\n\n${payload.message}`,
      },
    },
  ];

  // Add experiment and variant details if present
  if (payload.experimentName || payload.variantName) {
    const fields: Array<{ type: string; text: string }> = [];

    if (payload.experimentName) {
      fields.push({
        type: "mrkdwn",
        text: `*Experiment:*\n\`${payload.experimentName}\``,
      });
    }

    if (payload.variantName) {
      fields.push({
        type: "mrkdwn",
        text: `*Variant:*\n\`${payload.variantName}\``,
      });
    }

    blocks.push({
      type: "section",
      fields,
    });
  }

  // Add metric details if present
  if (payload.metric && payload.value !== undefined) {
    const metricFields: Array<{ type: string; text: string }> = [
      {
        type: "mrkdwn",
        text: `*Metric:*\n${payload.metric.replace(/_/g, " ")}`,
      },
      {
        type: "mrkdwn",
        text: `*Current Value:*\n${formatMetricValue(payload.metric, payload.value)}`,
      },
    ];

    if (payload.threshold !== undefined) {
      metricFields.push({
        type: "mrkdwn",
        text: `*Threshold:*\n${formatMetricValue(payload.metric, payload.threshold)}`,
      });

      // Add improvement/degradation percentage
      const changePercent =
        ((payload.value - payload.threshold) / payload.threshold) * 100;
      const changeEmoji = changePercent > 0 ? "📈" : "📉";
      metricFields.push({
        type: "mrkdwn",
        text: `*Change:*\n${changeEmoji} ${Math.abs(changePercent).toFixed(1)}%`,
      });
    }

    blocks.push({
      type: "section",
      fields: metricFields,
    });
  }

  // Add action buttons if configured
  if (config.actionButtons && config.actionButtons.length > 0) {
    blocks.push({
      type: "divider",
    } as SlackBlock);

    blocks.push({
      type: "actions",
      elements: config.actionButtons.map((button, index) => ({
        type: "button",
        text: {
          type: "plain_text",
          text: button.text,
          emoji: true,
        },
        url: button.url,
        action_id: `action_${index}`,
        style: button.style,
      })),
    } as SlackBlock);
  }

  // Add metadata footer
  const timestamp = new Date().toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  });

  blocks.push({
    type: "context",
    elements: [
      {
        type: "mrkdwn",
        text: `*Level:* ${getLevelBadge(payload.level)} | *Type:* ${payload.type} | *Time:* ${timestamp}`,
      },
    ],
  } as SlackBlock);

  return {
    text: `${emoji} ${payload.title}`, // Fallback text for notifications
    blocks,
    attachments: [
      {
        color,
        blocks: [],
      },
    ],
  };
}

/**
 * Get colored badge for alert level
 */
function getLevelBadge(level: AlertLevel): string {
  switch (level) {
    case "critical":
      return ":red_circle: CRITICAL";
    case "warning":
      return ":warning: WARNING";
    case "info":
      return ":information_source: INFO";
    default:
      // Exhaustive check - should never reach here
      return (level as string).toUpperCase();
  }
}

/**
 * Get color for alert level
 */
function getAlertColor(level: AlertLevel): string {
  switch (level) {
    case "critical":
      return "#dc2626"; // Red
    case "warning":
      return "#f59e0b"; // Amber
    case "info":
      return "#3b82f6"; // Blue
    default:
      return "#6b7280"; // Gray
  }
}

/**
 * Get emoji for alert level
 */
function getAlertEmoji(level: AlertLevel): string {
  switch (level) {
    case "critical":
      return "🚨";
    case "warning":
      return "⚠️";
    case "info":
      return "ℹ️";
    default:
      return "📊";
  }
}

/**
 * Format metric value with appropriate units
 */
function formatMetricValue(metric: string, value: number): string {
  const lowerMetric = metric.toLowerCase();

  if (lowerMetric.includes("rate") || lowerMetric.includes("percentage")) {
    return `${value.toFixed(2)}%`;
  }

  if (lowerMetric.includes("latency") || lowerMetric.includes("ms")) {
    return `${value.toFixed(0)}ms`;
  }

  if (lowerMetric.includes("rps") || lowerMetric.includes("per_second")) {
    return `${value.toFixed(0)} req/s`;
  }

  if (lowerMetric.includes("count") || lowerMetric.includes("size")) {
    return value.toLocaleString();
  }

  if (lowerMetric.includes("conversion")) {
    return `${(value * 100).toFixed(2)}%`;
  }

  return value.toFixed(2);
}

/**
 * Test Slack webhook configuration
 */
export async function testSlackWebhook(
  webhookUrl: string
): Promise<NotificationResult> {
  const testPayload: NotificationPayload = {
    userId: "test",
    level: "info",
    type: "significance",
    title: "Slack Integration Test",
    message:
      "Your Slack webhook is configured correctly! You'll receive alerts here when experiments reach statistical significance or encounter issues.",
    experimentName: "test-experiment",
    variantName: "test-variant",
    metric: "conversion_rate",
    value: 3.5,
    threshold: 2.8,
  };

  return sendSlackNotification(webhookUrl, testPayload);
}

/**
 * Send a summary of multiple alerts to Slack (batch notification)
 */
export async function sendSlackAlertSummary(
  webhookUrl: string,
  alerts: NotificationPayload[]
): Promise<NotificationResult> {
  if (alerts.length === 0) {
    return {
      success: false,
      channel: "slack",
      error: "No alerts to send",
      timestamp: new Date(),
    };
  }

  const criticalCount = alerts.filter((a) => a.level === "critical").length;
  const warningCount = alerts.filter((a) => a.level === "warning").length;
  const infoCount = alerts.filter((a) => a.level === "info").length;

  const blocks: SlackBlock[] = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: `📊 Alert Summary (${alerts.length} total)`,
        emoji: true,
      },
    },
    {
      type: "section",
      fields: [
        {
          type: "mrkdwn",
          text: `*🚨 Critical:* ${criticalCount}`,
        },
        {
          type: "mrkdwn",
          text: `*⚠️ Warning:* ${warningCount}`,
        },
        {
          type: "mrkdwn",
          text: `*ℹ️ Info:* ${infoCount}`,
        },
      ],
    },
  ];

  // Add top 5 alerts
  const topAlerts = alerts
    .sort((a, b) => {
      const levelOrder = { critical: 3, warning: 2, info: 1 };
      return levelOrder[b.level] - levelOrder[a.level];
    })
    .slice(0, 5);

  topAlerts.forEach((alert) => {
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `${getAlertEmoji(alert.level)} *${alert.title}*\n${alert.message}`,
      },
    } as SlackBlock);
  });

  if (alerts.length > 5) {
    blocks.push({
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: `_And ${alerts.length - 5} more alerts..._`,
        },
      ],
    } as SlackBlock);
  }

  const message: SlackMessage = {
    text: `Alert Summary: ${alerts.length} alerts`,
    blocks,
  };

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(message),
    });

    if (!response.ok) {
      throw new Error(`Slack API error: ${response.status}`);
    }

    return {
      success: true,
      channel: "slack",
      timestamp: new Date(),
    };
  } catch (error: unknown) {
    return {
      success: false,
      channel: "slack",
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date(),
    };
  }
}
