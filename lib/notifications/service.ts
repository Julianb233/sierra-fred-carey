/**
 * Notification Service
 *
 * High-level notification service that provides a unified interface
 * for sending alerts to multiple channels with intelligent routing,
 * retry logic, and integration with the monitoring system.
 */

import { logger } from "@/lib/logger";
import { sendNotification, sendBatchNotifications } from "./index";
import { sendSlackNotification, testSlackWebhook } from "./slack";
import { sendEmailNotification, testEmailNotification } from "./email";
import { sendPagerDutyNotification, testPagerDutyIntegration, resolvePagerDutyIncident } from "./pagerduty";
import { validateNotificationPayload, sanitizePayload } from "./validators";
import type {
  NotificationPayload,
  NotificationResult,
  AlertLevel,
  AlertType,
  NotificationChannel,
} from "./types";

/**
 * Notification Service Configuration
 */
export interface NotificationServiceConfig {
  /** Enable/disable notifications globally */
  enabled: boolean;
  /** Default channels to send to if not specified */
  defaultChannels: NotificationChannel[];
  /** Retry configuration */
  retry: {
    enabled: boolean;
    maxRetries: number;
    delayMs: number;
  };
  /** Channel-specific configurations */
  channels: {
    slack?: {
      webhookUrl: string;
      enabled: boolean;
    };
    email?: {
      toAddress: string;
      enabled: boolean;
    };
    pagerduty?: {
      routingKey: string;
      enabled: boolean;
    };
  };
}

/**
 * Default service configuration
 */
const DEFAULT_CONFIG: NotificationServiceConfig = {
  enabled: true,
  defaultChannels: ["slack", "email"],
  retry: {
    enabled: true,
    maxRetries: 3,
    delayMs: 1000,
  },
  channels: {},
};

/**
 * Notification Service Class
 * Provides a stateful interface for managing notifications
 */
export class NotificationService {
  private config: NotificationServiceConfig;
  private pendingNotifications: Map<string, NotificationPayload[]>;

  constructor(config: Partial<NotificationServiceConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.pendingNotifications = new Map();
  }

  /**
   * Send a notification to all configured channels
   */
  async send(payload: NotificationPayload): Promise<NotificationResult[]> {
    if (!this.config.enabled) {
      logger.log("[NotificationService] Notifications disabled");
      return [];
    }

    // Validate and sanitize payload
    const validation = validateNotificationPayload(payload);
    if (!validation.valid) {
      console.error("[NotificationService] Invalid payload:", validation.errors);
      throw new Error(`Invalid notification payload: ${validation.errors.join(", ")}`);
    }

    // Send through the main notification dispatcher
    return sendNotification(payload);
  }

  /**
   * Send directly to Slack
   */
  async sendToSlack(
    webhookUrl: string,
    payload: NotificationPayload
  ): Promise<NotificationResult> {
    const sanitized = sanitizePayload(payload);
    return this.withRetry(() => sendSlackNotification(webhookUrl, sanitized));
  }

  /**
   * Send directly to Email via Resend
   */
  async sendToEmail(
    toAddress: string,
    payload: NotificationPayload
  ): Promise<NotificationResult> {
    const sanitized = sanitizePayload(payload);
    return this.withRetry(() => sendEmailNotification(toAddress, sanitized));
  }

  /**
   * Send directly to PagerDuty
   */
  async sendToPagerDuty(
    routingKey: string,
    payload: NotificationPayload
  ): Promise<NotificationResult> {
    const sanitized = sanitizePayload(payload);
    return this.withRetry(() => sendPagerDutyNotification(routingKey, sanitized));
  }

  /**
   * Resolve a PagerDuty incident
   */
  async resolvePagerDutyIncident(
    routingKey: string,
    dedupKey: string
  ): Promise<NotificationResult> {
    return resolvePagerDutyIncident(routingKey, dedupKey);
  }

  /**
   * Send notifications to multiple channels directly
   */
  async sendToChannels(
    channels: {
      slack?: { webhookUrl: string };
      email?: { toAddress: string };
      pagerduty?: { routingKey: string };
    },
    payload: NotificationPayload
  ): Promise<NotificationResult[]> {
    const sanitized = sanitizePayload(payload);
    const results: Promise<NotificationResult>[] = [];

    if (channels.slack?.webhookUrl) {
      results.push(this.sendToSlack(channels.slack.webhookUrl, sanitized));
    }

    if (channels.email?.toAddress) {
      results.push(this.sendToEmail(channels.email.toAddress, sanitized));
    }

    if (channels.pagerduty?.routingKey) {
      results.push(this.sendToPagerDuty(channels.pagerduty.routingKey, sanitized));
    }

    return Promise.all(results);
  }

  /**
   * Send a batch of notifications
   */
  async sendBatch(
    userId: string,
    notifications: NotificationPayload[]
  ): Promise<NotificationResult[]> {
    if (!this.config.enabled) {
      return [];
    }

    return sendBatchNotifications(userId, notifications);
  }

  /**
   * Queue a notification for later batch sending
   */
  queueNotification(userId: string, payload: NotificationPayload): void {
    const existing = this.pendingNotifications.get(userId) || [];
    existing.push(payload);
    this.pendingNotifications.set(userId, existing);
  }

  /**
   * Flush queued notifications for a user
   */
  async flushQueue(userId: string): Promise<NotificationResult[]> {
    const notifications = this.pendingNotifications.get(userId) || [];
    this.pendingNotifications.delete(userId);

    if (notifications.length === 0) {
      return [];
    }

    return this.sendBatch(userId, notifications);
  }

  /**
   * Flush all queued notifications
   */
  async flushAllQueues(): Promise<Map<string, NotificationResult[]>> {
    const results = new Map<string, NotificationResult[]>();

    for (const userId of this.pendingNotifications.keys()) {
      const result = await this.flushQueue(userId);
      results.set(userId, result);
    }

    return results;
  }

  /**
   * Test notification configurations
   */
  async testChannels(channels: {
    slack?: string;
    email?: string;
    pagerduty?: string;
  }): Promise<Record<string, NotificationResult>> {
    const results: Record<string, NotificationResult> = {};

    if (channels.slack) {
      results.slack = await testSlackWebhook(channels.slack);
    }

    if (channels.email) {
      results.email = await testEmailNotification(channels.email);
    }

    if (channels.pagerduty) {
      results.pagerduty = await testPagerDutyIntegration(channels.pagerduty);
    }

    return results;
  }

  /**
   * Update service configuration
   */
  configure(config: Partial<NotificationServiceConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Enable/disable the service
   */
  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
  }

  /**
   * Get current configuration
   */
  getConfig(): NotificationServiceConfig {
    return { ...this.config };
  }

  /**
   * Retry wrapper with exponential backoff
   */
  private async withRetry(
    fn: () => Promise<NotificationResult>,
    retries = this.config.retry.maxRetries,
    delay = this.config.retry.delayMs
  ): Promise<NotificationResult> {
    if (!this.config.retry.enabled) {
      return fn();
    }

    try {
      const result = await fn();
      if (result.success) {
        return result;
      }

      // Retry on failure
      if (retries > 0) {
        logger.log(`[NotificationService] Retrying... (${retries} attempts left)`);
        await this.delay(delay);
        return this.withRetry(fn, retries - 1, delay * 2);
      }

      return result;
    } catch (error: any) {
      if (retries > 0) {
        logger.log(`[NotificationService] Error, retrying... (${retries} attempts left)`);
        await this.delay(delay);
        return this.withRetry(fn, retries - 1, delay * 2);
      }

      return {
        success: false,
        channel: "slack" as NotificationChannel,
        error: error.message,
        timestamp: new Date(),
      };
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Convenience functions for quick notification sending
 */

/**
 * Send an alert notification
 */
export async function sendAlert(
  userId: string,
  level: AlertLevel,
  type: AlertType,
  title: string,
  message: string,
  options: {
    experimentName?: string;
    variantName?: string;
    metric?: string;
    value?: number;
    threshold?: number;
    metadata?: Record<string, any>;
  } = {}
): Promise<NotificationResult[]> {
  const payload: NotificationPayload = {
    userId,
    level,
    type,
    title,
    message,
    ...options,
  };

  return sendNotification(payload);
}

/**
 * Send a critical alert
 */
export async function sendCriticalAlert(
  userId: string,
  type: AlertType,
  title: string,
  message: string,
  options: {
    experimentName?: string;
    variantName?: string;
    metric?: string;
    value?: number;
    threshold?: number;
    metadata?: Record<string, any>;
  } = {}
): Promise<NotificationResult[]> {
  return sendAlert(userId, "critical", type, title, message, options);
}

/**
 * Send a warning alert
 */
export async function sendWarningAlert(
  userId: string,
  type: AlertType,
  title: string,
  message: string,
  options: {
    experimentName?: string;
    variantName?: string;
    metric?: string;
    value?: number;
    threshold?: number;
    metadata?: Record<string, any>;
  } = {}
): Promise<NotificationResult[]> {
  return sendAlert(userId, "warning", type, title, message, options);
}

/**
 * Send an info notification
 */
export async function sendInfoNotification(
  userId: string,
  type: AlertType,
  title: string,
  message: string,
  options: {
    experimentName?: string;
    variantName?: string;
    metric?: string;
    value?: number;
    threshold?: number;
    metadata?: Record<string, any>;
  } = {}
): Promise<NotificationResult[]> {
  return sendAlert(userId, "info", type, title, message, options);
}

/**
 * Send a performance alert
 */
export async function sendPerformanceAlert(
  userId: string,
  level: AlertLevel,
  metric: string,
  currentValue: number,
  threshold: number,
  options: {
    experimentName?: string;
    variantName?: string;
    metadata?: Record<string, any>;
  } = {}
): Promise<NotificationResult[]> {
  const title = `Performance Alert: ${metric}`;
  const message = `${metric} has ${currentValue > threshold ? "exceeded" : "fallen below"} threshold. Current: ${currentValue}, Threshold: ${threshold}`;

  return sendAlert(userId, level, "performance", title, message, {
    metric,
    value: currentValue,
    threshold,
    ...options,
  });
}

/**
 * Send an error rate alert
 */
export async function sendErrorAlert(
  userId: string,
  level: AlertLevel,
  errorRate: number,
  errorCount: number,
  totalRequests: number,
  options: {
    experimentName?: string;
    variantName?: string;
    metadata?: Record<string, any>;
  } = {}
): Promise<NotificationResult[]> {
  const title = level === "critical" ? "Critical Error Rate Alert" : "Error Rate Alert";
  const message = `Error rate: ${errorRate.toFixed(2)}% (${errorCount} errors / ${totalRequests} requests)`;

  return sendAlert(userId, level, "errors", title, message, {
    metric: "error_rate",
    value: errorRate,
    metadata: {
      errorCount,
      totalRequests,
      ...options.metadata,
    },
    ...options,
  });
}

/**
 * Send a significance reached notification
 */
export async function sendSignificanceNotification(
  userId: string,
  experimentName: string,
  variantName: string,
  metric: string,
  improvement: number,
  confidence: number,
  options: {
    metadata?: Record<string, any>;
  } = {}
): Promise<NotificationResult[]> {
  const title = "Experiment Reached Statistical Significance";
  const message = `${variantName} shows ${improvement.toFixed(1)}% ${improvement > 0 ? "improvement" : "decline"} in ${metric} with ${(confidence * 100).toFixed(1)}% confidence`;

  return sendAlert(userId, "info", "significance", title, message, {
    experimentName,
    variantName,
    metric,
    value: improvement,
    threshold: confidence,
    ...options,
  });
}

/**
 * Send a winner notification
 */
export async function sendWinnerNotification(
  userId: string,
  experimentName: string,
  winnerVariant: string,
  improvement: number,
  options: {
    metric?: string;
    metadata?: Record<string, any>;
  } = {}
): Promise<NotificationResult[]> {
  const title = "Winner Detected";
  const message = `${winnerVariant} is the winner for ${experimentName} with ${improvement.toFixed(1)}% improvement`;

  return sendAlert(userId, "info", "winner", title, message, {
    experimentName,
    variantName: winnerVariant,
    value: improvement,
    ...options,
  });
}

/**
 * Create a singleton instance for convenience
 */
let defaultServiceInstance: NotificationService | null = null;

export function getNotificationService(): NotificationService {
  if (!defaultServiceInstance) {
    defaultServiceInstance = new NotificationService();
  }
  return defaultServiceInstance;
}

/**
 * Reset the default service instance (useful for testing)
 */
export function resetNotificationService(): void {
  defaultServiceInstance = null;
}

// Export the class as default for direct instantiation
export default NotificationService;
