---
phase: 91-foundation-schema-tier
plan: 04
subsystem: payments
tags: [stripe, env-vars, builder-tier]

# Dependency graph
requires:
  - phase: 91-01
    provides: founder_reports schema and CRUD
provides:
  - NEXT_PUBLIC_STRIPE_BUILDER_PRICE_ID env var placeholder in .env.local
  - Manual Stripe product/price creation instructions documented
  - Verified lib/stripe/config.ts reads BUILDER priceId from env var
affects: [91-05, pricing-page, checkout-flow]

# Tech tracking
tech-stack:
  added: []
  patterns: []

key-files:
  created: []
  modified:
    - .env.local

key-decisions:
  - "Placeholder env var set (PENDING_STRIPE_SECRET_KEY) because Stripe secret key not yet available"
  - "Manual creation steps documented inline in .env.local comments"
  - "No code changes needed — lib/stripe/config.ts already reads from process.env correctly"

patterns-established: []

# Metrics
duration: 8min
completed: 2026-04-08
---

# Phase 91 Plan 04: Stripe Builder Price ID env var setup with placeholder and manual creation instructions

**NEXT_PUBLIC_STRIPE_BUILDER_PRICE_ID set as placeholder in .env.local; Stripe secret key unavailable so product/price creation documented as manual follow-up**

## Performance

- **Duration:** 8 min
- **Started:** 2026-04-08T19:36:31Z
- **Completed:** 2026-04-08T19:44:00Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- Verified `lib/stripe/config.ts` PLANS.BUILDER.priceId correctly reads from `process.env.NEXT_PUBLIC_STRIPE_BUILDER_PRICE_ID` (line 19)
- Uncommented and set `NEXT_PUBLIC_STRIPE_BUILDER_PRICE_ID=PENDING_STRIPE_SECRET_KEY` in `.env.local`
- Documented inline Stripe product/price creation commands for when secret key becomes available
- Confirmed build succeeds with placeholder value (221 pages compile)
- Searched 1Password — found `STRIPE-sierra-fred-carey` item but only contains publishable key, no secret key

## Task Commits

Since `.env.local` is gitignored (correctly), there are no git-trackable code changes for this plan. The work is environment configuration only.

**Plan metadata:** (see below)

## Files Created/Modified
- `.env.local` — Uncommented NEXT_PUBLIC_STRIPE_BUILDER_PRICE_ID with placeholder, added manual creation instructions as comments

## Decisions Made
- **Placeholder approach over blocking:** Per execution context instructions, set a placeholder value rather than blocking the phase on missing Stripe credentials. The placeholder `PENDING_STRIPE_SECRET_KEY` is clearly non-functional and will be replaced when the real key is available.
- **No code changes needed:** `lib/stripe/config.ts` already reads from the env var via `process.env.NEXT_PUBLIC_STRIPE_BUILDER_PRICE_ID` — no modification required.
- **Inline documentation:** Added curl commands as comments in `.env.local` for creating the Builder product ($39/mo) and price when the Stripe secret key (`sk_live_*`) is obtained.

## Deviations from Plan

None — plan executed as written with the credential-unavailable fallback path.

## Issues Encountered

- **Stripe secret key not available:** The `.env.local` has `STRIPE_SECRET_KEY` commented as PENDING. The 1Password vault (`STRIPE-sierra-fred-carey`) only contains the publishable key. The note says "Fabe provided 'mk_' prefix key, needs sk_live_ key." This blocks actual Stripe API calls to create the product/price.

## Manual Steps Required

Once the Stripe secret key (`sk_live_*`) is available:

1. **Set the secret key in `.env.local`:**
   ```
   STRIPE_SECRET_KEY=sk_live_XXXXX
   ```

2. **Create the Builder product:**
   ```bash
   curl -s https://api.stripe.com/v1/products -u "$STRIPE_SECRET_KEY:" \
     -d name="Builder" \
     -d 'description=Sahara Builder tier - $39/month' \
     -d metadata[tier]=builder
   ```

3. **Create the $39/month price on that product:**
   ```bash
   curl -s https://api.stripe.com/v1/prices -u "$STRIPE_SECRET_KEY:" \
     -d product=prod_XXXXX \
     -d unit_amount=3900 \
     -d currency=usd \
     -d 'recurring[interval]=month' \
     -d nickname="Builder Monthly" \
     -d lookup_key=builder
   ```

4. **Update `.env.local`:**
   ```
   NEXT_PUBLIC_STRIPE_BUILDER_PRICE_ID=price_XXXXX
   ```

5. **Add to Vercel:**
   ```bash
   npx vercel env add NEXT_PUBLIC_STRIPE_BUILDER_PRICE_ID production
   ```

## Next Phase Readiness
- Config.ts is correctly wired to read the env var
- Build succeeds with placeholder — no compilation blockers
- **Blocker:** Real Stripe price creation requires `sk_live_*` secret key
- Once secret key is obtained, follow Manual Steps above to complete

---
*Phase: 91-foundation-schema-tier*
*Completed: 2026-04-08*
