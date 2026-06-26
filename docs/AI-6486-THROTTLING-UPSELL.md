# AI-6486 — Free-plan daily throttling + strategic upsell triggers

Builds on the AI-6487 usage-tracking foundation. Where AI-6487 governs the
**monthly credit budget**, this adds **daily per-action-type limits** that keep
the free tier valuable but bounded, and the **upsell triggers** that turn
hitting a limit into a conversion moment (per Fred Cary's tiered-pricing plan,
Sahara Founders meeting 2026-03-31).

## Two cost dimensions (intentionally separate)

| Concern | Module | Question it answers |
|---|---|---|
| Credit cost | `lib/usage/credits.ts` | "How expensive is this action?" (voice burns 10× a chat) |
| Daily throttle | `lib/usage/throttle.ts` | "How many of this action may I take per day on my tier?" |

Voice is both the most expensive (credits) and the scarcest daily (throttle) —
"if they talk with the model, they're going to burn the tokens up faster"
(William Hood).

## What shipped

### Core logic — `lib/usage/throttle.ts` (pure, unit-tested)
- `DEFAULT_TIER_DAILY_LIMITS` — per-tier, per-action daily caps. FREE is tight
  (chat 15, voice 3, reports 1, …); paid tiers lift or remove caps; STUDIO has
  none (`null` = unlimited, bounded only by monthly credits).
- Env-overridable: `USAGE_DAILY_LIMITS` (JSON keyed by tier number),
  `USAGE_APPROACH_RATIO` (0..1, default 0.8) — no deploy needed to tune pricing.
- `computeActionThrottle()` → `{ limit, used, remaining, blocked, approaching,
  percentUsed, unlimited }`.
- `getUpsellReason()` → `"limit_reached"` (hard block wins) | `"approaching_limit"`
  (soft nudge) | `null`.
- Daily-reset clock: `startOfUtcDay`, `nextUtcDayReset`, `secondsUntilReset`.

### Data layer — `lib/db/usage.ts`
- `getActionCountsToday` / `getActionCountToday` — today's action counts (UTC),
  reusing `usage_records` (no new table).
- `getDailyThrottleStatus(userId)` — resolves tier, counts today, returns
  per-action status + reset time + upsell decision.
- `checkDailyAction(userId, tier, action)` — single-action gate for the track route.
- `getUsageByTier(since)` — admin aggregate bucketed by tier.

### API
- `GET /api/usage/throttle` — daily throttle status for the current user.
- `POST /api/usage/track` — now enforces the daily throttle **after** the
  monthly credit check. Returns **429** with `{ reason: "daily_limit", throttle,
  resetsAt, upgradeUrl }` + a `Retry-After` header when a daily cap is hit, and
  echoes the post-charge `throttle` status on success so the client can refresh
  its meter without a second round-trip.
- `GET /api/admin/usage` — now includes a `byTier` breakdown.

### Client UI
- `lib/hooks/use-daily-usage.ts` — `useDailyUsage()` hook (`throttle`, `refresh`,
  `forAction`, `isBlocked`, `shouldUpsell`).
- `components/usage/usage-meter.tsx` — `<UsageMeter />` remaining-usage indicator
  with per-action progress bars + "resets in Xh". Renders nothing for uncapped
  (paid) tiers.
- `components/usage/upsell-banner.tsx` — `<UpsellBanner />` strategic upsell
  trigger; copy/urgency vary by reason; CTA → `/pricing`.

### Admin — `app/admin/usage/page.tsx`
- New "Usage by tier" table (active users / actions / credits per tier).

### Schema — `lib/db/migrations/083_usage_daily_throttle.sql`
- Composite index `(user_id, action_type, created_at DESC)` so the daily count
  is a fast range scan. No new tables/columns — daily throttling reuses the
  `usage_records` written by AI-6487.

## Acceptance criteria → implementation

| Criterion | Where |
|---|---|
| Daily limits enforced on free plan, configurable per action type | `lib/usage/throttle.ts` + `checkDailyAction` in track route |
| Upsell trigger UI when approaching/hitting limits | `UpsellBanner` + `getUpsellReason` |
| Different token costs for voice vs chat tracked | `credits.ts` ACTION_COSTS (voice 10, chat 1) + scarcer daily voice cap |
| Usage resets daily; clear visual indicator of remaining usage | UTC-day reset clock + `<UsageMeter />` |
| Admin dashboard: aggregate usage per tier | `getUsageByTier` + admin "Usage by tier" table |

## Verification
- `npx vitest run lib/usage` → 33/33 pass (9 credits + 24 throttle).
- `npx tsc --noEmit` → 0 errors.
- `npx eslint` on all new/changed files → 0 errors.

## Usage example

```tsx
import { UsageMeter } from "@/components/usage/usage-meter";
import { UpsellBanner } from "@/components/usage/upsell-banner";

export function DashboardSidebar() {
  return (
    <>
      <UpsellBanner />        {/* shows only when approaching/at a daily limit */}
      <UsageMeter />          {/* per-action remaining usage; hidden for paid tiers */}
    </>
  );
}
```
