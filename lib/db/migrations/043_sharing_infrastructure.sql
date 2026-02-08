-- Phase 33-01: Collaboration & Sharing Infrastructure
-- Creates shared_links and team_members tables with RLS policies
-- Date: 2026-02-07

-- ============================================================================
-- Shareable Links
-- ============================================================================

CREATE TABLE IF NOT EXISTS shared_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  resource_type TEXT NOT NULL, -- 'strategy_document', 'pitch_review', 'investor_readiness', 'red_flags_report'
  resource_id UUID NOT NULL,
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  access_level TEXT NOT NULL DEFAULT 'view', -- 'view', 'comment'
  expires_at TIMESTAMPTZ,
  max_views INTEGER,
  view_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- Team Members
-- ============================================================================

CREATE TABLE IF NOT EXISTS team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id TEXT NOT NULL, -- the founder who invited
  member_email TEXT NOT NULL,
  member_user_id TEXT, -- filled when they sign up
  role TEXT NOT NULL DEFAULT 'viewer', -- 'viewer', 'collaborator', 'admin'
  status TEXT NOT NULL DEFAULT 'invited', -- 'invited', 'active', 'revoked'
  invited_at TIMESTAMPTZ DEFAULT now(),
  accepted_at TIMESTAMPTZ,
  UNIQUE(owner_user_id, member_email)
);

-- ============================================================================
-- RLS Policies
-- ============================================================================

ALTER TABLE shared_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

-- shared_links: owner can manage, anyone can read with valid token (handled by API)
CREATE POLICY "Users can manage own shared_links" ON shared_links
  FOR ALL USING (auth.uid()::text = user_id);

CREATE POLICY "Service role manages shared_links" ON shared_links
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- team_members: owner can manage, members can view their own membership
CREATE POLICY "Owners can manage team_members" ON team_members
  FOR ALL USING (auth.uid()::text = owner_user_id);

CREATE POLICY "Members can view own membership" ON team_members
  FOR SELECT USING (auth.uid()::text = member_user_id);

CREATE POLICY "Service role manages team_members" ON team_members
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- ============================================================================
-- Indexes
-- ============================================================================

CREATE INDEX idx_shared_links_token ON shared_links(token);
CREATE INDEX idx_shared_links_user ON shared_links(user_id);
CREATE INDEX idx_team_members_owner ON team_members(owner_user_id);
CREATE INDEX idx_team_members_email ON team_members(member_email);
