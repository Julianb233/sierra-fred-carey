/**
 * Monitoring Alerts Service
 * Integrates with notification system to send alerts based on monitoring thresholds
 */

import { sendNotification } from '@/lib/notifications';
import { AlertLevel, AlertType } from '@/lib/notifications/types';
import { logger } from "@/lib/logger";

/**
 * Alert Thresholds Configuration
 */
export interface AlertThresholds {
  performance: {
    p95LatencyMs: number;
    p99LatencyMs: number;
    errorRate: number;
  };
  traffic: {
    requestsPerSecond: number;
    trafficIncreasePercent: number;
  };
  errors: {
    errorRate: number;
    errorCount: number;
  };
}

/**
 * Default alert thresholds
 */
const DEFAULT_THRESHOLDS: AlertThresholds = {
  performance: {
    p95LatencyMs: 500,
    p99LatencyMs: 1000,
    errorRate: 2.0,
  },
  traffic: {
    requestsPerSecond: 1000,
    trafficIncreasePercent: 150,
  },
  errors: {
    errorRate: 5.0,
    errorCount: 100,
  },
};

/**
 * Send performance alert
 */
export async function sendPerformanceAlert(
  userId: string,
  metric: string,
  value: number,
  threshold: number,
  metadata?: Record<string, unknown>
) {
  const level: AlertLevel = value > threshold * 2 ? 'critical' : 'warning';

  await sendNotification({
    userId,
    level,
    type: 'performance',
    title: `Performance Degradation: ${metric}`,
    message: `${metric} has exceeded threshold. Current value: ${value}, Threshold: ${threshold}`,
    metric,
    value,
    threshold,
    metadata: {
      ...metadata,
      detectedAt: new Date().toISOString(),
    },
  });
}

/**
 * Send error rate alert
 */
export async function sendErrorRateAlert(
  userId: string,
  errorRate: number,
  errorCount: number,
  totalRequests: number,
  experimentName?: string,
  variantName?: string
) {
  const threshold = DEFAULT_THRESHOLDS.errors.errorRate;
  const level: AlertLevel = errorRate > threshold * 2 ? 'critical' : 'warning';

  await sendNotification({
    userId,
    level,
    type: 'errors',
    title: `${level === 'critical' ? '🚨 ' : ''}High Error Rate Detected`,
    message: `Error rate spiked to ${errorRate.toFixed(2)}% (${errorCount} errors out of ${totalRequests} requests)`,
    experimentName,
    variantName,
    metric: 'error_rate',
    value: errorRate,
    threshold,
    metadata: {
      errorCount,
      totalRequests,
      detectedAt: new Date().toISOString(),
    },
  });
}

/**
 * Send traffic spike alert
 */
export async function sendTrafficSpikeAlert(
  userId: string,
  currentRps: number,
  baselineRps: number,
  increasePercent: number
) {
  const threshold = DEFAULT_THRESHOLDS.traffic.requestsPerSecond;
  const level: AlertLevel = currentRps > threshold * 2 ? 'critical' : 'warning';

  await sendNotification({
    userId,
    level,
    type: 'traffic',
    title: 'Unusual Traffic Pattern Detected',
    message: `Traffic increased by ${increasePercent.toFixed(1)}% from baseline (${baselineRps} → ${currentRps} req/s)`,
    metric: 'requests_per_second',
    value: currentRps,
    threshold,
    metadata: {
      baselineRps,
      increasePercent,
      detectedAt: new Date().toISOString(),
    },
  });
}

/**
 * Send experiment significance alert
 */
export async function sendSignificanceAlert(
  userId: string,
  experimentName: string,
  variantName: string,
  metric: string,
  value: number,
  controlValue: number,
  improvement: number,
  confidence: number
) {
  await sendNotification({
    userId,
    level: 'info',
    type: 'significance',
    title: '📊 Experiment Reached Statistical Significance',
    message: `${variantName} shows ${improvement.toFixed(1)}% ${improvement > 0 ? 'improvement' : 'decrease'} in ${metric} (${confidence * 100}% confidence)`,
    experimentName,
    variantName,
    metric,
    value,
    threshold: controlValue,
    metadata: {
      improvement,
      confidence,
      reachedAt: new Date().toISOString(),
    },
  });
}

/**
 * Check performance metrics and send alerts if thresholds exceeded
 */
export async function checkPerformanceMetrics(
  userId: string,
  metrics: {
    p95Latency?: number;
    p99Latency?: number;
    errorRate?: number;
  },
  thresholds: AlertThresholds = DEFAULT_THRESHOLDS
) {
  const alerts: Promise<void>[] = [];

  if (metrics.p95Latency && metrics.p95Latency > thresholds.performance.p95LatencyMs) {
    alerts.push(
      sendPerformanceAlert(
        userId,
        'p95_latency_ms',
        metrics.p95Latency,
        thresholds.performance.p95LatencyMs,
        { percentile: 95 }
      )
    );
  }

  if (metrics.p99Latency && metrics.p99Latency > thresholds.performance.p99LatencyMs) {
    alerts.push(
      sendPerformanceAlert(
        userId,
        'p99_latency_ms',
        metrics.p99Latency,
        thresholds.performance.p99LatencyMs,
        { percentile: 99 }
      )
    );
  }

  if (metrics.errorRate && metrics.errorRate > thresholds.performance.errorRate) {
    alerts.push(
      sendPerformanceAlert(
        userId,
        'error_rate',
        metrics.errorRate,
        thresholds.performance.errorRate
      )
    );
  }

  await Promise.all(alerts);
}

/**
 * Monitor experiment metrics and send alerts
 */
export async function monitorExperimentMetrics(
  userId: string,
  experimentName: string,
  variants: Array<{
    name: string;
    metrics: {
      errorRate?: number;
      errorCount?: number;
      totalRequests?: number;
      conversionRate?: number;
      latency?: number;
    };
  }>,
  thresholds: AlertThresholds = DEFAULT_THRESHOLDS
) {
  const alerts: Promise<void>[] = [];

  for (const variant of variants) {
    const { name, metrics } = variant;

    // Check error rate
    if (
      metrics.errorRate &&
      metrics.errorCount &&
      metrics.totalRequests &&
      metrics.errorRate > thresholds.errors.errorRate
    ) {
      alerts.push(
        sendErrorRateAlert(
          userId,
          metrics.errorRate,
          metrics.errorCount,
          metrics.totalRequests,
          experimentName,
          name
        )
      );
    }

    // Check latency
    if (metrics.latency && metrics.latency > thresholds.performance.p95LatencyMs) {
      alerts.push(
        sendPerformanceAlert(
          userId,
          'latency_ms',
          metrics.latency,
          thresholds.performance.p95LatencyMs,
          {
            experimentName,
            variantName: name,
          }
        )
      );
    }
  }

  await Promise.all(alerts);
}

/**
 * Example: Monitoring Loop
 *
 * This would typically run as a background job or cron task
 */
export async function runMonitoringCheck(userId: string) {
  try {
    // Example: Fetch current metrics from your monitoring system
    const currentMetrics = {
      p95Latency: 650, // ms
      p99Latency: 1200, // ms
      errorRate: 3.5, // %
      requestsPerSecond: 1500,
    };

    // Example: Fetch baseline metrics
    const baselineMetrics = {
      requestsPerSecond: 800,
    };

    // Check performance
    await checkPerformanceMetrics(userId, currentMetrics);

    // Check traffic
    const increasePercent =
      ((currentMetrics.requestsPerSecond - baselineMetrics.requestsPerSecond) /
        baselineMetrics.requestsPerSecond) *
      100;

    if (increasePercent > DEFAULT_THRESHOLDS.traffic.trafficIncreasePercent) {
      await sendTrafficSpikeAlert(
        userId,
        currentMetrics.requestsPerSecond,
        baselineMetrics.requestsPerSecond,
        increasePercent
      );
    }

    logger.log('[Monitoring] Check completed successfully');
  } catch (error) {
    console.error('[Monitoring] Error during monitoring check:', error);
  }
}

/**
 * Helper: Determine alert level based on severity
 */
export function determineAlertLevel(
  value: number,
  threshold: number,
  criticalMultiplier: number = 2
): AlertLevel {
  if (value > threshold * criticalMultiplier) {
    return 'critical';
  } else if (value > threshold) {
    return 'warning';
  }
  return 'info';
}

/**
 * Helper: Format metric value with units
 */
export function formatMetricValue(metric: string, value: number): string {
  const lowerMetric = metric.toLowerCase();

  if (lowerMetric.includes('latency') || lowerMetric.includes('ms')) {
    return `${value.toFixed(0)}ms`;
  } else if (lowerMetric.includes('rate') || lowerMetric.includes('percent')) {
    return `${value.toFixed(2)}%`;
  } else if (lowerMetric.includes('rps') || lowerMetric.includes('per_second')) {
    return `${value.toFixed(0)} req/s`;
  }

  return value.toString();
}
