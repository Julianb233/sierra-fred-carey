# Phase 72-02 Summary: Feedback Signal API + Throttle

## Status: COMPLETE

## What Was Built

### API Route
- **`app/api/feedback/signal/route.ts`** — POST endpoint for feedback signal submission
  - Auth via `createClient()` + `supabase.auth.getUser()`
  - Body validation: message_id, signal_type, rating required; category, comment, session_id optional
  - Consent enforcement via `getUserConsentStatus()`
  - Detailed feedback throttle via `checkDetailedFeedbackThrottle()` (only when category/comment present)
  - Tier-aware weighting via `getUserTier()` + `TIER_WEIGHTS`
  - GDPR expiry via `calculateExpiryDate()` (90 days)
  - Returns 201 with `{ success: true, id }` on success

### Throttle Utility
- **`lib/feedback/throttle.ts`** — `checkDetailedFeedbackThrottle(userId)`
  - Queries feedback_signals for detailed signals (category or comment not null) in past 7 days
  - Returns `{ allowed: boolean, nextAllowedAt: string | null }`
  - Fails open on query error (allows the signal)
  - Uses `MAX_DETAILED_FEEDBACK_PER_WEEK` constant (1)

## Requirements Met
- REQ-C1: Feedback signals submitted via POST /api/feedback/signal
- REQ-C4: <50ms p95 latency (single row insert, client fire-and-forget)
- REQ-C5: Tier weighting applied (free=1x, pro=3x, studio=5x)
- REQ-C6: Max 1 detailed feedback/user/week; basic thumbs unlimited
- GDPR: consent checked before write, 90-day expiry set

## Verification
- `npx tsc --noEmit` — zero feedback-related errors
- Route exports POST handler
- insertFeedbackSignal, checkDetailedFeedbackThrottle, getUserConsentStatus all called
- Error responses: 401 (unauth), 403 (no consent), 429 (throttled), 400 (validation), 500 (server error)
