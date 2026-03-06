# Debug Report: Journey Analyzer Score Persistence & Data Integrity

**Linear:** AI-1418
**Date:** 2026-03-05
**Status:** Fixed — awaiting migration application to production

---

## Root Cause

RLS policies on `journey_events` and `milestones` tables used `current_setting('app.user_id', true)` (migration 009), but the application **never calls `SET app.user_id = '...'`** on the PostgreSQL session. This means:

- `current_setting('app.user_id', true)` always returns `NULL`
- `NULL = any_value` is always `false` in SQL
- **All user-scoped reads and writes are silently blocked by RLS**

Routes using the service-role client (`createServiceClient()` or `sql` tag) were unaffected because they bypass RLS entirely. Only `fred/investor-readiness` (which uses the user-scoped `createClient()`) was directly impacted — its `journey_events` inserts were silently dropped.

---

## Fix Applied

### Migration 1: `20260305000001_fix_journey_rls_policies.sql` (already committed)

- Drops broken `current_setting`-based policies on `journey_events` and `milestones`
- Recreates them using `auth.uid()::text` (cast needed because `user_id` is TEXT, `auth.uid()` returns UUID)
- Adds missing `UPDATE`/`DELETE` policies on `journey_events`
- Adds `NOT NULL` constraint on `investor_readiness_scores.created_at`

### Migration 2: `20260305000002_fix_notification_rls_policies.sql` (new — this PR)

- **Same bug pattern** discovered on `notification_configs` and `notification_logs` tables (migration 012)
- Drops 5 broken `current_setting`-based policies
- Recreates with `auth.uid()::text`

---

## Full Route Audit: All `journey_events` Writers

| Route | Client | RLS Applied? | score_after | score_before | Fire & Forget? |
|-------|--------|-------------|-------------|--------------|----------------|
| `fred/investor-readiness` | `createClient()` (user-scoped) | **Yes** — fixed by migration 1 | `Math.round(overall)` | not written | Yes (.then) |
| `fred/chat` | `createServiceClient()` | No (bypass) | not written | not written | Yes (IIFE) |
| `journey/timeline` POST | `sql` (service) | No (bypass) | `?? null` (correct) | `?? null` (correct) | No (awaited) |
| `journey/milestones` POST | `sql` (service) | No (bypass) | not written | not written | No (awaited) |
| `journey/milestones/[id]` PATCH | `sql` (service) | No (bypass) | not written | not written | No (awaited) |
| `fred/reality-lens` | `sql` (service) | No (bypass) | `result.overallScore` | not written | Yes (IIFE) |
| `fred/pitch-review` | `createServiceClient()` | No (bypass) | `Math.round(overall)` | not written | Yes (.then) |
| `startup-process` PUT | `sql` (service) | No (bypass) | `completionPct` | not written | Yes (IIFE) |
| `investor-lens` | `sql` (service) | No (bypass) | not written | not written | No (try/catch) |
| `investor-lens/deck-review` | `sql` (service) | No (bypass) | `review.overallScore` | not written | No (try/catch) |
| `positioning` | `sql` (service) | No (bypass) | `Math.round(weighted)` | not written | No (try/catch) |

### Key Findings

1. **`||` operator bug is NOT present** — all routes correctly use `??` or direct expressions (no falsy-value corruption of score `0`)
2. **`score_before` is universally absent** — the column exists but no route writes to it. Delta tracking is impossible. (Low priority — not a bug, just unused capacity)
3. **`event_type` collision** — both `startup-process` and `milestones/[id]` emit `milestone_achieved` with different `event_data` shapes. Queries need to check `event_data.source` to distinguish.
4. **Mixed client pattern** in `investor-lens/` — writes use service-role, reads use user-scoped. Intentional but asymmetric.

---

## Test Results

- **Journey analyzer tests**: 63/63 passing
- **Full suite**: 723/865 passing (142 failures are all pre-existing — React.act compatibility issues in component tests, unrelated to journey/scores)

---

## Action Required: Apply Migrations to Production

Both migration files need to be applied to the production Supabase database:

```sql
-- Run in Supabase SQL Editor (https://supabase.com/dashboard/project/ggiywhpgzjdjeeldjdnp/sql)
-- 1. Apply journey fix (if not already applied)
-- Copy contents of: supabase/migrations/20260305000001_fix_journey_rls_policies.sql

-- 2. Apply notification fix
-- Copy contents of: supabase/migrations/20260305000002_fix_notification_rls_policies.sql
```

**Note:** No `supabase/config.toml` exists, so `supabase db push` cannot be used. Migrations must be applied manually via the Supabase dashboard SQL editor or a direct connection.

---

## Verification Checklist

- [x] Root cause identified (current_setting never set)
- [x] Fix migration for journey_events + milestones (20260305000001)
- [x] Fix migration for notification_configs + notification_logs (20260305000002)
- [x] All journey analyzer tests pass (63/63)
- [x] No new test regressions
- [x] Original migration files annotated with warnings
- [x] Full route audit completed — no || operator bugs found
- [ ] Migrations applied to production Supabase (manual step)
- [ ] Verify journey scores persist via live app testing

---

*Generated: 2026-03-05 | Linear: AI-1418*
