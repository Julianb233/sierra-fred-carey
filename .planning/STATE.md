# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-18)

**Core value:** Founders can make better decisions faster using FRED's structured cognitive frameworks.
**Current focus:** v6.0 Full Platform Maturity — Phase 62 complete, next: Wave 3 (Phases 63, 64, 65)

## Current Position

Phase: 62 of 70 (Voice Agent Production Hardening)
Plan: 02 of 02 complete
Status: Phase complete
Last activity: 2026-02-23 — Completed 62-02-PLAN.md

Progress: [########______________________] 33% (4/12 v6.0 phases)

## Performance Metrics

**Velocity:**
- v1.0-v5.0: 58 phases shipped across 5 milestones
- v6.0: 4 phases complete (59, 60, 61, 62) — Waves 1-2 done
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

Phase 60 decisions:
- Chromium-only in CI (Firefox/WebKit too slow and flaky in headless)
- Filter to critical+serious WCAG violations only (minor/moderate are warnings, not blockers)
- E2E job runs parallel with security job, both depend on build
- Deploy gated on all three: build, security, e2e
- 1% maxDiffPixelRatio and 0.2 threshold for visual regression tolerance
- test.skip with fs.existsSync guard prevents CI failure when baselines not committed
- fullPage screenshots with dynamic content masking

Phase 61 decisions:
- Status callbacks use /api/sms/status, separate from inbound /api/sms/webhook
- Consent checkbox only appears when checkinEnabled toggle is on
- Welcome template trimmed to fit TCPA disclosures within 160 chars
- Delivery report API returns empty stats on error (graceful degradation)
- Stats card only shown when user has verified phone and check-ins enabled

Phase 62 decisions:
- Reconnection uses connectionStatus state with RoomEvent.Reconnecting/Reconnected
- Agent identity detection uses exact match 'fred-cary-voice' instead of prefix 'fred'
- Worker returns early on connect/waitForParticipant failure instead of crashing
- Supabase Storage chosen for S3-compatible call recording storage
- Recording failure is non-blocking (try/catch fallback, calls proceed without recording)
- Transcript capped at 500 entries to prevent abuse
- egress_ended webhook populates recording_url from fileResults

### Blockers/Concerns

- **DEFERRED** Sentry env vars not yet configured — Linear issue AI-388 tracks setup
- **DEFERRED** CI now blocks on 335 lint errors + 12 test failures (must fix before pushing to main)
- **DEFERRED** E2E CI secrets needed: E2E_TEST_EMAIL, E2E_TEST_PASSWORD, NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
- **DEFERRED** Twilio credentials needed (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_MESSAGING_SERVICE_SID)
- **DEFERRED** Twilio A2P 10DLC registration — 4-week timeline, must start now
- **DEFERRED** 6 visual regression baselines need authenticated test credentials to generate
- Boardy API — no public docs, requires partnership agreement (LOW confidence)
- LiveKit — 3 CRITICAL bugs fixed in 62-01, recording + transcript persistence complete in 62-02
- **DEFERRED** Supabase Storage S3 access keys needed for call recording (RECORDING_S3_ACCESS_KEY, RECORDING_S3_SECRET)
- **DEFERRED** Migration 062_call_recording_columns.sql needs to be run against database
- Stripe Connect must be isolated from existing subscription webhooks

## Session Continuity

Last session: 2026-02-23
Stopped at: Completed 62-02-PLAN.md (call recording, transcript persistence, egress webhook)
Resume file: None
