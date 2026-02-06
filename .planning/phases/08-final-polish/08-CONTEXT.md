# Phase 08: Final Polish & Chat Wiring

**Goal:** Close all remaining tech debt from v1.0 re-audit. Wire chat to FRED engine, fix dead buttons, clean up stubs and orphaned code.

## Gap Source

From `.planning/v1.0-MILESTONE-AUDIT.md` (2026-02-06):

### P0 — Must Fix
1. **Chat interface calls wrong API** — `components/chat/chat-interface.tsx` line 46 calls `/api/chat` (legacy) instead of `/api/fred/chat`. The entire Phase 01 FRED cognitive engine is bypassed.

### P1 — Should Fix
2. **Dashboard CTA dead button** — `app/dashboard/page.tsx` lines 351-356 "Upgrade Now" button has no onClick handler.
3. **Reality Lens getUserTier() stub** — `app/api/fred/reality-lens/route.ts` lines 44-48 always returns "free".
4. **SMS nav to static mockup** — `app/dashboard/layout.tsx` lines 113-114 "Weekly Check-ins" links to `/dashboard/check-ins` (static) not `/dashboard/sms` (functional).

### P2 — Minor
5. **Dashboard stats hardcoded** — `app/dashboard/page.tsx` lines 118-202 static values and fake activity.
6. **Legacy investor-score orphaned** — `/dashboard/investor-score/page.tsx` and `/api/investor-score/route.ts` dead code.
7. **Dual auth import pattern** — `@/lib/auth` vs `@/lib/supabase/auth-helpers`.

## Key Files

| File | Role | Fix Needed |
|------|------|------------|
| `components/chat/chat-interface.tsx` | Chat UI | Use `useFredChat` hook instead of raw `/api/chat` fetch |
| `lib/hooks/use-fred-chat.ts` | FRED chat hook | Already calls `/api/fred/chat` with SSE streaming — just need to adopt it |
| `app/api/fred/chat/route.ts` | FRED chat API | Target endpoint (already exists, uses XState + memory) |
| `app/api/chat/route.ts` | Legacy chat API | Delete after rewiring |
| `app/dashboard/page.tsx` | Dashboard | Fix CTA button, replace mock stats |
| `app/api/fred/reality-lens/route.ts` | Reality Lens API | Replace `getUserTier` stub with real subscription lookup |
| `lib/api/tier-middleware.ts` | Tier utilities | Has working `getUserTier()` — reuse pattern |
| `app/dashboard/layout.tsx` | Dashboard nav | Fix check-ins href |
| `app/dashboard/check-ins/page.tsx` | Static mockup | Delete |
| `app/dashboard/investor-score/page.tsx` | Legacy page | Delete |
| `app/api/investor-score/route.ts` | Legacy API | Delete |
| `components/dashboard/UpgradeTier.tsx` | Upgrade component | Already exists — use for CTA |
| `lib/stripe/client.ts` | Stripe client | Has `redirectToCheckoutByTier()` — use for CTA |

## Dependencies

- `useFredChat` hook already calls `/api/fred/chat` with full SSE streaming
- `CognitiveStateIndicator` component ready for use with `FredState`
- `getUserTier` in `lib/api/tier-middleware.ts` already has the full `getUserSubscription() → getPlanByPriceId() → getTierFromString()` chain
- `UpgradeTier` component already used in settings page and sidebar

## Auth Import Pattern

`@/lib/auth` is a re-export barrel that imports everything from `@/lib/supabase/auth-helpers`. Both resolve to the same functions. The FRED routes (Phase 01) import from `@/lib/supabase/auth-helpers` directly, while pre-existing routes use `@/lib/auth`. Standardize on `@/lib/auth` since it's the public API and has 46 consumers vs 7.
