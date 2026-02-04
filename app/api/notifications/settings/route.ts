/**
 * Notification Settings API
 * Manages user notification preferences and configurations
 *
 * Routes:
 * GET    /api/notifications/settings - Get all notification configs for user
 * POST   /api/notifications/settings - Create new notification config
 * PATCH  /api/notifications/settings - Update notification config
 * DELETE /api/notifications/settings - Delete notification config
 */

import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db/neon";
import { requireAuth } from "@/lib/auth";
import {
  validateNotificationPayload,
  validateSlackWebhookUrl,
  validatePagerDutyRoutingKey,
} from "@/lib/notifications/validators";
import { testNotificationConfig } from "@/lib/notifications";
import type { NotificationChannel, AlertLevel } from "@/lib/notifications/types";

/**
 * GET /api/notifications/settings
 * Get all notification configurations for the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    const userId = await requireAuth();

    const configs = await sql`
      SELECT
        id,
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

    // Get notification stats
    const stats = await sql`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'sent') as sent,
        COUNT(*) FILTER (WHERE status = 'failed') as failed
      FROM notification_logs
      WHERE user_id = ${userId}
        AND created_at > NOW() - INTERVAL '7 days'
    `;

    return NextResponse.json({
      success: true,
      data: {
        configs: configs.map((config: any) => ({
          id: config.id,
          channel: config.channel,
          webhookUrl: config.webhookUrl ? maskUrl(config.webhookUrl) : null,
          emailAddress: config.emailAddress,
          routingKey: config.routingKey ? maskKey(config.routingKey) : null,
          enabled: config.enabled,
          alertLevels: config.alertLevels || [],
          metadata: config.metadata || {},
          createdAt: config.createdAt,
          updatedAt: config.updatedAt,
        })),
        stats: stats[0] || { total: 0, sent: 0, failed: 0 },
      },
    });
  } catch (error: any) {
    console.error("[GET /api/notifications/settings]", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch settings" },
      { status: error.message === "Unauthorized" ? 401 : 500 }
    );
  }
}

/**
 * POST /api/notifications/settings
 * Create a new notification configuration
 */
export async function POST(request: NextRequest) {
  try {
    const userId = await requireAuth();
    const body = await request.json();

    // Validate required fields
    const { channel, alertLevels, enabled = true } = body;

    if (!channel || !["slack", "email", "pagerduty"].includes(channel)) {
      return NextResponse.json(
        { success: false, error: "Invalid channel" },
        { status: 400 }
      );
    }

    if (!alertLevels || !Array.isArray(alertLevels)) {
      return NextResponse.json(
        { success: false, error: "Alert levels are required" },
        { status: 400 }
      );
    }

    // Validate channel-specific fields
    let webhookUrl = null;
    let emailAddress = null;
    let routingKey = null;

    switch (channel) {
      case "slack":
        webhookUrl = body.webhookUrl;
        if (!webhookUrl) {
          return NextResponse.json(
            { success: false, error: "Slack webhook URL is required" },
            { status: 400 }
          );
        }
        const slackValidation = validateSlackWebhookUrl(webhookUrl);
        if (!slackValidation.valid) {
          return NextResponse.json(
            { success: false, error: slackValidation.errors[0] },
            { status: 400 }
          );
        }
        break;

      case "email":
        emailAddress = body.emailAddress;
        if (!emailAddress) {
          return NextResponse.json(
            { success: false, error: "Email address is required" },
            { status: 400 }
          );
        }
        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(emailAddress)) {
          return NextResponse.json(
            { success: false, error: "Invalid email address" },
            { status: 400 }
          );
        }
        break;

      case "pagerduty":
        routingKey = body.routingKey;
        if (!routingKey) {
          return NextResponse.json(
            { success: false, error: "PagerDuty routing key is required" },
            { status: 400 }
          );
        }
        const pdValidation = validatePagerDutyRoutingKey(routingKey);
        if (!pdValidation.valid) {
          return NextResponse.json(
            { success: false, error: pdValidation.errors[0] },
            { status: 400 }
          );
        }
        break;
    }

    // Check if a config already exists for this channel
    const existing = await sql`
      SELECT id
      FROM notification_configs
      WHERE user_id = ${userId}
        AND channel = ${channel}
      LIMIT 1
    `;

    if (existing.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `A ${channel} notification config already exists. Please update it instead.`,
        },
        { status: 409 }
      );
    }

    // Create new config
    const result = await sql`
      INSERT INTO notification_configs (
        user_id,
        channel,
        webhook_url,
        email_address,
        routing_key,
        enabled,
        alert_levels,
        metadata
      )
      VALUES (
        ${userId},
        ${channel},
        ${webhookUrl},
        ${emailAddress},
        ${routingKey},
        ${enabled},
        ${alertLevels},
        ${JSON.stringify(body.metadata || {})}
      )
      RETURNING
        id,
        channel,
        enabled,
        alert_levels as "alertLevels",
        created_at as "createdAt"
    `;

    const newConfig = result[0];

    // Test the configuration if requested
    if (body.testOnCreate) {
      const testResult = await testNotificationConfig(newConfig.id, userId);
      if (!testResult.success) {
        // Delete the config if test failed
        await sql`
          DELETE FROM notification_configs
          WHERE id = ${newConfig.id}
        `;
        return NextResponse.json(
          {
            success: false,
            error: `Configuration test failed: ${testResult.error}`,
          },
          { status: 400 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        id: newConfig.id,
        channel: newConfig.channel,
        enabled: newConfig.enabled,
        alertLevels: newConfig.alertLevels,
        createdAt: newConfig.createdAt,
      },
    });
  } catch (error: any) {
    console.error("[POST /api/notifications/settings]", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create config" },
      { status: error.message === "Unauthorized" ? 401 : 500 }
    );
  }
}

/**
 * PATCH /api/notifications/settings
 * Update an existing notification configuration
 */
export async function PATCH(request: NextRequest) {
  try {
    const userId = await requireAuth();
    const body = await request.json();

    const { configId, ...updates } = body;

    if (!configId) {
      return NextResponse.json(
        { success: false, error: "Config ID is required" },
        { status: 400 }
      );
    }

    // Verify ownership
    const existing = await sql`
      SELECT id, channel
      FROM notification_configs
      WHERE id = ${configId}
        AND user_id = ${userId}
    `;

    if (existing.length === 0) {
      return NextResponse.json(
        { success: false, error: "Configuration not found" },
        { status: 404 }
      );
    }

    const config = existing[0];

    // Build update query dynamically
    const updateFields: string[] = [];
    const updateValues: any[] = [];

    if (updates.enabled !== undefined) {
      updateFields.push("enabled = $" + (updateValues.length + 1));
      updateValues.push(updates.enabled);
    }

    if (updates.alertLevels) {
      updateFields.push("alert_levels = $" + (updateValues.length + 1));
      updateValues.push(updates.alertLevels);
    }

    if (updates.webhookUrl && config.channel === "slack") {
      const validation = validateSlackWebhookUrl(updates.webhookUrl);
      if (!validation.valid) {
        return NextResponse.json(
          { success: false, error: validation.errors[0] },
          { status: 400 }
        );
      }
      updateFields.push("webhook_url = $" + (updateValues.length + 1));
      updateValues.push(updates.webhookUrl);
    }

    if (updates.emailAddress && config.channel === "email") {
      updateFields.push("email_address = $" + (updateValues.length + 1));
      updateValues.push(updates.emailAddress);
    }

    if (updates.routingKey && config.channel === "pagerduty") {
      const validation = validatePagerDutyRoutingKey(updates.routingKey);
      if (!validation.valid) {
        return NextResponse.json(
          { success: false, error: validation.errors[0] },
          { status: 400 }
        );
      }
      updateFields.push("routing_key = $" + (updateValues.length + 1));
      updateValues.push(updates.routingKey);
    }

    if (updates.metadata) {
      updateFields.push("metadata = $" + (updateValues.length + 1));
      updateValues.push(JSON.stringify(updates.metadata));
    }

    if (updateFields.length === 0) {
      return NextResponse.json(
        { success: false, error: "No valid fields to update" },
        { status: 400 }
      );
    }

    // Always update the updated_at timestamp
    updateFields.push("updated_at = NOW()");

    // Execute update
    const result = await sql`
      UPDATE notification_configs
      SET ${sql.unsafe(updateFields.join(", "))}
      WHERE id = ${configId}
        AND user_id = ${userId}
      RETURNING
        id,
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
    console.error("[PATCH /api/notifications/settings]", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update config" },
      { status: error.message === "Unauthorized" ? 401 : 500 }
    );
  }
}

/**
 * DELETE /api/notifications/settings
 * Delete a notification configuration
 */
export async function DELETE(request: NextRequest) {
  try {
    const userId = await requireAuth();
    const { searchParams } = new URL(request.url);
    const configId = searchParams.get("configId");

    if (!configId) {
      return NextResponse.json(
        { success: false, error: "Config ID is required" },
        { status: 400 }
      );
    }

    // Delete the config
    const result = await sql`
      DELETE FROM notification_configs
      WHERE id = ${configId}
        AND user_id = ${userId}
      RETURNING id
    `;

    if (result.length === 0) {
      return NextResponse.json(
        { success: false, error: "Configuration not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { deleted: true },
    });
  } catch (error: any) {
    console.error("[DELETE /api/notifications/settings]", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to delete config" },
      { status: error.message === "Unauthorized" ? 401 : 500 }
    );
  }
}

/**
 * Helper: Mask sensitive URLs for display
 */
function maskUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split("/");
    if (pathParts.length > 3) {
      // Show only first and last part of path
      return `${urlObj.origin}/.../${pathParts[pathParts.length - 1]}`;
    }
    return url;
  } catch {
    return "***";
  }
}

/**
 * Helper: Mask sensitive keys for display
 */
function maskKey(key: string): string {
  if (key.length <= 8) {
    return "***";
  }
  return `${key.slice(0, 4)}...${key.slice(-4)}`;
}
