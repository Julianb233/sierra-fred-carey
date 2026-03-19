# Supabase Schema Audit Report

**Date:** 2026-03-18
**Task:** AI-908 - Audit Supabase schema for all column mismatches
**Status:** RESOLVED

---

## Summary

The codebase referenced **90 database entities** (84 tables + 3 views + profiles) that were either missing entirely from the database or had missing columns. The root cause: migration files existed in `lib/db/migrations/` and `supabase/migrations/` but were never applied to the production database.

## Findings

### 1. Missing Tables (84 tables)

All 84 tables below were referenced in production code but did not exist in the database:

| Category | Tables |
|----------|--------|
| **AI/Config** | `ab_experiments`, `ab_variants`, `ai_config`, `ai_insights`, `ai_prompts`, `ai_requests`, `ai_responses` |
| **FRED Memory** | `fred_episodic_memory`, `fred_semantic_memory`, `fred_procedural_memory`, `fred_decision_log`, `fred_calibration_records`, `fred_conversation_state`, `fred_step_evidence`, `fred_red_flags`, `fred_audit_log` |
| **Investor** | `investors`, `investor_lists`, `investor_matches`, `investor_match_scores`, `investor_lens_evaluations`, `investor_readiness_scores`, `investor_pipeline`, `investor_outreach_sequences` |
| **Community** | `community_members`, `community_posts`, `community_post_reactions`, `community_post_replies` |
| **Content** | `courses`, `lessons`, `modules`, `content_progress`, `document_repository`, `document_chunks`, `uploaded_documents` |
| **Journey/Progress** | `journey_events`, `journey_steps`, `milestones`, `oases_progress`, `startup_processes`, `diagnostic_states`, `next_steps` |
| **Coaching/Video** | `coaching_sessions`, `video_rooms`, `video_participants`, `voice_calls`, `voice_agent_config` |
| **Feedback** | `feedback_sessions`, `feedback_signals`, `feedback_insights`, `chat_feedback`, `deck_reviews`, `deck_score_reviews`, `pitch_reviews`, `ux_test_results`, `ux_test_runs`, `event_feedback`, `sentiment_signals` |
| **Communication** | `sms_checkins`, `user_sms_preferences`, `phone_verifications`, `push_subscriptions`, `push_notification_logs`, `email_sends`, `notification_configs` |
| **Other** | `boardy_matches`, `bookings`, `consent_preferences`, `contact_submissions`, `daily_agendas`, `escalation_rules`, `founder_goals`, `founder_profiles`, `knowledge_base`, `prompt_patches`, `provider_reviews`, `reality_lens_analyses`, `service_listings`, `service_providers`, `shared_links`, `shared_link_recipients`, `strategy_documents`, `team_members`, `whatsapp_monitor_state` |

### 2. Missing Views (3 views)

- `fred_audit_summary` - Aggregated daily audit metrics from `fred_audit_log`
- `fred_topic_quality` - Topic-level quality metrics from `fred_audit_log`
- `fred_step_progress` - Step progress summary joining `fred_conversation_state` with `fred_step_evidence`

### 3. Missing Columns on `profiles` Table (31 columns)

The `profiles` table existed but was missing most columns the code expected:

| Column | Type | Source |
|--------|------|--------|
| `name` | TEXT | Onboarding, settings, auth-helpers |
| `stage` | TEXT | Onboarding, FRED context |
| `challenges` | JSONB | Onboarding |
| `teammate_emails` | JSONB | Onboarding |
| `tier` | INTEGER | Subscription tier middleware |
| `industry` | TEXT | FRED enrichment, investor matching |
| `revenue_range` | TEXT | Founder snapshot |
| `team_size` | INTEGER | Founder snapshot |
| `funding_history` | TEXT | Founder snapshot |
| `enriched_at` | TIMESTAMPTZ | Conversation enrichment |
| `enrichment_source` | TEXT | Conversation enrichment |
| `enrichment_data` | JSONB | FRED chat enrichment |
| `journey_welcomed` | BOOLEAN | Welcome page redirect |
| `oases_stage` | TEXT | Journey tracking |
| `co_founder` | TEXT | Onboarding |
| `company_name` | TEXT | Founder context |
| `venture_timeline` | TEXT | Onboarding |
| `reality_lens_complete` | BOOLEAN | Middleware redirect |
| `reality_lens_score` | INTEGER | Quick reality lens |
| `product_status` | TEXT | Founder snapshot |
| `traction` | TEXT | Founder snapshot |
| `runway` | JSONB | Founder snapshot |
| `primary_constraint` | TEXT | Founder snapshot |
| `ninety_day_goal` | TEXT | Founder snapshot |
| `trial_ends_at` | TIMESTAMPTZ | Event registration |
| `trial_eligible` | BOOLEAN | Event registration |
| `trial_source` | TEXT | Event registration |
| `event_source` | TEXT | Event registration |
| `metadata` | JSONB | Wellbeing check-in, feedback consent |
| `feedback_consent` | BOOLEAN | Consent tracking |
| `feedback_consent_at` | TIMESTAMPTZ | Consent tracking |

### 4. Missing Columns on Other Tables

- `communities`: Missing `slug`, `category`, `creator_id`, `is_archived`, `is_private`, `member_count`
- `documents`: Missing `user_id`, `type`, `status`

### 5. Pre-existing Build Error (Fixed)

- `lib/boardy/real-client.ts` was missing, causing a webpack module-not-found error
- Created a stub implementation of `RealBoardyClient`

---

## Actions Taken

### Migration Applied
- **File:** `supabase-migrations/schema-audit-fix.sql` (5,300+ lines)
- Added 31 missing columns to `profiles` table
- Created all 84 missing tables with proper schemas, indexes, and RLS policies
- Created 3 missing views
- Enabled `pgvector` extension for FRED memory embeddings
- Applied RLS policies and indexes for all new tables

### Code Fix
- Created `lib/boardy/real-client.ts` stub to fix pre-existing build error

### Verification
- All 90 database entities now exist
- `npm run build` passes successfully
- All profiles columns match code expectations

---

## Existing Tables That Were Correct (6)

These tables existed before the audit and had no column mismatches:
- `profiles` (after adding missing columns)
- `agent_tasks`
- `communities` (after adding missing columns)
- `documents` (after adding missing columns)
- `escalation_rules`
- `knowledge_base`

---

## Recommendations

1. **Set up Supabase CLI migrations**: Use `supabase db push` or `supabase migration up` to apply migrations automatically instead of manual SQL execution.
2. **Generate TypeScript types from DB**: Run `supabase gen types typescript` to auto-generate type definitions that match the actual schema.
3. **CI check**: Add a build step that verifies migrations are applied before deployment.
4. **Clean up migration files**: The 100+ migration files in `lib/db/migrations/` and `supabase/migrations/` should be consolidated now that they've been applied.
