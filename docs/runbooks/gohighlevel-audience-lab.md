# GoHighLevel Audience Lab runbook

Linear: AI-12563
Location: `Sahara` (`h2yiH50OluJCRbtWrshg`)
Last verified: 2026-07-24 PDT

## Purpose and boundary

GoHighLevel is the lead-generation and sales-operations system for Sahara
Audience Lab. Customer.io remains the member-lifecycle messaging system after
account creation. Do not copy audiences between the two systems merely to
share a campaign.

All Audience Lab automation remains Draft/PAUSED until Fred approves consent
rules, copy, cadence, exit conditions, and live sends. Existing coffee,
appetizer, and legacy workflows and the `Free Appetizer Pipeline` are preserved.

## Installed location schema

Pipeline: `Sahara Audience Lab`

1. `Source Unverified`
2. `Consent Verified`
3. `Engaged`
4. `Do Not Contact`

Contact tags:

- `sahara-audience-lab`
- `sahara-consent-verified`
- `sahara-do-not-contact`
- `sahara-test-contact`
- `sahara-source-unverified`

Custom-field folder: `Sahara Audience Lab`

Contact fields:

- `Sahara Audience Source` — single line
- `Sahara Consent Source` — single line
- `Sahara Segment` — single line
- `Sahara Consent Timestamp` — date picker

## Installed paused workflow

Workflow: `Sahara Audience Lab - Consent Gate (PAUSED)`

- State: Draft
- Trigger: contact tag added, `sahara-audience-lab`
- Action: add contact tag, `sahara-source-unverified`
- Enrollment count at verification: 0
- Execution count at verification: 0

The workflow is intentionally not published. Its first action creates a visible
guardrail so a newly added Audience Lab contact cannot be mistaken for a
consent-verified contact.

## Private integration and credential state

The location-specific private integration credential is available and its
scope has been verified against the Sahara location. No agency-wide token is
used.

1Password system of record:

- Vault: `API-Keys`
- Item: `GHL-sahara`
- Item ID: `zeyxuxxcp43l26aqqa72upwxd4`
- Current credential status: stored as a concealed field and verified on
  2026-07-24 PDT

Live v2 read checks returned 200 for the Sahara location, workflows, contacts,
opportunity pipelines, custom fields, and tags. A reversible synthetic
`sahara-test-contact` create/update/readback/delete canary returned
201/200/200/200. Readback confirmed the updated source and expected test and
suppression tags; the synthetic contact was then deleted.

The credential and schema gate is complete. Publishing the workflow and
enrolling real contacts remain separate activation gates: consent provenance,
copy, cadence, exit conditions, and an allowlisted workflow canary must pass
before any real contact enters the workflow.

## Operational guardrails

- Never enroll a contact when consent provenance is unknown.
- `sahara-do-not-contact` and an opt-out always override every positive tag.
- Use only synthetic, allowlisted records for setup tests.
- Do not publish this workflow or enable real email/SMS sends during schema or
  API testing.
- Verify changes through a readback in the GHL location, then update AI-12563.
