# Database Audit Report
**Date**: 2026-03-05
**Auditor**: Database Checker Agent
**Scope**: All migrations, RLS policies, voice table references

---

## 1. Migration Inventory

### supabase/migrations/ (12 files)

| File | Tables/Changes |
|------|---------------|
| `20260212000001_create_next_steps.sql` | next_steps table |
| `20260212000002_add_channel_to_episodic_memory.sql` | Adds channel column to episodic memory |
| `20260212000003_create_document_repository.sql` | document_repository table |
| `20260212000004_add_enrichment_data_to_profiles.sql` | Adds enrichment columns to profiles |
| `20260216000001_community_data_layer.sql` | Community tables |
| `20260217000001_community_data_layer.sql` | Community tables (updated) |
| `20260225000001_profiles_rls.sql` | RLS policies for profiles |
| `20260225000003_red_flags_dedup.sql` | Red flags deduplication |
| `20260225000004_next_steps_indexes.sql` | Indexes for next_steps |
| `20260225000010_content_library.sql` | Content library tables |
| `20260225000020_service_marketplace.sql` | Service marketplace tables |
| `20260303000001_founder_goals.sql` | Founder goals table |

### lib/db/migrations/ (76 files)

Key tables created across these migrations:

| Migration | Tables Created |
|-----------|---------------|
| 002 | chat_checkins |
| 003 | reality_lens_analyses |
| 004 | investor_scores |
| 005 | documents |
| 006 | pitch_deck_reviews |
| 007 | unified_intelligence tables |
| 008 | ai_ratings, missing tables |
| **009_journey_tables** | **milestones, journey_events** (has broken RLS) |
| **009_voice_agent_tables** | **voice_agent_config, knowledge_base, escalation_rules, voice_calls** |
| 011 | Performance indexes |
| **012_notification_configs** | **notification_configs, notification_logs** (has broken RLS) |
| 013 | ab_promotion_audit, experiment_promotions |
| 014 | auth_users, voice_agent_fred_persona |
| 015 | video_calls |
| 016-039 | Various feature tables |
| **040_rls_hardening** | RLS policies for 27 tables + service_role bypass for 13 existing |
| 041-076 | Push subscriptions, coaching, sharing, email, community, etc. |

---

## 2. CRITICAL FINDING: RLS Fix Migrations DO NOT EXIST

The debug report (`DEBUG-DATABASE-REPORT.md`) references two fix migrations:
- `supabase/migrations/20260305000001_fix_journey_rls_policies.sql`
- `supabase/migrations/20260305000002_fix_notification_rls_policies.sql`

**These files DO NOT EXIST on disk.** They are referenced in the debug report as "deployed today" but were never actually created. The broken `current_setting()` RLS policies remain unfixed.

---

## 3. Broken `current_setting()` RLS Policies

### Files containing `current_setting('app.user_id'`:

**`lib/db/migrations/009_journey_tables.sql`** (7 occurrences):
- Line 128: milestones SELECT policy
- Line 132: milestones INSERT policy
- Line 136-137: milestones UPDATE policy (USING + WITH CHECK)
- Line 141: milestones DELETE policy
- Line 146: journey_events SELECT policy
- Line 150: journey_events INSERT policy

**`lib/db/migrations/012_notification_configs.sql`** (6 occurrences):
- Line 100: notification_configs SELECT policy
- Line 104: notification_configs INSERT policy
- Line 108-109: notification_configs UPDATE policy (USING + WITH CHECK)
- Line 113: notification_configs DELETE policy
- Line 118: notification_logs SELECT policy

**`lib/db/migrations/040_rls_hardening.sql`** (3 references in comments only):
- Line 1388: Comment noting milestones uses current_setting
- Line 1396: Comment noting journey_events uses current_setting
- Line 1404: Comment noting notification_configs uses current_setting
- This migration adds service_role bypass policies but does NOT fix the broken user policies

### Impact

All user-scoped operations on these 4 tables are **silently denied**:
- `milestones`: SELECT, INSERT, UPDATE, DELETE all blocked for users
- `journey_events`: SELECT, INSERT blocked for users
- `notification_configs`: SELECT, INSERT, UPDATE, DELETE blocked for users
- `notification_logs`: SELECT blocked for users

Service role access works (via 040_rls_hardening bypass), so server-side API routes using `createServiceClient()` are unaffected. Only client-side Supabase calls are broken.

### No TypeScript `current_setting` Usage

No `.ts` or `.tsx` files contain `current_setting` -- this pattern only exists in SQL migration files.

---

## 4. Voice Tables: Migration EXISTS but May Not Be Deployed

**Key finding**: `lib/db/migrations/009_voice_agent_tables.sql` DOES define all three tables:
- `voice_agent_config` (lines 5-31)
- `knowledge_base` (lines 34-59)
- `escalation_rules` (lines 62-82)
- `voice_calls` (lines 85-105)

Plus indexes, RLS policies, and a default config insert.

However, this migration is in `lib/db/migrations/` (manual/legacy location), NOT in `supabase/migrations/` (Supabase CLI managed). This means:
- It may have been run manually via Supabase Dashboard SQL editor
- It is NOT tracked by Supabase CLI migration history
- There is no guarantee it was ever deployed

The debug report's claim that "tables don't exist" may be correct if this migration was never executed against the production database.

---

## 5. Voice Agent Error Handling (lib/voice-agent.ts)

### Current Error Handling Assessment

| Function | Tables Queried | Error Handling | Fallback |
|----------|---------------|----------------|----------|
| `fetchAgentConfig()` (line 227) | voice_agent_config | try/catch, ignores PGRST116 (no rows) | Returns `null` |
| `fetchKnowledgeBase()` (line 262) | knowledge_base | try/catch | Returns `[]` |
| `fetchEscalationRules()` (line 296) | escalation_rules | try/catch | Returns `[]` |

**Verdict: Already defensive.** All three functions:
1. Wrap DB calls in try/catch
2. Log errors to console
3. Return safe fallbacks (null or empty array)
4. Have 5-minute caching to avoid hammering a missing table

The app will NOT crash if these tables don't exist. The Supabase JS client returns errors in `{ data, error }` format rather than throwing, and the code handles both paths. When tables are missing, the voice agent falls back to the hardcoded `getDefaultSystemPrompt()` (line 366).

**No code changes needed** -- error handling is already graceful.

---

## 6. Summary of Issues

### CRITICAL

| # | Issue | Status | Action Required |
|---|-------|--------|----------------|
| 1 | RLS fix migrations referenced in debug report DO NOT EXIST | UNFIXED | Create `20260305000001_fix_journey_rls_policies.sql` and `20260305000002_fix_notification_rls_policies.sql` |
| 2 | `current_setting('app.user_id')` broken in 009_journey_tables.sql | UNFIXED | Need migration to DROP and recreate policies with `auth.uid()::text` |
| 3 | `current_setting('app.user_id')` broken in 012_notification_configs.sql | UNFIXED | Need migration to DROP and recreate policies with `auth.uid()::text` |

### HIGH

| # | Issue | Status | Action Required |
|---|-------|--------|----------------|
| 4 | Voice tables may not be deployed (009_voice_agent_tables.sql in lib/db/ not supabase/) | UNKNOWN | Verify against production DB; if missing, create supabase migration |
| 5 | No call session/recording/transcript persistence tables | MISSING | Future migration needed |

### OK (No Action)

| # | Finding | Status |
|---|---------|--------|
| 6 | Voice agent error handling (lib/voice-agent.ts) | Already defensive with try/catch and safe fallbacks |
| 7 | No current_setting usage in TypeScript code | Clean |
| 8 | 040_rls_hardening service_role bypass policies | Correctly implemented |

---

## 7. Recommended Fix: Create Missing RLS Fix Migrations

The two migrations should DROP the broken policies and recreate them with `auth.uid()::text`.

### Migration 1: Fix Journey RLS (`20260305000001_fix_journey_rls_policies.sql`)

```sql
BEGIN;

-- Drop broken milestones policies
DROP POLICY IF EXISTS "Users can view own milestones" ON milestones;
DROP POLICY IF EXISTS "Users can create own milestones" ON milestones;
DROP POLICY IF EXISTS "Users can update own milestones" ON milestones;
DROP POLICY IF EXISTS "Users can delete own milestones" ON milestones;

-- Recreate with auth.uid()::text
CREATE POLICY "Users can view own milestones" ON milestones
  FOR SELECT USING (user_id = auth.uid()::text);
CREATE POLICY "Users can create own milestones" ON milestones
  FOR INSERT WITH CHECK (user_id = auth.uid()::text);
CREATE POLICY "Users can update own milestones" ON milestones
  FOR UPDATE USING (user_id = auth.uid()::text) WITH CHECK (user_id = auth.uid()::text);
CREATE POLICY "Users can delete own milestones" ON milestones
  FOR DELETE USING (user_id = auth.uid()::text);

-- Drop broken journey_events policies
DROP POLICY IF EXISTS "Users can view own journey events" ON journey_events;
DROP POLICY IF EXISTS "Users can create own journey events" ON journey_events;

-- Recreate with auth.uid()::text + add missing UPDATE/DELETE
CREATE POLICY "Users can view own journey events" ON journey_events
  FOR SELECT USING (user_id = auth.uid()::text);
CREATE POLICY "Users can create own journey events" ON journey_events
  FOR INSERT WITH CHECK (user_id = auth.uid()::text);
CREATE POLICY "Users can update own journey events" ON journey_events
  FOR UPDATE USING (user_id = auth.uid()::text) WITH CHECK (user_id = auth.uid()::text);
CREATE POLICY "Users can delete own journey events" ON journey_events
  FOR DELETE USING (user_id = auth.uid()::text);

COMMIT;
```

### Migration 2: Fix Notification RLS (`20260305000002_fix_notification_rls_policies.sql`)

```sql
BEGIN;

-- Drop broken notification_configs policies
DROP POLICY IF EXISTS "Users can view own notification configs" ON notification_configs;
DROP POLICY IF EXISTS "Users can create own notification configs" ON notification_configs;
DROP POLICY IF EXISTS "Users can update own notification configs" ON notification_configs;
DROP POLICY IF EXISTS "Users can delete own notification configs" ON notification_configs;

-- Recreate with auth.uid()::text
CREATE POLICY "Users can view own notification configs" ON notification_configs
  FOR SELECT USING (user_id = auth.uid()::text);
CREATE POLICY "Users can create own notification configs" ON notification_configs
  FOR INSERT WITH CHECK (user_id = auth.uid()::text);
CREATE POLICY "Users can update own notification configs" ON notification_configs
  FOR UPDATE USING (user_id = auth.uid()::text) WITH CHECK (user_id = auth.uid()::text);
CREATE POLICY "Users can delete own notification configs" ON notification_configs
  FOR DELETE USING (user_id = auth.uid()::text);

-- Drop broken notification_logs policy
DROP POLICY IF EXISTS "Users can view own notification logs" ON notification_logs;

-- Recreate with auth.uid()::text
CREATE POLICY "Users can view own notification logs" ON notification_logs
  FOR SELECT USING (user_id = auth.uid()::text);

COMMIT;
```

---

**End of Audit Report**
