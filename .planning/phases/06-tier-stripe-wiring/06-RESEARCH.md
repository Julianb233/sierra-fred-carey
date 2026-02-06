# Phase 06: Tier Display & Stripe Wiring - Research

**Researched:** 2026-02-05
**Domain:** Client-side tier detection, Stripe webhook -> UI state, React Context providers
**Confidence:** HIGH

## Summary

This phase addresses a broken end-to-end flow: "Free user -> Stripe upgrade -> Pro access." Through comprehensive code analysis, I identified **four distinct bugs** that combine to make tier detection always show FREE, even after a successful Stripe payment. All four must be fixed together.

The bugs are:
1. **TierProvider not mounted** -- `app/providers.tsx` only wraps `ThemeProvider`. The `TierProvider` from `lib/context/tier-context.tsx` is never added to the component tree, so `useTier()` throws an error and no component can read tier state.
2. **API response shape mismatch** -- `tier-context.tsx` expects `data.subscriptionStatus` and `data.planId` from `/api/user/subscription`, but the API actually returns `data.plan`, `data.subscription.status`, and `data.isActive`. The fields the consumer reads are always `undefined`, so tier defaults to FREE.
3. **Dashboard layout hardcodes tier: 0** -- `app/dashboard/layout.tsx` line 143 has `const user = { name: "Fred Cary", email: "founder@startup.com", tier: 0 }`. The sidebar, tier badge, and nav locking all use this hardcoded mock instead of real user data.
4. **Table name discrepancy in tier middleware** -- `lib/api/tier-middleware.ts` queries `.from("subscriptions")` (a table that likely does not exist), while the webhook handler and subscription API query `user_subscriptions` (via `lib/db/subscriptions.ts`). This means server-side tier gating also fails.

Secondary issue: After Stripe checkout, the success URL redirects to `/dashboard?success=true&tier={plan.id}`, but the dashboard page only handles `?welcome=true` -- it ignores the `success` and `tier` query parameters entirely. There is no post-payment refresh of tier state.

**Primary recommendation:** Mount TierProvider in providers.tsx, fix the API response consumption in tier-context.tsx to match the actual API shape, replace hardcoded mock in dashboard layout with real user data from TierProvider, and fix the subscriptions table name in tier-middleware.ts.

## Standard Stack

The project already has everything needed. No new libraries required.

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `stripe` | 20.1.0 | Server-side Stripe API | Already installed, handles webhook verification and checkout sessions |
| `@stripe/stripe-js` | 8.6.0 | Client-side Stripe.js | Already installed, used for client-side checkout redirect |
| `react` (Context API) | 19.1.1 | State management for tier | Already used -- TierProvider exists but is not mounted |
| `@supabase/supabase-js` | 2.89.0 | Database queries | Already installed, used by subscription and tier APIs |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `sonner` | installed | Toast notifications | Show success/error after payment redirect |
| `next-themes` | installed | Theme provider | Already in providers.tsx, wrap TierProvider alongside it |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| React Context (TierProvider) | Zustand | Over-engineering -- Context is sufficient for a single tier value that changes rarely |
| Polling for tier refresh | Supabase Realtime | More complex, tier changes are infrequent (only on subscription events) |
| Custom webhook handler | Stripe CLI events | Already have webhook handler; just need table name fix |

**Installation:** No new packages needed.

## Architecture Patterns

### Current Data Flow (BROKEN)

```
Stripe Checkout -> Webhook -> user_subscriptions table (CORRECT)
                                        |
Dashboard Layout -> hardcoded tier: 0  (BUG: ignores DB)
                                        |
TierProvider -> NOT MOUNTED             (BUG: never runs)
       |
       v
tier-context.tsx -> /api/user/subscription -> { plan, subscription, isActive }
       |
       reads data.subscriptionStatus (UNDEFINED - field doesn't exist in response)
       reads data.planId (UNDEFINED - field doesn't exist in response)
       |
       result: tier = FREE always

tier-middleware.ts (server-side) -> .from("subscriptions") (BUG: wrong table name)
       |
       result: queries non-existent table, always returns FREE
```

### Target Data Flow (FIXED)

```
Stripe Checkout -> Webhook -> user_subscriptions table
                                        |
/api/user/subscription -> reads user_subscriptions -> returns { plan, subscription, isActive }
                                        |
TierProvider (MOUNTED in providers.tsx) -> fetches /api/user/subscription
       |
       reads data.plan.id -> maps to UserTier enum
       reads data.isActive -> sets isSubscriptionActive
       reads data.subscription?.status -> additional status info
       |
       result: correct tier for all consuming components

Dashboard Layout -> useTier() from TierProvider
       |
       real user data from Supabase auth + tier from context

tier-middleware.ts (server-side) -> .from("user_subscriptions") (FIXED table name)
```

### Recommended Fix Structure

```
Fix 1: providers.tsx
  - Import TierProvider from lib/context/tier-context.tsx
  - Wrap children: ThemeProvider > TierProvider > {children}

Fix 2: tier-context.tsx
  - Change data.subscriptionStatus to data.subscription?.status || data.isActive
  - Change data.planId to data.plan?.id
  - Both TierProvider and useUserTier need this fix (duplicated logic)

Fix 3: dashboard/layout.tsx
  - Remove hardcoded const user = { ... tier: 0 }
  - Use useTier() hook for tier + Supabase auth for user name/email
  - Nav locking, badge, upgrade banner all use tier from context

Fix 4: tier-middleware.ts
  - Change .from("subscriptions") to .from("user_subscriptions")
  - Or better: reuse getUserSubscription from lib/db/subscriptions.ts

Fix 5: dashboard/page.tsx (enhancement)
  - Handle ?success=true&tier=X query params from Stripe redirect
  - Call TierProvider.refresh() to reload tier from API
  - Show success toast
```

### Anti-Patterns to Avoid
- **Duplicated tier-fetching logic:** `tier-context.tsx` has two nearly identical implementations (TierProvider + useUserTier standalone hook). Fix both, but consider deduplicating.
- **Reading profiles.tier for subscription tier:** The `dashboard/page.tsx` reads `profiles.tier` (line 62). This column is set at profile creation (default 0) and is NEVER updated by the Stripe webhook. The webhook only updates `user_subscriptions`. Do not rely on profiles.tier for subscription-based tier detection.
- **Hardcoded user data in layouts:** Dashboard layout and settings page both have hardcoded mock user data. Replace with actual data.
- **Multiple sources of truth for plans:** `PLANS` in `lib/stripe/config.ts` uses plan IDs "free", "fundraising", "venture_studio" while `UserTier` enum uses FREE=0, PRO=1, STUDIO=2 with mapping via `getTierFromString()`. The mapping exists but is not used in tier-context.tsx.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Tier-to-plan mapping | Custom switch/case in each component | `getTierFromString()` from `lib/constants.ts` | Already exists, handles "fundraising" -> PRO, "venture_studio" -> STUDIO |
| Stripe checkout redirect | Manual form POST | `redirectToCheckout()` from `lib/stripe/client.ts` | Already handles error cases, Stripe not configured, existing subscription |
| Stripe portal redirect | Manual API call | `redirectToPortal()` from `lib/stripe/client.ts` | Already exists with error handling |
| Subscription database access | Raw SQL in components | `getUserSubscription()` from `lib/db/subscriptions.ts` | Typed, handles null cases |
| Tier comparison | `tier === 1` | `canAccessFeature(userTier, requiredTier)` from `lib/constants.ts` | Handles the >= comparison correctly |
| Upgrade tier calculation | Manual if/else | `getUpgradeTier(currentTier)` from `lib/constants.ts` | Already handles Free->Pro, Pro->Studio, Studio->null |

**Key insight:** Almost every piece needed already exists in the codebase. The problem is not missing code but broken wiring between existing pieces. The fix is reconnecting: mount the provider, match the response shape, use real data.

## Common Pitfalls

### Pitfall 1: Response Shape Mismatch Between API and Consumer
**What goes wrong:** `tier-context.tsx` expects `data.subscriptionStatus` and `data.planId` but the API returns `data.subscription.status` and `data.plan.id` -- tier always reads as FREE.
**Why it happens:** The API route (`app/api/user/subscription/route.ts`) was written independently from the context consumer (`lib/context/tier-context.tsx`). Neither references the other's interface.
**How to avoid:** Define a shared TypeScript interface for the subscription API response. Both the route handler and the context consumer should import from the same type definition.
**Warning signs:** Tier always shows FREE even after successful Stripe payment.

### Pitfall 2: Two Different Subscription Tables
**What goes wrong:** `tier-middleware.ts` queries `.from("subscriptions")` while the webhook writes to `user_subscriptions`. Server-side tier checks fail because they query the wrong table.
**Why it happens:** `tier-middleware.ts` was written referencing a Supabase-standard `subscriptions` table, but the actual migration created `user_subscriptions`.
**How to avoid:** Consolidate all subscription queries through `lib/db/subscriptions.ts` which correctly references `user_subscriptions`.
**Warning signs:** Server-side tier gates (requireTier wrapper) return FREE even for paid users.

### Pitfall 3: Provider Not Mounted = useTier() Throws
**What goes wrong:** Any component calling `useTier()` gets "useTier must be used within a TierProvider" error because TierProvider is never in the tree.
**Why it happens:** `app/providers.tsx` was created with only ThemeProvider. TierProvider was created later in `lib/context/tier-context.tsx` but never added to providers.tsx.
**How to avoid:** Add TierProvider to providers.tsx. It should be inside ThemeProvider but wrapping all children.
**Warning signs:** Runtime error in any component importing `useTier`.

### Pitfall 4: profiles.tier vs user_subscriptions
**What goes wrong:** Dashboard page reads `profiles.tier` (always 0) instead of checking subscription status.
**Why it happens:** The `profiles` table has a `tier` column (default 0) but it is NEVER updated by the Stripe webhook. The webhook only writes to `user_subscriptions`. These are two disconnected data sources.
**How to avoid:** Either (a) have the webhook also update `profiles.tier`, or (b) always derive tier from `user_subscriptions` via the API. Option (b) is cleaner and avoids dual writes.
**Warning signs:** Dashboard shows Free tier even when user_subscriptions shows active subscription.

### Pitfall 5: Post-Checkout Redirect Does Not Refresh Tier
**What goes wrong:** User completes Stripe checkout, gets redirected to `/dashboard?success=true`, but tier still shows FREE.
**Why it happens:** The dashboard page does not handle `?success=true` query param. Even if TierProvider is mounted, it only fetches on initial mount -- there is no mechanism to re-fetch after returning from Stripe.
**How to avoid:** On detecting `?success=true` in URL, call `tier.refresh()` from TierProvider, show a success toast, and clear the query param.
**Warning signs:** User pays but sees FREE until they fully reload the page.

### Pitfall 6: Webhook Race Condition
**What goes wrong:** User returns from Stripe checkout before the webhook has processed, so tier API still returns FREE.
**Why it happens:** Stripe webhook delivery can take 1-5 seconds. The user's redirect may beat the webhook.
**How to avoid:** Implement a brief polling mechanism or optimistic update on the checkout success page. Poll `/api/user/subscription` every 2 seconds for up to 10 seconds after redirect with `?success=true`. Alternatively, read the `tier` query param from the checkout success URL as an optimistic hint.
**Warning signs:** Tier shows FREE immediately after payment but correct after refresh.

## Code Examples

### Fix 1: Mount TierProvider in providers.tsx

```typescript
// app/providers.tsx
"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import { TierProvider } from "@/lib/context/tier-context";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="system" enableSystem>
      <TierProvider>
        {children}
      </TierProvider>
    </NextThemesProvider>
  );
}
```

### Fix 2: Align tier-context.tsx with actual API response

The API `/api/user/subscription` returns:
```json
{
  "plan": { "id": "fundraising", "name": "Fundraising & Strategy", "price": 99, "priceId": "price_xxx", "features": [...] },
  "subscription": { "status": "active", "currentPeriodEnd": "2026-03-05T...", "cancelAtPeriodEnd": false },
  "isActive": true
}
```

Or for free users:
```json
{
  "plan": { "id": "free", "name": "Free", "price": 0, "priceId": null, "features": [...] },
  "subscription": null,
  "isActive": false
}
```

The tier-context.tsx currently reads `data.subscriptionStatus` (undefined) and `data.planId` (undefined). Fix:

```typescript
// In fetchTier():
const data = await response.json();

// Map subscription status to tier
if (data.isActive && data.subscription?.status === "active") {
  setIsSubscriptionActive(true);

  // Determine tier from plan ID
  const planId = data.plan?.id?.toLowerCase() || "";
  if (planId.includes("studio") || planId.includes("venture")) {
    setTier(UserTier.STUDIO);
  } else if (planId.includes("pro") || planId.includes("fundraising")) {
    setTier(UserTier.PRO);
  } else {
    setTier(UserTier.FREE);
  }
} else {
  setTier(UserTier.FREE);
  setIsSubscriptionActive(false);
}
```

Or more cleanly, use `getTierFromString`:
```typescript
import { getTierFromString } from "@/lib/constants";

// In fetchTier():
const data = await response.json();
if (data.isActive) {
  setIsSubscriptionActive(true);
  setTier(getTierFromString(data.plan?.id || "free"));
} else {
  setTier(UserTier.FREE);
  setIsSubscriptionActive(false);
}
```

### Fix 3: Dashboard layout using real user data

```typescript
// app/dashboard/layout.tsx -- key changes:
import { useTier } from "@/lib/context/tier-context";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { tier, tierName, isLoading: tierLoading } = useTier();
  const [userInfo, setUserInfo] = useState<{ name: string; email: string } | null>(null);

  useEffect(() => {
    async function fetchUser() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("name")
          .eq("id", user.id)
          .single();
        setUserInfo({
          name: profile?.name || user.email?.split("@")[0] || "Founder",
          email: user.email || "",
        });
      }
    }
    fetchUser();
  }, []);

  // Use tier from context instead of hardcoded 0
  const user = {
    name: userInfo?.name || "Loading...",
    email: userInfo?.email || "",
    tier: tier,  // From TierProvider context
  };
  // ... rest of layout uses this user object
}
```

### Fix 4: tier-middleware.ts table name

```typescript
// lib/api/tier-middleware.ts -- line 44-48
// BEFORE (wrong table):
const { data: subscription, error } = await supabase
  .from("subscriptions")  // <-- table doesn't exist
  .select("status, price_id, products(name)")
  .eq("user_id", userId)
  .eq("status", "active")
  .single();

// AFTER (correct table, correct columns):
const { data: subscription, error } = await supabase
  .from("user_subscriptions")
  .select("status, stripe_price_id")
  .eq("user_id", userId)
  .eq("status", "active")
  .single();

// Then use getPlanByPriceId to map to tier:
if (error || !subscription) return UserTier.FREE;
const plan = getPlanByPriceId(subscription.stripe_price_id);
if (!plan) return UserTier.FREE;
return getTierFromString(plan.id);
```

### Fix 5: Post-checkout success handling

```typescript
// In dashboard/page.tsx -- add success handling:
useEffect(() => {
  if (searchParams.get("success") === "true") {
    // Stripe checkout completed - refresh tier
    // The webhook may not have processed yet, so poll briefly
    const pollTier = async () => {
      for (let i = 0; i < 5; i++) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        const res = await fetch("/api/user/subscription");
        const data = await res.json();
        if (data.isActive) {
          // Trigger TierProvider refresh
          // (parent context or window event)
          break;
        }
      }
    };
    pollTier();
    toast.success("Payment successful! Your plan has been upgraded.");
    router.replace("/dashboard", { scroll: false });
  }
}, [searchParams, router]);
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Stripe SDK snake_case | Stripe SDK camelCase (v20+) | v20.0.0 (2025) | Webhook handler already handles both with fallback (lines 17-21 of webhook route) |
| `constructEvent` sync | `constructEvent` still sync in webhook context | Stable | No change needed |
| Stripe Checkout hosted page | Stripe Checkout redirect (current) | Stable | Project uses redirect correctly |
| Manual subscription tracking | Stripe Customer Portal for management | Stable | Portal route exists at `/api/stripe/portal` |

**Deprecated/outdated:**
- `profiles.tier` column: Should not be the source of truth for paid tier. Subscription status from `user_subscriptions` is authoritative.
- `useUserTier()` standalone hook: Duplicates TierProvider logic. Once TierProvider is mounted, components should use `useTier()` instead.

## Open Questions

1. **Does the `user_subscriptions` table actually exist in Supabase?**
   - What we know: `lib/db/subscriptions.ts` references it in SQL. The webhook writes to it. But there is no migration file for it in the codebase (no `*subscri*` or `*stripe*` migration files found).
   - What's unclear: Whether the table was created manually in Supabase Dashboard or via an untracked migration.
   - Recommendation: Verify the table exists via Supabase Dashboard. If not, create a migration. The schema is clear from `lib/db/subscriptions.ts`: `user_subscriptions` with columns `user_id, stripe_customer_id, stripe_subscription_id, stripe_price_id, status, current_period_start, current_period_end, canceled_at, cancel_at_period_end, trial_start, trial_end, created_at, updated_at`.

2. **Does the `stripe_events` table exist?**
   - What we know: The webhook handler calls `recordStripeEvent` which INSERTs into `stripe_events`.
   - What's unclear: Same as above -- no migration file found.
   - Recommendation: Verify and create if missing.

3. **What about the `subscriptions` table that `tier-middleware.ts` queries?**
   - What we know: `tier-middleware.ts` line 45 queries `.from("subscriptions")` with a join to `products(name)`. This suggests a different schema (Supabase-standard billing tables from the Stripe Supabase integration).
   - What's unclear: Whether this table exists or if it was planned but never created.
   - Recommendation: Change `tier-middleware.ts` to use `user_subscriptions` (the table the webhook actually writes to). Abandon the `subscriptions` + `products` schema.

4. **Should profiles.tier be updated when subscription changes?**
   - What we know: `profiles.tier` defaults to 0 and is never updated by any subscription code path. Dashboard page reads it.
   - Two options: (a) Update `profiles.tier` in the webhook alongside `user_subscriptions`, or (b) Stop reading `profiles.tier` and always derive tier from subscription API.
   - Recommendation: Option (b) is cleaner. `profiles.tier` is tech debt from early mocking. Derive tier from `user_subscriptions` via the API. If server components need tier, query `user_subscriptions` directly. However, as a belt-and-suspenders approach, also updating `profiles.tier` in the webhook is acceptable for backward compatibility.

5. **Is Phase 05 (Auth Fix) complete?**
   - What we know: Root `middleware.ts` exists and was created per the Phase 05 plan. No Phase 05 summary file exists, suggesting it may be partially done.
   - What's unclear: Whether the Supabase database migration was run and whether the onboard flow was fixed.
   - Recommendation: Phase 06 should assume auth works (middleware exists, session refresh works). If auth is still broken at runtime, Phase 05 must be completed first. Phase 06 tasks should be designed to work independently from auth state (test with mock/manual auth if needed).

## Sources

### Primary (HIGH confidence)
- Codebase analysis: All files listed above were read in full
  - `lib/context/tier-context.tsx` -- TierProvider and the response shape mismatch
  - `app/providers.tsx` -- Missing TierProvider mount
  - `app/dashboard/layout.tsx` -- Hardcoded tier: 0
  - `app/api/user/subscription/route.ts` -- Actual API response shape
  - `app/api/stripe/webhook/route.ts` -- Webhook writes to user_subscriptions
  - `lib/api/tier-middleware.ts` -- Queries wrong table name
  - `lib/db/subscriptions.ts` -- user_subscriptions table schema
  - `lib/stripe/config.ts` -- Plan IDs and price mappings
  - `lib/constants.ts` -- UserTier enum, getTierFromString, canAccessFeature

### Secondary (MEDIUM confidence)
- Phase 05 research (`.planning/phases/05-auth-onboarding-fix/05-RESEARCH.md`) -- Auth infrastructure status
- Stripe SDK v20 installed (`stripe@20.1.0`) -- API version `2025-12-15.clover`
- `.env.example` -- Stripe configuration variables (STRIPE_SECRET_KEY, webhook secret, price IDs)

### Tertiary (LOW confidence)
- Whether `user_subscriptions` and `stripe_events` tables actually exist in Supabase (cannot verify without Dashboard access)
- Whether `subscriptions` table exists (referenced by tier-middleware.ts but likely does not exist)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All packages already installed, versions verified from package.json/node_modules
- Architecture (bug identification): HIGH - All four bugs confirmed through direct code reading, response shape mismatch is provable from comparing API route output with context consumer
- Architecture (fix approach): HIGH - Straightforward wiring fixes, no architectural changes needed
- Pitfalls: HIGH - All issues derived from direct code analysis, not speculation
- Database tables: MEDIUM - Cannot verify table existence without Supabase Dashboard, but schema is clear from code

**Research date:** 2026-02-05
**Valid until:** 2026-03-05 (fixes are project-specific wiring, not dependent on external library changes)

## Fix Priority Order

1. **Mount TierProvider** (providers.tsx) -- Prerequisite for everything else. Without this, no component can read tier.
2. **Fix API response shape consumption** (tier-context.tsx) -- Without this, TierProvider always returns FREE even when mounted.
3. **Fix table name** (tier-middleware.ts) -- Server-side tier gating currently broken.
4. **Replace hardcoded mock in dashboard layout** (layout.tsx) -- Use useTier() + Supabase auth for real data.
5. **Handle post-checkout success** (dashboard/page.tsx) -- Refresh tier after Stripe redirect.
6. **Fix settings page hardcoded data** (settings/page.tsx) -- Same issue as dashboard layout.

All six fixes are in one plan (06-01-PLAN.md) since they are interdependent and small.
