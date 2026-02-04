-- Enhanced Investor Lens with stage-specific evaluation
-- Implements the Fred Cary VC Evaluation Framework

CREATE TABLE IF NOT EXISTS investor_lens_evaluations (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,

  -- Stage context
  funding_stage VARCHAR(20) NOT NULL CHECK (funding_stage IN ('pre_seed', 'seed', 'series_a')),

  -- IC Verdict (Investment Committee)
  ic_verdict VARCHAR(20) NOT NULL CHECK (ic_verdict IN ('yes', 'no', 'not_yet')),
  ic_verdict_reasoning TEXT NOT NULL,

  -- Core VC Evaluation Axes (always-on)
  -- Team
  team_founder_market_fit_score INTEGER CHECK (team_founder_market_fit_score >= 0 AND team_founder_market_fit_score <= 100),
  team_learning_velocity_score INTEGER CHECK (team_learning_velocity_score >= 0 AND team_learning_velocity_score <= 100),
  team_ability_to_recruit_score INTEGER CHECK (team_ability_to_recruit_score >= 0 AND team_ability_to_recruit_score <= 100),
  team_feedback TEXT,

  -- Market
  market_size_score INTEGER CHECK (market_size_score >= 0 AND market_size_score <= 100),
  market_urgency_score INTEGER CHECK (market_urgency_score >= 0 AND market_urgency_score <= 100),
  market_timing_score INTEGER CHECK (market_timing_score >= 0 AND market_timing_score <= 100),
  market_feedback TEXT,

  -- Problem
  problem_painful_score INTEGER CHECK (problem_painful_score >= 0 AND problem_painful_score <= 100),
  problem_frequent_score INTEGER CHECK (problem_frequent_score >= 0 AND problem_frequent_score <= 100),
  problem_expensive_score INTEGER CHECK (problem_expensive_score >= 0 AND problem_expensive_score <= 100),
  problem_feedback TEXT,

  -- Solution & Differentiation
  solution_approach_score INTEGER CHECK (solution_approach_score >= 0 AND solution_approach_score <= 100),
  solution_vs_alternatives_score INTEGER CHECK (solution_vs_alternatives_score >= 0 AND solution_vs_alternatives_score <= 100),
  solution_why_now_score INTEGER CHECK (solution_why_now_score >= 0 AND solution_why_now_score <= 100),
  solution_feedback TEXT,

  -- Go-To-Market
  gtm_distribution_score INTEGER CHECK (gtm_distribution_score >= 0 AND gtm_distribution_score <= 100),
  gtm_repeatability_score INTEGER CHECK (gtm_repeatability_score >= 0 AND gtm_repeatability_score <= 100),
  gtm_feedback TEXT,

  -- Traction Quality
  traction_retention_score INTEGER CHECK (traction_retention_score >= 0 AND traction_retention_score <= 100),
  traction_usage_score INTEGER CHECK (traction_usage_score >= 0 AND traction_usage_score <= 100),
  traction_revenue_score INTEGER CHECK (traction_revenue_score >= 0 AND traction_revenue_score <= 100),
  traction_feedback TEXT,

  -- Business Model
  business_pricing_score INTEGER CHECK (business_pricing_score >= 0 AND business_pricing_score <= 100),
  business_margin_score INTEGER CHECK (business_margin_score >= 0 AND business_margin_score <= 100),
  business_scalability_score INTEGER CHECK (business_scalability_score >= 0 AND business_scalability_score <= 100),
  business_feedback TEXT,

  -- Fund Fit
  fund_fit_score INTEGER CHECK (fund_fit_score >= 0 AND fund_fit_score <= 100),
  fund_fit_feedback TEXT,

  -- Valuation Realism
  valuation_realism_score INTEGER CHECK (valuation_realism_score >= 0 AND valuation_realism_score <= 100),
  valuation_feedback TEXT,

  -- Hidden/Unspoken VC Filters (detected risks)
  hidden_filters JSONB DEFAULT '[]',
  -- Format: [{"filter": "outcome_size_mismatch", "detected": true, "explanation": "..."}]

  -- Top Pass Reasons (stage-adjusted)
  top_pass_reasons JSONB DEFAULT '[]',
  -- Format: [{"reason": "...", "evidence_to_flip": "..."}]

  -- De-risking Actions
  derisking_actions JSONB DEFAULT '[]',
  -- Format: [{"action": "...", "timeline": "30 days", "priority": "high"}]

  -- Stage-specific outputs
  -- Pre-Seed specific
  preseed_kill_signals JSONB DEFAULT '[]',
  preseed_30day_plan JSONB DEFAULT '[]',

  -- Seed specific
  seed_traction_quality_score INTEGER,
  seed_repeatability_score INTEGER,
  seed_series_a_clarity_score INTEGER,
  seed_milestone_map JSONB DEFAULT '[]',

  -- Series A specific
  seriesa_objections JSONB DEFAULT '[]',
  seriesa_90day_plan JSONB DEFAULT '[]',

  -- Deck review (if applicable)
  deck_requested BOOLEAN DEFAULT FALSE,
  deck_review_completed BOOLEAN DEFAULT FALSE,
  deck_premature_reason TEXT,

  -- Input data
  input_data JSONB NOT NULL,

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_investor_lens_user ON investor_lens_evaluations(user_id);
CREATE INDEX IF NOT EXISTS idx_investor_lens_stage ON investor_lens_evaluations(funding_stage);
CREATE INDEX IF NOT EXISTS idx_investor_lens_verdict ON investor_lens_evaluations(ic_verdict);
CREATE INDEX IF NOT EXISTS idx_investor_lens_created ON investor_lens_evaluations(created_at DESC);

-- Deck Review Protocol tracking
CREATE TABLE IF NOT EXISTS deck_reviews (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  investor_lens_id INTEGER REFERENCES investor_lens_evaluations(id),

  -- Deck metadata
  deck_url TEXT,
  deck_type VARCHAR(20) CHECK (deck_type IN ('summary', 'full_deck')),

  -- Review status
  review_status VARCHAR(20) DEFAULT 'pending' CHECK (review_status IN ('pending', 'reviewing', 'completed')),

  -- Slide-by-slide analysis
  slide_analysis JSONB DEFAULT '[]',

  -- IC-perspective review
  ic_review JSONB DEFAULT '{}',

  -- Objections and responses
  likely_objections JSONB DEFAULT '[]',
  best_responses JSONB DEFAULT '[]',

  -- Readiness assessment
  readiness_gaps JSONB DEFAULT '[]',

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_deck_reviews_user ON deck_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_deck_reviews_status ON deck_reviews(review_status);
