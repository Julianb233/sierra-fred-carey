# PagerDuty & Slack Notification Integration

Complete multi-channel notification system for critical alerts in Sierra Fred Carey.

## Overview

The notification system supports:
- **Slack** - Rich formatted messages with blocks
- **PagerDuty** - Incident management with auto-deduplication
- **Email** - (Planned) SendGrid/SES integration

### Key Features

- Type-safe TypeScript implementation
- Severity-based routing (info/warning/critical)
- User-specific channel configurations
- Automatic incident deduplication
- Comprehensive logging and audit trail
- Validation and sanitization
- Test endpoints

## Architecture

```
User Request
     ↓
API Route (/api/notifications/{channel})
     ↓
Validation & Sanitization
     ↓
Channel-Specific Formatter
     ↓
External API (Slack/PagerDuty)
     ↓
Database Logging
```

## Quick Start

### 1. Environment Setup

Add to `.env`:

```bash
# PagerDuty
PAGERDUTY_ROUTING_KEY=R0ABC123XYZ456

# Slack (optional, can be per-user)
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/T00/B00/XXX

# Database (required)
DATABASE_URL=postgresql://user:password@host:5432/database
```

### 2. Database Migration

Ensure these tables exist:

```sql
-- Notification configurations (per user/channel)
CREATE TABLE notification_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('slack', 'pagerduty', 'email')),
  webhook_url TEXT,
  routing_key TEXT,
  enabled BOOLEAN DEFAULT true,
  alert_levels TEXT[] DEFAULT ARRAY['info', 'warning', 'critical'],
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notification logs (audit trail)
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
```

### 3. Send Your First Notification

```typescript
import { sendNotification } from '@/lib/notifications';

// Send to all configured channels for user
await sendNotification({
  userId: 'user_123',
  level: 'critical',
  type: 'errors',
  title: 'High Error Rate',
  message: 'Error rate exceeded 5%',
  metric: 'error_rate',
  value: 8.5,
  threshold: 5.0
});
```

## API Reference

### POST /api/notifications/pagerduty

**Trigger Incident:**
```bash
curl -X POST http://localhost:3000/api/notifications/pagerduty \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user_123",
    "level": "critical",
    "type": "errors",
    "title": "Database Connection Lost",
    "message": "Unable to connect to primary database for 5 minutes"
  }'
```

**Resolve Incident:**
```bash
curl -X POST http://localhost:3000/api/notifications/pagerduty \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user_123",
    "action": "resolve",
    "dedupKey": "errors-global-all-alert"
  }'
```

### POST /api/notifications/slack

```bash
curl -X POST http://localhost:3000/api/notifications/slack \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user_123",
    "level": "warning",
    "type": "performance",
    "title": "Slow Query Detected",
    "message": "Query execution time exceeded 2s",
    "metric": "query_time",
    "value": 2500,
    "threshold": 2000
  }'
```

## TypeScript Types

### Core Types

```typescript
type AlertLevel = 'info' | 'warning' | 'critical';
type AlertType = 'performance' | 'errors' | 'traffic' | 'significance';
type NotificationChannel = 'slack' | 'pagerduty' | 'email';

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

| Alert Level | Slack | PagerDuty | When to Use |
|------------|-------|-----------|-------------|
| `info` | Blue | info | FYI, success messages |
| `warning` | Amber | warning | Degraded performance, approaching limits |
| `critical` | Red | critical | Outages, severe errors, pages on-call |

## Usage Examples

### Example 1: Critical Error Handler

```typescript
import { notifyCriticalError } from '@/lib/notifications/examples';

try {
  await criticalOperation();
} catch (error) {
  await notifyCriticalError('user_123', error, {
    operation: 'criticalOperation',
    requestId: 'req_xyz'
  });
  throw error;
}
```

### Example 2: Performance Monitoring

```typescript
import { notifyPerformanceDegradation } from '@/lib/notifications/examples';

const latency = await measureLatency();
if (latency > THRESHOLD) {
  await notifyPerformanceDegradation(
    'user_123',
    'api_latency_p95',
    latency,
    THRESHOLD,
    'checkout-flow'
  );
}
```

### Example 3: Experiment Significance

```typescript
import { notifyExperimentSignificance } from '@/lib/notifications/examples';

if (experimentResult.isSignificant) {
  await notifyExperimentSignificance(
    'user_123',
    'checkout-optimization',
    'variant-a',
    'conversion_rate',
    experimentResult.lift,
    experimentResult.pValue
  );
}
```

### Example 4: Health Check

```typescript
import { monitorEndpointHealth } from '@/lib/notifications/examples';

const health = await checkEndpoint('/api/users');
await monitorEndpointHealth(
  'user_123',
  '/api/users',
  health.statusCode,
  health.responseTime,
  health.errorRate
);
```

## PagerDuty Configuration

### 1. Create Service

1. Login to PagerDuty
2. Navigate to **Services** → **Service Directory**
3. Click **New Service**
4. Configure:
   - **Name**: Sierra Fred Carey Alerts
   - **Escalation Policy**: Choose or create
   - **Alert Grouping**: Intelligent (recommended)
   - **Incident Settings**: Auto-resolve after 4 hours

### 2. Add Events API v2 Integration

1. In your service, go to **Integrations** tab
2. Click **Add Integration**
3. Select **Events API v2**
4. Name: `Sierra Fred Carey`
5. Copy the **Integration Key** (starts with `R0...`)
6. Add to `.env` as `PAGERDUTY_ROUTING_KEY`

### 3. Test Integration

```typescript
import { testPagerDutyIntegration } from '@/lib/notifications/pagerduty';

const result = await testPagerDutyIntegration(
  process.env.PAGERDUTY_ROUTING_KEY!
);

console.log(result.success ? 'Success!' : result.error);
```

## Slack Configuration

### 1. Create Slack App

1. Go to https://api.slack.com/apps
2. Click **Create New App** → **From scratch**
3. **App Name**: Sierra Fred Carey Alerts
4. Select your workspace

### 2. Enable Incoming Webhooks

1. In app settings, click **Incoming Webhooks**
2. Toggle **Activate Incoming Webhooks** to ON
3. Click **Add New Webhook to Workspace**
4. Select channel (e.g., `#alerts` or `#monitoring`)
5. Click **Allow**

### 3. Copy Webhook URL

1. Copy the webhook URL (starts with `https://hooks.slack.com/services/...`)
2. Add to `.env` as `SLACK_WEBHOOK_URL` (optional)
3. Or store per-user in `notification_configs` table

### 4. Test Integration

```typescript
import { testSlackWebhook } from '@/lib/notifications/slack';

const result = await testSlackWebhook(
  process.env.SLACK_WEBHOOK_URL!
);

console.log(result.success ? 'Success!' : result.error);
```

## User Configuration

### Store User Preferences

```typescript
// Add Slack config for user
await sql`
  INSERT INTO notification_configs (
    user_id, channel, webhook_url, enabled, alert_levels
  ) VALUES (
    'user_123',
    'slack',
    'https://hooks.slack.com/services/...',
    true,
    ARRAY['warning', 'critical']
  )
`;

// Add PagerDuty config for user
await sql`
  INSERT INTO notification_configs (
    user_id, channel, routing_key, enabled, alert_levels
  ) VALUES (
    'user_123',
    'pagerduty',
    'R0ABC123XYZ',
    true,
    ARRAY['critical']  -- Only critical alerts to PagerDuty
  )
`;
```

### Update Preferences

```typescript
// Enable/disable channel
await sql`
  UPDATE notification_configs
  SET enabled = false
  WHERE user_id = 'user_123' AND channel = 'slack'
`;

// Change alert levels
await sql`
  UPDATE notification_configs
  SET alert_levels = ARRAY['critical']
  WHERE user_id = 'user_123' AND channel = 'pagerduty'
`;
```

## Error Handling

### Custom Error Classes

```typescript
import {
  NotificationError,
  SlackWebhookError,
  PagerDutyAPIError,
  isNotificationError
} from '@/lib/notifications/errors';

try {
  await sendNotification(payload);
} catch (error) {
  if (isNotificationError(error)) {
    console.error(`${error.channel} error:`, error.message);
    console.error('Error code:', error.code);
    console.error('Details:', error.details);
  }
}
```

### Validation

```typescript
import {
  validateNotificationPayload,
  assertValidPayload
} from '@/lib/notifications/validators';

// Validate before sending
const result = validateNotificationPayload(payload);
if (!result.valid) {
  console.error('Validation errors:', result.errors);
}

// Or assert and throw
try {
  assertValidPayload(payload);
  await sendNotification(payload);
} catch (error) {
  console.error('Invalid payload:', error.message);
}
```

## Monitoring & Logging

### View Notification Logs

```typescript
import { getNotificationLogs } from '@/lib/notifications';

const logs = await getNotificationLogs('user_123', 50);

logs.forEach(log => {
  console.log(`[${log.channel}] ${log.status}:`, log.title);
  if (log.errorMessage) {
    console.error('Error:', log.errorMessage);
  }
});
```

### Query Database Directly

```sql
-- Recent failed notifications
SELECT
  user_id,
  channel,
  title,
  error_message,
  created_at
FROM notification_logs
WHERE status = 'failed'
ORDER BY created_at DESC
LIMIT 100;

-- Notification success rate by channel
SELECT
  channel,
  COUNT(*) as total,
  SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as successful,
  ROUND(100.0 * SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) / COUNT(*), 2) as success_rate
FROM notification_logs
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY channel;
```

## Best Practices

### 1. Use Appropriate Severity

```typescript
// ❌ Don't use critical for everything
await sendNotification({
  userId,
  level: 'critical',
  type: 'significance',
  title: 'User clicked button',
  message: 'User interaction detected'
});

// ✅ Use info for informational updates
await sendNotification({
  userId,
  level: 'info',
  type: 'significance',
  title: 'Experiment reached significance',
  message: 'Variant A showed 15% lift in conversions'
});
```

### 2. Include Context

```typescript
// ❌ Vague message
await sendNotification({
  userId,
  level: 'critical',
  type: 'errors',
  title: 'Error',
  message: 'Something went wrong'
});

// ✅ Detailed context
await sendNotification({
  userId,
  level: 'critical',
  type: 'errors',
  title: 'Database Connection Pool Exhausted',
  message: 'All 20 database connections in use. New requests are queued.',
  metric: 'db_connections_active',
  value: 20,
  threshold: 15,
  metadata: {
    poolSize: 20,
    queuedRequests: 42,
    avgWaitTime: 1500,
    database: 'primary-postgres'
  }
});
```

### 3. Rate Limiting

```typescript
import { sendRateLimitedNotification } from '@/lib/notifications/examples';

// Only send once per 5 minutes per issue
await sendRateLimitedNotification(
  'user_123',
  'db-connection-pool',
  {
    level: 'critical',
    type: 'errors',
    title: 'Database Connection Pool Exhausted',
    message: 'All connections in use'
  }
);
```

### 4. Progressive Escalation

```typescript
const errorRate = await getErrorRate();

if (errorRate > 10) {
  // Critical - page on-call via PagerDuty
  await sendNotification({
    userId, level: 'critical', type: 'errors',
    title: 'Service Down', message: 'Error rate: 10%+'
  });
} else if (errorRate > 5) {
  // Warning - notify team via Slack
  await sendNotification({
    userId, level: 'warning', type: 'errors',
    title: 'High Error Rate', message: 'Error rate: 5-10%'
  });
} else if (errorRate > 1) {
  // Info - log for review
  await sendNotification({
    userId, level: 'info', type: 'errors',
    title: 'Elevated Error Rate', message: 'Error rate: 1-5%'
  });
}
```

## Troubleshooting

### Slack Webhook Fails

**Problem**: `invalid_payload`
- Check webhook URL format
- Verify URL starts with `https://hooks.slack.com/services/`
- Test with curl to isolate issue

**Problem**: `channel_not_found`
- Webhook may have been deleted
- Recreate webhook in Slack app settings
- Update `notification_configs` with new URL

### PagerDuty Incidents Not Creating

**Problem**: `Invalid routing_key`
- Verify using Events API v2 integration key (not REST API key)
- Check key starts with `R0` or similar
- Test with PagerDuty's event tester

**Problem**: Incidents created but not alerting
- Check service escalation policy
- Verify on-call schedule configured
- Check notification rules in user profile

### General Debugging

```typescript
// Enable debug logging
console.log('Sending notification:', payload);

const result = await sendNotification(payload);

console.log('Results:', result);
result.forEach(r => {
  if (!r.success) {
    console.error(`[${r.channel}] Failed:`, r.error);
  }
});
```

## File Structure

```
lib/notifications/
├── index.ts              # Main dispatcher
├── types.ts              # TypeScript types
├── validators.ts         # Validation & type guards
├── errors.ts             # Custom error classes
├── slack.ts              # Slack integration
├── pagerduty.ts          # PagerDuty integration
├── examples.ts           # Usage examples
├── README.md             # Full documentation
└── __tests__/
    └── validators.test.ts

app/api/notifications/
├── slack/
│   └── route.ts          # POST/GET /api/notifications/slack
├── pagerduty/
│   └── route.ts          # POST/GET /api/notifications/pagerduty
├── config/
│   └── route.ts          # User config management
├── logs/
│   └── route.ts          # Notification history
└── test/
    └── route.ts          # Test endpoints
```

## Next Steps

1. **Deploy**:
   ```bash
   vercel env add PAGERDUTY_ROUTING_KEY
   vercel env add SLACK_WEBHOOK_URL
   git push
   ```

2. **Test in Production**:
   ```bash
   curl -X POST https://your-app.vercel.app/api/notifications/test \
     -H "Content-Type: application/json" \
     -d '{"userId": "user_123"}'
   ```

3. **Monitor**:
   - Check `notification_logs` table daily
   - Set up alerts for failed notifications
   - Review success rates by channel

4. **Integrate**:
   - Add to error boundaries
   - Hook into monitoring systems
   - Connect to experiment significance detection

## Support

- **Types**: All functions are fully typed
- **Validation**: Runtime validation with clear error messages
- **Examples**: See `lib/notifications/examples.ts`
- **Tests**: Run `npm test notifications`
- **Docs**: Full API reference in `lib/notifications/README.md`
