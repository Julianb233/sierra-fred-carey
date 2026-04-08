# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-08)

**Core value:** Founders can make better decisions faster using FRED's structured cognitive frameworks.
**Current focus:** v9.0 Founder Journey Report & $39 Tier — Phase 93: PDF Template & Background Generation

## Current Position

Phase: 93 of 96 (PDF Template & Background Generation)
Plan: 01 of 02 complete
Status: In progress
Last activity: 2026-04-08 — Completed 93-01-PLAN.md (PDF template + Trigger task)

Progress: [████░░░░░░░░░░] 2/6 phases complete (93-01 done, 93-02 pending)

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
- NEXT_PUBLIC_STRIPE_BUILDER_PRICE_ID set as placeholder — Stripe secret key (sk_live_*) not yet available [91-04]
- step-mapping.ts is single source of truth for 19-step-to-5-section report mapping [92-01]
- buildAnswerMap prefers metadata.distilled over metadata.answer for cleaner AI synthesis input [92-01]
- Single query for all oases_progress rows (lookup map pattern) not per-step queries [92-01]
- Unit economics + scaling operations steps have empty journeyStepIds — new report-only steps for future journey mapping [92-01]
- Manual Stripe product/price creation steps documented in .env.local comments [91-04]
- Anti-sycophancy enforced at prompt level, not post-generation — avoids false positives on founder-quoted phrases (RGEN-05 limitation) [92-02]
- Single AI call produces ReportData + bonusSteps — bonusSteps extracted before DB storage [92-02]
- Temperature 0.3 for grounded deterministic report synthesis output [92-02]
- buildSystemPrompt/buildUserPrompt exported for testability and prompt inspection [92-02]
- getProfileTier uses cascading if-checks (STUDIO >= PRO >= BUILDER) — BUILDER was missing, fixed [91-02]
- Webhook BUILDER tier tested indirectly via POST handler (not extracted helpers) — simpler for 4 scenarios [91-03]
- captureMessage (Sentry warning) for DB fallback monitoring in resolveUserIdFromSubscription [91-03]
- C3 pitfall (subscription.updated before session.completed) documented and observable in production [91-03]
- Geist WOFF fonts from @fontsource/geist-sans (already installed), registered at module level in pdf-template.ts [93-01]
- renderToBuffer requires ReactElement<DocumentProps> but cross-file import loses generic — cast to any [93-01]
- Sections flow on single wrapped page (react-pdf handles page breaks), not one section per page [93-01]
- bonusSteps not in ReportData type — only on SynthesisOutput, not rendered in PDF template yet [93-01]
- Trigger task pattern: status=generating -> render -> upload -> status=complete, catch -> status=failed -> re-throw [93-01]

### Blockers/Concerns

- **RESOLVED** CI — 0 TypeScript errors, 0 lint errors, 1048/1048 tests passing (fixed 2026-03-08)
- **CARRIED** Sentry env vars not yet configured — needs Sentry account/project setup, code is guarded (AI-388)
- **CARRIED** Twilio credentials needed for SMS daily guidance (Phase 84)
- **CARRIED** Boardy API — no public docs, requires partnership agreement (Phase 85, 89)
- **CARRIED** Mux credentials needed for content library admin
- Fred Zaharix voice ID — API key and account access confirmed but needs wiring (Phase 82)
- **CARRIED** Stripe secret key (sk_live_*) not available — blocks real Stripe product/price creation for Builder tier [91-04]

## Session Continuity

Last session: 2026-04-08T21:20Z
Stopped at: Completed 93-01-PLAN.md (PDF template + Trigger.dev task)
Resume file: .planning/phases/93-pdf-template-generation/93-01-SUMMARY.md
WhatsApp export: docs/whatsapp-sahara-founders-export-2026-03-08.txt
