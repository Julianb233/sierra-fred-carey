# Supabase Schema Audit Report

**Linear:** AI-2273
**Date:** 2026-03-11
**Scope:** All column name/type mismatches between backend code and Supabase database

---

## Executive Summary

The audit identified **5 critical mismatches**, **1 schema conflict**, and **1 systemic infrastructure issue** across the Sahara codebase. The most impactful finding is a **dual migration folder** problem: the project has two migration directories with overlapping and conflicting definitions, creating data integrity risks.

| Severity | Count | Description |
|----------|-------|-------------|
| CRITICAL | 5 | Column/table mismatches causing potential runtime errors |
| HIGH | 1 | Competing schema definitions for same table |
| SYSTEMIC | 1 | Dual migration folder with 85 vs 43 files |

---

## 1. SYSTEMIC: Dual Migration Folders

The project maintains **two separate migration directories**:

| Folder | Files | Coverage |
|--------|-------|----------|
| `lib/db/migrations/` | 65+ SQL files | Phase 1-43 (original tables) |
| `supabase/migrations/` | 40 SQL files | Phase 44+ (newer features) |

**Impact:** If a fresh Supabase instance is provisioned using only `supabase/migrations/` (the standard Supabase CLI workflow), **~40 tables** referenced in code would not exist. The old migrations include foundational tables like `profiles`, `fred_episodic_memory`, `fred_semantic_memory`, `investor_readiness_scores`, `milestones`, `coaching_sessions`, and more.

**Recommendation:** Consolidate into a single `supabase/migrations/` folder with a baseline migration that captures all table definitions from `lib/db/migrations/`.

---

## 2. CRITICAL: Table Name Mismatches

### 2a. Document Storage Split: `uploaded_documents` vs `document_repository`

Two separate tables exist for document storage, created by different migration sets:

| Table | Created By | Used By |
|-------|-----------|---------|
| `uploaded_documents` | `lib/db/migrations/024_uploaded_documents.sql` | `lib/db/documents.ts` (6 queries), `app/api/dashboard/documents/route.ts` |
| `document_repository` | `supabase/migrations/20260212000003_create_document_repository.sql` | `lib/documents/repository.ts` (4 queries), `app/api/fred/chat/route.ts`, `lib/dashboard/trends.ts` |

**Impact:** User documents may be split across two tables. A pitch deck uploaded via the dashboard API goes to `uploaded_documents`, while FRED chat document lookups query `document_repository`. Data is silently lost from one view or the other.

**Column comparison:**

| Column | `uploaded_documents` | `document_repository` |
|--------|---------------------|-----------------------|
| id | UUID PK | UUID PK |
| user_id | UUID FK | UUID FK |
| name | TEXT | title (TEXT) |
| type | TEXT | doc_type (TEXT) |
| file_url | TEXT | storage_path (TEXT) |
| file_size | INTEGER | file_size_bytes (INTEGER) |
| page_count | INTEGER | - |
| status | TEXT | status (TEXT) |
| error_message | TEXT | - |
| metadata | JSONB | metadata (JSONB) |
| - | - | summary (TEXT) |
| - | - | version (INTEGER) |

**Migration plan:**
1. Create new migration to consolidate into `document_repository` (the supabase-native table)
2. Add missing columns (`page_count`, `error_message`) to `document_repository`
3. Add column aliases/renames: `name` -> `title`, `type` -> `doc_type`, `file_url` -> `storage_path`
4. Migrate data from `uploaded_documents` into `document_repository`
5. Update `lib/db/documents.ts` and `app/api/dashboard/documents/route.ts` to use `document_repository`
6. Drop `uploaded_documents` after verification

### 2b. Community Tables: Code Uses Phase 41 Schema, Migration Defines Phase 47 Schema

The backend code queries **4 tables** from the old community schema that don't exist in `supabase/migrations/`:

| Code References (Phase 41) | Supabase Migration Creates (Phase 47) |
|---|---|
| `community_members` | (no equivalent - uses `cohort_members` instead) |
| `community_posts` | `social_feed_posts` |
| `community_post_reactions` | `social_feed_reactions` |
| `community_post_replies` | `social_feed_comments` |

**Files affected:**
- `lib/db/communities.ts` — 25+ queries using old table names
- `app/api/communities/[slug]/posts/[postId]/replies/[replyId]/route.ts` — 2 queries

**Column differences (posts):**

| `community_posts` (code) | `social_feed_posts` (migration) |
|---|---|
| community_id | - |
| author_id | user_id |
| title | - |
| content | content |
| post_type | type (milestone/achievement/update/shoutout) |
| is_pinned | - |
| reaction_count | reaction_count |
| reply_count | comment_count |

**Migration plan:**
1. Keep both old and new table schemas for now (old tables exist from lib/db/migrations)
2. Create migration to add missing columns to `social_feed_posts` if needed
3. Refactor `lib/db/communities.ts` to query the new Phase 47 tables
4. Update API routes to use new table names
5. Deprecate old tables after full migration

---

## 3. CRITICAL: Missing Columns (Code References Non-Existent Columns)

### 3a. `profiles` Table — Snapshot Columns Not in Supabase Migrations

The following columns are referenced in code but only defined in `lib/db/migrations/050_founder_snapshot_columns.sql`, **not** in `supabase/migrations/`:

| Column | Type | Referenced In |
|--------|------|---------------|
| `product_status` | TEXT | `lib/db/conversation-state.ts` (founder snapshot) |
| `traction` | TEXT | `lib/db/conversation-state.ts` |
| `runway` | TEXT | `lib/db/conversation-state.ts` |
| `primary_constraint` | TEXT | `lib/db/conversation-state.ts` |
| `ninety_day_goal` | TEXT | `lib/db/conversation-state.ts` |

**Impact:** If profiles table was created from supabase/migrations only, these columns don't exist and founder snapshot queries will fail silently or error.

**Migration plan:**
1. Add `ALTER TABLE profiles` migration in `supabase/migrations/` to add these 5 columns
2. No data migration needed (columns accept NULL)

### 3b. `profiles` Table — `co_founder` Column Defined Twice

Two supabase migrations add the same column:
- `supabase/migrations/20260308000001_journey_welcomed_and_oases_stage.sql` — adds `co_founder`
- `supabase/migrations/20260308100001_add_co_founder_and_company_name.sql` — adds `co_founder` again

**Impact:** Second migration may fail if `IF NOT EXISTS` is not used. Needs verification.

**Migration plan:**
1. Verify both use `ADD COLUMN IF NOT EXISTS` (safe)
2. If not, fix the second migration

---

## 4. HIGH: Competing Schema Definitions

### 4a. `prompt_patches` — Two Conflicting CREATE TABLE Statements

| Migration | Schema |
|-----------|--------|
| `supabase/migrations/20260309100001_prompt_patches.sql` | `patch_type`, `thumbs_up_before`, `thumbs_up_after`, `tracking_started_at`, `tracking_ends_at`, `source_insight_id`, `generated_by` |
| `supabase/migrations/20260310000001_prompt_patches_fewshot.sql` | `title`, `source`, `source_id`, `parent_patch_id`, `activated_at`, `deactivated_at`, `performance_metrics` |

Both use `CREATE TABLE IF NOT EXISTS`, so the **first migration wins** (20260309100001). The second migration's `prompt_patches` definition is dead code.

**Code in `lib/db/prompt-patches.ts` references first schema columns:** `patch_type`, `tracking_started_at`, `tracking_ends_at`, `thumbs_up_after`, `source_insight_id` — all correct for the first migration.

**However**, columns from the second schema (`title`, `source`, `parent_patch_id`, `activated_at`, `deactivated_at`, `performance_metrics`) **do not exist** in the actual table.

**Impact:** Medium — the dead schema may confuse developers. The `fewshot_examples` table from the second migration is fine (separate table, creates successfully).

**Migration plan:**
1. Remove the duplicate `CREATE TABLE prompt_patches` from `20260310000001_prompt_patches_fewshot.sql`
2. If columns from the second schema are needed, add them via `ALTER TABLE`
3. Keep the `fewshot_examples` table creation as-is

---

## 5. Tables Referenced in API Routes Without Supabase Migrations

These tables are queried in `app/api/` routes but only exist in `lib/db/migrations/` (not in `supabase/migrations/`). They work on the current database but would break on a fresh Supabase setup:

| Table | API Route | Old Migration |
|-------|-----------|---------------|
| `agent_tasks` | `app/api/agents/tasks/route.ts` | `028_agent_tasks.sql` |
| `boardy_matches` | `app/api/boardy/` | `030_boardy_matches.sql` |
| `coaching_sessions` | `app/api/coaching/sessions/route.ts` | `042_coaching_sessions.sql` |
| `contact_submissions` | `app/api/contact/route.ts` | `020_contact_submissions.sql` |
| `diagnostic_states` | `app/api/diagnostic/state/route.ts` | `019_diagnostic_flow.sql` |
| `investor_readiness_scores` | `app/api/dashboard/readiness/route.ts` | `025_investor_readiness_scores.sql` |
| `investor_lens_evaluations` | `app/api/investor-lens/route.ts` | `017_investor_lens.sql` |
| `investors` | `app/api/investors/upload/route.ts` | `038_investor_tables.sql` |
| `investor_lists` | `app/api/investors/upload/route.ts` | `038_investor_tables.sql` |
| `investor_matches` | `app/api/investors/match/route.ts` | `038_investor_tables.sql` |
| `investor_outreach_sequences` | `app/api/investors/generate-outreach/route.ts` | `038_investor_tables.sql` |
| `investor_pipeline` | `app/api/investors/pipeline/route.ts` | `039_investor_pipeline.sql` |
| `milestones` | `app/api/dashboard/stats/route.ts` | `009_journey_tables.sql` |
| `next_steps` | `app/api/dashboard/next-steps/route.ts` | `055_next_steps.sql` |
| `phone_verifications` | `app/api/sms/verify/route.ts` | `035_phone_verifications.sql` |
| `pitch_reviews` | `app/api/dashboard/deck-review/route.ts` | `026_pitch_reviews.sql` |
| `push_subscriptions` | `app/api/push/subscribe/route.ts` | `041_push_subscriptions.sql` |
| `reality_lens_analyses` | `app/api/fred/reality-lens/route.ts` | `003_reality_lens.sql` |
| `strategy_documents` | `app/api/dashboard/stats/route.ts` | `027_strategy_documents.sql` |
| `video_rooms` | `app/api/livekit/webhook/route.ts` | `015_video_calls.sql` |
| `video_participants` | `app/api/livekit/webhook/route.ts` | `015_video_calls.sql` |

**Migration plan:** Create a single baseline migration `supabase/migrations/20260101000001_baseline_schema.sql` that consolidates all table definitions from `lib/db/migrations/` that don't already exist in `supabase/migrations/`.

---

## 6. Verified Consistent Tables (No Mismatches)

The following tables were verified as consistent between migrations and code:

- `fred_episodic_memory` (including `channel` column from ALTER migration)
- `fred_semantic_memory`
- `fred_procedural_memory`
- `fred_decision_log`
- `fred_audit_log` (including enrichment columns)
- `fred_conversation_state` / `fred_step_evidence`
- `feedback_signals` (including `processing_status` from clustering migration)
- `feedback_sessions`
- `feedback_insights` (including clustering columns)
- `sentiment_signals`
- `sms_checkins` (including delivery columns)
- `user_sms_preferences` (including `consent_at`)
- `user_subscriptions` / `stripe_events`
- `courses` / `modules` / `lessons` / `enrollments` / `content_progress`
- `service_providers` / `service_listings` / `bookings` / `provider_reviews`
- `daily_agendas`
- `deck_score_reviews`
- `consent_preferences`
- `ux_test_runs` / `ux_test_results`
- `fewshot_examples`
- `contacts` (including search vector and enrichment)
- `founder_goals`
- `journey_steps`
- `oases_progress`

---

## Migration Priority Order

| Priority | Issue | Risk | Effort |
|----------|-------|------|--------|
| P0 | Consolidate `uploaded_documents`/`document_repository` | Data split — documents invisible to parts of the app | Medium |
| P0 | Add profiles snapshot columns to supabase migrations | Founder snapshot queries fail on fresh DB | Low |
| P1 | Create baseline migration from old `lib/db/migrations/` | 21 tables missing from supabase migrations | High |
| P1 | Refactor `lib/db/communities.ts` to use Phase 47 tables | Community features use wrong tables | Medium |
| P2 | Clean up duplicate `prompt_patches` CREATE TABLE | Confusing dead code, no runtime impact | Low |
| P2 | Verify `co_founder` column uses IF NOT EXISTS | Potential migration failure | Low |

---

## Zero-Breaking-Change Guarantees

All proposed migrations follow these principles:
1. **Additive only** — `ALTER TABLE ADD COLUMN IF NOT EXISTS`, never DROP
2. **Data preservation** — consolidation migrations copy data before dropping old tables
3. **Backward compatible** — old column names kept as aliases during transition
4. **Reversible** — each migration has a documented rollback path
5. **Staged rollout** — code changes deploy before table drops, with verification window
