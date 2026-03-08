# Plan 75-02 Summary: Pre-Registration + Admin Dashboard

## Status: COMPLETE

## What was built

### Task 1: Pre-registration types and validation
- `PreRegistration` and `PreRegistrationMetric` types
- `PRESET_METRICS` with 5 common experiment metrics (thumbsUpRatio, avgSentimentScore, sessionCompletionRate, errorRate, avgLatency)
- `validatePreRegistration()` enforces hypothesis length, metric fields, sample size
- `createPreRegisteredExperiment()` creates experiment and stores pre-registration in metadata JSONB
- `getPreRegistration()` retrieves pre-registration from experiment metadata
- **Client/server split:** Types, constants, and validation extracted to `lib/feedback/pre-registration-shared.ts` for safe client component import. Server-only functions remain in `lib/feedback/pre-registration.ts` which re-exports from the shared module.
- Files: `lib/feedback/pre-registration.ts`, `lib/feedback/pre-registration-shared.ts`

### Task 2: Migration + API routes
- Migration adds `metadata JSONB DEFAULT '{}'` column to `ab_experiments`
- GET `/api/admin/ab-tests` returns experiments with feedback metrics and pre-registration data
- POST `/api/admin/ab-tests` supports pre-registration flow (hypothesis mandatory)
- GET `/api/admin/ab-tests/[id]` returns full feedback comparison with significance results
- DELETE `/api/admin/ab-tests/[id]` ends experiment
- All routes admin-protected via `isAdminRequest()`
- Files: `supabase/migrations/20260309000002_ab_experiments_metadata.sql`, `app/api/admin/ab-tests/route.ts`, `app/api/admin/ab-tests/[id]/route.ts`

### Task 3: UI Components
- `ExperimentFeedbackCard` -- Variant comparison card with:
  - Thumbs ratio bar, sentiment score (colored), session completion rate
  - Winner auto-flagged with orange border + TrendingUp icon (REQ-A4)
  - Significance badges (Thumbs/Sentiment/Completion: Significant or Not yet)
  - Pre-registration hypothesis display
  - Minimum sample warning badge
  - Ready-to-promote banner when all metrics significant
- `PreRegistrationForm` -- Experiment creation with:
  - Name, description, dynamic variants
  - Hypothesis textarea (required, min 20 chars)
  - Primary/secondary metric selection from PRESET_METRICS
  - Sample size and duration configuration
  - Inline validation
- Files: `components/admin/experiment-feedback-card.tsx`, `components/admin/pre-registration-form.tsx`

### Task 4: Admin page enhancement
- AB tests page uses ExperimentFeedbackCard for each experiment
- Summary stats: active experiments, total feedback signals, significant count
- Filter tabs: All, Running, Completed, Significant
- New Experiment button navigates to /admin/ab-tests/new
- New experiment page with PreRegistrationForm
- Files: `app/admin/ab-tests/page.tsx`, `app/admin/ab-tests/new/page.tsx`

## Build fix
- Prior implementation imported `PRESET_METRICS` and `validatePreRegistration` from `lib/feedback/pre-registration.ts` in client components, which pulled in `supabase-sql` (server-only via `next/headers`).
- Fixed by extracting client-safe exports into `lib/feedback/pre-registration-shared.ts` and updating all client component imports to use the shared module.
- `pre-registration.ts` re-exports everything from the shared module for backward compatibility with server-side consumers.

## Requirements Covered
- **REQ-A3**: Pre-registration template captures hypothesis, metrics, sample size, duration
- **REQ-A4**: Admin dashboard shows feedback metrics per variant, winning variants auto-flagged

## Build verification
- `npm run build` passes with zero errors
