---
phase: 47-community-data-layer-consent
plan: 02
subsystem: community-consent
tags: [consent, crud, api, settings-ui, opt-in, data-sharing]

dependency-graph:
  requires: ["47-01"]
  provides: ["consent-crud-module", "consent-api-routes", "consent-settings-ui"]
  affects: ["49-social-feed", "52-directory-messaging", "53-investor-intros"]

tech-stack:
  added: []
  patterns: ["merge-with-defaults", "optimistic-ui", "upsert", "client-safe-constants"]

key-files:
  created:
    - lib/db/consent.ts
    - app/api/community/consent/route.ts
    - components/settings/ConsentSettings.tsx
  modified:
    - app/dashboard/settings/page.tsx

decisions:
  - id: "47-02-D1"
    description: "Client-safe constant duplication instead of shared constants file"
    rationale: "ConsentSettings.tsx duplicates category labels/descriptions as client-safe constants rather than importing from lib/db/consent.ts (which uses createServiceClient). Avoids server-only module leak into client bundle."
  - id: "47-02-D2"
    description: "Optimistic UI updates with rollback on error"
    rationale: "Toggle switches update immediately for responsive UX. If the API call fails, the previous value is restored and a toast error shown."
  - id: "47-02-D3"
    description: "Import requireAuth from @/lib/auth (re-export barrel)"
    rationale: "Follows existing pattern in push/subscribe route. @/lib/auth re-exports requireAuth from @/lib/supabase/auth-helpers."

metrics:
  duration: "~3 minutes"
  completed: "2026-02-12"
  tasks: "2/2"
  deviations: 0
---

# Phase 47 Plan 02: Consent Management System Summary

**Consent CRUD module with merge-with-defaults pattern, API routes for GET/PUT, and ConsentSettings UI component with instant-save toggle switches on the Settings page.**

## Tasks Completed

### Task 1: Create consent CRUD module and API route
**Commit:** `03b2542`

**lib/db/consent.ts** -- Consent preferences CRUD following the exact structural pattern from `lib/push/preferences.ts`:
- Types: `ConsentCategory`, `ConsentCategoryConfig`, `ConsentPreferences`
- Constants: `CONSENT_DEFAULTS` (all 4 categories default to `false` -- opt-in model), `CONSENT_CATEGORIES`
- `getConsentPreferences(userId)` -- queries consent_preferences table, merges with defaults
- `updateConsentPreference(userId, category, enabled)` -- UPSERT with `onConflict: "user_id,category"`
- `isConsentEnabled(userId, category)` -- shorthand boolean check for downstream phases
- Dynamic import of `createServiceClient` (same pattern as push preferences)
- Audit logging handled by DB trigger `trg_consent_audit` (not application code)

**app/api/community/consent/route.ts** -- GET and PUT endpoints:
- GET: authenticate via `requireAuth()`, return all preferences
- PUT: authenticate, validate `{ category, enabled }`, call `updateConsentPreference`
- Both return `{ success: true/false, data/error }` pattern
- Error handling catches auth throws (NextResponse 401) and re-throws them

### Task 2: Create ConsentSettings component and add to Settings page
**Commit:** `d1902d2`

**components/settings/ConsentSettings.tsx** -- "use client" component:
- Client-safe constants for category labels/descriptions (no server-only imports)
- Fetches preferences from `/api/community/consent` on mount
- 4 toggle switches: Benchmark Data, Social Feed, Founder Directory, Direct Messaging
- Instant-save on toggle (no separate Save button) -- matches modern settings UX
- Optimistic UI: updates switch immediately, rolls back on API error
- Loading skeleton while fetching initial state
- Toast notifications via `sonner` for success/error feedback
- ARIA labels on all switches for accessibility
- Disables all switches while a toggle is in-flight to prevent race conditions

**app/dashboard/settings/page.tsx** -- Added `<ConsentSettings />` after General Notifications card, before Voice & TTS section. No tier gating (all tiers can set consent preferences).

## Deviations from Plan

None -- plan executed exactly as written.

## Verification Results

| Check | Status |
|-------|--------|
| Consent module follows push preferences pattern (merge-with-defaults) | PASS |
| All 4 categories default to false (opt-in) | PASS |
| API route requires authentication | PASS |
| PUT uses UPSERT (not separate insert/update logic) | PASS |
| Settings page renders ConsentSettings component | PASS |
| Each toggle saves immediately (no separate Save button) | PASS |
| No server-only imports in client component | PASS |
| Build passes (all routes compile) | PASS |

## Decisions Made

1. **Client-safe constant duplication** (47-02-D1): Category labels and descriptions are duplicated as client-safe constants in ConsentSettings.tsx rather than importing from lib/db/consent.ts. This prevents the server-only `createServiceClient` from leaking into the client bundle.

2. **Optimistic UI with rollback** (47-02-D2): Toggle switches update the UI immediately before the API call resolves. If the call fails, the previous state is restored. This provides responsive UX without sacrificing data integrity.

3. **Auth import barrel** (47-02-D3): API route imports `requireAuth` from `@/lib/auth` (the re-export barrel) rather than directly from `@/lib/supabase/auth-helpers`, following the established pattern in other API routes like push/subscribe.

## Next Phase Readiness

This plan completes Phase 47 (Community Data Layer & Consent). The following phases can now build on consent:

- **Phase 49 (Social Feed)**: Can check `isConsentEnabled(userId, 'social_feed')` before showing posts
- **Phase 52 (Directory & Messaging)**: Can check `isConsentEnabled(userId, 'directory')` and `isConsentEnabled(userId, 'messaging')`
- **Phase 53 (Investor Intros)**: The `investor_intros` category exists in the DB schema but is not yet exposed in UI -- Phase 53 will add it

No blockers for downstream phases.
