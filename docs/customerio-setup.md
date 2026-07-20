# Customer.io — Sahara Member Lifecycle Email Setup

**Linear:** AI-13316 · **Domain:** `saharamembers.com` · **Owner:** AI Acrobatics (Fred handed ownership over — Customer.io setup is beyond his team)

Customer.io is Sahara's **member lifecycle / behavioral messaging** system. It is
deliberately **separate** from the GoHighLevel Audience-Lab lead-gen / outbound
lane (AI-12563). **Do not** mix contact consent, lists, or production automations
between the two without an approved data map.

This repo ships the **code integration** (member identify/track/suppress against
the Customer.io Track API). The remaining steps — workspace access, DNS
authentication, dashboard journeys, warm-up, and go-live — are operator actions
that require external dashboard + DNS access and are documented below.

---

## What this repo ships (code-complete)

| Piece | Path |
|---|---|
| Track API client (lazy singleton, graceful no-op) | `lib/customerio/client.ts` |
| Member lifecycle event schema | `lib/customerio/events.ts` |
| `identifyMember` / `trackMemberEvent` / suppression | `lib/customerio/track.ts` |
| Public surface | `lib/customerio/index.ts` |
| Unit tests (idempotency, suppression, resilience) | `lib/customerio/customerio.test.ts` |
| Env vars | `.env.example` → `CUSTOMERIO_*` |

The integration **no-ops when `CUSTOMERIO_SITE_ID` / `CUSTOMERIO_TRACK_API_KEY`
are unset**, so it is safe to merge and deploy before the workspace/DNS work is
finished. It activates the moment the Track credentials are added to the Vercel
environment.

### Member data / event schema (scope item #4)

Stable event names Customer.io campaigns trigger on (append-only — renaming
breaks live triggers):

| Event | When the app emits it | Journey use |
|---|---|---|
| `signup` | account created | entry → welcome/onboarding journey |
| `onboarding_started` | onboarding flow begun | nudge branch |
| `onboarding_completed` | onboarding finished | exit onboarding nudges |
| `inactivity` | inactive past threshold | re-engagement |
| `founder_milestone` | milestone hit (first strategy, agent run, etc.) | congrats / upsell |
| `deck_submitted` | pitch deck uploaded | reviewer follow-up |

Suppression/consent state (`lib/customerio/events.ts` → `SUPPRESSION_STATE`):
`subscribed` · `unsubscribed` (reserved attribute) · `suppressed` (hard, via API).

### Wiring the app (follow-up, not required to merge)

Emit from the existing server-side lifecycle points (mirrors the PostHog
`serverTrack` calls in `lib/analytics/server.ts`). Use the **Supabase user id**
as the Customer.io identifier — it is stable; the email is not.

```ts
import {
  identifyMember,
  trackMemberEvent,
  CUSTOMERIO_EVENTS,
} from '@/lib/customerio';

// On signup — idempotent upsert. Calling twice updates in place, no duplicate.
await identifyMember(user.id, { email: user.email, created_at: unixNow });
await trackMemberEvent(user.id, CUSTOMERIO_EVENTS.SIGNUP, { source: 'app' }, `signup:${user.id}`);
```

---

## Operator runbook (external — dashboard + DNS access required)

### 1. Workspace ownership & access (AT: operator can access the workspace)
- Accept the Customer.io welcome + startup-program threads (linked in AI-13316).
- Confirm the correct workspace; add an authorized AI Acrobatics operator seat.
- Store the **Track API** Site ID + key in 1Password (`god secrets set … --vault API-Keys`).
  **Never paste credentials into Linear.**
- Record the startup-program approval/rejection outcome in AI-13316.

### 2. DNS inventory — BEFORE any change (AT: existing DNS/MX stays operational)
Capture the current records so changes are reversible. Attach the output to AI-13316.
```bash
for t in A AAAA CNAME MX TXT NS; do echo "== $t =="; dig +short $t saharamembers.com; done
dig +short TXT _dmarc.saharamembers.com
dig +short TXT default._domainkey.saharamembers.com
```
Note anything already serving the apex (website) and any existing MX/mailbox —
**preserve them**. Customer.io sending uses a subdomain + return-path, so it must
not disturb website A/CNAME or inbound MX.

### 3. Sending-domain authentication (AT: SPF/DKIM/return-path + DMARC pass)
In Customer.io → **Deliverability → Sending domains → Add `saharamembers.com`**.
Add the exact records Customer.io generates:
- **DKIM** CNAME(s) (`cio._domainkey…`) → Customer.io targets.
- **Return-Path / bounce** CNAME (e.g. `bounce.saharamembers.com`).
- **SPF**: include Customer.io in the sending subdomain's TXT (do not broaden the apex SPF if the apex sends mail elsewhere).
- **DMARC**: ensure `_dmarc.saharamembers.com` exists; start `p=none` for monitoring, tighten after warm-up.
Verify inside Customer.io until it reports **Authenticated**; screenshot for the evidence gate.

### 4. Test-member source & idempotency (AT: create+update twice, no dup)
The code guarantees idempotent upserts to the same identifier (proved in
`customerio.test.ts`). To verify end-to-end against the live workspace, use an
**allowlisted** test address:
```bash
SITE=...; KEY=...   # Track API creds, from 1Password — not committed
AUTH=$(printf '%s:%s' "$SITE" "$KEY" | base64)
# create
curl -s -X PUT https://track.customer.io/api/v1/customers/qa-dummy-1 \
  -H "Authorization: Basic $AUTH" -H 'Content-Type: application/json' \
  -d '{"email":"qa+cio@aiacrobatics.com","plan":"free","created_at":1750000000}'
# update the SAME id — must update in place, not duplicate
curl -s -X PUT https://track.customer.io/api/v1/customers/qa-dummy-1 \
  -H "Authorization: Basic $AUTH" -H 'Content-Type: application/json' \
  -d '{"email":"qa+cio@aiacrobatics.com","plan":"pro"}'
# emit an event with a dedupe id (retry-safe)
curl -s -X POST https://track.customer.io/api/v1/customers/qa-dummy-1/events \
  -H "Authorization: Basic $AUTH" -H 'Content-Type: application/json' \
  -d '{"name":"signup","id":"evt-qa-1","data":{"source":"qa"}}'
```
Confirm in Customer.io the profile shows `plan=pro` and a single `signup` event.

### 5. Welcome/onboarding journey + one behavior follow-up (AT: sends once each)
- **Campaign A — Welcome/Onboarding:** trigger = `signup` event. First message
  immediately; branch on `onboarding_completed` to stop nudges. Enable
  **frequency/duplicate guard** so it sends exactly once per member.
- **Campaign B — Behavior follow-up:** trigger = `deck_submitted` (or
  `founder_milestone`). Add a **suppression filter** so it never fires for a
  suppressed/unsubscribed contact.
- Test both against the allowlisted address; confirm each sends exactly once and
  the suppressed contact receives nothing.

### 6. Unsubscribe & suppression (AT: verified end to end)
- Include the Customer.io unsubscribe link/merge tag in every campaign.
- Verify: unsubscribe → member gets `unsubscribed=true` → no further sends.
- Verify hard suppress via `/suppress` removes the member from active journeys.

### 7. Deliverability, warm-up & activation (AT: logs visible; no live campaign pre-approval)
- Turn on Customer.io **Deliverability** dashboards; confirm delivery / bounce /
  failure events are visible in logs (screenshot for evidence).
- **Warm-up:** ramp volume gradually (cohort by `created_at`); keep DMARC at
  `p=none` until bounce/complaint rates are healthy, then tighten.
- **Production activation checklist** (all must be true before any live member campaign):
  - [ ] Domain shows **Authenticated** (SPF/DKIM/return-path/DMARC).
  - [ ] Website DNS + inbound MX confirmed still working post-change.
  - [ ] Dummy member create/update verified — no duplicates.
  - [ ] Welcome + behavior campaigns each sent exactly once in test.
  - [ ] Unsubscribe + suppression verified end to end.
  - [ ] Delivery/bounce/failure logs visible.
  - [ ] `CUSTOMERIO_SITE_ID` / `CUSTOMERIO_TRACK_API_KEY` set in Vercel prod env.
  - [ ] **Julian/Fred approve the test evidence + audience/consent rules.**

> No live member campaign is activated until Julian/Fred sign off on the test
> evidence and the audience/consent rules (AI-13316 acceptance gate).

---

## Acceptance-test ownership map

| Acceptance test | Owner | Status |
|---|---|---|
| Operator can access the correct workspace | Operator | pending external |
| `saharamembers.com` authenticated (SPF/DKIM/return-path/DMARC) | Operator (DNS) | pending external |
| Existing website DNS + MX stay operational | Operator (DNS) | pending external |
| Dummy member create+update twice, no duplicate | **Code** (`customerio.test.ts`) + operator live-verify | code-complete |
| Welcome/onboarding journey sends once | Operator (dashboard) | pending external |
| Behavior follow-up sends once, skips suppressed | Operator (dashboard) + **code** suppression | code-complete / pending external |
| Unsubscribe + suppression verified | **Code** endpoints + operator live-verify | code-complete / pending external |
| Delivery/bounce/failure logs visible | Operator (dashboard) | pending external |
| No live campaign before Julian/Fred approval | Operator | gated |
| Startup-program outcome recorded in issue | Operator | pending external |

**Evidence gate (attach to AI-13316 before Done):** domain-auth screenshot, DNS
before/after inventory, dummy-member event log, test-delivery proof, production
activation approval.
