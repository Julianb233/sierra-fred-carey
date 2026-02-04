# Notification API Quick Reference

## Endpoints

### Slack
```bash
POST /api/notifications/slack
GET  /api/notifications/slack?userId={userId}
```

### PagerDuty
```bash
POST /api/notifications/pagerduty
GET  /api/notifications/pagerduty?userId={userId}
```

---

## Quick Examples

### Slack - Send Alert
```typescript
await fetch('/api/notifications/slack', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: 'user-123',           // OR webhookUrl
    level: 'critical',            // info | warning | critical
    type: 'errors',               // performance | errors | traffic | significance
    title: 'Error Alert',
    message: 'Something went wrong'
  })
});
```

### PagerDuty - Trigger Incident
```typescript
await fetch('/api/notifications/pagerduty', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: 'user-123',           // OR routingKey
    level: 'critical',
    type: 'errors',
    title: 'Service Down',
    message: 'API is not responding'
  })
});
```

### PagerDuty - Resolve Incident
```typescript
await fetch('/api/notifications/pagerduty', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: 'user-123',
    action: 'resolve',
    dedupKey: 'errors-production-all-api'
  })
});
```

---

## Required Fields

### Slack POST
- `level` (info|warning|critical)
- `type` (performance|errors|traffic|significance)
- `title` (string)
- `message` (string)
- `userId` OR `webhookUrl` (one required)

### PagerDuty POST (Trigger)
- Same as Slack, but `userId` OR `routingKey`

### PagerDuty POST (Resolve)
- `action: 'resolve'`
- `dedupKey` (string)
- `userId` OR `routingKey`

---

## Response Format

### Success (200)
```json
{
  "success": true,
  "data": {
    "channel": "slack|pagerduty",
    "timestamp": "2024-12-28T12:00:00.000Z",
    "incidentKey": "..." // PagerDuty only
  }
}
```

### Error (400/404/500)
```json
{
  "success": false,
  "error": "Error message",
  "details": "Additional details"
}
```

---

## TypeScript Types

```typescript
import {
  SlackNotificationRequest,
  PagerDutyNotificationRequest
} from '@/app/api/notifications/types';

const slackRequest: SlackNotificationRequest = {
  userId: 'user-123',
  level: 'warning',
  type: 'performance',
  title: 'Slow API',
  message: 'Response time increased',
  metric: 'latency',
  value: 2000,
  threshold: 1000
};
```

---

## Database Tables

### notification_configs
Store user notification preferences and credentials.

```sql
SELECT * FROM notification_configs
WHERE user_id = 'user-123'
  AND channel = 'slack'
  AND enabled = true;
```

### notification_logs
Audit log of all notifications sent.

```sql
SELECT * FROM notification_logs
WHERE user_id = 'user-123'
ORDER BY created_at DESC
LIMIT 10;
```

---

## Files

**Endpoints**:
- `app/api/notifications/slack/route.ts`
- `app/api/notifications/pagerduty/route.ts`
- `app/api/notifications/types.ts`

**Services**:
- `lib/notifications/slack.ts`
- `lib/notifications/pagerduty.ts`
- `lib/notifications/index.ts`

**Full Documentation**: `docs/NOTIFICATION_API.md`
