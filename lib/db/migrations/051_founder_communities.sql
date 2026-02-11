-- ============================================================================
-- Migration 051: Founder Communities
-- Phase 41: Founder Communities
--
-- Peer-to-peer community spaces where founders can connect, share progress,
-- ask questions, and support each other through the startup journey.
--
-- Tables created:
--   1. communities              - community spaces with name, slug, category
--   2. community_members        - membership junction (creator/moderator/member)
--   3. community_posts          - posts, questions, and updates within communities
--   4. community_post_reactions - emoji/reaction tracking per post
--   5. community_post_replies   - threaded replies on posts
-- ============================================================================

-- ============================================================================
-- 1. communities
--    Each community has a unique slug, a creator, and optional metadata.
-- ============================================================================

CREATE TABLE IF NOT EXISTS communities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  category TEXT,
  creator_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  icon_url TEXT,
  member_count INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_communities_slug ON communities(slug);
CREATE INDEX IF NOT EXISTS idx_communities_creator ON communities(creator_id);
CREATE INDEX IF NOT EXISTS idx_communities_category ON communities(category);
CREATE INDEX IF NOT EXISTS idx_communities_active ON communities(is_active) WHERE is_active = true;

-- Auto-update updated_at (reuse function from migration 049)
CREATE TRIGGER trg_communities_updated_at
  BEFORE UPDATE ON communities
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 2. community_members
--    Junction table tracking who belongs to which community and their role.
--    Composite PK on (community_id, user_id).
-- ============================================================================

CREATE TABLE IF NOT EXISTS community_members (
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member'
    CHECK (role IN ('creator', 'moderator', 'member')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (community_id, user_id)
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_community_members_community ON community_members(community_id);
CREATE INDEX IF NOT EXISTS idx_community_members_user ON community_members(user_id);

-- ============================================================================
-- 3. community_posts
--    Posts within a community. Types: post, question, update.
-- ============================================================================

CREATE TABLE IF NOT EXISTS community_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'post'
    CHECK (type IN ('post', 'question', 'update')),
  title TEXT,
  content TEXT NOT NULL,
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_community_posts_community ON community_posts(community_id);
CREATE INDEX IF NOT EXISTS idx_community_posts_author ON community_posts(author_id);
CREATE INDEX IF NOT EXISTS idx_community_posts_created ON community_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_posts_pinned ON community_posts(community_id, is_pinned)
  WHERE is_pinned = true;

-- Auto-update updated_at
CREATE TRIGGER trg_community_posts_updated_at
  BEFORE UPDATE ON community_posts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 4. community_post_reactions
--    Reactions on posts. Composite PK on (post_id, user_id) so each user
--    can have at most one reaction per post.
-- ============================================================================

CREATE TABLE IF NOT EXISTS community_post_reactions (
  post_id UUID NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reaction_type TEXT NOT NULL DEFAULT 'like',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_community_post_reactions_post ON community_post_reactions(post_id);
CREATE INDEX IF NOT EXISTS idx_community_post_reactions_user ON community_post_reactions(user_id);

-- ============================================================================
-- 5. community_post_replies
--    Threaded replies on posts.
-- ============================================================================

CREATE TABLE IF NOT EXISTS community_post_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_community_post_replies_post ON community_post_replies(post_id);
CREATE INDEX IF NOT EXISTS idx_community_post_replies_author ON community_post_replies(author_id);
CREATE INDEX IF NOT EXISTS idx_community_post_replies_created ON community_post_replies(created_at DESC);

-- ============================================================================
-- 6. Row Level Security
-- ============================================================================

-- ---------- communities ----------
ALTER TABLE communities ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Authenticated users can read communities"
    ON communities FOR SELECT
    USING (auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Creator can insert communities"
    ON communities FOR INSERT
    WITH CHECK (auth.uid() = creator_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Creator can update own communities"
    ON communities FOR UPDATE
    USING (auth.uid() = creator_id)
    WITH CHECK (auth.uid() = creator_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Creator can delete own communities"
    ON communities FOR DELETE
    USING (auth.uid() = creator_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Service role manages communities"
    ON communities FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ---------- community_members ----------
ALTER TABLE community_members ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Authenticated users can read community members"
    ON community_members FOR SELECT
    USING (auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can join communities"
    ON community_members FOR INSERT
    WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can leave communities"
    ON community_members FOR DELETE
    USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Service role manages community members"
    ON community_members FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ---------- community_posts ----------
ALTER TABLE community_posts ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Community members can read posts"
    ON community_posts FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM community_members cm
        WHERE cm.community_id = community_posts.community_id
          AND cm.user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Community members can create posts"
    ON community_posts FOR INSERT
    WITH CHECK (
      auth.uid() = author_id
      AND EXISTS (
        SELECT 1 FROM community_members cm
        WHERE cm.community_id = community_posts.community_id
          AND cm.user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Authors can update own posts"
    ON community_posts FOR UPDATE
    USING (auth.uid() = author_id)
    WITH CHECK (auth.uid() = author_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Authors can delete own posts"
    ON community_posts FOR DELETE
    USING (auth.uid() = author_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Service role manages community posts"
    ON community_posts FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ---------- community_post_reactions ----------
ALTER TABLE community_post_reactions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Community members can read reactions"
    ON community_post_reactions FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM community_posts cp
        JOIN community_members cm ON cm.community_id = cp.community_id
        WHERE cp.id = community_post_reactions.post_id
          AND cm.user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can add own reactions"
    ON community_post_reactions FOR INSERT
    WITH CHECK (
      auth.uid() = user_id
      AND EXISTS (
        SELECT 1 FROM community_posts cp
        JOIN community_members cm ON cm.community_id = cp.community_id
        WHERE cp.id = community_post_reactions.post_id
          AND cm.user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can remove own reactions"
    ON community_post_reactions FOR DELETE
    USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Service role manages community post reactions"
    ON community_post_reactions FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ---------- community_post_replies ----------
ALTER TABLE community_post_replies ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Community members can read replies"
    ON community_post_replies FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM community_posts cp
        JOIN community_members cm ON cm.community_id = cp.community_id
        WHERE cp.id = community_post_replies.post_id
          AND cm.user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Community members can create replies"
    ON community_post_replies FOR INSERT
    WITH CHECK (
      auth.uid() = author_id
      AND EXISTS (
        SELECT 1 FROM community_posts cp
        JOIN community_members cm ON cm.community_id = cp.community_id
        WHERE cp.id = community_post_replies.post_id
          AND cm.user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Authors can update own replies"
    ON community_post_replies FOR UPDATE
    USING (auth.uid() = author_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Authors can delete own replies"
    ON community_post_replies FOR DELETE
    USING (auth.uid() = author_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Service role manages community post replies"
    ON community_post_replies FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- 7. Comments
-- ============================================================================

COMMENT ON TABLE communities IS
  'Founder community spaces where users can connect, share progress, and support each other.';

COMMENT ON TABLE community_members IS
  'Junction table tracking community membership with roles: creator, moderator, member.';

COMMENT ON TABLE community_posts IS
  'Posts within a community. Types: post (general), question (seeking help), update (progress).';

COMMENT ON TABLE community_post_reactions IS
  'Reactions on community posts. One reaction per user per post.';

COMMENT ON TABLE community_post_replies IS
  'Threaded replies on community posts.';
