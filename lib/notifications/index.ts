/**
 * Unified Notification Dispatcher with Rate Limiting
 * Handles multi-channel notification delivery with intelligent routing and spam prevention
 */

import { logger } from "@/lib/logger";
import { sql } from "@/lib/db/supabase-sql";
import { sendSlackNotification, testSlackWebhook } from "./slack";
import {
  sendPagerDutyNotification,
  testPagerDutyIntegration,
} from "./pagerduty";
import {
  sendEmailNotification,
  sendDigestEmail,
  testEmailNotification,
} from "./email";
import {
  NotificationPayload,
  NotificationResult,
  NotificationConfig,
  AlertLevel,
} from "./types";

/**
 * Rate limiting configuration
 */
interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxNotifications: number; // Max notifications per window
  minInterval: number; // Minimum time between notifications (ms)
}

/**
 * Default rate limits per alert level
 */
const DEFAULT_RATE_LIMITS: Record<AlertLevel, RateLimitConfig> = {
  critical: {
    windowMs: 5 * 60 * 1000, // 5 minutes
    maxNotifications: 10,
    minInterval: 30 * 1000, // 30 seconds
  },
  warning: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxNotifications: 5,
    minInterval: 2 * 60 * 1000, // 2 minutes
  },
  info: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxNotifications: 3,
    minInterval: 15 * 60 * 1000, // 15 minutes
  },
};

/**
 * Event-based notification routing configuration
 */
interface EventRoutingConfig {
  channels: Array<"slack" | "email" | "pagerduty">;
  minLevel: AlertLevel;
  batchable: boolean; // Can this event be batched with others?
}

/**
 * Default routing rules for different event types
 */
const EVENT_ROUTING: Record<string, EventRoutingConfig> = {
  significance: {
    channels: ["slack", "email"],
    minLevel: "info",
    batchable: false,
  },
  winner: {
    channels: ["slack", "email"],
    minLevel: "info",
    batchable: false,
  },
  errors: {
    channels: ["slack", "pagerduty", "email"],
    minLevel: "warning",
    batchable: true,
  },
  performance: {
    channels: ["slack"],
    minLevel: "warning",
    batchable: true,
  },
  traffic: {
    channels: ["slack"],
    minLevel: "info",
    batchable: true,
  },
};

/**
 * In-memory rate limit tracker (use Redis in production)
 */
const rateLimitTracker = new Map<
  string,
  Array<{ timestamp: number; level: AlertLevel }>
>();

/**
 * Send notification to all configured and enabled channels for a user
 * with intelligent rate limiting
 */
export async function sendNotification(
  payload: NotificationPayload
): Promise<NotificationResult[]> {
  try {
    // Check rate limits
    const rateLimitResult = await checkRateLimit(payload);
    if (!rateLimitResult.allowed) {
      logger.log(
        `[Notifications] Rate limit exceeded: ${rateLimitResult.reason}`
      );
      return [
        {
          success: false,
          channel: "slack",
          error: `Rate limit exceeded: ${rateLimitResult.reason}`,
          timestamp: new Date(),
        },
      ];
    }

    // Get user's enabled notification configs that match alert level
    const configs = await getUserNotificationConfigs(
      payload.userId,
      payload.level
    );

    if (configs.length === 0) {
      logger.log(
        `[Notifications] No enabled configs for user ${payload.userId} at level ${payload.level}`
      );
      return [];
    }

    // Filter configs based on event routing rules
    const routingConfig = EVENT_ROUTING[payload.type] || {
      channels: ["slack", "email"],
      minLevel: "info",
      batchable: false,
    };

    const filteredConfigs = configs.filter((config) =>
      routingConfig.channels.includes(config.channel)
    );

    if (filteredConfigs.length === 0) {
      logger.log(
        `[Notifications] No configs match routing rules for event type: ${payload.type}`
      );
      return [];
    }

    // Send to all channels in parallel
    const results = await Promise.all(
      filteredConfigs.map((config) => sendToChannel(config, payload))
    );

    // Log all notifications
    await Promise.all(
      results.map((result, index) =>
        logNotification(filteredConfigs[index], payload, result)
      )
    );

    // Update rate limit tracker
    trackNotification(payload);

    return results;
  } catch (error) {
    console.error("[Notifications] Error sending notifications:", error);
    throw error;
  }
}

/**
 * Check if notification should be rate limited
 */
async function checkRateLimit(
  payload: NotificationPayload
): Promise<{ allowed: boolean; reason?: string }> {
  const key = `${payload.userId}:${payload.type}`;
  const now = Date.now();
  const config = DEFAULT_RATE_LIMITS[payload.level];

  // Get recent notifications for this user/type
  const recentNotifications = rateLimitTracker.get(key) || [];

  // Clean up old entries outside the time window
  const validNotifications = recentNotifications.filter(
    (n) => now - n.timestamp < config.windowMs
  );

  // Check max notifications in window
  if (validNotifications.length >= config.maxNotifications) {
    return {
      allowed: false,
      reason: `Maximum ${config.maxNotifications} notifications per ${config.windowMs / 60000} minutes`,
    };
  }

  // Check minimum interval since last notification
  if (validNotifications.length > 0) {
    const lastNotification = validNotifications[validNotifications.length - 1];
    const timeSinceLast = now - lastNotification.timestamp;

    if (timeSinceLast < config.minInterval) {
      return {
        allowed: false,
        reason: `Minimum ${config.minInterval / 1000}s interval between notifications`,
      };
    }
  }

  // Check database for additional context (e.g., user preferences)
  const userRateLimitOverride = await getUserRateLimitPreference(
    payload.userId
  );
  if (userRateLimitOverride?.disabled) {
    return { allowed: true };
  }

  return { allowed: true };
}

/**
 * Track notification for rate limiting
 */
function trackNotification(payload: NotificationPayload): void {
  const key = `${payload.userId}:${payload.type}`;
  const now = Date.now();

  const existing = rateLimitTracker.get(key) || [];
  existing.push({ timestamp: now, level: payload.level });

  rateLimitTracker.set(key, existing);

  // Cleanup old entries periodically
  if (Math.random() < 0.1) {
    // 10% chance to cleanup
    cleanupRateLimitTracker();
  }
}

/**
 * Cleanup old entries from rate limit tracker
 */
function cleanupRateLimitTracker(): void {
  const now = Date.now();
  const maxAge = 24 * 60 * 60 * 1000; // 24 hours

  for (const [key, notifications] of rateLimitTracker.entries()) {
    const validNotifications = notifications.filter(
      (n) => now - n.timestamp < maxAge
    );

    if (validNotifications.length === 0) {
      rateLimitTracker.delete(key);
    } else {
      rateLimitTracker.set(key, validNotifications);
    }
  }
}

/**
 * Get user's rate limit preferences
 */
async function getUserRateLimitPreference(
  userId: string
): Promise<{ disabled: boolean } | null> {
  try {
    const result = await sql`
      SELECT rate_limit_disabled
      FROM user_notification_preferences
      WHERE user_id = ${userId}
      LIMIT 1
    `;

    if (result.length === 0) {
      return null;
    }

    return { disabled: result[0].rate_limit_disabled };
  } catch (error) {
    // Table might not exist yet
    return null;
  }
}

/**
 * Get user's notification configs filtered by alert level
 */
async function getUserNotificationConfigs(
  userId: string,
  alertLevel: AlertLevel
): Promise<NotificationConfig[]> {
  try {
    const result = await sql`
      SELECT
        id,
        user_id as "userId",
        channel,
        webhook_url as "webhookUrl",
        api_key as "apiKey",
        email_address as "emailAddress",
        routing_key as "routingKey",
        enabled,
        alert_levels as "alertLevels",
        metadata,
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM notification_configs
      WHERE user_id = ${userId}
        AND enabled = true
        AND ${alertLevel} = ANY(alert_levels)
    `;

    return result as unknown as NotificationConfig[];
  } catch (error) {
    console.error("[Notifications] Error fetching configs:", error);
    return [];
  }
}

/**
 * Send notification to specific channel
 */
async function sendToChannel(
  config: NotificationConfig,
  payload: NotificationPayload
): Promise<NotificationResult> {
  try {
    switch (config.channel) {
      case "slack":
        if (!config.webhookUrl) {
          throw new Error("Slack webhook URL not configured");
        }
        return await sendSlackNotification(config.webhookUrl, payload);

      case "pagerduty":
        if (!config.routingKey) {
          throw new Error("PagerDuty routing key not configured");
        }
        return await sendPagerDutyNotification(config.routingKey, payload);

      case "email":
        if (!config.emailAddress) {
          throw new Error("Email address not configured");
        }
        return await sendEmailNotification(config.emailAddress, payload);

      default:
        throw new Error(`Unknown channel: ${config.channel}`);
    }
  } catch (error: any) {
    console.error(
      `[Notifications] Error sending to ${config.channel}:`,
      error
    );
    return {
      success: false,
      channel: config.channel,
      error: error.message,
      timestamp: new Date(),
    };
  }
}

/**
 * Log notification attempt to database
 */
async function logNotification(
  config: NotificationConfig,
  payload: NotificationPayload,
  result: NotificationResult
): Promise<void> {
  try {
    await sql`
      INSERT INTO notification_logs (
        user_id,
        config_id,
        channel,
        alert_level,
        alert_type,
        title,
        message,
        experiment_name,
        variant_name,
        metadata,
        status,
        error_message,
        attempts,
        response_data,
        sent_at
      )
      VALUES (
        ${payload.userId},
        ${config.id},
        ${config.channel},
        ${payload.level},
        ${payload.type},
        ${payload.title},
        ${payload.message},
        ${payload.experimentName || null},
        ${payload.variantName || null},
        ${JSON.stringify(payload.metadata || {})},
        ${result.success ? "sent" : "failed"},
        ${result.error || null},
        1,
        ${JSON.stringify({ messageId: result.messageId })},
        ${result.success ? new Date().toISOString() : null}
      )
    `;
  } catch (error) {
    console.error("[Notifications] Error logging notification:", error);
  }
}

/**
 * Test notification configuration
 */
export async function testNotificationConfig(
  configId: string,
  userId: string
): Promise<NotificationResult> {
  try {
    const result = await sql`
      SELECT
        id,
        user_id as "userId",
        channel,
        webhook_url as "webhookUrl",
        routing_key as "routingKey",
        email_address as "emailAddress",
        enabled
      FROM notification_configs
      WHERE id = ${configId}
        AND user_id = ${userId}
    `;

    if (result.length === 0) {
      throw new Error("Notification config not found");
    }

    const config = result[0] as any;

    switch (config.channel) {
      case "slack":
        if (!config.webhookUrl) {
          throw new Error("Slack webhook URL not configured");
        }
        return await testSlackWebhook(config.webhookUrl);

      case "pagerduty":
        if (!config.routingKey) {
          throw new Error("PagerDuty routing key not configured");
        }
        return await testPagerDutyIntegration(config.routingKey);

      case "email":
        if (!config.emailAddress) {
          throw new Error("Email address not configured");
        }
        return await testEmailNotification(config.emailAddress);

      default:
        throw new Error(`Testing not supported for channel: ${config.channel}`);
    }
  } catch (error: any) {
    return {
      success: false,
      channel: "slack",
      error: error.message,
      timestamp: new Date(),
    };
  }
}

/**
 * Get notification logs for a user
 */
export async function getNotificationLogs(
  userId: string,
  options: {
    limit?: number;
    channel?: string;
    level?: AlertLevel;
    type?: string;
  } = {}
): Promise<any[]> {
  try {
    const { limit = 50, channel, level, type } = options;

    let query = sql`
      SELECT
        id,
        user_id as "userId",
        config_id as "configId",
        channel,
        alert_level as "alertLevel",
        alert_type as "alertType",
        title,
        message,
        experiment_name as "experimentName",
        variant_name as "variantName",
        metadata,
        status,
        error_message as "errorMessage",
        attempts,
        response_data as "responseData",
        sent_at as "sentAt",
        created_at as "createdAt"
      FROM notification_logs
      WHERE user_id = ${userId}
    `;

    // Add optional filters
    if (channel) {
      query = sql`${query} AND channel = ${channel}`;
    }
    if (level) {
      query = sql`${query} AND alert_level = ${level}`;
    }
    if (type) {
      query = sql`${query} AND alert_type = ${type}`;
    }

    query = sql`${query}
      ORDER BY created_at DESC
      LIMIT ${limit}
    `;

    return (await query) as any[];
  } catch (error) {
    console.error("[Notifications] Error fetching logs:", error);
    return [];
  }
}

/**
 * Get notification statistics for a user
 */
export async function getNotificationStats(userId: string): Promise<{
  total: number;
  sent: number;
  failed: number;
  byChannel: Record<string, number>;
  byLevel: Record<string, number>;
}> {
  try {
    const stats = await sql`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'sent') as sent,
        COUNT(*) FILTER (WHERE status = 'failed') as failed,
        json_object_agg(channel, channel_count) as "byChannel",
        json_object_agg(alert_level, level_count) as "byLevel"
      FROM (
        SELECT
          channel,
          alert_level,
          status,
          COUNT(*) OVER (PARTITION BY channel) as channel_count,
          COUNT(*) OVER (PARTITION BY alert_level) as level_count
        FROM notification_logs
        WHERE user_id = ${userId}
          AND created_at > NOW() - INTERVAL '30 days'
      ) subquery
    `;

    if (stats.length === 0) {
      return {
        total: 0,
        sent: 0,
        failed: 0,
        byChannel: {},
        byLevel: {},
      };
    }

    return stats[0] as any;
  } catch (error) {
    console.error("[Notifications] Error fetching stats:", error);
    return {
      total: 0,
      sent: 0,
      failed: 0,
      byChannel: {},
      byLevel: {},
    };
  }
}

/**
 * Batch send notifications (for digest emails or summaries)
 */
export async function sendBatchNotifications(
  userId: string,
  notifications: NotificationPayload[]
): Promise<NotificationResult[]> {
  // Group by channel preference
  const configs = await getUserNotificationConfigs(userId, "info");

  const results: NotificationResult[] = [];

  for (const config of configs) {
    if (config.channel === "email") {
      // Send digest email compiling all notifications into a single summary
      if (config.emailAddress) {
        const result = await sendDigestEmail(
          config.emailAddress,
          notifications
        );
        results.push(result);
      }
    } else if (config.channel === "slack") {
      // Send summary to Slack
      const { sendSlackAlertSummary } = await import("./slack");
      if (config.webhookUrl) {
        const result = await sendSlackAlertSummary(
          config.webhookUrl,
          notifications
        );
        results.push(result);
      }
    }
  }

  return results;
}

// Re-export types for convenience
export * from "./types";
export * from "./validators";

// Re-export service utilities
export {
  NotificationService,
  getNotificationService,
  resetNotificationService,
  sendAlert,
  sendCriticalAlert,
  sendWarningAlert,
  sendInfoNotification,
  sendPerformanceAlert,
  sendErrorAlert,
  sendSignificanceNotification,
  sendWinnerNotification,
} from "./service";
