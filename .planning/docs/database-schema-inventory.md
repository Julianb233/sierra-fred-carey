# Sahara v1.0 - Database Schema Inventory

**Created:** 2026-02-06
**Purpose:** Classify all database tables as active (v1.0) or legacy (pre-v1.0)

---

## Active Tables (v1.0)

These tables are actively referenced in v1.0 application code.

### Core Auth & User
| Table | Migration | Used By |
|-------|-----------|---------|
| profiles | 032 | auth-helpers, onboard API, settings |
| user_subscriptions | 033 | subscriptions.ts, tier middleware |
| stripe_events | 034 | Stripe webhook handler |
| phone_verifications | 035 | SMS verify API |
| contact_submissions | 020 | Contact API, onboard/invite |

### FRED Cognitive Engine
| Table | Migration | Used By |
|-------|-----------|---------|
| fred_episodic_memory | 021 | fred-memory.ts |
| fred_semantic_memory | 021 | fred-memory.ts |
| fred_procedural_memory | 021 | fred-memory.ts |
| fred_decision_log | 021 | fred-memory.ts |
| fred_calibration_records | 023 | FRED scoring/calibration |

### Documents & Analysis
| Table | Migration | Used By |
|-------|-----------|---------|
| uploaded_documents | 024 | documents.ts, process-document |
| document_chunks | 024 | documents.ts (RAG embeddings) |
| investor_readiness_scores | 025 | IRS engine/db |
| pitch_reviews | 026 | pitch review API/db |
| strategy_documents | 027 | strategy API/db |
| investor_lens_evaluations | 017 | investor lens API |
| deck_reviews | 017 | investor lens deck review API |
| positioning_assessments | 018 | positioning API |

### Dashboard Features
| Table | Migration | Used By |
|-------|-----------|---------|
| agent_tasks | 028 | agent-tasks db, dashboard stats |
| sms_checkins | 029 | SMS db, dashboard stats |
| boardy_matches | 030 | boardy db/types |
| user_sms_preferences | 031 | SMS db, preferences API |
| milestones | 009 | journey API, milestone-list |
| journey_events | 009 | journey API |
| check_ins | 002 | check-ins API |
| diagnostic_states | 019 | diagnostic API |
| diagnostic_events | 019 | diagnostic API |

### AI Infrastructure
| Table | Migration | Used By |
|-------|-----------|---------|
| ai_config | 007 | AI config loader, AB testing |
| ai_prompts | 007 | admin prompts API, AI client |
| ab_experiments | 007 | AB testing system, admin API |
| ab_variants | 007 | AB testing system, admin API |
| ai_requests | 007 | AI logging, monitoring |
| ai_responses | 007 | AI logging, monitoring |
| ai_insights | 007 | insight extractor, journey API |
| ai_ratings | 008 | AI rating API, admin dashboard |
| notification_configs | 012 | notifications, alert notifier |
| notification_logs | 012 | notifications system |
| ab_promotion_audit_log | 013 | auto-promotion system |
| experiment_promotions | 013 | auto-promotion engine |

### Voice Agent (Admin)
| Table | Migration | Used By |
|-------|-----------|---------|
| voice_agent_config | 009 | voice agent admin API |
| knowledge_base | 009 | voice agent admin API |
| escalation_rules | 009 | voice agent admin API |
| voice_calls | 009 | voice agent admin API |

---

## Legacy Tables (Not Used in v1.0)

These tables exist in migrations but are NOT referenced by any v1.0 application code.
They were created for earlier platform iterations and have been superseded.

| Table | Migration | Superseded By | Notes |
|-------|-----------|--------------|-------|
| chat_messages | 002 | fred_episodic_memory | Old chat storage, replaced by FRED memory |
| reality_lens_analyses | 003 | /api/fred/reality-lens | Old analysis storage, now computed on-demand |
| investor_scores | 004 | investor_readiness_scores | Old scoring model, replaced in Phase 3 |
| documents | 005 | strategy_documents + uploaded_documents | Old unified doc table, split in Phase 3 |
| pitch_deck_reviews | 006 | pitch_reviews | Old review format, replaced in Phase 3 |
| video_rooms | 015 | - | Video calling feature not in v1.0 scope |
| video_participants | 015 | - | Video calling feature not in v1.0 scope |
| video_chat_messages | 015 | - | Video calling feature not in v1.0 scope |
| startup_processes | 016 | - | 9-step methodology tracker, not used in v1.0 |
| startup_process_validations | 016 | - | Step validation, not used in v1.0 |
| users | 014 | auth.users + profiles | Replaced by Supabase auth system |

### Recommendation
These 11 legacy tables are safe to drop in a future cleanup migration. They use
`CREATE TABLE IF NOT EXISTS` so they don't interfere with the active schema.
Do NOT drop them before confirming no production data exists in them.

---

## Statistics
- **Total unique tables:** 54
- **Active (v1.0):** 43
- **Legacy (unused):** 11
- **Migration files:** 37

---

*Generated: 2026-02-06*
