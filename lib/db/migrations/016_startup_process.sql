-- Startup Process table for tracking the 9-step Fred Cary methodology
-- From Idea to Traction with gated progression

CREATE TABLE IF NOT EXISTS startup_processes (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,

  -- Current step (1-9)
  current_step INTEGER NOT NULL DEFAULT 1 CHECK (current_step >= 1 AND current_step <= 9),

  -- Step completion status
  step_1_completed BOOLEAN DEFAULT FALSE, -- Define the Real Problem
  step_2_completed BOOLEAN DEFAULT FALSE, -- Identify Buyer and Environment
  step_3_completed BOOLEAN DEFAULT FALSE, -- Establish Founder Edge
  step_4_completed BOOLEAN DEFAULT FALSE, -- Define Simplest Viable Solution
  step_5_completed BOOLEAN DEFAULT FALSE, -- Validate Before Building
  step_6_completed BOOLEAN DEFAULT FALSE, -- Define First GTM Motion
  step_7_completed BOOLEAN DEFAULT FALSE, -- Install Execution Discipline
  step_8_completed BOOLEAN DEFAULT FALSE, -- Run Contained Pilot
  step_9_completed BOOLEAN DEFAULT FALSE, -- Decide What Earns the Right to Scale

  -- Step 1: Define the Real Problem
  problem_statement TEXT,
  problem_who TEXT,
  problem_frequency TEXT,
  problem_urgency TEXT,
  step_1_validated_at TIMESTAMP,

  -- Step 2: Identify Buyer and Environment
  economic_buyer TEXT,
  user_if_different TEXT,
  environment_context TEXT,
  step_2_validated_at TIMESTAMP,

  -- Step 3: Establish Founder Edge
  founder_edge TEXT,
  unique_insight TEXT,
  unfair_advantage TEXT,
  step_3_validated_at TIMESTAMP,

  -- Step 4: Define Simplest Viable Solution
  simplest_solution TEXT,
  explicitly_excluded TEXT,
  step_4_validated_at TIMESTAMP,

  -- Step 5: Validate Before Building
  validation_method TEXT,
  demand_evidence JSONB DEFAULT '[]',
  validation_results TEXT,
  step_5_validated_at TIMESTAMP,

  -- Step 6: Define First GTM Motion
  gtm_channel TEXT,
  gtm_approach TEXT,
  step_6_validated_at TIMESTAMP,

  -- Step 7: Install Execution Discipline
  weekly_priorities JSONB DEFAULT '[]',
  ownership_structure JSONB DEFAULT '{}',
  step_7_validated_at TIMESTAMP,

  -- Step 8: Run Contained Pilot
  pilot_definition TEXT,
  pilot_success_criteria TEXT,
  pilot_results JSONB DEFAULT '{}',
  step_8_validated_at TIMESTAMP,

  -- Step 9: Decide What Earns the Right to Scale
  what_worked JSONB DEFAULT '[]',
  what_didnt_work JSONB DEFAULT '[]',
  scale_decision VARCHAR(20) CHECK (scale_decision IN ('proceed', 'adjust', 'stop')),
  scale_reasoning TEXT,
  step_9_validated_at TIMESTAMP,

  -- Overall status
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'abandoned')),
  completion_percentage INTEGER DEFAULT 0,

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_startup_process_user ON startup_processes(user_id);
CREATE INDEX IF NOT EXISTS idx_startup_process_status ON startup_processes(status);
CREATE INDEX IF NOT EXISTS idx_startup_process_step ON startup_processes(current_step);

-- Step validation history (audit trail)
CREATE TABLE IF NOT EXISTS startup_process_validations (
  id SERIAL PRIMARY KEY,
  process_id INTEGER NOT NULL REFERENCES startup_processes(id) ON DELETE CASCADE,
  step_number INTEGER NOT NULL CHECK (step_number >= 1 AND step_number <= 9),
  validation_status VARCHAR(20) NOT NULL CHECK (validation_status IN ('passed', 'needs_work', 'blocked')),
  validation_feedback TEXT,
  blocker_reason TEXT,
  ai_assessment JSONB DEFAULT '{}',
  validated_by VARCHAR(50) DEFAULT 'ai', -- 'ai' or 'mentor'
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_process_validations_process ON startup_process_validations(process_id);
CREATE INDEX IF NOT EXISTS idx_process_validations_step ON startup_process_validations(step_number);
