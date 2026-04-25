-- AI-8663: Add source_session_id to next_steps so the "View conversation"
-- link on the Next Steps page can deep-link back to the FRED chat session
-- that produced each step.
--
-- Older rows will have NULL — the UI falls back to the most-recent session
-- in that case (handled by the chat hydration logic).

ALTER TABLE next_steps
  ADD COLUMN IF NOT EXISTS source_session_id UUID;

CREATE INDEX IF NOT EXISTS idx_next_steps_source_session_id
  ON next_steps(source_session_id);

COMMENT ON COLUMN next_steps.source_session_id IS
  'fred_episodic_memory.session_id of the conversation that produced this step. NULL for legacy rows captured before AI-8663.';
