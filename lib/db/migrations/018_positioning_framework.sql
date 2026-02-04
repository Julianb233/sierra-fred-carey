-- Positioning Readiness Framework
-- Evaluates market positioning clarity with A-F grading

CREATE TABLE IF NOT EXISTS positioning_assessments (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,

  -- Overall scores
  positioning_grade VARCHAR(2) NOT NULL CHECK (positioning_grade IN ('A', 'B', 'C', 'D', 'F')),
  narrative_tightness_score INTEGER NOT NULL CHECK (narrative_tightness_score >= 1 AND narrative_tightness_score <= 10),

  -- Category 1: Clarity (30% weight)
  clarity_score INTEGER NOT NULL CHECK (clarity_score >= 0 AND clarity_score <= 100),
  clarity_grade VARCHAR(2) CHECK (clarity_grade IN ('A', 'B', 'C', 'D', 'F')),
  clarity_one_sentence BOOLEAN DEFAULT FALSE, -- Can explain in one sentence without jargon
  clarity_customer_pov BOOLEAN DEFAULT FALSE, -- Problem from customer's POV
  clarity_solution_fit BOOLEAN DEFAULT FALSE, -- Solution maps to problem
  clarity_specific_target BOOLEAN DEFAULT FALSE, -- Target specific enough to identify
  clarity_feedback TEXT,

  -- Category 2: Differentiation (25% weight)
  differentiation_score INTEGER NOT NULL CHECK (differentiation_score >= 0 AND differentiation_score <= 100),
  differentiation_grade VARCHAR(2) CHECK (differentiation_grade IN ('A', 'B', 'C', 'D', 'F')),
  differentiation_vs_alternatives BOOLEAN DEFAULT FALSE, -- Clear why solution exists vs alternatives
  differentiation_competitor_awareness BOOLEAN DEFAULT FALSE, -- Aware of direct/indirect competitors
  differentiation_why_you BOOLEAN DEFAULT FALSE, -- Why you articulated credibly
  differentiation_feedback TEXT,

  -- Category 3: Market Understanding (20% weight)
  market_understanding_score INTEGER NOT NULL CHECK (market_understanding_score >= 0 AND market_understanding_score <= 100),
  market_understanding_grade VARCHAR(2) CHECK (market_understanding_grade IN ('A', 'B', 'C', 'D', 'F')),
  market_landscape_understood BOOLEAN DEFAULT FALSE, -- Understands landscape
  market_problem_validated BOOLEAN DEFAULT FALSE, -- Problem validated through real interaction
  market_current_solutions BOOLEAN DEFAULT FALSE, -- Knows how customers currently solve
  market_understanding_feedback TEXT,

  -- Category 4: Narrative Strength (25% weight)
  narrative_strength_score INTEGER NOT NULL CHECK (narrative_strength_score >= 0 AND narrative_strength_score <= 100),
  narrative_strength_grade VARCHAR(2) CHECK (narrative_strength_grade IN ('A', 'B', 'C', 'D', 'F')),
  narrative_coherent BOOLEAN DEFAULT FALSE, -- Story coherent and compelling
  narrative_why_now BOOLEAN DEFAULT FALSE, -- Clear why now
  narrative_creates_urgency BOOLEAN DEFAULT FALSE, -- Creates curiosity or urgency
  narrative_strength_feedback TEXT,

  -- Gaps identified
  gaps JSONB DEFAULT '[]',
  -- Format: [{"category": "clarity", "gap": "...", "severity": "high"}]

  -- Next actions to improve
  next_actions JSONB DEFAULT '[]',
  -- Format: [{"action": "...", "priority": 1, "expected_impact": "high"}]

  -- Input data
  input_data JSONB NOT NULL,

  -- Source information (what was evaluated)
  source_type VARCHAR(50), -- 'conversation', 'pitch', 'deck', 'description'
  source_content TEXT,

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_positioning_user ON positioning_assessments(user_id);
CREATE INDEX IF NOT EXISTS idx_positioning_grade ON positioning_assessments(positioning_grade);
CREATE INDEX IF NOT EXISTS idx_positioning_created ON positioning_assessments(created_at DESC);
