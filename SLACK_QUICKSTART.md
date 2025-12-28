# Slack Webhook Integration - Quick Start

Get Slack alerts up and running in 5 minutes.

## Prerequisites

- Slack workspace with admin access
- Node.js and npm installed
- PostgreSQL database (for notification configs)

## Step 1: Get Your Slack Webhook URL

1. Go to [https://api.slack.com/apps](https://api.slack.com/apps)
2. Click "Create New App" → "From scratch"
3. Name it (e.g., "Alerts Bot") and select your workspace
4. In the left sidebar, click "Incoming Webhooks"
5. Toggle "Activate Incoming Webhooks" to **On**
6. Click "Add New Webhook to Workspace"
7. Select the channel where you want alerts (e.g., #alerts)
8. Copy the webhook URL (starts with `https://hooks.slack.com/services/...`)

## Step 2: Configure Environment

Add to your `.env` or `.env.local`:

```bash
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
DATABASE_URL=postgresql://user:password@host:5432/database
```

## Step 3: Install Dependencies

```bash
npm install
# This will install tsx needed for testing
```

## Step 4: Test Your Integration

```bash
# Option 1: Using npm script (uses SLACK_WEBHOOK_URL from .env)
npm run test:slack

# Option 2: Direct webhook URL
npm run test:slack https://hooks.slack.com/services/YOUR/WEBHOOK/URL
```

You should see:
```
✅ Test notification sent successfully
✅ Info alert sent successfully
✅ Warning alert sent successfully
✅ Critical alert sent successfully
🎉 All tests passed!
```

And receive 4 test messages in your Slack channel.

## Step 5: Send Your First Alert

### Option A: Via API Endpoint

```bash
curl -X POST http://localhost:3000/api/notifications/slack \
  -H "Content-Type: application/json" \
  -d '{
    "webhookUrl": "https://hooks.slack.com/services/YOUR/WEBHOOK/URL",
    "level": "info",
    "type": "significance",
    "title": "My First Alert",
    "message": "Slack integration is working!"
  }'
```

### Option B: In Your Code

```typescript
import { sendSlackNotification } from '@/lib/notifications/slack';

await sendSlackNotification(
  process.env.SLACK_WEBHOOK_URL!,
  {
    userId: 'user123',
    level: 'warning',
    type: 'performance',
    title: 'API Latency High',
    message: 'Response time exceeded threshold',
    metric: 'p95_latency',
    value: 650,
    threshold: 500
  }
);
```

### Option C: Auto-Route to User's Channel

```typescript
import { sendNotification } from '@/lib/notifications';

// Automatically sends to all enabled channels for this user
await sendNotification({
  userId: 'user123',
  level: 'critical',
  type: 'errors',
  title: 'High Error Rate',
  message: 'Error rate exceeded 5%',
  metric: 'error_rate',
  value: 7.2,
  threshold: 5.0
});
```

## Step 6: Create User Config (Optional)

Create a database config so users can manage their own webhooks:

```bash
curl -X POST http://localhost:3000/api/notifications/config \
  -H "Content-Type: application/json" \
  -d '{
    "channel": "slack",
    "webhookUrl": "https://hooks.slack.com/services/YOUR/WEBHOOK/URL",
    "alertLevels": ["warning", "critical"]
  }'
```

Now alerts sent via `sendNotification({ userId: 'user123', ... })` will automatically route to this user's Slack channel.

## Common Alert Patterns

### Performance Alert
```typescript
await sendNotification({
  userId: 'user123',
  level: 'warning',
  type: 'performance',
  title: 'API Latency Increased',
  message: 'P95 latency exceeded 500ms',
  metric: 'p95_latency_ms',
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
  message: 'Error rate spiked to 8%',
  metric: 'error_rate',
  value: 8.0,
  threshold: 2.0
});
```

### Experiment Result
```typescript
await sendNotification({
  userId: 'user123',
  level: 'info',
  type: 'significance',
  title: 'Experiment Reached Significance',
  message: 'Variant B shows 15% improvement',
  experimentName: 'checkout-optimization',
  variantName: 'variant-b',
  metric: 'conversion_rate',
  value: 4.6,
  threshold: 4.0
});
```

## Troubleshooting

### "Invalid Slack webhook URL format"
- Ensure URL starts with `https://hooks.slack.com/services/`
- Check for typos or missing parts of the URL

### "Failed to send notification"
- Verify webhook URL is correct
- Check that the Slack app hasn't been removed from the workspace
- Ensure channel still exists

### "tsx: command not found"
```bash
npm install
# or
npm install -D tsx
```

### Messages not appearing
- Check the correct channel in Slack workspace
- Verify webhook is activated in Slack app settings
- Test with the simple test script first

## Next Steps

1. **Read Full Documentation**: See `/docs/SLACK_INTEGRATION.md` for complete API reference
2. **View Examples**: Check `/examples/slack-alerts-integration.ts` for 12 integration examples
3. **Set Up Monitoring**: Integrate with your monitoring system using `/lib/monitoring/alerts.ts`
4. **Configure Multiple Channels**: Add PagerDuty, Email, or multiple Slack channels
5. **View Logs**: Check notification history at `/api/notifications/logs`

## Files Reference

| File | Purpose |
|------|---------|
| `/app/api/notifications/slack/route.ts` | Slack API endpoint |
| `/lib/notifications/slack.ts` | Slack service implementation |
| `/lib/monitoring/alerts.ts` | Monitoring integration helpers |
| `/scripts/test-slack-webhook.ts` | Test utility |
| `/examples/slack-alerts-integration.ts` | 12 usage examples |
| `/docs/SLACK_INTEGRATION.md` | Complete documentation |

## Support

For issues or questions:
1. Check `/docs/SLACK_INTEGRATION.md`
2. Review `/examples/slack-alerts-integration.ts`
3. Test with `npm run test:slack`
4. Check notification logs via API

---

**Congratulations!** Your Slack integration is ready. Start sending alerts to keep your team informed.
