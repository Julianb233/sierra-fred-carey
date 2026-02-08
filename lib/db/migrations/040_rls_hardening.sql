-- Phase 27-01: RLS Security Hardening
-- Enable Row Level Security on all unprotected user-data tables
-- Date: 2026-02-08
--
-- Gap Analysis Summary:
-- ====================
-- Tables WITH RLS (already covered): ai_config, ai_prompts, ab_experiments,
--   ab_variants, ai_requests, ai_responses, ai_insights, ai_ratings,
--   notification_configs, notification_logs, experiment_promotions,
--   voice_agent_config, knowledge_base, escalation_rules, voice_calls,
--   milestones, journey_events, profiles, contact_submissions, fred_red_flags,
--   user_subscriptions, stripe_events, phone_verifications,
--   fred_calibration_records, fred_episodic_memory, fred_semantic_memory,
--   fred_procedural_memory, fred_decision_log, investor_lists, investors,
--   investor_matches, investor_match_scores, investor_outreach_sequences,
--   investor_pipeline
--
-- Tables WITHOUT RLS (addressed by this migration):
--   1. chat_messages         (user_id VARCHAR)
--   2. check_ins             (user_id VARCHAR)
--   3. reality_lens_analyses (user_id VARCHAR)
--   4. investor_scores       (user_id VARCHAR)
--   5. documents             (user_id VARCHAR)
--   6. pitch_deck_reviews    (user_id VARCHAR)
--   7. startup_processes     (user_id VARCHAR)
--   8. startup_process_validations (FK to startup_processes, no direct user_id)
--   9. investor_lens_evaluations   (user_id VARCHAR)
--  10. deck_reviews          (user_id VARCHAR)
--  11. positioning_assessments     (user_id VARCHAR)
--  12. diagnostic_states     (user_id VARCHAR, UNIQUE)
--  13. diagnostic_events     (user_id VARCHAR)
--  14. video_rooms           (host_user_id UUID)
--  15. video_participants    (user_id UUID, FK to rooms)
--  16. video_chat_messages   (FK to rooms/participants, no direct user_id)
--  17. ab_promotion_audit_log      (system table, user_id TEXT nullable)
--  18. uploaded_documents    (user_id UUID)
--  19. document_chunks       (FK to uploaded_documents, no direct user_id)
--  20. investor_readiness_scores   (user_id UUID)
--  21. pitch_reviews         (user_id UUID)
--  22. strategy_documents    (user_id UUID)
--  23. agent_tasks           (user_id UUID)
--  24. sms_checkins          (user_id UUID)
--  25. boardy_matches        (user_id UUID)
--  26. user_sms_preferences  (user_id UUID PK)
--  27. users                 (system table, no user_id -- self-referential)
--
-- NOTE: Many early tables use user_id VARCHAR (not UUID / auth.uid()).
-- For those tables, we use text-cast comparison: auth.uid()::text = user_id
-- This is safe because auth.uid() returns a UUID that casts cleanly to text.

BEGIN;

-- ============================================================================
-- 1. chat_messages (user_id VARCHAR)
-- Ownership column: user_id
-- ============================================================================

DO $$ BEGIN
  ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can view own chat_messages"
    ON chat_messages FOR SELECT
    USING (auth.uid()::text = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can insert own chat_messages"
    ON chat_messages FOR INSERT
    WITH CHECK (auth.uid()::text = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update own chat_messages"
    ON chat_messages FOR UPDATE
    USING (auth.uid()::text = user_id)
    WITH CHECK (auth.uid()::text = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can delete own chat_messages"
    ON chat_messages FOR DELETE
    USING (auth.uid()::text = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Service role manages chat_messages"
    ON chat_messages FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- 2. check_ins (user_id VARCHAR)
-- Ownership column: user_id
-- ============================================================================

DO $$ BEGIN
  ALTER TABLE check_ins ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can view own check_ins"
    ON check_ins FOR SELECT
    USING (auth.uid()::text = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can insert own check_ins"
    ON check_ins FOR INSERT
    WITH CHECK (auth.uid()::text = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update own check_ins"
    ON check_ins FOR UPDATE
    USING (auth.uid()::text = user_id)
    WITH CHECK (auth.uid()::text = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can delete own check_ins"
    ON check_ins FOR DELETE
    USING (auth.uid()::text = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Service role manages check_ins"
    ON check_ins FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- 3. reality_lens_analyses (user_id VARCHAR)
-- Ownership column: user_id
-- ============================================================================

DO $$ BEGIN
  ALTER TABLE reality_lens_analyses ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can view own reality_lens_analyses"
    ON reality_lens_analyses FOR SELECT
    USING (auth.uid()::text = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can insert own reality_lens_analyses"
    ON reality_lens_analyses FOR INSERT
    WITH CHECK (auth.uid()::text = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update own reality_lens_analyses"
    ON reality_lens_analyses FOR UPDATE
    USING (auth.uid()::text = user_id)
    WITH CHECK (auth.uid()::text = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can delete own reality_lens_analyses"
    ON reality_lens_analyses FOR DELETE
    USING (auth.uid()::text = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Service role manages reality_lens_analyses"
    ON reality_lens_analyses FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- 4. investor_scores (user_id VARCHAR)
-- Ownership column: user_id
-- ============================================================================

DO $$ BEGIN
  ALTER TABLE investor_scores ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can view own investor_scores"
    ON investor_scores FOR SELECT
    USING (auth.uid()::text = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can insert own investor_scores"
    ON investor_scores FOR INSERT
    WITH CHECK (auth.uid()::text = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update own investor_scores"
    ON investor_scores FOR UPDATE
    USING (auth.uid()::text = user_id)
    WITH CHECK (auth.uid()::text = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can delete own investor_scores"
    ON investor_scores FOR DELETE
    USING (auth.uid()::text = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Service role manages investor_scores"
    ON investor_scores FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- 5. documents (user_id VARCHAR)
-- Ownership column: user_id
-- ============================================================================

DO $$ BEGIN
  ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can view own documents"
    ON documents FOR SELECT
    USING (auth.uid()::text = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can insert own documents"
    ON documents FOR INSERT
    WITH CHECK (auth.uid()::text = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update own documents"
    ON documents FOR UPDATE
    USING (auth.uid()::text = user_id)
    WITH CHECK (auth.uid()::text = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can delete own documents"
    ON documents FOR DELETE
    USING (auth.uid()::text = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Service role manages documents"
    ON documents FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- 6. pitch_deck_reviews (user_id VARCHAR)
-- Ownership column: user_id
-- ============================================================================

DO $$ BEGIN
  ALTER TABLE pitch_deck_reviews ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can view own pitch_deck_reviews"
    ON pitch_deck_reviews FOR SELECT
    USING (auth.uid()::text = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can insert own pitch_deck_reviews"
    ON pitch_deck_reviews FOR INSERT
    WITH CHECK (auth.uid()::text = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update own pitch_deck_reviews"
    ON pitch_deck_reviews FOR UPDATE
    USING (auth.uid()::text = user_id)
    WITH CHECK (auth.uid()::text = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can delete own pitch_deck_reviews"
    ON pitch_deck_reviews FOR DELETE
    USING (auth.uid()::text = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Service role manages pitch_deck_reviews"
    ON pitch_deck_reviews FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- 7. startup_processes (user_id VARCHAR)
-- Ownership column: user_id
-- ============================================================================

DO $$ BEGIN
  ALTER TABLE startup_processes ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can view own startup_processes"
    ON startup_processes FOR SELECT
    USING (auth.uid()::text = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can insert own startup_processes"
    ON startup_processes FOR INSERT
    WITH CHECK (auth.uid()::text = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update own startup_processes"
    ON startup_processes FOR UPDATE
    USING (auth.uid()::text = user_id)
    WITH CHECK (auth.uid()::text = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can delete own startup_processes"
    ON startup_processes FOR DELETE
    USING (auth.uid()::text = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Service role manages startup_processes"
    ON startup_processes FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- 8. startup_process_validations (FK to startup_processes, no direct user_id)
-- Junction/child table: access controlled via parent startup_processes.
-- Default-deny with service_role bypass. Users access through parent join.
-- ============================================================================

DO $$ BEGIN
  ALTER TABLE startup_process_validations ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can view own startup_process_validations"
    ON startup_process_validations FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM startup_processes sp
        WHERE sp.id = startup_process_validations.process_id
        AND auth.uid()::text = sp.user_id
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can insert own startup_process_validations"
    ON startup_process_validations FOR INSERT
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM startup_processes sp
        WHERE sp.id = startup_process_validations.process_id
        AND auth.uid()::text = sp.user_id
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update own startup_process_validations"
    ON startup_process_validations FOR UPDATE
    USING (
      EXISTS (
        SELECT 1 FROM startup_processes sp
        WHERE sp.id = startup_process_validations.process_id
        AND auth.uid()::text = sp.user_id
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can delete own startup_process_validations"
    ON startup_process_validations FOR DELETE
    USING (
      EXISTS (
        SELECT 1 FROM startup_processes sp
        WHERE sp.id = startup_process_validations.process_id
        AND auth.uid()::text = sp.user_id
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Service role manages startup_process_validations"
    ON startup_process_validations FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- 9. investor_lens_evaluations (user_id VARCHAR)
-- Ownership column: user_id
-- ============================================================================

DO $$ BEGIN
  ALTER TABLE investor_lens_evaluations ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can view own investor_lens_evaluations"
    ON investor_lens_evaluations FOR SELECT
    USING (auth.uid()::text = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can insert own investor_lens_evaluations"
    ON investor_lens_evaluations FOR INSERT
    WITH CHECK (auth.uid()::text = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update own investor_lens_evaluations"
    ON investor_lens_evaluations FOR UPDATE
    USING (auth.uid()::text = user_id)
    WITH CHECK (auth.uid()::text = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can delete own investor_lens_evaluations"
    ON investor_lens_evaluations FOR DELETE
    USING (auth.uid()::text = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Service role manages investor_lens_evaluations"
    ON investor_lens_evaluations FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- 10. deck_reviews (user_id VARCHAR)
-- Ownership column: user_id
-- ============================================================================

DO $$ BEGIN
  ALTER TABLE deck_reviews ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can view own deck_reviews"
    ON deck_reviews FOR SELECT
    USING (auth.uid()::text = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can insert own deck_reviews"
    ON deck_reviews FOR INSERT
    WITH CHECK (auth.uid()::text = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update own deck_reviews"
    ON deck_reviews FOR UPDATE
    USING (auth.uid()::text = user_id)
    WITH CHECK (auth.uid()::text = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can delete own deck_reviews"
    ON deck_reviews FOR DELETE
    USING (auth.uid()::text = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Service role manages deck_reviews"
    ON deck_reviews FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- 11. positioning_assessments (user_id VARCHAR)
-- Ownership column: user_id
-- ============================================================================

DO $$ BEGIN
  ALTER TABLE positioning_assessments ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can view own positioning_assessments"
    ON positioning_assessments FOR SELECT
    USING (auth.uid()::text = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can insert own positioning_assessments"
    ON positioning_assessments FOR INSERT
    WITH CHECK (auth.uid()::text = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update own positioning_assessments"
    ON positioning_assessments FOR UPDATE
    USING (auth.uid()::text = user_id)
    WITH CHECK (auth.uid()::text = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can delete own positioning_assessments"
    ON positioning_assessments FOR DELETE
    USING (auth.uid()::text = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Service role manages positioning_assessments"
    ON positioning_assessments FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- 12. diagnostic_states (user_id VARCHAR, UNIQUE)
-- Ownership column: user_id
-- ============================================================================

DO $$ BEGIN
  ALTER TABLE diagnostic_states ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can view own diagnostic_states"
    ON diagnostic_states FOR SELECT
    USING (auth.uid()::text = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can insert own diagnostic_states"
    ON diagnostic_states FOR INSERT
    WITH CHECK (auth.uid()::text = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update own diagnostic_states"
    ON diagnostic_states FOR UPDATE
    USING (auth.uid()::text = user_id)
    WITH CHECK (auth.uid()::text = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can delete own diagnostic_states"
    ON diagnostic_states FOR DELETE
    USING (auth.uid()::text = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Service role manages diagnostic_states"
    ON diagnostic_states FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- 13. diagnostic_events (user_id VARCHAR)
-- Ownership column: user_id
-- ============================================================================

DO $$ BEGIN
  ALTER TABLE diagnostic_events ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can view own diagnostic_events"
    ON diagnostic_events FOR SELECT
    USING (auth.uid()::text = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can insert own diagnostic_events"
    ON diagnostic_events FOR INSERT
    WITH CHECK (auth.uid()::text = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update own diagnostic_events"
    ON diagnostic_events FOR UPDATE
    USING (auth.uid()::text = user_id)
    WITH CHECK (auth.uid()::text = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can delete own diagnostic_events"
    ON diagnostic_events FOR DELETE
    USING (auth.uid()::text = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Service role manages diagnostic_events"
    ON diagnostic_events FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- 14. video_rooms (host_user_id UUID)
-- Ownership column: host_user_id (non-standard name)
-- NOTE: Video rooms use host_user_id instead of user_id.
-- Participants in a room also need SELECT access (handled via video_participants).
-- ============================================================================

DO $$ BEGIN
  ALTER TABLE video_rooms ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Hosts can view own video_rooms"
    ON video_rooms FOR SELECT
    USING (auth.uid() = host_user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Participants can also view rooms they've joined
DO $$ BEGIN
  CREATE POLICY "Participants can view joined video_rooms"
    ON video_rooms FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM video_participants vp
        WHERE vp.room_id = video_rooms.id
        AND vp.user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Hosts can insert own video_rooms"
    ON video_rooms FOR INSERT
    WITH CHECK (auth.uid() = host_user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Hosts can update own video_rooms"
    ON video_rooms FOR UPDATE
    USING (auth.uid() = host_user_id)
    WITH CHECK (auth.uid() = host_user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Hosts can delete own video_rooms"
    ON video_rooms FOR DELETE
    USING (auth.uid() = host_user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Service role manages video_rooms"
    ON video_rooms FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- 15. video_participants (user_id UUID, FK to rooms)
-- Ownership column: user_id
-- ============================================================================

DO $$ BEGIN
  ALTER TABLE video_participants ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can view own video_participants"
    ON video_participants FOR SELECT
    USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Room hosts can also see all participants in their rooms
DO $$ BEGIN
  CREATE POLICY "Hosts can view room video_participants"
    ON video_participants FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM video_rooms vr
        WHERE vr.id = video_participants.room_id
        AND vr.host_user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can insert own video_participants"
    ON video_participants FOR INSERT
    WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update own video_participants"
    ON video_participants FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can delete own video_participants"
    ON video_participants FOR DELETE
    USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Service role manages video_participants"
    ON video_participants FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- 16. video_chat_messages (FK to rooms/participants, no direct user_id)
-- Junction/child table: access controlled via parent video_rooms/video_participants.
-- Users can see chat messages in rooms they participate in.
-- ============================================================================

DO $$ BEGIN
  ALTER TABLE video_chat_messages ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Participants can view video_chat_messages"
    ON video_chat_messages FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM video_participants vp
        WHERE vp.room_id = video_chat_messages.room_id
        AND vp.user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Participants can insert video_chat_messages"
    ON video_chat_messages FOR INSERT
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM video_participants vp
        WHERE vp.room_id = video_chat_messages.room_id
        AND vp.user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Service role manages video_chat_messages"
    ON video_chat_messages FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- 17. ab_promotion_audit_log (system/admin table, user_id TEXT nullable)
-- System table: No direct user ownership. Default-deny with service_role bypass.
-- Authenticated users can view audit logs for transparency.
-- ============================================================================

DO $$ BEGIN
  ALTER TABLE ab_promotion_audit_log ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN others THEN NULL;
END $$;

-- Read-only for authenticated users (audit transparency)
DO $$ BEGIN
  CREATE POLICY "Authenticated can view ab_promotion_audit_log"
    ON ab_promotion_audit_log FOR SELECT
    TO authenticated
    USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Service role manages ab_promotion_audit_log"
    ON ab_promotion_audit_log FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- 18. uploaded_documents (user_id UUID)
-- Ownership column: user_id
-- ============================================================================

DO $$ BEGIN
  ALTER TABLE uploaded_documents ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can view own uploaded_documents"
    ON uploaded_documents FOR SELECT
    USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can insert own uploaded_documents"
    ON uploaded_documents FOR INSERT
    WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update own uploaded_documents"
    ON uploaded_documents FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can delete own uploaded_documents"
    ON uploaded_documents FOR DELETE
    USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Service role manages uploaded_documents"
    ON uploaded_documents FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- 19. document_chunks (FK to uploaded_documents, no direct user_id)
-- Child table: access controlled via parent uploaded_documents ownership.
-- ============================================================================

DO $$ BEGIN
  ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can view own document_chunks"
    ON document_chunks FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM uploaded_documents ud
        WHERE ud.id = document_chunks.document_id
        AND ud.user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can insert own document_chunks"
    ON document_chunks FOR INSERT
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM uploaded_documents ud
        WHERE ud.id = document_chunks.document_id
        AND ud.user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can delete own document_chunks"
    ON document_chunks FOR DELETE
    USING (
      EXISTS (
        SELECT 1 FROM uploaded_documents ud
        WHERE ud.id = document_chunks.document_id
        AND ud.user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Service role manages document_chunks"
    ON document_chunks FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- 20. investor_readiness_scores (user_id UUID)
-- Ownership column: user_id
-- ============================================================================

DO $$ BEGIN
  ALTER TABLE investor_readiness_scores ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can view own investor_readiness_scores"
    ON investor_readiness_scores FOR SELECT
    USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can insert own investor_readiness_scores"
    ON investor_readiness_scores FOR INSERT
    WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update own investor_readiness_scores"
    ON investor_readiness_scores FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can delete own investor_readiness_scores"
    ON investor_readiness_scores FOR DELETE
    USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Service role manages investor_readiness_scores"
    ON investor_readiness_scores FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- 21. pitch_reviews (user_id UUID)
-- Ownership column: user_id
-- ============================================================================

DO $$ BEGIN
  ALTER TABLE pitch_reviews ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can view own pitch_reviews"
    ON pitch_reviews FOR SELECT
    USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can insert own pitch_reviews"
    ON pitch_reviews FOR INSERT
    WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update own pitch_reviews"
    ON pitch_reviews FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can delete own pitch_reviews"
    ON pitch_reviews FOR DELETE
    USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Service role manages pitch_reviews"
    ON pitch_reviews FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- 22. strategy_documents (user_id UUID)
-- Ownership column: user_id
-- ============================================================================

DO $$ BEGIN
  ALTER TABLE strategy_documents ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can view own strategy_documents"
    ON strategy_documents FOR SELECT
    USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can insert own strategy_documents"
    ON strategy_documents FOR INSERT
    WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update own strategy_documents"
    ON strategy_documents FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can delete own strategy_documents"
    ON strategy_documents FOR DELETE
    USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Service role manages strategy_documents"
    ON strategy_documents FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- 23. agent_tasks (user_id UUID)
-- Ownership column: user_id
-- ============================================================================

DO $$ BEGIN
  ALTER TABLE agent_tasks ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can view own agent_tasks"
    ON agent_tasks FOR SELECT
    USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can insert own agent_tasks"
    ON agent_tasks FOR INSERT
    WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update own agent_tasks"
    ON agent_tasks FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can delete own agent_tasks"
    ON agent_tasks FOR DELETE
    USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Service role manages agent_tasks"
    ON agent_tasks FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- 24. sms_checkins (user_id UUID)
-- Ownership column: user_id
-- ============================================================================

DO $$ BEGIN
  ALTER TABLE sms_checkins ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can view own sms_checkins"
    ON sms_checkins FOR SELECT
    USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can insert own sms_checkins"
    ON sms_checkins FOR INSERT
    WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update own sms_checkins"
    ON sms_checkins FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can delete own sms_checkins"
    ON sms_checkins FOR DELETE
    USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Service role manages sms_checkins"
    ON sms_checkins FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- 25. boardy_matches (user_id UUID)
-- Ownership column: user_id
-- ============================================================================

DO $$ BEGIN
  ALTER TABLE boardy_matches ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can view own boardy_matches"
    ON boardy_matches FOR SELECT
    USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can insert own boardy_matches"
    ON boardy_matches FOR INSERT
    WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update own boardy_matches"
    ON boardy_matches FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can delete own boardy_matches"
    ON boardy_matches FOR DELETE
    USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Service role manages boardy_matches"
    ON boardy_matches FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- 26. user_sms_preferences (user_id UUID as PK)
-- Ownership column: user_id (is the PK)
-- ============================================================================

DO $$ BEGIN
  ALTER TABLE user_sms_preferences ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can view own user_sms_preferences"
    ON user_sms_preferences FOR SELECT
    USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can insert own user_sms_preferences"
    ON user_sms_preferences FOR INSERT
    WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update own user_sms_preferences"
    ON user_sms_preferences FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can delete own user_sms_preferences"
    ON user_sms_preferences FOR DELETE
    USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Service role manages user_sms_preferences"
    ON user_sms_preferences FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- 27. users (system table, no user_id column for RLS)
-- System table: contains email/password_hash for legacy auth.
-- Default-deny with service_role bypass only.
-- No per-user access -- application code uses service role to query this table.
-- ============================================================================

DO $$ BEGIN
  ALTER TABLE users ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Service role manages users"
    ON users FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- SUMMARY
-- ============================================================================
-- This migration adds RLS to 27 previously unprotected tables:
--
-- Standard user_id ownership (VARCHAR cast):
--   chat_messages, check_ins, reality_lens_analyses, investor_scores,
--   documents, pitch_deck_reviews, startup_processes,
--   investor_lens_evaluations, deck_reviews, positioning_assessments,
--   diagnostic_states, diagnostic_events
--
-- Standard user_id ownership (UUID):
--   uploaded_documents, investor_readiness_scores, pitch_reviews,
--   strategy_documents, agent_tasks, sms_checkins, boardy_matches,
--   user_sms_preferences
--
-- Non-standard ownership (host_user_id):
--   video_rooms
--
-- Parent-child join policies:
--   startup_process_validations (via startup_processes.user_id)
--   document_chunks (via uploaded_documents.user_id)
--   video_participants (user_id + host join)
--   video_chat_messages (via video_participants.user_id)
--
-- System tables (service_role only):
--   users, ab_promotion_audit_log

COMMIT;
