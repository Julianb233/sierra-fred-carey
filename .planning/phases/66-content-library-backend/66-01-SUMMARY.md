---
phase: 66-content-library-backend
plan: 01
subsystem: content-library
tags: [mux, database, migration, rls, supabase]

dependency-graph:
  requires: []
  provides:
    - "5-table content library schema (courses, modules, lessons, enrollments, content_progress)"
    - "@mux/mux-node SDK v12.8.1 installed"
  affects:
    - "66-02: Mux client and DB helpers depend on the installed SDK and schema"
    - "66-03: API routes and FRED tool depend on the schema"

tech-stack:
  added:
    - "@mux/mux-node@^12.8.1"
  patterns:
    - "IF NOT EXISTS on all CREATE TABLE for idempotent migrations"
    - "RLS with authenticated read + service_role full access per table"
    - "ON DELETE CASCADE on all foreign keys"

key-files:
  created:
    - supabase/migrations/20260225000010_content_library.sql
  modified:
    - package.json

decisions:
  - "Used npm install instead of pnpm add due to EPERM chmod permissions issue in workspace; package.json correctly updated"
  - "Migration file uses IF NOT EXISTS pattern for idempotency"
  - "tier_required CHECK constraint uses normalized lowercase values: free, pro, studio"
  - "8 performance indexes covering all foreign keys + commonly filtered columns (is_published, stage, topic, mux_asset_id)"
  - "Enrollments uses UNIQUE(user_id, course_id) to prevent duplicate enrollments"
  - "content_progress uses UNIQUE(user_id, lesson_id) for upsert safety"

metrics:
  duration: "~3 minutes"
  completed: "2026-02-25"
---

# Phase 66 Plan 01: Database Schema + @mux/mux-node Install Summary

**One-liner:** 5-table content library schema with RLS + Mux SDK installed via npm.

## What Was Created

### Package Installed
- `@mux/mux-node@^12.8.1` added to package.json dependencies

### Migration File
Path: `supabase/migrations/20260225000010_content_library.sql`

Tables created:
1. **courses** — Course catalog with tier_required CHECK ('free'|'pro'|'studio'), slug UNIQUE, is_published flag
2. **modules** — Course modules with course_id FK → courses(id) ON DELETE CASCADE
3. **lessons** — Video lessons with module_id FK → modules(id) ON DELETE CASCADE, all Mux fields (mux_upload_id, mux_asset_id, mux_playback_id, mux_status CHECK)
4. **enrollments** — User course enrollment with UNIQUE(user_id, course_id)
5. **content_progress** — Lesson watch progress with UNIQUE(user_id, lesson_id) for upsert safety

### Indexes (8 total)
- idx_courses_published, idx_courses_stage, idx_courses_topic
- idx_modules_course_id, idx_lessons_module_id, idx_lessons_mux_asset_id
- idx_enrollments_user_id, idx_content_progress_user_id

### RLS Policies per table
- **courses**: authenticated SELECT (is_published=true), service_role ALL
- **modules**: authenticated SELECT (all), service_role ALL
- **lessons**: authenticated SELECT (all), service_role ALL
- **enrollments**: authenticated SELECT own, authenticated INSERT own, service_role ALL
- **content_progress**: authenticated SELECT own, authenticated ALL own (for upsert), service_role ALL

## Key Decisions

1. **npm over pnpm**: The pnpm install threw EPERM chmod errors in this workspace environment. `npm install` succeeded and updated package.json correctly.
2. **Migration not run against DB**: Per instructions, migration file is created only — not applied. Blocked by missing Supabase credentials in this environment.
3. **CREATE POLICY (no IF NOT EXISTS)**: Follows existing migration patterns in the codebase.

## Deviations from Plan

### Auto-fixed Issues
**[Rule 3 - Blocking] Used `npm install` instead of `pnpm add`**
- Found during: Task 1
- Issue: pnpm threw EPERM chmod on node_modules/.pnpm/which permissions in workspace
- Fix: Used `npm install @mux/mux-node@12.8.1` which succeeded
- Files modified: package.json, package-lock.json
- Result: @mux/mux-node@^12.8.1 correctly in package.json dependencies

## Verification Results
- `grep -c "CREATE TABLE IF NOT EXISTS"` → 5 ✓
- `grep -c "ENABLE ROW LEVEL SECURITY"` → 5 ✓
- `grep "REFERENCES auth.users"` → enrollments + content_progress ✓
- `grep "tier_required"` → CHECK constraint with 'free', 'pro', 'studio' ✓
- `grep "mux_playback_id"` → present in lessons table ✓
- `node -e "require('@mux/mux-node')"` → no error ✓
