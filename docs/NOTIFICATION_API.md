# Notification API Documentation

## Overview

The Notification API provides endpoints for sending alerts to Slack and PagerDuty. These endpoints integrate with the notification configuration system to deliver real-time alerts for monitoring, experiments, and system events.

## Database Tables

### notification_configs

Stores user notification channel configurations.

**Table exists**: Yes (Migration: `012_notification_configs.sql`)

**Columns**:
- `id` (UUID): Primary key
- `user_id` (TEXT): User identifier
- `channel` (TEXT): Channel type (slack, pagerduty, email)
- `webhook_url` (TEXT): Slack webhook URL
- `routing_key` (TEXT): PagerDuty routing/integration key
- `enabled` (BOOLEAN): Whether config is active
- `alert_levels` (TEXT[]): Alert levels to notify for
- `metadata` (JSONB): Additional settings
- `created_at`, `updated_at` (TIMESTAMP)

### notification_logs

Audit log of all notification attempts.

**Table exists**: Yes (Migration: `012_notification_configs.sql`)

---

## Endpoints

### 1. Slack Notifications

#### POST `/api/notifications/slack`

Send alert to Slack webhook.

**Request Body**:
```typescript
{
  webhookUrl?: string;        // Required if userId not provided
  userId?: string;            // User ID to fetch webhook from config
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

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "channel": "slack",
    "timestamp": "2024-01-01T12:00:00.000Z"
  }
}
```

**Error Response** (400/500):
```json
{
  "success": false,
  "error": "Error message",
  "details": "Additional details"
}
```

**Example Usage**:
```typescript
// Using webhook URL directly
const response = await fetch('/api/notifications/slack', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    webhookUrl: 'https://hooks.slack.com/services/XXX/YYY/ZZZ',
    level: 'critical',
    type: 'performance',
    title: 'High Error Rate Detected',
    message: 'Error rate exceeded threshold',
    metric: 'error_rate',
    value: 15.5,
    threshold: 10.0
  })
});

// Using userId to fetch webhook from config
const response = await fetch('/api/notifications/slack', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: 'user-123',
    level: 'warning',
    type: 'traffic',
    title: 'Traffic Spike',
    message: 'Traffic increased by 200%',
    experimentName: 'homepage-redesign'
  })
});
```

#### GET `/api/notifications/slack?userId={userId}`

Get Slack configuration for a user.

**Query Parameters**:
- `userId` (required): User ID

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "userId": "user-123",
    "channel": "slack",
    "webhookUrl": "https://hooks.slack.com/...",
    "enabled": true,
    "alertLevels": ["critical", "warning"],
    "metadata": {},
    "createdAt": "2024-01-01T12:00:00.000Z",
    "updatedAt": "2024-01-01T12:00:00.000Z"
  }
}
```

---

### 2. PagerDuty Notifications

#### POST `/api/notifications/pagerduty`

Create or resolve incident in PagerDuty.

**Request Body (Trigger)**:
```typescript
{
  routingKey?: string;        // Required if userId not provided
  userId?: string;            // User ID to fetch routing key from config
  action?: 'trigger';         // Default: 'trigger'
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

**Request Body (Resolve)**:
```typescript
{
  routingKey?: string;        // Required if userId not provided
  userId?: string;            // User ID to fetch routing key from config
  action: 'resolve';
  dedupKey: string;           // Required - incident dedup key to resolve
}
```

**Response (Trigger)** (200 OK):
```json
{
  "success": true,
  "data": {
    "action": "trigger",
    "channel": "pagerduty",
    "incidentKey": "dedup-key-123",
    "timestamp": "2024-01-01T12:00:00.000Z"
  }
}
```

**Response (Resolve)** (200 OK):
```json
{
  "success": true,
  "data": {
    "action": "resolve",
    "dedupKey": "dedup-key-123",
    "channel": "pagerduty",
    "timestamp": "2024-01-01T12:00:00.000Z"
  }
}
```

**Example Usage**:
```typescript
// Trigger incident
const response = await fetch('/api/notifications/pagerduty', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    routingKey: 'R123ABC456DEF789',
    level: 'critical',
    type: 'errors',
    title: 'Database Connection Failed',
    message: 'Unable to connect to primary database',
    experimentName: 'production',
    metric: 'db_connection_errors',
    value: 100
  })
});

// Resolve incident
const response = await fetch('/api/notifications/pagerduty', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    routingKey: 'R123ABC456DEF789',
    action: 'resolve',
    dedupKey: 'errors-production-all-db_connection_errors'
  })
});
```

#### GET `/api/notifications/pagerduty?userId={userId}`

Get PagerDuty configuration for a user.

**Query Parameters**:
- `userId` (required): User ID

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "userId": "user-123",
    "channel": "pagerduty",
    "routingKey": "R123ABC456DEF789",
    "enabled": true,
    "alertLevels": ["critical"],
    "metadata": {},
    "createdAt": "2024-01-01T12:00:00.000Z",
    "updatedAt": "2024-01-01T12:00:00.000Z"
  }
}
```

---

## Alert Levels

- **info**: Informational alerts (blue)
- **warning**: Warning alerts requiring attention (amber)
- **critical**: Critical alerts requiring immediate action (red)

## Alert Types

- **performance**: Performance degradation alerts
- **errors**: Error rate or exception alerts
- **traffic**: Traffic pattern alerts
- **significance**: Statistical significance alerts

---

## Error Handling

All endpoints return appropriate HTTP status codes:

- **200**: Success
- **400**: Bad request (missing/invalid parameters)
- **404**: Resource not found (e.g., no config for user)
- **500**: Server error

Error responses include:
```json
{
  "success": false,
  "error": "Human-readable error message",
  "message": "Technical error details",
  "details": "Additional context"
}
```

---

## Integration Examples

### Monitor API Integration

```typescript
import { NotificationPayload } from '@/lib/notifications/types';

async function sendCriticalAlert(alert: any) {
  // Send to both Slack and PagerDuty
  await Promise.all([
    fetch('/api/notifications/slack', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: alert.userId,
        level: 'critical',
        type: alert.type,
        title: alert.title,
        message: alert.message,
        experimentName: alert.experimentName
      })
    }),
    fetch('/api/notifications/pagerduty', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: alert.userId,
        level: 'critical',
        type: alert.type,
        title: alert.title,
        message: alert.message,
        experimentName: alert.experimentName
      })
    })
  ]);
}
```

### Client-Side Usage

```typescript
// components/AlertButton.tsx
import { SlackNotificationRequest } from '@/app/api/notifications/types';

async function sendTestAlert() {
  const request: SlackNotificationRequest = {
    userId: session.user.id,
    level: 'info',
    type: 'significance',
    title: 'Test Alert',
    message: 'This is a test notification'
  };

  const response = await fetch('/api/notifications/slack', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request)
  });

  const result = await response.json();

  if (result.success) {
    toast.success('Alert sent successfully!');
  } else {
    toast.error(result.error);
  }
}
```

---

## Security Considerations

1. **Webhook URL Validation**: Slack webhook URLs must start with `https://hooks.slack.com/`
2. **Rate Limiting**: Consider implementing rate limiting for notification endpoints
3. **Authentication**: Endpoints should be protected with proper authentication
4. **Sensitive Data**: Webhook URLs and routing keys are stored securely in the database
5. **Row Level Security**: Database policies ensure users can only access their own configs

---

## Related Files

- **Endpoints**:
  - `/root/github-repos/sierra-fred-carey/app/api/notifications/slack/route.ts`
  - `/root/github-repos/sierra-fred-carey/app/api/notifications/pagerduty/route.ts`

- **Types**:
  - `/root/github-repos/sierra-fred-carey/app/api/notifications/types.ts`
  - `/root/github-repos/sierra-fred-carey/lib/notifications/types.ts`

- **Services**:
  - `/root/github-repos/sierra-fred-carey/lib/notifications/slack.ts`
  - `/root/github-repos/sierra-fred-carey/lib/notifications/pagerduty.ts`
  - `/root/github-repos/sierra-fred-carey/lib/notifications/index.ts`

- **Database**:
  - `/root/github-repos/sierra-fred-carey/lib/db/migrations/012_notification_configs.sql`
