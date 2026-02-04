# Slack Webhook Integration Guide

Complete guide for integrating Slack alerts into your application.

## Overview

The notification system supports multi-channel alert delivery (Slack, PagerDuty, Email) with configurable alert levels and automatic logging.

## Quick Start

### 1. Get Your Slack Webhook URL

1. Go to your Slack workspace
2. Navigate to **Apps** → **Incoming Webhooks**
3. Click **Add to Slack**
4. Select the channel where you want to receive alerts
5. Copy the webhook URL (format: `https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXX`)

### 2. Configure Environment Variable

Add to your `.env.local`:

```bash
# Optional: Default Slack webhook for system alerts
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
```

### 3. Create Notification Configuration

Use the API to create a user-specific notification config:

```bash
curl -X POST http://localhost:3000/api/notifications/config \
  -H "Content-Type: application/json" \
  -d '{
    "channel": "slack",
    "webhookUrl": "https://hooks.slack.com/services/YOUR/WEBHOOK/URL",
    "alertLevels": ["warning", "critical"],
    "metadata": {
      "description": "Production alerts channel"
    }
  }'
```

Response:
```json
{
  "success": true,
  "data": {
    "id": "uuid-here",
    "userId": "user123",
    "channel": "slack",
    "enabled": true,
    "alertLevels": ["warning", "critical"],
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

## Sending Alerts

### Option 1: Using the API Endpoint

```typescript
// Send alert to Slack
const response = await fetch('/api/notifications/slack', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    level: 'critical',           // 'info' | 'warning' | 'critical'
    type: 'performance',         // 'performance' | 'errors' | 'traffic' | 'significance'
    title: 'High Error Rate Detected',
    message: 'Error rate exceeded 5% threshold in the last 5 minutes',
    metric: 'error_rate',
    value: 7.2,
    threshold: 5.0,
    experimentName: 'checkout-flow-v2',  // Optional
    variantName: 'variant-a',            // Optional
    metadata: {                          // Optional
      region: 'us-east-1',
      service: 'payment-api'
    }
  })
});

const result = await response.json();
// { success: true, data: { channel: "slack", timestamp: "..." } }
```

### Option 2: Using the Notification Service (Server-side)

```typescript
import { sendNotification } from '@/lib/notifications';

// Automatically sends to all enabled notification channels for the user
const results = await sendNotification({
  userId: 'user123',
  level: 'warning',
  type: 'traffic',
  title: 'Traffic Spike Detected',
  message: 'Traffic increased by 200% in the last hour',
  metric: 'requests_per_second',
  value: 1500,
  threshold: 500,
  metadata: {
    source: 'monitoring-system'
  }
});

// results is an array of NotificationResult[]
console.log(results);
```

### Option 3: Direct to Webhook (No DB logging)

```typescript
import { sendSlackNotification } from '@/lib/notifications/slack';

const result = await sendSlackNotification(
  'https://hooks.slack.com/services/YOUR/WEBHOOK/URL',
  {
    userId: 'api',
    level: 'info',
    type: 'significance',
    title: 'Experiment Reached Significance',
    message: 'Variant B shows 15% improvement over control',
    experimentName: 'homepage-hero-v3',
    variantName: 'variant-b',
    metric: 'conversion_rate',
    value: 3.8,
    threshold: 3.3
  }
);
```

## Alert Levels

| Level | Icon | Color | Use For |
|-------|------|-------|---------|
| `info` | ℹ️ | Blue | General information, experiment completed |
| `warning` | ⚠️ | Amber | Performance degradation, non-critical errors |
| `critical` | 🚨 | Red | System outages, critical errors, security issues |

## Alert Types

| Type | Description |
|------|-------------|
| `performance` | Performance degradation, slow response times, latency issues |
| `errors` | Error rate spikes, exceptions, failed requests |
| `traffic` | Traffic spikes, unusual patterns, DDoS indicators |
| `significance` | A/B test results, statistical significance reached |

## Message Formatting

Slack messages are automatically formatted with:

1. **Header** - Emoji + title
2. **Message** - Main alert message
3. **Experiment Details** - Experiment name and variant (if provided)
4. **Metrics** - Metric name, value, and threshold (if provided)
5. **Context** - Alert level, type, and timestamp

Example Slack message:
```
🚨 High Error Rate Detected

Error rate exceeded 5% threshold in the last 5 minutes

Experiment: checkout-flow-v2
Variant: variant-a

Metric: error_rate
Value: 7.20%
Threshold: 5.00%

Level: CRITICAL | Type: performance | Time: 1/1/2024, 12:00:00 PM
```

## Configuration Management

### List Configurations

```bash
curl http://localhost:3000/api/notifications/config?userId=user123
```

### Update Configuration

```bash
curl -X PATCH http://localhost:3000/api/notifications/config \
  -H "Content-Type: application/json" \
  -d '{
    "id": "config-uuid",
    "enabled": false,
    "alertLevels": ["critical"]
  }'
```

### Delete Configuration

```bash
curl -X DELETE "http://localhost:3000/api/notifications/config?id=config-uuid"
```

## Testing Your Integration

### Test via API

```bash
curl -X POST http://localhost:3000/api/notifications/test \
  -H "Content-Type: application/json" \
  -d '{
    "configId": "your-config-uuid"
  }'
```

This sends a test message to your configured channel.

### Test Script

```typescript
// test-slack.ts
import { testSlackWebhook } from '@/lib/notifications/slack';

async function testIntegration() {
  const result = await testSlackWebhook(
    'https://hooks.slack.com/services/YOUR/WEBHOOK/URL'
  );

  if (result.success) {
    console.log('✅ Slack integration working!');
  } else {
    console.error('❌ Failed:', result.error);
  }
}

testIntegration();
```

## Viewing Notification Logs

### Get Logs via API

```bash
curl "http://localhost:3000/api/notifications/logs?userId=user123&limit=50"
```

Response:
```json
{
  "success": true,
  "data": [
    {
      "id": "log-uuid",
      "userId": "user123",
      "channel": "slack",
      "alertLevel": "critical",
      "alertType": "performance",
      "title": "High Error Rate Detected",
      "message": "Error rate exceeded 5% threshold",
      "status": "sent",
      "sentAt": "2024-01-01T12:00:00.000Z",
      "createdAt": "2024-01-01T12:00:00.000Z"
    }
  ],
  "meta": {
    "count": 1,
    "limit": 50
  }
}
```

## Advanced Usage

### User-Specific Notifications

The system automatically routes notifications based on user ID. Each user can configure their own Slack webhook:

```typescript
// User A gets alerts in #team-a
// User B gets alerts in #team-b
await sendNotification({
  userId: 'user-a', // Will use User A's configured webhook
  level: 'warning',
  type: 'performance',
  title: 'Alert for Team A',
  message: 'Performance degradation detected'
});
```

### Alert Level Filtering

Configure which alert levels trigger notifications:

```typescript
// Only send critical alerts
{
  "channel": "slack",
  "webhookUrl": "...",
  "alertLevels": ["critical"]
}

// Send warnings and critical
{
  "channel": "slack",
  "webhookUrl": "...",
  "alertLevels": ["warning", "critical"]
}

// Send all alerts
{
  "channel": "slack",
  "webhookUrl": "...",
  "alertLevels": ["info", "warning", "critical"]
}
```

### Multiple Channels

Users can configure multiple notification channels (Slack + PagerDuty + Email):

```typescript
// Slack for info/warning
await createConfig({
  channel: 'slack',
  webhookUrl: '...',
  alertLevels: ['info', 'warning']
});

// PagerDuty for critical
await createConfig({
  channel: 'pagerduty',
  routingKey: '...',
  alertLevels: ['critical']
});
```

## Error Handling

All notification attempts are logged with status:

- `pending` - Queued for delivery
- `sent` - Successfully delivered
- `failed` - Delivery failed (check `errorMessage`)

Failed notifications include detailed error messages:

```json
{
  "status": "failed",
  "errorMessage": "Slack API error: 404 - channel_not_found",
  "attempts": 1
}
```

## Security Considerations

1. **Webhook URLs** are stored securely in the database
2. **Row Level Security (RLS)** ensures users can only access their own configs
3. **Webhook validation** checks URL format before sending
4. **Sensitive data** is partially redacted in API responses
5. **Authentication required** for config management endpoints

## Troubleshooting

### Webhook URL Invalid

```
Error: Invalid Slack webhook URL format
```

**Solution:** Ensure webhook URL starts with `https://hooks.slack.com/`

### No Enabled Configs Found

```
Error: No enabled Slack configuration found for user
```

**Solution:** Create a config or enable existing config

### Notification Not Sent

Check notification logs to see delivery status and error message.

## Examples

### Performance Alert

```typescript
await sendNotification({
  userId: 'user123',
  level: 'warning',
  type: 'performance',
  title: 'API Latency Increased',
  message: 'P95 latency exceeded 500ms threshold',
  metric: 'p95_latency',
  value: 750,
  threshold: 500
});
```

### Error Rate Alert

```typescript
await sendNotification({
  userId: 'user123',
  level: 'critical',
  type: 'errors',
  title: 'High Error Rate',
  message: 'Error rate spiked to 8% in the last 5 minutes',
  metric: 'error_rate',
  value: 8.0,
  threshold: 2.0
});
```

### Experiment Significance

```typescript
await sendNotification({
  userId: 'user123',
  level: 'info',
  type: 'significance',
  title: 'Experiment Reached Significance',
  message: 'Variant B shows statistically significant improvement',
  experimentName: 'checkout-optimization',
  variantName: 'variant-b',
  metric: 'conversion_rate',
  value: 4.2,
  threshold: 3.5
});
```

## API Reference

### POST /api/notifications/slack

Send alert to Slack webhook.

**Request Body:**
```typescript
{
  webhookUrl?: string;      // Optional if userId provided
  userId?: string;          // Optional if webhookUrl provided
  level: 'info' | 'warning' | 'critical';
  type: 'performance' | 'errors' | 'traffic' | 'significance';
  title: string;
  message: string;
  experimentName?: string;
  variantName?: string;
  metric?: string;
  value?: number;
  threshold?: number;
  metadata?: Record<string, any>;
}
```

**Response:**
```typescript
{
  success: boolean;
  data?: {
    channel: 'slack';
    timestamp: Date;
  };
  error?: string;
}
```

### GET /api/notifications/slack?userId=xxx

Get Slack configuration for a user.

**Response:**
```typescript
{
  success: boolean;
  data: {
    id: string;
    userId: string;
    channel: 'slack';
    webhookUrl: string; // Partially redacted
    enabled: boolean;
    alertLevels: string[];
    createdAt: Date;
    updatedAt: Date;
  } | null;
}
```

## TypeScript Types

```typescript
import { NotificationPayload, NotificationResult } from '@/lib/notifications/types';

const payload: NotificationPayload = {
  userId: 'user123',
  level: 'critical',
  type: 'performance',
  title: 'Alert Title',
  message: 'Alert message',
  metric: 'error_rate',
  value: 5.0,
  threshold: 2.0
};

const result: NotificationResult = await sendSlackNotification(
  webhookUrl,
  payload
);
```

## Next Steps

1. Configure your Slack webhook URL
2. Create a notification config via API
3. Test with a sample alert
4. Integrate into your monitoring/alerting system
5. Review notification logs to verify delivery

For additional channels (PagerDuty, Email), see the main notifications documentation.
