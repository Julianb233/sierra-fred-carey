# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-18)

**Core value:** Founders can make better decisions faster using FRED's structured cognitive frameworks.
**Current focus:** v6.0 Full Platform Maturity — Phase 67 complete (3/3 plans done)

## Current Position

Phase: 67 of 70 (Content Library Frontend)
Plan: 03 of 03 complete
Status: Phase 67 complete
Last activity: 2026-02-26 — Completed 67-01, 67-02, 67-03-PLAN.md

Progress: [###############_______________] 58% (8/12 v6.0 phases done)

## Performance Metrics

**Velocity:**
- v1.0-v5.0: 58 phases shipped across 5 milestones
- v6.0: 8 phases complete (59, 60, 61, 62, 63, 64, 65, 66, 67) — Phase 67 done
- Tests: 766/778 passing (pre-existing failures in profile-creation and get-started)
- Build: 215 pages compiling (3 new content frontend pages added in Phase 67)

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
- Recording storage deferred -- S3 env vars needed for LiveKit Egress recordings (code ready, awaiting credentials)
- Recording failure is non-blocking (try/catch fallback, calls proceed without recording)
- Transcript capped at 500 entries to prevent abuse
- egress_ended webhook populates recording_url from fileResults

Phase 63-01 decisions:
- Thread currentMessage through machine context.input.message (no service-level changes needed)
- Embedding generation runs in parallel with recency queries for lower latency
- Similarity thresholds: 0.75 for episodes, 0.7 for facts

Phase 63-02 decisions:
- Sliding window checks current history entry (just pushed) so first strong-signal message passes
- Negative pattern arrays use RegExp[] for extensibility
- 2-signal threshold enforced at framework level (needsPositioningFramework, needsInvestorLens)
- uploadedDeck always triggers investor mode by itself (explicit user action)

Phase 63-03 decisions:
- 100K token budget for system prompt context (128K limit - 4K response - ~24K conversation)
- Priority-based block truncation: founderContext highest, deckReviewReady lowest
- shouldSummarize threshold: 60% context limit AND >20 messages (dual condition prevents false positives)

Phase 63-04 decisions:
- AI SDK v6 uses inputSchema (not parameters) for tool definitions
- AI SDK v6 uses stopWhen: stepCountIs(3) instead of maxSteps: 3
- userId threaded from machine context through decide actor to generate()
- Tools passed conditionally via spread to keep non-tool paths unchanged

Phase 65-01 decisions:
- Serwist wraps inner, Sentry wraps outer in next.config.mjs (ensures SW compilation before source maps)
- Push handlers placed BEFORE serwist.addEventListeners() to ensure registration
- Serwist disabled in development mode (Turbopack incompatible)

Phase 65-02 decisions:
- Transform-only animations (opacity + translateY) to avoid layout thrashing
- 200ms page transition, 400ms scroll fade-in with staggered delays (0, 0.1, 0.2, 0.3)
- Reduced motion via useReducedMotion sets duration to 0 for WCAG compliance

Phase 65-03 decisions:
- aria-hidden on nav section headings (simpler than aria-labelledby groups)
- role=main alongside id=main-content for legacy screen reader compatibility

Phase 65-04 decisions:
- subscribeWithRetry helper with 3 attempts and 1s/2s/4s exponential backoff
- Track actual PushSubscription object instead of boolean flag
- iOS non-standalone check comes before denied-permission check in UI cascade

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
- **DEFERRED** Migration 063_memory_vector_search_rpcs.sql needs to be run against database
- Stripe Connect must be isolated from existing subscription webhooks

## Session Continuity

Last session: 2026-02-26
Stopped at: Phase 67 complete — content library frontend: catalog, detail, video player, FRED chat integration
Resume file: None

## Streaming Implementation (2026-02-25)

Token streaming is now live. FRED's LLM responses stream word-by-word instead of buffering.
- `tokenChannel` threaded from route → service → machine → decide actor → generateWithLLM
- `streamGenerate` used when tokenChannel is present; `generate` used otherwise
- Frontend handles `token` SSE events to build live streaming message with blinking cursor
- Full details: `.planning/STREAMING-IMPL.md`

## Debug Investigations

### FRED Chat Latency (2026-02-25)
Report: `.planning/FRED-CHAT-LATENCY-REPORT.md`
Key findings:
- CRITICAL: No `export const maxDuration` in chat route — Hobby plan users hit 10s timeout
- HIGH: `getGateRedirectCount` makes a 4th sequential DB call to `fred_conversation_state` (line 372) when `persistedModeResult` already has the data
- HIGH: Hidden 2nd AI call (GPT-4o scoring engine) triggers for every `decision_request` via `synthesize.ts:115` — adds 800ms–2s
- HIGH: `storeEpisode` for user message is awaited BEFORE `processStream` starts (line 656) — blocks streaming by 50–200ms on Pro+
- MEDIUM: IRS block makes sequential dynamic import + DB call after Promise.all for investor-readiness users (line 435)
- MEDIUM: Main LLM call (decide actor) is not skipped for `question` or `information` intents — no fast-path beyond greeting/feedback
- LOW: `getAllUserFacts` has no LIMIT clause — query grows with user history
Quick wins: Add `export const maxDuration = 60`, disable AI scoring, make storeEpisode fire-and-forget, use cached modeContext in getGateRedirectCount

Phase 66-01 decisions:
- npm install used instead of pnpm add (EPERM chmod in this workspace environment)
- Migration created but not run (no live DB credentials in workspace)
- tier_required CHECK: 'free' | 'pro' | 'studio' (normalized lowercase)

Phase 66-02 decisions:
- Mux SDK v12 uses type:"video" not type:"playback" for signPlaybackId (fixed TypeScript error)
- createServiceClient() used directly in lib/db/content.ts (sql template tag doesn't support multi-table fetches)
- Mux client uses ?? "" fallback for missing credentials (warns at startup, fails at runtime gracefully)

Phase 66-03 decisions:
- Preview lessons (is_preview=true) bypass tier check at playback-token endpoint
- Tier check only fires when tier_required > free — avoids DB lookup for free courses
- FRED content-recommender falls back to coming_soon on any DB error (never crashes FRED)
- Plan 66-04 deferred — autonomous:false, requires MUX_TOKEN_ID, MUX_TOKEN_SECRET, MUX_SIGNING_KEY_ID, MUX_SIGNING_PRIVATE_KEY from user

Phase 67-01 decisions:
- Enroll button uses local state only (MVP) — enrollments API exists but no frontend write path yet
- Content nav item is core (always visible, no tier condition) — all users browse for free
- Empty state links to /chat since no courses published yet (admin UI deferred)

Phase 67-02 decisions:
- @mux/mux-player-react@^3.11.4 installed via npm (not pnpm, EPERM constraint)
- onTimeUpdate cast as any — MuxPlayer GenericEventListener<Event> incompatible with React handler type
- Course nav and playback token fetched in parallel with Promise.all
- Milestone deduplication uses useRef<Set<number>>, reset on lessonId change

Phase 67-03 decisions:
- tool_result SSE event handler in use-fred-chat.ts — cleanest integration point
- pendingCoursesRef staging: courses staged from tool_result, attached to next response message
- courses field optional on FredMessage and Message — fully non-breaking
- isStreaming was not threaded in FredMessage→Message mapping (pre-existing gap), fixed inline
