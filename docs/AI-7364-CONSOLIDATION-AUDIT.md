# AI-7364 — Julian + Alex Codebase Consolidation Audit & Merge Strategy

> **Source:** Sahara Founders meeting 2026-04-08 · **Coordinator:** William (Bill) Hood · **Dev:** Julian Bradley
> **Status of this document:** living audit. Reflects repo state as of the AI-7364 PR.

Bill Hood's framing from the founders meeting: the current setup is *"unusual but working"* — users
get redirected between Julian's site and Alex's at different points. Consensus: consolidate into one
platform. This document audits where that stands today, what is already merged, what remains, and the
strategy + blockers to finish it.

---

## 1. The two codebases

| | **Julian's platform** (this repo) | **Alex's funnel** |
|---|---|---|
| Owner | Julian Bradley | Alex LaTorre (323-807-7736) |
| Repo | `Julianb233/sierra-fred-carey` | originally a standalone Vite + Firebase build |
| Framework | Next.js 16 / React 19 / TypeScript (App Router) | Vite + React (static SPA) |
| Auth | Supabase Auth (JWT via `jose`) | originally Firebase Auth |
| Data | Supabase (PostgreSQL) | originally Firebase / Firestore |
| Surface | Full product: dashboard, agents, chat, investor readiness, pitch-deck review, admin, voice | Lightweight top-of-funnel chat + journey capture |
| Live host | `joinsahara.com` (apex/www) | `you.joinsahara.com` |

The "two sites" problem: marketing/product pages on Julian's platform hand users off to
`you.joinsahara.com` (Alex's funnel), and the funnel points back to `joinsahara.com` for advanced
features — a cross-site ping-pong with two auth systems and two data stores behind it.

---

## 2. What is ALREADY consolidated (done in prior PRs)

Consolidation is substantially underway. The following has already landed in this repo:

### 2.1 User data migration — Firebase → Supabase (DONE, 2026-04-21)
- **65-user cohort** imported from Alex's Firebase into the Supabase `profiles` table, tagged
  `enrichment_source = "firebase_migration_2026_04_21"`.
- Firebase subcollection data preserved in `profiles.enrichment_data` for parity checks.
- Admin tooling shipped:
  - `GET /api/admin/migration-audit` — diagnoses per-user migration gaps (profile parity across
    `phone / location / target_market / stage_category / weak_spot / idea_status / passions /
    has_partners`, `oases_progress` row coverage, `startup_processes` presence). Bill Hood verifies
    via the admin panel (AI-8888).
  - `POST /api/admin/migration-backfill` — fills detected gaps.
- Login disambiguation: `GET /api/auth/check-account` flags migrated accounts so the login page can
  tell "wrong password" apart from "migrated user who never set a password" and route them to reset.

### 2.2 Funnel ported into the monorepo (DONE)
- Alex's funnel now lives in-repo at **`funnel/`** as `sahara-funnel` (Vite + React).
- Critically, it has been **re-pointed from Firebase to Supabase** (`@supabase/supabase-js` —
  no `firebase` dependency in `funnel/package.json`). The two data stores are already unified on
  Supabase.

### 2.3 Funnel ↔ platform bridge APIs (DONE)
- `POST /api/funnel/sync` — receives funnel chat + journey progress (keyed by `sessionId`) into
  `funnel_sessions`, so a user's pre-signup activity pre-populates their account on signup.
- `POST /api/funnel/checkout` — unauthenticated Stripe checkout for funnel visitors who don't have
  accounts yet.
- `POST /api/funnel/reconcile` — links a `funnel-pending` Stripe subscription to the real user once
  they finish signup on the main app.

**Net:** the hard parts (auth unification, user-data migration, payment reconciliation across the two
surfaces) are already shipped. What remains is primarily *deployment topology* and removing the
cross-site hops.

---

## 3. What REMAINS (the actual "two sites" gap)

### 3.1 Two separate deployments still exist
- Julian's Next.js app is deployed at `joinsahara.com`.
- The funnel is still served as a **separate deployment** at `you.joinsahara.com` (Alex's Vercel
  project).
- `middleware.ts` currently **302-bounces** inbound `joinsahara.com` / `www.joinsahara.com` traffic
  over to `you.joinsahara.com` (with `/api/*`, `/auth/*`, `/_next/*`, `/get-started`, `/start-now`,
  `/startnow` allow-listed so webhooks/auth/assets aren't redirected). The bounce is intentionally
  temporary (302, not 308) and is meant to be removed once the funnel is served from the unified
  platform.

### 3.2 Scattered hand-off links — ADDRESSED IN THIS PR
- ~15 user-facing links across marketing/product pages hardcoded `https://you.joinsahara.com`
  (navbar, hero, footer, pricing CTA, login, features, investor-readiness tool, and 4 demo pages).
- **This PR centralizes them** into a single source of truth: `FUNNEL_URL` in `lib/constants.ts`
  (env override `NEXT_PUBLIC_FUNNEL_URL`, default preserves current behavior). The funnel-checkout
  route now reads the same constant.
- **Why it matters for consolidation:** flipping the funnel destination to the unified platform is
  now a one-line env change instead of a 15-file edit. This is the enabling refactor for step 4.3.

### 3.3 Repo sync with Alex
- Per the Linear issue, repo access from Alex (323-807-7736) is the coordination item. The funnel
  source is already in `funnel/`; what still needs confirmation is whether Alex's `you.joinsahara.com`
  Vercel project should be **retired** (and its domain alias reclaimed) once the unified app serves
  the funnel, or kept as a fallback. **This is a human/coordination decision — see Blockers.**

---

## 4. Merge strategy (remaining steps)

```
[ DONE ] Phase A — Data unification
         Firebase users → Supabase profiles (65-user cohort, 2026-04-21)
         Migration audit + backfill tooling
                    │
[ DONE ] Phase B — Code co-location
         funnel/ ported into monorepo, re-pointed to Supabase
         Bridge APIs: /api/funnel/{sync,checkout,reconcile}
                    │
[THIS PR] Phase C — Single source of truth for the hand-off URL
         FUNNEL_URL constant + NEXT_PUBLIC_FUNNEL_URL env
                    │
[ NEXT ] Phase D — Serve the funnel from the unified platform
         Option D1: mount funnel as a route group in the Next app
         Option D2: keep funnel/ as a Vite build, serve under a path on the
                    same Vercel project (rewrites)
         → then set NEXT_PUBLIC_FUNNEL_URL to the in-platform path
                    │
[ NEXT ] Phase E — Retire the cross-site bounce
         Remove the joinsahara.com → you.joinsahara.com middleware block
         Reclaim joinsahara.com / www aliases on the unified Vercel project
                    │
[ NEXT ] Phase F — Decommission you.joinsahara.com
         Confirm with Alex, add 308 redirects to canonical paths, then sunset
```

### 4.3 Decision needed before Phase D
Two viable end-states for serving the funnel from one deployment:

| Option | Pros | Cons |
|---|---|---|
| **D1 — Re-implement funnel as a Next route group** (`app/(funnel)/...`) | One framework, one build, shared components/auth/analytics, no separate Vite toolchain | Requires porting `funnel/src` React → Next App Router; most work |
| **D2 — Serve the existing Vite `funnel/` under a path via Vercel rewrites** | Minimal code change; reuse Alex's funnel as-is | Two build systems in one project; duplicated styling/deps |

Recommendation: **D1** for long-term maintainability (single toolchain, the funnel is small), but
**D2** is the faster path to "one domain, no cross-site redirect" if speed matters for the founders
timeline. Either way Phase C (this PR) is the prerequisite — the destination is now a single env flip.

---

## 5. Overlap / conflict surface (resolved + watch-items)

| Area | Status |
|---|---|
| Auth (Supabase vs Firebase) | **Resolved** — funnel on Supabase; Firebase users migrated with reset path |
| User data store | **Resolved** — single Supabase `profiles` + `funnel_sessions` |
| Payments | **Resolved** — funnel checkout + reconcile link to the same Stripe customer/user |
| Hand-off URL drift | **Resolved in this PR** — `FUNNEL_URL` single source of truth |
| Duplicate styling/deps | **Watch** — `funnel/` still ships its own Tailwind + React if D2 is chosen |
| SEO / canonical | **Watch** — `app/layout.tsx`, `robots.ts`, `sitemap.ts` default `metadataBase` to `you.joinsahara.com`; revisit when the canonical host flips to the unified app |
| Domain aliases | **Open** — `joinsahara.com` + `www` need to move to the unified Vercel project (Phase E) |

---

## 6. Blockers (need human input — not codeable by an agent)

1. **Alex coordination (323-807-7736):** confirm whether `you.joinsahara.com` / its Vercel project is
   retired or kept as fallback after Phase D, and that the funnel source in `funnel/` is the
   canonical, current copy.
2. **Julian routing decision:** D1 vs D2 (section 4.3), and the go-ahead to remove the live
   `middleware.ts` apex bounce (Phase E) — this changes production traffic routing for the primary
   domain and must be Julian's call, not an autonomous edit.
3. **Domain alias move:** reclaiming `joinsahara.com` + `www.joinsahara.com` on the unified Vercel
   project is a DNS/Vercel-dashboard action.

---

## 7. Changes in the AI-7364 PR

- `lib/constants.ts` — new `FUNNEL_URL` single source of truth (`NEXT_PUBLIC_FUNNEL_URL` override,
  default unchanged → no behavior change).
- 11 marketing/product files re-pointed from the hardcoded `https://you.joinsahara.com` string to
  `FUNNEL_URL` (navbar, hero, footer, pricing, login, features, investor-readiness, and the boardy /
  pitch-deck / reality-lens / virtual-team demos).
- `app/api/funnel/checkout/route.ts` — reads `FUNNEL_URL` instead of re-deriving the env default.
- `.env.example` — documents `NEXT_PUBLIC_FUNNEL_URL`.
- This audit doc.

**Verification:** `tsc --noEmit` clean (before and after); `eslint` on changed files — 0 errors
(only pre-existing, unrelated warnings). No runtime behavior change — `FUNNEL_URL` defaults to the
current live value.
