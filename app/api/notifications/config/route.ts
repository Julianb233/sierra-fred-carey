import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db/supabase-sql";
import { requireAuth } from "@/lib/auth";

const VALID_CHANNELS = ["slack", "pagerduty", "email"];
const VALID_ALERT_LEVELS = ["info", "warning", "critical"];

/**
 * GET /api/notifications/config
 * List all notification configurations for the authenticated user
 *
 * SECURITY: Requires authentication - userId from server-side session
 */
export async function GET(request: NextRequest) {
  try {
    const userId = await requireAuth();

    const configs = await sql`
      SELECT
        id,
        user_id as "userId",
        channel,
        webhook_url as "webhookUrl",
        email_address as "emailAddress",
        routing_key as "routingKey",
        enabled,
        alert_levels as "alertLevels",
        metadata,
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM notification_configs
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
    `;

    // Redact sensitive information (partial display only)
    const sanitizedConfigs = configs.map((config: any) => ({
      ...config,
      webhookUrl: config.webhookUrl
        ? `${config.webhookUrl.substring(0, 30)}...`
        : null,
      routingKey: config.routingKey
        ? `${config.routingKey.substring(0, 8)}...`
        : null,
    }));

    return NextResponse.json({
      success: true,
      data: sanitizedConfigs,
    });
  } catch (error: any) {
    if (error instanceof Response) {
      return error;
    }
    console.error("[GET /api/notifications/config]", error);

    if (error.message === "Unauthorized") {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { success: false, error: "Failed to fetch notification configs" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/notifications/config
 * Create a new notification configuration
 *
 * SECURITY: Requires authentication - userId from server-side session
 */
export async function POST(request: NextRequest) {
  try {
    const userId = await requireAuth();
    const body = await request.json();

    const {
      channel,
      webhookUrl,
      emailAddress,
      routingKey,
      alertLevels = ["critical"],
      metadata = {},
    } = body;

    // Validation
    if (!channel || !VALID_CHANNELS.includes(channel)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid channel. Must be one of: ${VALID_CHANNELS.join(", ")}`,
        },
        { status: 400 }
      );
    }

    // Validate alert levels
    if (!Array.isArray(alertLevels) || alertLevels.length === 0) {
      return NextResponse.json(
        { success: false, error: "Alert levels must be a non-empty array" },
        { status: 400 }
      );
    }

    const invalidLevels = alertLevels.filter(
      (level) => !VALID_ALERT_LEVELS.includes(level)
    );
    if (invalidLevels.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid alert levels: ${invalidLevels.join(", ")}. Must be: ${VALID_ALERT_LEVELS.join(", ")}`,
        },
        { status: 400 }
      );
    }

    // Channel-specific validation
    if (channel === "slack" && !webhookUrl) {
      return NextResponse.json(
        { success: false, error: "Slack webhook URL is required" },
        { status: 400 }
      );
    }

    if (channel === "pagerduty" && !routingKey) {
      return NextResponse.json(
        { success: false, error: "PagerDuty routing key is required" },
        { status: 400 }
      );
    }

    if (channel === "email" && !emailAddress) {
      return NextResponse.json(
        { success: false, error: "Email address is required" },
        { status: 400 }
      );
    }

    // Check if config already exists for this channel
    const existing = await sql`
      SELECT id FROM notification_configs
      WHERE user_id = ${userId} AND channel = ${channel}
    `;

    if (existing.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Configuration for ${channel} already exists. Use PATCH to update.`,
        },
        { status: 409 }
      );
    }

    // Create config
    const result = await sql`
      INSERT INTO notification_configs (
        user_id,
        channel,
        webhook_url,
        email_address,
        routing_key,
        alert_levels,
        metadata
      )
      VALUES (
        ${userId},
        ${channel},
        ${webhookUrl || null},
        ${emailAddress || null},
        ${routingKey || null},
        ${alertLevels},
        ${JSON.stringify(metadata)}
      )
      RETURNING
        id,
        user_id as "userId",
        channel,
        enabled,
        alert_levels as "alertLevels",
        created_at as "createdAt"
    `;

    return NextResponse.json(
      { success: true, data: result[0] },
      { status: 201 }
    );
  } catch (error: any) {
    if (error instanceof Response) {
      return error;
    }
    console.error("[POST /api/notifications/config]", error);

    if (error.message === "Unauthorized") {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { success: false, error: "Failed to create notification config" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/notifications/config
 * Update an existing notification configuration
 *
 * SECURITY: Requires authentication - userId from server-side session
 */
export async function PATCH(request: NextRequest) {
  try {
    const userId = await requireAuth();
    const body = await request.json();

    const {
      id,
      webhookUrl,
      emailAddress,
      routingKey,
      alertLevels,
      enabled,
      metadata,
    } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Config ID is required" },
        { status: 400 }
      );
    }

    // Verify ownership
    const existing = await sql`
      SELECT id, channel FROM notification_configs
      WHERE id = ${id} AND user_id = ${userId}
    `;

    if (existing.length === 0) {
      return NextResponse.json(
        { success: false, error: "Notification config not found" },
        { status: 404 }
      );
    }

    // Build update query dynamically
    const updates: string[] = [];
    const values: any[] = [];

    if (webhookUrl !== undefined) {
      updates.push(`webhook_url = $${values.length + 1}`);
      values.push(webhookUrl);
    }

    if (emailAddress !== undefined) {
      updates.push(`email_address = $${values.length + 1}`);
      values.push(emailAddress);
    }

    if (routingKey !== undefined) {
      updates.push(`routing_key = $${values.length + 1}`);
      values.push(routingKey);
    }

    if (alertLevels !== undefined) {
      // Validate alert levels
      if (!Array.isArray(alertLevels) || alertLevels.length === 0) {
        return NextResponse.json(
          { success: false, error: "Alert levels must be a non-empty array" },
          { status: 400 }
        );
      }

      const invalidLevels = alertLevels.filter(
        (level) => !VALID_ALERT_LEVELS.includes(level)
      );
      if (invalidLevels.length > 0) {
        return NextResponse.json(
          {
            success: false,
            error: `Invalid alert levels: ${invalidLevels.join(", ")}`,
          },
          { status: 400 }
        );
      }

      updates.push(`alert_levels = $${values.length + 1}`);
      values.push(alertLevels);
    }

    if (enabled !== undefined) {
      updates.push(`enabled = $${values.length + 1}`);
      values.push(enabled);
    }

    if (metadata !== undefined) {
      updates.push(`metadata = $${values.length + 1}`);
      values.push(JSON.stringify(metadata));
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { success: false, error: "No fields to update" },
        { status: 400 }
      );
    }

    // Execute update
    const result = await sql`
      UPDATE notification_configs
      SET ${sql.unsafe(updates.join(", "))}
      WHERE id = ${id} AND user_id = ${userId}
      RETURNING
        id,
        user_id as "userId",
        channel,
        enabled,
        alert_levels as "alertLevels",
        updated_at as "updatedAt"
    `;

    return NextResponse.json({
      success: true,
      data: result[0],
    });
  } catch (error: any) {
    console.error("[PATCH /api/notifications/config]", error);

    if (error.message === "Unauthorized") {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { success: false, error: "Failed to update notification config" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/notifications/config
 * Delete a notification configuration
 *
 * SECURITY: Requires authentication - userId from server-side session
 */
export async function DELETE(request: NextRequest) {
  try {
    const userId = await requireAuth();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Config ID is required" },
        { status: 400 }
      );
    }

    const result = await sql`
      DELETE FROM notification_configs
      WHERE id = ${id} AND user_id = ${userId}
      RETURNING id
    `;

    if (result.length === 0) {
      return NextResponse.json(
        { success: false, error: "Notification config not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Notification config deleted",
    });
  } catch (error: any) {
    console.error("[DELETE /api/notifications/config]", error);

    if (error.message === "Unauthorized") {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { success: false, error: "Failed to delete notification config" },
      { status: 500 }
    );
  }
}
