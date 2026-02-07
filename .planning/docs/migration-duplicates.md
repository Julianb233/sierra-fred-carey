# Sahara v1.0 - Migration Duplicate Analysis

**Created:** 2026-02-06
**Purpose:** Document duplicate table definitions and conflicting migration numbers

---

## Duplicate Table Definitions

The following tables are defined in multiple migration files. All use `CREATE TABLE IF NOT EXISTS`,
so the duplicates are harmless at runtime - only the first definition takes effect.

### Tables Defined 3 Times
| Table | Files |
|-------|-------|
| ab_experiments | 007, 007_supabase, 008_create_missing |
| ab_variants | 007, 007_supabase, 008_create_missing |
| ai_insights | 007, 007_supabase, 008_create_missing |

### Tables Defined 2 Times
| Table | Files |
|-------|-------|
| ai_config | 007, 007_supabase |
| ai_prompts | 007, 007_supabase |
| ai_requests | 007, 007_supabase |
| ai_responses | 007, 007_supabase |

### Root Cause
- `007_unified_intelligence.sql` - Original schema (standard SQL)
- `007_unified_intelligence_supabase.sql` - Supabase-compatible variant of the same schema
- `008_create_missing_tables.sql` - Catch-all that re-defines tables already in 007

---

## Conflicting Migration Numbers

Three migration numbers have multiple files, which could cause issues with
ordered migration runners.

| Number | File A | File B |
|--------|--------|--------|
| 007 | `007_unified_intelligence.sql` | `007_unified_intelligence_supabase.sql` |
| 008 | `008_ai_ratings.sql` | `008_create_missing_tables.sql` |
| 009 | `009_journey_tables.sql` | `009_voice_agent_tables.sql` |
| 013 | `013_ab_promotion_audit.sql` | `013_experiment_promotions.sql` |

---

## Recommended Cleanup Strategy

### Phase 1: Consolidate Duplicates (Safe)
1. Remove `007_unified_intelligence.sql` (keep the Supabase variant as canonical)
2. Remove `008_create_missing_tables.sql` (all tables already defined in 007)
3. Rename conflicting files to have unique numbers

### Phase 2: Renumber Migrations (Requires Coordination)
Create a single consolidated migration file that replaces 001-035 with a clean,
sequential schema. Only do this AFTER confirming no migration runner depends on
the current numbering.

### Impact Assessment
- **Risk:** NONE for current deployment (Supabase migrations are run manually)
- **Impact:** Only affects developer experience and migration clarity
- **Priority:** LOW - address during next major version cleanup

---

*Generated: 2026-02-06*
