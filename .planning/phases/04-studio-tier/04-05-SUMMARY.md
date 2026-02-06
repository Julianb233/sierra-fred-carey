---
phase: 04-studio-tier
plan: 05
subsystem: sms-checkins
tags: [twilio, sms, cron, webhook, accountability]
depends_on:
  requires: ["04-01"]
  provides: ["sms-pipeline", "weekly-checkin-cron", "twilio-webhook"]
  affects: ["04-07"]
tech-stack:
  added: ["twilio@5.12.1"]
  patterns: ["lazy-client-init", "webhook-signature-validation", "cron-with-secret-auth", "idempotent-dispatch"]
key-files:
  created:
    - lib/sms/types.ts
    - lib/sms/client.ts
    - lib/sms/templates.ts
    - lib/sms/webhook-handler.ts
    - lib/sms/scheduler.ts
    - lib/db/sms.ts
    - app/api/sms/webhook/route.ts
    - app/api/cron/weekly-checkin/route.ts
  modified:
    - vercel.json
    - package.json
decisions:
  - id: twilio-lazy-init
    choice: "Lazy-initialized Twilio client following Stripe pattern from lib/stripe/server.ts"
    reason: "Avoids build-time errors when env vars not set; consistent with project patterns"
  - id: sms-160-char-limit
    choice: "Templates enforce 160 character limit with highlight truncation"
    reason: "Single SMS segment reduces cost; highlights gracefully truncate"
  - id: webhook-twiml-on-error
    choice: "Return empty TwiML even on error to prevent Twilio retries"
    reason: "Twilio retries on non-2xx/non-XML responses, which could amplify errors"
  - id: cron-idempotency
    choice: "Skip users who already received outbound check-in this week (ISO week)"
    reason: "Vercel Cron can fire multiple times; prevents duplicate messages"
metrics:
  duration: "5m 40s"
  completed: "2026-02-06"
  tasks: "2/2"
---

# Phase 04 Plan 05: Twilio SMS Weekly Check-ins Summary

**One-liner:** Complete SMS pipeline with Twilio client, weekly cron dispatch, inbound webhook with signature validation, STOP/START compliance, and idempotent scheduling.

## What Was Built

### Task 1: Twilio client, templates, and database operations (9a9e7ae)

**Types (lib/sms/types.ts):**
- `SMSDirection`, `SMSStatus` union types matching DB constraints
- `CheckinRecord` interface mapping to sms_checkins table
- `UserSMSPreferences` interface mapping to user_sms_preferences table
- `WeeklyCheckinResult` for scheduler return value

**Twilio Client (lib/sms/client.ts):**
- Lazy-initialized Twilio client following lib/stripe/server.ts pattern
- `sendSMS(to, body)` sends via Messaging Service SID, returns message SID
- `validateWebhook(signature, url, params)` validates inbound webhook authenticity
- Descriptive errors for missing env vars with setup instructions

**Templates (lib/sms/templates.ts):**
- `getCheckinTemplate(name, highlights?)` - personalized weekly check-in with agent activity highlights, 160 char limit with truncation
- `getWelcomeTemplate(name)` - new subscriber welcome
- `getStopConfirmation()` - unsubscribe confirmation

**Database Operations (lib/db/sms.ts):**
- Full CRUD for sms_checkins: createCheckin, getCheckinHistory, getCheckinByMessageSid, updateCheckinStatus
- User preferences: getUserSMSPreferences, updateSMSPreferences (upsert), getOptedInUsers
- findUserByPhoneNumber for inbound message routing
- Mapper functions for snake_case DB columns to camelCase interfaces

### Task 2: Webhook handler, cron endpoint, and scheduler (99be298)

**Webhook Handler (lib/sms/webhook-handler.ts):**
- `processInboundSMS(from, body)` with phone number normalization (E.164)
- STOP keyword: disables check-ins for user
- START keyword: re-enables check-ins for user
- Links inbound responses to outbound check-ins via parentCheckinId
- Uses ISO week number (date-fns) for week tracking

**Scheduler (lib/sms/scheduler.ts):**
- `sendWeeklyCheckins()` dispatches to all opted-in users
- Idempotency: skips users who already received check-in this ISO week
- Personalization: queries recent agent tasks for activity highlights
- Error isolation: one user failure does not block others
- Returns WeeklyCheckinResult with sent/failed/skipped counts

**Webhook Endpoint (app/api/sms/webhook/route.ts):**
- POST handler for Twilio inbound SMS
- Validates x-twilio-signature header against configured auth token
- Parses application/x-www-form-urlencoded form data
- Returns empty TwiML response (even on error to prevent Twilio retries)
- force-dynamic export to prevent caching

**Cron Endpoint (app/api/cron/weekly-checkin/route.ts):**
- GET handler triggered by Vercel Cron
- Verifies Bearer CRON_SECRET authorization
- Checks Twilio configuration before dispatch
- Returns JSON with sent/failed/skipped counts and duration
- Extensive logging for unattended debugging

**Vercel Config (vercel.json):**
- Added crons array: `/api/cron/weekly-checkin` at `0 14 * * 1` (Monday 2 PM UTC)
- Preserved all existing headers and config

## Verification Results

- TypeScript compilation (tsc --noEmit): PASS - zero errors in all new files
- vercel.json: Valid JSON with both existing headers and new crons array
- Webhook route: validates Twilio signatures, returns TwiML
- Cron route: verifies CRON_SECRET auth
- Build: Environment-level Turbopack temp file issue (pre-existing, not related to code changes)

## Deviations from Plan

None - plan executed exactly as written.

## Architecture Decisions

1. **Lazy Twilio client:** Follows exact pattern from lib/stripe/server.ts - null client, initialize on first use, throw on missing env vars
2. **160 char SMS limit:** Templates truncate highlights to fit single SMS segment; falls back to no-highlights message if too long
3. **TwiML on error:** Returns empty TwiML even in catch block to prevent Twilio retry storms
4. **ISO week idempotency:** Uses date-fns getISOWeek/getISOWeekYear for consistent week numbering across timezone boundaries
5. **Error isolation in scheduler:** Each user processed independently in try/catch; one failure increments failed counter but continues to next user

## Key Links Established

- `app/api/cron/weekly-checkin/route.ts` -> `lib/sms/scheduler.ts` (calls sendWeeklyCheckins)
- `lib/sms/scheduler.ts` -> `lib/sms/client.ts` (sends SMS via Twilio)
- `lib/sms/scheduler.ts` -> `lib/db/agent-tasks.ts` (gets agent activity for highlights)
- `app/api/sms/webhook/route.ts` -> `lib/sms/webhook-handler.ts` (processes inbound messages)
- `lib/sms/webhook-handler.ts` -> `lib/db/sms.ts` (stores inbound messages)

## Environment Variables Required

| Variable | Source |
|----------|--------|
| TWILIO_ACCOUNT_SID | Twilio Console -> Account Info |
| TWILIO_AUTH_TOKEN | Twilio Console -> Account Info |
| TWILIO_MESSAGING_SERVICE_SID | Twilio Console -> Messaging -> Services |
| CRON_SECRET | Generate with `openssl rand -hex 32` |
| NEXT_PUBLIC_APP_URL | App deployment URL (for webhook validation) |

## Next Phase Readiness

- SMS pipeline complete and ready for 04-07 (Studio tier Stripe + SMS settings UI)
- Phone verification flow needed in 04-07 for full end-to-end
- A2P 10DLC registration should be started in Twilio Console (2-4 week lead time)
