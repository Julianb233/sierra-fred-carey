---
phase: 78
plan: 01
subsystem: oases-data-layer
tags: [oases, types, supabase, api, stage-gating, progress-tracking]
dependency-graph:
  requires: [77-01]
  provides: [oases-types, stage-config, progress-api, advance-api, oases-progress-table]
  affects: [78-02, 79-01, 80-01]
tech-stack:
  added: []
  patterns: [stage-gating, step-based-progress, journey-percentage]
key-files:
  created:
    - types/oases.ts
    - lib/oases/stage-config.ts
    - lib/oases/progress.ts
    - app/api/oases/progress/route.ts
    - app/api/oases/advance/route.ts
    - supabase/migrations/20260308000002_oases_progress_table.sql
  modified: []
decisions:
  - id: d78-01-01
    decision: "String literal union for OasesStage (not enum) for JSON serialization"
  - id: d78-01-02
    decision: "14 total steps across 5 stages (3+3+3+3+2)"
  - id: d78-01-03
    decision: "Route gating checks stage index -- current or earlier stage routes are accessible"
  - id: d78-01-04
    decision: "User-scoped Supabase client (createClient) for progress queries, not service role"
metrics:
  duration: 2m
  completed: 2026-03-08
---

# Phase 78 Plan 01: Oases Data Layer Summary

**JWT auth-style stage types, progress calculation with 14-step journey tracking, and two API endpoints for reading progress and advancing stages.**

## What Was Built

### Task 1: Type Definitions + oases_progress Migration
- `types/oases.ts`: OasesStage union type, OASES_STAGES array, StageStep/StageConfig/OasesProgress interfaces
- `supabase/migrations/20260308000002_oases_progress_table.sql`: Creates oases_progress table with user_id, stage, step_id, completed_at, score, metadata. RLS policies for user CRUD and service role full access. Index on (user_id, stage).
- Commit: `94ae477`

### Task 2: Stage Configuration + Progress Logic + API Endpoints
- `lib/oases/stage-config.ts`: STAGE_CONFIG array with all 5 stages (Clarity/Validation/Build/Launch/Grow), 14 steps with completion check types and thresholds. Exports STAGE_ORDER, getStageConfig, getStageIndex, getStageSteps, getStageFeatureGates, isRouteGated.
- `lib/oases/progress.ts`: getUserOasesProgress fetches profile stage + progress rows, computes per-stage completion and journey percentage. advanceStage validates all steps complete before updating profiles.oases_stage. computeJourneyPercentage pure function.
- `app/api/oases/progress/route.ts`: GET endpoint with Supabase auth returning full OasesProgress.
- `app/api/oases/advance/route.ts`: POST endpoint with Supabase auth validating and advancing stage.
- Commit: `6ff45c7`

## Decisions Made

1. **String literal union for OasesStage** -- Not TypeScript enum. JSON serialization friendly, matches DB check constraint.
2. **14 total steps (3+3+3+3+2)** -- Clarity and Validation have concrete completion checks; Grow has 2 steps since it represents ongoing growth.
3. **Route gating by stage index** -- `isRouteGated` returns true only if the required stage index is strictly greater than current. Users can access their current stage's gated routes.
4. **User-scoped Supabase client** -- Progress queries use `createClient()` (cookie-based auth) not `createServiceClient()`, consistent with RLS policies on oases_progress.

## Deviations from Plan

None -- plan executed exactly as written.

## Verification Results

- TypeScript compiles with zero new errors (85 pre-existing errors in unrelated files)
- types/oases.ts exports all 5 required types (OasesStage, OASES_STAGES, StageStep, StageConfig, OasesProgress)
- lib/oases/stage-config.ts exports STAGE_CONFIG (5 stages, 14 steps), STAGE_ORDER, getStageConfig, getStageIndex, getStageFeatureGates, isRouteGated, getStageSteps
- lib/oases/progress.ts exports getUserOasesProgress, advanceStage, computeJourneyPercentage
- Migration creates oases_progress with RLS; does NOT duplicate oases_stage column
- API routes follow existing Supabase server client auth pattern

## Next Phase Readiness

Phase 78 Plan 02 (if it exists) can build visualization components on top of these types and API endpoints. Phase 79 and 80 can import OasesStage and stage-config for feature gating and UI rendering. The oases_progress table must be migrated in Supabase before the progress API will return real data.
