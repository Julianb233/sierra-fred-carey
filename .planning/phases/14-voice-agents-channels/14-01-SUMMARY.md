---
phase: 14-voice-agents-channels
plan: 01
subsystem: ai
tags: [prompt-engineering, fred-voice, agent-tools, fred-brain, structured-output]

# Dependency graph
requires:
  - phase: 04-studio-tier
    provides: "Agent tool architecture with generateStructuredReliable and tool() pattern"
provides:
  - "Shared FRED_AGENT_VOICE module (lib/agents/fred-agent-voice.ts) for all agent tool system prompts"
  - "3 agent-level system prompts rewritten with Fred Cary voice via FRED_AGENT_VOICE"
  - "11 tool-level system prompts using FRED_AGENT_VOICE preamble + domain-specific instructions"
  - "4 fundraising tool system params added where none previously existed"
affects:
  - 14-02-voice-agents-channels (SMS/voice agent voice rewrite)
  - 15-voice-unused-wiring (wiring unused fred-brain helpers)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Voice injection via shared FRED_AGENT_VOICE constant composed from fred-brain.ts exports"
    - "Agent prompt = FRED_AGENT_VOICE + DOMAIN section + operating principles"
    - "Tool prompt = FRED_AGENT_VOICE preamble + concise domain instruction (2-3 sentences)"

key-files:
  created:
    - lib/agents/fred-agent-voice.ts
  modified:
    - lib/agents/founder-ops/prompts.ts
    - lib/agents/founder-ops/tools.ts
    - lib/agents/fundraising/prompts.ts
    - lib/agents/fundraising/tools.ts
    - lib/agents/growth/prompts.ts
    - lib/agents/growth/tools.ts

key-decisions:
  - "Concise FRED_AGENT_VOICE preamble (~15 lines) instead of full FRED_CAREY_SYSTEM_PROMPT (180+ lines) to avoid prompt bloat in tool-level system params"
  - "Tool-level system prompts use FRED_AGENT_VOICE + short domain context, not full agent prompt, to preserve structured output quality"
  - "FRED_AGENT_VOICE maps FRED_COMMUNICATION_STYLE.characteristics and doNot arrays dynamically from fred-brain.ts"
  - "All prompts.ts files import from ../fred-agent-voice (not directly from fred-brain.ts) for voice consistency"

patterns-established:
  - "Voice preamble pattern: shared module composes from fred-brain.ts, agents/tools import from shared module"
  - "Two-layer voice: agent-level (FRED_AGENT_VOICE + domain section) and tool-level (FRED_AGENT_VOICE + concise instruction)"

# Metrics
duration: 5min
completed: 2026-02-07
---

# Phase 14 Plan 01: Agent Tool Prompt Voice Rewrite Summary

**Shared FRED_AGENT_VOICE module from fred-brain.ts, 3 agent prompts rewritten, 11 tool system prompts using Fred Cary voice preamble**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-02-07T13:57:00Z
- **Completed:** 2026-02-07T14:02:00Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- Created shared `lib/agents/fred-agent-voice.ts` module that composes FRED_AGENT_VOICE from fred-brain.ts FRED_BIO and FRED_COMMUNICATION_STYLE
- Rewrote all 3 agent-level system prompts (founder-ops, fundraising, growth) to use FRED_AGENT_VOICE + domain-specific operating principles
- Updated 7 existing tool system prompts to use FRED_AGENT_VOICE preamble (3 founder-ops + 4 growth)
- Added system: params to all 4 fundraising tools where none existed before
- Eliminated all generic "expert" persona strings from agent files

## Task Commits

Each task was committed atomically:

1. **Task 1: Create shared FRED_AGENT_VOICE module and rewrite 3 agent prompts** - `6ae98bf` (feat)
2. **Task 2: Rewrite all 11 tool-level system prompts with Fred voice** - `b985ddb` (feat)

## Files Created/Modified
- `lib/agents/fred-agent-voice.ts` - NEW: Shared FRED_AGENT_VOICE constant composed from FRED_BIO and FRED_COMMUNICATION_STYLE
- `lib/agents/founder-ops/prompts.ts` - Rewritten: FRED_AGENT_VOICE + operational excellence domain
- `lib/agents/founder-ops/tools.ts` - Updated: 3 tool system params (draftEmail, scheduleMeeting, weeklyPriorities)
- `lib/agents/fundraising/prompts.ts` - Rewritten: FRED_AGENT_VOICE + fundraising strategy domain
- `lib/agents/fundraising/tools.ts` - Updated: 4 tool system params ADDED (investorResearch, outreachDraft, pipelineAnalysis, meetingPrep)
- `lib/agents/growth/prompts.ts` - Rewritten: FRED_AGENT_VOICE + growth strategy domain
- `lib/agents/growth/tools.ts` - Updated: 4 tool system params (channelAnalysis, experimentDesign, funnelAnalysis, contentStrategy)

## Decisions Made
- **Concise voice preamble over full prompt:** FRED_AGENT_VOICE is ~15 lines with bio stats, communication style, and "never do" rules. Full FRED_CAREY_SYSTEM_PROMPT (180+ lines) would cause prompt bloat and degrade structured output quality.
- **Dynamic mapping from fred-brain.ts:** FRED_AGENT_VOICE uses `.map()` on `FRED_COMMUNICATION_STYLE.characteristics` and `.doNot` arrays, so any future changes to fred-brain.ts automatically propagate to all agent tools.
- **Import chain: prompts.ts -> fred-agent-voice.ts -> fred-brain.ts:** All voice data flows from the single source of truth (fred-brain.ts) through the shared module. No hardcoded Fred voice strings in any agent file.
- **createTask skipped:** Pure function with no AI call, no system prompt needed.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- All agent and tool prompts now use Fred Cary's voice consistently
- Ready for Phase 14-02 (SMS templates and voice agent rewrite)
- Ready for Phase 15 (wiring unused fred-brain helpers like getRandomQuote, getExperienceStatement)

## Self-Check: PASSED

---
*Phase: 14-voice-agents-channels*
*Completed: 2026-02-07*
