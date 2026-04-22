# WhatsApp Monitor Runbook

Troubleshooting and operations guide for the Sahara WhatsApp Feedback Monitor (`trigger/sahara-whatsapp-monitor.ts`).

## Overview

The monitor runs twice daily (9 AM / 5 PM UTC) via Trigger.dev to:
1. Open WhatsApp Web via BrowserBase (persistent auth context)
2. Extract messages from "Sahara Founders" group
3. Use Claude AI to identify actionable feedback
4. Create Linear issues automatically
5. Send status reports via SMS (Twilio) and email (Resend)

**Schedule:** `0 9,17 * * *`
**Max Duration:** 10 minutes
**Retries:** 2 attempts, exponential backoff (10s-60s)

---

## Quick Diagnosis

### Check if the monitor is running

```bash
# Trigger.dev dashboard
open https://cloud.trigger.dev

# Check last run in Supabase state table
curl -s "${NEXT_PUBLIC_SUPABASE_URL}/rest/v1/whatsapp_monitor_state?group_name=eq.Sahara%20Founders&select=last_check_at" \
  -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}"
```

### Check system health

```bash
# AI providers
curl -s https://joinsahara.com/api/health/ai

# Basic health
curl -s https://joinsahara.com/api/health
```

---

## Common Issues

### 1. BrowserBase Session Fails to Create

**Symptoms:** Error: `BrowserBase session creation failed: 4xx/5xx`

**Diagnosis:**
- Check BrowserBase API key: `BROWSERBASE_API_KEY`
- Check project ID: `BROWSERBASE_PROJECT_ID`
- Verify BrowserBase account status at https://www.browserbase.com

**Fix:**
1. Verify env vars are set in Trigger.dev environment
2. Check BrowserBase dashboard for rate limits or account issues
3. If persistent context expired, create a new one:
   - Run a manual BrowserBase session
   - Log into WhatsApp Web (scan QR)
   - Note the new context ID
   - Update `BROWSERBASE_CONTEXT_ID` in the task (`ed424c84-729a-49f3-bfe2-811d5cda5282`)

### 2. WhatsApp QR Code Re-scan Required

**Symptoms:** Monitor extracts 0 messages; Stagehand sees QR code instead of chat list

**Diagnosis:** WhatsApp Web session expired (typically every 14 days of inactivity or if the phone app logs out the session).

**Fix:**
1. Create a manual BrowserBase session with the existing context ID
2. Navigate to `web.whatsapp.com`
3. Scan the QR code from the linked phone
4. Verify the "Sahara Founders" group is visible
5. Close the session (context persists automatically)

No code change needed -- the persistent context stores cookies across sessions.

### 3. Anthropic API Fails (Issue Identification)

**Symptoms:** `Anthropic API failed: 4xx/5xx` or 0 issues identified from many messages

**Diagnosis:**
```bash
# Test API key
curl -s https://api.anthropic.com/v1/messages \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "Content-Type: application/json" \
  -d '{"model":"claude-sonnet-4-20250514","max_tokens":10,"messages":[{"role":"user","content":"ping"}]}'
```

**Fix:**
- 401: Rotate `ANTHROPIC_API_KEY` in Trigger.dev env
- 429: Rate limit hit -- monitor will retry automatically
- 500: Anthropic outage -- check https://status.anthropic.com

### 4. Linear Issue Creation Fails

**Symptoms:** Messages extracted and issues identified, but `linearIssuesCreated` is empty

**Diagnosis:**
```bash
# Verify team exists
curl -s -X POST https://api.linear.app/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: $LINEAR_API_KEY" \
  -d '{"query": "{ teams(filter: { name: { eq: \"Ai Acrobatics\" } }) { nodes { id name } } }"}'
```

**Fix:**
- If team not found: team was renamed -- update `LINEAR_TEAM` constant in the task
- If 401: rotate `LINEAR_API_KEY`
- If duplicate detection: the idempotency guards (AI-4120) should prevent exact duplicates, but similar issues from different messages will still be created

### 5. SMS/Email Notifications Not Sent

**Symptoms:** `reportSent: false` or errors in the result

**SMS (Twilio):**
```bash
# Check Twilio credentials
curl -s "https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}.json" \
  -u "${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}"
```
- Verify `TWILIO_MESSAGING_SERVICE_SID` is set
- Check Twilio console for message delivery status

**Email (Resend):**
- Verify `RESEND_API_KEY` is set
- Check sender domain verification at https://resend.com/domains
- `RESEND_FROM_EMAIL` must match a verified domain

### 6. Supabase State Table Missing

**Symptoms:** `getLastCheckTimestamp` always returns null; monitor reprocesses old messages

**Fix:** Create the table:
```sql
CREATE TABLE IF NOT EXISTS whatsapp_monitor_state (
  group_name TEXT PRIMARY KEY,
  last_check_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  context_id TEXT
);
```

### 7. Duplicate Feedback Signals

**Symptoms:** Same feedback inserted multiple times after retries

**Fix:** This is addressed by AI-4120 idempotency guards:
- `feedback_signals` has a unique index on `(user_id, message_id, signal_type)` for non-null message_id
- `insertFeedbackSignal` performs check-then-insert with 23505 race condition handling
- `insertFeedbackInsight` deduplicates by title + type within 4-hour window

---

## Environment Variables

All must be set in the Trigger.dev environment:

| Variable | Service | Required |
|----------|---------|----------|
| `BROWSERBASE_API_KEY` | BrowserBase | Yes |
| `BROWSERBASE_PROJECT_ID` | BrowserBase | Yes |
| `ANTHROPIC_API_KEY` | Claude AI | Yes |
| `LINEAR_API_KEY` | Linear | Yes |
| `TWILIO_ACCOUNT_SID` | Twilio SMS | Yes |
| `TWILIO_AUTH_TOKEN` | Twilio SMS | Yes |
| `TWILIO_MESSAGING_SERVICE_SID` | Twilio SMS | Yes |
| `RESEND_API_KEY` | Resend Email | Yes |
| `RESEND_FROM_EMAIL` | Resend Email | Optional (default: sahara@aiacrobatics.com) |
| `RESEND_FROM_NAME` | Resend Email | Optional (default: Sahara) |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase | Yes |
| `JULIAN_PHONE` | Notification target | Optional (default: +16265226199) |
| `JULIAN_EMAIL` | Notification target | Optional (default: julian@aiacrobatics.com) |

---

## Cron Schedule Reference

### Trigger.dev (WhatsApp monitor)
| Task | Schedule | Description |
|------|----------|-------------|
| `sahara-whatsapp-monitor` | `0 9,17 * * *` | 2 AM / 10 AM Pacific |

### Vercel Cron (other pipeline jobs)
| Endpoint | Schedule | Description |
|----------|----------|-------------|
| `/api/monitoring/auto-promotion/check` | `0 * * * *` | Hourly A/B test promotion check |
| `/api/cron/daily-guidance` | `0 15 * * *` | 8 AM Pacific daily guidance |
| `/api/cron/weekly-digest` | `0 10 * * 1` | 3 AM Pacific Monday digest |
| `/api/cron/weekly-checkin` | `0 14 * * 1` | 7 AM Pacific Monday check-in |
| `/api/cron/feedback-digest` | `0 10 * * 1` | 3 AM Pacific Monday feedback digest |
| `/api/cron/re-engagement` | `0 14 * * *` | 7 AM Pacific daily re-engagement |
| `/api/cron/next-steps-reminders` | `0 15 * * *` | 8 AM Pacific daily reminders |

---

## Escalation Path

1. **Automated:** Monitor retries automatically (2 attempts with exponential backoff)
2. **SMS alert:** On failure, `sendErrorNotification` texts Julian
3. **Manual triage:** Check Trigger.dev dashboard for logs and error details
4. **Code fix needed:** File an issue with label `pipeline` in the Sahara Linear project

**Contacts:**
- Julian Bradley (AI Acrobatics): julian@aiacrobatics.com / +1 (619) 509-0699
- Fred Cary (Sahara product owner): via WhatsApp group

---

## Manual Run

To trigger the monitor manually outside its schedule:

1. Go to Trigger.dev dashboard
2. Find `sahara-whatsapp-monitor` task
3. Click "Trigger" to run immediately
4. Monitor logs in real-time

Or via Trigger.dev API:
```bash
curl -X POST "https://api.trigger.dev/api/v1/schedules/sahara-whatsapp-monitor/trigger" \
  -H "Authorization: Bearer $TRIGGER_SECRET_KEY" \
  -H "Content-Type: application/json"
```

---

## Architecture

```
Trigger.dev Cron (9 AM / 5 PM UTC)
        |
        v
sahara-whatsapp-monitor.ts
        |
        +---> BrowserBase (persistent auth context)
        |         |
        |         +---> WhatsApp Web
        |         |         |
        |         +---> Stagehand (Gemini 2.0 Flash)
        |                   |
        |                   v
        |         Message Extraction
        |
        +---> Supabase (whatsapp_monitor_state)
        |         - last_check_at
        |         - context_id
        |
        +---> Anthropic Claude (issue identification)
        |         |
        |         v
        |     Identified Issues
        |
        +---> Linear API (issue creation)
        |
        +---> Twilio (SMS report)
        |
        +---> Resend (email report)
```
