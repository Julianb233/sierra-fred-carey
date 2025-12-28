/**
 * Notification System Usage Examples
 * Real-world examples demonstrating notification patterns
 */

import { sendNotification } from './index';
import { sendSlackNotification } from './slack';
import { sendPagerDutyNotification } from './pagerduty';
import type { NotificationPayload, AlertLevel } from './types';

/**
 * Example 1: Send critical alert to all configured channels
 */
export async function notifyCriticalError(
  userId: string,
  error: Error,
  context?: Record<string, any>
) {
  const payload: NotificationPayload = {
    userId,
    level: 'critical',
    type: 'errors',
    title: 'Critical Error Detected',
    message: `Application encountered a critical error: ${error.message}`,
    metadata: {
      errorName: error.name,
      errorStack: error.stack,
      timestamp: new Date().toISOString(),
      ...context,
    },
  };

  const results = await sendNotification(payload);
  return results;
}

/**
 * Example 2: Send performance degradation warning
 */
export async function notifyPerformanceDegradation(
  userId: string,
  metric: string,
  currentValue: number,
  threshold: number,
  experimentName?: string
) {
  const payload: NotificationPayload = {
    userId,
    level: 'warning',
    type: 'performance',
    title: 'Performance Degradation Detected',
    message: `${metric} has exceeded threshold`,
    experimentName,
    metric,
    value: currentValue,
    threshold,
    metadata: {
      percentageOverThreshold: ((currentValue - threshold) / threshold) * 100,
      timestamp: new Date().toISOString(),
    },
  };

  return await sendNotification(payload);
}

/**
 * Example 3: Send experiment significance notification
 */
export async function notifyExperimentSignificance(
  userId: string,
  experimentName: string,
  variantName: string,
  metric: string,
  lift: number,
  pValue: number
) {
  const payload: NotificationPayload = {
    userId,
    level: 'info',
    type: 'significance',
    title: 'Experiment Reached Significance',
    message: `${experimentName} (${variantName}) showed significant improvement in ${metric}`,
    experimentName,
    variantName,
    metric,
    value: lift,
    metadata: {
      pValue,
      significance: pValue < 0.01 ? 'high' : 'medium',
      timestamp: new Date().toISOString(),
    },
  };

  return await sendNotification(payload);
}

/**
 * Example 4: Send traffic spike alert
 */
export async function notifyTrafficSpike(
  userId: string,
  currentTraffic: number,
  normalTraffic: number,
  source?: string
) {
  const percentageIncrease =
    ((currentTraffic - normalTraffic) / normalTraffic) * 100;
  const level: AlertLevel =
    percentageIncrease > 200
      ? 'critical'
      : percentageIncrease > 100
        ? 'warning'
        : 'info';

  const payload: NotificationPayload = {
    userId,
    level,
    type: 'traffic',
    title: 'Traffic Spike Detected',
    message: `Traffic increased by ${percentageIncrease.toFixed(1)}% (${currentTraffic} vs ${normalTraffic} requests/min)`,
    metric: 'requests_per_minute',
    value: currentTraffic,
    threshold: normalTraffic,
    metadata: {
      source: source || 'unknown',
      percentageIncrease,
      timestamp: new Date().toISOString(),
    },
  };

  return await sendNotification(payload);
}

/**
 * Example 5: Direct Slack notification with custom formatting
 */
export async function sendCustomSlackAlert(
  webhookUrl: string,
  title: string,
  message: string,
  fields?: Record<string, string | number>
) {
  const payload: NotificationPayload = {
    userId: 'custom',
    level: 'info',
    type: 'significance',
    title,
    message,
    metadata: fields,
  };

  return await sendSlackNotification(webhookUrl, payload);
}

/**
 * Example 6: Create PagerDuty incident for database issues
 */
export async function notifyDatabaseIssue(
  routingKey: string,
  database: string,
  issue: string,
  severity: 'info' | 'warning' | 'critical'
) {
  const payload: NotificationPayload = {
    userId: 'system',
    level: severity,
    type: 'performance',
    title: `Database Issue: ${database}`,
    message: issue,
    metadata: {
      database,
      timestamp: new Date().toISOString(),
    },
  };

  return await sendPagerDutyNotification(routingKey, payload);
}

/**
 * Example 7: Monitor API endpoint health
 */
export async function monitorEndpointHealth(
  userId: string,
  endpoint: string,
  statusCode: number,
  responseTime: number,
  errorRate: number
) {
  // Determine severity based on metrics
  let level: AlertLevel = 'info';
  const issues: string[] = [];

  if (statusCode >= 500) {
    level = 'critical';
    issues.push(`5xx errors (status: ${statusCode})`);
  } else if (statusCode >= 400) {
    level = 'warning';
    issues.push(`4xx errors (status: ${statusCode})`);
  }

  if (responseTime > 2000) {
    level = level === 'info' ? 'warning' : level;
    issues.push(`high latency (${responseTime}ms)`);
  }

  if (errorRate > 5) {
    level = 'critical';
    issues.push(`error rate ${errorRate.toFixed(2)}%`);
  }

  if (issues.length === 0) {
    return null; // No issues, don't send notification
  }

  const payload: NotificationPayload = {
    userId,
    level,
    type: 'errors',
    title: `API Health Alert: ${endpoint}`,
    message: `Endpoint health degraded: ${issues.join(', ')}`,
    metric: 'endpoint_health',
    value: errorRate,
    threshold: 5.0,
    metadata: {
      endpoint,
      statusCode,
      responseTime,
      errorRate,
      timestamp: new Date().toISOString(),
    },
  };

  return await sendNotification(payload);
}

/**
 * Example 8: Batch notification for multiple issues
 */
export async function sendBatchNotifications(
  userId: string,
  issues: Array<{
    type: 'error' | 'warning' | 'info';
    message: string;
    metric?: string;
    value?: number;
  }>
) {
  // Group by severity
  const critical = issues.filter((i) => i.type === 'error');
  const warnings = issues.filter((i) => i.type === 'warning');
  const info = issues.filter((i) => i.type === 'info');

  const results = [];

  // Send critical issues immediately
  if (critical.length > 0) {
    const payload: NotificationPayload = {
      userId,
      level: 'critical',
      type: 'errors',
      title: `${critical.length} Critical Issues Detected`,
      message: critical.map((i) => `• ${i.message}`).join('\n'),
      metadata: {
        count: critical.length,
        issues: critical,
        timestamp: new Date().toISOString(),
      },
    };
    results.push(await sendNotification(payload));
  }

  // Batch warnings
  if (warnings.length > 0) {
    const payload: NotificationPayload = {
      userId,
      level: 'warning',
      type: 'performance',
      title: `${warnings.length} Warnings`,
      message: warnings.map((i) => `• ${i.message}`).join('\n'),
      metadata: {
        count: warnings.length,
        issues: warnings,
        timestamp: new Date().toISOString(),
      },
    };
    results.push(await sendNotification(payload));
  }

  return results;
}

/**
 * Example 9: Scheduled health check notification
 */
export async function sendHealthCheckSummary(
  userId: string,
  services: Array<{
    name: string;
    status: 'healthy' | 'degraded' | 'down';
    uptime: number;
    lastCheck: Date;
  }>
) {
  const down = services.filter((s) => s.status === 'down');
  const degraded = services.filter((s) => s.status === 'degraded');
  const healthy = services.filter((s) => s.status === 'healthy');

  const level: AlertLevel =
    down.length > 0 ? 'critical' : degraded.length > 0 ? 'warning' : 'info';

  const payload: NotificationPayload = {
    userId,
    level,
    type: 'traffic',
    title: 'System Health Check',
    message: `${healthy.length} healthy, ${degraded.length} degraded, ${down.length} down`,
    metadata: {
      services: {
        healthy: healthy.map((s) => s.name),
        degraded: degraded.map((s) => s.name),
        down: down.map((s) => s.name),
      },
      timestamp: new Date().toISOString(),
    },
  };

  return await sendNotification(payload);
}

/**
 * Example 10: Rate-limited notification with deduplication
 */
const notificationCache = new Map<string, number>();
const RATE_LIMIT_MS = 5 * 60 * 1000; // 5 minutes

export async function sendRateLimitedNotification(
  userId: string,
  dedupKey: string,
  payload: Omit<NotificationPayload, 'userId'>
) {
  const cacheKey = `${userId}:${dedupKey}`;
  const lastSent = notificationCache.get(cacheKey);
  const now = Date.now();

  // Skip if sent recently
  if (lastSent && now - lastSent < RATE_LIMIT_MS) {
    console.log(`[Notification] Rate limited: ${cacheKey}`);
    return null;
  }

  // Send notification
  const result = await sendNotification({
    ...payload,
    userId,
  });

  // Update cache
  notificationCache.set(cacheKey, now);

  // Clean up old entries
  for (const [key, timestamp] of notificationCache.entries()) {
    if (now - timestamp > RATE_LIMIT_MS) {
      notificationCache.delete(key);
    }
  }

  return result;
}
