---
phase: 79
plan: 02
subsystem: memory
tags: [memory, personalization, onboarding, prompts, fred]
dependency-graph:
  requires: [79-01]
  provides: [prompt-enforcement, co-founder-capture, stale-handling, missing-handling]
  affects: [chat-quality, onboarding-flow]
tech-stack:
  added: []
  patterns: [critical-instruction-prompt, stale-field-verification, missing-field-collection]
key-files:
  created: []
  modified:
    - lib/fred/active-memory.ts
    - app/get-started/page.tsx
    - app/api/onboard/route.ts
decisions:
  - CRITICAL INSTRUCTION includes concrete BAD/GOOD examples for personalization
  - Stale fields (7+ days) trigger ask-before-advising rule
  - Missing fields trigger do-not-guess rule with max 2 per exchange limit
  - Co-founder field is optional text input (not required) in onboarding step 3
metrics:
  duration: ~5min
  completed: 2026-03-09
---

# Phase 79 Plan 02: Prompt Enforcement & Co-Founder Capture Summary

Hardened FRED personalization enforcement with BAD/GOOD examples, stale/missing data handling, and co-founder onboarding capture.

## What Was Done

### Task 1: Strengthen FRED prompt enforcement
- Replaced generic CRITICAL INSTRUCTION with detailed personalization rules (4 numbered rules)
- Added concrete BAD examples: "You should focus on product-market fit" / "Most startups struggle with this"
- Added concrete GOOD examples using template literals with founder's actual data
- Enhanced stale field handling: "DO NOT assume they are still accurate" + "ASK before advising"
- Enhanced missing field handling: "Do NOT guess or assume values" + max 2 fields per exchange + "NEVER fabricate"
- Verified {{FOUNDER_CONTEXT}} placeholder present in FRED_CORE_PROMPT at line 102
- Verified prompt tests pass (45/45)

### Task 2: Add co-founder capture to onboarding
- Added `coFounder` state variable to onboarding wizard
- Updated wizard state persistence (loadWizardState/saveWizardState) to include coFounder
- Added text input in step 3 with Users icon and placeholder "Co-founder name(s), or 'Solo founder'"
- Field is optional -- founders can skip if solo
- Added `co_founder` to /api/onboard POST payload
- Updated onboard API route to parse and sanitize co_founder field
- Added co_founder to profile upsert (new signup) and profile update (existing user) paths
- Verified end-to-end context pipeline:
  - profiles.co_founder -> buildActiveFounderMemory -> formatMemoryBlock -> {{FOUNDER_CONTEXT}} -> FRED system prompt

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | 0b56aa0 | feat(memory): strengthen FRED prompt enforcement with personalization rules |
| 2 | 19a4683 | feat(memory): add co-founder capture to onboarding and verify context pipeline |

## Deviations from Plan

None -- plan executed exactly as written.

## Verification

- `npx tsc --noEmit` passes (0 errors)
- `npm run test -- --run` passes (1046/1049, 3 pre-existing failures in pricing and journey-analyzer tests)
- CRITICAL INSTRUCTION with BAD/GOOD examples confirmed in formatMemoryBlock output
- "Do NOT guess" rule confirmed in missing field handling
- Stale field ask-before-advising rule confirmed
- Co-founder field renders in onboarding step 3
- Co-founder saved to profiles.co_founder on form submission
- {{FOUNDER_CONTEXT}} confirmed in prompt-layers.ts line 102
