# Phase 43: Next Steps Hub & Readiness Tab -- Summary

**Status:** Complete
**Date:** 2026-02-12
**Commits:**
- `981c933` feat(43): add next-steps storage, categorization, and readiness APIs
- `c4f3cbd` feat(43): enhance Next Steps Hub with refresh, dismiss, and per-tier empty states

## Goal

Founders have a dedicated execution surface showing prioritized next steps from FRED conversations, plus a unified readiness view combining Investor Readiness Score and Positioning Readiness grade.

## Files Created

### Next Steps Hub

| File | Purpose |
|------|---------|
| `app/dashboard/next-steps/page.tsx` | Next Steps Hub page with three priority tiers, mark-complete, empty state, refresh, dismiss |
| `app/dashboard/next-steps/loading.tsx` | Skeleton loading state for Next Steps page |
| `components/dashboard/next-step-card.tsx` | Individual step card with priority badge, optimistic complete/undo, dismiss, conversation link, expandable "why it matters" |
| `lib/next-steps/next-steps-service.ts` | Data layer: getNextSteps, markComplete, markIncomplete, dismissStep, extractAndStoreNextSteps |
| `app/api/dashboard/next-steps/route.ts` | GET (grouped list), POST (extract from conversations), PATCH (complete/incomplete/dismiss) |
| `lib/db/migrations/055_next_steps.sql` | next_steps table with RLS policies, indexes, trigger |

### Readiness Tab

| File | Purpose |
|------|---------|
| `app/dashboard/readiness/page.tsx` | Unified readiness page with Investor Readiness + Positioning Readiness side-by-side |
| `app/dashboard/readiness/loading.tsx` | Skeleton loading state for Readiness page |
| `components/dashboard/readiness-score-card.tsx` | Reusable score card: score display, zone gauge, category breakdown bars |
| `components/dashboard/positioning-grade-card.tsx` | Reusable grade card: grade display, narrative tightness bar, key gaps |
| `app/api/dashboard/readiness/route.ts` | GET: combined IRS + positioning data with trend history |
| `app/api/positioning/latest/route.ts` | GET: most recent positioning assessment with category scores |

## Files Modified

| File | Change |
|------|--------|
| `app/dashboard/layout.tsx` | Updated sidebar: "Next Steps" href to `/dashboard/next-steps`, "Readiness" href to `/dashboard/readiness` |

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dashboard/next-steps` | List all next steps grouped by priority (critical/important/optional) |
| POST | `/api/dashboard/next-steps` | Extract "Next 3 Actions" from recent FRED conversations and persist |
| PATCH | `/api/dashboard/next-steps` | Mark step complete/incomplete/dismissed (supports `id` and `stepId`) |
| GET | `/api/dashboard/readiness` | Combined investor readiness + positioning readiness data |
| GET | `/api/positioning/latest` | Most recent positioning assessment with category scores and feedback |

## Database Schema

### next_steps table (Migration 055)

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | Primary key, auto-generated |
| user_id | UUID | FK to auth.users, ON DELETE CASCADE |
| description | TEXT | NOT NULL |
| why_it_matters | TEXT | Nullable |
| priority | TEXT | CHECK ('critical', 'important', 'optional') |
| source_conversation_date | TIMESTAMPTZ | When the source conversation occurred |
| completed | BOOLEAN | Default false |
| completed_at | TIMESTAMPTZ | Nullable |
| dismissed | BOOLEAN | Default false |
| created_at | TIMESTAMPTZ | Default now() |
| updated_at | TIMESTAMPTZ | Default now(), auto-updated via trigger |

RLS policies: users can CRUD their own rows; service role has full access.

## Features Implemented

### Next Steps Hub
1. **Three priority tiers**: Critical (red), Important (amber), Optional (blue) -- each with colored left border and badge
2. **Mark complete**: Optimistic UI with rollback on error; completed items shown in collapsible "Done" section
3. **Empty state**: CTA to chat with FRED when no steps exist
4. **Conversation links**: "View conversation" link when sourceConversationDate is present
5. **Refresh button**: POST to re-extract "Next 3 Actions" from latest FRED conversations with deduplication
6. **Dismiss**: Soft-hide steps with X button; dismissed steps excluded from UI
7. **Per-tier empty messages**: Friendly messages when a specific priority tier is empty
8. **Loading skeleton**: Structural skeleton matching the page layout

### Readiness Tab
1. **Investor Readiness section**: Score (0-100), Zone (Red/Yellow/Green gauge), 6-category breakdown with benchmark comparison, score trend sparkline, "Reassess" button linking to full IRS page
2. **Positioning Readiness section**: Grade (A-F) with color coding, Narrative Tightness (1-10) progress bar, category dimension grid (Clarity, Differentiation, Market Understanding, Narrative Strength), key gaps list, "Reassess" button linking to positioning page
3. **Empty states**: Both sections show appropriate messaging when no assessment exists
4. **Two-column responsive layout**: Side-by-side on desktop, stacked on mobile

### Next Steps Extraction
1. **Pattern matching**: Parses "Next 3 Actions:" block from FRED responses (supports bold markers, numbered/bulleted lists)
2. **Why-it-matters extraction**: Splits action items on dash/colon separators when explanation text exceeds 20 characters
3. **Priority assignment**: First action = critical, second = important, third = optional
4. **Deduplication**: Checks existing active steps before inserting to avoid duplicates
5. **Auto-extraction**: `extractAndStoreNextSteps()` can be called after FRED responds

## Success Criteria Verification

| # | Criterion | Status |
|---|-----------|--------|
| 1 | Next Steps Hub page shows three priority tiers: Critical, Important, Optional | PASS |
| 2 | Each next step shows description, why it matters, linked conversation, and mark-complete action | PASS |
| 3 | Next steps are generated from FRED conversations (extracted from "Next 3 Actions" outputs) | PASS |
| 4 | Readiness Tab shows Investor Readiness (score, zone, breakdown, historical trend, reassess button) | PASS |
| 5 | Readiness Tab shows Positioning Readiness (grade A-F, narrative tightness 1-10, key gaps) | PASS |

## Build Verification

- `npm run build`: PASS (0 errors, 1 pre-existing warning in global-error.tsx)
- `npm test`: 41/42 suites pass, 754 tests pass (1 pre-existing failure in tests/auth/profile-creation.test.ts -- unrelated to Phase 43)
- Routes compiled: `/dashboard/next-steps`, `/dashboard/readiness`

## Notes

- The `readiness-score-card.tsx` and `positioning-grade-card.tsx` components are reusable standalone cards that can be embedded in other pages (e.g., the Command Center home page)
- The readiness API aggregates data from `investor_readiness_scores` and `positioning_assessments` tables
- Sidebar navigation updated: "Next Steps" now points to the new `/dashboard/next-steps` page; "Readiness" now points to the unified `/dashboard/readiness` page
- A duplicate migration exists at `supabase/migrations/20260212000001_create_next_steps.sql` with slightly different schema (likely from Phase 42 work); the canonical migration is `lib/db/migrations/055_next_steps.sql`
