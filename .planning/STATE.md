# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-11)

**Core value:** Founders can make better decisions faster using FRED's structured cognitive frameworks.
**Current focus:** v4.0 FRED Mentor Experience -- Phase 36 (Conversation State & Structured Flow)

## Current Position

Phase: 36 of 39 (Conversation State & Structured Flow)
Plan: 01 of 2
Status: Plan 36-01 complete, ready for 36-02
Last activity: 2026-02-11 -- Completed 36-01-PLAN.md (Wire Conversation State into Chat Pipeline)

Progress: [#.............................] ~3%

## Performance Metrics

**Velocity:**
- Total plans completed: 1 (v4.0)
- Average duration: ~3 min
- Total execution time: ~3 min

## Accumulated Context

### Decisions

v4.0 milestone decisions:

- FRED is a mentor, not an agent -- language and framing reflects coaching identity
- Reality Lens is a mandatory gate before tactical advice -- non-negotiable
- Decision sequencing enforced -- no downstream work until upstream truth established
- System prompt rebuilt from Fred Cary's master GPT instructions
- Diagnostic mode switching is silent -- frameworks introduced by context, not user choice
- 9-Step Startup Process is the default decision sequencing backbone

Phase 36-01 decisions:

- Step guidance block targets <300 tokens to preserve context window
- All conversation state loading is non-blocking -- chat must not fail if state table is missing
- Progress context loaded in parallel with profile, facts, and first-conversation check
- Actor signatures use optional params for backward compatibility
- Drift redirect is a separate function (buildDriftRedirectBlock) injected only on drift

### Key Architectural Gaps (from codebase analysis)

- ~~System prompt is STATIC -- same prompt every time, no dynamic context from onboarding or conversation state~~ RESOLVED: Phase 34 + 36-01
- No concept of conversation "modes" -- no structured intake vs freeform
- Topic detection is keyword-matching (validate-input.ts), not AI-powered mode-switching
- Diagnostic engine (lib/ai/diagnostic-engine.ts) exists but is NOT wired into chat route
- Existing frameworks (startup-process.ts, investor-lens.ts, positioning.ts) exist as code but are NOT integrated as active gates
- Reality Lens exists as standalone assessment tool but NOT as a gate in conversations
- ~~No conversation state tracking for where founder is in the 9-step process~~ RESOLVED: Phase 36-01

### Blockers/Concerns

- Sentry DSN needed (NEXT_PUBLIC_SENTRY_DSN, SENTRY_AUTH_TOKEN)
- Twilio credentials needed (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_MESSAGING_SERVICE_SID)

### Full Stack UX Audit (2026-02-11)

Parallel audit completed with 5 agents (UX Explorer, Backend Validator, Source Code Reviewer, Code Fixer, QA Verifier).

**19 atomic fix commits** covering:
- Security: community post leak, private join bypass, contact rate limiting, diagnostic validation, user deletion cascade
- Navigation: 9 missing dashboard sidebar items added
- Auth: 4 missing protected routes
- Mobile: iOS zoom prevention, safe-area padding, chat bubble width, keyboard hint visibility, responsive chat height
- Accessibility: ARIA attributes on chat interface, error boundaries on onboarding
- Code quality: removed misleading userId params, fixed toggleReaction race condition

Reports: .planning/UX-EXPLORER-REPORT.md, .planning/BACKEND-VALIDATION-REPORT.md, .planning/SOURCE-CODE-REVIEW.md, .planning/DEBUG-REPORT.md
Fixes: .planning/FIXES-LOG.md (17 entries + 5 outstanding minor items)
Ralph PRD: scripts/ralph/prd.json (10 user stories, all passing)

## Session Continuity

Last session: 2026-02-11
Stopped at: Full stack audit complete, 19 fix commits, build passes
Resume file: None
