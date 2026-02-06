-- Migration: Agent Tasks
-- Phase 04: Studio Tier Features
-- Created: 2026-02-06
--
-- Core table for tracking virtual agent task execution.
-- Each task dispatched to a specialist agent gets a row here.

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
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_agent_tasks_user ON agent_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_status ON agent_tasks(status);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_agent ON agent_tasks(agent_type);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_created ON agent_tasks(created_at DESC);

-- Comments
COMMENT ON TABLE agent_tasks IS 'Virtual agent task queue with status tracking and JSONB input/output';
COMMENT ON COLUMN agent_tasks.agent_type IS 'Which specialist agent handles this task';
COMMENT ON COLUMN agent_tasks.task_type IS 'Specific task category within the agent domain';
COMMENT ON COLUMN agent_tasks.input IS 'Structured input parameters for the agent';
COMMENT ON COLUMN agent_tasks.output IS 'Structured output from agent execution';
