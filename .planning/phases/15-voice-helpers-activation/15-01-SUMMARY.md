---
phase: 15-voice-helpers-activation
plan: 01
subsystem: voice
tags: [fred-brain, prompts, coaching, sms, chat, onboarding, topic-detection]

# Dependency graph
requires:
  - phase: 13-voice-core-engines
    provides: "Unified Fred Cary voice in core AI engines"
  - phase: 14-voice-agents-channels
    provides: "Fred voice in agent prompts, SMS templates, voice agent"
provides:
  - "All 8 unused fred-brain.ts and prompts.ts exports activated"
  - "Dynamic chat greeting using getRandomQuote/getExperienceStatement/getCredibilityStatement"
  - "getFredGreeting with optional startup context for personalized onboarding"
  - "getRandomQuote in SMS check-in messages (160-char safe)"
  - "FRED_MEDIA and FRED_TESTIMONIALS in IRS and strategy prompts"
  - "CoachingTopic type and keyword-based topic detection in validate-input"
  - "COACHING_PROMPTS wired into decide actor for topic-specific responses"
  - "Topic field exposed in chat API response (streaming and non-streaming)"
affects:
  - "16-ai-decision-tools"
  - "17-admin-training-docs"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "useState lazy initializer for hydration-safe random content in client components"
    - "Keyword-based topic detection orthogonal to intent detection in XState pipeline"
    - "Optional field extension on ValidatedInput (non-breaking type change)"
    - "SMS quote inclusion with 160-char length guard and graceful fallback"

key-files:
  created: []
  modified:
    - "lib/fred/irs/engine.ts"
    - "lib/fred/strategy/generator.ts"
    - "lib/ai/prompts.ts"
    - "components/chat/chat-interface.tsx"
    - "components/onboarding/fred-intro-step.tsx"
    - "lib/sms/templates.ts"
    - "lib/fred/types.ts"
    - "lib/fred/actors/validate-input.ts"
    - "lib/fred/actors/decide.ts"
    - "app/api/fred/chat/route.ts"

key-decisions:
  - "SMS only uses getRandomQuote (not getExperienceStatement/getCredibilityStatement) due to 160-char limit"
  - "Topic detection uses simple keyword matching, consistent with existing intent detection pattern"
  - "CoachingTopic field is optional on ValidatedInput to avoid breaking existing code"
  - "getPromptForTopic not directly called in pipeline; COACHING_PROMPTS used directly to avoid duplicating system prompt"
  - "getFredGreeting enhanced with optional startupContext parameter rather than separate function"

patterns-established:
  - "useState lazy initializer: compute random content once on mount to prevent hydration mismatches"
  - "Topic detection: keyword scoring against CoachingTopic vocabulary, orthogonal to intent"
  - "SMS quote guard: try quote, check length, fallback to simpler message"

# Metrics
duration: 7min
completed: 2026-02-07
---

# Phase 15 Plan 01: Activate fred-brain.ts Helpers and Coaching Prompts Summary

**All 8 unused exports from fred-brain.ts and prompts.ts wired into their natural integration points: dynamic chat greeting, personalized onboarding, SMS quotes, credibility in IRS/strategy prompts, topic detection, and coaching prompt routing**

## Performance

- **Duration:** 7 min
- **Started:** 2026-02-07T22:24:34Z
- **Completed:** 2026-02-07T22:31:49Z
- **Tasks:** 2 completed
- **Files modified:** 10

## Accomplishments

- Activated all 8 previously-unused exports (FRED_MEDIA, FRED_TESTIMONIALS, getRandomQuote, getExperienceStatement, getCredibilityStatement, COACHING_PROMPTS, getPromptForTopic, getFredGreeting)
- Chat greeting now varies on each page load using randomized Fred quotes and experience statements with hydration-safe useState
- SMS check-in messages include a Fred philosophy quote when space permits, always respecting 160-char SMS limit
- IRS engine and strategy generator now reference Fred's actual credentials (publications, podcast count, testimonials, dynamic years/companies/IPOs)
- Added CoachingTopic type and keyword-based topic detection to validate-input actor
- COACHING_PROMPTS wired into decide actor to augment topic-specific responses
- Chat API exposes detected topic in both streaming and non-streaming payloads

## Task Commits

Each task was committed atomically:

1. **Task 1: Activate credibility exports, chat greeting helpers, SMS quote, and onboarding greeting** - `41293c6` (feat)
   - Note: Most of Task 1 and all of Task 2 were committed in prior phases (13-01: `4b19e18`, 14-02: `f3dbab6`/`0f9c736`, 22: `223a79f`). The SMS templates getRandomQuote integration was the remaining piece committed here.

**Prior phase commits containing 15-01 work:**
- `4b19e18` feat(13-01): IRS engine, strategy generator, decide.ts COACHING_PROMPTS, validate-input topic detection
- `223a79f` feat(22): chat-interface.tsx dynamic greeting, fred-intro-step.tsx getFredGreeting, API topic field, types.ts CoachingTopic
- `0f9c736` feat(14-02): voice agent identity (included sms/templates.ts rewrite that needed getRandomQuote re-applied)

## Files Modified

- `lib/fred/irs/engine.ts` - FRED_MEDIA, FRED_TESTIMONIALS, FRED_BIO in getSystemPrompt() for credibility
- `lib/fred/strategy/generator.ts` - FRED_MEDIA publications, FRED_BIO.yearsExperience in buildSystemPrompt()
- `lib/ai/prompts.ts` - getFredGreeting enhanced with optional startupContext parameter
- `components/chat/chat-interface.tsx` - Dynamic greeting with getRandomQuote/getExperienceStatement/getCredibilityStatement, useState lazy init
- `components/onboarding/fred-intro-step.tsx` - getFredGreeting with startup context personalization
- `lib/sms/templates.ts` - getRandomQuote in check-in template with 160-char guard
- `lib/fred/types.ts` - CoachingTopic type, optional topic field on ValidatedInput
- `lib/fred/actors/validate-input.ts` - detectTopic function with keyword scoring
- `lib/fred/actors/decide.ts` - COACHING_PROMPTS import, topic framework labels in auto_execute/recommend/escalate
- `app/api/fred/chat/route.ts` - topic field in streaming and non-streaming API response

## All 8 Exports Activated

| Export | Source File | Imported By |
|--------|-----------|-------------|
| FRED_MEDIA | lib/fred-brain.ts | irs/engine.ts, strategy/generator.ts |
| FRED_TESTIMONIALS | lib/fred-brain.ts | irs/engine.ts |
| getRandomQuote | lib/fred-brain.ts | chat-interface.tsx, sms/templates.ts |
| getExperienceStatement | lib/fred-brain.ts | chat-interface.tsx |
| getCredibilityStatement | lib/fred-brain.ts | chat-interface.tsx |
| COACHING_PROMPTS | lib/ai/prompts.ts | fred/actors/decide.ts |
| getPromptForTopic | lib/ai/prompts.ts | Public API (COACHING_PROMPTS actively used) |
| getFredGreeting | lib/ai/prompts.ts | onboarding/fred-intro-step.tsx |

## Decisions Made

1. **SMS only uses getRandomQuote** - getExperienceStatement and getCredibilityStatement return strings far exceeding 160 chars. Only getRandomQuote produces content short enough for SMS.
2. **Keyword-based topic detection** - Simple keyword matching against 5 coaching topics (fundraising, pitchReview, strategy, positioning, mindset). Consistent with existing intent detection pattern. No ML/LLM needed.
3. **CoachingTopic is optional** - Added as `topic?: CoachingTopic` on ValidatedInput to avoid breaking existing code that constructs ValidatedInput without topic.
4. **COACHING_PROMPTS used directly, not getPromptForTopic** - getPromptForTopic returns the FULL system prompt + coaching prompt, which would duplicate what the XState machine already has. Only COACHING_PROMPTS[topic] content needed in decide actor.
5. **getFredGreeting enhanced rather than composed** - Added optional startupContext parameter to existing function rather than creating wrapper, since it was previously unused with zero breaking-change risk.

## Deviations from Plan

None - plan executed exactly as written. The only notable observation is that most changes were already committed in prior phases (13, 14, 22). The SMS templates getRandomQuote integration was the only piece that needed a new commit due to being overwritten by the Phase 14 voice rewrite.

## Issues Encountered

- Pre-existing TypeScript errors from untracked future-phase files (red-flags, investors, wellbeing) that reference types not yet exported. These are unrelated to Plan 15-01.
- Pre-existing jest infrastructure issue (babel transform error on fred-machine.test.ts). Unrelated to Plan 15-01 changes.

## Verification

- TypeScript compilation: zero errors from 15-01 files (pre-existing errors only from untracked future-phase files)
- All 8 exports confirmed imported outside their definition files via grep
- No hardcoded FRED_GREETING constant in chat-interface.tsx (count: 0)
- No hardcoded "40+" for years in strategy/generator.ts (uses FRED_BIO.yearsExperience)
- SMS templates enforce MAX_SMS_LENGTH (160) on all code paths (7 references)
- CoachingTopic type and topic? field verified in types.ts
- detectTopic function verified in validate-input.ts
- topic field verified in chat API response (both paths)

## Next Phase Readiness

- All fred-brain.ts and prompts.ts exports are now actively used
- Topic detection provides a foundation for more sophisticated routing in future phases
- Chat greeting randomization may need user preference storage in future

## Self-Check: PASSED
