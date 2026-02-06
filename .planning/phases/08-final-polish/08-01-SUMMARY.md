---
phase: 08-final-polish
plan: 01
subsystem: ui, api, auth
tags: [fred, chat, stripe, dashboard, auth, supabase, sse, xstate]

# Dependency graph
requires:
  - phase: 01-fred-cognitive-engine
    provides: FRED service, useFredChat hook, cognitive state indicator
  - phase: 06-tier-display
    provides: tier-middleware, getTierFromString, UserTier enum
  - phase: 04-studio-tier
    provides: agent_tasks, sms_checkins tables
provides:
  - Chat interface wired to FRED cognitive engine via useFredChat hook
  - Dashboard CTA button wired to Stripe checkout
  - Reality Lens tier-aware rate limiting from real subscriptions
  - Standardized auth imports across all FRED routes
  - Real dashboard stats from API aggregation
  - Cleaned up all orphaned legacy routes
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Dashboard stats aggregation API: single endpoint, parallel DB queries, graceful fallbacks"
    - "Hook-based chat: useFredChat replaces raw fetch with SSE streaming + XState state tracking"

key-files:
  created:
    - app/api/dashboard/stats/route.ts
  modified:
    - components/chat/chat-interface.tsx
    - app/dashboard/page.tsx
    - app/api/fred/reality-lens/route.ts
    - app/dashboard/layout.tsx
    - app/api/fred/chat/route.ts
    - app/api/fred/decide/route.ts
    - app/api/fred/history/route.ts
    - app/api/fred/memory/route.ts
    - app/api/fred/analyze/route.ts
    - app/api/fred/__tests__/fred-api.test.ts

key-decisions:
  - "Use useFredChat hook for chat wiring (SSE streaming, XState, memory persistence) rather than reimplementing fetch logic"
  - "Use CognitiveStepIndicator (step-based progress) over CognitiveStateIndicator (badge) for richer chat UX"
  - "Create single /api/dashboard/stats endpoint for aggregated counts (fewer client requests vs individual endpoint calls)"
  - "Map UserTier enum to RealityLensTier string via lookup table for clean tier boundary"
  - "Import getUserTier from tier-middleware (reuses subscription chain) instead of duplicating lookup logic in reality-lens route"

patterns-established:
  - "Dashboard stats aggregation: single GET endpoint, parallel Promise.all with .catch(() => 0) fallbacks"
  - "Hook-first chat integration: extract all fetch/state/error logic into custom hook, component only handles layout"

# Metrics
duration: 5min
completed: 2026-02-06
---

# Phase 08 Plan 01: Chat FRED Wiring, Dashboard Fixes, Cleanup Summary

**Chat wired to FRED engine via useFredChat hook, dead buttons fixed, legacy routes deleted, auth imports standardized, dashboard stats from real API**

## Performance

- **Duration:** 5 min
- **Started:** 2026-02-06T17:47:08Z
- **Completed:** 2026-02-06T17:52:35Z
- **Tasks:** 8
- **Files modified:** 11 (1 created, 3 deleted, 7 modified)

## Accomplishments
- Chat interface now uses useFredChat hook with full SSE streaming, XState cognitive state tracking, and FRED memory persistence
- Dashboard CTA "Upgrade Now" button wired to Stripe checkout with error handling
- Reality Lens getUserTier() reads real subscription data instead of always returning "free"
- All FRED routes standardized to import from @/lib/auth barrel (not @/lib/supabase/auth-helpers)
- Dashboard stats fetched from real /api/dashboard/stats endpoint aggregating fred_episodic_memory, pitch_reviews, sms_checkins, and agent_tasks
- Deleted 3 legacy files: /api/chat, /dashboard/check-ins mockup, /dashboard/investor-score + /api/investor-score
- Fixed SMS nav link from /dashboard/check-ins to /dashboard/sms

## Task Commits

Each task was committed atomically:

1. **Task 1: Wire chat to FRED engine** - `025ea25` (feat)
2. **Task 2: Delete legacy /api/chat** - `b528fe6` (fix)
3. **Task 3: Fix dashboard CTA button** - `5f8078b` (fix)
4. **Task 4: Fix Reality Lens getUserTier stub** - `b9079eb` (fix)
5. **Task 5: Fix SMS nav link + delete check-ins mockup** - `59ee7be` (fix)
6. **Task 6: Delete orphaned investor-score routes** - `a8d7d7e` (fix)
7. **Task 7: Standardize auth imports** - `3052b9d` (refactor)
8. **Task 8: Replace dashboard stats with real API data** - `131e07f` (feat)

## Files Created/Modified
- `components/chat/chat-interface.tsx` - Rewired to useFredChat hook with CognitiveStepIndicator
- `app/api/chat/route.ts` - DELETED (legacy, replaced by /api/fred/chat)
- `app/dashboard/page.tsx` - Working CTA button, real stats fetch, dynamic recent activity
- `app/api/fred/reality-lens/route.ts` - Real tier lookup via tier-middleware
- `app/dashboard/layout.tsx` - Nav link fixed to /dashboard/sms
- `app/dashboard/check-ins/page.tsx` - DELETED (static mockup)
- `app/dashboard/investor-score/page.tsx` - DELETED (orphaned)
- `app/api/investor-score/route.ts` - DELETED (orphaned)
- `app/api/fred/chat/route.ts` - Auth import standardized
- `app/api/fred/decide/route.ts` - Auth import standardized
- `app/api/fred/history/route.ts` - Auth import standardized
- `app/api/fred/memory/route.ts` - Auth import standardized
- `app/api/fred/analyze/route.ts` - Auth import standardized
- `app/api/fred/__tests__/fred-api.test.ts` - Mock updated to @/lib/auth
- `app/api/dashboard/stats/route.ts` - NEW: aggregated dashboard stats endpoint

## Decisions Made
- Used useFredChat hook for chat wiring (SSE, XState, memory) rather than reimplementing
- Used CognitiveStepIndicator for step-based progress display in chat
- Created single /api/dashboard/stats endpoint for aggregated counts
- Mapped UserTier enum to RealityLensTier string via lookup table
- Imported getUserTier from tier-middleware to reuse subscription chain

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- All P0-P2 issues from re-audit are resolved
- v1.0 tech debt fully closed
- No remaining hardcoded stubs, dead buttons, or orphaned routes
- All features wired to real backend services

---
*Phase: 08-final-polish*
*Completed: 2026-02-06*
