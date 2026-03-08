# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-07)

**Core value:** Founders can make better decisions faster using FRED's structured cognitive frameworks.
**Current focus:** v8.0 Go-Live: Guided Venture Journey — Transform Sahara from chatbot to guided venture journey for Palo Alto launch to 200 founders.

## Current Position

Phase: 77 — Guided Venture Journey Onboarding (Wave 1)
Plan: Not started (run /gsd:plan-phase 77)
Status: Roadmap created, ready for planning
Last activity: 2026-03-08 — v8.0 roadmap created (14 phases, 24 plans, 5 waves)

Progress: [..............] 0/14 phases

### Wave Structure:
- Wave 1 (Foundation): Phases 77, 78, 79 — parallel execution
- Wave 2 (Core Experience): Phases 80, 81, 82 — depends on Wave 1
- Wave 3 (Intelligence & Engagement): Phases 83, 84, 85
- Wave 4 (Polish & Launch): Phases 86, 87, 88, 89
- Wave 5 (Post-Launch): Phase 90

### Carried:
- v7.0 Phases 74-76 (Feedback Intelligence): deferred — go-live takes priority
- v6.0 Phase 66 Plan 04 (Mux admin routes): blocked pending Mux credentials
- v6.0 Phase 70 (Boardy API): blocked pending partnership and API credentials

## Performance Metrics

**Velocity:**
- v1.0-v5.0: 58 phases shipped across 5 milestones
- v6.0: 10 phases complete (59-69), 2 blocked (Mux credentials, Boardy API)
- v7.0: 3 phases complete (71-73), 3 deferred (74-76)
- Tests: 766/778 passing (pre-existing failures in profile-creation and get-started)
- Build: 221 pages compiling

## Accumulated Context

### Decisions

v8.0 milestone decisions (confirmed by Fred Cary, March 7):
- Platform is a journey, not a chatbot — "Oases" 5-stage desert metaphor
- Stage-gating enforced — cannot skip ahead (no pitch deck before validation)
- "Mentor" not "Fred AI" — UI labels reflect coaching relationship
- Daily guidance is proactive — FRED tells users what to do
- No payment until full version ready — paid tier delayed until pitch deck + document review ships
- Launch with Alex's version first — joinsahara.com goes live; Julian's full version follows
- $99/month target price — affordable alternative to expensive consultants
- `oases_stage` column on `profiles` table — single source of truth
- FeatureLock extended with `requiredStage` prop — reuses existing tier-gating pattern
- All FRED prompts get founder context via middleware — centralized injection

### Blockers/Concerns

- **CARRIED** Sentry env vars not yet configured — Linear issue AI-388
- **CARRIED** CI blocks on 335 lint errors + 12 test failures
- **CARRIED** Twilio credentials needed for SMS daily guidance (Phase 84)
- **CARRIED** Boardy API — no public docs, requires partnership agreement (Phase 85, 89)
- **CARRIED** Mux credentials needed for content library admin
- Fred Zaharix voice ID — API key and account access confirmed but needs wiring (Phase 82)

## Session Continuity

Last session: 2026-03-08
Stopped at: v8.0 ROADMAP.md created. Next: /gsd:plan-phase 77 (Guided Venture Journey Onboarding)
Resume file: .planning/milestones/v8.0-go-live/ROADMAP.md
