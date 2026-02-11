# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-11)

**Core value:** Founders can make better decisions faster using FRED's structured cognitive frameworks.
**Current focus:** v4.0 FRED Mentor Experience -- Phase 34 (System Prompt Overhaul)

## Current Position

Phase: 34 of 39 (System Prompt Overhaul)
Plan: -- (not yet planned)
Status: Roadmap created, ready to plan Phase 34
Last activity: 2026-02-11 -- v4.0 roadmap created (6 phases, 25 requirements mapped)

Progress: [..............................] 0%

## Performance Metrics

**Velocity:**
- Total plans completed: 0 (v4.0)
- Average duration: --
- Total execution time: --

## Accumulated Context

### Decisions

v4.0 milestone decisions:

- FRED is a mentor, not an agent -- language and framing reflects coaching identity
- Reality Lens is a mandatory gate before tactical advice -- non-negotiable
- Decision sequencing enforced -- no downstream work until upstream truth established
- System prompt rebuilt from Fred Cary's master GPT instructions
- Diagnostic mode switching is silent -- frameworks introduced by context, not user choice
- 9-Step Startup Process is the default decision sequencing backbone

### Key Architectural Gaps (from codebase analysis)

- System prompt is STATIC -- same prompt every time, no dynamic context from onboarding or conversation state
- No concept of conversation "modes" -- no structured intake vs freeform
- Topic detection is keyword-matching (validate-input.ts), not AI-powered mode-switching
- Diagnostic engine (lib/ai/diagnostic-engine.ts) exists but is NOT wired into chat route
- Existing frameworks (startup-process.ts, investor-lens.ts, positioning.ts) exist as code but are NOT integrated as active gates
- Reality Lens exists as standalone assessment tool but NOT as a gate in conversations
- No conversation state tracking for where founder is in the 9-step process

### Blockers/Concerns

- Sentry DSN needed (NEXT_PUBLIC_SENTRY_DSN, SENTRY_AUTH_TOKEN)
- Twilio credentials needed (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_MESSAGING_SERVICE_SID)

## Session Continuity

Last session: 2026-02-11
Stopped at: v4.0 roadmap created, ready to plan Phase 34
Resume file: None
