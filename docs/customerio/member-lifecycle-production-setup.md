# Customer.io member lifecycle production setup

Linear parent: AI-13316
Scope: Sahara members after account creation
Out of scope: GoHighLevel lead generation and sales automation

## Source of truth

Supabase Auth and `profiles` are the production identity source. The stable
Customer.io person identifier is the Supabase user ID, never an email address.
Firebase (`sahara-6800a`) is a legacy reconciliation source only.

The aggregate audit on 2026-07-24 found:

| Check | Count |
| --- | ---: |
| Supabase Auth users | 100 |
| Firebase Auth users | 200 |
| Matching normalized emails | 70 |
| Firebase-only normalized emails | 130 |
| Supabase-only normalized emails | 30 |
| Supabase users with explicit Firebase metadata | 67 |
| Firebase disabled users | 0 |
| Firestore `users` documents | 193 |

These counts contain no member PII. Re-run the aggregate audit with:

```bash
npm run customerio:audit-members
```

Firebase-only records must not be imported into Customer.io campaigns. They
have no canonical Supabase ID and their current messaging consent has not been
verified. Reconcile or migrate them to Supabase first, then identify them with
the resulting Supabase user ID. This prevents duplicate people and accidental
legacy sends.

## Runtime contract

Server-side runtime variables:

| Variable | Purpose |
| --- | --- |
| `CUSTOMERIO_SITE_ID` | Track API workspace/site identifier |
| `CUSTOMERIO_TRACK_API_KEY` | Track API credential |
| `CUSTOMERIO_REGION` | `us` or `eu` API data center |

Secrets belong in 1Password and the deployment environment. They must never be
committed. When absent, Sahara logs a skipped Customer.io result without
blocking member signup, Stripe webhooks, milestone handling, or cron jobs.

## Person and consent contract

Required person attributes:

- `id`: stable Supabase user ID
- `email`: normalized member email
- `created_at`: Unix time used for warm-up cohorting
- `first_name`, `last_name`, `plan`, and `onboarding_completed` when known
- `unsubscribed`: Customer.io reserved opt-out attribute

`unsubscribed=true` stops lifecycle sends. A hard consent withdrawal uses the
Customer.io suppression endpoint. Suppression or unsubscription always wins
over journey eligibility. Sahara member records and GoHighLevel leads must not
be copied between systems merely to share an audience.

## Append-only event contract

| Event | Stable dedupe key | Intended paused journey |
| --- | --- | --- |
| `signup` | `signup:{userId}` | Welcome and onboarding |
| `onboarding_started` | caller event ID | Incomplete onboarding |
| `onboarding_completed` | `onboarding_completed:{userId}` | Exit incomplete onboarding |
| `inactivity` | `inactivity:{userId}:{tier}` | Graduated re-engagement |
| `founder_milestone` | `founder_milestone:{userId}:{milestoneType}` | Milestone celebration |
| `deck_submitted` | caller event ID | Product milestone |
| `subscription_started` | `stripe:{stripeEventId}` | Conversion / upgrade |
| `subscription_updated` | `stripe:{stripeEventId}` | Plan or renewal change |
| `subscription_canceled` | `stripe:{stripeEventId}` | Cancellation lifecycle |
| `payment_failed` | `stripe:{stripeEventId}` | Payment recovery |

Event names are append-only. Renaming one breaks any Customer.io campaign
trigger that references it.

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
