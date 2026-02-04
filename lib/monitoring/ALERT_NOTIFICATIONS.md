# Alert Notification System

Comprehensive guide to the automated alert notification system for A/B testing monitoring.

## Overview

The alert notification system automatically sends notifications to configured channels (Slack, PagerDuty, Email) when monitoring alerts are triggered. It integrates seamlessly with the A/B testing metrics system to provide real-time alerts for:

- Critical error rates
- Performance degradation
- Traffic anomalies
- Statistical significance changes

## Architecture

### Components

1. **Alert Notifier** (`alert-notifier.ts`)
   - Core notification dispatch logic
   - User subscription management
   - Multi-channel delivery coordination

2. **Alert Scheduler** (`alert-scheduler.ts`)
   - Periodic alert checks
   - Background job coordination
   - Cron integration support

3. **Enhanced Metrics** (`ab-test-metrics.ts`)
   - Automatic notification on alert generation
   - Configurable alert levels
   - Experiment-specific notifications

4. **API Endpoints**
   - `/api/monitoring/alerts` - Alert management
   - `/api/monitoring/alerts/check` - Scheduled checks
   - `/api/notifications/config` - Configuration management

## Features

### 1. Automatic Notifications

Alerts are automatically sent when generated during experiment monitoring:

```typescript
// Automatically enabled by default
// Disable with environment variable: AUTO_NOTIFY_ALERTS=false

import { compareExperimentVariants } from '@/lib/monitoring/ab-test-metrics';

const comparison = await compareExperimentVariants('my-experiment');
// Notifications are sent automatically if alerts are generated
```

### 2. Manual Alert Notification

Trigger notifications manually for specific alerts:

```typescript
import { notifyAlerts } from '@/lib/monitoring/alert-notifier';

const stats = await notifyAlerts(alerts, {
  immediate: true,
  minimumLevel: 'warning',
  experimentName: 'my-experiment',
  experimentId: 'exp-123',
});

console.log(`Sent ${stats.notificationsSent} notifications`);
```

### 3. User-Specific Notifications

Send notifications to specific users:

```typescript
import { notifyUserAlerts } from '@/lib/monitoring/alert-notifier';

const count = await notifyUserAlerts('user-id', alerts, {
  minimumLevel: 'critical',
});
```

### 4. Scheduled Alert Checks

Use the scheduler for periodic monitoring:

```typescript
import { startGlobalAlertScheduler } from '@/lib/monitoring/alert-scheduler';

// Check for alerts every 15 minutes
startGlobalAlertScheduler(15);
```

## Configuration

### Environment Variables

```bash
# Disable automatic notifications (default: enabled)
AUTO_NOTIFY_ALERTS=false

# Cron job authentication
CRON_SECRET=your-secret-token

# App URL for PagerDuty links
NEXT_PUBLIC_APP_URL=https://your-app.com
```

### User Notification Preferences

Users configure notification preferences in the database:

```sql
-- Example notification config
INSERT INTO notification_configs (
  user_id,
  channel,
  webhook_url,
  enabled,
  alert_levels
) VALUES (
  'user-123',
  'slack',
  'https://hooks.slack.com/services/...',
  true,
  ARRAY['warning', 'critical']
);
```

## Alert Levels

Alerts are classified into three levels:

1. **Info** - Informational alerts (e.g., insufficient sample size)
2. **Warning** - Alerts requiring attention (e.g., elevated error rate)
3. **Critical** - Urgent alerts requiring immediate action (e.g., critical error rate)

### Alert Types

- **Performance** - Latency and response time issues
- **Errors** - Error rate anomalies
- **Traffic** - Traffic distribution issues
- **Significance** - Statistical significance changes

## API Endpoints

### GET /api/monitoring/alerts

Get all alerts with optional filtering and notification:

```bash
# Get all critical alerts
curl "https://your-app.com/api/monitoring/alerts?level=critical"

# Get alerts and send notifications
curl "https://your-app.com/api/monitoring/alerts?notify=true"

# Filter by type
curl "https://your-app.com/api/monitoring/alerts?type=performance"
```

### POST /api/monitoring/alerts

Manually trigger notifications:

```bash
curl -X POST "https://your-app.com/api/monitoring/alerts" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-123",
    "level": "critical",
    "type": "performance",
    "title": "High Latency Alert",
    "message": "P95 latency exceeded threshold",
    "experimentName": "checkout-flow",
    "variantName": "variant-b",
    "metric": "p95LatencyMs",
    "value": 5500,
    "threshold": 5000
  }'
```

### GET /api/monitoring/alerts/check

Trigger scheduled alert check (for cron jobs):

```bash
# With authentication
curl "https://your-app.com/api/monitoring/alerts/check" \
  -H "Authorization: Bearer your-cron-secret"
```

## Vercel Cron Integration

Add to `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/monitoring/alerts/check",
      "schedule": "*/15 * * * *"
    }
  ]
}
```

Set the cron secret in Vercel:

```bash
vercel env add CRON_SECRET
```

## Notification Channels

### Slack

Configure Slack webhooks in notification configs:

```typescript
// Slack notifications include:
// - Formatted blocks with alert details
// - Color-coded attachments
// - Experiment and variant context
// - Metric values and thresholds
```

### PagerDuty

Configure PagerDuty routing keys:

```typescript
// PagerDuty incidents include:
// - Severity mapping (info/warning/critical)
// - Deduplication keys for grouping
// - Custom details with metrics
// - Links to monitoring dashboard
```

### Email (Coming Soon)

Email notifications will be implemented in a future update.

## Alert Notification Flow

1. **Alert Generation**
   - Metrics are collected for experiments
   - Alerts are generated based on thresholds
   - Auto-notification triggers (if enabled)

2. **Subscriber Lookup**
   - Query notification_configs for enabled subscriptions
   - Filter by alert level preferences
   - Identify notification channels

3. **Channel Delivery**
   - Send to Slack (if configured)
   - Send to PagerDuty (if configured)
   - Send to Email (if configured)

4. **Logging**
   - Record delivery status
   - Track errors and retries
   - Store response data

## Database Schema

### notification_configs

Stores user notification preferences:

```sql
CREATE TABLE notification_configs (
  id UUID PRIMARY KEY,
  user_id TEXT NOT NULL,
  channel TEXT NOT NULL, -- 'slack', 'pagerduty', 'email'
  webhook_url TEXT,
  routing_key TEXT,
  enabled BOOLEAN DEFAULT true,
  alert_levels TEXT[] DEFAULT ARRAY['critical'],
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, channel)
);
```

### notification_logs

Audit trail of all notifications:

```sql
CREATE TABLE notification_logs (
  id UUID PRIMARY KEY,
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
  status TEXT DEFAULT 'pending', -- 'pending', 'sent', 'failed'
  error_message TEXT,
  attempts INTEGER DEFAULT 0,
  response_data JSONB,
  sent_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Error Handling

The system includes comprehensive error handling:

- **Retry Logic** - Automatic retries for transient failures
- **Error Logging** - All errors logged to database
- **Graceful Degradation** - Failures don't block alert generation
- **Detailed Statistics** - Success/failure counts tracked

## Monitoring

Monitor the notification system itself:

```typescript
import { getNotificationLogs } from '@/lib/notifications';

// Get recent notification logs
const logs = await getNotificationLogs('user-id', 50);

// Check for failed notifications
const failures = logs.filter(log => log.status === 'failed');
```

## Best Practices

1. **Alert Levels** - Configure appropriate alert levels for each user
2. **Channel Selection** - Use Slack for team alerts, PagerDuty for on-call
3. **Threshold Tuning** - Adjust alert thresholds to reduce noise
4. **Regular Reviews** - Review notification logs to optimize delivery
5. **Testing** - Use test endpoints to verify configurations

## Troubleshooting

### Notifications Not Sending

1. Check user has enabled notification configs
2. Verify alert levels match notification preferences
3. Review notification_logs for error messages
4. Test webhook/API credentials

### Too Many Notifications

1. Increase minimum alert level
2. Adjust metric thresholds in generateAlerts()
3. Consider alert grouping/deduplication
4. Implement quiet hours if needed

### Missing Alerts

1. Verify AUTO_NOTIFY_ALERTS is enabled
2. Check experiment is active
3. Ensure sufficient sample size
4. Review alert generation logic

## Examples

### Example 1: Setup Slack Notifications

```typescript
// 1. Create notification config via API
const response = await fetch('/api/notifications/config', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    channel: 'slack',
    webhookUrl: 'https://hooks.slack.com/services/...',
    alertLevels: ['warning', 'critical'],
  }),
});

// 2. Test the configuration
await fetch('/api/notifications/test', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    configId: 'config-id',
  }),
});
```

### Example 2: Manual Alert Check

```typescript
import { runAlertNotificationCheck } from '@/lib/monitoring/alert-scheduler';

// Run alert check manually
const result = await runAlertNotificationCheck();
console.log(result);
// { success: true, message: "...", timestamp: "..." }
```

### Example 3: Custom Alert Notification

```typescript
import { notifyAlerts } from '@/lib/monitoring/alert-notifier';
import { Alert } from '@/lib/monitoring/ab-test-metrics';

const customAlert: Alert = {
  level: 'critical',
  type: 'performance',
  message: 'Custom performance alert',
  variantName: 'variant-a',
  metric: 'responseTime',
  value: 3000,
  threshold: 2000,
  timestamp: new Date(),
};

await notifyAlerts([customAlert], {
  immediate: true,
  experimentName: 'my-experiment',
});
```

## Future Enhancements

- Email notification support
- SMS notifications
- Webhook integrations
- Alert grouping and deduplication
- Quiet hours configuration
- Alert escalation policies
- Dashboard for notification analytics
- User preference UI
