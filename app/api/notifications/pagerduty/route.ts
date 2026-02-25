/**
 * PagerDuty Notification API Endpoint
 * POST /api/notifications/pagerduty
 * Creates incidents in PagerDuty using Events API v2
 */

import { NextRequest, NextResponse } from "next/server";
import {
  sendPagerDutyNotification,
  resolvePagerDutyIncident,
} from "@/lib/notifications/pagerduty";
import { NotificationPayload } from "@/lib/notifications/types";
import { sql } from "@/lib/db/supabase-sql";
import { requireAuth } from "@/lib/auth";
import { logger } from "@/lib/logger";

/**
 * POST /api/notifications/pagerduty
 * Create incident in PagerDuty
 *
 * SECURITY: Requires authentication - userId from server-side session
 *
 * Body:
 *   - routingKey: PagerDuty routing/integration key (required if not using userId)
 *   - level: Alert level (info, warning, critical) - required
 *   - type: Alert type (performance, errors, traffic, significance) - required
 *   - title: Alert title - required
 *   - message: Alert message - required
 *   - action: Event action (trigger, resolve) - default: trigger
 *   - dedupKey: Deduplication key for resolving (required if action=resolve)
 *   - experimentName: (optional) Experiment name
 *   - variantName: (optional) Variant name
 *   - metric: (optional) Metric name
 *   - value: (optional) Metric value
 *   - threshold: (optional) Threshold value
 *   - metadata: (optional) Additional metadata
 */
export async function POST(request: NextRequest) {
  try {
    // SECURITY: Require authentication
    const authenticatedUserId = await requireAuth();

    const body = await request.json();
    const {
      routingKey,
      level,
      type,
      title,
      message,
      action = "trigger",
      dedupKey,
      experimentName,
      variantName,
      metric,
      value,
      threshold,
      metadata = {},
    } = body;

    // Validate action
    const validActions = ["trigger", "resolve"];
    if (!validActions.includes(action)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid action. Must be one of: ${validActions.join(", ")}`,
        },
        { status: 400 }
      );
    }

    // SECURITY: Always use authenticated userId
    const userId = authenticatedUserId;

    // Get routing key from config if not directly provided
    let finalRoutingKey = routingKey;
    if (!routingKey) {
      const configResult = await sql`
        SELECT routing_key
        FROM notification_configs
        WHERE user_id = ${userId}
          AND channel = 'pagerduty'
          AND enabled = true
        LIMIT 1
      `;

      if (configResult.length === 0) {
        return NextResponse.json(
          {
            success: false,
            error: "No enabled PagerDuty configuration found for user",
          },
          { status: 404 }
        );
      }

      finalRoutingKey = configResult[0].routing_key;
    }

    // Validate routing key is provided
    if (!finalRoutingKey) {
      return NextResponse.json(
        {
          success: false,
          error: "Routing key is required (either directly or via user config)",
        },
        { status: 400 }
      );
    }

    // Handle resolve action
    if (action === "resolve") {
      if (!dedupKey) {
        return NextResponse.json(
          {
            success: false,
            error: "dedupKey is required when action=resolve",
          },
          { status: 400 }
        );
      }

      logger.log("[PagerDuty API] Resolving incident:", { dedupKey });

      const result = await resolvePagerDutyIncident(finalRoutingKey, dedupKey);

      if (!result.success) {
        return NextResponse.json(
          {
            success: false,
            error: "Failed to resolve PagerDuty incident",
            details: result.error,
          },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        data: {
          action: "resolve",
          dedupKey,
          channel: "pagerduty",
          timestamp: result.timestamp,
        },
      });
    }

    // Handle trigger action - validate required fields
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

    logger.log("[PagerDuty API] Triggering incident:", {
      level,
      type,
      title,
      experimentName,
    });

    // Send to PagerDuty
    const result = await sendPagerDutyNotification(finalRoutingKey, payload);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Failed to create PagerDuty incident",
          details: result.error,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        action: "trigger",
        channel: "pagerduty",
        incidentKey: result.messageId,
        timestamp: result.timestamp,
      },
    });
  } catch (error: unknown) {
    // Return auth errors directly
    if (error instanceof Response) return error;

    console.error("[PagerDuty API] Error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to process PagerDuty request",
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/notifications/pagerduty
 * Get PagerDuty notification configuration for the authenticated user
 *
 * SECURITY: Requires authentication - userId from server-side session
 */
export async function GET(request: NextRequest) {
  try {
    // SECURITY: Require authentication, use server-side userId
    const userId = await requireAuth();

    const configs = await sql`
      SELECT
        id,
        user_id as "userId",
        channel,
        routing_key as "routingKey",
        enabled,
        alert_levels as "alertLevels",
        metadata,
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM notification_configs
      WHERE user_id = ${userId}
        AND channel = 'pagerduty'
    `;

    // Redact routing key for security
    const sanitizedConfig = configs.length > 0 ? {
      ...configs[0],
      routingKey: configs[0].routingKey
        ? `${String(configs[0].routingKey).substring(0, 8)}...`
        : null,
    } : null;

    return NextResponse.json({
      success: true,
      data: sanitizedConfig,
    });
  } catch (error: unknown) {
    // Return auth errors directly
    if (error instanceof Response) return error;

    console.error("[PagerDuty API] Error fetching config:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch PagerDuty configuration",
      },
      { status: 500 }
    );
  }
}
