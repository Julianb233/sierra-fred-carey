-- ============================================================================
-- Migration 053: Add UPDATE policy for community_members
-- Fixes DB-01 (SCHEMA-W02): Missing UPDATE policy on community_members table
--
-- Allows owner/moderator to update member roles, with a WITH CHECK that
-- prevents escalation to the 'owner' role (only the original creator should
-- hold that role).
-- ============================================================================

DO $$ BEGIN
  CREATE POLICY "Owner and moderators can update member roles"
    ON community_members FOR UPDATE
    USING (
      EXISTS (
        SELECT 1 FROM community_members cm
        WHERE cm.community_id = community_members.community_id
          AND cm.user_id = auth.uid()
          AND cm.role IN ('owner', 'moderator')
      )
    )
    WITH CHECK (
      role IN ('moderator', 'member')
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
