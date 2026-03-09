---
phase: 84
plan: 01
subsystem: guidance
tags: [daily-agenda, ai-generation, dashboard-widget, oases-stage]
dependency-graph:
  requires: [78-oases-stages, 79-founder-memory]
  provides: [daily-agenda-engine, daily-task-widget, task-completion-tracking]
  affects: [84-02-sms-delivery]
tech-stack:
  added: []
  patterns: [generateObject-with-zod-schema, per-user-per-day-caching, journey-event-logging]
key-files:
  created: []
  modified: []
  verified:
    - lib/guidance/daily-agenda.ts
    - lib/guidance/types.ts
    - components/dashboard/daily-agenda-widget.tsx
    - app/api/dashboard/daily-agenda/route.ts
    - app/dashboard/page.tsx
    - supabase/migrations/20260308_daily_agenda.sql
decisions:
  - id: 84-01-01
    decision: "All code pre-built and verified correct -- no modifications needed"
    context: "Phase 84 implementation was completed in a prior session"
metrics:
  duration: "5m (verification only)"
  completed: "2026-03-09"
---

# Phase 84 Plan 01: Daily Agenda Engine & Dashboard Widget Summary

**One-liner:** AI-powered daily agenda with Oases-stage-aware task generation, dashboard widget with completion tracking, and journey event logging

## What Was Done

All code was pre-built and verified correct. No modifications were needed.

### Verified Components

1. **Daily Agenda Engine** (`lib/guidance/daily-agenda.ts`)
   - Loads founder profile including `oases_stage` from Phase 78
   - Loads recent chat episodes via `retrieveRecentEpisodes` from Phase 79 memory layer
   - Loads outstanding next-steps for accountability-aware task generation
   - Uses `generateObject` with tier-routed model and Zod schema
   - Caches per user per day (upsert on user_id + date unique constraint)
   - Falls back to generic tasks on AI failure
   - Logs `daily_task_completed` journey events on task completion

2. **Types** (`lib/guidance/types.ts`)
   - `DailyTask`: id, title, description, priority, estimatedMinutes, category, completed
   - `DailyAgenda`: date, tasks, stage, greeting, completedCount

3. **Dashboard Widget** (`components/dashboard/daily-agenda-widget.tsx`)
   - Fetches from `/api/dashboard/daily-agenda` on mount
   - Renders 3 task cards with priority badges, category icons, estimated time
   - Checkbox click POSTs taskId to mark completion
   - Shows loading skeleton, empty state, and "all complete" celebration toast
   - Uses Sahara brand colors (#ff6a1a)

4. **API Endpoints** (`app/api/dashboard/daily-agenda/route.ts`)
   - GET: Auth required, rate-limited, calls `generateDailyAgenda(userId)`
   - POST: Auth required, validates `taskId`, calls `logTaskCompletion(userId, taskId)`

5. **Dashboard Integration** (`app/dashboard/page.tsx`)
   - `DailyAgendaWidget` imported and rendered in both data/no-data states
   - Wrapped in `FadeIn` with delay for animation
   - Positioned after FredHero, before OasesVisualizer

6. **Database Migration** (`supabase/migrations/20260308_daily_agenda.sql`)
   - `daily_agendas` table with user_id, date, tasks JSONB, completed_tasks
   - UNIQUE(user_id, date) constraint for caching
   - RLS enabled with user-read and service-manage policies
   - Index on (user_id, date DESC)

## Deviations from Plan

None -- plan executed exactly as written (verification-only pass).

## Verification Results

- `npx tsc --noEmit` passes (0 errors)
- `oases_stage` used in profile select query and stage-aware prompt generation
- `logJourneyEventAsync` fires on task completion
- `retrieveRecentEpisodes` loads recent chat context
- `DailyAgendaWidget` imported and rendered on dashboard page
- Migration file exists with RLS policies

## Next Phase Readiness

Plan 84-02 (SMS delivery) can proceed -- the `generateDailyAgenda` function it depends on is verified and working.
