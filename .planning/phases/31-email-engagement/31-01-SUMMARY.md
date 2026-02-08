---
phase: 31
plan: 01
subsystem: email-engagement
tags: [resend, react-email, cron, digest, email]
dependency-graph:
  requires: []
  provides: [email-infrastructure, weekly-digest, email-sends-table]
  affects: [31-02]
tech-stack:
  added: [resend]
  patterns: [resend-sdk-singleton, react-email-templates, cron-idempotency, preference-gated-sending]
key-files:
  created:
    - lib/email/client.ts
    - lib/email/send.ts
    - lib/email/types.ts
    - lib/email/constants.ts
    - lib/email/preferences.ts
    - lib/email/templates/layout.tsx
    - lib/email/templates/weekly-digest.tsx
    - lib/email/digest/data.ts
    - lib/db/migrations/045_email_engagement.sql
    - app/api/cron/weekly-digest/route.ts
  modified:
    - package.json
    - vercel.json
decisions:
  - id: d31-01-01
    decision: Use Resend SDK singleton with lazy init (null when RESEND_API_KEY missing)
    rationale: Follows project's existing singleton pattern (PostHog, Supabase) and allows graceful degradation without credentials
  - id: d31-01-02
    decision: Sequential user processing in cron (not batch send)
    rationale: Simpler idempotency tracking per-user and stays within 60s timeout for expected user counts
  - id: d31-01-03
    decision: Email preferences read from profiles.metadata.notification_prefs
    rationale: Settings UI already writes to this location; keeps preference storage unified
metrics:
  duration: 7m
  completed: 2026-02-08
---

# Phase 31 Plan 01: Email Infrastructure and Weekly Digest Summary

Resend SDK email infrastructure with shared layout, preference-gated sending, idempotent tracking via email_sends table, and weekly digest cron dispatching branded React Email summaries every Monday 10:00 UTC.

## Task Commits

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Email infrastructure and database migration | c0f8b7b | lib/email/client.ts, send.ts, preferences.ts, types.ts, constants.ts, templates/layout.tsx, migrations/045_email_engagement.sql |
| 2 | Weekly digest template, data aggregation, and cron route | 3011453 | lib/email/digest/data.ts, templates/weekly-digest.tsx, app/api/cron/weekly-digest/route.ts, vercel.json |

## What Was Built

### Email Infrastructure (Task 1)
- **Resend SDK client** (`lib/email/client.ts`): Lazy-initialized singleton returning `Resend | null` when API key is missing
- **Unified send function** (`lib/email/send.ts`): Sends via Resend SDK, logs with structured logger, records sends in `email_sends` table
- **Preference checker** (`lib/email/preferences.ts`): Reads `profiles.metadata.notification_prefs` to check master email toggle and category-specific toggles (weekly, email, marketing)
- **Type system** (`lib/email/types.ts`): `EmailCategory`, `EmailSendResult`, `DigestData`, `DigestStats`, `DigestHighlight`
- **Constants** (`lib/email/constants.ts`): Category-to-preference mapping, batch size, re-engagement cadence
- **Shared layout** (`lib/email/templates/layout.tsx`): Sahara-branded React Email component with header, content card, and settings footer link
- **Database migration** (`045_email_engagement.sql`): `email_sends` table with idempotency unique index on `(user_id, email_type, week_number, year)` for weekly digests, plus RLS policies

### Weekly Digest System (Task 2)
- **Data aggregation** (`lib/email/digest/data.ts`): Parallel queries against 5 existing tables (milestones, journey_events, fred_red_flags, agent_tasks, fred_episodic_memory), returns null for zero-activity users
- **Digest template** (`lib/email/templates/weekly-digest.tsx`): Stats grid (conversations, milestones, tasks, red flags), highlights list, red flag warning section, and CTA button
- **Cron route** (`app/api/cron/weekly-digest/route.ts`): CRON_SECRET auth, RESEND_API_KEY check, sequential user processing with preference checks, idempotency enforcement, and JSON summary response
- **Vercel cron** (`vercel.json`): Added `0 10 * * 1` schedule (Monday 10:00 UTC)

## Decisions Made

1. **Resend SDK singleton with null fallback** -- Returns null when RESEND_API_KEY is not set, allowing callers to degrade gracefully without credentials. Follows the project's lazy-init pattern from push preferences and Supabase clients.

2. **Sequential user processing** -- The cron route processes users one at a time rather than using batch send. This simplifies idempotency tracking per user, provides better error isolation, and stays comfortably within the 60-second function timeout for the expected user count.

3. **Preference checking via profiles.metadata** -- Email preferences are read from the existing `profiles.metadata.notification_prefs` field, which the settings UI already reads and writes. No new preference storage needed.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed column name references in digest data aggregation**
- **Found during:** Task 2
- **Issue:** Previous incomplete worker created `data.ts` referencing `full_name` on profiles (column is `name`), `title` on `journey_events` (no such column), and `title` on `agent_tasks` (column is `description`). Also missing `event_type = 'conversation'` filter on episodic memory count.
- **Fix:** Corrected profile query to use `name`, journey_events to use `event_type` and `event_data` JSONB, agent_tasks to use `description`, and added `event_type` filter for conversation count.
- **Files modified:** lib/email/digest/data.ts
- **Commit:** 3011453

**2. [Rule 1 - Bug] Fixed agent_tasks status value**
- **Found during:** Task 2
- **Issue:** Plan referenced `status = 'completed'` for agent_tasks, but the migration schema shows valid values are `'pending' | 'running' | 'complete' | 'failed' | 'cancelled'` (note: `complete` not `completed`).
- **Fix:** Used `eq('status', 'complete')` to match the actual database CHECK constraint.
- **Files modified:** lib/email/digest/data.ts
- **Commit:** 3011453

## Verification Results

- TypeScript compilation: PASS (zero errors)
- ESLint: PASS (zero errors in new files)
- Build: PASS (npm run build completes successfully)
- All 10 new files exist and compile
- Migration 045 has CREATE TABLE, 4 indexes, unique constraint, and 2 RLS policies
- vercel.json has weekly-digest cron at `0 10 * * 1`
- Resend ^6.9.1 in package.json dependencies

## Next Phase Readiness

Phase 31-02 (milestone celebrations and re-engagement emails) can proceed immediately. The email infrastructure, shared layout, send function, preference checker, and email_sends table are all in place. Plan 02 will add:
- Milestone celebration email template and trigger
- Re-engagement detection and graduated nudge sequence
- Additional cron route for re-engagement checks

## Self-Check: PASSED
