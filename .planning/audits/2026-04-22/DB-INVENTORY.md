---
project: sahara
type: db-inventory
generated: 2026-04-22
generator: agent (read-only audit)
source: db.ggiywhpgzjdjeeldjdnp.supabase.co:5432/postgres
approach: SELECT-only, zero writes/DDL/DML
---

# Sahara Supabase — Database Inventory (READ-ONLY)

**Server time at capture:** 2026-04-22 18:24:34 UTC
**PostgreSQL version:** 17.6 on aarch64-unknown-linux-gnu
**Connection:** `postgres@db.ggiywhpgzjdjeeldjdnp.supabase.co` (1Password item `xevputt7jarro7inlkibzaydpm`)

## Headline Numbers

| Metric | Value |
|---|---|
| `public` base tables | **106** |
| `public` views | 8 |
| `public` materialized views | 2 (both empty) |
| `public` functions | 23 (20 triggers + 3 regular) |
| `public` triggers | 48 rows across 38 tables |
| Foreign keys | 52 |
| RLS policies | 251 policies across 80 tables |
| Tables with RLS OFF | 26 |
| Tables with RLS ON but 0 policies | **1 (whatsapp_monitor_state — BROKEN)** |
| Empty tables (row count = 0) | **82 of 106 (77%)** |
| Test-polluted users in profiles | **68 of 134 (51%)** |
| Test-polluted `auth.users` | **68 of 134 (51%)** |
| Test `email_sends` recipients | **110 of 198 (56%)** |

---

## Section 1 — Schemas & Public Tables

### All non-system schemas

```
 table_schema | table_count
--------------+-------------
 auth         |          23
 public       |         114  (106 tables + 8 views)
```

(Only `public` is in scope for this audit.)

### Full public base-table roll-up

106 base tables. Full names alphabetically:

```
ab_experiments, ab_promotion_audit_log, ab_variants, agent_tasks, ai_config, ai_insights,
ai_prompts, ai_ratings, ai_requests, ai_responses, boardy_matches, chat_messages, check_ins,
coaching_sessions, cohort_members, cohorts, communities, community_members,
community_post_reactions, community_post_replies, community_posts, community_profiles,
consent_audit_log, consent_preferences, contact_submissions, contacts, daily_agendas,
deck_reviews, deck_score_reviews, diagnostic_events, diagnostic_states, document_chunks,
document_repository, documents, email_sends, engagement_streaks, escalation_rules,
experiment_promotions, expert_listings, feedback_digest_preferences, feedback_improvements,
feedback_insights, feedback_sessions, feedback_signals, fewshot_examples, founder_connections,
founder_goals, founder_messages, founder_reports, fred_audit_log, fred_calibration_records,
fred_conversation_state, fred_decision_log, fred_episodic_memory, fred_procedural_memory,
fred_red_flags, fred_semantic_memory, fred_step_evidence, investor_lens_evaluations,
investor_lists, investor_match_scores, investor_matches, investor_outreach_sequences,
investor_pipeline, investor_readiness_scores, investor_scores, investors, journey_events,
knowledge_base, milestones, next_steps, notification_configs, notification_logs,
oases_progress, phone_verifications, pitch_deck_reviews, pitch_reviews,
positioning_assessments, profiles, prompt_patches, push_notification_logs,
push_subscriptions, reality_lens_analyses, reputation_events, sentiment_signals,
shared_link_recipients, shared_links, sms_checkins, social_feed_comments, social_feed_posts,
social_feed_reactions, startup_process_validations, startup_processes, strategy_documents,
stripe_events, subcommunity_sponsors, team_members, uploaded_documents, user_sms_preferences,
user_subscriptions, users, ux_test_results, ux_test_runs, voice_agent_config, voice_calls,
whatsapp_monitor_state
```

---

## Section 3 — EMPTY TABLES (82) — PRIMARY CLEANUP CANDIDATES

Tables with zero rows and zero inserts (based on pg_stat_user_tables + live COUNT(*)). These are the first wave of drop candidates. Each line is `<table> — <size-on-disk>`.

Note: every empty table has `n_tup_ins = 0` — they have never held data.

```
ab_experiments              — 24 kB
ab_promotion_audit_log      — 80 kB
ab_variants                 — 32 kB
agent_tasks                 — 40 kB
ai_insights                 — 72 kB
ai_prompts                  — 24 kB
ai_ratings                  — 80 kB
boardy_matches              — 32 kB
chat_messages               — 32 kB
check_ins                   — 24 kB
coaching_sessions           — 32 kB
cohort_members              — 48 kB
cohorts                     — 40 kB
communities                 — 72 kB
community_members           — 40 kB
community_post_reactions    — 40 kB
community_post_replies      — 40 kB
community_posts             — 40 kB
community_profiles          — 48 kB
consent_audit_log           — 32 kB
consent_preferences         — 40 kB
deck_reviews                — 32 kB
deck_score_reviews          — 24 kB
diagnostic_events           — 40 kB
diagnostic_states           — 48 kB
document_chunks             — 1640 kB  <-- bloated empty (pgvector)
document_repository         — 40 kB
documents                   — 48 kB
engagement_streaks          — 32 kB
escalation_rules            — 40 kB
experiment_promotions       — 56 kB
expert_listings             — 40 kB
feedback_digest_preferences — 8192 bytes
feedback_improvements       — 32 kB
feedback_insights           — 32 kB
feedback_sessions           — 32 kB
feedback_signals            — 120 kB  <-- bloated empty
fewshot_examples            — 40 kB
founder_connections         — 56 kB
founder_messages            — 40 kB
founder_reports             — 48 kB
investor_lens_evaluations   — 48 kB
investor_lists              — 24 kB
investor_match_scores       — 24 kB
investor_matches            — 40 kB
investor_outreach_sequences — 32 kB
investor_pipeline           — 40 kB
investor_readiness_scores   — 40 kB
investor_scores             — 24 kB
investors                   — 24 kB
knowledge_base              — 48 kB
milestones                  — 56 kB
notification_configs        — 48 kB
notification_logs           — 56 kB
oases_progress              — 32 kB
phone_verifications         — 40 kB
pitch_deck_reviews          — 40 kB
pitch_reviews               — 40 kB
positioning_assessments     — 40 kB
prompt_patches              — 48 kB
push_subscriptions          — 32 kB
reputation_events           — 40 kB
shared_link_recipients      — 32 kB
shared_links                — 48 kB
sms_checkins                — 40 kB
social_feed_comments        — 40 kB
social_feed_posts           — 56 kB
social_feed_reactions       — 40 kB
startup_process_validations — 32 kB
strategy_documents          — 40 kB
stripe_events               — 56 kB
subcommunity_sponsors       — 40 kB
team_members                — 40 kB
uploaded_documents          — 48 kB
user_sms_preferences        — 16 kB
user_subscriptions          — 48 kB
users                       — 32 kB    <-- duplicate of profiles?
ux_test_results             — 56 kB
ux_test_runs                — 32 kB
voice_calls                 — 48 kB
whatsapp_monitor_state      — 16 kB    <-- RLS on, 0 policies (broken)
```

**Total disk space reclaimable from empty tables: ~3 MB** (dominated by `document_chunks` 1.6 MB and `feedback_signals` 120 kB).

**Cleanup order suggestion:**
1. **Tier A — clearly dead, drop first:** `boardy_matches`, `check_ins`, `chat_messages`, `cohort_members`, `cohorts`, `community_*` (5 tables), `deck_reviews`, `deck_score_reviews`, `diagnostic_events`, `diagnostic_states`, `document_chunks`, `document_repository`, `documents`, `engagement_streaks`, `expert_listings`, `investor_*` (all 8 empty investor tables), `oases_progress`, `pitch_deck_reviews`, `pitch_reviews`, `positioning_assessments`, `reputation_events`, `shared_link_recipients`, `shared_links`, `sms_checkins`, `social_feed_*` (3 tables), `startup_process_validations`, `strategy_documents`, `stripe_events`, `subcommunity_sponsors`, `team_members`, `uploaded_documents`, `user_sms_preferences`, `user_subscriptions`, `users`, `ux_test_*` (2 tables), `voice_calls`, `whatsapp_monitor_state`
2. **Tier B — verify before dropping:** tables that have triggers attached (see section 9) — dropping the table also drops the trigger; confirm no code depends on the schema.
3. **Tier C — experiments & A/B framework:** `ab_experiments`, `ab_variants`, `ab_promotion_audit_log`, `experiment_promotions`, `ai_ratings`, `ai_insights`, `ai_prompts`, `feedback_*` (5), `fewshot_examples`, `prompt_patches`, `phone_verifications`, `notification_*` (2), `push_subscriptions`, `escalation_rules`, `knowledge_base`. These were clearly part of planned features that never shipped — confirm product intent before dropping.

---

## Section 4 — Tables with No Activity >90 Days (Secondary Candidates)

**None.** The oldest activity on any populated table is 77 days (`ai_config`). All 24 populated tables have been written to more recently than the 90-day cutoff.

For context, tables stale between 60-90 days (borderline — may be candidates for schema-only drop or dormant-feature flag):

| Table | Rows | Last activity | Age |
|---|---:|---|---|
| `ai_config` | 4 | 2026-02-03 | 77 days |
| `ai_responses` | 4 | 2026-02-06 | 74 days |
| `fred_procedural_memory` | 6 | 2026-02-18 | 62 days |
| `voice_agent_config` | 2 | 2026-02-18 | 62 days |

---

## Section 2 — Every Populated Public Table (Real COUNT + Size + Last Activity)

Sorted row count ASC. **24 populated tables.**

| # | Table | Rows | Size | Last Activity | TS Column |
|---:|---|---:|---|---|---|
| 1 | `reality_lens_analyses` | 1 | 80 kB | 2026-03-14 10:58 | created_at |
| 2 | `startup_processes` | 1 | 80 kB | 2026-02-25 21:32 | updated_at |
| 3 | `voice_agent_config` | 2 | 48 kB | 2026-02-18 20:54 | updated_at |
| 4 | `fred_step_evidence` | 3 | 96 kB | 2026-03-28 23:58 | updated_at |
| 5 | `ai_config` | 4 | 48 kB | 2026-02-03 23:02 | updated_at |
| 6 | `ai_responses` | 4 | 80 kB | 2026-02-06 20:46 | created_at |
| 7 | `fred_procedural_memory` | 6 | 152 kB | 2026-02-18 20:53 | updated_at |
| 8 | `daily_agendas` | 9 | 96 kB | (no ts col queried) | — |
| 9 | `contact_submissions` | 26 | 80 kB | 2026-03-30 14:50 | updated_at |
| 10 | `fred_episodic_memory` | 30 | 1816 kB | 2026-02-25 19:42 | created_at |
| 11 | `fred_audit_log` | 45 | 248 kB | 2026-03-31 00:34 | updated_at |
| 12 | `fred_conversation_state` | 45 | 272 kB | 2026-03-31 00:34 | updated_at |
| 13 | `founder_goals` | 50 | 96 kB | 2026-03-31 00:39 | updated_at |
| 14 | `fred_semantic_memory` | 85 | 1760 kB | 2026-03-31 00:33 | updated_at |
| 15 | `sentiment_signals` | 122 | 80 kB | 2026-03-31 00:34 | created_at |
| 16 | `profiles` | 134 | 360 kB | **2026-04-22 08:23** | updated_at |
| 17 | `next_steps` | 134 | 144 kB | **2026-04-22 15:01** | updated_at |
| 18 | `ai_requests` | 135 | 216 kB | 2026-03-31 00:34 | created_at |
| 19 | `fred_decision_log` | 151 | 432 kB | 2026-03-31 00:34 | created_at |
| 20 | `journey_events` | 160 | 208 kB | 2026-03-31 00:38 | created_at |
| 21 | `email_sends` | 198 | 144 kB | **2026-04-22 14:00** | created_at |
| 22 | `fred_red_flags` | 1277 | 624 kB | 2026-02-25 20:33 | updated_at |
| 23 | `push_notification_logs` | 1650 | 688 kB | 2026-04-22 15:01 | sent_at |
| 24 | `contacts` | 17100 | 68 MB | 2026-03-10 03:53 | updated_at |

**Total populated-table disk: ~76 MB** (dominated by `contacts` at 68 MB).

### Tables with no timestamp column at all

Confirmed via schema scan — no `created_at`/`updated_at`/`inserted_at`:
```
daily_agendas (has id only? — needs deeper inspection)
```

---

## Section 5 — Columns with 100% NULL (Populated Tables ≥10 rows)

Surfaces unused/dead columns. Excludes `daily_agendas` (only 9 rows).

### `profiles` (134 rows) — 7 dead columns
```
team_size          — 134/134 NULL
primary_constraint — 134/134 NULL
traction           — 134/134 NULL
funding_history    — 134/134 NULL
product_status     — 134/134 NULL
revenue_range      — 134/134 NULL
ninety_day_goal    — 134/134 NULL
```
Looks like onboarding-survey columns that were never wired up. 30-col table → 7 dead = 23% bloat.

### `next_steps` (134 rows) — 1 dead column
```
completed_at — 134/134 NULL
```
No next_steps have ever been completed. Indicates the UI never marks anything done, OR the system is purely generative.

### `fred_episodic_memory` (30 rows) — 1 dead column
```
embedding — 30/30 NULL
```
Embeddings are declared but never generated. Either broken pipeline or abandoned plan.

### `fred_audit_log` (45 rows) — 13 dead columns
```
feedback_category, feedback_rating, feedback_comment, feedback_at  — no feedback ever captured
irs_score, sentiment_label, sentiment_confidence, reality_lens_score, stress_level  — scoring columns never populated
variant_id  — A/B variant linkage never set
input_tokens, output_tokens, total_tokens  — token tracking never populated
```
Half the columns are dead. This table is either newly added or the instrumentation was never completed.

### `fred_conversation_state` (45 rows) — 3 dead columns
```
last_transition_at, last_transition_from, last_transition_to — state transitions never logged
```

### `fred_semantic_memory` (85 rows) — 1 dead column
```
embedding — 85/85 NULL
```
Same embedding gap as episodic.

### `sentiment_signals` (122 rows) — 1 dead column
```
message_id — 122/122 NULL
```
FK link to source message never set.

### `ai_requests` (135 rows) — 4 dead columns
```
variant_id, source_id, max_tokens, prompt_version
```
A/B / versioning metadata never wired up.

### `fred_decision_log` (151 rows) — 6 dead columns
```
outcome, outcome_score, outcome_recorded_at  — outcomes never recorded
final_decision, analysis, decided_at  — the decision loop never closed
```
This is especially concerning for a "decision log" — it's only storing the input side, never the outcome side.

### `journey_events` (160 rows) — 1 dead column
```
score_before — 160/160 NULL
```

### `email_sends` (198 rows) — 1 dead column
```
resend_id — 198/198 NULL
```
Resend.com integration field never populated — emails are likely going out via another provider, or Resend IDs are discarded.

### `fred_red_flags` (1277 rows) — 2 dead columns
```
source_message_id  — upstream trace never stored
resolved_at        — no flag ever marked resolved
```
1277 red flags and zero have ever been resolved.

### `push_notification_logs` (1650 rows) — 2 dead columns
```
error_message — 1650/1650 NULL
clicked_at    — 1650/1650 NULL
```
No push has ever errored (or the error is discarded), and no push has ever been clicked (or click-tracking is broken).

### `contacts` (17100 rows) — 1 dead column
```
notes — 17100/17100 NULL
```

**Clean tables (no 100% NULL columns):** `contact_submissions`, `founder_goals`.

---

## Section 6 — Foreign-Key Graph

52 foreign keys in public. Listed as `FROM table.column → TO table.column`:

```
ab_promotion_audit_log.experiment_id              → ab_experiments.id
ab_promotion_audit_log.previous_winner_id         → ab_variants.id
ab_promotion_audit_log.winning_variant_id         → ab_variants.id
ab_variants.experiment_id                         → ab_experiments.id
ab_variants.prompt_id                             → ai_prompts.id
ai_ratings.response_id                            → ai_responses.id
ai_responses.request_id                           → ai_requests.id
cohort_members.cohort_id                          → cohorts.id
communities.parent_community_id                   → communities.id  (self-referential)
community_members.community_id                    → communities.id
community_post_reactions.post_id                  → community_posts.id
community_post_replies.parent_reply_id            → community_post_replies.id  (self-ref)
community_post_replies.post_id                    → community_posts.id
community_posts.community_id                      → communities.id
deck_reviews.investor_lens_id                     → investor_lens_evaluations.id
document_chunks.document_id                       → uploaded_documents.id
escalation_rules.config_id                        → voice_agent_config.id
experiment_promotions.control_variant_id          → ab_variants.id
experiment_promotions.experiment_id               → ab_experiments.id
experiment_promotions.promoted_variant_id         → ab_variants.id
feedback_improvements.insight_id                  → feedback_insights.id
feedback_improvements.patch_id                    → prompt_patches.id
feedback_signals.session_id                       → feedback_sessions.id
fewshot_examples.signal_id                        → feedback_signals.id
founder_reports.process_id                        → startup_processes.id
fred_calibration_records.decision_id              → fred_decision_log.id
fred_decision_log.procedure_used                  → fred_procedural_memory.name
fred_step_evidence.semantic_memory_id             → fred_semantic_memory.id
investor_match_scores.match_id                    → investor_matches.id
investor_matches.investor_id                      → investors.id
investor_outreach_sequences.investor_id           → investors.id
investor_pipeline.investor_id                     → investors.id
investor_pipeline.match_id                        → investor_matches.id
investors.list_id                                 → investor_lists.id
knowledge_base.config_id                          → voice_agent_config.id
notification_logs.config_id                       → notification_configs.id
prompt_patches.experiment_id                      → ab_experiments.id
prompt_patches.parent_patch_id                    → prompt_patches.id  (self-ref)
(and ~14 more — full list in /tmp/sahara_fks.txt)
```

**Observations:**
- No FKs from public.* to auth.users. `profiles.id` is presumably a dangling reference enforced in application code only.
- `fred_decision_log` FKs to `fred_procedural_memory(name)` — non-standard (usually FK to id).
- Heavy `ab_*` / `experiment_*` / `prompt_patches` graph — all tables empty, indicating a complete unused subsystem.
- Heavy `community_*` graph — all tables empty, indicating the entire "communities" feature is unshipped.
- Heavy `investor_*` graph — all 8 tables empty, indicating the investor CRM feature is unshipped.

---

## Section 7 — Views (8)

| View | Depends on tables | Risk flag |
|---|---|---|
| `ai_rating_analytics` | `ai_ratings`, `ai_requests`, `ai_responses` | **DEAD** — `ai_ratings` is empty (0 rows), view returns nothing |
| `experiment_promotion_eligibility` | `ab_experiments`, `ab_variants`, `experiment_promotions` | **DEAD** — all 3 source tables empty |
| `fred_audit_summary` | `fred_audit_log` | alive (45 rows in source) |
| `fred_calibration_by_type` | `fred_calibration_records` | **DEAD** — `fred_calibration_records` empty |
| `fred_calibration_metrics` | `fred_calibration_records` | **DEAD** — `fred_calibration_records` empty |
| `fred_step_progress` | `fred_conversation_state`, `fred_step_evidence` | alive |
| `fred_topic_quality` | `fred_audit_log` | alive |
| `journey_stats` | `journey_events`, `milestones` | half-alive — `milestones` is empty |

**Likely dead views: 4** (`ai_rating_analytics`, `experiment_promotion_eligibility`, `fred_calibration_by_type`, `fred_calibration_metrics`).

---

## Section 8 — Materialized Views (2)

| MV | Size | Populated | Rows | Depends On |
|---|---|---|---:|---|
| `benchmark_industry_aggregates` | 16 kB | true | **0** | `consent_preferences`, `investor_readiness_scores`, `profiles` |
| `benchmark_stage_aggregates` | 16 kB | true | **0** | `consent_preferences`, `investor_readiness_scores`, `profiles` |

Both matviews are populated but empty because their source tables (`consent_preferences`, `investor_readiness_scores`) are empty. The `refresh_benchmark_aggregates()` function exists to populate them. **Safe to drop — aggregating empty sources.**

---

## Section 9 — Triggers (48 rows, 38 tables)

All triggers are either:
- **`updated_at` bumpers** (BEFORE UPDATE → `update_updated_at_column` or a table-specific variant). 32 of 48.
- **Counter sync triggers** for community/social features (all on empty tables). 8 of 48.
- **Audit triggers** (`consent_preferences`, `experiment_promotions` notifier). 5 of 48.
- **Validation triggers** (`fred_calibration_records`). 2 of 48.
- **Generic `contacts_updated_at`** (1)

Full list:

```
ai_ratings               : update_ai_ratings_updated_at             (BEFORE UPDATE)
coaching_sessions        : trg_coaching_sessions_updated_at         (BEFORE UPDATE)
cohorts                  : trg_cohorts_updated_at                   (BEFORE UPDATE)
communities              : trg_communities_updated_at               (BEFORE UPDATE)
community_members        : trg_sync_member_count                    (AFTER INSERT, DELETE)  [orphan — table empty]
community_post_reactions : trg_sync_reaction_count                  (AFTER INSERT, DELETE)  [orphan — table empty]
community_post_replies   : trg_community_post_replies_updated_at    (BEFORE UPDATE)
                         : trg_sync_reply_count                     (AFTER INSERT, DELETE)  [orphan — table empty]
community_posts          : trg_community_posts_updated_at           (BEFORE UPDATE)
community_profiles       : trg_community_profiles_updated_at        (BEFORE UPDATE)
consent_preferences      : trg_consent_audit                        (AFTER INSERT, UPDATE)
                         : trg_consent_preferences_updated_at       (BEFORE UPDATE)
contact_submissions      : update_contact_submissions_updated_at    (BEFORE UPDATE)
contacts                 : contacts_updated_at                      (BEFORE UPDATE)
document_repository      : trigger_document_repository_updated_at   (BEFORE UPDATE)
documents                : update_documents_updated_at              (BEFORE UPDATE)
engagement_streaks       : trg_engagement_streaks_updated_at        (BEFORE UPDATE)
experiment_promotions    : promotion_notification_trigger           (AFTER INSERT, UPDATE)  [orphan — table empty]
expert_listings          : trg_expert_listings_updated_at           (BEFORE UPDATE)
founder_connections      : trg_founder_connections_updated_at       (BEFORE UPDATE)
fred_calibration_records : calibration_factors_validation           (BEFORE INSERT, UPDATE)
fred_conversation_state  : trg_conv_state_updated_at                (BEFORE UPDATE)
fred_procedural_memory   : fred_procedural_updated_at_trigger       (BEFORE UPDATE)
fred_red_flags           : trigger_fred_red_flags_updated_at        (BEFORE UPDATE)
fred_semantic_memory     : fred_semantic_updated_at_trigger         (BEFORE UPDATE)
fred_step_evidence       : trg_step_evidence_updated_at             (BEFORE UPDATE)
milestones               : update_milestones_updated_at             (BEFORE UPDATE)
next_steps               : trg_next_steps_updated_at                (BEFORE UPDATE)
notification_configs     : update_notification_configs_updated_at   (BEFORE UPDATE)
phone_verifications      : trigger_phone_verifications_updated_at   (BEFORE UPDATE)
pitch_deck_reviews       : update_pitch_deck_reviews_updated_at     (BEFORE UPDATE)
push_subscriptions       : trigger_push_subscriptions_updated_at    (BEFORE UPDATE)
social_feed_comments     : trg_social_feed_comments_updated_at      (BEFORE UPDATE)
                         : trg_sync_social_feed_comment_count       (AFTER INSERT, DELETE)  [orphan — table empty]
social_feed_posts        : trg_social_feed_posts_updated_at         (BEFORE UPDATE)
social_feed_reactions    : trg_sync_social_feed_reaction_count      (AFTER INSERT, DELETE)  [orphan — table empty]
subcommunity_sponsors    : trg_subcommunity_sponsors_updated_at     (BEFORE UPDATE)
uploaded_documents       : update_uploaded_documents_updated_at     (BEFORE UPDATE)
user_subscriptions       : trigger_user_subscriptions_updated_at    (BEFORE UPDATE)
whatsapp_monitor_state   : whatsapp_monitor_state_updated_at        (BEFORE UPDATE)
```

**Orphan triggers (attached to 0-row tables):** 8 sync-counter triggers on community_* and social_feed_* tables, plus `promotion_notification_trigger` on `experiment_promotions`, plus `calibration_factors_validation` on `fred_calibration_records`. These die when the tables are dropped.

---

## Section 10 — Functions (23 in public)

3 regular functions + 20 trigger functions. No legacy suffix matches (`_v1`, `_v2`, `_old`, `_backup`, `_test`).

### Regular Functions (3)

| Name | Args | Returns |
|---|---|---|
| `get_pending_outcomes` | `p_user_id uuid, p_days_old integer DEFAULT 30` | TABLE of predicted outcomes |
| `get_promotion_stats` | — | TABLE (total, auto, manual, active, rolled_back, avg_confidence, avg_improvement) |
| `refresh_benchmark_aggregates` | — | void — refreshes the 2 matviews |

`get_promotion_stats` queries `experiment_promotions` (empty). `refresh_benchmark_aggregates` refreshes empty matviews. Both likely unused.

### Trigger Functions (20)

```
handle_new_user, log_consent_change, notify_promotion_event,
sync_community_member_count, sync_post_reaction_count, sync_post_reply_count,
sync_social_feed_comment_count, sync_social_feed_reaction_count,
update_coaching_sessions_updated_at, update_contacts_updated_at,
update_document_repository_updated_at, update_fred_red_flags_updated_at,
update_fred_semantic_updated_at, update_phone_verifications_updated_at,
update_push_subscriptions_updated_at, update_updated_at_column,
update_user_subscriptions_updated_at, update_video_rooms_updated_at,
update_whatsapp_monitor_state_updated_at, validate_calibration_factors
```

**Flag:** `update_video_rooms_updated_at` exists but no `video_rooms` table — **dangling function**. Confirm with `pg_get_functiondef()` before dropping.

---

## Section 11 — RLS Posture

### Summary

| Status | Tables |
|---|---:|
| RLS enabled | 80 |
| RLS disabled | 26 |
| RLS enabled **but 0 policies** (unreachable from anon/authenticated) | **1** |
| RLS disabled with service-role-only access implied | 26 |

### BROKEN — RLS on, no policies

```
whatsapp_monitor_state — RLS=true, policies=0
```
This table is unreachable from anon/authenticated roles. Either add a policy or disable RLS — currently represents a misconfiguration.

### Tables WITHOUT RLS (26)

These tables are wide-open to whichever role touches them. Many are intentionally service-role-only, but **confirm per-table intent**:

```
ab_promotion_audit_log, agent_tasks, boardy_matches, chat_messages, check_ins,
contacts, deck_reviews, diagnostic_events, diagnostic_states, document_chunks,
documents, fred_procedural_memory, investor_lens_evaluations, investor_readiness_scores,
investor_scores, pitch_deck_reviews, pitch_reviews, positioning_assessments,
reality_lens_analyses, sms_checkins, startup_process_validations, startup_processes,
strategy_documents, uploaded_documents, user_sms_preferences, users
```

Risk observations:
- **`contacts`** (17,100 rows, 68 MB) has NO RLS. If the anon/service key leaks, entire contact book is exfiltrated.
- **`users`** (empty) has NO RLS but duplicates `profiles` (which has RLS). Either drop `users` or lock it down.
- **`fred_procedural_memory`** has 2 policies listed in pg_policy but `relrowsecurity=false` — policies exist but are not enforced. Confusing state.

### Highest-policy tables (hotspots)

19 tables share 5 policies each (CRUD + 1). These are fine, listed for context:
```
ai_ratings, communities, community_members, community_post_replies, community_posts,
community_profiles, consent_preferences, document_repository, expert_listings,
founder_connections, fred_conversation_state, fred_step_evidence, investor_lists,
investor_matches, investor_outreach_sequences, investor_pipeline, next_steps,
social_feed_comments, social_feed_posts
```

Note: most of these tables are empty — suggesting the policies were pre-written for features that never shipped.

---

## Section 12 — Duplicate-Looking / Consolidation Candidates

### Suffix-based duplicates: NONE

No tables end in `_backup`, `_old`, `_v1`, `_v2`, `_copy`, `_archive`, `_tmp`, `_legacy`, `_deprecated`, etc.

### Column-overlap duplicates (>=70% of smaller table, >=5 shared cols)

Flagged pairs worth investigating for consolidation:

| Pair | Overlap | Verdict |
|---|---:|---|
| `community_post_reactions` (5 cols) vs `social_feed_reactions` (5 cols) | **100%** | Clear duplicate — pick one |
| `profiles` (30 cols) vs `users` (9 cols) | **89%** | `users` is empty — drop `users` |
| `community_post_replies` (7) vs `social_feed_comments` (7) | **86%** | Duplicate — pick one |
| `coaching_sessions` (10) vs `voice_calls` (19) | 80% | Overlap on call metadata — consolidate? |
| `documents` (9) vs `strategy_documents` (10) | 78% | Both empty — consolidate or drop |
| `community_posts` (11) vs `social_feed_posts` (13) | 73% | Duplicate — pick one |
| `chat_messages` (6) vs `fred_episodic_memory` (10) | 83% | Different domains but identical shape |

### Parallel feature subsystems (both empty → both droppable?)

- `community_*` (5 tables) and `social_feed_*` (3 tables) — two implementations of the same social feature, both never populated. **Pick one; drop the other wholesale.**
- `documents` + `document_chunks` + `document_repository` + `strategy_documents` + `uploaded_documents` — five document tables, all empty. **Consolidate into 1.**
- `investor_*` (8 tables) — entire investor-CRM subsystem, all empty, 4 FKs. **Drop the whole subsystem unless a near-term roadmap item depends on it.**
- `ab_*` + `experiment_promotions` + `prompt_patches` + `fewshot_examples` + `feedback_*` — A/B-testing + feedback loop, all empty. Drop or park under a feature flag.

---

## Section 13 — auth.users Summary

| Metric | Value |
|---|---:|
| Total users | **134** |
| Imported from Firebase (metadata flag) | 65 (49%) |
| With `recovery_sent_at` populated | 66 |
| Ever signed in (`last_sign_in_at IS NOT NULL`) | 71 (53%) |
| Never signed in | 63 (47%) |
| Auth users without a `public.profiles` row (broken FK) | **0** |
| Profiles without an auth user (orphan) | **0** |

FK hygiene between `auth.users` and `public.profiles` is intact (0 broken on either side). **All 134 `auth.users` are Firebase-imports or real signups, and all have profiles — but 63 have never signed in, and 68 of them are test pollution (see Section 14).**

Effective "real user" count: **134 - 68 test = 66 real users, of which ~71 have signed in** (some real users never signed in; some test users signed in once).

---

## Section 14 — Test / Seed Pollution

### Summary

| Table | Total rows | Test-pattern matches | % polluted |
|---|---:|---:|---:|
| `profiles` | 134 | **68** | 51% |
| `auth.users` | 134 | **68** | 51% |
| `contact_submissions` | 26 | 18 | 69% |
| `contacts` | 17100 | 7 | 0.04% |
| `email_sends` (joined to profiles) | 198 | **110** | 56% |

### Patterns matched
Regex: `email ~* 'test|seed|example|probe|fake|dummy|sample|qa@'` + name regex.

### All 68 polluting profile emails (sorted)

```
audit-test@sahara-test.com
autopilot-qa-1772982837@sahara-test.com
browser.test.2@example.com
bug-test-agent@aiacrobatics.com            <-- created TODAY 2026-04-22 08:23 UTC
chatbot-test-2026@thewizzardof.ai
debugtest@thewizzardof.ai
deploy-verify-fred-20260311@test.joinsahara.com
deploy-verify-pers52@test.dev
dev@test.com
james@test.com
jjjames@testtr.com
jjjjames@test.com
john@test.con
newuser99@testing.com
qa-feedback-test@test-sahara.com
qa-sentiment-test-0308@acrobatics.dev
qa-stagehand-test@example.com
qatest@sahara-test.com
sahara-test-e2e@mailinator.com
sahara-test-feb9@mailinator.com
stagehand-qa-test@mailinator.com
stagehand-test-1772982507@sahara-testing.local
stagehand-test-20260308@test.joinsahara.com
stagehand-test-feb18@test.com
test_random_123@gmail.com
test-debug-p0-2@example.com
test-debug-p0@example.com
test-deploy-verify-feb18@test.dev
test-dev@joinsahara.com
test-direct-1771447737@joinsahara.com
test-finish-1771448144@joinsahara.com
test-fred-latency@thewizzardof.ai
test-fux-feb18@thewizzardof.ai
test-liveaudit@thewizzardof.ai
test-qa-live@thewizzardof.ai
test-user@thewizzardof.ai
test-verify-20260225@test.dev
test-verify-202602250000@test.dev
test-verify-fred-2026@test.dev
test-verify-signup-0218@thewizzardof.ai
test-verify-sms-20260227@test.dev
test-verify-voice-1741682400@test.dev
test-verify-voice@test.dev
test-verify-voice@thewizzardof.ai
test-voiceqa@thewizzardof.ai
test@example.com
test+idea123@joinsahara.com
test+startup123@joinsahara.com
tester_98765@example.com
testfounder@test.com
testuser-browserbase@joinsahara.com
testuser2026@joinsahara.com
testuser999@test.com
timm@test.com
uat-test-1770404836518@sahara-test.com
uitest2@test.com
ux-audit-20260308@sahara-test.com
ux-audit-20260308@test.dev
ux-retest-march8@example.com
ux-test-2026-04-20@aiacrobatics.com
ux-test-2026-04-20b@aiacrobatics.com
ux-test@joinsahara.com
uxtest@sahara-testing.local
uxtest2026@testmail.com
v7-test-agent3@sahara-test.com
v7-ux-test@sahara-test.com
v7test-browser-20260308@test-sahara.com
v8-journey-test@sahara-test.com
```

### Sample of 5 `contact_submissions` (18 total test rows)

```
id = d700cb14-352e-4aa4-b7c2-b6d635c30282  | Test User | waitlist-test@example.com  | "Waitlist signup"
id = e7815e65-a263-4226-a3c4-976351b9727f  | test      | test@test.com              | "rate limit test"
id = f25fa25f-c2a7-477c-b102-f60ebbab2973  | test      | test@test.com              | "rate limit test"
id = 743c2180-182b-408d-8871-8b876a62cd8b  | test      | test@test.com              | "{...startupStage...}"
id = b18d4ec5-b181-4ff5-a7e7-daaf5e1b22c6  | audit     | audit@test.com             | "audit test"
```

### Sample of 5 `contacts` (7 total test rows)

Test-pattern rows in `contacts` are mostly false positives (legitimate people with names like "Ashlee Blake", "Blake Booker", etc. matching `blake` in `display_name`). **Actual test rows in `contacts`: likely 0** — the 7 hits are people with "test"-adjacent legit names; the column `notes` is 100% NULL across all 17,100 rows anyway.

### Email-send blast radius

**110 of 198 email sends (56%) went to test accounts.** All 198 rows have `email_type='re_engagement'`. If the `re_engagement` job sends real email to Resend/SendGrid/etc., this is also wasted deliverability and possible spam-trap hits. Confirm the sender respects a flag before enabling.

---

## Section 15 — Agent's Own Test Pollution (This Session)

**The user's prompt referenced an earlier insert of a `people` row for Blake Harwell (+16198475543), plus test rows in `scheduled_actions` and `relationship_commitments`.**

**Finding: This Sahara DB has NONE of those tables.**

| Searched For | Result |
|---|---|
| Table named `people` | Not found |
| Table named `relationship_commitments` | Not found |
| Table named `scheduled_actions` | Not found |
| Any public column named `source` with value matching `commitment_test%` | 0 matches across all 6 tables with a `source` column |
| `contacts` row with `display_name ILIKE '%Blake Harwell%'` OR `phone_numbers::text LIKE '%6198475543%'` | 0 matches |
| `contacts` rows with any form of "Blake" in `display_name` | 5 false-positive matches (Ashlee Blake, Blake Booker, Blake Glen, Blake Party Bus, Blake Sig Chi) — none are Blake Harwell |

**Conclusion:** The prompt's reference to a `people`/`scheduled_actions`/`relationship_commitments` insert earlier this session points to a **different Supabase project** (perhaps the Dashboard Daddy `jrirksdiklqwsaatbhvg` PPP project, or another client's DB). This Sahara project has no such pollution from Blake.

**However**, today's session DID insert one row here:

```
auth.users.id      = 8073d024-3e0b-429d-a8b8-989605963e45
profiles.id        = 8073d024-3e0b-429d-a8b8-989605963e45
email              = bug-test-agent@aiacrobatics.com
created_at         = 2026-04-22 08:23:13.137626+00
last_sign_in_at    = NULL
```

This is trackable as `bug-test-agent@aiacrobatics.com` and fits the 68-user test-pollution set. If the earlier cleanup pass removes all `profiles.email ~ 'test|seed|...'`, this row is included automatically.

---

# EXECUTIVE SUMMARY — Biggest Cleanup Candidates

1. **Drop 82 empty tables** (77% of the schema) — reclaims ~3 MB, removes 48 unreachable RLS policies and 8 orphan triggers. Focus first: `community_*` (5), `social_feed_*` (3), `investor_*` (8), `ab_*` + A/B framework (4), document-* (5), subcommunity/cohort/team tables, shared_link*, push_subscriptions, ux_test_*, users, stripe_events.
2. **Purge test pollution:** 68 test `profiles` (51%), 68 test `auth.users`, 18 test `contact_submissions`, 110 test `email_sends` recipients — bring real user count from "134" down to the real ~66. Today's `bug-test-agent@aiacrobatics.com` goes with them.
3. **Consolidate parallel subsystems:** pick ONE of `community_*` vs `social_feed_*` (both empty, 100% column overlap on reactions/comments pairs); merge 5 document tables into 1; drop entire `investor_*` CRM subsystem unless it's on a near-term roadmap.
4. **Drop `users` table** (empty, no RLS, duplicates `profiles` at 89% column overlap) and the dangling `update_video_rooms_updated_at` function (no `video_rooms` table).
5. **Fix broken RLS:** `whatsapp_monitor_state` has RLS on with 0 policies — either disable or add a policy. `fred_procedural_memory` has 2 policies but `relrowsecurity=false` (policies not enforced).
6. **Add RLS to `contacts`** — 17,100 rows (68 MB), RLS=false; most valuable table in the DB, currently wide-open to whatever role touches it.
7. **Drop 4 dead views:** `ai_rating_analytics`, `experiment_promotion_eligibility`, `fred_calibration_by_type`, `fred_calibration_metrics` — all sourced from empty tables, return zero rows.
8. **Drop 2 empty matviews** (`benchmark_industry_aggregates`, `benchmark_stage_aggregates`) + `refresh_benchmark_aggregates()` function — all their source data is empty.
9. **Clean up dead columns** in populated tables: `fred_audit_log` has 13/22 dead columns (never-populated scoring + token tracking); `fred_decision_log` has 6 dead (outcome side never closed); `profiles` has 7 dead onboarding fields; `push_notification_logs` never tracks clicks or errors; `fred_red_flags` never marks any resolved.
10. **Investigate active-but-undocumented writes:** `next_steps` had 80+ updates today from one user (07d19f61...) — confirm this is legit traffic vs an autopilot loop that should be gated. `email_sends` sent 10 `re_engagement` emails today at 14:00 UTC — confirm that job is safe to run against the pollution-heavy user list.

**Net effect of proposed cleanup: ~76 MB → ~72 MB on disk, 106 tables → ~24 tables (77% reduction), 251 policies → ~100 policies, the schema becomes legible.**

---

*End of inventory. No writes were performed against the database during this audit. All data was collected via SELECT-only queries against `public.*`, `auth.users` (aggregate only), `pg_class`, `pg_namespace`, `pg_depend`, `pg_rewrite`, `pg_matviews`, `pg_policy`, `pg_proc`, `pg_stat_user_tables`, `information_schema.columns`, `information_schema.tables`, `information_schema.triggers`, `information_schema.table_constraints`, `information_schema.key_column_usage`, `information_schema.constraint_column_usage`, `information_schema.views`.*
