# Sahara Launch Gap Analysis
**Date:** 2026-02-26
**Current State:** Phase 69/70 complete (97%) — 838/838 tests passing

---

## Current Platform Health

| Metric | Status |
|--------|--------|
| Test suite | ✅ 838/838 passing (46 files) |
| TypeScript | ✅ 0 errors |
| Production deploy | ✅ joinsahara.com live |
| Build | ✅ Clean (221 pages) |
| WCAG 2.1 AA | ✅ Compliant |
| PWA / Offline | ✅ Serwist active |
| Voice (LiveKit) | ✅ Built + hardened |
| SMS (Twilio) | ✅ Built (compliance pending) |
| Push Notifications | ✅ Working |
| Content Library | ✅ Built (no content yet) |
| Service Marketplace | ✅ Built (no providers yet) |
| FRED Intelligence | ✅ Memory, mode-switching, tools |

---

## 🔴 CRITICAL — Blocks Launch

These must be resolved before any user can have a good experience.

### 1. FRED Chat Timeouts (Latency)
**Impact:** Every non-trivial conversation times out at 10 seconds on Vercel Hobby plan
**Root cause:** No `export const maxDuration` in `app/api/fred/chat/route.ts` — defaults to 10s
**Fix:** Add `export const maxDuration = 60` — 5 minute fix
**Additional latency issues (from .planning/FRED-CHAT-LATENCY-REPORT.md):**
- `getGateRedirectCount` makes redundant 4th sequential DB call (+50–150ms)
- `synthesize.ts` triggers hidden GPT-4o `scoreDecision` call on every decision_request (+800ms–3s)
- `storeEpisode` awaited BEFORE streaming starts, blocking first token (+50–200ms)
- `getAllUserFacts` has no LIMIT clause — grows unbounded with user history

**Owner:** Engineering
**Effort:** 1–2 days (all 4 issues)
**Linear:** Create issue — HIGH priority

---

### 2. DB Migrations Not Applied to Production
**Impact:** Voice recording columns missing. Semantic memory vector search RPCs missing. Both features silently broken.
**Migrations to run:**
- `062_call_recording_columns.sql` — adds recording_url, transcript columns to voice_sessions
- `063_memory_vector_search_rpcs.sql` — adds match_episodes, match_facts RPC functions for FRED memory
**Fix:** Run via Supabase dashboard SQL editor or migration CLI
**Effort:** 30 minutes
**Owner:** Engineering / DevOps

---

### 3. Sentry Not Active
**Impact:** All production errors are invisible. Error monitoring built and deployed (Phase 59) but env vars not set.
**Missing env vars (add to Vercel):**
- `SENTRY_DSN`
- `SENTRY_AUTH_TOKEN`
- `NEXT_PUBLIC_SENTRY_DSN`
**Linear:** AI-388 tracks this
**Effort:** 30 minutes
**Owner:** DevOps

---

### 4. Twilio A2P 10DLC Registration
**Impact:** SMS may be blocked by carriers without 10DLC registration. 4-week approval timeline.
**Status:** Twilio code is complete. Registration not started.
**Action required NOW:** Submit brand + campaign registration via Twilio console
**Timeline:** 4 weeks for approval — must start immediately for launch readiness
**Owner:** Founder (requires business info)

---

## 🟡 HIGH — Impacts User Experience at Launch

These won't prevent launch but will result in empty/broken experiences.

### 5. Content Library: No Content
**Platform:** Built (Phases 66–67) — Mux integration, course catalog UI, video player, FRED recommendations
**Blocker:** Mux credentials not in Vercel env vars:
- `MUX_TOKEN_ID`
- `MUX_TOKEN_SECRET`
- `MUX_SIGNING_KEY_ID`
- `MUX_SIGNING_PRIVATE_KEY`
- `MUX_WEBHOOK_SECRET`

Plus: No courses uploaded yet. Founders see empty state.
**Action:** Add Mux credentials → upload initial course content via Mux dashboard
**Owner:** Content team + DevOps

---

### 6. Service Marketplace: No Providers
**Platform:** Built (Phases 68–69) — provider directory, booking flow, reviews, FRED recommendations
**Blocker:** No providers in the database. Empty directory on launch.
**Action:** Manually seed initial service providers (lawyers, accountants, advisors, etc.)
**Also:** Stripe Connect Express needs to be configured for marketplace payments
**Owner:** Business development

---

### 7. Stripe Connect Not Configured
**Impact:** Marketplace bookings can't be paid
**Status:** Schema + UI built, Stripe Connect stubbed (`stripe_account_id` column exists, payment flow not wired)
**Action:** Create Stripe Connect Express account, add `STRIPE_CONNECT_SECRET_KEY` to env vars
**Effort:** 1–2 days
**Owner:** Engineering + Stripe dashboard

---

### 8. E2E CI Secrets Missing
**Impact:** Playwright E2E tests exist but won't run in GitHub Actions CI
**Missing GitHub Secrets:**
- `E2E_TEST_EMAIL`
- `E2E_TEST_PASSWORD`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
**Effort:** 15 minutes
**Owner:** DevOps

---

### 9. Visual Regression Baselines Not Generated
**Impact:** CI visual regression job exists but has no baseline screenshots to compare against
**Fix:** Run authenticated Playwright session to generate baselines, commit to repo
**Effort:** 2 hours
**Owner:** Engineering

---

### 10. Call Recording S3 Credentials Missing
**Impact:** Voice call recordings not stored
**Missing env vars:**
- `RECORDING_S3_ACCESS_KEY`
- `RECORDING_S3_SECRET`
**Note:** Calls proceed without recording (graceful fallback). Low urgency pre-launch.
**Owner:** DevOps

---

## 🟢 MEDIUM — Post-Launch / Conditional

### 11. Phase 70: Boardy API Integration
**Status:** Stubbed with mock client. Awaiting partnership agreement.
**Confidence:** LOW — public docs don't exist, requires business partnership
**Decision:** Launch without Boardy. Add when partnership materializes.

---

## Recommended Launch Sequence

### Week 1 (Pre-launch must-haves)
| Day | Action | Owner | Time |
|-----|--------|-------|------|
| Mon | Add `export const maxDuration = 60` to chat route | Engineering | 5 min |
| Mon | Fix 3 additional FRED latency issues (storeEpisode, scoreDecision, getGateRedirectCount) | Engineering | 1 day |
| Mon | Add SENTRY_DSN + SENTRY_AUTH_TOKEN to Vercel | DevOps | 30 min |
| Mon | Run DB migrations 062 + 063 in Supabase | DevOps | 30 min |
| Mon | Start Twilio A2P 10DLC registration | Founder | 2 hrs |
| Tue | Add Mux credentials to Vercel | DevOps | 15 min |
| Tue | Add E2E CI secrets to GitHub Actions | DevOps | 15 min |
| Wed | Upload initial course content to Mux | Content | Ongoing |
| Wed | Seed initial service providers in DB | BizDev | 1 day |
| Thu | Configure Stripe Connect Express | Engineering | 1 day |
| Fri | Full QA pass on production | QA | 1 day |

### Launch Gate Checklist
- [ ] `maxDuration = 60` exported from chat route
- [ ] FRED latency fixes applied (< 3s p50 response time)
- [ ] DB migrations 062 + 063 applied
- [ ] Sentry active (errors visible in dashboard)
- [ ] Twilio A2P 10DLC submitted
- [ ] At least 3 courses live in content library
- [ ] At least 5 service providers in marketplace
- [ ] Stripe Connect configured for marketplace payments
- [ ] Full E2E browser test pass on production

---

## Summary

**Platform is 97% complete and production-ready from a code perspective.**
The remaining gaps are almost entirely **configuration and content** — not engineering:
- 4 env vars to add (Sentry)
- 5 Mux credentials to add
- 2 DB migrations to run
- 1 Stripe Connect to configure
- 1 Twilio registration to submit
- Content to upload
- Providers to onboard

The one real engineering item is **FRED latency** — the 10s timeout and 3 additional performance issues need code fixes before real users hit them.

**Realistic launch timeline: 7–10 days** (assuming content + providers can be seeded quickly).
