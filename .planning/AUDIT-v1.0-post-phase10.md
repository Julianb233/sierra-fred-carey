# Sahara v1.0 Post-Phase 10 Audit Report

**Date:** 2026-02-07
**Scope:** Full production readiness audit (API, UI, lib, build, security)
**Auditors:** 5 parallel agents

---

## Executive Summary

The codebase is in strong shape after Phase 10 hardening. API routes are production-ready with proper auth, validation, and rate limiting. No critical security vulnerabilities found. The remaining gaps are code quality improvements and minor hardening items.

**Verification Results:**
- TypeScript: PASS (0 errors in source; 2 build-artifact errors in tsconfig)
- Vitest: 445/445 PASS
- ESLint: Runs (840 pre-existing `no-explicit-any` errors, 2501 `no-unused-vars` warnings)
- Auth: All protected routes use requireAuth()
- SQL: All queries parameterized
- Secrets: None hardcoded

---

## Actionable Gaps (7 items)

### GAP 1 — tsconfig includes non-existent .next/types [LOW]
**File:** `tsconfig.json`
**Issue:** `include` array has `.next/types/**/*.ts` which only exists after `next build`. Causes `tsc --noEmit` to fail in clean checkouts.
**Fix:** Remove `.next/types/**/*.ts` from include array, or accept that CI must build first.

### GAP 2 — 6 unused production dependencies [LOW]
**File:** `package.json`
**Issue:** These packages are in `dependencies` but never imported:
- `@paper-design/shaders-react`
- `@react-email/components`
- `@react-email/render`
- `@xstate/react`
- `bcryptjs`
- `react-email`
**Fix:** Remove from package.json to reduce install size and attack surface.

### GAP 3 — /api/contact missing rate limiting [MEDIUM]
**File:** `app/api/contact/route.ts`
**Issue:** Public unauthenticated endpoint with no rate limiting. Uses service role client (RLS bypass) to insert into contact_submissions. Could be abused to flood the database.
**Fix:** Add IP-based rate limiting (e.g., 5 req/hour per IP).

### GAP 4 — ~20 API routes expose error.message in production [MEDIUM]
**Files:** `api/fred/analyze`, `api/fred/chat`, `api/fred/decide`, `api/fred/history`, `api/fred/reality-lens`, `api/fred/memory`, `api/agents`, `api/health/ai`, `api/monitoring/health`, `api/pitch-deck/parse`, `api/pitch-deck/upload`, + others
**Issue:** Error responses include `error.message` unconditionally. In production, this can leak internal details (DB table names, Stripe IDs, config info).
**Fix:** Guard with `process.env.NODE_ENV === "development"` pattern (already used in investor-lens and positioning routes).

### GAP 5 — Monitoring page dead buttons [LOW]
**File:** `app/dashboard/monitoring/page.tsx`
**Issue:** "Create New Experiment" and "View All Experiments" buttons have no onClick handlers — they're visual placeholders.
**Fix:** Either wire to real actions or remove the buttons.

### GAP 6 — Dashboard locked cards use href="#" [LOW]
**File:** `app/dashboard/page.tsx:278`
**Issue:** Quick action cards for locked features use `href="#"` which creates a broken-feeling UX. Should prevent navigation entirely.
**Fix:** Use `onClick={(e) => e.preventDefault()}` or conditionally render without Link wrapper.

### GAP 7 — /api/health/ai exposes internal details publicly [MEDIUM]
**File:** `app/api/health/ai/route.ts`
**Issue:** Public endpoint (no auth) that exposes circuit breaker states, provider errors, failure rates. Useful for debugging but leaks infra details.
**Fix:** Either add auth, or strip detailed error messages/states from the public response.

---

## Non-Actionable Observations (monitor, don't fix now)

### Pre-existing code quality (NOT blocking production)
- 840 ESLint `no-explicit-any` errors across codebase — gradual typing effort, not a launch blocker
- 2501 ESLint `no-unused-vars` warnings — cleanup effort, not functional
- Console.log/error in 10+ dashboard pages — acceptable for v1.0, replace with logger service later
- Silent error swallowing in some DB functions — returns empty arrays on failure, acceptable for resilience
- `as any` casts in monitoring/ab-testing code — type safety improvement for later
- LiveKit config defaults to empty strings — only affects voice-agent feature, not core flow
- CSP has `unsafe-inline` — common with CSS-in-JS, tighten post-launch
- Service role used broadly — correct pattern for server-side operations with auth-gated routes

### Already correctly handled
- All protected routes use requireAuth()
- SQL injection: all queries parameterized
- Stripe webhook signature verification in place
- No hardcoded secrets in source
- .gitignore covers .env, node_modules, .next
- No eval(), innerHTML, or dangerouslySetInnerHTML
- FeatureLock tier gating on all Pro pages
- Root middleware protects dashboard/onboarding/chat/agents/documents/settings/profile

---

## Recommended Fix Priority

| Priority | Gap | Effort |
|----------|-----|--------|
| 1 | GAP 2: Remove unused deps | 5 min |
| 2 | GAP 1: Fix tsconfig include | 2 min |
| 3 | GAP 3: Rate limit /api/contact | 10 min |
| 4 | GAP 4: Guard error.message exposure | 30 min |
| 5 | GAP 7: Strip /api/health/ai details | 10 min |
| 6 | GAP 5: Monitoring dead buttons | 5 min |
| 7 | GAP 6: Dashboard locked card href | 5 min |

**Total estimated effort: ~1 hour**
