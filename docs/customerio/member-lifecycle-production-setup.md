# Customer.io member lifecycle production setup

Linear parent: AI-13316

Approved source mapping:
[`fred-member-communication-plan-v1-mapping.md`](./fred-member-communication-plan-v1-mapping.md)
Scope: Sahara members after account creation
Out of scope: GoHighLevel lead generation and sales automation

## Source of truth

Firebase Auth and Firestore in project `sahara-6800a` are the production
identity and member-profile sources. The stable Customer.io person identifier
is the Firebase UID, never an email address. Supabase is not part of this
member-lifecycle integration.

The live aggregate audit and baseline sync on 2026-07-29 found:

| Check | Count |
| --- | ---: |
| Firebase Auth users | 202 |
| Firestore `users` documents | 195 |
| Customer.io identify attempts | 202 |
| Successful Customer.io identifies | 202 |
| Failed Customer.io identifies | 0 |

The baseline sync emitted no lifecycle events, so it could not enroll legacy
members. The five-minute cron upserts profiles and emits a deduplicated
`account_created` event only for Firebase accounts created inside the most
recent ten-minute window.

## Runtime contract

Server-side runtime variables:

| Variable | Purpose |
| --- | --- |
| `CUSTOMERIO_SITE_ID` | Track API workspace/site identifier |
| `CUSTOMERIO_TRACK_API_KEY` | Track API credential |
| `CUSTOMERIO_REGION` | `us` or `eu` API data center |
| `CUSTOMERIO_WEBHOOK_SIGNING_KEY` | Reporting-webhook HMAC signing secret |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Server-only credential restricted to `sahara-6800a` |
| `CRON_SECRET` | Authenticates the five-minute Vercel sync |
| `CUSTOMERIO_DAILY_GUIDANCE_DELIVERY` | Set to `customerio` only after the Daily Motivation journey is verified and running |
| `CUSTOMERIO_REENGAGEMENT_DELIVERY` | Set to `customerio` only after the Inactivity journey is verified and running |

Secrets belong in 1Password and the deployment environment. They must never be
committed. When absent, Sahara logs a skipped Customer.io result without
blocking member signup, Stripe webhooks, milestone handling, or cron jobs.

## Person and consent contract

Required person attributes:

- `id`: stable Firebase UID
- `email`: normalized member email
- `created_at`: Unix time used for warm-up cohorting
- `first_name`, `last_name`, `plan`, and `onboarding_completed` when known
- `unsubscribed`: Customer.io reserved opt-out attribute

`unsubscribed=true` stops lifecycle sends. A hard consent withdrawal uses the
Customer.io suppression endpoint. Suppression or unsubscription always wins
over journey eligibility. Sahara member records and GoHighLevel leads must not
be copied between systems merely to share an audience.

Every lifecycle event also includes:

- `source`: canonical product path that observed the state
- `correlation_id`: stable non-secret reference for tracing and retries
- `consent_state`: `transactional`, `marketing_opted_in`,
  `marketing_opted_out`, or `unknown`

An `unknown` consent state is not eligible for marketing sends. Transactional
events may only trigger transactional messages. Provider journeys must enforce
these branches. Unknown email, SMS, or daily-motivation consent fails closed;
the three permission states are never inferred from one another.

## Append-only event contract

| Event | Stable dedupe key | Intended paused journey |
| --- | --- | --- |
| `signup` | `signup:{userId}` | Welcome and onboarding |
| `onboarding_started` | `onboarding_started:{userId}` | Incomplete onboarding |
| `onboarding_completed` | `onboarding_completed:{userId}` | Exit incomplete onboarding |
| `first_value_reached` | `first_value_reached:{userId}` | First-value follow-up |
| `recommended_action_not_viewed` | `recommended_action_not_viewed:{stepId}` | Recommended-action reminder |
| `inactivity` | `inactivity:{userId}:{tier}` | Graduated re-engagement |
| `founder_milestone` | `founder_milestone:{userId}:{milestoneType}` | Milestone celebration |
| `deck_submitted` | `deck_submitted:{userId}:{uploadHash}` | Product milestone |
| `subscription_started` | `stripe:{stripeEventId}` | Conversion / upgrade |
| `paid_onboarding_started` | `paid_onboarding:{stripeEventId}` | Paid onboarding |
| `upgrade_abandoned` | `upgrade_abandoned:{stripeEventId}` | Upgrade abandonment |
| `subscription_updated` | `stripe:{stripeEventId}` | Plan or renewal change |
| `subscription_canceled` | `stripe:{stripeEventId}` | Cancellation lifecycle |
| `payment_failed` | `stripe:{stripeEventId}` | Payment recovery |
| `motivational_eligible` | `motivational_eligible:{userId}:{date}` | Daily motivation |

Event names are append-only. Renaming one breaks any Customer.io campaign
trigger that references it.

### Canonical emitters

- Onboarding start/completion: `POST /api/onboard`
- First value and milestones: milestone trigger service. First chat, Reality
  Lens, pitch review, and strategy document qualify as first value; the single
  per-member dedupe key prevents later milestones from restarting the journey.
- Deck submission: authenticated Pro+ pitch-deck upload
- Recommended action not viewed: overdue, unacknowledged next-step reminder
  cron
- Recommendation created/completed: authoritative `next_steps` insert and
  completion transitions
- Pricing viewed: authenticated pricing-page view, deduplicated once per
  member per UTC day
- Upgrade started: authenticated Stripe Checkout session creation
- Inactivity: graduated re-engagement cron
- Subscription, paid onboarding, abandonment, cancellation, and payment
  recovery: verified Stripe webhook events
- Motivational eligibility: verified/opted-in Pro+ daily-guidance SMS cohort

These signals do not themselves authorize Customer.io delivery. All journeys
remain Draft/Stopped until sender, consent, copy, quiet-hour, and canary gates
pass.

## Reporting webhook

Endpoint:

```text
POST /api/webhooks/customerio
```

Customer.io must send `X-CIO-Timestamp` and `X-CIO-Signature`. Sahara verifies
the hex HMAC-SHA256 signature over the exact raw string
`v0:<timestamp>:<raw body>`. Re-parsed or re-serialized JSON must never be used
for verification.

The endpoint writes redacted records to the Firebase collection
`customerio_reporting_events`, keyed by a SHA-256 digest of Customer.io
`event_id`. Legitimate retries are acknowledged as duplicates. Only event,
campaign/action, object, metric, time, boolean failure flags, and one-way
identifier hashes are stored. Recipient addresses, phone numbers, message
bodies, failure text, and raw payloads are never persisted or logged.
New bounce, complaint, failure, undeliverable, and dropped events also emit a
redacted Sentry warning. The existing signed Sentry-to-Linear bridge routes that
warning into the human-review maintenance lane. Provider retries do not create
duplicate warnings, and unsubscribes remain consent evidence rather than errors.

Customer.io times out webhook calls after four seconds and retries non-2xx
responses with exponential backoff for up to seven days. Keep the endpoint
small and return 2xx only after the evidence row is safely inserted or already
exists. Enabling after downtime does not backfill events.

Provider setup:

1. Create the reporting webhook in **Integrations → Reporting Webhooks** with
   body content disabled.
2. Store the signing key in the existing Sahara Customer.io 1Password item and
   encrypted Preview/Production runtimes.
3. Point the first test at a verified Preview URL and use **Send Test**.
4. Confirm valid signature → 200/new record, retry → 200/duplicate, and invalid
   signature → 401.
5. Keep the reporting webhook scoped to necessary delivery, bounce, complaint,
   unsubscribe, and failure metrics.

## Safe activation checklist

1. Confirm Customer.io workspace membership, role, region, and startup-program
   state.
2. Create a Track API key, store it in 1Password, and configure the deployment
   environments without deploying an unreviewed commit.
3. Verify `saharamembers.com` sender authentication and the reply-to address.
4. Build journeys in paused or test mode from Fred's approved copy.
5. Run allowlisted canaries and confirm a single person, single event, expected
   message, unsubscribe behavior, and suppression readback.
6. Deploy the reviewed pull request through the normal CI/CD path. Environment
   variables may be prepared first, but they do not prove the application code
   is live.
7. Activate in a small cohort, monitor delivery, complaints, unsubscribes, and
   Sentry/Linear alerts, then expand deliberately.

Existing Resend and Twilio re-engagement sends stay active while Customer.io
journeys are paused. Before enabling a journey that sends on the same trigger,
explicitly cut over the existing channel to avoid duplicate messages.

The two cron-owned cutovers fail closed to `direct`. Deploy the cutover code
first, verify both variables are still `direct`, then use this order for each
journey:

1. Confirm the Customer.io trigger is `motivational_eligible` (daily guidance)
   or `member_became_inactive` (re-engagement), with consent and quiet-hour
   branches intact.
2. Set the matching production variable to `customerio` and redeploy.
3. Confirm the cron reports `deliveryMode: "customerio"` and increments
   `customerIoQueued` without incrementing direct send counters.
4. Start the Customer.io journey and run one allowlisted canary.
5. Roll back by restoring the variable to `direct` before stopping the journey.
