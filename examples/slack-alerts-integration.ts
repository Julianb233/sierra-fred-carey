/**
 * Slack Alerts Integration Examples
 *
 * This file demonstrates various ways to integrate Slack notifications
 * into your application for monitoring and alerting.
 */

import { sendNotification } from '@/lib/notifications';
import { sendSlackNotification } from '@/lib/notifications/slack';
import {
  sendPerformanceAlert,
  sendErrorRateAlert,
  sendTrafficSpikeAlert,
  sendSignificanceAlert,
  checkPerformanceMetrics,
  monitorExperimentMetrics,
} from '@/lib/monitoring/alerts';

// ============================================
// Example 1: Simple Alert
// ============================================

export async function example1_SimpleAlert() {
  await sendNotification({
    userId: 'user123',
    level: 'info',
    type: 'significance',
    title: 'Test Alert',
    message: 'This is a simple test alert to verify Slack integration',
  });
}

// ============================================
// Example 2: Performance Alert with Metrics
// ============================================

export async function example2_PerformanceAlert() {
  await sendNotification({
    userId: 'user123',
    level: 'warning',
    type: 'performance',
    title: 'API Latency Increased',
    message: 'P95 latency has exceeded threshold in the payment service',
    metric: 'p95_latency_ms',
    value: 850,
    threshold: 500,
    metadata: {
      service: 'payment-api',
      region: 'us-east-1',
      endpoint: '/api/process-payment',
    },
  });
}

// ============================================
// Example 3: Error Rate Alert for Experiment
// ============================================

export async function example3_ExperimentErrorAlert() {
  await sendNotification({
    userId: 'user123',
    level: 'critical',
    type: 'errors',
    title: '🚨 High Error Rate in Experiment',
    message: 'Error rate in variant-b has exceeded critical threshold',
    experimentName: 'checkout-flow-redesign',
    variantName: 'variant-b',
    metric: 'error_rate',
    value: 8.5,
    threshold: 2.0,
    metadata: {
      errorCount: 342,
      totalRequests: 4024,
      topError: '500 Internal Server Error',
      affectedUsers: 256,
    },
  });
}

// ============================================
// Example 4: Experiment Significance Reached
// ============================================

export async function example4_SignificanceAlert() {
  await sendNotification({
    userId: 'user123',
    level: 'info',
    type: 'significance',
    title: '📊 Experiment Results Are In!',
    message: 'Variant B shows statistically significant 15% improvement in conversion rate',
    experimentName: 'homepage-hero-redesign',
    variantName: 'variant-b',
    metric: 'conversion_rate',
    value: 4.6,
    threshold: 4.0, // control value
    metadata: {
      improvement: 15,
      confidence: 0.95,
      sampleSize: 10000,
      pValue: 0.003,
    },
  });
}

// ============================================
// Example 5: Traffic Spike Alert
// ============================================

export async function example5_TrafficSpikeAlert() {
  await sendNotification({
    userId: 'user123',
    level: 'warning',
    type: 'traffic',
    title: 'Unusual Traffic Pattern Detected',
    message: 'Traffic has increased by 250% from baseline in the last 10 minutes',
    metric: 'requests_per_second',
    value: 2800,
    threshold: 800,
    metadata: {
      baselineRps: 800,
      increasePercent: 250,
      source: 'unknown',
      possibleCause: 'Potential bot traffic or viral content',
    },
  });
}

// ============================================
// Example 6: Using Monitoring Helper Functions
// ============================================

export async function example6_MonitoringHelpers() {
  const userId = 'user123';

  // Send performance alert
  await sendPerformanceAlert(userId, 'p95_latency_ms', 750, 500, {
    service: 'api',
  });

  // Send error rate alert
  await sendErrorRateAlert(
    userId,
    6.5, // error rate %
    130, // error count
    2000, // total requests
    'checkout-flow',
    'variant-a'
  );

  // Send traffic spike alert
  await sendTrafficSpikeAlert(
    userId,
    1500, // current rps
    600, // baseline rps
    150 // increase %
  );

  // Send significance alert
  await sendSignificanceAlert(
    userId,
    'pricing-page-test',
    'variant-b',
    'conversion_rate',
    5.2, // variant value
    4.5, // control value
    15.6, // improvement %
    0.95 // confidence
  );
}

// ============================================
// Example 7: Automated Performance Monitoring
// ============================================

export async function example7_AutomatedMonitoring() {
  const userId = 'user123';

  // Simulated metrics from your monitoring system
  const currentMetrics = {
    p95Latency: 650,
    p99Latency: 1100,
    errorRate: 3.2,
  };

  // Check metrics and send alerts automatically if thresholds exceeded
  await checkPerformanceMetrics(userId, currentMetrics);
}

// ============================================
// Example 8: Experiment Monitoring
// ============================================

export async function example8_ExperimentMonitoring() {
  const userId = 'user123';

  const variants = [
    {
      name: 'control',
      metrics: {
        errorRate: 1.8,
        errorCount: 36,
        totalRequests: 2000,
        latency: 420,
      },
    },
    {
      name: 'variant-a',
      metrics: {
        errorRate: 2.1,
        errorCount: 42,
        totalRequests: 2000,
        latency: 480,
      },
    },
    {
      name: 'variant-b',
      metrics: {
        errorRate: 6.5, // Will trigger alert!
        errorCount: 130,
        totalRequests: 2000,
        latency: 550, // Will trigger alert!
      },
    },
  ];

  // Monitor all variants and send alerts if any exceed thresholds
  await monitorExperimentMetrics(userId, 'checkout-optimization', variants);
}

// ============================================
// Example 9: Direct Webhook (No Database)
// ============================================

export async function example9_DirectWebhook() {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL!;

  if (!webhookUrl) {
    throw new Error('SLACK_WEBHOOK_URL not configured');
  }

  await sendSlackNotification(webhookUrl, {
    userId: 'api',
    level: 'info',
    type: 'significance',
    title: 'Direct Webhook Test',
    message: 'This message is sent directly to Slack without database logging',
    metadata: {
      source: 'script',
      timestamp: new Date().toISOString(),
    },
  });
}

// ============================================
// Example 10: Custom Notification with Rich Metadata
// ============================================

export async function example10_RichMetadata() {
  await sendNotification({
    userId: 'user123',
    level: 'critical',
    type: 'errors',
    title: '🚨 Database Connection Pool Exhausted',
    message: 'All database connections are in use. New requests are being rejected.',
    metric: 'db_connection_pool_usage',
    value: 100,
    threshold: 80,
    metadata: {
      poolSize: 20,
      activeConnections: 20,
      queuedRequests: 47,
      avgWaitTime: 5200,
      topQueries: [
        { query: 'SELECT * FROM users WHERE...', count: 12 },
        { query: 'UPDATE experiments SET...', count: 8 },
      ],
      recommendedAction: 'Increase pool size or investigate slow queries',
      runbook: 'https://docs.company.com/runbooks/db-pool-exhausted',
    },
  });
}

// ============================================
// Example 11: Batch Alerts for Multiple Issues
// ============================================

export async function example11_BatchAlerts() {
  const userId = 'user123';

  const alerts = [
    sendNotification({
      userId,
      level: 'warning',
      type: 'performance',
      title: 'Cache Hit Rate Degraded',
      message: 'Redis cache hit rate dropped below 80%',
      metric: 'cache_hit_rate',
      value: 72,
      threshold: 80,
    }),
    sendNotification({
      userId,
      level: 'warning',
      type: 'performance',
      title: 'Database Query Time Increased',
      message: 'Average query time increased by 45%',
      metric: 'avg_query_time_ms',
      value: 145,
      threshold: 100,
    }),
    sendNotification({
      userId,
      level: 'info',
      type: 'traffic',
      title: 'Peak Traffic Hour Starting',
      message: 'Traffic is ramping up for expected peak hour',
      metric: 'requests_per_second',
      value: 1200,
      threshold: 1000,
    }),
  ];

  // Send all alerts in parallel
  await Promise.all(alerts);
}

// ============================================
// Example 12: Scheduled Monitoring Job
// ============================================

export async function example12_ScheduledMonitoring() {
  const userId = 'user123';

  // This would typically run every 5 minutes via cron or scheduled job
  console.log('[Monitoring] Starting scheduled check...');

  try {
    // Fetch metrics from your monitoring system
    const metrics = await fetchCurrentMetrics();

    // Check performance metrics
    await checkPerformanceMetrics(userId, metrics);

    // Check experiments
    const experiments = await fetchActiveExperiments();
    for (const experiment of experiments) {
      await monitorExperimentMetrics(
        userId,
        experiment.name,
        experiment.variants
      );
    }

    console.log('[Monitoring] Check completed successfully');
  } catch (error) {
    console.error('[Monitoring] Error during check:', error);

    // Send alert about monitoring system failure
    await sendNotification({
      userId,
      level: 'critical',
      type: 'errors',
      title: '🚨 Monitoring System Error',
      message: 'Failed to complete monitoring check',
      metadata: {
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      },
    });
  }
}

// ============================================
// Mock Data Functions (replace with real implementations)
// ============================================

async function fetchCurrentMetrics() {
  // Replace with actual monitoring system integration
  return {
    p95Latency: 520,
    p99Latency: 980,
    errorRate: 1.8,
  };
}

async function fetchActiveExperiments() {
  // Replace with actual database query
  return [
    {
      name: 'checkout-flow-v2',
      variants: [
        {
          name: 'control',
          metrics: {
            errorRate: 1.5,
            errorCount: 30,
            totalRequests: 2000,
            latency: 400,
          },
        },
        {
          name: 'variant-a',
          metrics: {
            errorRate: 1.8,
            errorCount: 36,
            totalRequests: 2000,
            latency: 450,
          },
        },
      ],
    },
  ];
}

// ============================================
// Run Examples (for testing)
// ============================================

export async function runAllExamples() {
  console.log('Running Slack integration examples...');

  try {
    console.log('\n1. Simple Alert');
    await example1_SimpleAlert();

    console.log('\n2. Performance Alert');
    await example2_PerformanceAlert();

    console.log('\n3. Experiment Error Alert');
    await example3_ExperimentErrorAlert();

    console.log('\n4. Significance Alert');
    await example4_SignificanceAlert();

    console.log('\n5. Traffic Spike Alert');
    await example5_TrafficSpikeAlert();

    console.log('\n✅ All examples completed successfully');
  } catch (error) {
    console.error('\n❌ Error running examples:', error);
    throw error;
  }
}

// Uncomment to run examples:
// runAllExamples();
