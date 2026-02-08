---
phase: 31
plan: 02
subsystem: email-engagement
tags: [milestone-email, re-engagement, cron, react-email, fred-quotes]
dependency-graph:
  requires: [31-01]
  provides: [milestone-celebration-emails, re-engagement-emails]
  affects: []
tech-stack:
  added: []
  patterns: [fire-and-forget-email, graduated-re-engagement, tiered-nudge-cadence, batch-inactive-detection]
key-files:
  created:
    - lib/email/milestones/types.ts
    - lib/email/milestones/triggers.ts
    - lib/email/templates/milestone.tsx
    - lib/email/re-engagement/types.ts
    - lib/email/re-engagement/detector.ts
    - lib/email/templates/re-engagement.tsx
    - app/api/cron/re-engagement/route.ts
  modified:
    - app/api/journey/milestones/[id]/route.ts
decisions:
  - id: d31-02-01
    decision: Fire-and-forget milestone email trigger (non-blocking, catch-all error handling)
    rationale: Milestone email failures must never break the milestone update API response
  - id: d31-02-02
    decision: Graduated re-engagement with 14-day duplicate prevention window
    rationale: Prevents email fatigue while allowing progression through day7/day14/day30 tiers
  - id: d31-02-03
    decision: Batch activity detection with in-memory join instead of per-user N+1 queries
    rationale: Efficient even with many users; 3 batch queries (users, last activity, recent sends) joined in memory
metrics:
  duration: 5m
  completed: 2026-02-08
---

# Phase 31 Plan 02: Milestone and Re-engagement Emails Summary

Milestone celebration emails with Fred quotes triggered on completion, plus graduated re-engagement emails (day7/day14/day30) for inactive users via daily cron, all built on Plan 01 email infrastructure.

## Task Commits

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Milestone celebration emails | 9b0332e | lib/email/milestones/types.ts, triggers.ts, templates/milestone.tsx, app/api/journey/milestones/[id]/route.ts |
| 2 | Re-engagement emails and cron configuration | a198e11 | lib/email/re-engagement/types.ts, detector.ts, templates/re-engagement.tsx, app/api/cron/re-engagement/route.ts |

## What Was Built

### Milestone Celebration Emails (Task 1)
- **Types** (`lib/email/milestones/types.ts`): `MilestoneType` union (7 types: first_chat, first_reality_lens, first_pitch_review, ten_conversations, irs_above_70, first_strategy_doc, milestone_completed), `MilestoneEmailData` interface, `MILESTONE_MESSAGES` record with per-type titles, descriptions, and next step suggestions
- **Trigger** (`lib/email/milestones/triggers.ts`): `sendMilestoneEmail()` with `shouldSendEmail(userId, 'milestone')` preference check, 24h idempotency window via email_sends table, profile lookup, random Fred quote via dynamic `getRandomQuote()` import, dynamic MilestoneEmail template import
- **Template** (`lib/email/templates/milestone.tsx`): Celebration header with emoji, large brand-colored milestone title, greeting paragraph, Fred quote blockquote with left-border accent, "What's Next" card with suggestion, "Continue Your Journey" CTA button
- **API wiring** (`app/api/journey/milestones/[id]/route.ts`): Fire-and-forget `sendMilestoneEmail(userId, 'milestone_completed', updated.title).catch(...)` call in PATCH handler when status changes to 'completed', with logger error that never blocks the API response

### Re-engagement Email System (Task 2)
- **Types** (`lib/email/re-engagement/types.ts`): `ReEngagementTier` (day7, day14, day30), `ReEngagementCandidate`, `ReEngagementEmailData`, `RE_ENGAGEMENT_MESSAGES` record with graduated messaging (gentle day7, value-focused day14, warm-farewell day30)
- **Detector** (`lib/email/re-engagement/detector.ts`): `getReEngagementCandidates()` using 3 batch queries (all onboarded users with email, all last activity from journey_events, recent re-engagement sends) joined in memory. Categorizes by inactivity duration into tiers, respects 14-day cooldown, checks `shouldSendEmail(userId, 're_engagement')` preferences per candidate
- **Template** (`lib/email/templates/re-engagement.tsx`): Tier-specific preview text, warm greeting, Fred's graduated message paragraph, feature highlight card with accent border, "Come Back to Sahara" CTA (muted gray for day30 tier), "no pressure" soft close text for day30
- **Cron route** (`app/api/cron/re-engagement/route.ts`): CRON_SECRET bearer auth, RESEND_API_KEY 503 check, calls `getReEngagementCandidates()`, sequential processing with `sendEmail()` and per-tier tags, tracks sent/skipped/failed counts, returns JSON summary with duration
- **Vercel cron** (`vercel.json`): Already configured at `0 14 * * *` (daily 14:00 UTC) from Plan 01 infrastructure setup

## Decisions Made

1. **Fire-and-forget email trigger** -- Milestone emails are sent without awaiting the result in the API handler. The `.catch()` logs errors but never propagates them, ensuring the milestone update API always responds promptly.

2. **14-day re-engagement cooldown** -- Users who received a re-engagement email will not get another for 14 days, regardless of their inactivity tier. This prevents email fatigue while still allowing tier progression (day7 -> day14 -> day30) over time.

3. **Batch inactive detection** -- The detector runs 3 queries (all onboarded users, all last activity from journey_events, all recent re-engagement sends) and joins them in memory. This avoids N+1 query patterns and scales efficiently for the expected user count.

## Deviations from Plan

None -- plan executed exactly as written.

## Verification Results

- TypeScript compilation: PASS (zero errors via `npx tsc --noEmit`)
- ESLint: PASS (zero errors in all 8 new/modified files)
- Build: PASS (`npm run build` completes successfully)
- All 7 new files exist and export correct functions
- `sendMilestoneEmail` exported from `lib/email/milestones/triggers.ts`
- `MilestoneEmail` exported from `lib/email/templates/milestone.tsx`
- `getReEngagementCandidates` exported from `lib/email/re-engagement/detector.ts`
- `ReEngagementEmail` exported from `lib/email/templates/re-engagement.tsx`
- `GET` exported from `app/api/cron/re-engagement/route.ts`
- Milestone trigger wired into milestones PATCH handler with fire-and-forget pattern
- vercel.json has both `/api/cron/weekly-digest` and `/api/cron/re-engagement` in crons array

## Phase 31 Complete

All three email types are now operational:
1. **Weekly digest** (Plan 01): Monday 10:00 UTC, activity summary with stats grid
2. **Milestone celebrations** (Plan 02): Event-triggered on milestone completion, with Fred quotes
3. **Re-engagement** (Plan 02): Daily 14:00 UTC, graduated day7/day14/day30 nudges

All share the Plan 01 infrastructure: Resend SDK client, unified send function, preference checking, email_sends tracking table, and Sahara-branded React Email layout.

## Self-Check: PASSED
