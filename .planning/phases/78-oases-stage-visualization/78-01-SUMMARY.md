---
phase: 78-oases-stage-visualization
plan: 01
status: complete
completed_at: 2026-03-08
---

# Phase 78-01 Summary: Data Layer and API Routes

## What Was Built

The Oases data model, type system, stage configuration, progress calculation logic, and API endpoints for the 5-stage venture journey (Clarity, Validation, Build, Launch, Grow).

## Artifacts

### 1. Database Migrations (pre-existing, verified)

- **`supabase/migrations/20260308000001_journey_welcomed_and_oases_stage.sql`** — Adds `oases_stage TEXT DEFAULT 'clarity'` column with CHECK constraint to profiles table.
- **`supabase/migrations/20260308000002_oases_progress_table.sql`** — Creates `oases_progress` table with `user_id`, `stage`, `step_id`, `completed_at`, `score`, `metadata`, RLS policies (select/insert/update for own rows, service_role full access), and `idx_oases_progress_user_stage` index.

> Note: The plan specified a single migration file `20260308000001_oases_stage.sql`, but the equivalent functionality was already deployed across two migrations. No duplicate migration was created.

### 2. Type Definitions (pre-existing, verified)

**`types/oases.ts`** — Exports:
- `OasesStage` — string literal union: `"clarity" | "validation" | "build" | "launch" | "grow"`
- `OASES_STAGES` — const array of all stages
- `StageStep` — interface with `id`, `label`, `description`, `completionCheck`, optional `threshold`
- `StageConfig` — interface with `id`, `name`, `tagline`, `description`, `icon`, `color`, `steps`, `unlockedFeatures`, `gatedRoutes`
- `OasesProgress` — interface with `currentStage`, `stageIndex`, `stages[]`, `journeyPercentage`, `canAdvance`

### 3. Stage Configuration (updated)

**`lib/oases/stage-config.ts`** — Exports:
- `STAGE_CONFIG` — 5 stages, 14 total steps (3+3+3+3+2)
- `STAGE_ORDER` — ordered array of stage IDs
- `getStageConfig(stage)` — returns full StageConfig for a stage
- `getStageIndex(stage)` — returns 0-based index
- `getStageSteps(stage)` — returns steps for a stage
- `getStageFeatureGates(route)` — returns which stage unlocks a route
- `isRouteGated(route, currentStage)` — returns true if route requires a later stage

**Changes made:** Updated `unlockedFeatures` and `gatedRoutes` for all 5 stages to match the plan specification:
- Clarity: added "wellbeing"
- Validation: added "coaching", "next-steps" and their gated routes
- Build: changed to "strategy", "documents", "pitch-deck", "readiness" with matching routes
- Launch: expanded to "investor-lens", "investor-targeting", "investor-readiness", "investor-evaluation" with matching routes
- Grow: added "marketplace" and added "/dashboard/communities", "/dashboard/marketplace" routes

### 4. Progress Logic (pre-existing, verified)

**`lib/oases/progress.ts`** — Exports:
- `computeJourneyPercentage(completedSteps, totalSteps)` — returns 0-100 integer
- `getUserOasesProgress(userId)` — fetches profile + progress rows, computes per-stage completion and overall journey percentage
- `advanceStage(userId)` — validates all current-stage steps complete, updates profiles.oases_stage to next stage

### 5. API Routes (pre-existing, verified)

- **`app/api/oases/progress/route.ts`** — `GET` endpoint: authenticates via Supabase, returns `{ success: true, data: OasesProgress }`
- **`app/api/oases/advance/route.ts`** — `POST` endpoint: authenticates via Supabase, calls `advanceStage`, returns `{ success: true, data: { newStage } }` or 400 error

## Verification

- `npx tsc --noEmit` — zero oases-related TypeScript errors
- All required exports present in all artifact files
- Stage config has exactly 5 stages with correct step counts (3+3+3+3+2 = 14)
- Progress logic uses Supabase server client (`createClient` from `@/lib/supabase/server`)
- API routes follow existing project patterns (auth check, try/catch, NextResponse.json)

## Must-Have Truths Satisfied

1. Each user has a current Oases stage stored in the database (profiles.oases_stage column)
2. Stage progress steps are tracked per-user with completion timestamps (oases_progress table)
3. API returns the user's current stage, completed steps, and overall journey percentage (GET /api/oases/progress)
4. Stage advancement API validates all steps are complete before advancing (POST /api/oases/advance checks canAdvance)
