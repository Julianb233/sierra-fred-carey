---
phase: 77-guided-venture-journey-onboarding
plan: 01
subsystem: onboarding
tags: [welcome, intake, fred-memory, oases, supabase]
dependency-graph:
  requires: []
  provides: [welcome-flow, intake-questions, journey-welcomed-flag, oases-stage-column]
  affects: [78-reality-lens, 79-stage-gating, 80-daily-guidance]
tech-stack:
  added: []
  patterns: [show-once-flag, fred-memory-storage, step-by-step-intake]
file-tracking:
  key-files:
    created:
      - supabase/migrations/20260308000001_journey_welcomed_and_oases_stage.sql
      - lib/welcome/types.ts
      - lib/welcome/intake-questions.ts
      - app/welcome/page.tsx
      - components/welcome/journey-welcome.tsx
      - components/welcome/intake-form.tsx
    modified: []
decisions:
  - id: oases-five-stages
    description: "Five Oases stages: clarity, validation, build, launch, grow -- enforced via CHECK constraint"
  - id: show-once-via-profile
    description: "journey_welcomed boolean on profiles table controls show-once behavior"
  - id: free-text-intake
    description: "All 5 intake questions use free-text textarea, no dropdowns or checkboxes"
  - id: stage-normalization
    description: "Free-text stage answer normalized to idea/mvp/pre-seed/seed/series-a via keyword matching"
metrics:
  duration: "~3 minutes"
  completed: "2026-03-08"
---

# Phase 77 Plan 01: Welcome Screen and Intake Form Summary

**One-liner:** Mandatory welcome screen with desert/Oases 5-stage metaphor and 5-question free-text intake that stores answers as FRED semantic memory.

## What Was Built

### Database Migration
- Added `journey_welcomed` (boolean, default false) to profiles table for show-once control
- Added `oases_stage` (text with CHECK constraint: clarity/validation/build/launch/grow)
- Added `co_founder` and `venture_timeline` free-text columns
- Partial index on `journey_welcomed = false` for efficient lookup

### TypeScript Types and Question Definitions
- `IntakeQuestion` interface with id, question text, placeholder, FRED rephrase template, memory category/key, optional profile field mapping
- `IntakeAnswers` interface covering all 5 question IDs
- `IntakeStep` union type for flow state management
- `INTAKE_QUESTIONS` array with 5 questions: startup idea, current stage, biggest challenge, co-founder status, timeline/goal

### Welcome Page (`/welcome`)
- Auth gate: redirects unauthenticated users to `/get-started`
- Show-once logic: checks `journey_welcomed` flag, redirects already-welcomed users to `/dashboard`
- Desert-themed background with gradient overlays and blur effects
- AnimatePresence transitions between welcome screen and intake form
- Redirects to `/dashboard/reality-lens?first=true` after intake completion

### Journey Welcome Component
- Full-screen centered layout with Sahara logo
- Hero: "Welcome to Your Venture Journey" with Sahara orange accent
- Subheading communicating journey philosophy
- 5 Oases stages displayed as horizontal timeline with icons (Compass, Target, Wrench, Rocket, TrendingUp)
- Staggered Framer Motion animations on each stage
- Warm paragraph about Fred's mentorship approach
- "Begin My Journey" CTA button (orange variant)
- Dark mode support throughout

### Intake Form Component
- 5 questions presented one at a time with smooth slide transitions
- Progress dots showing current position
- Textarea input (not input field) for free-text answers
- Enter key submits current answer (Shift+Enter for newlines)
- After each answer: FRED's rephrase appears in styled card with "F" avatar, auto-advances after 1.5s
- Processing state with pulsing dots animation and "Fred is getting to know you..." message
- On completion: stores all 5 answers as FRED semantic memory facts via `/api/fred/memory`
- Updates profile: `journey_welcomed=true`, `co_founder`, `venture_timeline`, `challenges`, `stage` (normalized)
- 3-second timeout on saves to prevent hanging
- No skip button -- intake is mandatory per requirements

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| Show-once via `journey_welcomed` column | Database flag is reliable across devices, unlike localStorage |
| Free-text intake (no dropdowns) | Fred Cary's philosophy: understand founders in their own words |
| Stage normalization via keyword matching | Simple, no AI call needed; defaults to 'idea' when unclear |
| 1.5s FRED rephrase display | Enough time to read without feeling slow |
| 3s save timeout | Prevents infinite loading if API is slow |

## Deviations from Plan

None -- plan executed exactly as written.

## Verification Results

- All 6 files created and present
- TypeScript compiles (no new errors; pre-existing errors in trigger/sahara-whatsapp-monitor.ts only)
- Auth check via `getUser` confirmed in welcome page
- FRED memory API call confirmed in intake form
- `journey_welcomed` flag usage confirmed in both page and form
- Reality Lens redirect confirmed
- No skip button in any welcome flow component

## Commits

| Hash | Message |
|------|---------|
| 73062ef | feat(77-01): database migration + types + intake question definitions |
| 53ee5c9 | feat(77-01): welcome screen + intake form components |

## Next Phase Readiness

- `/welcome` route is ready for integration into the signup flow (post-signup redirect)
- `oases_stage` column is available for Reality Lens scoring (Phase 78)
- `journey_welcomed` flag can be checked by middleware for stage-gating (Phase 79)
- FRED memory facts from intake are available for all subsequent AI interactions
