# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-18)

**Core value:** Founders can make better decisions faster using FRED's structured cognitive frameworks.
**Current focus:** v6.0 Full Platform Maturity — Phase 60 (CI/CD Testing Expansion)

## Current Position

Phase: 60 of 70 (CI/CD Testing Expansion)
Plan: 01 of 02 (complete)
Status: In progress
Last activity: 2026-02-19 — Completed 60-01-PLAN.md (Playwright E2E + accessibility CI)

Progress: [####__________________________] 10% (2/12 v6.0 phases — 59 complete, 60 in progress)

## Performance Metrics

**Velocity:**
- v1.0-v5.0: 58 phases shipped across 5 milestones
- v6.0: 1 phase complete (59), 1 in progress (60)
- Tests: 766/778 passing (pre-existing failures in profile-creation and get-started)
- Build: 208 pages compiling

## Accumulated Context

### Decisions

v6.0 milestone decisions:
- Phase structure follows research SUMMARY.md (risk-driven ordering)
- Infrastructure first (Sentry catches bugs in all subsequent phases)
- Voice hardening before new features (3 CRITICAL bugs)
- FRED upgrade before content/marketplace (FRED tools needed for integration)
- Boardy last (highest external risk — if partnership doesn't materialize, everything else ships)
- Only 6 new packages needed (Mux x3, Serwist x2, axe-core x1)

Phase 59 decisions:
- Chat route is at app/api/fred/chat/route.ts (not app/api/chat/route.ts)
- tracePropagationTargets restricted to own domain to prevent header leaks
- Server profiling enabled at 0.1 sample rate
- Removed || true from lint/typecheck/test despite 335 lint errors and 12 test failures
- Kept || true on npm audit (advisory-only, transitive dependency vulnerabilities)
- withSentrySpan on non-streaming FRED chat path only
- Alert configuration is a manual one-time script, not CI step

Phase 60-01 decisions:
- Chromium-only in CI (Firefox/WebKit too slow and flaky in headless)
- Filter to critical+serious WCAG violations only (minor/moderate are warnings, not blockers)
- E2E job runs parallel with security job, both depend on build
- Deploy gated on all three: build, security, e2e

### Blockers/Concerns

- **ACTIVE** Sentry env vars not yet configured — Linear issue AI-388 tracks setup
- **ACTIVE** CI now blocks on 335 lint errors + 12 test failures (must fix before pushing to main)
- **ACTIVE** E2E CI secrets needed: E2E_TEST_EMAIL, E2E_TEST_PASSWORD, NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
- Twilio A2P 10DLC registration — 4-week timeline, must start before SMS code
- Twilio credentials needed (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_MESSAGING_SERVICE_SID)
- Boardy API — no public docs, requires partnership agreement (LOW confidence)
- LiveKit — 3 CRITICAL bugs (no remote audio, Docker won't start, room name format)
- Stripe Connect must be isolated from existing subscription webhooks

## Session Continuity

Last session: 2026-02-19
Stopped at: Completed 60-01-PLAN.md
Resume file: None
