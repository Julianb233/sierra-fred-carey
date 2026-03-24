# Twilio Setup Guide — Sahara SMS Integration

## What Fred Needs to Provide

### 1. Twilio Account Credentials
Go to [Twilio Console](https://console.twilio.com/) → Account Info:
- **Account SID** (starts with `AC`)
- **Auth Token** (click to reveal)

### 2. Messaging Service
Go to Twilio Console → Messaging → Services:
- If no service exists, create one (name: "Sahara" or "Fred SMS")
- Add a phone number to the service (toll-free recommended for A2P)
- Copy the **Messaging Service SID** (starts with `MG`)

### 3. Configure Webhooks
In the Messaging Service settings → Integration:
- **Incoming Messages URL:** `https://joinsahara.com/api/sms/webhook` (POST)
- **Status Callback URL:** `https://joinsahara.com/api/sms/status` (POST)

Or if using a phone number directly (not Messaging Service):
- Go to Phone Numbers → Active Numbers → Select Number
- Under Messaging → "A MESSAGE COMES IN":
  - Webhook: `https://joinsahara.com/api/sms/webhook`
  - HTTP POST

## Environment Variables to Set in Vercel

```
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_MESSAGING_SERVICE_SID=MG...
```

Set these in [Vercel Dashboard](https://vercel.com/) → Settings → Environment Variables.
Apply to Production, Preview, and Development environments.

## Verification Checklist

After setting credentials, hit the health check:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://joinsahara.com/api/sms/health
```

Expected response:
```json
{
  "status": "healthy",
  "envVars": { ... all set: true ... },
  "connectivity": { "ok": true },
  "webhookUrls": {
    "inbound": "https://joinsahara.com/api/sms/webhook",
    "statusCallback": "https://joinsahara.com/api/sms/status"
  }
}
```

## SMS Features Enabled

| Feature | Endpoint | Schedule |
|---------|----------|----------|
| Weekly check-ins | `/api/cron/weekly-checkin` | Mondays 7am PT |
| Daily guidance (Pro+) | `/api/cron/daily-guidance` | Daily 8am PT |
| Phone verification | `/api/sms/verify` | On demand |
| Inbound replies | `/api/sms/webhook` | Real-time |
| Delivery tracking | `/api/sms/status` | Real-time |
| FRED conversations | via webhook | Real-time |
| STOP/START compliance | via webhook | Real-time |

## Database Tables

Three tables are required (migration: `20260324000001_sms_tables.sql`):
- `sms_checkins` — outbound/inbound message log with delivery tracking
- `user_sms_preferences` — per-user phone, schedule, consent
- `phone_verifications` — verification codes for phone ownership

Run the migration if tables don't exist:
```bash
supabase db push
```

## A2P 10DLC Compliance (US)

If using a US long code (10-digit number), register for A2P 10DLC:
1. Register your brand in Twilio Console → Messaging → Compliance
2. Register your campaign (use case: "Customer Care" or "Mixed")
3. Wait for carrier approval (usually 1-3 business days)

Toll-free numbers bypass 10DLC requirements but have lower throughput.
