# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-18)

**Core value:** Founders can make better decisions faster using FRED's structured cognitive frameworks.
**Current focus:** v6.0 Full Platform Maturity — Phase 59 (Sentry + Production Monitoring)

## Current Position

Phase: 59 of 70 (Sentry + Production Monitoring)
Plan: 01 of 02 (paused at checkpoint)
Status: Awaiting human-verify checkpoint (Sentry env var activation)
Last activity: 2026-02-18 — Completed 59-01 Tasks 1-2. Paused at Task 3 checkpoint.

Progress: [______________________________] 0% (0/12 v6.0 phases)

## Performance Metrics

**Velocity:**
- v1.0-v5.0: 58 phases shipped across 5 milestones
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

Phase 59-01 decisions:
- Chat route is at app/api/fred/chat/route.ts (not app/api/chat/route.ts as initially assumed)
- tracePropagationTargets restricted to own domain to prevent header leaks to third-party APIs
- Server profiling enabled at 0.1 sample rate

### Blockers/Concerns

- **ACTIVE** Sentry DSN needed — all 4 env vars must be set simultaneously (NEXT_PUBLIC_SENTRY_DSN, SENTRY_AUTH_TOKEN, SENTRY_ORG, SENTRY_PROJECT). Checkpoint pending.
- Twilio A2P 10DLC registration — 4-week timeline, must start before SMS code
- Twilio credentials needed (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_MESSAGING_SERVICE_SID)
- Boardy API — no public docs, requires partnership agreement (LOW confidence)
- LiveKit — 3 CRITICAL bugs (no remote audio, Docker won't start, room name format)
- Stripe Connect must be isolated from existing subscription webhooks
- CI/CD `|| true` hides all failures — fix in Phase 60

## Session Continuity

Last session: 2026-02-18
Stopped at: 59-01-PLAN.md Task 3 checkpoint (human-verify: set Sentry env vars)
Resume file: None
