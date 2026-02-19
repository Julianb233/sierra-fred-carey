# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-18)

**Core value:** Founders can make better decisions faster using FRED's structured cognitive frameworks.
**Current focus:** v6.0 Full Platform Maturity — Phase 61 (Twilio SMS Activation)

## Current Position

Phase: 61 of 70 (Twilio SMS Activation)
Plan: 01 of 02 (complete)
Status: In progress
Last activity: 2026-02-19 — Completed 61-01-PLAN.md (SMS delivery status + compliance)

Progress: [##____________________________] 8% (1/12 v6.0 phases)

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

Phase 61-01 decisions:
- Delivery status callbacks use /api/sms/status, separate from inbound /api/sms/webhook
- Consent checkbox only appears when checkinEnabled toggle is on (conditional UI)
- Welcome template trimmed to fit TCPA disclosures within 160-char single SMS segment

### Blockers/Concerns

- **ACTIVE** Sentry DSN needed — all 4 env vars must be set simultaneously (NEXT_PUBLIC_SENTRY_DSN, SENTRY_AUTH_TOKEN, SENTRY_ORG, SENTRY_PROJECT). Checkpoint pending.
- Twilio A2P 10DLC registration — 4-week timeline, must start before SMS code
- Twilio credentials needed (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_MESSAGING_SERVICE_SID)
- Boardy API — no public docs, requires partnership agreement (LOW confidence)
- LiveKit — 3 CRITICAL bugs (no remote audio, Docker won't start, room name format)
- Stripe Connect must be isolated from existing subscription webhooks
- CI/CD `|| true` hides all failures — fix in Phase 60

## Session Continuity

Last session: 2026-02-19
Stopped at: Completed 61-01-PLAN.md
Resume file: None
