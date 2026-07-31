# GoHighLevel Audience Lab runbook

Linear: AI-12563
Location: `Sahara` (`h2yiH50OluJCRbtWrshg`)
Last verified: 2026-07-29 PDT

## Purpose and boundary

GoHighLevel is the lead-generation and sales-operations system for Sahara
Audience Lab. Customer.io remains the member-lifecycle messaging system after
account creation. Do not copy audiences between the two systems merely to
share a campaign.

Audience Lab sales sends remain gated on explicit consent, approved copy,
cadence, and live-send verification. The consent guardrail itself is published
because it sends no message: it marks unverified Audience Lab contacts so they
cannot be mistaken for consented leads. Existing coffee, appetizer, and legacy
workflows and the `Free Appetizer Pipeline` are preserved.

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

## Installed consent workflow

Workflow: `Sahara Audience Lab - Consent Gate`

- State: Published
- Trigger: contact tag added, `sahara-audience-lab`
- Action: add contact tag, `sahara-source-unverified`
- Enrollment count at verification: 0
- Execution count at verification: 0

The workflow has no email or SMS action. Its first action creates a visible
guardrail so a newly added Audience Lab contact cannot be mistaken for a
consent-verified contact.

## Private integration and credential state

The Sahara location private-integration token is stored in 1Password and was
verified against the GoHighLevel API on 2026-07-29. API readback returned 22
workflows and confirmed the consent workflow is `published`.

1Password system of record:

- Vault: `API-Keys`
- Item: `GHL-sahara`
- Item ID: `zeyxuxxcp43l26aqqa72upwxd4`
- Current credential status: available and API-verified

For ongoing verification:

1. Keep the token in the concealed credential field of `GHL-sahara`.
2. Keep scopes limited to contact, tag, custom-field, pipeline/opportunity, and
   workflow operations required by the approved implementation.
3. Use only synthetic `sahara-test-contact` records for mutation tests.
4. Do not add email/SMS actions without sender and consent canaries.

## Operational guardrails

- Never enroll a contact when consent provenance is unknown.
- `sahara-do-not-contact` and an opt-out always override every positive tag.
- Use only synthetic, allowlisted records for setup tests.
- Do not add email/SMS actions, enroll real contacts, or enable real outreach
  during schema or API testing.
- Verify changes through a readback in the GHL location, then update AI-12563.
