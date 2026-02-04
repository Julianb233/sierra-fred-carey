/**
 * Email Notification Service using Resend
 * Sends HTML-formatted email notifications for A/B test alerts
 */

import {
  NotificationPayload,
  NotificationResult,
  AlertLevel,
} from "./types";

/**
 * Resend API configuration
 */
const RESEND_API_URL = "https://api.resend.com/emails";
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "alerts@yourdomain.com";
const FROM_NAME = process.env.RESEND_FROM_NAME || "A/B Testing Platform";

/**
 * Email template type
 */
type EmailTemplate = "significance" | "winner" | "error" | "performance";

/**
 * Send email notification using Resend
 */
export async function sendEmailNotification(
  toEmail: string,
  payload: NotificationPayload
): Promise<NotificationResult> {
  try {
    const apiKey = process.env.RESEND_API_KEY;

    if (!apiKey) {
      throw new Error(
        "RESEND_API_KEY not configured. Please set it in your environment variables."
      );
    }

    if (!toEmail || !isValidEmail(toEmail)) {
      throw new Error(`Invalid email address: ${toEmail}`);
    }

    const template = getEmailTemplate(payload);

    const emailPayload = {
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to: [toEmail],
      subject: template.subject,
      html: template.html,
      text: template.text,
      tags: [
        { name: "alert_level", value: payload.level },
        { name: "alert_type", value: payload.type },
      ],
    };

    const response = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(emailPayload),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        `Resend API error: ${response.status} - ${JSON.stringify(errorData)}`
      );
    }

    const result = await response.json();

    return {
      success: true,
      channel: "email",
      messageId: result.id,
      timestamp: new Date(),
    };
  } catch (error: any) {
    console.error("[Email] Failed to send notification:", error);
    return {
      success: false,
      channel: "email",
      error: error.message,
      timestamp: new Date(),
    };
  }
}

/**
 * Generate email template based on notification type
 */
function getEmailTemplate(payload: NotificationPayload): {
  subject: string;
  html: string;
  text: string;
} {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const experimentUrl = payload.experimentName
    ? `${baseUrl}/experiments/${encodeURIComponent(payload.experimentName)}`
    : `${baseUrl}/dashboard`;

  switch (payload.type) {
    case "significance":
      return generateSignificanceTemplate(payload, experimentUrl);
    case "errors":
      return generateErrorTemplate(payload, experimentUrl);
    case "performance":
      return generatePerformanceTemplate(payload, experimentUrl);
    case "traffic":
      return generateTrafficTemplate(payload, experimentUrl);
    default:
      return generateGenericTemplate(payload, experimentUrl);
  }
}

/**
 * Generate significance reached template
 */
function generateSignificanceTemplate(
  payload: NotificationPayload,
  url: string
): { subject: string; html: string; text: string } {
  const emoji = getLevelEmoji(payload.level);

  return {
    subject: `${emoji} Statistical Significance Reached: ${payload.experimentName || "Experiment"}`,
    html: generateHtmlWrapper(
      payload.level,
      `
      <h1 style="color: #3b82f6; margin: 0 0 16px 0;">
        📊 Statistical Significance Reached
      </h1>
      <p style="font-size: 16px; color: #374151; margin: 0 0 24px 0;">
        Great news! Your experiment has reached statistical significance.
      </p>

      ${generateExperimentDetails(payload)}
      ${generateMetricsTable(payload)}

      <p style="color: #6b7280; margin: 24px 0;">
        This means you can confidently make decisions based on these results.
      </p>

      ${generateActionButton("View Experiment Results", url, "#3b82f6")}
    `
    ),
    text: `
Statistical Significance Reached

${payload.message}

Experiment: ${payload.experimentName || "N/A"}
Variant: ${payload.variantName || "N/A"}
${payload.metric ? `Metric: ${payload.metric}` : ""}
${payload.value !== undefined ? `Value: ${formatMetricValue(payload.metric || "", payload.value)}` : ""}

View results: ${url}
    `.trim(),
  };
}

/**
 * Generate error alert template
 */
function generateErrorTemplate(
  payload: NotificationPayload,
  url: string
): { subject: string; html: string; text: string } {
  const emoji = getLevelEmoji(payload.level);

  return {
    subject: `${emoji} Error Rate Alert: ${payload.experimentName || "System"}`,
    html: generateHtmlWrapper(
      payload.level,
      `
      <h1 style="color: #dc2626; margin: 0 0 16px 0;">
        🚨 Error Rate Alert
      </h1>
      <p style="font-size: 16px; color: #374151; margin: 0 0 24px 0;">
        <strong>Action Required:</strong> Error rate has exceeded the threshold.
      </p>

      ${generateExperimentDetails(payload)}
      ${generateMetricsTable(payload)}

      <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 16px; margin: 24px 0; border-radius: 4px;">
        <p style="margin: 0; color: #991b1b;">
          <strong>Impact:</strong> This may be affecting user experience. Please investigate immediately.
        </p>
      </div>

      ${generateActionButton("Investigate Errors", url, "#dc2626")}
    `
    ),
    text: `
Error Rate Alert - Action Required

${payload.message}

Experiment: ${payload.experimentName || "N/A"}
Variant: ${payload.variantName || "N/A"}
${payload.metric ? `Metric: ${payload.metric}` : ""}
${payload.value !== undefined ? `Current: ${formatMetricValue(payload.metric || "", payload.value)}` : ""}
${payload.threshold !== undefined ? `Threshold: ${formatMetricValue(payload.metric || "", payload.threshold)}` : ""}

Investigate: ${url}
    `.trim(),
  };
}

/**
 * Generate performance alert template
 */
function generatePerformanceTemplate(
  payload: NotificationPayload,
  url: string
): { subject: string; html: string; text: string } {
  const emoji = getLevelEmoji(payload.level);

  return {
    subject: `${emoji} Performance Alert: ${payload.experimentName || "System"}`,
    html: generateHtmlWrapper(
      payload.level,
      `
      <h1 style="color: #f59e0b; margin: 0 0 16px 0;">
        ⚠️ Performance Degradation Detected
      </h1>
      <p style="font-size: 16px; color: #374151; margin: 0 0 24px 0;">
        Performance metrics have degraded beyond acceptable thresholds.
      </p>

      ${generateExperimentDetails(payload)}
      ${generateMetricsTable(payload)}

      <p style="color: #78716c; margin: 24px 0;">
        Consider investigating system performance and optimization opportunities.
      </p>

      ${generateActionButton("View Performance Metrics", url, "#f59e0b")}
    `
    ),
    text: `
Performance Alert

${payload.message}

Experiment: ${payload.experimentName || "N/A"}
${payload.metric ? `Metric: ${payload.metric}` : ""}
${payload.value !== undefined ? `Current: ${formatMetricValue(payload.metric || "", payload.value)}` : ""}
${payload.threshold !== undefined ? `Threshold: ${formatMetricValue(payload.metric || "", payload.threshold)}` : ""}

View metrics: ${url}
    `.trim(),
  };
}

/**
 * Generate traffic alert template
 */
function generateTrafficTemplate(
  payload: NotificationPayload,
  url: string
): { subject: string; html: string; text: string } {
  return {
    subject: `Traffic Anomaly Detected: ${payload.experimentName || "System"}`,
    html: generateHtmlWrapper(
      payload.level,
      `
      <h1 style="color: #3b82f6; margin: 0 0 16px 0;">
        📈 Traffic Anomaly Detected
      </h1>
      <p style="font-size: 16px; color: #374151; margin: 0 0 24px 0;">
        Unusual traffic patterns have been detected.
      </p>

      ${generateExperimentDetails(payload)}
      ${generateMetricsTable(payload)}

      ${generateActionButton("View Traffic Analytics", url, "#3b82f6")}
    `
    ),
    text: `
Traffic Anomaly Detected

${payload.message}

View analytics: ${url}
    `.trim(),
  };
}

/**
 * Generate generic alert template
 */
function generateGenericTemplate(
  payload: NotificationPayload,
  url: string
): { subject: string; html: string; text: string } {
  const emoji = getLevelEmoji(payload.level);

  return {
    subject: `${emoji} ${payload.title}`,
    html: generateHtmlWrapper(
      payload.level,
      `
      <h1 style="color: #374151; margin: 0 0 16px 0;">
        ${payload.title}
      </h1>
      <p style="font-size: 16px; color: #374151; margin: 0 0 24px 0;">
        ${payload.message}
      </p>

      ${generateExperimentDetails(payload)}
      ${generateMetricsTable(payload)}

      ${generateActionButton("View Dashboard", url, "#3b82f6")}
    `
    ),
    text: `
${payload.title}

${payload.message}

View dashboard: ${url}
    `.trim(),
  };
}

/**
 * Generate HTML wrapper with consistent styling
 */
function generateHtmlWrapper(level: AlertLevel, content: string): string {
  const levelColor = getLevelColor(level);

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Alert Notification</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f9fafb;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; padding: 40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: white; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); overflow: hidden;">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, ${levelColor} 0%, ${adjustColor(levelColor, -20)} 100%); padding: 4px;"></td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              ${content}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 24px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; font-size: 14px; color: #6b7280;">
                You're receiving this email because you have notifications enabled for A/B testing alerts.
              </p>
              <p style="margin: 8px 0 0 0; font-size: 12px; color: #9ca3af;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL}/settings/notifications" style="color: #3b82f6; text-decoration: none;">Manage notification preferences</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * Generate experiment details section
 */
function generateExperimentDetails(payload: NotificationPayload): string {
  if (!payload.experimentName && !payload.variantName) {
    return "";
  }

  return `
    <div style="background-color: #f9fafb; border-radius: 6px; padding: 16px; margin: 0 0 24px 0;">
      ${
        payload.experimentName
          ? `<p style="margin: 0 0 8px 0; color: #374151;"><strong>Experiment:</strong> ${payload.experimentName}</p>`
          : ""
      }
      ${
        payload.variantName
          ? `<p style="margin: 0; color: #374151;"><strong>Variant:</strong> ${payload.variantName}</p>`
          : ""
      }
    </div>
  `;
}

/**
 * Generate metrics table
 */
function generateMetricsTable(payload: NotificationPayload): string {
  if (!payload.metric || payload.value === undefined) {
    return "";
  }

  const hasThreshold = payload.threshold !== undefined;
  const changePercent = hasThreshold
    ? ((payload.value - payload.threshold!) / payload.threshold!) * 100
    : null;

  return `
    <table width="100%" cellpadding="12" cellspacing="0" style="border: 1px solid #e5e7eb; border-radius: 6px; margin: 0 0 24px 0;">
      <tr style="background-color: #f9fafb;">
        <th style="text-align: left; color: #6b7280; font-weight: 600; font-size: 14px; padding: 12px; border-bottom: 1px solid #e5e7eb;">Metric</th>
        <th style="text-align: right; color: #6b7280; font-weight: 600; font-size: 14px; padding: 12px; border-bottom: 1px solid #e5e7eb;">Value</th>
      </tr>
      <tr>
        <td style="padding: 12px; color: #374151;">${payload.metric.replace(/_/g, " ")}</td>
        <td style="padding: 12px; text-align: right; color: #374151; font-weight: 600;">${formatMetricValue(payload.metric, payload.value)}</td>
      </tr>
      ${
        hasThreshold
          ? `
      <tr>
        <td style="padding: 12px; color: #6b7280; border-top: 1px solid #f3f4f6;">Threshold</td>
        <td style="padding: 12px; text-align: right; color: #6b7280; border-top: 1px solid #f3f4f6;">${formatMetricValue(payload.metric, payload.threshold!)}</td>
      </tr>
      `
          : ""
      }
      ${
        changePercent !== null
          ? `
      <tr>
        <td style="padding: 12px; color: #6b7280; border-top: 1px solid #f3f4f6;">Change</td>
        <td style="padding: 12px; text-align: right; color: ${changePercent > 0 ? "#dc2626" : "#059669"}; font-weight: 600; border-top: 1px solid #f3f4f6;">
          ${changePercent > 0 ? "+" : ""}${changePercent.toFixed(1)}%
        </td>
      </tr>
      `
          : ""
      }
    </table>
  `;
}

/**
 * Generate action button
 */
function generateActionButton(
  text: string,
  url: string,
  color: string
): string {
  return `
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center" style="padding: 16px 0;">
          <a href="${url}" style="display: inline-block; background-color: ${color}; color: white; text-decoration: none; padding: 12px 32px; border-radius: 6px; font-weight: 600; font-size: 16px;">
            ${text}
          </a>
        </td>
      </tr>
    </table>
  `;
}

/**
 * Helper functions
 */

function getLevelEmoji(level: AlertLevel): string {
  const emojis = { critical: "🚨", warning: "⚠️", info: "ℹ️" };
  return emojis[level] || "📊";
}

function getLevelColor(level: AlertLevel): string {
  const colors = { critical: "#dc2626", warning: "#f59e0b", info: "#3b82f6" };
  return colors[level] || "#6b7280";
}

function adjustColor(hex: string, percent: number): string {
  const num = parseInt(hex.replace("#", ""), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.max(0, Math.min(255, (num >> 16) + amt));
  const G = Math.max(0, Math.min(255, ((num >> 8) & 0x00ff) + amt));
  const B = Math.max(0, Math.min(255, (num & 0x0000ff) + amt));
  return `#${((1 << 24) + (R << 16) + (G << 8) + B).toString(16).slice(1)}`;
}

function formatMetricValue(metric: string, value: number): string {
  const lowerMetric = metric.toLowerCase();

  if (lowerMetric.includes("rate") || lowerMetric.includes("percentage")) {
    return `${value.toFixed(2)}%`;
  }
  if (lowerMetric.includes("latency") || lowerMetric.includes("ms")) {
    return `${value.toFixed(0)}ms`;
  }
  if (lowerMetric.includes("conversion")) {
    return `${(value * 100).toFixed(2)}%`;
  }
  if (lowerMetric.includes("count")) {
    return value.toLocaleString();
  }

  return value.toFixed(2);
}

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Test email configuration
 */
export async function testEmailNotification(
  toEmail: string
): Promise<NotificationResult> {
  const testPayload: NotificationPayload = {
    userId: "test",
    level: "info",
    type: "significance",
    title: "Email Notification Test",
    message:
      "Your email notifications are configured correctly! You'll receive alerts here when important events occur in your experiments.",
    experimentName: "test-experiment",
    variantName: "test-variant",
    metric: "conversion_rate",
    value: 3.5,
    threshold: 2.8,
  };

  return sendEmailNotification(toEmail, testPayload);
}
