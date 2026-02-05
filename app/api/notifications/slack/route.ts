/**
 * Slack Notification API Endpoint
 * POST /api/notifications/slack
 * Sends alert notifications to Slack webhooks
 */

import { NextRequest, NextResponse } from "next/server";
import { sendSlackNotification } from "@/lib/notifications/slack";
import { NotificationPayload } from "@/lib/notifications/types";
import { sql } from "@/lib/db/supabase-sql";

/**
 * POST /api/notifications/slack
 * Send alert to Slack webhook
 *
 * Body:
 *   - webhookUrl: Slack webhook URL (required if not using userId)
 *   - userId: User ID to fetch webhook from config (optional)
 *   - level: Alert level (info, warning, critical) - required
 *   - type: Alert type (performance, errors, traffic, significance) - required
 *   - title: Alert title - required
 *   - message: Alert message - required
 *   - experimentName: (optional) Experiment name
 *   - variantName: (optional) Variant name
 *   - metric: (optional) Metric name
 *   - value: (optional) Metric value
 *   - threshold: (optional) Threshold value
 *   - metadata: (optional) Additional metadata
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      webhookUrl,
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

    // Validate required fields
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

    // Validate type
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

    // Get webhook URL from config if userId provided
    let finalWebhookUrl = webhookUrl;
    if (userId && !webhookUrl) {
      const configResult = await sql`
        SELECT webhook_url
        FROM notification_configs
        WHERE user_id = ${userId}
          AND channel = 'slack'
          AND enabled = true
        LIMIT 1
      `;

      if (configResult.length === 0) {
        return NextResponse.json(
          {
            success: false,
            error: "No enabled Slack configuration found for user",
          },
          { status: 404 }
        );
      }

      finalWebhookUrl = configResult[0].webhook_url;
    }

    // Validate webhook URL is provided
    if (!finalWebhookUrl) {
      return NextResponse.json(
        {
          success: false,
          error: "Either webhookUrl or userId must be provided",
        },
        { status: 400 }
      );
    }

    // Validate webhook URL format
    if (!finalWebhookUrl.startsWith("https://hooks.slack.com/")) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid Slack webhook URL format",
        },
        { status: 400 }
      );
    }

    // Create notification payload
    const payload: NotificationPayload = {
      userId: userId || "api",
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

    console.log("[Slack API] Sending notification:", {
      level,
      type,
      title,
      experimentName,
    });

    // Send to Slack
    const result = await sendSlackNotification(finalWebhookUrl, payload);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Failed to send Slack notification",
          details: result.error,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        channel: "slack",
        timestamp: result.timestamp,
      },
    });
  } catch (error: any) {
    console.error("[Slack API] Error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to send Slack notification",
        message: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/notifications/slack
 * Get Slack notification configuration for a user
 *
 * Query params:
 *   - userId: User ID to fetch config for
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: "userId query parameter is required",
        },
        { status: 400 }
      );
    }

    const configs = await sql`
      SELECT
        id,
        user_id as "userId",
        channel,
        webhook_url as "webhookUrl",
        enabled,
        alert_levels as "alertLevels",
        metadata,
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM notification_configs
      WHERE user_id = ${userId}
        AND channel = 'slack'
    `;

    return NextResponse.json({
      success: true,
      data: configs.length > 0 ? configs[0] : null,
    });
  } catch (error: any) {
    console.error("[Slack API] Error fetching config:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch Slack configuration",
        message: error.message,
      },
      { status: 500 }
    );
  }
}
