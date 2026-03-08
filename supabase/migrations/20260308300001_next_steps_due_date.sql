-- Add due_date and overdue tracking to next_steps for accountability
-- Phase 89: Deadline-driven accountability

ALTER TABLE next_steps ADD COLUMN IF NOT EXISTS due_date TIMESTAMPTZ;
ALTER TABLE next_steps ADD COLUMN IF NOT EXISTS reminder_sent BOOLEAN DEFAULT FALSE;
ALTER TABLE next_steps ADD COLUMN IF NOT EXISTS days_until_due INTEGER GENERATED ALWAYS AS (
  CASE WHEN due_date IS NOT NULL AND completed = FALSE
    THEN EXTRACT(DAY FROM due_date - NOW())::INTEGER
    ELSE NULL
  END
) STORED;

-- Index for efficient overdue queries in cron jobs
CREATE INDEX IF NOT EXISTS idx_next_steps_due_date_active
  ON next_steps (due_date)
  WHERE completed = FALSE AND dismissed = FALSE AND due_date IS NOT NULL;

COMMENT ON COLUMN next_steps.due_date IS 'Optional deadline for accountability. Set by FRED extraction or user.';
COMMENT ON COLUMN next_steps.reminder_sent IS 'Whether an overdue reminder has been sent for this step.';
