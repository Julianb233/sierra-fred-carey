#!/usr/bin/env ts-node

/**
 * Test Slack Webhook Integration
 *
 * Usage:
 *   npm run test-slack <webhook-url>
 *
 * Or set SLACK_WEBHOOK_URL in .env and run:
 *   npm run test-slack
 */

import { sendSlackNotification, testSlackWebhook } from '../lib/notifications/slack';
import { NotificationPayload } from '../lib/notifications/types';

async function testSlackIntegration() {
  const webhookUrl = process.argv[2] || process.env.SLACK_WEBHOOK_URL;

  if (!webhookUrl) {
    console.error('❌ Error: Slack webhook URL not provided');
    console.error('');
    console.error('Usage:');
    console.error('  npm run test-slack <webhook-url>');
    console.error('  or set SLACK_WEBHOOK_URL in .env');
    process.exit(1);
  }

  if (!webhookUrl.startsWith('https://hooks.slack.com/')) {
    console.error('❌ Error: Invalid Slack webhook URL format');
    console.error('Expected: https://hooks.slack.com/services/...');
    process.exit(1);
  }

  console.log('🚀 Testing Slack Integration');
  console.log('Webhook:', webhookUrl.substring(0, 40) + '...');
  console.log('');

  // Test 1: Simple test message
  console.log('Test 1: Sending test notification...');
  const testResult = await testSlackWebhook(webhookUrl);

  if (testResult.success) {
    console.log('✅ Test notification sent successfully');
  } else {
    console.error('❌ Test notification failed:', testResult.error);
    process.exit(1);
  }

  console.log('');

  // Test 2: Info level alert
  console.log('Test 2: Sending info alert...');
  const infoPayload: NotificationPayload = {
    userId: 'test-user',
    level: 'info',
    type: 'significance',
    title: 'Experiment Reached Statistical Significance',
    message: 'Variant B shows 12% improvement in conversion rate over control',
    experimentName: 'checkout-flow-optimization',
    variantName: 'variant-b',
    metric: 'conversion_rate',
    value: 4.2,
    threshold: 3.75,
    metadata: {
      sampleSize: 10000,
      confidence: 0.95
    }
  };

  const infoResult = await sendSlackNotification(webhookUrl, infoPayload);

  if (infoResult.success) {
    console.log('✅ Info alert sent successfully');
  } else {
    console.error('❌ Info alert failed:', infoResult.error);
  }

  console.log('');

  // Test 3: Warning level alert
  console.log('Test 3: Sending warning alert...');
  const warningPayload: NotificationPayload = {
    userId: 'test-user',
    level: 'warning',
    type: 'performance',
    title: 'API Latency Increased',
    message: 'P95 latency has exceeded threshold in the last 10 minutes',
    metric: 'p95_latency_ms',
    value: 850,
    threshold: 500,
    metadata: {
      service: 'payment-api',
      region: 'us-east-1'
    }
  };

  const warningResult = await sendSlackNotification(webhookUrl, warningPayload);

  if (warningResult.success) {
    console.log('✅ Warning alert sent successfully');
  } else {
    console.error('❌ Warning alert failed:', warningResult.error);
  }

  console.log('');

  // Test 4: Critical level alert
  console.log('Test 4: Sending critical alert...');
  const criticalPayload: NotificationPayload = {
    userId: 'test-user',
    level: 'critical',
    type: 'errors',
    title: '🚨 High Error Rate Detected',
    message: 'Error rate spiked to 12.5% in the last 5 minutes. Immediate attention required!',
    experimentName: 'homepage-redesign',
    variantName: 'variant-a',
    metric: 'error_rate',
    value: 12.5,
    threshold: 2.0,
    metadata: {
      errorCount: 1523,
      totalRequests: 12184,
      topError: '500 Internal Server Error',
      affected: 'all users'
    }
  };

  const criticalResult = await sendSlackNotification(webhookUrl, criticalPayload);

  if (criticalResult.success) {
    console.log('✅ Critical alert sent successfully');
  } else {
    console.error('❌ Critical alert failed:', criticalResult.error);
  }

  console.log('');
  console.log('📊 Test Summary:');
  console.log('================');

  const results = [testResult, infoResult, warningResult, criticalResult];
  const successCount = results.filter(r => r.success).length;
  const failCount = results.filter(r => !r.success).length;

  console.log(`✅ Successful: ${successCount}/4`);
  console.log(`❌ Failed: ${failCount}/4`);

  if (successCount === 4) {
    console.log('');
    console.log('🎉 All tests passed! Your Slack integration is working correctly.');
    console.log('');
    console.log('Next steps:');
    console.log('1. Check your Slack channel for the test messages');
    console.log('2. Create a notification config in the database');
    console.log('3. Integrate alerts into your monitoring system');
  } else {
    console.log('');
    console.log('⚠️  Some tests failed. Check the errors above for details.');
    process.exit(1);
  }
}

// Run tests
testSlackIntegration().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
