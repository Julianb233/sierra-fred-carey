-- Investor Score table for tracking investor readiness assessments
CREATE TABLE IF NOT EXISTS investor_scores (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,

  -- Overall assessment
  overall_score INTEGER NOT NULL CHECK (overall_score >= 0 AND overall_score <= 100),
  readiness_level VARCHAR(50) NOT NULL,

  -- Dimension scores (0-100)
  team_score INTEGER NOT NULL CHECK (team_score >= 0 AND team_score <= 100),
  team_feedback TEXT NOT NULL,
  team_priority VARCHAR(10) NOT NULL CHECK (team_priority IN ('low', 'medium', 'high')),

  traction_score INTEGER NOT NULL CHECK (traction_score >= 0 AND traction_score <= 100),
  traction_feedback TEXT NOT NULL,
  traction_priority VARCHAR(10) NOT NULL CHECK (traction_priority IN ('low', 'medium', 'high')),

  market_score INTEGER NOT NULL CHECK (market_score >= 0 AND market_score <= 100),
  market_feedback TEXT NOT NULL,
  market_priority VARCHAR(10) NOT NULL CHECK (market_priority IN ('low', 'medium', 'high')),

  product_score INTEGER NOT NULL CHECK (product_score >= 0 AND product_score <= 100),
  product_feedback TEXT NOT NULL,
  product_priority VARCHAR(10) NOT NULL CHECK (product_priority IN ('low', 'medium', 'high')),

  financials_score INTEGER NOT NULL CHECK (financials_score >= 0 AND financials_score <= 100),
  financials_feedback TEXT NOT NULL,
  financials_priority VARCHAR(10) NOT NULL CHECK (financials_priority IN ('low', 'medium', 'high')),

  legal_score INTEGER NOT NULL CHECK (legal_score >= 0 AND legal_score <= 100),
  legal_feedback TEXT NOT NULL,
  legal_priority VARCHAR(10) NOT NULL CHECK (legal_priority IN ('low', 'medium', 'high')),

  materials_score INTEGER NOT NULL CHECK (materials_score >= 0 AND materials_score <= 100),
  materials_feedback TEXT NOT NULL,
  materials_priority VARCHAR(10) NOT NULL CHECK (materials_priority IN ('low', 'medium', 'high')),

  network_score INTEGER NOT NULL CHECK (network_score >= 0 AND network_score <= 100),
  network_feedback TEXT NOT NULL,
  network_priority VARCHAR(10) NOT NULL CHECK (network_priority IN ('low', 'medium', 'high')),

  -- Recommendations
  top_priorities JSONB NOT NULL,
  next_steps JSONB NOT NULL,

  -- Input data for reference
  input_data JSONB NOT NULL,

  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Index for fast user lookups
  INDEX idx_user_scores (user_id, created_at DESC)
);

-- Grant permissions (adjust based on your database user)
-- GRANT SELECT, INSERT ON investor_scores TO your_app_user;
-- GRANT USAGE, SELECT ON SEQUENCE investor_scores_id_seq TO your_app_user;
