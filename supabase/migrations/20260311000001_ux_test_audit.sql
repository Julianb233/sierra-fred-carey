-- UX Test Audit Log
-- Stores comprehensive browser-based test results for every user journey.
-- Used by Stagehand QA agents and queryable by admins to track quality over time.

-- Test runs (one per audit session)
CREATE TABLE IF NOT EXISTS ux_test_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_name TEXT NOT NULL,
  run_type TEXT NOT NULL DEFAULT 'stagehand',  -- stagehand, manual, playwright
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'passed', 'failed', 'partial')),
  total_tests INTEGER NOT NULL DEFAULT 0,
  passed INTEGER NOT NULL DEFAULT 0,
  failed INTEGER NOT NULL DEFAULT 0,
  skipped INTEGER NOT NULL DEFAULT 0,
  environment TEXT NOT NULL DEFAULT 'production',  -- production, preview, local
  base_url TEXT NOT NULL,
  git_sha TEXT,
  milestone TEXT,  -- e.g. "v7.0"
  phase TEXT,      -- e.g. "72"
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Individual test results (one per step/assertion)
CREATE TABLE IF NOT EXISTS ux_test_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES ux_test_runs(id) ON DELETE CASCADE,
  feature TEXT NOT NULL,           -- e.g. "feedback-widget", "admin-dashboard", "consent-flow"
  scenario TEXT NOT NULL,          -- e.g. "thumbs-up-good-idea", "thumbs-down-bad-advice"
  step_number INTEGER NOT NULL,
  step_description TEXT NOT NULL,  -- e.g. "Click thumbs up on FRED response about metrics"
  status TEXT NOT NULL CHECK (status IN ('pass', 'fail', 'skip', 'error')),
  expected TEXT,                   -- what should happen
  actual TEXT,                     -- what actually happened
  error_message TEXT,              -- error details if failed
  screenshot_url TEXT,             -- BrowserBase screenshot URL
  page_url TEXT,                   -- URL at time of test
  load_time_ms INTEGER,           -- page load time
  user_input TEXT,                 -- what the test typed/clicked
  fred_response TEXT,              -- FRED's response (for gauging quality)
  response_quality TEXT CHECK (response_quality IN ('excellent', 'good', 'acceptable', 'poor', 'terrible', NULL)),
  response_relevance TEXT CHECK (response_relevance IN ('highly_relevant', 'relevant', 'somewhat_relevant', 'irrelevant', NULL)),
  response_tone TEXT CHECK (response_tone IN ('encouraging', 'neutral', 'too_harsh', 'too_vague', 'patronizing', NULL)),
  severity TEXT CHECK (severity IN ('critical', 'high', 'medium', 'low', NULL)),
  category TEXT,                   -- e.g. "ui", "response-quality", "performance", "accessibility"
  notes TEXT,                      -- tester observations
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes for querying
CREATE INDEX IF NOT EXISTS idx_ux_test_results_run_id ON ux_test_results(run_id);
CREATE INDEX IF NOT EXISTS idx_ux_test_results_feature ON ux_test_results(feature);
CREATE INDEX IF NOT EXISTS idx_ux_test_results_status ON ux_test_results(status);
CREATE INDEX IF NOT EXISTS idx_ux_test_results_severity ON ux_test_results(severity) WHERE severity IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ux_test_results_quality ON ux_test_results(response_quality) WHERE response_quality IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ux_test_runs_status ON ux_test_runs(status);
CREATE INDEX IF NOT EXISTS idx_ux_test_runs_milestone ON ux_test_runs(milestone);

-- RLS: service role only (admin/QA tooling)
ALTER TABLE ux_test_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ux_test_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on ux_test_runs"
  ON ux_test_runs FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access on ux_test_results"
  ON ux_test_results FOR ALL
  USING (auth.role() = 'service_role');
