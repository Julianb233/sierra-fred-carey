# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-07)

**Core value:** Founders can make better decisions faster using FRED's structured cognitive frameworks.
**Current focus:** v8.0 Go-Live: Guided Venture Journey — Transform Sahara from chatbot to guided venture journey for Palo Alto launch to 200 founders.

## Current Position

Phase: 90 — User Testing Loop (Wave 5)
Plan: 01 of 1 (complete)
Status: v8.0 MILESTONE COMPLETE — All 14 phases (77-90) done
Last activity: 2026-03-08 — Phase 90 complete (User testing infrastructure shipped)

Progress: [##############] 14/14 phases COMPLETE

### Wave Structure:
- Wave 1 (Foundation): Phases 77, 78, 79 — COMPLETE
- Wave 2 (Core Experience): Phases 80, 81, 82 — COMPLETE
- Wave 3 (Intelligence & Engagement): Phases 83, 84, 85 — COMPLETE
- Wave 4 (Polish & Launch): Phases 86, 87, 88, 89 — COMPLETE
- Wave 5 (Post-Launch): Phase 90 — COMPLETE

### Carried:
- v7.0 Phase 74 (Intelligence & Pattern Detection): COMPLETE
- v7.0 Phases 75-76 (A/B Testing + RLHF-Lite): deferred — go-live takes priority
- v6.0 Phase 66 Plan 04 (Mux admin routes): blocked pending Mux credentials
- v6.0 Phase 70 (Boardy API): blocked pending partnership and API credentials

## Performance Metrics

**Velocity:**
- v1.0-v5.0: 58 phases shipped across 5 milestones
- v6.0: 10 phases complete (59-69), 2 blocked (Mux credentials, Boardy API)
- v7.0: 4 phases complete (71-74), 2 deferred (75-76)
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
- `journey_welcomed` boolean on profiles — show-once control for welcome screen
- Middleware DB query for journey_welcomed check — indexed, ~5-10ms overhead on protected routes
- Dynamic import of Supabase client in middleware — only loads when needed
- Free-text intake (no dropdowns) — understand founders in their own words
- Stage normalization via keyword matching — simple, no AI call needed
- FeatureLock extended with `requiredStage` prop — reuses existing tier-gating pattern
- All FRED prompts get founder context via middleware — centralized injection
- OasesStage as string literal union (not enum) — JSON serialization compatible
- 14 total journey steps across 5 stages (3+3+3+3+2)
- Route gating by stage index — current or earlier stage routes accessible
- User-scoped Supabase client for progress queries (RLS-based security)
- Stage-blocked FeatureLock takes priority over tier-blocked (more actionable)
- OasesVisualizer is self-contained (fetches own data via hook, no prop drilling)
- StageDetailModal advance triggers page reload for fresh state
- Semantic memory facts override profile fields (higher recency = higher confidence) [79-01]
- persistMemoryUpdates writes to BOTH profiles + semantic memory for redundancy [79-01]
- Memory extraction uses temperature 0.2, maxOutputTokens 256 for fast deterministic output [79-01]
- persistMemoryUpdates tier-gated: profile columns for all tiers, semantic facts for Pro+ only [79-02]
- buildContextBlock deprecated in favor of formatMemoryBlock from active-memory.ts [79-02]
- FRED_CORE_PROMPT v1.1.0: mandatory founder-specific referencing + co-founder as 7th Business Fundamental [79-02]
- mapScoreToStage uses string params (customerValidation, prototypeStage) not booleans -- more expressive [81-01]
- QuickAssessmentResult includes verdictLabel for UI display [81-01]
- quickAssessIdea has full heuristic fallback when LLM fails -- first-time UX must never error [81-01]
- reality_lens_complete partial index for efficient "who hasn't completed" queries [81-01]
- Suspense boundary required when useSearchParams used in client components [81-02]
- Gaps card uses orange-tinted "investor" framing per Fred's strategy [81-02]
- Quick check banner dismissal stored in localStorage (sahara_quick_check_banner_dismissed) [81-02]
- Voice worker communicates with app via HTTP endpoints (API route approach), not direct imports [82-01]
- Chat context preamble capped at ~2000 chars (~500 tokens) to avoid voice prompt bloat [82-01]
- Dual transcript injection (worker + client) for reliability [82-01]
- Dual transcript endpoints: /api/voice/transcript (LLM) + /api/fred/call/transcript (channel entries) [82-02]
- Client-side transcript injection via data channel, not webhook-side [82-02]
- Room ownership validated via userId in roomName pattern [82-02]

### Blockers/Concerns

- **CARRIED** Sentry env vars not yet configured — Linear issue AI-388
- **CARRIED** CI blocks on 335 lint errors + 12 test failures
- **CARRIED** Twilio credentials needed for SMS daily guidance (Phase 84)
- **CARRIED** Boardy API — no public docs, requires partnership agreement (Phase 85, 89)
- **CARRIED** Mux credentials needed for content library admin
- Fred Zaharix voice ID — API key and account access confirmed but needs wiring (Phase 82)

## Session Continuity

Last session: 2026-03-08T12:00Z
Stopped at: v8.0 Go-Live milestone COMPLETE. All 14 phases (77-90) shipped. Phase 90 (User Testing Loop) was the final phase.
Resume file: .planning/phases/90-user-testing-loop/90-01-SUMMARY.md
WhatsApp export: docs/whatsapp-sahara-founders-export-2026-03-08.txt
