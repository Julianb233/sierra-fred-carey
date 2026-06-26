-- Automated Founder Progress Reports (AI-7489)
--
-- Distinct from `founder_reports` (a one-shot readiness EVALUATION of the idea
-- from the 9-step startup process). This table stores recurring PROGRESS
-- reports that summarize how far a founder has advanced through their
-- structured program (the 5-stage Oases journey + the 9-step Fred Cary
-- startup process + milestones + journey events), narrated in FRED's voice.
--
-- Purpose (from the Apr 8 Sahara Founders meeting): close the feedback loop,
-- show momentum, and drive monetization by recommending the next upgrade.

CREATE TABLE IF NOT EXISTS founder_progress_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Top-line outputs surfaced in the dashboard / email subject
  overall_percentage INTEGER NOT NULL DEFAULT 0
    CHECK (overall_percentage >= 0 AND overall_percentage <= 100),
  current_stage TEXT,
  steps_completed INTEGER NOT NULL DEFAULT 0,
  steps_total INTEGER NOT NULL DEFAULT 0,
  headline TEXT NOT NULL,
  subline TEXT,

  -- Period this report covers (for "since your last report" deltas)
  period_start TIMESTAMPTZ,
  period_end TIMESTAMPTZ DEFAULT NOW(),

  -- Raw aggregated snapshot used to build the report (auditable, no LLM).
  -- Shape mirrors FounderProgressSnapshot in lib/progress-report/types.ts.
  snapshot JSONB NOT NULL DEFAULT '{}',

  -- Full structured, narrated report payload (FRED-voice sections + CTAs).
  -- Shape mirrors ProgressReportPayload in lib/progress-report/types.ts.
  report_data JSONB NOT NULL DEFAULT '{}',

  -- Rendered HTML (what was emailed + what /progress-report/[id] serves)
  html TEXT NOT NULL DEFAULT '',

  -- Monetization context for the next step
  recommended_tier TEXT CHECK (recommended_tier IN ('clarity', 'validate', 'accelerator')),
  recommended_tier_price_cents INTEGER,

  -- Generation tracking
  generation_status TEXT NOT NULL DEFAULT 'completed'
    CHECK (generation_status IN ('pending', 'generating', 'completed', 'failed')),
  generation_error TEXT,
  model_used TEXT,
  generation_duration_ms INTEGER,
  -- 'manual' (user clicked generate) vs 'scheduled' (weekly cron)
  trigger_source TEXT NOT NULL DEFAULT 'manual'
    CHECK (trigger_source IN ('manual', 'scheduled')),

  -- Email tracking
  emailed_at TIMESTAMPTZ,
  emailed_to TEXT,
  email_send_id TEXT,

  -- Sharing
  public_share_token TEXT UNIQUE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_founder_progress_reports_user
  ON founder_progress_reports(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_founder_progress_reports_share
  ON founder_progress_reports(public_share_token)
  WHERE public_share_token IS NOT NULL;

-- RLS: users read their own; service role writes
ALTER TABLE founder_progress_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own progress reports"
  ON founder_progress_reports FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role inserts progress reports"
  ON founder_progress_reports FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service role updates progress reports"
  ON founder_progress_reports FOR UPDATE
  USING (true);

COMMENT ON TABLE founder_progress_reports IS
  'AI-7489: Automated founder progress reports aggregating Oases journey + startup-process + milestone progress, narrated by Claude, emailed via Resend, viewable at /progress-report/[id].';
