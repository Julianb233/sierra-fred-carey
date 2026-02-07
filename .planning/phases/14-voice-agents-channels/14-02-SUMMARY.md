---
phase: 14-voice-agents-channels
plan: 02
subsystem: sms-templates, voice-agent, admin-api, database-migration
tags: [voice, fred-cary, sms, templates, voice-agent, persona, migration]

# Dependency graph
requires:
  - phase: 13-voice-core-ai-engines
    provides: Fred Cary system prompt and fred-brain.ts knowledge base
provides:
  - SMS templates in Fred Cary's motivational, direct voice
  - Voice agent code fallback identifying as Fred Cary with fred-brain.ts data
  - Admin API defaults with Fred Cary persona and greeting
  - Database migration updating default voice agent config to Fred persona
affects:
  - Phase 15 (Voice Helpers Activation) builds on this voice foundation
  - All SMS check-ins now use Fred's personal, motivational tone
  - Voice agent callers hear Fred Cary identity on all three config paths

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Deterministic message rotation via founderName.length % messages.length"
    - "Three-source voice agent config: code fallback, admin API defaults, DB migration"
    - "UPDATE migration (036) targets existing INSERT seed (009) -- never modify old migrations"

key-files:
  created:
    - lib/db/migrations/036_voice_agent_fred_persona.sql
  modified:
    - lib/sms/templates.ts
    - lib/voice-agent.ts
    - app/api/admin/voice-agent/config/route.ts

key-decisions:
  - "SMS templates are static strings -- no fred-brain.ts import needed (avoids runtime overhead)"
  - "Deterministic message rotation (name length modulo) for variety without randomness"
  - "Migration 036 uses WHERE name IN ('Default Agent', 'Fred Cary') to handle both original and previously-updated seeds"
  - "Admin API response_style changed from 'professional' to 'friendly' to match Fred's tone"
  - "Original migration 009 left untouched -- UPDATE migration created instead"

patterns-established:
  - "Never modify old migrations; create new UPDATE migrations for data changes"

# Metrics
duration: ~6min
completed: 2026-02-07
---

# Phase 14 Plan 02: SMS and Voice Agent Voice Rewrite Summary

**SMS templates rewritten in Fred Cary's motivational voice; voice agent identity replaced across all three config sources (code fallback, admin API, DB migration) with Fred Cary persona importing from fred-brain.ts**

## Performance

- **Duration:** ~6 min
- **Tasks:** 2 (SMS templates + voice agent identity)
- **Files created:** 1
- **Files modified:** 3

## Task Commits

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Rewrite SMS templates in Fred Cary's voice | f3dbab6, 5679c1b | lib/sms/templates.ts |
| 2 | Rewrite voice agent identity and all three config sources | ae65659 | lib/voice-agent.ts, app/api/admin/voice-agent/config/route.ts, lib/db/migrations/036_voice_agent_fred_persona.sql |

## Task 1: Rewrite SMS Templates in Fred Cary's Voice

### VOICE-09: SMS Templates

**getCheckinTemplate** -- 3 rotating Fred-voice messages with deterministic selection:
- `"Sarah -- it's Fred. What's your biggest win this week? Reply with your top 3 priorities."` (89 chars)
- `"Hey Sarah, Fred here. Quick check-in: what moved the needle this week? Top 3 priorities -- go."` (95 chars)
- `"Sarah, how's the grind? Tell me your #1 win and your biggest blocker. --Fred"` (76 chars)
- With highlights: `"Sarah, Fred here. Your agents finished: [highlights]. What are your priorities?"` with smart truncation

**getWelcomeTemplate** -- Fred Cary personal introduction:
- `"Sarah, it's Fred Cary. I'll text you weekly for a quick accountability check. Think of me as your co-founder in your pocket. Reply STOP to opt out."` (149 chars)

**getStopConfirmation** -- signed "--Fred":
- `"Got it -- you're unsubscribed from check-ins. Text START anytime to jump back in. --Fred"` (89 chars)

All messages verified under 160-char single SMS segment limit. Removed `getRandomQuote` import -- templates are now fully static strings with no runtime overhead.

## Task 2: Rewrite Voice Agent Identity

### VOICE-10: Three Config Sources Updated

**1. Code fallback (`lib/voice-agent.ts` -- getDefaultSystemPrompt):**
- Added `FRED_COMPANIES` to imports from fred-brain.ts
- System prompt identifies as "Fred Cary, serial entrepreneur, CEO, attorney, and business coach"
- Includes bio stats from fred-brain.ts (yearsExperience, companiesFounded, IPOs, acquisitions, TV households reach)
- Lists Sahara differentiators from `SAHARA_MESSAGING.differentiators`
- Voice style: direct, warm, concise (2-3 sentences max)
- Explicit instruction: "Never refer to yourself as an 'AI assistant' or 'A Startup Biz'"
- AccessToken name confirmed as 'Fred Cary'

**2. Admin API defaults (`app/api/admin/voice-agent/config/route.ts`):**
- name: 'Fred Cary'
- system_prompt: Fred Cary persona with credentials and voice rules
- greeting_message: 'Hey, this is Fred. Thanks for calling Sahara. What can I help you with today?'
- response_style: 'friendly' (was 'professional')
- after_hours_message: 'Hey, it's Fred. We're closed right now, but leave a message and I'll get back to you. Keep grinding.'
- fallback_message: 'That's outside my wheelhouse right now. Want me to connect you with someone on the team who can help?'

**3. Database migration (`lib/db/migrations/036_voice_agent_fred_persona.sql`):**
- NEW migration -- does NOT modify original 009
- UPDATEs the default voice_agent_config row to Fred Cary persona
- Targets `WHERE name IN ('Default Agent', 'Fred Cary') AND is_active = true` (handles both original and previously-updated seeds)
- Idempotent (safe to run multiple times)
- Uses SQL single-quote escaping for apostrophes

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] SMS templates overwritten by uncommitted Phase 15 changes**
- **Found during:** Task 1 verification
- **Issue:** The working tree contained uncommitted changes from Phase 15 that overwrote the SMS templates file. After Task 1 commit, the file reverted to the Phase 15 version with generic "Weekly check-in from Sahara" messages.
- **Fix:** Re-wrote the correct SMS templates and committed as a fix commit (5679c1b)
- **Files modified:** lib/sms/templates.ts

**2. [Rule 2 - Missing Critical] Migration WHERE clause expanded for robustness**
- **Found during:** Task 2
- **Issue:** Plan specified `WHERE name = 'Default Agent'` but migration 009 already had `name = 'Fred Cary'` from a prior phase update. The migration would be a no-op in current state.
- **Fix:** Changed to `WHERE name IN ('Default Agent', 'Fred Cary')` to handle both original and already-updated seed rows
- **Files modified:** lib/db/migrations/036_voice_agent_fred_persona.sql

## Verification

- [x] SMS templates contain "Fred" in all three functions
- [x] No generic "Weekly check-in from Sahara" or "Welcome to Sahara check-ins" language
- [x] MAX_SMS_LENGTH enforcement in all template functions
- [x] All 3 SMS functions exported (getCheckinTemplate, getWelcomeTemplate, getStopConfirmation)
- [x] Voice agent AccessToken name is 'Fred Cary'
- [x] Voice agent imports FRED_COMPANIES from fred-brain.ts
- [x] Voice agent prompt says "Never refer to yourself as an 'AI assistant' or 'A Startup Biz'"
- [x] Admin API default name is 'Fred Cary' with Fred persona system_prompt
- [x] Admin API greeting: 'Hey, this is Fred. Thanks for calling Sahara.'
- [x] Admin API response_style is 'friendly'
- [x] Migration 036 exists and uses UPDATE
- [x] Original migration 009 not modified by this plan
- [x] TypeScript compilation passes (no errors in our files)

## Success Criteria Met

- [x] SMS getCheckinTemplate uses 3 rotating Fred-voice messages, all under 160 chars
- [x] SMS getWelcomeTemplate identifies sender as "Fred Cary" with accountability framing
- [x] SMS getStopConfirmation signed "--Fred"
- [x] Voice agent getDefaultSystemPrompt() identifies as Fred Cary, imports from fred-brain.ts
- [x] Voice agent AccessToken name is "Fred Cary"
- [x] Voice agent prompt explicitly states never refer to yourself as "AI assistant" or "A Startup Biz"
- [x] Admin API GET default config has name "Fred Cary", Fred persona system_prompt, Fred greeting
- [x] Admin API default after_hours_message and fallback_message in Fred's voice
- [x] New migration 036_voice_agent_fred_persona.sql UPDATEs (not INSERTs) the default row
- [x] Original migration 009 is NOT modified
- [x] TypeScript compilation passes

## Self-Check: PASSED

---
*Summary created: 2026-02-07*
