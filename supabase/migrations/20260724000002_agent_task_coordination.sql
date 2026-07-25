-- Typed, attributable agent coordination fields.
-- Existing task APIs remain compatible; new fields make handoffs and proof
-- auditable without passing credentials through task input/output.

ALTER TABLE agent_tasks
  ADD COLUMN IF NOT EXISTS tenant_id UUID,
  ADD COLUMN IF NOT EXISTS correlation_id TEXT,
  ADD COLUMN IF NOT EXISTS run_id TEXT,
  ADD COLUMN IF NOT EXISTS capabilities_required TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS blockers JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS handoff JSONB,
  ADD COLUMN IF NOT EXISTS verifier JSONB,
  ADD COLUMN IF NOT EXISTS evidence JSONB;

UPDATE agent_tasks SET tenant_id = user_id WHERE tenant_id IS NULL;
UPDATE agent_tasks
SET correlation_id = 'legacy-task:' || id::text
WHERE correlation_id IS NULL;
UPDATE agent_tasks
SET run_id = 'legacy-run:' || id::text
WHERE run_id IS NULL;

ALTER TABLE agent_tasks
  ALTER COLUMN tenant_id SET NOT NULL,
  ALTER COLUMN correlation_id SET NOT NULL,
  ALTER COLUMN run_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_agent_tasks_tenant_correlation
  ON agent_tasks(tenant_id, correlation_id);

CREATE INDEX IF NOT EXISTS idx_agent_tasks_run
  ON agent_tasks(run_id);

COMMENT ON COLUMN agent_tasks.evidence IS
  'Redacted evidence references only; credentials and direct contact/payment identifiers are forbidden.';
