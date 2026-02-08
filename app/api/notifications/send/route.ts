/**
 * Unified Notification Send API
 * POST /api/notifications/send
 *
 * Triggers notifications across all configured channels (Slack, Email, PagerDuty, Push)
 * This is the main entry point for programmatically sending notifications.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { sendNotification, sendBatchNotifications } from "@/lib/notifications";
import { validateNotificationPayload } from "@/lib/notifications/validators";
import type { NotificationPayload, AlertLevel, AlertType } from "@/lib/notifications/types";
import { sendPushToUser } from "@/lib/push";
import { logger } from "@/lib/logger";

/**
 * POST /api/notifications/send
 * Send notification to all configured channels for the authenticated user
 *
 * Request Body:
 *   - level: AlertLevel ('info' | 'warning' | 'critical') - required
 *   - type: AlertType ('performance' | 'errors' | 'traffic' | 'significance' | 'winner') - required
 *   - title: string - required
 *   - message: string - required
 *   - channel?: string - optional, when 'push' sends browser push only
 *   - url?: string - optional, deep link for push notifications
 *   - experimentName?: string - optional
 *   - variantName?: string - optional
 *   - metric?: string - optional
 *   - value?: number - optional
 *   - threshold?: number - optional
 *   - metadata?: Record<string, any> - optional
 *   - batch?: NotificationPayload[] - optional, for batch sending
 *
 * Response:
 *   - success: boolean
 *   - data: { sent: number, failed: number, results: NotificationResult[] }
 */
export async function POST(request: NextRequest) {
  try {
    const userId = await requireAuth();
    const body = await request.json();

    // Check if this is a batch request
    if (body.batch && Array.isArray(body.batch)) {
      return handleBatchSend(userId, body.batch);
    }

    // Handle push channel directly
    if (body.channel === "push") {
      return handlePushSend(userId, body);
    }

    // Validate required fields
    const { level, type, title, message } = body;

    if (!level || !type || !title || !message) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields: level, type, title, message",
        },
        { status: 400 }
      );
    }

    // Validate level
    const validLevels: AlertLevel[] = ["info", "warning", "critical"];
    if (!validLevels.includes(level)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid level. Must be one of: ${validLevels.join(", ")}`,
        },
        { status: 400 }
      );
    }

    // Validate type
    const validTypes: AlertType[] = ["performance", "errors", "traffic", "significance", "winner"];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid type. Must be one of: ${validTypes.join(", ")}`,
        },
        { status: 400 }
      );
    }

    // Build notification payload
    const payload: NotificationPayload = {
      userId,
      level,
      type,
      title,
      message,
      experimentName: body.experimentName,
      variantName: body.variantName,
      metric: body.metric,
      value: body.value,
      threshold: body.threshold,
      metadata: {
        ...body.metadata,
        sentVia: "api",
        timestamp: new Date().toISOString(),
      },
    };

    // Validate the full payload
    const validation = validateNotificationPayload(payload);
    if (!validation.valid) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation failed",
          details: validation.errors,
        },
        { status: 400 }
      );
    }

    logger.log(`[Notifications Send API] Sending ${level} ${type} notification for user ${userId}`);

    // Send notification to all configured channels (slack, email, pagerduty)
    const results = await sendNotification(payload);

    // Also send via push (fire-and-forget, best-effort)
    sendPushToUser(userId, {
      title,
      body: message,
      url: body.url ?? "/dashboard",
    }).catch(() => {
      // Push delivery is best-effort — swallow errors
    });

    // Count successes and failures
    const sent = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    if (results.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          sent: 0,
          failed: 0,
          message: "No notification channels configured. Please configure at least one channel.",
          results: [],
        },
      });
    }

    // If all failed, return error status
    if (sent === 0 && failed > 0) {
      return NextResponse.json(
        {
          success: false,
          error: "All notification channels failed",
          data: {
            sent: 0,
            failed,
            results: results.map((r) => ({
              channel: r.channel,
              success: r.success,
              error: r.error,
              timestamp: r.timestamp,
            })),
          },
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        sent,
        failed,
        results: results.map((r) => ({
          channel: r.channel,
          success: r.success,
          messageId: r.messageId,
          error: r.error,
          timestamp: r.timestamp,
        })),
      },
    });
  } catch (error) {
    // Return auth errors directly
    if (error instanceof Response) return error;

    console.error("[POST /api/notifications/send]", error);

    // Check for rate limiting
    if (error instanceof Error && error.message?.includes("Rate limit")) {
      return NextResponse.json(
        {
          success: false,
          error: "Rate limit exceeded",
        },
        { status: 429 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: "Failed to send notification",
      },
      { status: 500 }
    );
  }
}

/**
 * Handle push-only notification sending
 */
async function handlePushSend(
  userId: string,
  body: { title?: string; message?: string; url?: string },
): Promise<NextResponse> {
  const { title, message, url } = body;

  if (!title || !message) {
    return NextResponse.json(
      {
        success: false,
        error: "Missing required fields for push: title, message",
      },
      { status: 400 },
    );
  }

  try {
    const result = await sendPushToUser(userId, {
      title,
      body: message,
      url: url ?? "/dashboard",
    });

    return NextResponse.json({
      success: true,
      data: {
        channel: "push",
        sent: result.sent,
        failed: result.failed,
        removed: result.removed,
      },
    });
  } catch (err) {
    console.error("[Push Send Error]", err);
    return NextResponse.json(
      { success: false, error: "Failed to send push notification" },
      { status: 500 },
    );
  }
}

/**
 * Handle batch notification sending
 */
async function handleBatchSend(
  userId: string,
  notifications: Partial<NotificationPayload>[]
): Promise<NextResponse> {
  try {
    // Validate and build full payloads
    const payloads: NotificationPayload[] = [];
    const errors: string[] = [];

    for (let i = 0; i < notifications.length; i++) {
      const n = notifications[i];

      if (!n.level || !n.type || !n.title || !n.message) {
        errors.push(`Notification ${i}: Missing required fields`);
        continue;
      }

      const payload: NotificationPayload = {
        userId,
        level: n.level as AlertLevel,
        type: n.type as AlertType,
        title: n.title,
        message: n.message,
        experimentName: n.experimentName,
        variantName: n.variantName,
        metric: n.metric,
        value: n.value,
        threshold: n.threshold,
        metadata: {
          ...n.metadata,
          sentVia: "api-batch",
          batchIndex: i,
        },
      };

      const validation = validateNotificationPayload(payload);
      if (!validation.valid) {
        errors.push(`Notification ${i}: ${validation.errors.join(", ")}`);
        continue;
      }

      payloads.push(payload);
    }

    if (payloads.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "No valid notifications in batch",
          details: errors,
        },
        { status: 400 }
      );
    }

    logger.log(`[Notifications Send API] Batch sending ${payloads.length} notifications for user ${userId}`);

    // Send batch notifications
    const results = await sendBatchNotifications(userId, payloads);

    const sent = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    return NextResponse.json({
      success: true,
      data: {
        processed: payloads.length,
        skipped: notifications.length - payloads.length,
        sent,
        failed,
        errors: errors.length > 0 ? errors : undefined,
        results: results.map((r) => ({
          channel: r.channel,
          success: r.success,
          messageId: r.messageId,
          error: r.error,
          timestamp: r.timestamp,
        })),
      },
    });
  } catch (error) {
    console.error("[Batch Send Error]", error);
    return NextResponse.json(
      {
        success: false,
        error: "Batch send failed",
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/notifications/send
 * Get information about the send API and available options
 *
 * SECURITY: Requires authentication to prevent information disclosure
 */
export async function GET(request: NextRequest) {
  try {
    await requireAuth();
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json(
      { success: false, error: "Authentication required" },
      { status: 401 }
    );
  }

  return NextResponse.json({
    success: true,
    data: {
      endpoint: "/api/notifications/send",
      method: "POST",
      description: "Send notifications to all configured channels",
      requiredFields: ["level", "type", "title", "message"],
      optionalFields: [
        "channel",
        "url",
        "experimentName",
        "variantName",
        "metric",
        "value",
        "threshold",
        "metadata",
        "batch",
      ],
      channels: ["slack", "pagerduty", "email", "push"],
      alertLevels: ["info", "warning", "critical"],
      alertTypes: ["performance", "errors", "traffic", "significance", "winner"],
      batchSupport: true,
      rateLimiting: {
        critical: { maxPerWindow: 10, windowMs: 300000, minIntervalMs: 30000 },
        warning: { maxPerWindow: 5, windowMs: 900000, minIntervalMs: 120000 },
        info: { maxPerWindow: 3, windowMs: 3600000, minIntervalMs: 900000 },
      },
      examples: {
        single: {
          level: "warning",
          type: "errors",
          title: "Error Rate Alert",
          message: "Error rate has exceeded 5%",
          experimentName: "checkout-flow-v2",
          variantName: "variant-b",
          metric: "error_rate",
          value: 7.5,
          threshold: 5.0,
        },
        push: {
          channel: "push",
          title: "New Inbox Message",
          message: "You have a new message from your co-founder",
          url: "/dashboard/inbox",
        },
        batch: {
          batch: [
            {
              level: "info",
              type: "significance",
              title: "Significance Reached",
              message: "Experiment reached 95% confidence",
              experimentName: "header-test",
            },
            {
              level: "warning",
              type: "performance",
              title: "Latency Spike",
              message: "P99 latency exceeded threshold",
              metric: "p99_latency_ms",
              value: 1200,
              threshold: 1000,
            },
          ],
        },
      },
    },
  });
}
