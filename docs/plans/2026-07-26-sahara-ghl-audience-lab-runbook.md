# Sahara GoHighLevel Audience Lab Runbook

Linear: AI-12563  
Updated: 2026-07-26  
Status: draft/paused technical infrastructure ready; no real outreach sends authorized from this run.

## Purpose

Use the Sahara GoHighLevel location as the controlled CRM layer for Audience Lab lead capture and outbound operations, while keeping live outreach blocked until Fred/Julian approve consent, copy, cadence, exit conditions, and the audience source.

## Canonical location

- GoHighLevel location: `Sahara`
- Location ID: `h2yiH50OluJCRbtWrshg`
- Direct dashboard: `https://app.gohighlevel.com/v2/location/h2yiH50OluJCRbtWrshg`
- Credential source: 1Password item `GHL-sahara`
- Guardrail from credential item: draft/paused only until consent, copy, cadence, exit conditions, and live sends are approved.

## Current CRM configuration

Verified through the GHL v2 API on 2026-07-26:

### Workflows

- `Sahara Audience Lab - Consent Gate (PAUSED)` — draft workflow used as the safe consent gate for the outreach lane.
- Existing coffee/rewards workflows are legacy/published and must not be enrolled into the Sahara Audience Lab flow.

### Pipeline

- `Sahara Audience Lab` with 4 stages. Use this as the canonical pipeline for lead/outreach opportunity tracking.
- `Free Appetizer Pipeline` is legacy and should not be used for Sahara Audience Lab.

### Custom fields

Audience Lab fields already present:

- `Sahara Consent Source`
- `Sahara Consent Timestamp`
- `Sahara Segment`
- `Sahara Audience Source`

Legacy/non-Audience fields remain present and should not be relied on for this lane unless renamed/cleaned in a separate GHL hygiene task.

### Tags

Audience Lab tags already present:

- `sahara-audience-lab`
- `sahara-consent-verified`
- `sahara-do-not-contact`
- `sahara-source-unverified`
- `sahara-test-contact`

Canary-only/suppression tags used by agents:

- `ai-12563-sla-canary`
- `suppression-no-send`
- `verified-readback`

## Import contract

Do not import any real contacts until the audience source is approved. When approved, every contact must have:

1. An explicit audience/source label in `Sahara Audience Source`.
2. Segment assignment in `Sahara Segment`.
3. Consent status:
   - `sahara-consent-verified` when explicit consent/source proof exists.
   - `sahara-source-unverified` when source is known but outreach is not yet allowed.
   - `sahara-do-not-contact` when opted out, ambiguous, or suppressed.
4. Pipeline placement in `Sahara Audience Lab` only when a valid outreach/opportunity state exists.
5. No enrollment into a published legacy workflow.

## Safe test-contact canary

Agents may run a suppressed dummy contact canary to verify credentials and CRM write/read/delete behavior.

Required properties:

- Email must use Julian/AI Acrobatics controlled synthetic address pattern, e.g. `julian+sla-ai-12563-ghl-<timestamp>@aiacrobatics.com`.
- Tags must include `sahara-test-contact` and `suppression-no-send`.
- Optional proof tags: `ai-12563-sla-canary`, `verified-readback`.
- The contact must be deleted after readback.
- Verify deletion by searching the exact synthetic email and confirming zero contacts.

What the canary proves:

- PIT/location access works.
- Contact create/read/delete works.
- Tag add/readback works.
- The test does **not** prove live workflow delivery or message sends.

## Activation gates

Before any real outreach or workflow activation:

- Fred/Julian approve audience source and import file.
- Fred/Julian approve message copy, cadence, channels, exit conditions, and suppression rules.
- `Sahara Audience Lab - Consent Gate (PAUSED)` is visually reviewed in GHL and intentionally activated only after approval.
- A dummy/suppressed contact completes the intended workflow path without sending to real contacts.
- Linear AI-12563 receives proof of the above, including screenshots/exported configuration and the canary log.

## 2026-07-26 SLA patrol proof

Run id: `sla-20260726T200414Z-ai-12563`

Commands executed from an isolated worktree at `/opt/agency-workspace/worktrees/sla-ai-12563-ghl-infra-20260726`:

```bash
python3 /tmp/ghl_sahara_canary.py
python3 /tmp/ghl_sahara_tag_canary.py
```

Results:

- `GET /locations/h2yiH50OluJCRbtWrshg` returned HTTP 200.
- `GET /workflows/?locationId=h2yiH50OluJCRbtWrshg` returned HTTP 200 and showed `Sahara Audience Lab - Consent Gate (PAUSED)` as draft.
- `GET /opportunities/pipelines?locationId=h2yiH50OluJCRbtWrshg` returned HTTP 200 and showed `Sahara Audience Lab` with 4 stages.
- `GET /locations/h2yiH50OluJCRbtWrshg/customFields` returned HTTP 200 and showed the Sahara audience/consent fields listed above.
- `GET /locations/h2yiH50OluJCRbtWrshg/tags` returned HTTP 200 and showed the Sahara audience/consent tags listed above.
- Suppressed dummy contact create returned HTTP 201.
- Tag add returned HTTP 201.
- Readback returned HTTP 200 with the suppression/canary tags present.
- Delete returned HTTP 200.
- Search by the exact synthetic canary email after deletion returned zero contacts.

No real contact import, workflow activation, email/SMS send, payment/billing action, or client notification was performed.
