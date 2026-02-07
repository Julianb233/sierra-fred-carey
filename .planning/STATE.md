# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-07)

**Core value:** Every feature promised on the website has real logic, all AI speaks in Fred's voice, and the app is production-ready and installable on mobile.
**Current focus:** v2.0 Production & Voice Parity -- Phase 15 complete, Waves 2+3 remaining

## Current Position

Phase: 15 of 23 (Voice -- Helpers & Activation) -- COMPLETE
Plan: 1 of 1 in current phase
Status: Phase 15 complete -- all 8 unused exports activated
Last activity: 2026-02-07 -- Completed 15-01-PLAN.md (Activate fred-brain Helpers and Coaching Prompts)

Progress: [████████████░░░░░░░░░░░░░░░░░░] ~47% (8 of 17 v2.0 plans)

## Performance Metrics

**Velocity:**
- Total plans completed: 8 (v2.0)
- Average duration: ~7min
- Total execution time: ~57 min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 12 | 2 | ~15min | ~7.5min |
| 13 | 1 | ~8min | ~8min |
| 14 | 2 | ~12min | ~6min |
| 15 | 1 | ~7min | ~7min |
| 22 | 2 | ~10min | ~5min |

**Recent Trend:**
- Last 3 plans: 15-01 (~7min), 22-01 (~5min), 22-02 (~5min)
- Trend: stable

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- v2.0 init: Everything in parallel where possible (group by independence, not category)
- v2.0 init: Admin training docs depend on voice work being complete
- v2.0 init: PWA work is independent of feature work
- v2.0 init: PROD and DATA are fixes (not features), can be done first
- Phase 12: Capital raised standardized to "$100M+" (higher, more accurate number from About page)
- Phase 12: SMS Check-Ins placed in Studio tier (matches backend code in nav, scheduler)
- Phase 12: CORS applied via root middleware to all API routes (not per-route)
- Phase 12: Rate limiting uses Upstash with in-memory fallback for dev
- Phase 12: checkRateLimit/checkRateLimitForUser made async for Upstash; all 14 callers updated
- Phase 12: DI pattern for DB modules (user-scoped vs service-role) established in Phase 11
- Phase 15: SMS only uses getRandomQuote (not getExperienceStatement/getCredibilityStatement) due to 160-char limit
- Phase 15: Topic detection uses simple keyword matching, consistent with existing intent detection pattern
- Phase 15: CoachingTopic field optional on ValidatedInput to avoid breaking existing code
- Phase 15: COACHING_PROMPTS used directly in decide actor (not getPromptForTopic, which duplicates system prompt)
- Phase 15: getFredGreeting enhanced with optional startupContext parameter rather than separate function
- Phase 22-02: Scrollable TabsList pattern established: overflow-x-auto wrapper with inline-flex/sm:grid responsive classes
- Phase 22-02: Touch target global CSS rule extended to cover all form inputs, textareas, selects, and Radix role attributes

### Pending Todos

None yet.

### Blockers/Concerns

- Phase 12 requires Upstash Redis credentials (UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN) for production rate limiting. User must create Upstash database before deploying.

## Session Continuity

Last session: 2026-02-07
Stopped at: Completed 15-01-PLAN.md (Activate fred-brain Helpers and Coaching Prompts). All 8 unused exports activated. Remaining: Wave 2 (16-18) and Wave 3 (19-21, 23).
Resume file: None
