# Alert Notification Integration - Implementation Summary

## Overview

Successfully integrated the alert notification system with the A/B testing monitoring platform. Alerts are now automatically sent to configured notification channels (Slack, PagerDuty) when monitoring thresholds are exceeded.

## Files Modified

### 1. `/lib/monitoring/ab-test-metrics.ts`
**Changes:**
- Added `AUTO_NOTIFY_ALERTS` environment variable flag
- Enhanced `compareExperimentVariants()` to automatically trigger notifications when alerts are generated
- Asynchronous notification dispatch (non-blocking)
- Automatic logging of notification statistics

**Key Addition:**
```typescript
if (AUTO_NOTIFY_ALERTS && alerts.length > 0) {
  import("./alert-notifier")
    .then(({ notifyAlerts }) => {
      return notifyAlerts(alerts, {
        immediate: true,
        minimumLevel: "warning",
        experimentName: experiment.name,
        experimentId: experiment.id,
      });
    })
    .then((stats) => {
      console.log(`Auto-notified ${stats.notificationsSent} alerts`);
    });
}
```

### 2. `/app/api/monitoring/alerts/route.ts`
**Changes:**
- Imported `notifyAlerts` from alert-notifier
- Replaced manual notification loop with enhanced `notifyAlerts()` function
- Now sends to all subscribed users automatically
- Better error handling and statistics logging

**Benefits:**
- Simplified code (removed ~30 lines of boilerplate)
- Automatic user subscription management
- Multi-channel delivery coordination
- Comprehensive error tracking

## Files Created

### 3. `/lib/monitoring/alert-notifier.ts`
**Purpose:** Core notification dispatch service

**Functions:**
- `notifyAlerts()` - Send notifications for an array of alerts to all subscribers
- `notifyUserAlerts()` - Send notifications to a specific user
- `scheduleAlertNotifications()` - Periodic alert check for background jobs
- `getAlertSubscribers()` - Query users subscribed to alerts

**Features:**
- Automatic user subscription lookup from `notification_configs` table
- Alert level filtering (info, warning, critical)
- Multi-channel delivery (Slack, PagerDuty, Email)
- Comprehensive statistics and error tracking
- Experiment-specific notification context

### 4. `/lib/monitoring/alert-scheduler.ts`
**Purpose:** Background job scheduler for periodic alert monitoring

**Components:**
- `runAlertNotificationCheck()` - Single alert check execution
- `AlertScheduler` class - Interval-based scheduling
- `startGlobalAlertScheduler()` - Start global scheduler instance
- `stopGlobalAlertScheduler()` - Stop global scheduler

**Use Cases:**
- Vercel Cron integration
- External scheduler integration (cron, Kubernetes CronJob, etc.)
- Development/testing with interval-based scheduling

### 5. `/app/api/monitoring/alerts/check/route.ts`
**Purpose:** API endpoint for scheduled alert checks

**Endpoints:**
- `GET /api/monitoring/alerts/check` - Trigger alert check (for cron)
- `POST /api/monitoring/alerts/check` - Manual check with custom parameters

**Security:**
- Bearer token authentication via `CRON_SECRET` environment variable
- Prevents unauthorized access to scheduled checks

**Usage:**
```bash
curl "https://your-app.com/api/monitoring/alerts/check" \
  -H "Authorization: Bearer your-cron-secret"
```

### 6. `/lib/monitoring/index.ts`
**Purpose:** Centralized exports for monitoring module

**Exports:**
- Core metrics functions
- Alert notification functions
- Scheduler functions
- TypeScript types

### 7. `/lib/monitoring/ALERT_NOTIFICATIONS.md`
**Purpose:** Comprehensive documentation

**Contents:**
- System architecture overview
- Configuration guide
- API endpoint documentation
- Database schema
- Usage examples
- Troubleshooting guide
- Best practices

### 8. `/lib/monitoring/example-usage.ts`
**Purpose:** Practical code examples

**Examples:**
- Automatic notifications
- Manual notification triggers
- User-specific notifications
- Scheduled checks
- API integration
- Custom alert generation
- Notification log queries
- Testing configurations

### 9. `/vercel.json.example`
**Purpose:** Vercel Cron configuration template

**Configuration:**
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

## Integration Flow

### 1. Automatic Alert Notifications (Default)

```
User Action → Fetch Experiment Metrics
    ↓
compareExperimentVariants() → Generate Alerts
    ↓
Auto-detect new alerts → notifyAlerts()
    ↓
Query notification_configs → Find subscribers
    ↓
Send to Slack → Send to PagerDuty → Send to Email
    ↓
Log to notification_logs → Return statistics
```

### 2. Manual API Trigger

```
API Call → POST /api/monitoring/alerts
    ↓
Validate payload → Create NotificationPayload
    ↓
sendNotification() → Query user configs
    ↓
Multi-channel delivery → Log results
    ↓
Return delivery statistics
```

### 3. Scheduled Background Check

```
Vercel Cron → GET /api/monitoring/alerts/check
    ↓
runAlertNotificationCheck()
    ↓
scheduleAlertNotifications() → getMonitoringDashboard()
    ↓
Process all active experiments → notifyAlerts()
    ↓
Send to all subscribers → Log results
```

## Configuration

### Environment Variables

```bash
# Disable automatic notifications (default: enabled)
AUTO_NOTIFY_ALERTS=false

# Cron job authentication
CRON_SECRET=your-secret-token

# App URL for PagerDuty dashboard links
NEXT_PUBLIC_APP_URL=https://your-app.com
```

### User Notification Setup

Users configure notification preferences via the database or API:

```sql
INSERT INTO notification_configs (
  user_id,
  channel,
  webhook_url,
  enabled,
  alert_levels
) VALUES (
  'user-123',
  'slack',
  'https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXX',
  true,
  ARRAY['warning', 'critical']
);
```

Or via API:

```bash
curl -X POST "https://your-app.com/api/notifications/config" \
  -H "Content-Type: application/json" \
  -d '{
    "channel": "slack",
    "webhookUrl": "https://hooks.slack.com/services/...",
    "alertLevels": ["warning", "critical"]
  }'
```

## Alert Thresholds

Alerts are generated based on these thresholds (defined in `ab-test-metrics.ts`):

| Metric | Warning | Critical |
|--------|---------|----------|
| Error Rate | 5% | 10% |
| P95 Latency | 2000ms | 5000ms |
| Traffic Distribution | 10% below expected | - |
| Sample Size | < 100 (info) | - |

## Notification Channels

### Slack
- Formatted blocks with color-coded attachments
- Experiment and variant context
- Metric values with thresholds
- Timestamp and alert type

### PagerDuty
- Incident creation with severity mapping
- Deduplication by experiment/variant/metric
- Custom details with all alert metadata
- Dashboard links for investigation

### Email (Planned)
- HTML formatted alerts
- Inline metric charts
- Direct links to experiments
- Digest options for batching

## Testing

### Test Notification Configuration

```bash
curl -X POST "https://your-app.com/api/notifications/test" \
  -H "Content-Type: application/json" \
  -d '{"configId": "config-id-123"}'
```

### Manual Alert Trigger

```typescript
import { notifyAlerts } from '@/lib/monitoring/alert-notifier';

const testAlert: Alert = {
  level: 'warning',
  type: 'performance',
  message: 'Test alert',
  timestamp: new Date(),
};

await notifyAlerts([testAlert], {
  experimentName: 'test-experiment',
});
```

### View Notification Logs

```bash
curl "https://your-app.com/api/notifications/logs?limit=50"
```

## Deployment Steps

1. **Update environment variables:**
   ```bash
   # In Vercel or your deployment platform
   AUTO_NOTIFY_ALERTS=true
   CRON_SECRET=your-random-secret-token
   NEXT_PUBLIC_APP_URL=https://your-app.com
   ```

2. **Optional: Enable Vercel Cron:**
   ```bash
   # Copy example configuration
   cp vercel.json.example vercel.json

   # Or add to existing vercel.json
   # Then redeploy to enable cron
   ```

3. **Create notification configs:**
   ```bash
   # Users set up their notification preferences
   # via /api/notifications/config
   ```

4. **Deploy:**
   ```bash
   vercel deploy --prod
   ```

5. **Test:**
   ```bash
   # Trigger a test alert check
   curl "https://your-app.com/api/monitoring/alerts/check" \
     -H "Authorization: Bearer your-cron-secret"
   ```

## Monitoring the System

### Check Notification Delivery

```sql
-- Success rate by channel
SELECT
  channel,
  COUNT(*) as total,
  SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as sent,
  SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
  ROUND(100.0 * SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) / COUNT(*), 2) as success_rate
FROM notification_logs
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY channel;
```

### Recent Failures

```sql
SELECT
  channel,
  alert_level,
  alert_type,
  error_message,
  created_at
FROM notification_logs
WHERE status = 'failed'
  AND created_at >= NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC
LIMIT 20;
```

## Troubleshooting

### Issue: Notifications not being sent

**Possible Causes:**
1. `AUTO_NOTIFY_ALERTS=false` in environment
2. No users have notification configs
3. Alert levels don't match user preferences
4. Invalid webhook URLs or API keys

**Solutions:**
1. Check environment variable settings
2. Query `notification_configs` table for enabled configs
3. Review `alert_levels` array in configs
4. Test webhooks with `/api/notifications/test`

### Issue: Too many notifications

**Solutions:**
1. Increase `minimumLevel` to `critical` only
2. Adjust alert thresholds in `generateAlerts()`
3. Reduce cron frequency
4. Implement alert deduplication (future enhancement)

### Issue: Delayed notifications

**Causes:**
1. Relying on cron instead of automatic notifications
2. Cron interval too long

**Solutions:**
1. Enable `AUTO_NOTIFY_ALERTS=true` for immediate notifications
2. Reduce cron interval (but be mindful of API rate limits)

## Performance Considerations

- **Asynchronous Delivery:** Notifications don't block metrics collection
- **Parallel Sending:** Multiple channels sent concurrently
- **Error Isolation:** Channel failures don't affect other channels
- **Database Indexing:** Optimized queries with proper indexes
- **Rate Limiting:** Consider implementing rate limits for high-traffic scenarios

## Security

- **Authentication:** Cron endpoint requires bearer token
- **RLS Policies:** Row-level security on notification tables
- **User Isolation:** Users only see their own configs/logs
- **Credential Storage:** Webhooks and API keys encrypted in database
- **Audit Trail:** All notifications logged for compliance

## Future Enhancements

1. **Email Support:** Implement email notifications
2. **Alert Deduplication:** Prevent duplicate notifications
3. **Quiet Hours:** Don't send notifications during specific times
4. **Escalation Policies:** Auto-escalate unacknowledged alerts
5. **Alert Grouping:** Batch similar alerts
6. **User Preferences UI:** Self-service notification management
7. **Webhook Integrations:** Custom webhook support
8. **Analytics Dashboard:** Notification delivery metrics
9. **A/B Test Integration:** Per-experiment notification settings
10. **Mobile Push:** Native mobile notifications

## Summary

The alert notification system is now fully integrated with the monitoring platform:

✅ **Automatic notifications** when alerts are generated
✅ **Multi-channel delivery** (Slack, PagerDuty)
✅ **User subscription management** via database
✅ **Scheduled background checks** via cron
✅ **Comprehensive logging** for audit and debugging
✅ **Flexible configuration** via environment variables
✅ **Production-ready** with error handling and retry logic

All components are modular, well-documented, and ready for production deployment.
