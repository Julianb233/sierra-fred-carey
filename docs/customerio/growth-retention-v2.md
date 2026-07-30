# Sahara growth and retention v2

Linear parent: AI-13551  
Member authority: Firebase project `sahara-6800a`  
Lifecycle delivery: Customer.io  
Lead-generation and sales: GoHighLevel

This plan extends Fred Cary's approved communication plan without turning on
unapproved sends or mixing the member and lead systems. Code being present,
Customer.io workflow configuration, live delivery, and verified conversion are
separate proof states.

## Measurement contract

The primary activation funnel is:

1. `acquisition.landing_viewed`
2. `acquisition.lead_captured`
3. `acquisition.account_created`
4. `onboarding.started`
5. `onboarding.step_completed`
6. `onboarding.completed`
7. `first_value_reached`
8. `recommended_action_completed`
9. `upgrade_started`
10. `upgrade_completed`

The `/start-now` path captures only allowlisted campaign data: source, referral
code, UTM fields, Google click id, Meta click id, Reddit click id, landing path,
and referrer host. It does not retain arbitrary query parameters or referrer
paths. Customer.io member profiles continue to use the stable Firebase UID,
never an email address, as their identifier.

## Goals

Each campaign needs one measurable outcome and an exit that prevents duplicate
or irrelevant follow-up.

| Program | Primary goal | Required exit |
| --- | --- | --- |
| Welcome and onboarding | `onboarding_completed` | completion, suppression, or support request |
| First value | `first_value_reached` | first value or human rescue |
| Recommended actions | `recommended_action_completed` | completed, irrelevant, blocked, or rescue |
| Inactivity rescue | `member_returned` | meaningful return activity |
| Upgrade abandonment | `upgrade_completed` | purchase, support, payment issue, or final touch |
| Paid onboarding | first paid outcome | outcome, cancellation, or support request |
| Weekly progress | report viewed or recommended action started | next report period |
| Feature adoption | `feature_completed` for the named feature | completion or explicit dismissal |
| Advocacy | referral conversion or approved testimonial response | response or frequency cap |

Workspace-level goals should report activation, first value, recommended-action
completion, retained weekly activity, paid conversion, and recovered payments.
Campaign conversion windows must match the journey's expected decision period.

## Segments

Segments must be computed from Firebase-backed attributes and append-only
events. Missing consent is ineligible for marketing.

| Segment | Definition |
| --- | --- |
| New, not activated | account created; onboarding not completed |
| Activated, no first value | onboarding completed; no first value within 48 hours |
| Active founder | meaningful Sahara activity inside the approved activity window |
| Slipping founder | no meaningful activity for 3 days |
| At-risk founder | no meaningful activity for 7 or 14 days |
| High intent | pricing viewed or upgrade started; no support/payment-friction signal |
| Paid, onboarding incomplete | paid subscription; paid outcome incomplete |
| Rescue requested | `human_rescue_requested` after the latest automated touch |
| Feature candidate | eligible plan/profile; named feature not completed |
| Advocacy eligible | approved success threshold met; no recent advocacy request |

Human rescue, payment failure, complaint, hard bounce, unsubscribe, and
suppression segments override growth messages.

## Retention workflows

The following additions are implementation-ready contracts, not permission to
send:

| Workflow | Entry event | Channel | Safety gate |
| --- | --- | --- | --- |
| Weekly founder value recap | `weekly_progress_ready` | Email | email consent, one report per week |
| Human rescue | `human_rescue_requested` | Internal task plus opted-in confirmation | stop promotional sequence |
| Member feedback | `member_feedback_submitted` | Internal routing and optional confirmation | no score-based pressure |
| Referral/testimonial/case study | `advocacy_eligible` | Email first | separate ask types and frequency cap |
| Feature adoption | `feature_viewed`, `feature_started`, `feature_completed` | Email/in-app | exit immediately on completion |

The existing 19-step founder progress report and Monday cron are reused. Their
current repository implementation reads the legacy application data store.
It must not emit `weekly_progress_ready` for Firebase members until its
production member identifier and snapshot source are reconciled with Firebase.

## Operational health

The Firebase profile sync records an aggregate checkpoint after every run in
`customerio_health_checkpoints/firebase_sync`. The reporting webhook records an
aggregate checkpoint in `customerio_health_checkpoints/reporting_webhook`.
These records contain timestamps, status, counts, message type, metric, and
duplicate state only; they exclude member identifiers, recipients, content, and
credentials.

`GET /api/cron/customerio-health`, authenticated by `CRON_SECRET`, runs every
ten minutes. A failed or older-than-15-minute Firebase sync returns 503 and
opens the existing Sentry review lane with a stable fingerprint. No reporting
event is reported as `unknown`, not failed, because quiet periods are normal.
Delivery failures continue to open redacted Sentry warnings from the reporting
webhook itself.

## Release and proof checklist

- Focused unit tests pass for attribution, event contracts, redaction,
  deterministic dedupe, and health evaluation.
- TypeScript, lint, full unit tests, and production build pass.
- The code branch is reviewed and merged through CI; a green PR alone is not
  production.
- Production cron invocations show current Firebase sync checkpoints.
- An allowlisted Customer.io canary produces one event, one expected message,
  and one reporting-webhook record.
- Customer.io campaign goal and exit readback match this document.
- Email sender, unsubscribe, and suppression readback pass.
- SMS workflows remain draft until Sahara has an approved A2P sender and
  production STOP/HELP readback.
- GoHighLevel remains limited to consented leads and sales handoff.
- Meta and Reddit server-side conversion APIs remain off until credential,
  consent, event-match, dedupe, and platform-readback tests pass.
