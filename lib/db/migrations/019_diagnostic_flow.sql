-- Diagnostic Introduction Flow tracking
-- Tracks silent diagnosis and framework introduction state per user

CREATE TABLE IF NOT EXISTS diagnostic_states (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL UNIQUE,

  -- Silent diagnosis scores (internal only, never shown to user)
  positioning_clarity VARCHAR(10) DEFAULT 'unknown' CHECK (positioning_clarity IN ('unknown', 'low', 'medium', 'high')),
  investor_readiness VARCHAR(10) DEFAULT 'unknown' CHECK (investor_readiness IN ('unknown', 'low', 'medium', 'high')),

  -- Framework introduction state
  positioning_framework_introduced BOOLEAN DEFAULT FALSE,
  positioning_framework_introduced_at TIMESTAMP,
  positioning_framework_trigger TEXT, -- What triggered the introduction

  investor_lens_introduced BOOLEAN DEFAULT FALSE,
  investor_lens_introduced_at TIMESTAMP,
  investor_lens_trigger TEXT, -- What triggered the introduction

  -- Signals detected (for triggering framework introduction)
  positioning_signals JSONB DEFAULT '[]',
  -- Format: [{"signal": "icp_vague", "detected_at": "...", "context": "..."}]

  investor_signals JSONB DEFAULT '[]',
  -- Format: [{"signal": "mentioned_fundraising", "detected_at": "...", "context": "..."}]

  -- Assessment history
  formal_assessments_offered BOOLEAN DEFAULT FALSE,
  formal_assessments_accepted BOOLEAN DEFAULT FALSE,

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_diagnostic_state_user ON diagnostic_states(user_id);
CREATE INDEX IF NOT EXISTS idx_diagnostic_positioning ON diagnostic_states(positioning_clarity);
CREATE INDEX IF NOT EXISTS idx_diagnostic_investor ON diagnostic_states(investor_readiness);

-- Diagnostic events log (for tracking framework introductions and transitions)
CREATE TABLE IF NOT EXISTS diagnostic_events (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,

  event_type VARCHAR(50) NOT NULL,
  -- Event types:
  -- 'signal_detected' - A positioning or investor signal was detected
  -- 'framework_introduced' - A framework was introduced
  -- 'assessment_completed' - A formal assessment was completed
  -- 'clarity_updated' - Positioning or investor clarity was updated

  framework VARCHAR(20), -- 'positioning' or 'investor'
  signal_type VARCHAR(50),
  signal_context TEXT,

  -- Before and after state (for audit)
  state_before JSONB DEFAULT '{}',
  state_after JSONB DEFAULT '{}',

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_diagnostic_events_user ON diagnostic_events(user_id);
CREATE INDEX IF NOT EXISTS idx_diagnostic_events_type ON diagnostic_events(event_type);
CREATE INDEX IF NOT EXISTS idx_diagnostic_events_created ON diagnostic_events(created_at DESC);
