-- Phase 33-02: Team-Scoped Sharing
-- Adds team-only sharing mode and recipient tracking to shared_links
-- Date: 2026-02-07

-- ============================================================================
-- Extend shared_links for team-scoped access
-- ============================================================================

ALTER TABLE shared_links ADD COLUMN IF NOT EXISTS is_team_only BOOLEAN DEFAULT false;

-- ============================================================================
-- Shared Link Recipients (junction table for team-scoped shares)
-- ============================================================================

CREATE TABLE IF NOT EXISTS shared_link_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shared_link_id UUID NOT NULL REFERENCES shared_links(id) ON DELETE CASCADE,
  team_member_id UUID NOT NULL REFERENCES team_members(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(shared_link_id, team_member_id)
);

-- ============================================================================
-- RLS Policies
-- ============================================================================

ALTER TABLE shared_link_recipients ENABLE ROW LEVEL SECURITY;

-- Link owner can manage recipients
CREATE POLICY "Link owners can manage recipients" ON shared_link_recipients
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM shared_links sl
      WHERE sl.id = shared_link_recipients.shared_link_id
      AND sl.user_id = auth.uid()::text
    )
  );

-- Team members can view their own recipient entries
CREATE POLICY "Recipients can view own entries" ON shared_link_recipients
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.id = shared_link_recipients.team_member_id
      AND tm.member_user_id = auth.uid()::text
    )
  );

-- Service role full access
CREATE POLICY "Service role manages shared_link_recipients" ON shared_link_recipients
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- ============================================================================
-- Indexes
-- ============================================================================

CREATE INDEX idx_shared_link_recipients_link ON shared_link_recipients(shared_link_id);
CREATE INDEX idx_shared_link_recipients_member ON shared_link_recipients(team_member_id);
CREATE INDEX idx_shared_links_team_only ON shared_links(is_team_only) WHERE is_team_only = true;
