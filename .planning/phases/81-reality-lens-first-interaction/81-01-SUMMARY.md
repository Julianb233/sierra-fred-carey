---
phase: 81-reality-lens-first-interaction
plan: 01
status: complete
subsystem: reality-lens
tags: [assessment, oases, stage-mapping, llm, supabase]
completed: 2026-03-08
duration: ~8min

dependency-graph:
  requires:
    - "78 (oases_stage column, stage-config)"
    - "77 (redirect to /dashboard/reality-lens?first=true)"
  provides:
    - "Quick assessment API endpoint (POST/GET /api/fred/reality-lens/quick)"
    - "mapScoreToStage function for Oases stage placement"
    - "reality_lens_complete DB flag for frontend redirect gating"
  affects:
    - "81-02 (frontend wizard consumes this API)"
    - "80 (stage-gate uses oases_stage set by this flow)"

tech-stack:
  added: []
  patterns:
    - "generateStructuredReliable for LLM structured output with heuristic fallback"
    - "String-based mapScoreToStage with priority-ordered rules"
    - "Service client (bypass RLS) for profile persistence"

key-files:
  created:
    - lib/fred/reality-lens-quick.ts
    - lib/fred/__tests__/reality-lens-quick.test.ts
    - lib/db/reality-lens-state.ts
    - app/api/fred/reality-lens/quick/route.ts
    - supabase/migrations/20260308200001_reality_lens_columns.sql
  modified: []

decisions:
  - id: field-naming
    decision: "QuickAnswers uses 'idea' (not 'ideaDescription'), 'prototypeStage' (not 'prototypeStatus'), customerValidation values 'none'/'interviews-10plus' (not 'no'/'10+interviews')"
    reason: "Matches plan spec exactly for frontend consumption consistency"
  - id: stage-mapping-strings
    decision: "mapScoreToStage takes string params (customerValidation, prototypeStage) not booleans"
    reason: "More expressive -- allows multi-level signals (none/informal/interviews/paying) to influence mapping"
  - id: verdict-label
    decision: "QuickAssessmentResult includes verdictLabel field"
    reason: "Human-readable label for UI display without frontend needing to derive it"
  - id: heuristic-fallback
    decision: "quickAssessIdea has full heuristic fallback when LLM fails"
    reason: "First-time user experience must never fail -- better a rough assessment than an error"

metrics:
  tests-added: 21
  tests-passing: 21
  lines-of-code: ~450
---

# Phase 81 Plan 01: Quick Reality Lens Backend Summary

Quick 6-question assessment API with LLM scoring via generateStructuredReliable, string-based mapScoreToStage with priority rules (none+idea-only=clarity override), reality_lens_complete DB flag, and heuristic fallback for guaranteed first-time experience.

## What Was Built

### 1. Quick Assessment Logic (`lib/fred/reality-lens-quick.ts`)
- `QuickAnswers` interface: 6 fields (idea, targetCustomer, revenueModel, customerValidation, prototypeStage, biggestChallenge)
- `QuickAssessmentResult` interface: overallScore, stage, gaps, strengths, nextAction, verdictLabel
- `QUICK_QUESTIONS` array: 6 questions (3 text, 3 select) with proper types, options, and placeholders
- `QuickAnswersSchema`: Zod validation (min 10 chars for idea/targetCustomer, min 5 for biggestChallenge)
- `mapScoreToStage(score, customerValidation, prototypeStage)`: Priority-ordered rules mapping to OasesStage
- `quickAssessIdea(answers)`: LLM-powered assessment using `generateStructuredReliable` (temp 0.3, maxTokens 500) with heuristic fallback
- Heuristic fallback: Keyword/signal-based scoring when LLM call fails

### 2. DB State Helpers (`lib/db/reality-lens-state.ts`)
- `markRealityLensComplete(userId, stage, score)`: Service client update to profiles (reality_lens_complete, oases_stage, reality_lens_score)
- `getRealityLensStatus(userId)`: Returns { complete, stage, score } with safe defaults
- `RealityLensStatus` exported interface

### 3. API Route (`app/api/fred/reality-lens/quick/route.ts`)
- POST: Auth required, rate-limited (3/10/50 per day by free/pro/studio), validates via QuickAnswersSchema, runs assessment, persists via markRealityLensComplete, logs journey event
- GET: Auth required, returns completion status for frontend redirect logic
- Follows exact same patterns as existing `app/api/fred/reality-lens/route.ts`

### 4. Database Migration (`supabase/migrations/20260308200001_reality_lens_columns.sql`)
- `reality_lens_complete` boolean DEFAULT false
- `reality_lens_score` integer
- Partial index on `reality_lens_complete = false` for efficient queries
- Uses IF NOT EXISTS for safe re-runs

### 5. Unit Tests (`lib/fred/__tests__/reality-lens-quick.test.ts`)
- 21 tests total: 18 for mapScoreToStage + 3 for QUICK_QUESTIONS structure
- Coverage: all 4 stages, boundary values, edge cases (high score + no validation = clarity)
- All tests passing

## Stage Mapping Rules

| Priority | Condition | Result |
|----------|-----------|--------|
| 1 | customerValidation=none AND prototypeStage=idea-only | clarity |
| 2 | score < 30 | clarity |
| 3 | score >= 80 AND customerValidation=paying-customers | launch |
| 4 | score 60-79 AND prototypeStage=mvp/launched | build |
| 5 | score 30-59 | validation |
| 6 | customerValidation=informal | validation |
| 7 | prototypeStage=mvp/launched (score >= 80, no paying customers) | build |
| 8 | customerValidation=interviews-10plus | validation |
| 9 | Default fallback | clarity |

## Must-haves Verification

| Truth | Status |
|-------|--------|
| Quick assessment accepts 6 focused answers and returns score, stage, gaps, strengths | PASS |
| Score-to-stage mapping places low-readiness at Clarity, high-readiness at Validation+ | PASS |
| reality_lens_complete flag and oases_stage are persisted to profiles | PASS |
| API is rate-limited and requires authentication | PASS |

## Deviations from Plan

None -- plan executed exactly as written.

## Test Results

```
npm run test -- --run lib/fred/__tests__/reality-lens-quick.test.ts
21 tests passing (all green)
```

## Next Phase Readiness

- 81-02 (frontend wizard) can consume `QUICK_QUESTIONS`, `QuickAnswers`, `QuickAssessmentResult` types directly
- GET endpoint available for checking completion status before showing wizard
- Stage mapping is deterministic and testable
