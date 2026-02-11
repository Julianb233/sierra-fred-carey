-- ============================================================================
-- Migration 051: Founder Communities
-- Phase 41: Founder Communities
--
-- Peer-to-peer community spaces where founders can connect, share progress,
-- ask questions, and support each other through the startup journey.
--
-- Tables created:
--   1. communities              - community spaces with name, slug, category
--   2. community_members        - membership with roles (owner/moderator/member)
--   3. community_posts          - posts, questions, updates, milestones
--   4. community_post_reactions - typed reactions (like/insightful/support)
--   5. community_post_replies   - threaded replies on posts
--
-- Triggers:
--   - member_count sync on community_members INSERT/DELETE
--   - reaction_count sync on community_post_reactions INSERT/DELETE
--   - reply_count sync on community_post_replies INSERT/DELETE
-- ============================================================================

-- ============================================================================
-- 1. communities
-- ============================================================================

CREATE TABLE IF NOT EXISTS communities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'general',
  cover_image_url TEXT,
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  member_count INTEGER NOT NULL DEFAULT 1,
  is_private BOOLEAN NOT NULL DEFAULT false,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_communities_slug ON communities(slug);
CREATE INDEX IF NOT EXISTS idx_communities_category ON communities(category);
CREATE INDEX IF NOT EXISTS idx_communities_creator ON communities(creator_id);
CREATE INDEX IF NOT EXISTS idx_communities_created ON communities(created_at DESC);

-- Auto-update updated_at (reuse function from migration 049)
CREATE TRIGGER trg_communities_updated_at
  BEFORE UPDATE ON communities
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 2. community_members
-- ============================================================================

CREATE TABLE IF NOT EXISTS community_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member'
    CHECK (role IN ('owner', 'moderator', 'member')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(community_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_community_members_community ON community_members(community_id);
CREATE INDEX IF NOT EXISTS idx_community_members_user ON community_members(user_id);

-- ============================================================================
-- 3. community_posts
-- ============================================================================

CREATE TABLE IF NOT EXISTS community_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL,
  post_type TEXT NOT NULL DEFAULT 'post'
    CHECK (post_type IN ('post', 'question', 'update', 'milestone')),
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  reaction_count INTEGER NOT NULL DEFAULT 0,
  reply_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_community_posts_community ON community_posts(community_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_posts_author ON community_posts(author_id);
CREATE INDEX IF NOT EXISTS idx_community_posts_pinned ON community_posts(community_id, is_pinned DESC, created_at DESC);

-- Auto-update updated_at
CREATE TRIGGER trg_community_posts_updated_at
  BEFORE UPDATE ON community_posts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 4. community_post_reactions
-- ============================================================================

CREATE TABLE IF NOT EXISTS community_post_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reaction_type TEXT NOT NULL DEFAULT 'like'
    CHECK (reaction_type IN ('like', 'insightful', 'support')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(post_id, user_id, reaction_type)
);

CREATE INDEX IF NOT EXISTS idx_reactions_post ON community_post_reactions(post_id);
CREATE INDEX IF NOT EXISTS idx_reactions_user ON community_post_reactions(user_id);

-- ============================================================================
-- 5. community_post_replies
-- ============================================================================

CREATE TABLE IF NOT EXISTS community_post_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  parent_reply_id UUID REFERENCES community_post_replies(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_replies_post ON community_post_replies(post_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_replies_parent ON community_post_replies(parent_reply_id);
CREATE INDEX IF NOT EXISTS idx_replies_author ON community_post_replies(author_id);

-- Auto-update updated_at
CREATE TRIGGER trg_community_post_replies_updated_at
  BEFORE UPDATE ON community_post_replies
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 6. Counter-sync triggers
-- ============================================================================

-- member_count: increment on INSERT, decrement on DELETE
CREATE OR REPLACE FUNCTION sync_community_member_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE communities SET member_count = member_count + 1 WHERE id = NEW.community_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE communities SET member_count = GREATEST(member_count - 1, 0) WHERE id = OLD.community_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sync_member_count
  AFTER INSERT OR DELETE ON community_members
  FOR EACH ROW
  EXECUTE FUNCTION sync_community_member_count();

-- reaction_count: increment on INSERT, decrement on DELETE
CREATE OR REPLACE FUNCTION sync_post_reaction_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE community_posts SET reaction_count = reaction_count + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE community_posts SET reaction_count = GREATEST(reaction_count - 1, 0) WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sync_reaction_count
  AFTER INSERT OR DELETE ON community_post_reactions
  FOR EACH ROW
  EXECUTE FUNCTION sync_post_reaction_count();

-- reply_count: increment on INSERT, decrement on DELETE
CREATE OR REPLACE FUNCTION sync_post_reply_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE community_posts SET reply_count = reply_count + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE community_posts SET reply_count = GREATEST(reply_count - 1, 0) WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sync_reply_count
  AFTER INSERT OR DELETE ON community_post_replies
  FOR EACH ROW
  EXECUTE FUNCTION sync_post_reply_count();

-- ============================================================================
-- 7. Row Level Security
-- ============================================================================

-- ---------- communities ----------
ALTER TABLE communities ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read non-archived public communities,
-- or private communities they are a member of
DO $$ BEGIN
  CREATE POLICY "Authenticated users can read communities"
    ON communities FOR SELECT
    USING (
      auth.uid() IS NOT NULL
      AND is_archived = false
      AND (
        is_private = false
        OR EXISTS (
          SELECT 1 FROM community_members cm
          WHERE cm.community_id = communities.id
            AND cm.user_id = auth.uid()
        )
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated users can create communities"
    ON communities FOR INSERT
    WITH CHECK (auth.uid() = creator_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Owner can update community"
    ON communities FOR UPDATE
    USING (auth.uid() = creator_id)
    WITH CHECK (auth.uid() = creator_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Owner can delete community"
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

-- Members of the same community can see each other
DO $$ BEGIN
  CREATE POLICY "Members can read community member lists"
    ON community_members FOR SELECT
    USING (
      auth.uid() IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM community_members my_membership
        WHERE my_membership.community_id = community_members.community_id
          AND my_membership.user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Users can join public communities; owner can add to private
DO $$ BEGIN
  CREATE POLICY "Users can join communities"
    ON community_members FOR INSERT
    WITH CHECK (
      auth.uid() = user_id
      AND (
        -- Public community: anyone can join
        EXISTS (
          SELECT 1 FROM communities c
          WHERE c.id = community_members.community_id
            AND c.is_private = false
        )
        -- Private community: only the owner can add members (via service role)
        -- Self-join allowed if community is public
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Users can leave, owner/moderator can remove members
DO $$ BEGIN
  CREATE POLICY "Users can leave or be removed by moderators"
    ON community_members FOR DELETE
    USING (
      auth.uid() = user_id
      OR EXISTS (
        SELECT 1 FROM community_members mod
        WHERE mod.community_id = community_members.community_id
          AND mod.user_id = auth.uid()
          AND mod.role IN ('owner', 'moderator')
      )
    );
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

-- Members can read posts in their communities
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

-- Members can create posts
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

-- Author can edit own posts; owner/moderator can edit any
DO $$ BEGIN
  CREATE POLICY "Authors and moderators can update posts"
    ON community_posts FOR UPDATE
    USING (
      auth.uid() = author_id
      OR EXISTS (
        SELECT 1 FROM community_members cm
        WHERE cm.community_id = community_posts.community_id
          AND cm.user_id = auth.uid()
          AND cm.role IN ('owner', 'moderator')
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Author can delete own posts; owner/moderator can delete any
DO $$ BEGIN
  CREATE POLICY "Authors and moderators can delete posts"
    ON community_posts FOR DELETE
    USING (
      auth.uid() = author_id
      OR EXISTS (
        SELECT 1 FROM community_members cm
        WHERE cm.community_id = community_posts.community_id
          AND cm.user_id = auth.uid()
          AND cm.role IN ('owner', 'moderator')
      )
    );
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

-- Community members can read reactions on posts in their communities
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

-- Members can add reactions
DO $$ BEGIN
  CREATE POLICY "Members can add reactions"
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

-- Users can remove own reactions
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

-- Members can read replies
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

-- Members can create replies
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

-- Author can edit own replies
DO $$ BEGIN
  CREATE POLICY "Authors can update own replies"
    ON community_post_replies FOR UPDATE
    USING (auth.uid() = author_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Author can delete own replies; owner/moderator can delete any
DO $$ BEGIN
  CREATE POLICY "Authors and moderators can delete replies"
    ON community_post_replies FOR DELETE
    USING (
      auth.uid() = author_id
      OR EXISTS (
        SELECT 1 FROM community_posts cp
        JOIN community_members cm ON cm.community_id = cp.community_id
        WHERE cp.id = community_post_replies.post_id
          AND cm.user_id = auth.uid()
          AND cm.role IN ('owner', 'moderator')
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Service role manages community post replies"
    ON community_post_replies FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- 8. Comments
-- ============================================================================

COMMENT ON TABLE communities IS
  'Founder community spaces where users can connect, share progress, and support each other.';

COMMENT ON TABLE community_members IS
  'Community membership with roles: owner (creator), moderator, member. UNIQUE on (community_id, user_id).';

COMMENT ON TABLE community_posts IS
  'Posts within a community. Types: post, question, update, milestone. reaction_count and reply_count synced via triggers.';

COMMENT ON TABLE community_post_reactions IS
  'Typed reactions on posts (like/insightful/support). UNIQUE on (post_id, user_id, reaction_type) allows multiple reaction types per user.';

COMMENT ON TABLE community_post_replies IS
  'Threaded replies on posts. parent_reply_id enables nested threading.';

-- ============================================================================
-- 9. Additional constraints and indexes (production hardening)
-- ============================================================================

-- SCHEMA-05: Category CHECK constraint (4 meta-categories)
DO $$ BEGIN
  ALTER TABLE communities
    ADD CONSTRAINT chk_community_category
    CHECK (category IN ('general', 'industry', 'stage', 'topic'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- SCHEMA-W04: Content length constraint (max 10000 chars)
DO $$ BEGIN
  ALTER TABLE community_posts
    ADD CONSTRAINT chk_post_content_length
    CHECK (char_length(content) <= 10000);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- SCHEMA-W04: Reply content length constraint (max 5000 chars)
DO $$ BEGIN
  ALTER TABLE community_post_replies
    ADD CONSTRAINT chk_reply_content_length
    CHECK (char_length(content) <= 5000);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- SCHEMA-W05: Index for member_count sort in listCommunities
CREATE INDEX IF NOT EXISTS idx_communities_member_count
  ON communities(member_count DESC);
