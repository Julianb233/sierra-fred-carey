---
phase: 06
plan: 02
subsystem: dashboard-tier-wiring
tags: [dashboard, tier-context, supabase-auth, stripe-checkout, post-checkout, settings, real-data]

dependency_graph:
  requires:
    - "Phase 06-01 (TierProvider mounted, tier-context response shape fixed, tier-middleware table fixed)"
    - "Phase 02-04 (tier gating system, useTier hook)"
    - "Phase 03-05 (Stripe checkout, redirectToPortal, UpgradeTier component)"
  provides:
    - "Dashboard sidebar with real user name/email from Supabase auth + real tier from TierProvider"
    - "Dashboard overview with contextTier and post-Stripe-checkout success handling"
    - "Settings page with real profile data, correct prices, working Manage/Upgrade buttons"
  affects:
    - "All dashboard pages now reflect actual user identity and subscription status"
    - "Post-checkout redirect completes the visual upgrade flow end-to-end"
    - "Settings subscription management wired to Stripe portal"

tech_stack:
  added: []
  patterns:
    - "useEffect + supabase.auth.getUser() for client-side user identity fetch"
    - "useTier() context for tier-aware rendering across all dashboard pages"
    - "Post-checkout polling pattern: refreshTier() x5 at 2s intervals for webhook lag"
    - "toast.success() from sonner for checkout completion notification"

key_files:
  created: []
  modified:
    - app/dashboard/layout.tsx
    - app/dashboard/page.tsx
    - app/dashboard/settings/page.tsx

decisions:
  - id: "keep-user-object-shape"
    description: "Kept existing user object shape { name, email, tier } in dashboard page to minimize JSX changes, but tier now sourced from useTier() context"
  - id: "polling-for-webhook-lag"
    description: "Poll refreshTier() 5 times at 2s intervals after checkout success redirect, since Stripe webhook may not have processed yet"
  - id: "disable-manage-when-no-subscription"
    description: "Manage Subscription button disabled when !isSubscriptionActive since Stripe portal requires existing subscription"

metrics:
  duration: "~3 minutes"
  completed: "2026-02-06"
---

# Phase 06 Plan 02: Dashboard Consumer Wiring Summary

**One-liner:** Wire dashboard layout, overview page, and settings page to real Supabase auth data + TierProvider context, replacing all hardcoded mocks and adding post-Stripe-checkout success handling with tier refresh polling.

## What Was Done

### Task 1: Dashboard Layout - Real User Data + Tier from Context
- **Removed** hardcoded `{ name: "Fred Cary", email: "founder@startup.com", tier: 0 }` mock
- **Added** `useTier()` import from `@/lib/context/tier-context` for real tier
- **Added** `createClient()` import from `@/lib/supabase/client` for auth user fetch
- **Added** `useEffect` that fetches user name from `profiles` table and email from `supabase.auth.getUser()`
- **Result:** Sidebar avatar, name, email, tier badge, nav locking, and UpgradeBanner all use real data
- **Files modified:** `app/dashboard/layout.tsx`

### Task 2: Dashboard Page - Context Tier + Post-Checkout Success
- **Removed** `profile?.tier || 0` derivation (profiles.tier column is never updated by webhooks)
- **Added** `useTier()` hook providing `contextTier`, `refreshTier`, and `tierLoading`
- **Added** sync useEffect: keeps `user.tier` in sync when `contextTier` changes
- **Added** post-checkout success handler:
  - Detects `?success=true` search param
  - Polls `refreshTier()` 5 times at 2-second intervals (handles webhook processing delay)
  - Shows `toast.success("Payment successful! Your plan has been upgraded.")`
  - Cleans URL via `router.replace("/dashboard", { scroll: false })`
- **Preserved** existing welcome modal logic (`?welcome=true`) unchanged
- **Files modified:** `app/dashboard/page.tsx`

### Task 3: Settings Page - Real Profile + Subscription Status
- **Removed** hardcoded `"Fred Cary"`, `"founder@startup.com"`, `"My Startup Inc."` profile data
- **Removed** hardcoded `currentPlan = "Free"` and wrong prices (`$49/$199`)
- **Added** `useEffect` that fetches real profile from Supabase (name, company_name, email)
- **Added** `useTier()` for `tier`, `tierName`, `isSubscriptionActive`
- **Fixed** plan price display to use correct values (`$0/$99/$249`)
- **Fixed** plan features to use `TIER_FEATURES[tier]` from constants (real feature list)
- **Wired** "Manage Subscription" button to `redirectToPortal()` from Stripe client
- **Replaced** static "Upgrade Plan" button with `<UpgradeTier>` dialog component
- **Fixed** avatar initials from hardcoded `"FC"` to dynamic from real name
- **Preserved** Notification Settings, General Notifications, and Danger Zone sections unchanged
- **Files modified:** `app/dashboard/settings/page.tsx`

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| Keep user object shape `{ name, email, tier }` | Minimizes JSX changes in dashboard page while swapping data source |
| Poll refreshTier() 5x at 2s intervals | Stripe webhooks have variable latency; polling ensures UI updates even if webhook is delayed |
| Disable Manage Subscription when no active subscription | Stripe portal requires existing subscription; button disabled for free users |

## Deviations from Plan

None -- plan executed exactly as written.

## Verification Results

| Check | Result |
|-------|--------|
| No "Fred Cary" in any dashboard file | PASS |
| No "founder@startup.com" in any dashboard file | PASS |
| All 3 files use useTier() from tier-context | PASS |
| Dashboard page handles ?success=true | PASS |
| Dashboard page calls toast.success | PASS |
| Settings page uses redirectToPortal | PASS |
| No "$49" in settings page (wrong price) | PASS |
| TypeScript compilation -- zero errors in all 3 files | PASS |

## Commits

| Hash | Type | Description |
|------|------|-------------|
| 2cf968c | feat | Replace hardcoded mock in dashboard layout with real user data and tier from context |
| dee018d | feat | Fix dashboard page tier source and add post-checkout success handling |
| 854c867 | feat | Fix settings page to show real user data and subscription status |

## Next Phase Readiness

Phase 06 is now complete. Both plans executed:
- **06-01:** Tier infrastructure foundation (TierProvider mount, response shape fix, middleware table fix, migrations)
- **06-02:** Dashboard consumer wiring (layout, overview, settings -- all using real data + tier context)

The Free -> Stripe upgrade -> Pro/Studio access flow is now end-to-end:
1. User sees real tier badge in sidebar
2. User clicks upgrade -> Stripe checkout
3. After payment -> redirect to `/dashboard?success=true`
4. Post-checkout handler polls for webhook, shows success toast
5. TierProvider refreshes -> all components update to new tier
6. Nav items unlock, settings show new plan, upgrade banner updates
