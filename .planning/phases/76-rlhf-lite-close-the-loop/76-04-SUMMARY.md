# Phase 76-04 Summary: Monthly Improvements Digest + Notification Preferences

## Status: COMPLETE

## What was built

### Digest Data Gathering (REQ-L2, REQ-L3)
- `lib/feedback/improvements-digest.ts` — Full digest pipeline:
  - `getRecentImprovements()` — Query active patches with completed tracking in last 30 days (staleness cutoff), filtered by medium+ severity threshold
  - `getDigestRecipients()` — Users with `consent_given=true` in feedback signals
  - `sendImprovementsDigest()` — Orchestrates the full send: gather improvements, get recipients, check preferences, send emails

### Email Template (REQ-L2)
- `components/email/feedback-improvements.tsx` — React Email template with:
  - Sahara branding (orange #ff6a1a, dark header)
  - Improvement cards with topic, description, signal count, satisfaction improvement %
  - CTA to chat with FRED
  - Notification preferences management link in footer
  - `FeedbackImprovementsEmail` alias for backward compatibility

### Notification Preferences (REQ-L4)
- `lib/email/types.ts` — Added `'feedback_improvement'` to `EmailCategory` union
- `lib/email/constants.ts` — Mapped to `'feedback'` preference key in `EMAIL_CATEGORIES`
- Uses existing `shouldSendEmail()` from `lib/email/preferences.ts` for opt-in checking

### Admin Trigger API
- `app/api/admin/feedback/digest/route.ts`:
  - GET — Preview digest content (improvements + recipient count)
  - POST — Trigger monthly digest send

### DB-Driven Prompt Assembly
- `lib/ai/prompt-layers.ts` — Added `loadActiveDBPatches()` (5-min cache) and `buildPromptWithDBPatches()` async function for prompt assembly with DB-loaded patches

## Requirements Coverage
- REQ-L2: Monthly digest notification — COMPLETE
- REQ-L3: 30-day staleness cutoff, severity threshold — COMPLETE
- REQ-L4: Opt-in notifications respected — COMPLETE
