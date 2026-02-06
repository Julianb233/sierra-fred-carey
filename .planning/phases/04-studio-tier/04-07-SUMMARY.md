---
phase: 04-studio-tier
plan: 07
subsystem: stripe-sms-ui
tags: [stripe, tier-gating, sms-settings, upgrade-card, preferences-api]
depends_on:
  requires: ["04-01", "04-05"]
  provides: ["studio-stripe-integration", "sms-settings-ui", "sms-preferences-api", "upgrade-card"]
  affects: []
tech-stack:
  added: []
  patterns: ["tier-aware-upgrade-flow", "feature-lock-gating", "zod-api-validation", "query-param-includes"]
key-files:
  created:
    - components/tier/upgrade-card.tsx
    - components/sms/checkin-settings.tsx
    - app/api/sms/preferences/route.ts
    - app/dashboard/sms/page.tsx
  modified:
    - lib/stripe/config.ts
    - lib/constants.ts
decisions:
  - id: tier-progression
    choice: "Free users shown Pro upgrade first; Pro users shown Studio upgrade; Studio users shown manage button"
    reason: "Prevent users from skipping tiers; match Stripe checkout validation that blocks downgrades"
  - id: history-via-query-param
    choice: "GET /api/sms/preferences?include=history returns check-in history alongside preferences"
    reason: "Single endpoint avoids extra route; history is naturally scoped to the same user"
  - id: e164-validation
    choice: "Zod regex validation for E.164 phone format on POST"
    reason: "Twilio requires E.164; validate at API boundary to prevent bad data in DB"
  - id: a2p-consent-notice
    choice: "Inline consent notice in settings component before opt-in"
    reason: "A2P 10DLC compliance requires explicit consent language before enabling SMS"
metrics:
  duration: "5m 9s"
  completed: "2026-02-06"
---

# Phase 04 Plan 07: Studio Tier Stripe Integration & SMS Settings UI Summary

**One-liner:** Updated Stripe config with Studio agent features, built upgrade card with tier-aware checkout, SMS settings page with phone/schedule/timezone/consent management, and preferences API with Zod validation.

## Tasks Completed

### Task 1: Stripe config update and tier feature alignment
**Commit:** 761b98a

Updated VENTURE_STUDIO features in `lib/stripe/config.ts` to reflect actual Phase 04 capabilities (Virtual Team agents, SMS check-ins, Boardy matching). Updated `TIER_FEATURES[STUDIO]` in `lib/constants.ts` to match. Changed agents nav item tier gating from PRO to STUDIO. Added SMS Check-ins nav item to DASHBOARD_NAV.

Verified the existing Stripe webhook pipeline correctly maps `venture_studio` price ID to `UserTier.STUDIO` via `getPlanByPriceId()` -> `getTierFromString()`. No webhook changes needed. Similarly verified checkout route supports `{ tier: 'VENTURE_STUDIO' }` lookup. No changes needed.

### Task 2: Upgrade card, SMS settings UI, and SMS preferences API
**Commit:** bdbb4fa

**UpgradeCard** (`components/tier/upgrade-card.tsx`):
- Tier-aware component: Studio users see manage button, Pro users see Studio upgrade with $249/mo and feature list, Free users see Pro upgrade first
- Uses Stripe checkout API with `{ tier: 'VENTURE_STUDIO' }` for Pro-to-Studio upgrades
- Orange gradient styling consistent with TIER_BADGES[STUDIO]
- Loading state during checkout session creation

**CheckinSettings** (`components/sms/checkin-settings.tsx`):
- Phone number input with E.164 format hint
- Toggle for checkin_enabled on/off
- Day-of-week selector (Sunday-Saturday, default Monday)
- Hour selector (6am-10pm)
- Timezone selector (6 US timezones + UTC)
- A2P compliance consent notice
- Save with success/error feedback

**SMS Preferences API** (`app/api/sms/preferences/route.ts`):
- GET: Returns preferences (or sensible defaults if none exist)
- GET with `?include=history`: Also returns check-in history from sms_checkins table
- POST: Validates with Zod schema (E.164 regex, int ranges), calls updateSMSPreferences
- Auth-gated via requireAuth()
- `force-dynamic` for runtime evaluation

**SMS Dashboard Page** (`app/dashboard/sms/page.tsx`):
- Studio tier gated via FeatureLock
- Fetches preferences and history on mount
- CheckinSettings wired to POST API with refetch on save
- Check-in history timeline with direction icons (outbound/inbound), status badges, week numbers
- Loading skeletons, empty state, error handling

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

- [x] lib/stripe/config.ts VENTURE_STUDIO features match Phase 04 capabilities
- [x] lib/constants.ts TIER_FEATURES[STUDIO] updated with agent names
- [x] DASHBOARD_NAV includes sms-checkins at STUDIO tier and corrects agents to STUDIO
- [x] UpgradeCard creates Stripe checkout for Studio tier
- [x] CheckinSettings manages phone, schedule, timezone, opt-in with consent
- [x] app/api/sms/preferences/route.ts handles GET and POST
- [x] /dashboard/sms page renders with settings and history
- [x] TypeScript compilation passes (0 errors in changed files)

## Success Criteria Met

- [x] Pro users see Studio upgrade card with $249/mo pricing
- [x] Stripe checkout creates session for Studio tier via tier-based lookup
- [x] Webhook correctly assigns Studio tier on subscription creation (verified pipeline)
- [x] SMS settings page allows full preference management
- [x] SMS preferences API correctly reads and writes user preferences
- [x] Check-in history displays outbound/inbound message timeline
- [x] All Studio features properly gated in nav and UI

## Next Phase Readiness

Phase 04 is now fully complete (all 7 plans executed). The Studio tier has:
- Virtual agent architecture + 3 specialist agents (Plans 01-04)
- SMS weekly check-in pipeline via Twilio (Plan 05)
- Boardy integration for investor matching (Plan 06)
- Stripe monetization + SMS settings UI (Plan 07 - this plan)

Ready to proceed to Phase 05 or any remaining work.
