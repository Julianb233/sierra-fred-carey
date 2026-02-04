-- Reality Lens analyses table
CREATE TABLE IF NOT EXISTS reality_lens_analyses (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  idea TEXT NOT NULL,
  stage VARCHAR(100),
  market VARCHAR(255),
  overall_score INTEGER NOT NULL CHECK (overall_score >= 0 AND overall_score <= 100),
  feasibility_score INTEGER NOT NULL CHECK (feasibility_score >= 0 AND feasibility_score <= 100),
  feasibility_analysis TEXT,
  economics_score INTEGER NOT NULL CHECK (economics_score >= 0 AND economics_score <= 100),
  economics_analysis TEXT,
  demand_score INTEGER NOT NULL CHECK (demand_score >= 0 AND demand_score <= 100),
  demand_analysis TEXT,
  distribution_score INTEGER NOT NULL CHECK (distribution_score >= 0 AND distribution_score <= 100),
  distribution_analysis TEXT,
  timing_score INTEGER NOT NULL CHECK (timing_score >= 0 AND timing_score <= 100),
  timing_analysis TEXT,
  strengths JSONB DEFAULT '[]',
  weaknesses JSONB DEFAULT '[]',
  recommendations JSONB DEFAULT '[]',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reality_lens_user ON reality_lens_analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_reality_lens_created ON reality_lens_analyses(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reality_lens_score ON reality_lens_analyses(overall_score DESC);
