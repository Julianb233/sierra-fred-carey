---
phase: 06
plan: 01
subsystem: tier-infrastructure
tags: [stripe, tier-detection, react-context, database-migrations, server-middleware]

dependency_graph:
  requires:
    - "Phase 02-04 (tier gating system, TierProvider, tier-context)"
    - "Phase 03-05 (Stripe checkout, webhooks, user_subscriptions model)"
  provides:
    - "Working TierProvider mounted in component tree"
    - "Correct client-side tier detection from subscription API"
    - "Server-side tier middleware querying correct table"
    - "Database migrations for user_subscriptions and stripe_events"
  affects:
    - "Phase 06-02 (dashboard layout, post-checkout refresh -- depends on TierProvider)"
    - "All tier-gated components now get correct tier values"
    - "Server-side requireTier() middleware now returns correct tier"

tech_stack:
  added: []
  patterns:
    - "getTierFromString() for consistent plan-id-to-UserTier mapping"
    - "getUserSubscription() as single source of truth for server-side tier queries"
    - "getPlanByPriceId() for stripe_price_id to plan mapping"

key_files:
  created:
    - lib/db/migrations/033_user_subscriptions.sql
    - lib/db/migrations/034_stripe_events.sql
  modified:
    - app/providers.tsx
    - lib/context/tier-context.tsx
    - lib/api/tier-middleware.ts

decisions:
  - id: "use-getTierFromString"
    description: "Use existing getTierFromString() from lib/constants.ts for plan-id-to-tier mapping in both client and server contexts, instead of duplicated string matching logic"
  - id: "reuse-getUserSubscription"
    description: "tier-middleware.ts now calls getUserSubscription() from lib/db/subscriptions.ts instead of making its own Supabase query to a non-existent 'subscriptions' table"
  - id: "trialing-counts-as-active"
    description: "Both 'active' and 'trialing' subscription statuses grant tier access, matching the subscription API route logic"

metrics:
  duration: "~2 minutes"
  completed: "2026-02-06"
---

# Phase 06 Plan 01: Tier Infrastructure Foundation Summary

**One-liner:** Mount TierProvider in component tree, fix API response consumption to use data.plan.id/data.isActive, rewire server-side tier middleware to query user_subscriptions, and create database migrations.

## What Was Done

### Task 1: Database Migrations (033, 034)
- **033_user_subscriptions.sql**: Created table with all columns matching `lib/db/subscriptions.ts` TypeScript interface -- `user_id`, `stripe_customer_id`, `stripe_subscription_id`, `stripe_price_id`, `status`, `current_period_start`, `current_period_end`, `canceled_at`, `cancel_at_period_end`, `trial_start`, `trial_end`, `created_at`, `updated_at`
- UNIQUE constraint on `user_id` enables the `ON CONFLICT (user_id)` upsert pattern used by `createOrUpdateSubscription()`
- Indexes on `stripe_customer_id`, `stripe_subscription_id`, `status` for webhook and query performance
- RLS: service_role full access, authenticated users can SELECT their own row
- Auto-updating `updated_at` trigger
- **034_stripe_events.sql**: Created table with `stripe_event_id` (UNIQUE), `stripe_customer_id`, `type`, `status`, `payload` (JSONB), `error`, `created_at`, `processed_at`
- Indexes on `stripe_event_id` (idempotency), `type`, `stripe_customer_id`, `status`
- RLS: service_role only (internal webhook data)

### Task 2: Three Wiring Fixes
1. **app/providers.tsx** -- Imported and mounted `TierProvider` inside `NextThemesProvider`, wrapping all children. Now `useTier()` works in any component under `<Providers>`.
2. **lib/context/tier-context.tsx** -- Fixed both `TierProvider.fetchTier()` and standalone `useUserTier()` hook:
   - **Before**: Read `data.subscriptionStatus` (UNDEFINED) and `data.planId` (UNDEFINED) -- tier always FREE
   - **After**: Read `data.isActive`, `data.subscription?.status`, `data.plan?.id` via `getTierFromString()` -- correct tier mapping
3. **lib/api/tier-middleware.ts** -- Replaced `getUserTier()` body:
   - **Before**: Queried `.from("subscriptions")` with `.select("status, price_id, products(name)")` -- table does not exist
   - **After**: Calls `getUserSubscription()` from `lib/db/subscriptions.ts`, then `getPlanByPriceId()` + `getTierFromString()` for consistent tier derivation

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| Use `getTierFromString()` everywhere | Already maps "fundraising"->PRO, "venture_studio"->STUDIO; avoids duplicated string matching |
| Reuse `getUserSubscription()` in tier-middleware | Single source of truth for subscription queries; already correct with `user_subscriptions` table |
| "trialing" status grants tier access | Matches subscription API route logic (`["active", "trialing"].includes(status)`) |

## Deviations from Plan

None -- plan executed exactly as written.

## Verification Results

| Check | Result |
|-------|--------|
| TypeScript compilation (`npx tsc --noEmit`) | PASS -- zero errors |
| providers.tsx contains TierProvider import + mount | PASS |
| tier-context.tsx reads `data.plan?.id` and `data.isActive` | PASS |
| tier-context.tsx has no `data.subscriptionStatus` or `data.planId` | PASS |
| tier-middleware.ts uses `getUserSubscription` | PASS |
| tier-middleware.ts has no `.from("subscriptions")` | PASS |
| Both migration files exist with correct column schemas | PASS |
| useUserTier standalone hook also fixed | PASS |

## Commits

| Hash | Type | Description |
|------|------|-------------|
| f5972d6 | feat | Create database migrations for user_subscriptions and stripe_events |
| 4953852 | fix | Mount TierProvider, fix tier-context response shape, fix tier-middleware table |

## Next Phase Readiness

Plan 06-02 can now proceed. It depends on:
- TierProvider being mounted (DONE) -- useTier() works in dashboard layout
- Correct tier detection (DONE) -- tier-context reads correct API shape
- Server-side tier middleware working (DONE) -- queries user_subscriptions

Remaining items for 06-02:
- Replace hardcoded mock user in dashboard layout with real Supabase auth data + useTier()
- Handle post-checkout success redirect (`?success=true&tier=X`)
- Fix settings page hardcoded data
