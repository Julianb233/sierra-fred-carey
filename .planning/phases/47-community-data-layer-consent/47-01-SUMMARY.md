---
phase: 47-community-data-layer-consent
plan: 01
subsystem: database
tags: [sql, migration, rls, materialized-views, consent, community, supabase]

dependency-graph:
  requires:
    - "Phase 41 (migration 051 - communities, community_members, community_posts)"
    - "Migration 009 (milestones table - FK for social_feed_posts.milestone_id)"
    - "Migration 025 (investor_readiness_scores - used in benchmark materialized views)"
    - "Migration 032 (profiles table - used in benchmark materialized views)"
    - "Migration 037 (profiles.industry column - used in benchmark_industry_aggregates)"
  provides:
    - "14 new tables for community features (Phases 47-53)"
    - "3 ALTER columns on communities for subcommunity hierarchy"
    - "2 materialized views with consent-gated k-anonymous aggregates"
    - "50 RLS policies for all 14 new tables"
    - "Counter-sync triggers for social_feed_posts"
    - "Consent audit trigger on consent_preferences"
  affects:
    - "Phase 47-02 (consent UI and API routes)"
    - "Phase 48 (subcommunities, cohorts)"
    - "Phase 49 (social feed)"
    - "Phase 50 (founder directory and connections)"
    - "Phase 51 (expert listings)"
    - "Phase 52 (messaging)"
    - "Phase 53 (reputation and engagement)"

tech-stack:
  added: []
  patterns:
    - "Idempotent RLS policies via DO $$ BEGIN...EXCEPTION WHEN duplicate_object THEN NULL; END $$"
    - "Counter-sync triggers (reaction_count, comment_count) using INSERT/DELETE triggers"
    - "Consent-gated materialized views with k-anonymity threshold (HAVING COUNT >= 5)"
    - "REFRESH MATERIALIZED VIEW CONCURRENTLY via unique indexes on mat views"
    - "REPLICA IDENTITY FULL for Supabase Realtime on social_feed_posts and founder_messages"
    - "Consent audit logging via AFTER INSERT OR UPDATE trigger"

key-files:
  created:
    - "lib/db/migrations/054_community_data_layer.sql"
  modified: []

decisions:
  - decision: "Used migration number 054 instead of 053 (053 already taken by community_member_update_policy)"
    context: "Migration 053_community_member_update_policy.sql already exists"
    date: 2026-02-12
  - decision: "social_feed_posts.milestone_id is UUID type (matching milestones.id which is UUID)"
    context: "milestones.id is UUID PRIMARY KEY in migration 009, despite milestones.user_id being TEXT"
    date: 2026-02-12
  - decision: "Combined Task 1 and Task 2 into single commit since both contribute to one file"
    context: "Plan specifies Task 2 is PART OF the same migration file as Task 1"
    date: 2026-02-12

metrics:
  duration: "~3 minutes"
  completed: 2026-02-12
---

# Phase 47 Plan 01: Community Data Layer Migration Summary

**Single migration (054) creating 14 tables, 3 ALTER columns, 2 consent-gated materialized views, 50 RLS policies, counter-sync triggers, consent audit trigger, and Realtime preparation for Phases 47-53.**

## Tasks Completed

### Task 1: Create migration 054 -- tables, ALTER columns, indexes, constraints
- Created `lib/db/migrations/054_community_data_layer.sql` (971 lines)
- Section 1: 3 ALTER columns on communities (parent_community_id, is_sponsored, tier_required)
- Section 2: 14 new tables with correct columns, types, constraints, FKs, indexes, and updated_at triggers
- Section 3: Counter-sync triggers (sync_social_feed_reaction_count, sync_social_feed_comment_count)
- Section 4: Consent audit trigger (log_consent_change) fires on INSERT/UPDATE of consent_preferences
- Section 5: 2 materialized views (benchmark_stage_aggregates, benchmark_industry_aggregates) with:
  - INNER JOIN on consent_preferences (only consented users included)
  - HAVING COUNT(*) >= 5 (k-anonymity threshold)
  - LATERAL subquery for latest IRS score per user
  - Unique indexes for CONCURRENTLY refresh
  - refresh_benchmark_aggregates() function for cron scheduling
- Section 6: REPLICA IDENTITY FULL on social_feed_posts and founder_messages
- Section 8: COMMENT ON TABLE for all 14 new tables

### Task 2: Create RLS policies for all 14 new tables
- 50 RLS policies total across 14 tables
- All 14 tables have ENABLE ROW LEVEL SECURITY
- All 14 tables have service_role ALL policy
- consent_preferences strictly user-scoped (auth.uid() = user_id for all operations)
- consent_audit_log is read-only for users (trigger-only writes)
- founder_messages allows both sender and recipient to read
- cohorts visible only to active cohort members
- engagement_streaks and reputation_events are service-role-managed (write)
- All policies wrapped in idempotent DO $$ BEGIN...EXCEPTION blocks

## Verification Results

| Check | Expected | Actual | Status |
|-------|----------|--------|--------|
| CREATE TABLE count | 14 | 14 | PASS |
| RLS ENABLE count | 14 | 14 | PASS |
| CREATE POLICY count | >= 40 | 50 | PASS |
| consent_preferences refs | >= 4 | 20 | PASS |
| HAVING COUNT >= 5 | 2 views | 2 | PASS |
| ALTER communities cols | 3 | 3 | PASS |
| Service role policies | 14 | 14 | PASS |
| File line count | >= 500 | 971 | PASS |
| REPLICA IDENTITY FULL | 2 tables | 2 | PASS |
| Unique indexes on mat views | 2 | 2 | PASS |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Migration number changed from 053 to 054**
- **Found during:** Pre-execution analysis
- **Issue:** Migration 053 already taken by 053_community_member_update_policy.sql
- **Fix:** Used 054 as the migration number per user instruction
- **Files modified:** lib/db/migrations/054_community_data_layer.sql (created as 054 instead of 053)

**2. [Rule 1 - Bug] Verified milestones.id type for FK compatibility**
- **Found during:** Pre-execution analysis
- **Issue:** Plan warned milestones.id might be TEXT; actual type is UUID
- **Fix:** Used UUID for social_feed_posts.milestone_id (matches milestones.id UUID type)
- **Files modified:** lib/db/migrations/054_community_data_layer.sql

## Commits

| Hash | Message |
|------|---------|
| 200f583 | feat(47-01): create migration 054 community data layer schema |

## Next Phase Readiness

- Migration 054 provides the complete schema foundation for all community features (Phases 47-53)
- Phase 47-02 can proceed immediately to build consent UI and API routes
- No downstream schema changes should be needed -- only application code
- Materialized views will need a cron job (pg_cron or external) to call refresh_benchmark_aggregates()
