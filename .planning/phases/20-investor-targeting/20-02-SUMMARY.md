---
phase: 20-investor-targeting
plan: 02
status: complete
completed: 2026-02-07
---

# Phase 20-02 Summary: Investor Outreach & Pipeline

## What was built

### 1. Database Migration (039_investor_pipeline.sql)
- **investor_outreach_sequences** table: Stores AI-generated email sequences per investor, supporting cold, warm_intro, and follow_up types with JSONB email arrays and timing notes.
- **investor_pipeline** table: CRM-lite tracking of investors through 7 stages (identified, contacted, meeting, due_diligence, term_sheet, committed, passed) with notes, next actions, and contact dates.
- Full RLS policies for user-scoped access on both tables.
- Indexes on (user_id, stage) and (user_id, investor_id) for pipeline queries.

### 2. Outreach Generation API (app/api/investors/generate-outreach/route.ts)
- POST endpoint generating AI-personalized email sequences using Fred Cary's fundraising voice.
- Three sequence types supported:
  - **Cold Outreach**: 4 emails (day 0, 3, 7, 14) - initial, follow-up 1, follow-up 2, break-up.
  - **Warm Introduction**: 3 emails (day 0, 1, 3) - intro request, thank-you, direct follow-up.
  - **Post-Meeting Follow-up**: 3 emails (day 0, 2, 5) - thank-you, materials, next steps.
- Loads investor data and founder profile for deep personalization.
- Uses `generateStructured()` from fred-client with Fred's communication philosophy as system prompt.
- Persists sequences via upsert to investor_outreach_sequences.
- Studio tier gated via `checkTierForRequest`.

### 3. Pipeline API (app/api/investors/pipeline/route.ts)
- **GET**: Returns all pipeline entries grouped by stage with investor details and match scores.
- **POST**: Adds investor to pipeline with optional initial stage, notes, and next action. Auto-links to existing investor_matches.
- **PATCH**: Updates stage, notes, next action, dates. Auto-sets last_contact_at when moving past "identified" stage.
- Studio tier gated.

### 4. Outreach Page (app/dashboard/investor-targeting/outreach/page.tsx)
- "use client" page with Studio tier FeatureLock.
- Generate section: investor dropdown, sequence type selector, generate button with loading state.
- Sequence display: email cards with day indicators, subject lines, body text, copy-to-clipboard, and status badges.
- Timing notes card with Fred's strategic advice.
- Supports investorId query param for direct linking from matches page.

### 5. Pipeline Page (app/dashboard/investor-targeting/pipeline/page.tsx)
- "use client" Kanban board with Studio tier FeatureLock.
- 7 color-coded columns: Identified, Contacted, Meeting, Due Diligence, Term Sheet, Committed, Passed.
- Pipeline cards show investor name/firm, match score badge, last contact, next action, notes preview.
- HTML5 drag-and-drop between columns, plus click-to-move dropdown.
- "Add Investor" modal to add from matched investors.
- Summary stats bar showing total and per-stage counts.
- Loading skeleton and empty state.
- Responsive: columns stack on mobile.

## Verification
- `npx tsc --noEmit` passes with zero errors.
- Migration contains 2 CREATE TABLE statements.
- No new npm dependencies.
- All 5 artifacts created as specified.

## Files created
| File | Purpose |
|------|---------|
| `lib/db/migrations/039_investor_pipeline.sql` | Outreach sequences and pipeline tables |
| `app/api/investors/generate-outreach/route.ts` | AI outreach generation endpoint |
| `app/api/investors/pipeline/route.ts` | Pipeline CRUD endpoint |
| `app/dashboard/investor-targeting/outreach/page.tsx` | Outreach sequence display page |
| `app/dashboard/investor-targeting/pipeline/page.tsx` | Kanban pipeline board page |
