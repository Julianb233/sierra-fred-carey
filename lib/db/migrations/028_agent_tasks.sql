-- Migration: Agent Tasks
-- Phase 04: Studio Tier Features
-- Created: 2026-02-06

-- Agent tasks table for tracking virtual agent work
CREATE TABLE IF NOT EXISTS agent_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  agent_type TEXT NOT NULL CHECK (agent_type IN ('founder_ops', 'fundraising', 'growth')),
  task_type TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'running', 'complete', 'failed', 'cancelled')),
  input JSONB NOT NULL DEFAULT '{}',
  output JSONB,
  error TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_agent_tasks_user ON agent_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_status ON agent_tasks(status);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_agent ON agent_tasks(agent_type);

-- Comments
COMMENT ON TABLE agent_tasks IS 'Virtual agent tasks with status tracking and JSONB input/output';
COMMENT ON COLUMN agent_tasks.agent_type IS 'Which specialist agent handles this task: founder_ops, fundraising, or growth';
COMMENT ON COLUMN agent_tasks.input IS 'Structured input data for the agent task';
COMMENT ON COLUMN agent_tasks.output IS 'Structured output data from the agent after completion';
