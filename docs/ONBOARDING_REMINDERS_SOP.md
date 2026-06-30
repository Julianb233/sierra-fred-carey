# Onboarding Reminders — SOP

**Linear:** AI-3518 · **Owner:** Growth/Lifecycle · **Status:** Live

Automated, graduated email **and** SMS reminders that nudge users who created a
Sahara account but have not finished onboarding. Part of the engagement
automation suite alongside re-engagement, weekly check-ins, and next-steps
reminders.

## How it works

A Vercel cron hits `GET /api/cron/onboarding-reminders` once daily (17:00 UTC /
9am PT). The handler:

1. **Detects candidates** — `profiles.onboarding_completed` is not `true`.
2. **Buckets by account age** into graduated tiers:
   | Tier | Account age | Tone |
   |------|-------------|------|
   | `day1` | 1–2 days | "Finish setup (2 min)" |
   | `day3` | 3–6 days | "Your roadmap is one step away" |
   | `day7` | 7+ days | Soft, no-pressure final nudge |
3. **Sends on every available channel**:
   - **Email** via Resend (`RESEND_API_KEY`) — branded `OnboardingReminderEmail`.
   - **SMS** via Twilio (`TWILIO_ACCOUNT_SID` + `TWILIO_MESSAGING_SERVICE_SID`)
     to users with a **verified, opted-in** phone in `user_sms_preferences`
     (`phone_verified = true AND checkin_enabled = true`).
4. **Respects preferences** — email obeys `profiles.metadata.notification_prefs`
   (master `email` toggle). SMS only goes to opted-in, verified numbers and
   includes a `STOP` opt-out.
5. **Is idempotent** — every `(tier, channel)` send is logged in `email_sends`
   with `email_type = 'onboarding_reminder'` and
   `email_subtype = '<tier>_<channel>'`. A user receives each tier on each
   channel at most once.

## Key files

| File | Role |
|------|------|
| `app/api/cron/onboarding-reminders/route.ts` | Cron handler + dispatch |
| `lib/onboarding-reminders/detector.ts` | Candidate detection + tier logic |
| `lib/onboarding-reminders/messages.ts` | Email + SMS copy per tier |
| `lib/onboarding-reminders/types.ts` | Shared types/constants |
| `lib/email/templates/onboarding-reminder.tsx` | Branded email template |
| `vercel.json` / `vercel-cron.json` | Cron registration |

## Required environment variables

- `CRON_SECRET` — bearer token the cron must present (auth check is first).
- `RESEND_API_KEY`, `RESEND_FROM_NAME`, `RESEND_FROM_EMAIL` — email.
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_MESSAGING_SERVICE_SID` — SMS.
- `NEXT_PUBLIC_APP_URL` — used for CTA/onboarding links.

If a channel's env is missing the handler **skips** that channel gracefully
(counted under `skipped`) rather than failing the run.

## Operating the system

**Manual test run** (replace `<secret>`):
```bash
curl -s -H "Authorization: Bearer <CRON_SECRET>" \
  https://joinsahara.com/api/cron/onboarding-reminders | jq
```
Returns `{ success, processed, emailsSent, smsSent, skipped, failed }`.

**Editing copy** — change `ONBOARDING_EMAIL_COPY` / `getOnboardingSmsBody` in
`lib/onboarding-reminders/messages.ts`. Keep SMS bodies ≤160 chars (the helper
falls back to a name-less variant if a long name would overflow). Run
`npm run test -- lib/onboarding-reminders` after edits.

**Changing cadence/tiers** — adjust `tierForAge()` in `detector.ts` and the cron
`schedule` in both `vercel.json` and `vercel-cron.json` (keep them in sync).

**Pausing** — remove the `/api/cron/onboarding-reminders` entry from
`vercel.json` and redeploy, or unset `RESEND_API_KEY` / Twilio vars to mute a
single channel.

## Monitoring

- Each run logs `[Cron: Onboarding Reminders]` lines (start, candidate count,
  per-send failures, final summary) — visible in Vercel logs / Sentry.
- Delivery + idempotency history lives in `email_sends`
  (`WHERE email_type = 'onboarding_reminder'`).

## Notes

- A user who finishes onboarding before a later tier fires simply drops out of
  the candidate set — no further nudges.
- Idempotency intentionally reuses the existing `email_sends` table (no schema
  migration), with `metadata.channel = 'sms'` on SMS rows for clarity.
