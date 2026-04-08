# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-08)

**Core value:** Founders can make better decisions faster using FRED's structured cognitive frameworks.
**Current focus:** v9.0 Founder Journey Report & $39 Tier — Phase 91: Foundation

## Current Position

Phase: 91 of 96 (Foundation — Schema & Tier Activation)
Plan: 01 of 04 complete
Status: In progress
Last activity: 2026-04-08 — Completed 91-01-PLAN.md (founder_reports schema + types + CRUD)

Progress: [██░░░░░░░░░░░░] 1/6 phases (plan 1/4 in phase 91)

Previous milestone: v8.0 COMPLETE — All 14 phases (77-90) done

Progress: [##############] 14/14 phases COMPLETE

### Wave Structure:
- Wave 1 (Foundation): Phases 77, 78, 79 — COMPLETE
- Wave 2 (Core Experience): Phases 80, 81, 82 — COMPLETE
- Wave 3 (Intelligence & Engagement): Phases 83, 84, 85 — COMPLETE
- Wave 4 (Polish & Launch): Phases 86, 87, 88, 89 — COMPLETE
- Wave 5 (Post-Launch): Phase 90 — COMPLETE

### Carried:
- v7.0 Phase 74 (Intelligence & Pattern Detection): COMPLETE
- v7.0 Phase 75 (A/B Testing + Feedback Metrics): COMPLETE
- v7.0 Phase 76 (RLHF-Lite + Close-the-Loop): COMPLETE
- v6.0 Phase 66 Plan 04 (Mux admin routes): blocked pending Mux credentials
- v6.0 Phase 70 (Boardy API): blocked pending partnership and API credentials

## Performance Metrics

**Velocity:**
- v1.0-v5.0: 58 phases shipped across 5 milestones
- v6.0: 10 phases complete (59-69), 2 blocked (Mux credentials, Boardy API)
- v7.0: 6 phases complete (71-76), 0 deferred
- v8.0: 14 phases complete (77-90), milestone complete
- Tests: 1048/1048 passing (all green)
- TypeScript: 0 errors (down from 61)
- Lint: 0 errors, 281 warnings (down from 335 errors + 12 test failures)
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
- CORE_MEMORY_FIELDS extended from 7 to 14 fields (traction, revenue_status, funding_status, team_size, product_status, ninety_day_goal, key_decisions) [79-01 v2]
- Memory extraction runs for ALL tiers, not just Pro+ -- persistMemoryUpdates handles tier gating [79-01 v2]
- Extraction prompt includes REPHRASE rule for biggest_challenge, traction, key_decisions [79-01 v2]
- CRITICAL INSTRUCTION includes BAD/GOOD personalization examples [79-02 v2]
- Stale fields (7+ days): ask before advising, do not assume still accurate [79-02 v2]
- Missing fields: do not guess/fabricate, collect max 2 per exchange [79-02 v2]
- Co-founder text input added to onboarding step 3, saves to profiles.co_founder [79-02 v2]
- founder_reports.status typed as pending|generating|complete|failed for async generation polling [91-01]
- getNextVersion uses ORDER BY DESC LIMIT 1 (not MAX aggregate) for supabase-sql parser compatibility [91-01]
- ReportData JSONB: executiveSummary, founderName, companyName, generatedAt, sections[], fredSignoff [91-01]

### Blockers/Concerns

- **RESOLVED** CI — 0 TypeScript errors, 0 lint errors, 1048/1048 tests passing (fixed 2026-03-08)
- **CARRIED** Sentry env vars not yet configured — needs Sentry account/project setup, code is guarded (AI-388)
- **CARRIED** Twilio credentials needed for SMS daily guidance (Phase 84)
- **CARRIED** Boardy API — no public docs, requires partnership agreement (Phase 85, 89)
- **CARRIED** Mux credentials needed for content library admin
- Fred Zaharix voice ID — API key and account access confirmed but needs wiring (Phase 82)

## Session Continuity

Last session: 2026-04-08T19:38Z
Stopped at: Completed 91-01-PLAN.md (founder_reports schema, TypeScript types, CRUD module)
Resume file: .planning/phases/91-foundation-schema-tier/91-01-SUMMARY.md
WhatsApp export: docs/whatsapp-sahara-founders-export-2026-03-08.txt
