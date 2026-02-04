# Notification System

Multi-channel notification delivery system with support for Slack, PagerDuty, and Email alerts.

## Features

- Multi-channel delivery (Slack, PagerDuty, Email)
- Severity-based routing (info, warning, critical)
- User-specific channel configurations
- Automatic deduplication for PagerDuty incidents
- Comprehensive logging and audit trail
- Test endpoints for validation

## Architecture

```
┌─────────────────┐
│  Notification   │
│    Payload      │
└────────┬────────┘
         │
         v
┌─────────────────┐
│   Dispatcher    │  (lib/notifications/index.ts)
│  sendNotification()
└────────┬────────┘
         │
         ├──────────────┬──────────────┬──────────────┐
         v              v              v              v
    ┌────────┐    ┌──────────┐   ┌────────┐    ┌────────┐
    │ Slack  │    │PagerDuty │   │ Email  │    │  Log   │
    └────────┘    └──────────┘   └────────┘    └────────┘
```

## Type System

### Core Types

```typescript
type NotificationChannel = 'slack' | 'pagerduty' | 'email';
type AlertLevel = 'info' | 'warning' | 'critical';
type AlertType = 'performance' | 'errors' | 'traffic' | 'significance';

interface NotificationPayload {
  userId: string;
  level: AlertLevel;
  type: AlertType;
  title: string;
  message: string;
  experimentName?: string;
  variantName?: string;
  metric?: string;
  value?: number;
  threshold?: number;
  metadata?: Record<string, any>;
}

interface NotificationResult {
  success: boolean;
  channel: NotificationChannel;
  messageId?: string;
  error?: string;
  timestamp: Date;
}
```

### Severity Mapping

| AlertLevel | Slack Color | PagerDuty Severity | Use Case |
|-----------|-------------|-------------------|----------|
| `info` | Blue (#3b82f6) | info | Informational updates |
| `warning` | Amber (#f59e0b) | warning | Degraded performance, approaching thresholds |
| `critical` | Red (#dc2626) | critical | Service outages, critical errors |

## API Endpoints

### POST /api/notifications/slack

Send alert to Slack webhook.

**Request:**
```typescript
{
  webhookUrl?: string;        // Direct webhook URL
  userId?: string;            // Fetch webhook from config
  level: AlertLevel;          // Required
  type: AlertType;            // Required
  title: string;              // Required
  message: string;            // Required
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

**Example:**
```bash
curl -X POST http://localhost:3000/api/notifications/slack \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user_123",
    "level": "critical",
    "type": "errors",
    "title": "High Error Rate Detected",
    "message": "Error rate exceeded threshold of 5%",
    "metric": "error_rate",
    "value": 8.5,
    "threshold": 5.0
  }'
```

### POST /api/notifications/pagerduty

Create or resolve PagerDuty incidents.

**Request (Trigger):**
```typescript
{
  routingKey?: string;        // Direct routing key
  userId?: string;            // Fetch routing key from config
  level: AlertLevel;          // Required
  type: AlertType;            // Required
  title: string;              // Required
  message: string;            // Required
  action?: 'trigger';         // Default: trigger
  experimentName?: string;
  variantName?: string;
  metric?: string;
  value?: number;
  threshold?: number;
  metadata?: Record<string, any>;
}
```

**Request (Resolve):**
```typescript
{
  routingKey?: string;
  userId?: string;
  action: 'resolve';          // Required for resolve
  dedupKey: string;           // Required for resolve
}
```

**Response:**
```typescript
{
  success: boolean;
  data?: {
    action: 'trigger' | 'resolve';
    channel: 'pagerduty';
    incidentKey?: string;     // For trigger
    dedupKey?: string;        // For resolve
    timestamp: Date;
  };
  error?: string;
}
```

**Example (Trigger):**
```bash
curl -X POST http://localhost:3000/api/notifications/pagerduty \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user_123",
    "level": "critical",
    "type": "performance",
    "title": "Database Latency Spike",
    "message": "Query latency exceeded 2000ms",
    "metric": "db_latency_p95",
    "value": 2500,
    "threshold": 2000
  }'
```

**Example (Resolve):**
```bash
curl -X POST http://localhost:3000/api/notifications/pagerduty \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user_123",
    "action": "resolve",
    "dedupKey": "performance-test-experiment-variant-a-db_latency_p95"
  }'
```

### GET /api/notifications/slack?userId=user_123

Retrieve Slack configuration for a user.

**Response:**
```typescript
{
  success: boolean;
  data?: {
    id: string;
    userId: string;
    channel: 'slack';
    webhookUrl: string;
    enabled: boolean;
    alertLevels: AlertLevel[];
    metadata: Record<string, any>;
    createdAt: Date;
    updatedAt: Date;
  } | null;
}
```

### GET /api/notifications/pagerduty?userId=user_123

Retrieve PagerDuty configuration for a user.

**Response:**
```typescript
{
  success: boolean;
  data?: {
    id: string;
    userId: string;
    channel: 'pagerduty';
    routingKey: string;
    enabled: boolean;
    alertLevels: AlertLevel[];
    metadata: Record<string, any>;
    createdAt: Date;
    updatedAt: Date;
  } | null;
}
```

## Programmatic Usage

### Send to All Configured Channels

```typescript
import { sendNotification } from '@/lib/notifications';

const result = await sendNotification({
  userId: 'user_123',
  level: 'critical',
  type: 'errors',
  title: 'Service Degradation',
  message: 'API error rate exceeded 5%',
  metric: 'error_rate',
  value: 8.5,
  threshold: 5.0,
  metadata: {
    service: 'api-gateway',
    region: 'us-east-1'
  }
});

// Results from all channels
console.log(result);
// [
//   { success: true, channel: 'slack', timestamp: ... },
//   { success: true, channel: 'pagerduty', messageId: 'abc123', timestamp: ... }
// ]
```

### Send to Specific Channel

```typescript
import { sendSlackNotification } from '@/lib/notifications/slack';
import { sendPagerDutyNotification } from '@/lib/notifications/pagerduty';

// Slack only
const slackResult = await sendSlackNotification(
  'https://hooks.slack.com/services/...',
  {
    userId: 'user_123',
    level: 'warning',
    type: 'performance',
    title: 'Slow Query Detected',
    message: 'Query execution time: 1500ms'
  }
);

// PagerDuty only
const pdResult = await sendPagerDutyNotification(
  'R0ABC123XYZ',
  {
    userId: 'user_123',
    level: 'critical',
    type: 'errors',
    title: 'Service Down',
    message: 'Health check failed for 5 consecutive minutes'
  }
);
```

### Test Configuration

```typescript
import { testNotificationConfig } from '@/lib/notifications';

const result = await testNotificationConfig('config_123', 'user_123');

if (result.success) {
  console.log('Configuration is valid!');
} else {
  console.error('Configuration error:', result.error);
}
```

## Database Schema

### notification_configs

Stores user notification channel configurations.

```sql
CREATE TABLE notification_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('slack', 'pagerduty', 'email')),
  webhook_url TEXT,              -- For Slack
  routing_key TEXT,              -- For PagerDuty
  api_key TEXT,                  -- For PagerDuty (future)
  email_address TEXT,            -- For Email
  enabled BOOLEAN DEFAULT true,
  alert_levels TEXT[] DEFAULT ARRAY['info', 'warning', 'critical'],
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notification_configs_user ON notification_configs(user_id);
CREATE INDEX idx_notification_configs_enabled ON notification_configs(enabled) WHERE enabled = true;
```

### notification_logs

Audit trail of all notification attempts.

```sql
CREATE TABLE notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  config_id UUID REFERENCES notification_configs(id),
  channel TEXT NOT NULL,
  alert_level TEXT NOT NULL,
  alert_type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  experiment_name TEXT,
  variant_name TEXT,
  metadata JSONB DEFAULT '{}',
  status TEXT NOT NULL CHECK (status IN ('pending', 'sent', 'failed')),
  error_message TEXT,
  attempts INTEGER DEFAULT 1,
  response_data JSONB,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notification_logs_user ON notification_logs(user_id);
CREATE INDEX idx_notification_logs_status ON notification_logs(status);
CREATE INDEX idx_notification_logs_created ON notification_logs(created_at DESC);
```

## Environment Variables

Add to `.env`:

```bash
# PagerDuty Integration
PAGERDUTY_ROUTING_KEY=R0ABC123XYZ

# Slack Webhook (optional, can be per-user)
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/T00/B00/XXX
```

## PagerDuty Setup

1. **Create Service:**
   - Go to PagerDuty → Services → New Service
   - Name: "Sierra Fred Carey Alerts"
   - Escalation Policy: Choose or create
   - Click "Next"

2. **Add Integration:**
   - Integration Type: "Events API v2"
   - Integration Name: "Sierra Fred Carey"
   - Click "Create Service"

3. **Copy Integration Key:**
   - Copy the "Integration Key" (starts with `R0...`)
   - Add to `.env` as `PAGERDUTY_ROUTING_KEY`

4. **Test Integration:**
   ```bash
   curl -X POST http://localhost:3000/api/notifications/pagerduty \
     -H "Content-Type: application/json" \
     -d '{
       "routingKey": "YOUR_ROUTING_KEY",
       "level": "info",
       "type": "significance",
       "title": "PagerDuty Integration Test",
       "message": "Testing PagerDuty integration"
     }'
   ```

## Slack Setup

1. **Create Slack App:**
   - Go to https://api.slack.com/apps
   - Click "Create New App" → "From scratch"
   - App Name: "Sierra Fred Carey Alerts"
   - Choose workspace

2. **Enable Incoming Webhooks:**
   - Click "Incoming Webhooks" in sidebar
   - Toggle "Activate Incoming Webhooks" to ON
   - Click "Add New Webhook to Workspace"
   - Select channel (e.g., #alerts)

3. **Copy Webhook URL:**
   - Copy the webhook URL (starts with `https://hooks.slack.com/services/...`)
   - Add to `.env` as `SLACK_WEBHOOK_URL`

4. **Test Integration:**
   ```bash
   curl -X POST http://localhost:3000/api/notifications/slack \
     -H "Content-Type: application/json" \
     -d '{
       "webhookUrl": "YOUR_WEBHOOK_URL",
       "level": "info",
       "type": "significance",
       "title": "Slack Integration Test",
       "message": "Testing Slack integration"
     }'
   ```

## Deduplication

PagerDuty incidents are automatically deduplicated using a key generated from:
- Alert type
- Experiment name (or "global")
- Variant name (or "all")
- Metric name (or "alert")

Example dedup key: `performance-checkout-flow-variant-a-latency_p95`

This ensures:
- Same issue doesn't create multiple incidents
- Can resolve incidents by referencing the same key
- Related alerts are grouped together

## Error Handling

All notification functions return a `NotificationResult`:

```typescript
interface NotificationResult {
  success: boolean;
  channel: NotificationChannel;
  messageId?: string;  // Dedup key for PagerDuty
  error?: string;      // Error message if failed
  timestamp: Date;
}
```

**Example:**
```typescript
const result = await sendSlackNotification(webhookUrl, payload);

if (!result.success) {
  console.error(`Slack notification failed: ${result.error}`);
  // Handle error (retry, fallback, etc.)
} else {
  console.log(`Notification sent at ${result.timestamp}`);
}
```

## Best Practices

1. **Use Severity Appropriately:**
   - `info`: FYI updates, non-urgent notifications
   - `warning`: Issues that need attention but aren't urgent
   - `critical`: Pages on-call, urgent action required

2. **Configure Alert Levels:**
   - Set per-user preferences in `notification_configs`
   - Users can opt-in to specific severity levels per channel
   - Example: Slack for all levels, PagerDuty only for critical

3. **Include Context:**
   - Always provide `experimentName`, `metric`, `value`, `threshold`
   - Add relevant metadata for debugging
   - Link to dashboards in PagerDuty events

4. **Test Before Production:**
   - Use test endpoints to validate configurations
   - Start with `info` level alerts
   - Gradually enable higher severity levels

5. **Monitor Notification Logs:**
   - Check `notification_logs` for delivery failures
   - Set up alerts for failed notifications
   - Retry failed notifications with exponential backoff

## Troubleshooting

### Slack Webhook Errors

**Problem:** `invalid_payload` or `invalid_token`
- **Solution:** Verify webhook URL is correct and starts with `https://hooks.slack.com/services/`

**Problem:** `channel_not_found`
- **Solution:** Recreate webhook integration, select valid channel

### PagerDuty Errors

**Problem:** `Invalid routing_key`
- **Solution:** Verify routing key from Events API v2 integration (not REST API key)

**Problem:** `Event not acknowledged`
- **Solution:** Check PagerDuty service is active and escalation policy configured

### General Issues

**Problem:** Notifications not sending
- **Solution:** Check `notification_logs` table for error messages
- Verify environment variables are set
- Test with direct API calls using curl

**Problem:** Duplicate PagerDuty incidents
- **Solution:** Verify dedup key generation is consistent
- Use explicit `dedupKey` if needed

## Migration from Legacy System

If migrating from an older notification system:

1. **Export Existing Configs:**
   ```sql
   SELECT user_id, channel, webhook_url
   FROM old_notification_settings;
   ```

2. **Import to New Schema:**
   ```sql
   INSERT INTO notification_configs (user_id, channel, webhook_url, enabled)
   SELECT user_id, 'slack', webhook_url, true
   FROM old_notification_settings;
   ```

3. **Update Application Code:**
   ```typescript
   // Old
   await sendAlert(userId, message);

   // New
   await sendNotification({
     userId,
     level: 'critical',
     type: 'errors',
     title: 'Alert',
     message
   });
   ```

## Future Enhancements

- [ ] Email notifications via SendGrid/SES
- [ ] SMS notifications via Twilio
- [ ] Webhook notifications for custom integrations
- [ ] Retry logic with exponential backoff
- [ ] Rate limiting and throttling
- [ ] Notification templates
- [ ] Quiet hours configuration
- [ ] Notification aggregation/batching
