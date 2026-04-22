-- Founder reports generated from completing the 9-step Fred Cary Startup Process
-- Stored so the user can re-read in dashboard, share via link, and so we can
-- track which scores correlate with paywall conversion.

CREATE TABLE IF NOT EXISTS founder_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  process_id INTEGER REFERENCES startup_processes(id) ON DELETE SET NULL,

  -- Top-line outputs surfaced in the dashboard
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
  verdict_headline TEXT NOT NULL,
  verdict_subline TEXT,
  executive_summary TEXT NOT NULL,

  -- Full structured report (per-step verdict, status pills, etc.)
  -- Shape: { steps: [{ stepNumber, status, answerSummary, verdict, killboxText? }, ...], grade: { score, verdictHeadline, verdictSubline }, executiveSummary, recommendedTier, recommendedTierPriceCents }
  report_data JSONB NOT NULL,

  -- Rendered HTML (what was emailed + what /reports/[id] serves)
  html TEXT NOT NULL,

  -- Paywall context for the next step
  recommended_tier TEXT CHECK (recommended_tier IN ('clarity', 'validate', 'accelerator')),
  recommended_tier_price_cents INTEGER,

  -- Generation tracking
  generation_status TEXT NOT NULL DEFAULT 'completed' CHECK (generation_status IN ('pending', 'generating', 'completed', 'failed')),
  generation_error TEXT,
  model_used TEXT,
  generation_duration_ms INTEGER,

  -- Email tracking
  emailed_at TIMESTAMPTZ,
  emailed_to TEXT,
  email_send_id TEXT,

  -- Sharing
  public_share_token TEXT UNIQUE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_founder_reports_user ON founder_reports(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_founder_reports_process ON founder_reports(process_id);
CREATE INDEX IF NOT EXISTS idx_founder_reports_share ON founder_reports(public_share_token) WHERE public_share_token IS NOT NULL;

-- RLS: users read their own; service role writes
ALTER TABLE founder_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own reports"
  ON founder_reports FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role inserts reports"
  ON founder_reports FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service role updates reports"
  ON founder_reports FOR UPDATE
  USING (true);

COMMENT ON TABLE founder_reports IS 'Founder readiness reports auto-generated from the 9-step startup process. Emailed to user via Resend, viewable in dashboard, shareable via public_share_token.';
