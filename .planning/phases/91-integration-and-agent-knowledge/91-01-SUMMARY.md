# Phase 91-01 Summary — Customer.io lifecycle and reporting

## Outcome

- Expanded the append-only lifecycle contract from 10 to 15 events.
- Wired real emitters for onboarding start, first value, deck submission,
  recommended-action reminder, paid onboarding, upgrade abandonment, and daily
  motivation eligibility.
- Added source, correlation ID, consent state, and deterministic dedupe IDs.
- Preserved Resend/Twilio as live delivery owners while Customer.io is paused.
- Added an official-contract reporting webhook using
  `v0:<timestamp>:<raw body>` HMAC-SHA256 verification.
- Added redacted, replay-safe reporting evidence storage. No recipient, contact
  address, message body, raw payload, or failure text is retained.

## Validation

- Focused Customer.io suite passed twice: 25/25.
- TypeScript passed.
- ESLint exited 0 with 367 pre-existing warnings and no errors.
- Full `npm test` is blocked by an existing FRED state-machine mock missing
  `searchEpisodesByEmbedding`; the test then attempts live OpenAI Responses API
  calls and receives 401 `api.responses.write` scope errors. The run was stopped
  and is not counted as a pass.

## Provider state

- Sahara International workspace ID 226236 is accessible.
- Email sending remains in test mode.
- Seven Sahara automations are Draft, not started, and currently empty.
- Startup Program payment-method enrollment remains incomplete.
- Reporting-webhook setup is staged until the branch has a verified Preview URL.

## Activation boundary

No Customer.io journey was activated and no real member received a message.
