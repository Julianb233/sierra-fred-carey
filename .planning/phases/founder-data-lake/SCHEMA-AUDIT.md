# Founder Data Lake -- Schema Audit Report

**Auditor:** code-reviewer
**Date:** 2026-02-11
**Documents reviewed:** SCHEMA-DESIGN.md, DATA-EXTRACTION-SPEC.md
**Existing tables verified:** `fred_semantic_memory` (021), `voice_calls` (009), `strategy_documents` (027), `profiles` (001+032+037+050), `enrichment/extractor.ts`
**Overall Assessment:** STRONG DESIGN -- 3 BLOCKERs, 5 WARNINGs, 4 SUGGESTIONs

---

## Executive Summary

The schema design is comprehensive, well-researched, and demonstrates deep understanding of the existing data architecture. The gap analysis (Section 2) is accurate and thorough. The versioning strategy, staleness tracking, and extraction pipeline are well-designed. However, there are several correctness issues with the triggers, a potential data integrity problem with the versioning approach, and some operational concerns.

---

## 1. Versioning Correctness

### BLOCKER: Versioning is application-layer only -- race condition on concurrent writes

**Section 3.1, Versioning Logic (line 129-139)**

The versioning strategy is:
1. Check if current record exists for `(user_id, category, field_key)`
2. If exists and value differs: UPDATE old to `is_current = false`, INSERT new with `version = old_version + 1`
3. If not exists: INSERT with `version = 1`

This is a classic check-then-act race condition. Two concurrent extractions (e.g., heuristic + AI for the same conversation) could both read `version = 1` as current, both try to supersede it, and produce two `version = 2` records. The partial unique index `idx_fdp_current_unique` on `(user_id, category, field_key) WHERE is_current = true` will prevent both from being `is_current = true` simultaneously (one INSERT will fail with a unique violation), but the error handling for this case is not specified.

**Fix options:**
1. **Advisory lock:** Use `pg_advisory_xact_lock(hashtext(user_id || category || field_key))` at the start of the version-bump transaction to serialize writes per field
2. **UPSERT approach:** Use `INSERT ... ON CONFLICT ON CONSTRAINT idx_fdp_current_unique DO UPDATE SET ...` -- but this would need restructuring since you want to preserve the old row
3. **Single transaction:** Wrap the check-supersede-insert in `BEGIN/COMMIT` with `SELECT ... FOR UPDATE` on the current row to get a row lock
4. **Accept the race:** Document that the partial unique index is the safety net, catch the unique violation in application code, and retry

Recommended: Option 3 (row lock in transaction). Pseudocode:
```sql
BEGIN;
  SELECT id, version FROM founder_data_points
    WHERE user_id = $1 AND category = $2 AND field_key = $3 AND is_current = true
    FOR UPDATE;
  -- Now this row is locked; other transactions wait
  UPDATE ... SET is_current = false, superseded_at = now() WHERE id = $old_id;
  INSERT ... (version = $old_version + 1, is_current = true);
COMMIT;
```

### WARNING: `version` column has no DB-level guarantee of monotonicity

The `version INTEGER NOT NULL DEFAULT 1` has no CHECK constraint or sequence backing it. Application code is responsible for incrementing it correctly. If a bug sets version incorrectly, there's no DB-level protection.

**Fix:** Add `CHECK (version >= 1)` and consider adding an index on `(user_id, category, field_key, version)` with a comment that uniqueness is enforced by the application (since historical records share the same triple but differ on version).

---

## 2. RLS on Data Points

### PASS: RLS design is correct and matches existing patterns

All 5 new tables have:
- `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`
- User-scoped SELECT/INSERT/UPDATE/DELETE policies using `auth.uid() = user_id`
- Service role bypass using `auth.jwt() ->> 'role' = 'service_role'`

This matches the pattern from `040_rls_hardening.sql` and `021_fred_memory_schema.sql`.

### WARNING: `founder_data_history` allows user SELECT but not INSERT/UPDATE/DELETE

The design says "History is insert-only from the service layer" (Section 4.2) with only a SELECT policy for users. This is correct, but there's no explicit INSERT policy for users. If the extraction runs through the service client (which it should), this is fine. But if any code path ever tries to write history using a user-scoped client, it will silently fail.

**Recommendation:** This is intentional and correct. Just add a comment in the migration noting that history writes are service-role only.

### WARNING: `document_data_dependencies` SELECT policy uses a subquery JOIN to `living_documents`

```sql
USING (
  EXISTS (
    SELECT 1 FROM living_documents ld
    WHERE ld.id = document_data_dependencies.document_id
    AND ld.user_id = auth.uid()
  )
);
```

This requires `living_documents` to also have a SELECT policy for the user. If `living_documents` RLS blocks the subquery, the dependencies become invisible even to the owning user. Since `living_documents` does have a user SELECT policy, this works. But the dependency between RLS policies should be documented.

---

## 3. Extraction Pipeline Reliability

### BLOCKER: `update_document_staleness()` trigger has a correctness bug

**Section 8.1 (lines 716-777)**

The trigger function references `NEW.category` and `NEW.new_data_point_id` -- these are columns on the `founder_data_history` table (since the trigger fires `AFTER INSERT ON founder_data_history`). However, the subquery:

```sql
WHERE data_point_category = NEW.category
  AND data_point_field_key = (
    SELECT field_key FROM founder_data_points WHERE id = NEW.new_data_point_id
  )
```

Makes an extra query to look up `field_key` from `founder_data_points`, but `field_key` IS a column on `founder_data_history` itself (`NEW.field_key`). This is an unnecessary lookup that could fail if the data point is somehow deleted between the history insert and the trigger execution (FK is `ON DELETE CASCADE`, but `old_data_point_id` is `ON DELETE SET NULL`, and `new_data_point_id` is `ON DELETE CASCADE`).

**Fix:** Use `NEW.field_key` directly:
```sql
WHERE data_point_category = NEW.category
  AND data_point_field_key = NEW.field_key
```

### WARNING: Staleness trigger could be expensive at scale

The `update_document_staleness()` trigger fires on EVERY `founder_data_history` insert. For each change, it:
1. Queries `document_data_dependencies` to find affected documents
2. For EACH affected document: counts total deps, counts stale deps (joining history + living_documents)
3. Updates each living_document

With ~10 documents per user and ~5 deps per document, a single data point change could trigger 10+ UPDATE statements. If an extraction produces 15 facts at once, that's 150+ UPDATEs.

**Fix options:**
1. **Batch staleness update:** Instead of a trigger, compute staleness in the extraction worker AFTER all data points are written (one batch update per extraction run)
2. **Debounce via materialized view:** Replace the trigger with a periodic refresh (every 5 min) of a materialized view
3. **Accept and optimize:** The trigger approach is correct for real-time accuracy. Add indexes and test at expected scale (50-200 data points, 5-20 documents per user)

**Recommendation:** Option 1 (batch in extraction worker) is the safest for v1. Convert to trigger later if real-time staleness becomes a requirement.

### PASS: Extraction queue design is solid

The `data_extraction_queue` table handles the worker pattern well:
- `extraction_status` CHECK constraint limits to valid states
- `retry_count` enables retry logic
- Partial index on `pending` status for fast worker queries
- Source dedup index on `(source_type, source_id)` prevents duplicate extractions
- `error_message` for debugging failed extractions

---

## 4. Voice/Chat Unification

### BLOCKER: `voice_calls` has no `user_id` column -- ALTER requires migration coordination

**Section 3.6 (line 352-358)**

The design proposes:
```sql
ALTER TABLE voice_calls
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
```

This is correct and necessary. However:
- The `voice_calls` table was created in migration `009_voice_agent_tables.sql` with no `user_id` (only `caller_id TEXT`)
- There is no existing mechanism to resolve `caller_id` to a `user_id` -- the voice agent identifies callers by `caller_id TEXT` which appears to be a LiveKit participant identity string
- The DATA-EXTRACTION-SPEC (Section 5.2, step 2b) says "Set voice_calls.user_id (NEW - requires linking caller to auth user)" but does NOT specify HOW this linking happens

**Fix:** The migration needs to:
1. Add the `user_id` column (as designed)
2. Document the caller-to-user resolution strategy (either: resolve from LiveKit participant metadata at call start, or use `room_name` which may encode user info, or require the voice agent to pass user JWT)
3. Add a backfill strategy for existing voice_calls rows (if any have transcripts)

Without this resolution, voice transcript extractions will have no `user_id` and cannot be associated with a founder.

---

## 5. Scale Readiness

### PASS: Expected scale is well within PostgreSQL comfort zone

The design correctly notes (Section 10): ~50-200 data points per user, ~5-20 documents per user, ~1-5 changes per conversation. This is trivially small for PostgreSQL.

### WARNING: `founder_data_summary` view uses a correlated subquery

**Section 9.2 (lines 833-851)**

```sql
jsonb_object_agg(
  category,
  (SELECT COUNT(*) FROM founder_data_points fp2
   WHERE fp2.user_id = fdp.user_id
     AND fp2.category = fdp.category
     AND fp2.is_current = true)
) as points_per_category
```

This is a correlated subquery inside an aggregate -- it runs the inner SELECT for every row in the outer GROUP BY. For 200 data points across 13 categories, this is ~2600 subquery executions per user query. At current scale this is fine, but it will not scale well if used in dashboards listing multiple users.

**Fix:** Rewrite using a CTE or window function:
```sql
CREATE OR REPLACE VIEW founder_data_summary AS
WITH category_counts AS (
  SELECT user_id, category, COUNT(*) as point_count
  FROM founder_data_points
  WHERE is_current = true
  GROUP BY user_id, category
)
SELECT
  user_id,
  SUM(point_count) as total_data_points,
  COUNT(DISTINCT category) as categories_populated,
  ...
  jsonb_object_agg(category, point_count) as points_per_category
FROM category_counts
GROUP BY user_id;
```

---

## 6. Data Integrity

### PASS: Backfill strategy is sound

The backfill from `profiles` and `fred_semantic_memory` (Section 6) uses `ON CONFLICT DO NOTHING` which prevents duplicate insertions on reruns. The category mapping from semantic memory categories to data lake categories is reasonable.

### WARNING: Backfill doesn't handle `fred_semantic_memory.value` being JSONB

The semantic memory `value` column is JSONB (it stores structured facts). The backfill does:
```sql
INSERT INTO founder_data_points (..., field_value, ...)
SELECT ..., value, ...
FROM fred_semantic_memory
```

This directly copies the JSONB `value` from semantic memory into `field_value`. However, the data lake taxonomy expects `field_value` to have a specific shape (e.g., `{ "value": "B2B SaaS" }` or `{ "value": 50000, "unit": "USD" }`). Semantic memory values may not conform to this shape -- they could be raw strings, numbers, or arbitrary JSONB structures.

**Fix:** The backfill should normalize values into the expected shape:
```sql
INSERT INTO founder_data_points (..., field_value, ...)
SELECT ...,
  CASE
    WHEN jsonb_typeof(value) = 'string' THEN jsonb_build_object('value', value)
    WHEN jsonb_typeof(value) = 'number' THEN jsonb_build_object('value', value)
    ELSE value
  END,
...
FROM fred_semantic_memory
```

---

## 7. Taxonomy Completeness

### PASS: Field key taxonomy is comprehensive

The DATA-EXTRACTION-SPEC defines 70+ field keys across 13 categories. Cross-referencing with the existing `extractProfileEnrichment()` extractor:

| Extractor field | Data Lake category.field_key | Mapped? |
|---|---|---|
| `industry` | `market.industry` | Yes |
| `revenueHint` | `financials.monthly_revenue` | Yes |
| `teamSizeHint` | `team.team_size` | Yes |
| `fundingHint` | `fundraising.funding_history` | Yes |
| `challenges` | `challenges.primary_challenge` | Yes |
| `competitorsMentioned` | `competition.competitors` | Yes |
| `metricsShared.MRR` | `metrics.mrr` | Yes |
| `metricsShared.ARR` | `metrics.arr` | Yes |
| `metricsShared.CAC` | `metrics.cac` | Yes |
| `metricsShared.LTV` | `metrics.ltv` | Yes |
| `metricsShared.Churn` | `customers.churn_rate` | Yes |
| `metricsShared.NPS` | `customers.nps` | Yes |
| `metricsShared.DAU` | `customers.dau` | Yes |
| `metricsShared.MAU` | `customers.mau` | Yes |
| `metricsShared.Burn Rate` | `metrics.burn_rate` | Yes |
| `metricsShared.Runway` | `financials.runway_months` | Yes |

All existing extractor fields map cleanly to the data lake taxonomy. Good.

### SUGGESTION: Duplicate fields across categories

Some fields appear in multiple categories:
- `cac` exists in both `gtm.cac` AND `metrics.cac`
- `burn_rate` exists in both `financials.burn_rate` AND `metrics.burn_rate`
- `monthly_revenue` in `financials` and `mrr` in `metrics` are the same thing

This could cause confusion: which category.field_key is the canonical one? The extraction AI might write to either, leading to split data.

**Fix:** Document canonical locations for each metric and map aliases in the extraction layer:
```
"mrr" -> financials.monthly_revenue (canonical)
"cac" -> financials.cac (canonical), gtm.cac is derived
```

---

## 8. Security Considerations

### PASS: JSONB `field_value` sanitization documented

Section 11.4 correctly notes that JSONB values must be sanitized before AI prompt injection using `sanitizeUserInput()`.

### PASS: GDPR deletion cascade verified

All tables use `user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE`, ensuring user deletion propagates through the entire data lake. The `voice_calls` ALTER uses `ON DELETE SET NULL` which is appropriate (preserving call records without PII).

### SUGGESTION: `data_extraction_queue.raw_content` stores raw conversation text

This is user-generated content that may contain PII (names, emails, phone numbers mentioned in conversation). The design notes "purged after 30 days" (Section 10, item 3) but there is no mechanism specified for this purge.

**Fix:** Add a scheduled job or Supabase Edge Function that runs daily:
```sql
DELETE FROM data_extraction_queue
WHERE extraction_status IN ('completed', 'failed')
AND created_at < now() - INTERVAL '30 days';
```

---

## 9. Operational Concerns

### SUGGESTION: No retry backoff strategy for failed extractions

The `data_extraction_queue` has `retry_count` but the DATA-EXTRACTION-SPEC doesn't specify:
- Maximum retries before giving up
- Backoff strategy (exponential, linear, fixed)
- Whether failed items should be re-enqueued or stay as `failed`

**Fix:** Document: max 3 retries, exponential backoff (1min, 5min, 15min), items beyond max retries stay as `failed` for manual investigation.

### SUGGESTION: No index on `founder_data_points.extracted_at` for confidence decay

Section 4 of the DATA-EXTRACTION-SPEC describes confidence decay based on `extracted_at`. The weekly decay job needs to scan all current data points and check their `extracted_at`. The existing indexes don't support this well.

**Fix:** Add index:
```sql
CREATE INDEX idx_fdp_extracted_at
  ON founder_data_points(extracted_at)
  WHERE is_current = true;
```

---

## Issue Summary

### BLOCKERs (3)

| # | Issue | Impact |
|---|-------|--------|
| B1 | Versioning race condition on concurrent writes | Could produce duplicate versions or unique constraint violations |
| B2 | `update_document_staleness()` trigger uses unnecessary subquery instead of `NEW.field_key` | Trigger could fail if data point is deleted between history insert and trigger |
| B3 | `voice_calls.user_id` ALTER needs caller-to-user resolution strategy | Voice extractions cannot be associated with founders without this |

### WARNINGs (5)

| # | Issue |
|---|-------|
| W1 | `version` column has no CHECK constraint |
| W2 | `founder_data_history` INSERT-only design should be documented in migration |
| W3 | `document_data_dependencies` RLS depends on `living_documents` RLS (cross-table dependency) |
| W4 | Staleness trigger could generate many UPDATEs per extraction batch |
| W5 | Backfill doesn't normalize `fred_semantic_memory.value` JSONB shape |

### SUGGESTIONs (4)

| # | Issue |
|---|-------|
| S1 | Duplicate fields across categories (cac, burn_rate, revenue) need canonical mapping |
| S2 | `data_extraction_queue` purge job needs to be specified |
| S3 | No retry backoff strategy documented |
| S4 | Missing `extracted_at` index for confidence decay job |

---

## Verdict

**STRONG DESIGN** -- This is a well-thought-out data architecture that addresses real gaps in the product. The gap analysis is accurate, the taxonomy is comprehensive, and the extraction pipeline design is solid. The 3 BLOCKERs are fixable without redesign: the versioning race needs a row lock, the staleness trigger has a minor bug, and the voice-to-user linking needs a resolution strategy. The WARNINGs are all about hardening and documentation. Ready for implementation after addressing BLOCKERs.
