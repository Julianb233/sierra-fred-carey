# Phase 20: Investor Targeting, Outreach & Pipeline - Research

**Researched:** 2026-02-07
**Domain:** CSV upload, AI investor matching, outreach email sequences, CRM pipeline tracking
**Confidence:** HIGH

## Phase Overview

Phase 20 builds a complete investor relationship management workflow for Studio tier founders. It covers CSV upload of investor lists (both admin-managed partner lists and founder-uploaded contact lists), AI-powered matching of founders to relevant investors, personalized outreach email generation with follow-up sequences, and a CRM-lite pipeline view tracking conversations through fundraising stages.

### Requirements

| ID | Description | Tier |
|----|-------------|------|
| STUDIO-05 | Admin can upload partner investor lists via CSV | Studio |
| STUDIO-06 | Founders can upload their own investor contact lists via CSV | Studio |
| STUDIO-07 | AI matches founders to relevant investors based on stage, sector, check size | Studio |
| STUDIO-08 | AI generates personalized outreach email sequences | Studio |
| STUDIO-09 | Follow-up templates with timing recommendations | Studio |
| STUDIO-10 | CRM-lite pipeline view tracking investor conversations through stages | Studio |

### Success Criteria

1. Admin can upload partner investor lists via CSV; founders can upload their own contact lists
2. AI matches founders to relevant investors based on stage, sector, and check size
3. AI generates personalized outreach email sequences with follow-up templates and timing recommendations
4. CRM-lite pipeline view tracks investor conversations through stages (contacted, meeting, passed, committed)

## What Exists in the Codebase

### Fundraising Agent Tools (lib/agents/fundraising/tools.ts)

The fundraising agent already has four AI-powered tools that provide the intelligence backbone:

1. **investorResearch** -- Research investors by stage, sector, check size, geographic focus. Returns investor profiles with thesis fit analysis and intro strategies.

2. **outreachDraft** -- Draft personalized outreach emails given investor details, founder background, traction metrics, and warm/cold intro context.

3. **pipelineAnalysis** -- Analyze a fundraising pipeline array with investor names, stages (identified, outreach_sent, meeting_scheduled, term_sheet, passed), last contact dates, and notes.

4. **meetingPrep** -- Prepare for investor meetings by meeting type (first-call, partner-meeting, follow-up, due-diligence) with company metrics and previous interaction history.

These tools use `generateStructuredReliable()` for AI output and already have Fred's voice via `FRED_AGENT_VOICE`. They provide the AI backbone but currently have no persistent data layer -- they generate outputs as one-off agent task results.

### Upload Infrastructure (lib/storage/upload.ts)

The file upload module uses `@vercel/blob` for storage:
- `put()` and `del()` from `@vercel/blob`
- File type validation (currently PDF and PPTX only for pitch decks)
- File size validation
- `UploadResult` interface: `{ url, name, size, type, uploadedAt }`

This needs to be extended to support CSV files for investor list uploads.

### Investor Lens Pages (app/dashboard/investor-lens/)

The investor lens page provides AI-powered VC evaluation. It uses the Investor Lens framework from `lib/ai/frameworks/investor-lens.ts` which evaluates startups from an investor's perspective across stages (Pre-Seed, Seed, Series A).

### Investor Readiness Page (app/dashboard/investor-readiness/)

The investor readiness page scores a founder's fundraising readiness. Both investor pages are Pro tier features.

### Admin Infrastructure (app/admin/)

The admin panel has:
- Layout with auth gating (`isAdminSession()`)
- Navigation: Dashboard, Prompts, Config, A/B Tests
- Login page
- Components directory

The admin route structure supports adding new sub-pages like `/admin/investor-lists` for partner list uploads.

### Agent Task Output (lib/agents/types.ts)

Agent task results store output as `Record<string, unknown>` in the `agent_tasks` table. The fundraising agent's tool outputs (investor lists, outreach drafts, pipeline analyses) end up here but are not structured for CRM use.

## What Needs to Be Built

### 1. New Database Tables (6 tables)

**investors** -- Master investor database
```sql
CREATE TABLE investors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  firm TEXT,
  email TEXT,
  linkedin_url TEXT,
  website TEXT,
  stages TEXT[],           -- ['pre-seed', 'seed', 'series-a']
  sectors TEXT[],           -- ['fintech', 'saas', 'healthtech']
  check_size_min BIGINT,   -- in cents
  check_size_max BIGINT,
  geographic_focus TEXT[],
  thesis TEXT,              -- investment thesis description
  source TEXT NOT NULL,     -- 'admin_upload', 'founder_upload', 'ai_research'
  uploaded_by UUID REFERENCES auth.users(id),
  is_partner BOOLEAN DEFAULT FALSE,  -- admin-curated partner list
  metadata JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_investors_stages ON investors USING GIN(stages);
CREATE INDEX idx_investors_sectors ON investors USING GIN(sectors);
CREATE INDEX idx_investors_source ON investors(source);
```

**investor_uploads** -- Track CSV upload jobs
```sql
CREATE TABLE investor_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  row_count INT,
  processed_count INT DEFAULT 0,
  failed_count INT DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, processing, complete, failed
  errors JSONB DEFAULT '[]'::JSONB,
  is_admin_upload BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);
```

**investor_matches** -- AI-generated founder-investor matches
```sql
CREATE TABLE investor_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  investor_id UUID NOT NULL REFERENCES investors(id) ON DELETE CASCADE,
  match_score REAL NOT NULL,  -- 0-1
  match_reasons JSONB,        -- { stage_fit: true, sector_match: true, ... }
  status TEXT DEFAULT 'suggested', -- suggested, accepted, rejected
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, investor_id)
);
```

**outreach_sequences** -- Email outreach sequences
```sql
CREATE TABLE outreach_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  investor_id UUID NOT NULL REFERENCES investors(id) ON DELETE CASCADE,
  match_id UUID REFERENCES investor_matches(id),
  emails JSONB NOT NULL,      -- Array of { step: 1, subject, body, send_after_days, status }
  status TEXT DEFAULT 'draft', -- draft, active, paused, completed
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**pipeline_entries** -- CRM pipeline tracking
```sql
CREATE TABLE pipeline_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  investor_id UUID NOT NULL REFERENCES investors(id) ON DELETE CASCADE,
  stage TEXT NOT NULL DEFAULT 'identified', -- identified, contacted, meeting, due_diligence, term_sheet, committed, passed
  notes TEXT,
  next_action TEXT,
  next_action_date DATE,
  last_contact_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, investor_id)
);
```

**pipeline_activity** -- Activity log for pipeline entries
```sql
CREATE TABLE pipeline_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_entry_id UUID NOT NULL REFERENCES pipeline_entries(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,       -- 'stage_change', 'note_added', 'email_sent', 'meeting_scheduled'
  from_stage TEXT,
  to_stage TEXT,
  details JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 2. CSV Parser (lib/investors/csv-parser.ts)

A CSV parsing module for investor list uploads:

**Expected CSV columns:**
- name (required)
- firm
- email
- linkedin_url
- website
- stages (comma-separated)
- sectors (comma-separated)
- check_size_min
- check_size_max
- geographic_focus (comma-separated)
- thesis

**Validation:**
- Name is required
- Email format validation
- Stage values must match allowed set
- Check size must be numeric

**Output:** Array of validated investor records ready for database insertion.

### 3. AI Matching Algorithm (lib/investors/matching.ts)

Matches founders to investors using profile data:

**Matching criteria:**
- **Stage match:** Founder's current stage vs investor's stage preferences (weight: 35%)
- **Sector match:** Founder's industry vs investor's sector focus (weight: 30%)
- **Check size match:** Founder's raise target vs investor's check size range (weight: 20%)
- **Geographic match:** Founder's location vs investor's geographic focus (weight: 15%)

**Approach:**
1. Filter investors by hard requirements (must match stage)
2. Score remaining investors on multi-factor criteria
3. Rank by composite score
4. Return top N matches with explanations

**AI enhancement:** Use the fundraising agent's `investorResearch` tool for supplementary analysis on top matches.

### 4. Outreach Sequence UI (app/dashboard/investor-outreach/page.tsx)

Interface for managing outreach email sequences:

- Select an investor from matches
- AI generates a multi-email sequence (initial, follow-up 1, follow-up 2, break-up email)
- Each email shows: subject, body preview, send timing, status
- Edit/approve individual emails before "activating" the sequence
- Track: draft, sent, replied, no-reply

Uses the fundraising agent's `outreachDraft` tool for email generation.

### 5. Pipeline Kanban (app/dashboard/investor-pipeline/page.tsx)

A CRM-lite Kanban board for tracking investor conversations:

**Columns (stages):**
1. Identified -- initial list
2. Contacted -- outreach sent
3. Meeting -- scheduled or completed meeting
4. Due Diligence -- investor actively evaluating
5. Term Sheet -- offer received
6. Committed -- deal closed
7. Passed -- investor declined

**Card display:** Investor name, firm, last contact, next action, notes preview
**Drag-and-drop:** Move cards between columns to update stage
**Activity log:** Click a card to see full history of interactions

### 6. API Endpoints

**POST /api/investors/upload** -- Upload CSV file (admin or founder)
**GET /api/investors** -- List investors (filtered by source, stage, sector)
**GET /api/investors/matches** -- Get AI-generated matches for current user
**POST /api/investors/matches/generate** -- Trigger AI matching
**GET /api/outreach/[investorId]** -- Get outreach sequence for an investor
**POST /api/outreach/generate** -- Generate outreach sequence via AI
**PATCH /api/outreach/[id]** -- Update sequence (edit emails, change status)
**GET /api/pipeline** -- Get pipeline entries for current user
**PATCH /api/pipeline/[id]** -- Update pipeline entry (stage change, notes)
**GET /api/pipeline/[id]/activity** -- Get activity log for a pipeline entry

**Admin-only:**
**POST /api/admin/investors/upload** -- Upload partner investor list

### 7. Upload Extension (lib/storage/upload.ts)

Extend the existing upload module to support CSV files:
- Add `text/csv` and `.csv` to allowed types
- Add CSV-specific size limit (e.g., 5MB)
- Return upload URL for processing

## Integration Points

| Component | Integrates With | How |
|-----------|----------------|-----|
| CSV parser | upload.ts | Extended file validation + blob storage |
| Matching algorithm | Founder profile (profiles table + semantic memory) | Reads founder stage, industry, raise target |
| Matching algorithm | investors table | Queries investors by criteria |
| Outreach generation | fundraising/tools.ts outreachDraft | Uses existing AI tool for email generation |
| Pipeline | pipeline_entries + pipeline_activity tables | CRUD operations |
| Admin upload | admin auth (isAdminSession) | Admin-only route |
| All pages | FeatureLock (Studio tier) | Tier gating |
| Dashboard nav | constants.ts | New nav entries |

## Suggested Plan Structure

### Plan 20-01: Investor Upload + AI Matching

**Scope:** CSV upload (admin + founder), investor database, AI matching

1. Create database migrations (investors, investor_uploads, investor_matches tables)
2. Extend upload.ts for CSV support
3. Create CSV parser module (`lib/investors/csv-parser.ts`)
4. Create investor DB access layer (`lib/db/investors.ts`)
5. Create AI matching algorithm (`lib/investors/matching.ts`)
6. Create upload API routes (POST /api/investors/upload, POST /api/admin/investors/upload)
7. Create matching API routes (GET /api/investors/matches, POST /api/investors/matches/generate)
8. Create investor list page (`app/dashboard/investor-list/page.tsx`)
9. Add admin upload page (`app/admin/investor-lists/page.tsx`)
10. Tests for CSV parser and matching algorithm

### Plan 20-02: Outreach Sequences + Pipeline Tracking

**Scope:** Email generation, sequence management, CRM pipeline

1. Create database migrations (outreach_sequences, pipeline_entries, pipeline_activity tables)
2. Create outreach DB access layer (`lib/db/outreach.ts`)
3. Create pipeline DB access layer (`lib/db/pipeline.ts`)
4. Create outreach API routes (generate, CRUD)
5. Create pipeline API routes (CRUD, activity log)
6. Create outreach sequence page (`app/dashboard/investor-outreach/page.tsx`)
7. Create pipeline Kanban page (`app/dashboard/investor-pipeline/page.tsx`)
8. Create Kanban column and card components
9. Wire outreach generation to fundraising agent's outreachDraft tool
10. Add dashboard navigation entries
11. Tests for outreach and pipeline APIs

## Key Files to Reference

| File | Purpose | Lines of Interest |
|------|---------|-------------------|
| `lib/agents/fundraising/tools.ts` | investorResearch, outreachDraft, pipelineAnalysis, meetingPrep tools | Full file |
| `lib/storage/upload.ts` | File upload with Vercel Blob (extend for CSV) | Full file |
| `lib/db/agent-tasks.ts` | CRUD pattern for Supabase operations | Full file |
| `app/admin/layout.tsx` | Admin auth gating pattern | 1-60 |
| `app/dashboard/investor-lens/page.tsx` | Existing investor evaluation UI | Full file |
| `app/dashboard/investor-readiness/page.tsx` | Investor readiness scoring UI | Full file |
| `lib/agents/fred-agent-voice.ts` | Voice preamble for Fred-voiced outputs | Full file |
| `lib/agents/fundraising/prompts.ts` | Fundraising agent system prompt | Full file |
| `lib/constants.ts` | DASHBOARD_NAV, UserTier.STUDIO | 135-151 |
| `lib/ai/frameworks/investor-lens.ts` | Investor evaluation framework | Full file |

## Open Questions

1. **Partner list visibility:** Should admin-uploaded partner investor lists be visible to all Studio users, or per-user? Recommendation: All Studio users see the partner list. Founders only see their own uploaded lists + the shared partner list.

2. **Outreach execution:** Should the system actually send emails, or just generate drafts? Recommendation: Draft-only in this phase. Actual sending requires email deliverability infrastructure (SPF, DKIM, warm-up) which is a separate concern. Users copy drafts to their own email client.

3. **Duplicate handling:** How to handle the same investor appearing in both admin and founder uploads? Recommendation: Deduplicate by (name + firm) combination. Show the most complete record. Track both sources in metadata.

4. **Pipeline data source:** Should the pipeline auto-populate from outreach sequence status, or be manually managed? Recommendation: Auto-create a pipeline entry when an outreach sequence is activated. Allow manual stage changes thereafter.

5. **Data privacy:** Investor contact information (emails) may be sensitive. Should we encrypt PII at rest? Recommendation: Yes, encrypt email and linkedin_url columns. Use Supabase Column Level Security or application-level encryption.

## Sources

### Primary (HIGH confidence)
- `lib/agents/fundraising/tools.ts` -- All four fundraising tools (direct reading)
- `lib/storage/upload.ts` -- Upload infrastructure (direct reading)
- `lib/agents/types.ts` -- Agent type system (direct reading)
- `lib/db/agent-tasks.ts` -- DB access patterns (direct reading)
- `app/admin/layout.tsx` -- Admin auth gating (direct reading)

### Secondary (MEDIUM confidence)
- `.planning/ROADMAP.md` -- Phase scope and success criteria
- `lib/ai/frameworks/investor-lens.ts` -- Investor evaluation framework (directory listing)

**Research date:** 2026-02-07
**Valid until:** Next fundraising agent or admin system refactor
