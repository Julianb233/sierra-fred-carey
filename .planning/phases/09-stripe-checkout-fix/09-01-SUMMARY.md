---
phase: 09-stripe-checkout-fix
plan: 01
subsystem: stripe, checkout
tags: [stripe, checkout, tier-mapping, bug-fix]

# Dependency graph
requires:
  - phase: 06-tier-stripe-wiring
    provides: PLANS config, getPlanByPriceId, Stripe checkout route
  - phase: 08-final-polish
    provides: Dashboard CTA button wired to checkout
provides:
  - Checkout route accepts user-facing tier names (pro, studio) in addition to PLANS keys
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "TIER_TO_PLAN_KEY mapping: translate user-facing tier names to internal PLANS keys at API boundary"

key-files:
  created: []
  modified:
    - app/api/stripe/checkout/route.ts

key-decisions:
  - "Map tier names at checkout route boundary via TIER_TO_PLAN_KEY constant (not in caller)"
  - "Include direct PLANS keys in mapping for forward compatibility (FUNDRAISING -> FUNDRAISING)"

patterns-established:
  - "API-boundary tier translation: accept user-facing names, map to internal keys before lookup"

# Metrics
duration: 2min
completed: 2026-02-06
---

# Phase 09 Plan 01: Fix Stripe Checkout Tier Mapping Summary

**TIER_TO_PLAN_KEY mapping added to checkout route so dashboard tier="pro" resolves to FUNDRAISING plan priceId**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-06T19:07:13Z
- **Completed:** 2026-02-06T19:09:00Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- Checkout route now maps user-facing tier names (pro, studio) to PLANS keys (FUNDRAISING, VENTURE_STUDIO)
- Dashboard "Upgrade Now" CTA button now correctly resolves to Stripe checkout with the right priceId
- Direct PLANS keys and direct priceId flows continue to work unchanged

## Task Commits

Each task was committed atomically:

1. **Task 1: Add tier-name-to-plan-key mapping in checkout route** - `1140260` (fix)

## Files Created/Modified
- `app/api/stripe/checkout/route.ts` - Added TIER_TO_PLAN_KEY mapping constant and updated tier resolution logic

## Decisions Made
- Added mapping at the checkout route boundary (not in the dashboard caller) for single source of truth
- Included direct PLANS keys in mapping (FREE, FUNDRAISING, VENTURE_STUDIO) for forward compatibility
- Used two-step resolution: first map tier name to plan key, then look up plan key in PLANS

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- P1 Stripe checkout tier mapping bug is closed
- All v1.0 milestone requirements are now fully met
- No remaining gaps from the final audit

---
*Phase: 09-stripe-checkout-fix*
*Completed: 2026-02-06*
