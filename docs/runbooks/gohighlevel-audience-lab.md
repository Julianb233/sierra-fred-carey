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

The intended private integration is `Sahara Audience Lab API`. The
GoHighLevel Private Integrations UI currently fails while loading the
scope/user data in this location, including after a fresh dashboard bootstrap.
No private integration or token was created, and no agency-wide token was
substituted.

1Password system of record:

- Vault: `API-Keys`
- Item: `GHL-sahara`
- Item ID: `zeyxuxxcp43l26aqqa72upwxd4`
- Current credential status: pending the GoHighLevel scope/user UI gate

When the GHL gate is cleared:

1. Create the location-specific private integration.
2. Grant only the contact, tag, custom-field, pipeline/opportunity, and workflow
   scopes required by the approved implementation.
3. Store the token as a concealed field in `GHL-sahara`.
4. Run synthetic `sahara-test-contact` create/update/readback tests.
5. Keep the workflow in Draft until the separate live-send approval.

## Operational guardrails

- Never enroll a contact when consent provenance is unknown.
- `sahara-do-not-contact` and an opt-out always override every positive tag.
- Use only synthetic, allowlisted records for setup tests.
- Do not publish this workflow or enable real email/SMS sends during schema or
  API testing.
- Verify changes through a readback in the GHL location, then update AI-12563.
