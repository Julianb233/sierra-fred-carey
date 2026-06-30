-- 003_ai_cost_telemetry.sql  (AI-7363)
--
-- Unblocks AI platform cost monitoring (Claude vs Gemini).
--
-- `lib/ai/logging.ts` INSERTs columns that don't exist on the live
-- `ai_requests` / `ai_responses` tables, so every telemetry row was silently
-- dropped (the error is caught and swallowed). With no rows, the cost report
-- and the /admin/ai-costs dashboard stay empty. This migration adds the missing
-- columns so the logging layer persists usage + per-request estimated cost.
--
-- Fully additive and idempotent — safe to run multiple times. No data loss.

-- ai_responses: persist the input/output split + computed cost + finish reason.
ALTER TABLE ai_responses ADD COLUMN IF NOT EXISTS output_tokens  INTEGER;
ALTER TABLE ai_responses ADD COLUMN IF NOT EXISTS finish_reason  TEXT;
ALTER TABLE ai_responses ADD COLUMN IF NOT EXISTS estimated_cost NUMERIC(12, 6);

-- ai_requests: the logging layer references session_id + input_tokens, and omits
-- input_data. Add the columns and relax the NOT NULL so inserts succeed.
ALTER TABLE ai_requests  ADD COLUMN IF NOT EXISTS session_id   UUID;
ALTER TABLE ai_requests  ADD COLUMN IF NOT EXISTS input_tokens INTEGER;
ALTER TABLE ai_requests  ALTER COLUMN input_data DROP NOT NULL;

-- Indexes that back the cost-monitor aggregation queries (by window + provider).
CREATE INDEX IF NOT EXISTS idx_ai_responses_created_at ON ai_responses(created_at);
CREATE INDEX IF NOT EXISTS idx_ai_responses_provider   ON ai_responses(provider);
CREATE INDEX IF NOT EXISTS idx_ai_requests_created_at  ON ai_requests(created_at);
