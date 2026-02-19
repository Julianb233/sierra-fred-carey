# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-18)

**Core value:** Founders can make better decisions faster using FRED's structured cognitive frameworks.
**Current focus:** v6.0 Full Platform Maturity — Phase 61 (Twilio SMS Activation)

## Current Position

Phase: 61 of 70 (Twilio SMS Activation)
Plan: 02 of 02 (checkpoint reached — awaiting Twilio credentials + A2P 10DLC)
Status: Checkpoint — awaiting human action
Last activity: 2026-02-19 — Completed 61-02-PLAN.md Task 1 (delivery report API + dashboard stats)

Progress: [######________________________] 17% (3/12 v6.0 phases — 59, 60 complete, 61 at checkpoint)

## Performance Metrics

**Velocity:**
- v1.0-v5.0: 58 phases shipped across 5 milestones
- v6.0: 2 phases complete (59, 60), 1 at checkpoint (61)
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

Phase 60-02 decisions:
- 1% maxDiffPixelRatio and 0.2 threshold for cross-platform visual regression tolerance
- test.skip with fs.existsSync guard prevents CI failure when baselines not committed
- fullPage screenshots for comprehensive visual coverage
- Mask dynamic content (timestamps, user data) to prevent false failures

Phase 61-01 decisions:
- Status callbacks use /api/sms/status, separate from inbound /api/sms/webhook
- Consent checkbox only appears when checkinEnabled toggle is on
- Welcome template trimmed to fit TCPA disclosures within 160 chars

Phase 61-02 decisions:
- Delivery report API returns empty stats on error (graceful degradation, no error status)
- Stats card only shown when user has verified phone and check-ins enabled

### Blockers/Concerns

- **ACTIVE** Sentry env vars not yet configured — Linear issue AI-388 tracks setup
- **ACTIVE** CI now blocks on 335 lint errors + 12 test failures (must fix before pushing to main)
- **ACTIVE** E2E CI secrets needed: E2E_TEST_EMAIL, E2E_TEST_PASSWORD, NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
- **ACTIVE** Twilio credentials needed (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_MESSAGING_SERVICE_SID)
- **ACTIVE** Twilio A2P 10DLC registration — 4-week timeline, must start now
- Boardy API — no public docs, requires partnership agreement (LOW confidence)
- LiveKit — 3 CRITICAL bugs (no remote audio, Docker won't start, room name format)
- Stripe Connect must be isolated from existing subscription webhooks

## Session Continuity

Last session: 2026-02-19
Stopped at: 61-02 Task 2 checkpoint (Twilio credentials + A2P 10DLC registration)
Resume file: None
