# Notification System Documentation

## Overview

The Fred Carey notification system enables multi-channel alert delivery for A/B test monitoring, experiment alerts, and statistical significance notifications. Supported channels include Slack, PagerDuty, and Email.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Notification System                       │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │   Slack      │    │  PagerDuty   │    │    Email     │  │
│  │  Webhooks    │    │  Events API  │    │  (Planned)   │  │
│  └──────────────┘    └──────────────┘    └──────────────┘  │
│         │                    │                    │          │
│         └────────────────────┴────────────────────┘          │
│                            │                                 │
│                  ┌─────────▼──────────┐                      │
│                  │  Notification      │                      │
│                  │  Dispatcher        │                      │
│                  └─────────┬──────────┘                      │
│                            │                                 │
│         ┌──────────────────┼──────────────────┐              │
│         │                  │                  │              │
│  ┌──────▼──────┐   ┌───────▼──────┐   ┌──────▼──────┐      │
│  │  Monitoring │   │  Experiments │   │    Manual   │      │
│  │   Alerts    │   │ Significance │   │   Triggers  │      │
│  └─────────────┘   └──────────────┘   └─────────────┘      │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## Database Schema

### notification_configs

Stores user notification channel configurations.

```sql
CREATE TABLE notification_configs (
  id UUID PRIMARY KEY,
  user_id TEXT NOT NULL,
  channel TEXT NOT NULL,              -- 'slack' | 'pagerduty' | 'email'
  webhook_url TEXT,                   -- For Slack
  api_key TEXT,                       -- For PagerDuty
  email_address TEXT,                 -- For email
  routing_key TEXT,                   -- For PagerDuty
  enabled BOOLEAN DEFAULT true,
  alert_levels TEXT[] DEFAULT ARRAY['critical'],
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(user_id, channel)
);
```

### notification_logs

Audit log of all notification attempts.

```sql
CREATE TABLE notification_logs (
  id UUID PRIMARY KEY,
  user_id TEXT NOT NULL,
  config_id UUID REFERENCES notification_configs(id),
  channel TEXT NOT NULL,
  alert_level TEXT NOT NULL,          -- 'info' | 'warning' | 'critical'
  alert_type TEXT NOT NULL,           -- 'performance' | 'errors' | 'traffic' | 'significance'
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  experiment_name TEXT,
  variant_name TEXT,
  metadata JSONB DEFAULT '{}',
  status TEXT DEFAULT 'pending',      -- 'pending' | 'sent' | 'failed'
  error_message TEXT,
  attempts INTEGER DEFAULT 0,
  response_data JSONB,
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE
);
```

## API Endpoints

### 1. Notification Configuration

#### GET /api/notifications/config

List all notification configurations for authenticated user.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "userId": "user123",
      "channel": "slack",
      "webhookUrl": "https://hooks.slack.com/services/...",
      "enabled": true,
      "alertLevels": ["warning", "critical"],
      "createdAt": "2025-01-01T00:00:00Z",
      "updatedAt": "2025-01-01T00:00:00Z"
    }
  ]
}
```

#### POST /api/notifications/config

Create a new notification configuration.

**Request Body:**
```json
{
  "channel": "slack",
  "webhookUrl": "https://hooks.slack.com/services/T00/B00/xxx",
  "alertLevels": ["warning", "critical"],
  "metadata": {}
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "userId": "user123",
    "channel": "slack",
    "enabled": true,
    "alertLevels": ["warning", "critical"],
    "createdAt": "2025-01-01T00:00:00Z"
  }
}
```

#### PATCH /api/notifications/config

Update an existing configuration.

**Request Body:**
```json
{
  "id": "uuid",
  "enabled": false,
  "alertLevels": ["critical"]
}
```

#### DELETE /api/notifications/config?id=uuid

Delete a notification configuration.

### 2. Test Notifications

#### POST /api/notifications/test

Send a test notification to verify configuration.

**Request Body:**
```json
{
  "configId": "uuid"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Test notification sent successfully",
  "data": {
    "channel": "slack",
    "messageId": "123",
    "timestamp": "2025-01-01T00:00:00Z"
  }
}
```

### 3. Notification Logs

#### GET /api/notifications/logs?limit=50

Get notification delivery history.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "channel": "slack",
      "alertLevel": "critical",
      "alertType": "errors",
      "title": "High Error Rate",
      "message": "Error rate: 12.5%",
      "status": "sent",
      "sentAt": "2025-01-01T00:00:00Z",
      "createdAt": "2025-01-01T00:00:00Z"
    }
  ],
  "meta": {
    "count": 1,
    "limit": 50
  }
}
```

### 4. Alert Monitoring Integration

#### GET /api/monitoring/alerts?notify=true

Fetch alerts and optionally send notifications.

**Query Parameters:**
- `level`: Filter by alert level (info, warning, critical)
- `type`: Filter by alert type (performance, errors, traffic, significance)
- `notify`: If true, send notifications for alerts

#### POST /api/monitoring/alerts

Manually trigger notifications.

**Request Body:**
```json
{
  "userId": "user123",
  "level": "critical",
  "type": "errors",
  "title": "High Error Rate Detected",
  "message": "Variant B has error rate of 15%",
  "experimentName": "checkout-flow-test",
  "variantName": "variant-b",
  "metric": "errorRate",
  "value": 0.15,
  "threshold": 0.10
}
```

## Integration Guides

### Slack Integration

1. **Create Incoming Webhook:**
   - Go to your Slack workspace settings
   - Navigate to Apps > Incoming Webhooks
   - Create a new webhook for your channel
   - Copy the webhook URL

2. **Configure in Fred Carey:**
   ```bash
   POST /api/notifications/config
   {
     "channel": "slack",
     "webhookUrl": "https://hooks.slack.com/services/YOUR/WEBHOOK/URL",
     "alertLevels": ["warning", "critical"]
   }
   ```

3. **Test the Integration:**
   ```bash
   POST /api/notifications/test
   {
     "configId": "your-config-id"
   }
   ```

4. **Message Format:**
   - Slack messages include structured blocks with:
     - Alert level emoji (🚨 critical, ⚠️ warning, ℹ️ info)
     - Experiment and variant details
     - Metric values and thresholds
     - Color-coded attachments

### PagerDuty Integration

1. **Create Integration:**
   - In PagerDuty, go to Services
   - Select your service or create a new one
   - Add an integration: Events API v2
   - Copy the Integration Key (routing key)

2. **Configure in Fred Carey:**
   ```bash
   POST /api/notifications/config
   {
     "channel": "pagerduty",
     "routingKey": "YOUR_ROUTING_KEY",
     "alertLevels": ["critical"]
   }
   ```

3. **Test the Integration:**
   ```bash
   POST /api/notifications/test
   {
     "configId": "your-config-id"
   }
   ```

4. **Incident Details:**
   - PagerDuty incidents include:
     - Severity mapping (info, warning, error, critical)
     - Deduplication keys for event grouping
     - Custom details with experiment metrics
     - Links to monitoring dashboard

## Alert Types

### 1. Performance Alerts

Triggered when latency exceeds thresholds:
- **Warning:** P95 latency > 2000ms
- **Critical:** P95 latency > 5000ms

```json
{
  "level": "warning",
  "type": "performance",
  "message": "Elevated P95 latency: 2500ms",
  "metric": "p95LatencyMs",
  "value": 2500,
  "threshold": 2000
}
```

### 2. Error Alerts

Triggered when error rates exceed thresholds:
- **Warning:** Error rate > 5%
- **Critical:** Error rate > 10%

```json
{
  "level": "critical",
  "type": "errors",
  "message": "Critical error rate: 12.50%",
  "metric": "errorRate",
  "value": 0.125,
  "threshold": 0.10
}
```

### 3. Traffic Alerts

Triggered when traffic distribution deviates from expected:
- **Warning:** Actual traffic < 10% of expected

```json
{
  "level": "warning",
  "type": "traffic",
  "message": "Low traffic: 5.2% (expected 50%)",
  "metric": "trafficPercentage",
  "value": 0.052,
  "threshold": 0.05
}
```

### 4. Statistical Significance Alerts

Triggered when A/B test reaches statistical significance:

```json
{
  "level": "info",
  "type": "significance",
  "message": "Experiment reached 95% confidence",
  "experimentName": "checkout-flow-test",
  "variantName": "variant-b"
}
```

## Notification Service Architecture

### Service Modules

```
lib/notifications/
├── index.ts          # Main dispatcher and orchestration
├── types.ts          # TypeScript type definitions
├── slack.ts          # Slack webhook implementation
├── pagerduty.ts      # PagerDuty Events API implementation
└── email.ts          # Email service (planned)
```

### Key Functions

#### `sendNotification(payload: NotificationPayload)`

Main entry point for sending notifications. Handles:
- Fetching user configurations
- Filtering by alert level
- Parallel delivery to all enabled channels
- Logging all attempts

#### `sendSlackNotification(webhookUrl, payload)`

Sends formatted Slack message with:
- Rich block formatting
- Color-coded attachments
- Metric details and thresholds
- Experiment context

#### `sendPagerDutyNotification(routingKey, payload)`

Triggers PagerDuty incident with:
- Severity mapping
- Deduplication keys
- Custom details payload
- Dashboard links

## Usage Examples

### Programmatic Notification

```typescript
import { sendNotification } from "@/lib/notifications";

const payload = {
  userId: "user123",
  level: "critical",
  type: "errors",
  title: "High Error Rate Detected",
  message: "Variant B experiencing 15% error rate",
  experimentName: "checkout-flow-test",
  variantName: "variant-b",
  metric: "errorRate",
  value: 0.15,
  threshold: 0.10,
};

const results = await sendNotification(payload);
console.log(`Sent to ${results.filter(r => r.success).length} channels`);
```

### API Trigger

```bash
curl -X POST https://your-app.com/api/monitoring/alerts \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user123",
    "level": "critical",
    "type": "errors",
    "title": "High Error Rate",
    "message": "Error rate: 15%",
    "experimentName": "checkout-test",
    "variantName": "variant-b",
    "metric": "errorRate",
    "value": 0.15,
    "threshold": 0.10
  }'
```

### Auto-Notification from Monitoring

```bash
# Fetch alerts and auto-notify configured channels
curl https://your-app.com/api/monitoring/alerts?notify=true
```

## Security Considerations

1. **Webhook URLs:** Stored securely, only partial display in API responses
2. **API Keys:** Encrypted at rest, never returned in API responses
3. **Row-Level Security:** Users can only access their own configurations
4. **Authentication Required:** All endpoints require server-side auth
5. **Input Validation:** All inputs validated before database operations

## Monitoring & Observability

### Notification Logs

All notification attempts are logged to `notification_logs` table:
- Delivery status (pending, sent, failed)
- Error messages for failed attempts
- Response data from external services
- Retry attempt counts

### Metrics to Track

- Notification success rate by channel
- Average delivery latency
- Failed notification rate
- Alert volume by type and level

### Troubleshooting

#### Slack Notifications Not Arriving

1. Verify webhook URL is correct
2. Check notification config is enabled
3. Verify alert level matches config
4. Review notification logs for errors

```sql
SELECT * FROM notification_logs
WHERE user_id = 'user123'
  AND status = 'failed'
ORDER BY created_at DESC
LIMIT 10;
```

#### PagerDuty Incidents Not Creating

1. Verify routing key is correct
2. Check PagerDuty service is active
3. Review integration settings in PagerDuty
4. Check notification logs for API errors

## Future Enhancements

- Email notification support
- SMS/Twilio integration
- Custom webhook destinations
- Notification batching/throttling
- User preference UI in dashboard
- Notification scheduling (quiet hours)
- Alert acknowledgment tracking
- Notification templates

## Migration

Run the database migration:

```bash
# Apply migration
psql $DATABASE_URL < lib/db/migrations/012_notification_configs.sql
```

## Testing

### Test Slack Integration

```typescript
import { testSlackWebhook } from "@/lib/notifications/slack";

const result = await testSlackWebhook("https://hooks.slack.com/...");
console.log(result.success ? "Success!" : `Failed: ${result.error}`);
```

### Test PagerDuty Integration

```typescript
import { testPagerDutyIntegration } from "@/lib/notifications/pagerduty";

const result = await testPagerDutyIntegration("your-routing-key");
console.log(result.success ? "Success!" : `Failed: ${result.error}`);
```

## Support

For issues or questions:
- Check notification logs: `/api/notifications/logs`
- Review database logs: `notification_logs` table
- Test configuration: `/api/notifications/test`
- Verify channel credentials in external service
