# Sahara Code References Audit - 2026-04-22

Scope: `/opt/agency-workspace/sahara/` (excluding node_modules, .next, .vercel, coverage, dist, .git, supabase_old, _data, .planning, .claude).

Sources for canonical schema list:
- `supabase/migrations/*.sql` (51 files)
- `lib/db/migrations/*.sql` (65 files)
- `supabase-migrations/*.sql` (1 file)
- `lib/db/*.ts` (DAO files - no Drizzle `pgTable()` found; all access is Supabase client)

Grep patterns applied per table: `supabase.from('TABLE'`, `supabase.from("TABLE"`, `FROM TABLE` (SQL), `INSERT INTO TABLE`, `UPDATE TABLE`, `/rest/v1/TABLE`, `pgTable('TABLE'`, `from 'TABLE'`. File types scanned: .ts, .tsx, .js, .jsx, .mjs, .cjs, .sql, .json, .md.

## Executive Summary

- **122** total tables in canonical list (de-duplicated from migrations)
- **64** LIVE (referenced under `app/`)
- **38** LIB-ONLY (only referenced under `lib/` or workers/hooks/middleware)
- **3** MIGRATIONS-ONLY (schema shipped, no code references outside migrations/docs)
- **0** TESTS-ONLY (only referenced under `tests/` or `e2e*`)
- **1** SCRIPTS-ONLY (only referenced under `scripts/`)
- **16** ZERO-REFS (grep found nothing anywhere)

- **9** views total. LIVE: 2. LIB-ONLY: 1. MIGRATIONS-ONLY: 1. ZERO-REFS: 5.
- **27** user-defined functions (most are Postgres triggers fired by DB, not RPC'd from code).

## Ghost Imports

No `@/lib/db/schema/*` imports found. There is no Drizzle `pgTable` schema directory in this repo - all DB access is via `@supabase/supabase-js` client, and `lib/db/*.ts` files are DAO wrappers, not schema definitions. No ghost imports detected.

---

## Tables - Ordered by Most-Removable First

### ZERO-REFS (16 tables)

#### `chat_messages` - 0 file(s)
  (no references)

#### `cohorts` - 0 file(s)
  (no references)

#### `community_profiles` - 0 file(s)
  (no references)

#### `engagement_streaks` - 0 file(s)
  (no references)

#### `enrollments` - 0 file(s)
  (no references)

#### `expert_listings` - 0 file(s)
  (no references)

#### `founder_connections` - 0 file(s)
  (no references)

#### `founder_messages` - 0 file(s)
  (no references)

#### `investor_scores` - 0 file(s)
  (no references)

#### `pitch_deck_reviews` - 0 file(s)
  (no references)

#### `reputation_events` - 0 file(s)
  (no references)

#### `social_feed_comments` - 0 file(s)
  (no references)

#### `social_feed_reactions` - 0 file(s)
  (no references)

#### `startup_process_validations` - 0 file(s)
  (no references)

#### `subcommunity_sponsors` - 0 file(s)
  (no references)

#### `video_chat_messages` - 0 file(s)
  (no references)

### MIGRATIONS-ONLY (3 tables)

#### `cohort_members` - 3 file(s)
  - `lib/db/migrations/054_community_data_layer.sql`
  - `supabase/migrations/20260216000001_community_data_layer.sql`
  - `supabase/migrations/20260217000001_community_data_layer.sql`

#### `consent_audit_log` - 3 file(s)
  - `lib/db/migrations/054_community_data_layer.sql`
  - `supabase/migrations/20260216000001_community_data_layer.sql`
  - `supabase/migrations/20260217000001_community_data_layer.sql`

#### `social_feed_posts` - 3 file(s)
  - `lib/db/migrations/054_community_data_layer.sql`
  - `supabase/migrations/20260216000001_community_data_layer.sql`
  - `supabase/migrations/20260217000001_community_data_layer.sql`

### SCRIPTS-ONLY (1 tables)

#### `contacts` - 3 file(s)
  - `scripts/embed-contacts-pinecone.mjs`
  - `scripts/enrich-contacts-deep.mjs`
  - `scripts/sync-google-contacts.mjs`

### LIB-ONLY (38 tables)

#### `ab_promotion_audit_log` - 2 file(s)
  - `lib/ab-testing/auto-promotion.ts`
  - `scripts/test-auto-promotion.ts`

#### `bookings` - 1 file(s)
  - `lib/db/marketplace.ts`

#### `communities` - 2 file(s)
  - `lib/db/communities.ts`
  - `lib/db/migrations/051_founder_communities.sql`

#### `community_members` - 3 file(s)
  - `lib/db/communities.ts`
  - `lib/db/migrations/051_founder_communities.sql`
  - `lib/db/migrations/053_community_member_update_policy.sql`

#### `community_post_reactions` - 1 file(s)
  - `lib/db/communities.ts`

#### `community_posts` - 2 file(s)
  - `lib/db/communities.ts`
  - `lib/db/migrations/051_founder_communities.sql`

#### `consent_preferences` - 1 file(s)
  - `lib/db/consent.ts`

#### `content_progress` - 1 file(s)
  - `lib/db/content.ts`

#### `daily_agendas` - 1 file(s)
  - `lib/guidance/daily-agenda.ts`

#### `document_chunks` - 3 file(s)
  - `lib/db/documents.ts`
  - `lib/documents/process-document.ts`
  - `lib/documents/repository.ts`

#### `experiment_promotions` - 6 file(s)
  - `docs/AUTO_PROMOTION_IMPLEMENTATION.md`
  - `lib/db/migrations/013_experiment_promotions.sql`
  - `lib/experiment-promoter.ts`
  - `lib/experiments/auto-promotion-engine.ts`
  - `lib/monitoring/auto-promotion.ts`
  - ... and 1 more

#### `feedback_digest_preferences` - 1 file(s)
  - `lib/rlhf/close-the-loop-digest.ts`

#### `feedback_improvements` - 1 file(s)
  - `lib/rlhf/improvement-tracker.ts`

#### `feedback_sessions` - 4 file(s)
  - `lib/db/feedback-admin.ts`
  - `lib/db/feedback.ts`
  - `lib/feedback/experiment-metrics.ts`
  - `supabase/migrations/20260309000001_feedback_variant_link.sql`

#### `fewshot_examples` - 1 file(s)
  - `lib/rlhf/few-shot-store.ts`

#### `founder_goals` - 1 file(s)
  - `lib/goals/goal-service.ts`

#### `fred_calibration_records` - 2 file(s)
  - `lib/db/migrations/023_fred_calibration_schema.sql`
  - `lib/fred/scoring/calibration.ts`

#### `fred_conversation_state` - 3 file(s)
  - `lib/db/conversation-state.ts`
  - `lib/db/migrations/049_conversation_state.sql`
  - `lib/fred/context-builder.ts`

#### `fred_procedural_memory` - 2 file(s)
  - `lib/db/fred-memory.ts`
  - `lib/db/migrations/022_fred_procedures_seed.sql`

#### `fred_red_flags` - 2 file(s)
  - `lib/db/red-flags.ts`
  - `lib/email/digest/data.ts`

#### `fred_step_evidence` - 3 file(s)
  - `lib/dashboard/command-center.ts`
  - `lib/db/conversation-state.ts`
  - `lib/db/migrations/049_conversation_state.sql`

#### `investor_match_scores` - 1 file(s)
  - `lib/investors/matching.ts`

#### `journey_steps` - 3 file(s)
  - `lib/oases/progress.ts`
  - `supabase/migrations/20260312000002_journey_steps.sql`
  - `supabase/migrations/20260312000002_journey_steps_table.sql`

#### `lessons` - 1 file(s)
  - `lib/db/content.ts`

#### `oases_progress` - 1 file(s)
  - `lib/oases/progress.ts`

#### `provider_reviews` - 1 file(s)
  - `lib/db/marketplace.ts`

#### `sentiment_signals` - 2 file(s)
  - `lib/db/sentiment-admin.ts`
  - `lib/db/sentiment-log.ts`

#### `service_listings` - 1 file(s)
  - `lib/db/marketplace.ts`

#### `service_providers` - 1 file(s)
  - `lib/db/marketplace.ts`

#### `shared_link_recipients` - 1 file(s)
  - `lib/sharing/index.ts`

#### `shared_links` - 2 file(s)
  - `lib/db/migrations/045_team_scoped_shares.sql`
  - `lib/sharing/index.ts`

#### `stripe_events` - 6 file(s)
  - `docs/STRIPE_ARCHITECTURE.md`
  - `docs/STRIPE_TESTING.md`
  - `INTEGRATION_COMPLETE.md`
  - `lib/db/subscriptions.ts`
  - `QUICK_START.md`
  - ... and 1 more

#### `team_members` - 3 file(s)
  - `lib/db/migrations/045_team_scoped_shares.sql`
  - `lib/sharing/index.ts`
  - `lib/sharing/teams.ts`

#### `user_sms_preferences` - 2 file(s)
  - `lib/db/sms.ts`
  - `lib/sms/daily-guidance.ts`

#### `users` - 1 file(s)
  - `examples/slack-alerts-integration.ts`

#### `ux_test_results` - 1 file(s)
  - `lib/db/ux-audit.ts`

#### `ux_test_runs` - 2 file(s)
  - `lib/db/ux-audit.ts`
  - `scripts/apply-audit-migration.mjs`

#### `whatsapp_monitor_state` - 2 file(s)
  - `docs/runbooks/whatsapp-monitor.md`
  - `trigger/sahara-whatsapp-monitor.ts`

### LIVE (64 tables)

#### `ab_experiments` - 23 file(s)
  - `app/api/admin/ab-tests/[id]/end/route.ts`
  - `app/api/admin/ab-tests/[id]/promote/route.ts`
  - `app/api/admin/ab-tests/[id]/route.ts`
  - `app/api/admin/ab-tests/[id]/traffic/route.ts`
  - `app/api/admin/ab-tests/route.ts`
  - ... and 18 more

#### `ab_variants` - 20 file(s)
  - `app/api/admin/ab-tests/[id]/end/route.ts`
  - `app/api/admin/ab-tests/[id]/promote/route.ts`
  - `app/api/admin/ab-tests/[id]/route.ts`
  - `app/api/admin/ab-tests/[id]/traffic/route.ts`
  - `app/api/admin/ab-tests/route.ts`
  - ... and 15 more

#### `agent_tasks` - 5 file(s)
  - `app/api/admin/analytics/engagement/route.ts`
  - `app/api/dashboard/stats/route.ts`
  - `lib/db/agent-tasks.ts`
  - `lib/email/digest/data.ts`
  - `lib/inbox/aggregator.ts`

#### `ai_config` - 11 file(s)
  - `app/api/admin/config/route.ts`
  - `app/api/admin/dashboard/route.ts`
  - `app/api/setup-db/route.ts`
  - `lib/ai/config-loader.ts`
  - `lib/db/migrations/007_unified_intelligence.sql`
  - ... and 6 more

#### `ai_insights` - 9 file(s)
  - `app/api/insights/top-insights/route.ts`
  - `app/api/insights/trends/route.ts`
  - `app/api/journey/insights/route.ts`
  - `app/api/journey/stats/route.ts`
  - `lib/ai/insight-extractor.ts`
  - ... and 4 more

#### `ai_prompts` - 9 file(s)
  - `app/api/admin/ab-tests/[id]/route.ts`
  - `app/api/admin/dashboard/route.ts`
  - `app/api/admin/prompts/activate/route.ts`
  - `app/api/admin/prompts/route.ts`
  - `app/api/admin/prompts/test/route.ts`
  - ... and 4 more

#### `ai_ratings` - 6 file(s)
  - `app/api/admin/dashboard/route.ts`
  - `app/api/admin/training/metrics/route.ts`
  - `app/api/admin/training/ratings/route.ts`
  - `app/api/admin/training/requests/[id]/route.ts`
  - `app/api/ai/rating/route.ts`
  - ... and 1 more

#### `ai_requests` - 17 file(s)
  - `app/api/admin/training/metrics/route.ts`
  - `app/api/admin/training/requests/[id]/route.ts`
  - `app/api/admin/training/requests/route.ts`
  - `app/api/fred/chat/route.ts`
  - `app/api/insights/analytics/route.ts`
  - ... and 12 more

#### `ai_responses` - 9 file(s)
  - `app/api/admin/training/metrics/route.ts`
  - `app/api/admin/training/requests/[id]/route.ts`
  - `app/api/ai/rating/route.ts`
  - `lib/ai/client.ts`
  - `lib/ai/logging.ts`
  - ... and 4 more

#### `boardy_matches` - 3 file(s)
  - `app/api/boardy/intro-prep/route.ts`
  - `lib/db/boardy.ts`
  - `lib/fred/context-builder.ts`

#### `bug_reports` - 1 file(s)
  - `app/api/bug-report/route.ts`

#### `check_ins` - 1 file(s)
  - `app/api/check-ins/route.ts`

#### `coaching_sessions` - 5 file(s)
  - `app/api/coaching/participants/route.ts`
  - `app/api/coaching/sessions/route.ts`
  - `app/api/fred/call/summary/route.ts`
  - `app/api/livekit/webhook/route.ts`
  - `lib/livekit/cleanup.ts`

#### `community_post_replies` - 2 file(s)
  - `app/api/communities/[slug]/posts/[postId]/replies/[replyId]/route.ts`
  - `lib/db/communities.ts`

#### `contact_submissions` - 4 file(s)
  - `app/api/contact/route.ts`
  - `app/api/onboard/invite/route.ts`
  - `app/api/onboard/route.ts`
  - `components/growth/referral-widget.tsx`

#### `courses` - 2 file(s)
  - `app/api/content/[courseId]/lessons/[lessonId]/playback-token/route.ts`
  - `lib/db/content.ts`

#### `deck_reviews` - 1 file(s)
  - `app/api/investor-lens/deck-review/route.ts`

#### `deck_score_reviews` - 2 file(s)
  - `app/api/dashboard/deck-review/route.ts`
  - `lib/fred/context-builder.ts`

#### `diagnostic_events` - 3 file(s)
  - `app/api/diagnostic/analyze/route.ts`
  - `app/api/diagnostic/events/route.ts`
  - `app/api/diagnostic/introduce/route.ts`

#### `diagnostic_states` - 3 file(s)
  - `app/api/diagnostic/analyze/route.ts`
  - `app/api/diagnostic/introduce/route.ts`
  - `app/api/diagnostic/state/route.ts`

#### `document_repository` - 3 file(s)
  - `app/api/fred/chat/route.ts`
  - `lib/dashboard/trends.ts`
  - `lib/documents/repository.ts`

#### `documents` - 7 file(s)
  - `app/api/admin/analytics/engagement/route.ts`
  - `app/api/documents/[id]/route.ts`
  - `app/api/documents/review/route.ts`
  - `app/api/documents/route.ts`
  - `app/api/documents/upload/route.ts`
  - ... and 2 more

#### `email_sends` - 4 file(s)
  - `app/api/cron/weekly-digest/route.ts`
  - `lib/email/milestones/triggers.ts`
  - `lib/email/re-engagement/detector.ts`
  - `lib/email/send.ts`

#### `escalation_rules` - 2 file(s)
  - `app/api/admin/voice-agent/escalation/route.ts`
  - `lib/voice-agent.ts`

#### `event_feedback` - 4 file(s)
  - `app/api/admin/event-feedback/route.ts`
  - `app/api/feedback/event/route.ts`
  - `components/event-feedback-widget.tsx`
  - `components/event-micro-survey.tsx`

#### `feedback_insights` - 11 file(s)
  - `app/api/admin/feedback/insights/[insightId]/linear/route.ts`
  - `app/api/admin/prompt-patches/[id]/route.ts`
  - `app/api/cron/sync-linear-status/route.ts`
  - `app/api/webhooks/linear/route.ts`
  - `lib/db/feedback-admin.ts`
  - ... and 6 more

#### `feedback_signals` - 15 file(s)
  - `app/api/admin/iteration-metrics/route.ts`
  - `app/api/feedback/event/route.ts`
  - `docs/runbooks/pipeline-monitoring.md`
  - `lib/db/feedback-admin.ts`
  - `lib/db/feedback.ts`
  - ... and 10 more

#### `founder_reports` - 3 file(s)
  - `app/api/reports/list/route.ts`
  - `app/reports/[id]/page.tsx`
  - `lib/report/generate-report.ts`

#### `fred_audit_log` - 5 file(s)
  - `app/api/admin/audit/export/route.ts`
  - `app/api/admin/audit/route.ts`
  - `lib/audit/fred-audit.ts`
  - `lib/db/audit-log.ts`
  - `supabase/migrations/20260309000003_fred_audit_log.sql`

#### `fred_decision_log` - 3 file(s)
  - `app/api/fred/history/route.ts`
  - `app/api/fred/memory/stats/route.ts`
  - `lib/db/fred-memory.ts`

#### `fred_episodic_memory` - 16 file(s)
  - `app/api/admin/analytics/engagement/route.ts`
  - `app/api/admin/event-analytics/route.ts`
  - `app/api/dashboard/next-steps/route.ts`
  - `app/api/dashboard/stats/route.ts`
  - `app/api/fred/export/route.ts`
  - ... and 11 more

#### `fred_semantic_memory` - 4 file(s)
  - `app/api/fred/history/route.ts`
  - `app/api/fred/memory/stats/route.ts`
  - `lib/db/fred-memory.ts`
  - `lib/db/migrations/063_memory_vector_search_rpcs.sql`

#### `funnel_sessions` - 1 file(s)
  - `app/api/funnel/sync/route.ts`

#### `investor_lens_evaluations` - 3 file(s)
  - `app/api/investor-lens/deck-request/route.ts`
  - `app/api/investor-lens/deck-review/route.ts`
  - `app/api/investor-lens/route.ts`

#### `investor_lists` - 2 file(s)
  - `app/api/investors/upload/route.ts`
  - `lib/db/migrations/038_investor_tables.sql`

#### `investor_matches` - 4 file(s)
  - `app/api/investors/match/route.ts`
  - `app/api/investors/pipeline/route.ts`
  - `lib/db/migrations/038_investor_tables.sql`
  - `lib/investors/matching.ts`

#### `investor_outreach_sequences` - 1 file(s)
  - `app/api/investors/generate-outreach/route.ts`

#### `investor_pipeline` - 1 file(s)
  - `app/api/investors/pipeline/route.ts`

#### `investor_readiness_scores` - 7 file(s)
  - `app/api/dashboard/readiness/route.ts`
  - `lib/dashboard/engagement-score.ts`
  - `lib/db/migrations/054_community_data_layer.sql`
  - `lib/fred/context-builder.ts`
  - `lib/fred/irs/db.ts`
  - ... and 2 more

#### `investors` - 4 file(s)
  - `app/api/investors/generate-outreach/route.ts`
  - `app/api/investors/pipeline/route.ts`
  - `app/api/investors/upload/route.ts`
  - `lib/investors/matching.ts`

#### `journey_events` - 8 file(s)
  - `app/api/journey/stats/route.ts`
  - `app/api/journey/timeline/route.ts`
  - `app/api/startup-process/route.ts`
  - `docs/api/journey-endpoints.md`
  - `lib/db/journey-events.ts`
  - ... and 3 more

#### `knowledge_base` - 2 file(s)
  - `app/api/admin/voice-agent/knowledge/route.ts`
  - `lib/voice-agent.ts`

#### `milestones` - 6 file(s)
  - `app/api/journey/milestones/[id]/route.ts`
  - `app/api/journey/milestones/route.ts`
  - `app/api/journey/stats/route.ts`
  - `docs/api/journey-endpoints.md`
  - `lib/db/migrations/009_journey_tables.sql`
  - ... and 1 more

#### `modules` - 2 file(s)
  - `app/api/content/[courseId]/lessons/[lessonId]/playback-token/route.ts`
  - `lib/db/content.ts`

#### `next_steps` - 5 file(s)
  - `app/api/cron/next-steps-reminders/route.ts`
  - `lib/dashboard/engagement-score.ts`
  - `lib/dashboard/trends.ts`
  - `lib/fred/context-builder.ts`
  - `lib/next-steps/next-steps-service.ts`

#### `notification_configs` - 17 file(s)
  - `ALERT_NOTIFICATION_INTEGRATION.md`
  - `app/api/notifications/config/route.ts`
  - `app/api/notifications/pagerduty/route.ts`
  - `app/api/notifications/settings/route.ts`
  - `app/api/notifications/slack/route.ts`
  - ... and 12 more

#### `notification_logs` - 8 file(s)
  - `ALERT_NOTIFICATION_INTEGRATION.md`
  - `app/api/notifications/settings/route.ts`
  - `docs/NOTIFICATION_API_IMPLEMENTATION.md`
  - `docs/NOTIFICATION_API_QUICK_REFERENCE.md`
  - `docs/NOTIFICATIONS.md`
  - ... and 3 more

#### `phone_verifications` - 2 file(s)
  - `app/api/sms/preferences/route.ts`
  - `app/api/sms/verify/route.ts`

#### `pitch_reviews` - 3 file(s)
  - `app/api/dashboard/stats/route.ts`
  - `lib/dashboard/trends.ts`
  - `lib/fred/pitch/db.ts`

#### `positioning_assessments` - 3 file(s)
  - `app/api/dashboard/readiness/route.ts`
  - `app/api/positioning/latest/route.ts`
  - `app/api/positioning/route.ts`

#### `profiles` - 60 file(s)
  - `app/api/admin/analytics/engagement/route.ts`
  - `app/api/admin/event-analytics/route.ts`
  - `app/api/boardy/intro-prep/route.ts`
  - `app/api/bug-report/route.ts`
  - `app/api/cron/weekly-digest/route.ts`
  - ... and 55 more

#### `prompt_patches` - 11 file(s)
  - `app/api/admin/prompt-patches/[id]/route.ts`
  - `lib/db/prompt-patches.ts`
  - `lib/feedback/feedback-to-fix-linker.ts`
  - `lib/feedback/iteration-tracker.ts`
  - `lib/feedback/patch-validation.ts`
  - ... and 6 more

#### `push_notification_logs` - 2 file(s)
  - `app/dashboard/notifications/page.tsx`
  - `lib/push/triggers.ts`

#### `push_subscriptions` - 3 file(s)
  - `app/api/push/subscribe/route.ts`
  - `lib/push/index.ts`
  - `lib/push/preferences.ts`

#### `reality_lens_analyses` - 3 file(s)
  - `app/api/fred/chat/route.ts`
  - `app/api/fred/reality-lens/route.ts`
  - `lib/ai/examples/reality-lens-integration.ts`

#### `sms_checkins` - 5 file(s)
  - `app/api/dashboard/stats/route.ts`
  - `lib/dashboard/command-center.ts`
  - `lib/dashboard/engagement-score.ts`
  - `lib/dashboard/trends.ts`
  - `lib/db/sms.ts`

#### `startup_processes` - 4 file(s)
  - `app/api/startup-process/route.ts`
  - `lib/db/migrations/040_rls_hardening.sql`
  - `lib/fred/context-builder.ts`
  - `lib/report/generate-report.ts`

#### `strategy_documents` - 5 file(s)
  - `app/api/dashboard/documents/route.ts`
  - `app/api/dashboard/stats/route.ts`
  - `lib/dashboard/trends.ts`
  - `lib/documents/repository.ts`
  - `lib/fred/strategy/db.ts`

#### `uploaded_documents` - 3 file(s)
  - `app/api/dashboard/documents/route.ts`
  - `lib/db/documents.ts`
  - `lib/db/migrations/040_rls_hardening.sql`

#### `user_subscriptions` - 7 file(s)
  - `app/api/user/delete/route.ts`
  - `docs/STRIPE_TESTING.md`
  - `INTEGRATION_COMPLETE.md`
  - `lib/db/subscriptions.ts`
  - `QUICK_START.md`
  - ... and 2 more

#### `video_participants` - 4 file(s)
  - `app/api/coaching/participants/route.ts`
  - `app/api/livekit/webhook/route.ts`
  - `lib/db/migrations/040_rls_hardening.sql`
  - `lib/livekit/cleanup.ts`

#### `video_rooms` - 4 file(s)
  - `app/api/coaching/participants/route.ts`
  - `app/api/livekit/webhook/route.ts`
  - `lib/db/migrations/040_rls_hardening.sql`
  - `lib/livekit/cleanup.ts`

#### `voice_agent_config` - 5 file(s)
  - `app/api/admin/voice-agent/config/route.ts`
  - `lib/db/migrations/009_voice_agent_tables.sql`
  - `lib/db/migrations/014_voice_agent_fred_persona.sql`
  - `lib/db/migrations/036_voice_agent_fred_persona.sql`
  - `lib/voice-agent.ts`

#### `voice_calls` - 1 file(s)
  - `app/api/admin/voice-agent/analytics/route.ts`

---

## Views

Grep patterns: `supabase.from('VIEW'`, `FROM VIEW` (SQL), `/rest/v1/VIEW`, `SELECT ... FROM VIEW`.

### `ai_rating_analytics` - ZERO-REFS (0 file(s))
  (no references)

### `fred_calibration_by_type` - ZERO-REFS (0 file(s))
  (no references)

### `fred_calibration_metrics` - ZERO-REFS (0 file(s))
  (no references)

### `journey_stats` - ZERO-REFS (0 file(s))
  (no references)

### `variant_feedback_summary` - ZERO-REFS (0 file(s))
  (no references)

### `experiment_promotion_eligibility` - MIGRATIONS-ONLY (1 file(s))
  - `lib/monitoring/QUICK_REFERENCE.md`

### `fred_step_progress` - LIB-ONLY (1 file(s))
  - `lib/db/conversation-state.ts`

### `fred_audit_summary` - LIVE (1 file(s))
  - `app/api/admin/audit/summary/route.ts`

### `fred_topic_quality` - LIVE (1 file(s))
  - `app/api/admin/audit/summary/route.ts`

---

## Functions

Grep patterns: `.rpc('FN'`, `select FN(`, `SELECT FN(`, `FN(`. The last pattern is permissive so counts include self-references from the defining migration.

Most `update_*_updated_at` entries and `sync_*_count` entries are Postgres TRIGGER functions - they are not called from application code by design. Their caller is the database itself via `CREATE TRIGGER ... EXECUTE FUNCTION ...`. 'NO-CALLERS' here means 'not called from application code', not 'dead'. Functions that would legitimately be RPC-called from code show up as LIB-ONLY/LIVE (e.g. `search_episodic_memory`, `search_semantic_memory`).

### `get_pending_outcomes` - NO-CALLERS (1 file(s))
  - `lib/db/migrations/023_fred_calibration_schema.sql`

### `handle_new_user` - NO-CALLERS (6 file(s))
  - `lib/db/migrations/032_profiles_table_trigger.sql`
  - `lib/db/migrations/048_fix_profile_trigger_README.md`
  - `lib/db/migrations/048_fix_profile_trigger.sql`
  - `lib/db/migrations/050_founder_snapshot_columns.sql`
  - `supabase-migrations/001_profiles.sql`
  - ... and 1 more

### `log_consent_change` - NO-CALLERS (3 file(s))
  - `lib/db/migrations/054_community_data_layer.sql`
  - `supabase/migrations/20260216000001_community_data_layer.sql`
  - `supabase/migrations/20260217000001_community_data_layer.sql`

### `refresh_benchmark_aggregates` - NO-CALLERS (3 file(s))
  - `lib/db/migrations/054_community_data_layer.sql`
  - `supabase/migrations/20260216000001_community_data_layer.sql`
  - `supabase/migrations/20260217000001_community_data_layer.sql`

### `set_prompt_patch_version` - NO-CALLERS (1 file(s))
  - `supabase/migrations/20260309100001_prompt_patches.sql`

### `sync_community_member_count` - NO-CALLERS (1 file(s))
  - `lib/db/migrations/051_founder_communities.sql`

### `sync_post_reaction_count` - NO-CALLERS (1 file(s))
  - `lib/db/migrations/051_founder_communities.sql`

### `sync_post_reply_count` - NO-CALLERS (1 file(s))
  - `lib/db/migrations/051_founder_communities.sql`

### `sync_social_feed_comment_count` - NO-CALLERS (3 file(s))
  - `lib/db/migrations/054_community_data_layer.sql`
  - `supabase/migrations/20260216000001_community_data_layer.sql`
  - `supabase/migrations/20260217000001_community_data_layer.sql`

### `sync_social_feed_reaction_count` - NO-CALLERS (3 file(s))
  - `lib/db/migrations/054_community_data_layer.sql`
  - `supabase/migrations/20260216000001_community_data_layer.sql`
  - `supabase/migrations/20260217000001_community_data_layer.sql`

### `update_coaching_sessions_updated_at` - NO-CALLERS (1 file(s))
  - `lib/db/migrations/042_coaching_sessions.sql`

### `update_contacts_updated_at` - NO-CALLERS (1 file(s))
  - `supabase/migrations/20260309300001_google_contacts.sql`

### `update_document_repository_updated_at` - NO-CALLERS (1 file(s))
  - `supabase/migrations/20260212000003_create_document_repository.sql`

### `update_fred_red_flags_updated_at` - NO-CALLERS (1 file(s))
  - `lib/db/migrations/036_red_flags.sql`

### `update_fred_semantic_updated_at` - NO-CALLERS (1 file(s))
  - `lib/db/migrations/021_fred_memory_schema.sql`

### `update_phone_verifications_updated_at` - NO-CALLERS (1 file(s))
  - `lib/db/migrations/035_phone_verifications.sql`

### `update_prompt_patches_updated_at` - NO-CALLERS (1 file(s))
  - `supabase/migrations/20260309100001_prompt_patches.sql`

### `update_push_subscriptions_updated_at` - NO-CALLERS (1 file(s))
  - `lib/db/migrations/041_push_subscriptions.sql`

### `update_user_subscriptions_updated_at` - NO-CALLERS (1 file(s))
  - `lib/db/migrations/033_user_subscriptions.sql`

### `update_video_rooms_updated_at` - NO-CALLERS (1 file(s))
  - `lib/db/migrations/015_video_calls.sql`

### `update_whatsapp_monitor_state_updated_at` - NO-CALLERS (1 file(s))
  - `supabase/migrations/20260407000002_create_whatsapp_monitor_state.sql`

### `validate_calibration_factors` - NO-CALLERS (1 file(s))
  - `lib/db/migrations/023_fred_calibration_schema.sql`

### `get_promotion_stats` - DOCS-ONLY (3 file(s))
  - `docs/AUTO_PROMOTION_IMPLEMENTATION.md`
  - `lib/db/migrations/013_experiment_promotions.sql`
  - `lib/monitoring/QUICK_REFERENCE.md`

### `notify_promotion_event` - DOCS-ONLY (2 file(s))
  - `docs/AUTO_PROMOTION_IMPLEMENTATION.md`
  - `lib/db/migrations/013_experiment_promotions.sql`

### `update_updated_at_column` - OTHER (17 file(s))
  - `lib/db/migrations/005_documents.sql`
  - `lib/db/migrations/006_pitch_deck.sql`
  - `lib/db/migrations/008_ai_ratings.sql`
  - `lib/db/migrations/009_journey_tables.sql`
  - `lib/db/migrations/012_notification_configs.sql`
  - ... and 12 more

### `search_episodic_memory` - LIB-ONLY (2 file(s))
  - `lib/db/fred-memory.ts`
  - `lib/db/migrations/063_memory_vector_search_rpcs.sql`

### `search_semantic_memory` - LIB-ONLY (2 file(s))
  - `lib/db/fred-memory.ts`
  - `lib/db/migrations/063_memory_vector_search_rpcs.sql`

