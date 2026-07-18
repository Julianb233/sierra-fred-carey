# AI-3493 - Alex Temporary Solution Handoff to Julian's Sahara Platform

> Linear: AI-3493
> Source meeting: Sahara Founders, 2026-03-18
> Scope: document Alex's temporary feature/data surface, map it to Julian's Sahara platform, and define the migration continuity plan.
> Status: repo handoff artifact, no production credential entry or domain cutover performed.

## Executive Summary

Alex's temporary solution was the `you.joinsahara.com` Vite/Firebase funnel. Julian's platform is the `Julianb233/sierra-fred-carey` Next.js/Supabase app at `joinsahara.com`.

The hard continuity work is mostly complete in this repo:

- Alex's funnel code is present in `funnel/` and has already been repointed from Firebase to Supabase.
- The 65-user Firebase cohort was imported into Supabase profiles with raw Firebase payloads preserved for remapping.
- Bridge APIs exist for funnel sync, funnel checkout, and subscription reconciliation.
- Julian's platform is a functional superset of the temporary funnel for product breadth: FRED chat, Oases journey, Reality Lens, investor readiness, pitch deck review, dashboard surfaces, virtual team agents, SMS/check-ins, and Boardy placeholders.

The remaining risk is not "missing migration code." It is continuity discipline: prove the imported data renders in the unified app, decide how to serve or retire the Vite funnel, and avoid autonomous production routing changes until Alex/Julian confirm the current Vercel/domain ownership path.

## Systems Map

| Surface | Alex temporary solution | Julian Sahara platform | Continuity status |
|---|---|---|---|
| Public funnel | `you.joinsahara.com` Vite SPA | `joinsahara.com` Next.js App Router | Funnel source is in repo under `funnel/`; final hosting topology still requires human routing decision. |
| Auth | Firebase Auth | Supabase Auth | 65 users migrated; password hashes cannot be reused, so recovery-link reset flow is required. |
| User/profile data | Firestore user docs | Supabase `profiles` plus related tables | Imported profiles preserve source payload in enrichment data; field rendering still needs authenticated verification. |
| Funnel pre-signup activity | Vite/Firebase session state | `/api/funnel/sync` into `funnel_sessions` | Bridge API exists; needs fresh end-to-end smoke against current deployed funnel. |
| Payments | Funnel checkout handoff | Stripe checkout plus `/api/funnel/reconcile` | Bridge exists; no live Stripe/product changes made in this task. |
| Founder journey | Old Flow/Oases experience | Dashboard journey/Oases/progress surfaces | New app is broader, but visible 120-step/checklist rigor remains a product gap from AI-6019. |
| FRED/chat/coaching | Temporary funnel chat | FRED chat, voice, SMS, memory, Reality Lens, IRS | New platform is stronger; migrated-user context rendering must be verified with test account. |
| Investor intro path | Boardy concept/API verification needed | Boardy dashboard/demo/mock client | Product surface exists; real Boardy API remains blocked on partnership/API credentials. |

## Alex Feature Set Inventory

Evidence from repo docs and vault notes points to the temporary solution providing:

1. Public onboarding/welcome page with the "This is not a chatbot, this is a journey" positioning.
2. Lightweight founder intake and journey capture before full account creation.
3. Flow/Oases-oriented guided startup journey framing.
4. Firebase-backed auth and Firestore-backed user/profile/progress storage.
5. Redirect/handoff behavior between `you.joinsahara.com` and `joinsahara.com`.
6. Early funnel checkout path before a full platform account exists.
7. A smaller post-login journey experience used by the internal Sahara team before consolidation.

The most important UX asset from Alex's surface is the emotional framing. The 2026-04-22 UI audit identified this as a P0 gap because the old public onboarding page led with founder-safety language, while the new `/get-started` flow begins with segmentation.

## Julian Platform Coverage

The current repo already covers the migrated product scope at greater breadth:

- Public marketing, pricing, product, demo, terms, privacy, and support surfaces.
- Auth routes: login, signup, password reset, verification, onboarding/welcome.
- Dashboard routes for journey, agents, AI insights, analytics, Boardy, documents, investor readiness, investor targeting, memory, monitoring, next steps, pitch deck, positioning, profile, reality lens, settings, SMS, startup process, strategy, and wellbeing.
- FRED APIs for chat, decisioning, analysis, memory, pitch review, and reality lens.
- Journey/Oases components and completion services.
- Supabase-backed API routes and migrations.
- Stripe subscription framework and funnel reconciliation.
- Boardy dashboard/demo/mock client surfaces pending real API credentials.

## Data Continuity Checklist

These checks should be run before any final funnel retirement or permanent redirect:

| Check | Method | Pass condition |
|---|---|---|
| Migrated auth cohort | Supabase/admin migration audit | 65 expected users present, no duplicate canonical emails, reset path available. |
| Profile field parity | `GET /api/admin/migration-audit` | No critical gaps for phone, location, target market, stage category, weak spot, idea status, passions, partner status. |
| Raw Firestore preservation | Inspect imported profile enrichment payload | Original Firebase/Firestore payload exists for remapping without needing Alex to re-export. |
| Funnel session bridge | Post a test `sessionId` through `/api/funnel/sync` | `funnel_sessions` stores chat/progress and can be linked after signup. |
| Checkout bridge | Test-mode `/api/funnel/checkout` plus `/api/funnel/reconcile` | Pending subscription links to the final authenticated user without duplicate customer creation. |
| Migrated user landing | Authenticated walkthrough as a migrated user | User lands on a continuity-aware surface, not a confusing cold-start flow. |
| Public journey framing | Browser check of `/get-started` or public journey page | The old emotional "guided journey" promise is visible before signup. |
| Boardy readiness | Inspect Boardy config and API client | Mock client remains gated until real Boardy credentials/contract are available. |

## Migration Execution Plan

### Phase 1 - Freeze the Source of Truth

- Treat `Julianb233/sierra-fred-carey` as the platform source.
- Treat `funnel/` in this repo as the canonical copy of Alex's funnel only after Alex confirms it matches the live `you.joinsahara.com` Vercel project.
- Do not perform autonomous domain, Vercel alias, DNS, or production credential changes.

### Phase 2 - Verify Data and Auth Continuity

- Run the migration audit endpoint against a non-destructive admin session.
- Confirm all migrated users have a valid reset path.
- Confirm imported raw Firebase data remains available for remapping.
- Reconcile the historical 150-user claim against the verified 65-user export before Fred uses the number in investor materials.

### Phase 3 - Verify Feature Continuity

- Use a migrated test account to walk:
  - login/reset
  - dashboard/journey
  - reality lens
  - FRED chat
  - profile/memory
  - next steps
  - investor readiness
- Capture screenshots and API responses for each surface.
- Validate that migrated users see a continuity/welcome-back explanation.

### Phase 4 - Choose Funnel Hosting End State

There are two safe paths:

| Option | Description | Use when |
|---|---|---|
| D1 - Port funnel into Next.js route group | Rebuild `funnel/src` as `app/(funnel)/...` | Long-term maintainability matters more than speed. |
| D2 - Serve existing Vite funnel under the unified Vercel project | Keep Vite build but proxy/serve it under the same project/domain | Fastest route to one domain while preserving Alex's current UX. |

Recommendation: D1 is cleaner long-term. D2 is acceptable if the only urgent goal is one domain and no cross-site auth/data drift.

### Phase 5 - Retire Temporary Routing

Only after human approval and verified smoke tests:

- Remove temporary middleware bounces to `you.joinsahara.com`.
- Move or reclaim Vercel aliases.
- Add permanent redirects from legacy paths to canonical platform paths.
- Keep rollback notes for at least 30 days.

## Boardy API Capability Notes

The issue explicitly asks to verify Boardy investor intro integration capability. Current evidence:

- User-facing Boardy surfaces exist in `app/dashboard/boardy/page.tsx`, `app/demo/boardy/page.tsx`, and pricing/features copy.
- Current Boardy implementation is a gated/mock integration, not a live investor-intro API.
- Real Boardy handoff is blocked until Sahara has confirmed partnership/API credentials and allowed scopes.

No credential entry, partnership acceptance, paid API activation, or live investor outreach was performed for this task.

## Human-Only Blockers

These are not safe autonomous actions:

1. Alex confirmation that the checked-in `funnel/` directory is the current live funnel source.
2. Julian/Alex decision on D1 vs D2 hosting.
3. Vercel/domain/DNS alias movement for `joinsahara.com`, `www.joinsahara.com`, or `you.joinsahara.com`.
4. Production Stripe, Supabase, Boardy, or Vercel credential entry.
5. Any real Boardy partnership acceptance, paid API activation, or investor intro send.

## Recommended Next Linear Follow-Ups

- Add "Welcome back" continuity banner for migrated Firebase users.
- Port old Flow emotional framing into the public `/get-started` or `/journey` surface.
- Add authenticated migrated-user walkthrough test and evidence capture.
- Wire the 120-step IdeaPros journey template into persistent per-step progress.
- Replace Boardy mock client only after real API credentials and partnership scope are available.

## Source Evidence

- `docs/AI-7364-CONSOLIDATION-AUDIT.md`
- `docs/AI-6019-FUNCTIONAL-GAPS-VS-JULIANS-SYSTEM.md`
- `docs/PRD-sahara-product-requirements-2026-03.md`
- `docs/IDEAPROS-JOURNEY-MAPPING.md`
- `docs/SAHARA-NOTEBOOKLM-SOURCE.md`
- `app/dashboard/boardy/page.tsx`
- `app/demo/boardy/page.tsx`
- `/opt/agency-workspace/obsidian-vault/Projects/Sahara/2026-04-22-flow-vs-new-ui-audit.md`
- `/opt/agency-workspace/obsidian-vault/Projects/Sahara/2026-04-22-migration-gap-plan.md`
- `/opt/agency-workspace/obsidian-vault/Projects/Sahara/notebooklm-sources/03-migration-plan-staged.md`
