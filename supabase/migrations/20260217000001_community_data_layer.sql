-- ============================================================================
-- Migration 054: Community Data Layer
-- Phases 47-53: Community Features Foundation
--
-- Complete schema for all community features: profiles, consent, social feed,
-- cohorts, messaging, connections, experts, reputation, and engagement.
--
-- Tables created (14):
--   1.  community_profiles       - public founder profiles for community
--   2.  consent_preferences      - per-category consent toggles
--   3.  consent_audit_log        - immutable audit trail for consent changes
--   4.  subcommunity_sponsors    - sponsorship data for subcommunities
--   5.  cohorts                  - small-group cohort containers
--   6.  cohort_members           - cohort membership with roles
--   7.  social_feed_posts        - milestone/achievement/update/shoutout posts
--   8.  social_feed_reactions    - typed reactions on feed posts
--   9.  social_feed_comments     - threaded comments on feed posts
--   10. founder_messages         - direct messages between founders
--   11. founder_connections      - connection requests and status
--   12. expert_listings          - expertise marketplace listings
--   13. reputation_events        - point-based reputation tracking
--   14. engagement_streaks       - daily check-in streak tracking
--
-- Also:
--   - 3 ALTER columns on existing communities table (subcommunity support)
--   - 2 materialized views (benchmark aggregates with consent gating)
--   - Counter-sync triggers for social_feed_posts
--   - Consent audit trigger on consent_preferences
--   - REPLICA IDENTITY FULL for Realtime-enabled tables
--   - RLS policies for all 14 tables
-- ============================================================================

-- ============================================================================
-- Section 1: ALTER existing communities table for subcommunity support
-- ============================================================================

ALTER TABLE communities ADD COLUMN IF NOT EXISTS parent_community_id UUID REFERENCES communities(id) ON DELETE CASCADE;
ALTER TABLE communities ADD COLUMN IF NOT EXISTS is_sponsored BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE communities ADD COLUMN IF NOT EXISTS tier_required INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_communities_parent
  ON communities(parent_community_id) WHERE parent_community_id IS NOT NULL;

-- ============================================================================
-- Section 2: Create 14 new tables
-- ============================================================================

-- --------------------------------------------------------------------------
-- 1. community_profiles
-- --------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS community_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL DEFAULT '',
  bio TEXT NOT NULL DEFAULT '',
  avatar_url TEXT,
  stage TEXT,
  industry TEXT,
  achievements TEXT[] NOT NULL DEFAULT '{}',
  visibility_settings JSONB NOT NULL DEFAULT '{"show_name":true,"show_stage":true,"show_industry":true,"show_bio":true,"show_achievements":true}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_community_profiles_user ON community_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_community_profiles_stage ON community_profiles(stage);
CREATE INDEX IF NOT EXISTS idx_community_profiles_industry ON community_profiles(industry);

CREATE TRIGGER trg_community_profiles_updated_at
  BEFORE UPDATE ON community_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- --------------------------------------------------------------------------
-- 2. consent_preferences
-- --------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS consent_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('benchmarks', 'social_feed', 'directory', 'messaging', 'investor_intros')),
  enabled BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, category)
);

CREATE INDEX IF NOT EXISTS idx_consent_preferences_user ON consent_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_consent_preferences_category ON consent_preferences(category);

CREATE TRIGGER trg_consent_preferences_updated_at
  BEFORE UPDATE ON consent_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- --------------------------------------------------------------------------
-- 3. consent_audit_log (append-only, no unique constraint)
-- --------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS consent_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  previous_value BOOLEAN NOT NULL,
  new_value BOOLEAN NOT NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_address TEXT,
  user_agent TEXT
);

CREATE INDEX IF NOT EXISTS idx_consent_audit_log_user ON consent_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_consent_audit_log_changed ON consent_audit_log(changed_at DESC);

-- --------------------------------------------------------------------------
-- 4. subcommunity_sponsors
-- --------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS subcommunity_sponsors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  sponsor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  sponsor_name TEXT NOT NULL,
  sponsor_logo_url TEXT,
  sponsor_url TEXT,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(community_id, sponsor_user_id)
);

CREATE INDEX IF NOT EXISTS idx_subcommunity_sponsors_community ON subcommunity_sponsors(community_id);
CREATE INDEX IF NOT EXISTS idx_subcommunity_sponsors_active ON subcommunity_sponsors(is_active) WHERE is_active = true;

CREATE TRIGGER trg_subcommunity_sponsors_updated_at
  BEFORE UPDATE ON subcommunity_sponsors
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- --------------------------------------------------------------------------
-- 5. cohorts
-- --------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS cohorts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  cohort_type TEXT NOT NULL DEFAULT 'stage' CHECK (cohort_type IN ('stage', 'industry', 'custom')),
  max_members INTEGER NOT NULL DEFAULT 8,
  status TEXT NOT NULL DEFAULT 'forming' CHECK (status IN ('forming', 'active', 'archived')),
  match_criteria JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cohorts_status ON cohorts(status);
CREATE INDEX IF NOT EXISTS idx_cohorts_type ON cohorts(cohort_type);
CREATE INDEX IF NOT EXISTS idx_cohorts_created ON cohorts(created_at DESC);

CREATE TRIGGER trg_cohorts_updated_at
  BEFORE UPDATE ON cohorts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- --------------------------------------------------------------------------
-- 6. cohort_members
-- --------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS cohort_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cohort_id UUID NOT NULL REFERENCES cohorts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'facilitator')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  left_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  UNIQUE(cohort_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_cohort_members_cohort ON cohort_members(cohort_id);
CREATE INDEX IF NOT EXISTS idx_cohort_members_user ON cohort_members(user_id);
CREATE INDEX IF NOT EXISTS idx_cohort_members_active ON cohort_members(is_active) WHERE is_active = true;

-- --------------------------------------------------------------------------
-- 7. social_feed_posts
-- --------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS social_feed_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  post_type TEXT NOT NULL DEFAULT 'milestone' CHECK (post_type IN ('milestone', 'achievement', 'update', 'shoutout')),
  title TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL,
  milestone_id UUID REFERENCES milestones(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  reaction_count INTEGER NOT NULL DEFAULT 0,
  comment_count INTEGER NOT NULL DEFAULT 0,
  view_count INTEGER NOT NULL DEFAULT 0,
  is_public BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_social_feed_posts_author ON social_feed_posts(author_id);
CREATE INDEX IF NOT EXISTS idx_social_feed_posts_type ON social_feed_posts(post_type);
CREATE INDEX IF NOT EXISTS idx_social_feed_posts_created ON social_feed_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_social_feed_posts_milestone ON social_feed_posts(milestone_id) WHERE milestone_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_social_feed_posts_public ON social_feed_posts(is_public, created_at DESC) WHERE is_public = true;

CREATE TRIGGER trg_social_feed_posts_updated_at
  BEFORE UPDATE ON social_feed_posts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- --------------------------------------------------------------------------
-- 8. social_feed_reactions
-- --------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS social_feed_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES social_feed_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reaction_type TEXT NOT NULL DEFAULT 'encourage' CHECK (reaction_type IN ('encourage', 'celebrate', 'insightful')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(post_id, user_id, reaction_type)
);

CREATE INDEX IF NOT EXISTS idx_social_feed_reactions_post ON social_feed_reactions(post_id);
CREATE INDEX IF NOT EXISTS idx_social_feed_reactions_user ON social_feed_reactions(user_id);

-- --------------------------------------------------------------------------
-- 9. social_feed_comments
-- --------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS social_feed_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES social_feed_posts(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  parent_comment_id UUID REFERENCES social_feed_comments(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_social_feed_comments_post ON social_feed_comments(post_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_social_feed_comments_author ON social_feed_comments(author_id);
CREATE INDEX IF NOT EXISTS idx_social_feed_comments_parent ON social_feed_comments(parent_comment_id);

CREATE TRIGGER trg_social_feed_comments_updated_at
  BEFORE UPDATE ON social_feed_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- --------------------------------------------------------------------------
-- 10. founder_messages
-- --------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS founder_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  is_fred_facilitated BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_founder_messages_sender ON founder_messages(sender_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_founder_messages_recipient ON founder_messages(recipient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_founder_messages_unread ON founder_messages(recipient_id, is_read) WHERE is_read = false;

-- --------------------------------------------------------------------------
-- 11. founder_connections
-- --------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS founder_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'blocked', 'declined')),
  source TEXT NOT NULL DEFAULT 'directory' CHECK (source IN ('directory', 'cohort', 'fred_suggestion', 'community')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(requester_id, recipient_id)
);

CREATE INDEX IF NOT EXISTS idx_founder_connections_requester ON founder_connections(requester_id);
CREATE INDEX IF NOT EXISTS idx_founder_connections_recipient ON founder_connections(recipient_id);
CREATE INDEX IF NOT EXISTS idx_founder_connections_status ON founder_connections(status);
CREATE INDEX IF NOT EXISTS idx_founder_connections_accepted ON founder_connections(status) WHERE status = 'accepted';

CREATE TRIGGER trg_founder_connections_updated_at
  BEFORE UPDATE ON founder_connections
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- --------------------------------------------------------------------------
-- 12. expert_listings
-- --------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS expert_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  expertise_type TEXT NOT NULL CHECK (expertise_type IN ('design_review', 'tech_architecture', 'gtm_strategy', 'fundraising', 'legal', 'other')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_expert_listings_user ON expert_listings(user_id);
CREATE INDEX IF NOT EXISTS idx_expert_listings_type ON expert_listings(expertise_type);
CREATE INDEX IF NOT EXISTS idx_expert_listings_active ON expert_listings(is_active) WHERE is_active = true;

CREATE TRIGGER trg_expert_listings_updated_at
  BEFORE UPDATE ON expert_listings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- --------------------------------------------------------------------------
-- 13. reputation_events
-- --------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS reputation_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('intro_made', 'roundtable_participation', 'help_given', 'expertise_shared', 'mentor_session')),
  points INTEGER NOT NULL DEFAULT 1,
  source_id UUID,
  source_type TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reputation_events_user ON reputation_events(user_id);
CREATE INDEX IF NOT EXISTS idx_reputation_events_type ON reputation_events(event_type);
CREATE INDEX IF NOT EXISTS idx_reputation_events_created ON reputation_events(created_at DESC);

-- --------------------------------------------------------------------------
-- 14. engagement_streaks
-- --------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS engagement_streaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_checkin_date DATE,
  streak_started_at DATE,
  total_checkins INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_engagement_streaks_user ON engagement_streaks(user_id);
CREATE INDEX IF NOT EXISTS idx_engagement_streaks_current ON engagement_streaks(current_streak DESC);

CREATE TRIGGER trg_engagement_streaks_updated_at
  BEFORE UPDATE ON engagement_streaks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Section 3: Counter-sync triggers for social_feed_posts
-- ============================================================================

-- reaction_count: increment on INSERT, decrement on DELETE
CREATE OR REPLACE FUNCTION sync_social_feed_reaction_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE social_feed_posts SET reaction_count = reaction_count + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE social_feed_posts SET reaction_count = GREATEST(reaction_count - 1, 0) WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sync_social_feed_reaction_count
  AFTER INSERT OR DELETE ON social_feed_reactions
  FOR EACH ROW
  EXECUTE FUNCTION sync_social_feed_reaction_count();

-- comment_count: increment on INSERT, decrement on DELETE
CREATE OR REPLACE FUNCTION sync_social_feed_comment_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE social_feed_posts SET comment_count = comment_count + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE social_feed_posts SET comment_count = GREATEST(comment_count - 1, 0) WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sync_social_feed_comment_count
  AFTER INSERT OR DELETE ON social_feed_comments
  FOR EACH ROW
  EXECUTE FUNCTION sync_social_feed_comment_count();

-- ============================================================================
-- Section 4: Consent audit trigger
-- ============================================================================

CREATE OR REPLACE FUNCTION log_consent_change()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO consent_audit_log (user_id, category, previous_value, new_value)
    VALUES (NEW.user_id, NEW.category, false, NEW.enabled);
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.enabled IS DISTINCT FROM NEW.enabled THEN
      INSERT INTO consent_audit_log (user_id, category, previous_value, new_value)
      VALUES (NEW.user_id, NEW.category, OLD.enabled, NEW.enabled);
    END IF;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_consent_audit
  AFTER INSERT OR UPDATE ON consent_preferences
  FOR EACH ROW
  EXECUTE FUNCTION log_consent_change();

-- ============================================================================
-- Section 5: Materialized views (consent-gated, k-anonymous)
-- ============================================================================

-- Benchmark aggregates by startup stage
CREATE MATERIALIZED VIEW IF NOT EXISTS benchmark_stage_aggregates AS
SELECT
  p.stage,
  COUNT(*) AS founder_count,
  AVG(irs.overall_score)::NUMERIC(5,2) AS avg_irs_score,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY irs.overall_score) AS median_irs_score
FROM profiles p
INNER JOIN consent_preferences cp
  ON cp.user_id = p.id
  AND cp.category = 'benchmarks'
  AND cp.enabled = true
LEFT JOIN LATERAL (
  SELECT overall_score
  FROM investor_readiness_scores
  WHERE user_id = p.id
  ORDER BY created_at DESC
  LIMIT 1
) irs ON true
WHERE p.stage IS NOT NULL
GROUP BY p.stage
HAVING COUNT(*) >= 5;

-- Benchmark aggregates by industry
CREATE MATERIALIZED VIEW IF NOT EXISTS benchmark_industry_aggregates AS
SELECT
  p.industry,
  COUNT(*) AS founder_count,
  AVG(irs.overall_score)::NUMERIC(5,2) AS avg_irs_score,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY irs.overall_score) AS median_irs_score
FROM profiles p
INNER JOIN consent_preferences cp
  ON cp.user_id = p.id
  AND cp.category = 'benchmarks'
  AND cp.enabled = true
LEFT JOIN LATERAL (
  SELECT overall_score
  FROM investor_readiness_scores
  WHERE user_id = p.id
  ORDER BY created_at DESC
  LIMIT 1
) irs ON true
WHERE p.industry IS NOT NULL
GROUP BY p.industry
HAVING COUNT(*) >= 5;

-- Unique indexes required for REFRESH MATERIALIZED VIEW CONCURRENTLY
CREATE UNIQUE INDEX IF NOT EXISTS idx_benchmark_stage_agg_stage
  ON benchmark_stage_aggregates(stage);

CREATE UNIQUE INDEX IF NOT EXISTS idx_benchmark_industry_agg_industry
  ON benchmark_industry_aggregates(industry);

-- Refresh function for cron scheduling
CREATE OR REPLACE FUNCTION refresh_benchmark_aggregates()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY benchmark_stage_aggregates;
  REFRESH MATERIALIZED VIEW CONCURRENTLY benchmark_industry_aggregates;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Section 6: Realtime preparation (REPLICA IDENTITY FULL)
-- ============================================================================

ALTER TABLE social_feed_posts REPLICA IDENTITY FULL;
ALTER TABLE founder_messages REPLICA IDENTITY FULL;

-- ============================================================================
-- Section 7: RLS policies for all 14 new tables
-- ============================================================================

-- ---------- community_profiles ----------
ALTER TABLE community_profiles ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Authenticated users can read community profiles"
    ON community_profiles FOR SELECT
    USING (auth.uid() IS NOT NULL);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can create own community profile"
    ON community_profiles FOR INSERT
    WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update own community profile"
    ON community_profiles FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can delete own community profile"
    ON community_profiles FOR DELETE
    USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Service role manages community profiles"
    ON community_profiles FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ---------- consent_preferences ----------
ALTER TABLE consent_preferences ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users can read own consent preferences"
    ON consent_preferences FOR SELECT
    USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can create own consent preferences"
    ON consent_preferences FOR INSERT
    WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update own consent preferences"
    ON consent_preferences FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can delete own consent preferences"
    ON consent_preferences FOR DELETE
    USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Service role manages consent preferences"
    ON consent_preferences FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ---------- consent_audit_log ----------
ALTER TABLE consent_audit_log ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users can read own consent audit log"
    ON consent_audit_log FOR SELECT
    USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Service role manages consent audit log"
    ON consent_audit_log FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ---------- subcommunity_sponsors ----------
ALTER TABLE subcommunity_sponsors ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Authenticated users can read subcommunity sponsors"
    ON subcommunity_sponsors FOR SELECT
    USING (auth.uid() IS NOT NULL);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Service role manages subcommunity sponsors"
    ON subcommunity_sponsors FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ---------- cohorts ----------
ALTER TABLE cohorts ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Cohort members can read their cohorts"
    ON cohorts FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM cohort_members cm
        WHERE cm.cohort_id = cohorts.id
          AND cm.user_id = auth.uid()
          AND cm.is_active = true
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Service role manages cohorts"
    ON cohorts FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ---------- cohort_members ----------
ALTER TABLE cohort_members ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Cohort members can read fellow members"
    ON cohort_members FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM cohort_members my_membership
        WHERE my_membership.cohort_id = cohort_members.cohort_id
          AND my_membership.user_id = auth.uid()
          AND my_membership.is_active = true
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can leave cohorts"
    ON cohort_members FOR DELETE
    USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Service role manages cohort members"
    ON cohort_members FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ---------- social_feed_posts ----------
ALTER TABLE social_feed_posts ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Authenticated users can read social feed posts"
    ON social_feed_posts FOR SELECT
    USING (auth.uid() IS NOT NULL);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can create own social feed posts"
    ON social_feed_posts FOR INSERT
    WITH CHECK (auth.uid() = author_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update own social feed posts"
    ON social_feed_posts FOR UPDATE
    USING (auth.uid() = author_id)
    WITH CHECK (auth.uid() = author_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can delete own social feed posts"
    ON social_feed_posts FOR DELETE
    USING (auth.uid() = author_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Service role manages social feed posts"
    ON social_feed_posts FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ---------- social_feed_reactions ----------
ALTER TABLE social_feed_reactions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Authenticated users can read social feed reactions"
    ON social_feed_reactions FOR SELECT
    USING (auth.uid() IS NOT NULL);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can add own social feed reactions"
    ON social_feed_reactions FOR INSERT
    WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can remove own social feed reactions"
    ON social_feed_reactions FOR DELETE
    USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Service role manages social feed reactions"
    ON social_feed_reactions FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ---------- social_feed_comments ----------
ALTER TABLE social_feed_comments ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Authenticated users can read social feed comments"
    ON social_feed_comments FOR SELECT
    USING (auth.uid() IS NOT NULL);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can create own social feed comments"
    ON social_feed_comments FOR INSERT
    WITH CHECK (auth.uid() = author_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update own social feed comments"
    ON social_feed_comments FOR UPDATE
    USING (auth.uid() = author_id)
    WITH CHECK (auth.uid() = author_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can delete own social feed comments"
    ON social_feed_comments FOR DELETE
    USING (auth.uid() = author_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Service role manages social feed comments"
    ON social_feed_comments FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ---------- founder_messages ----------
ALTER TABLE founder_messages ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users can read own sent and received messages"
    ON founder_messages FOR SELECT
    USING (auth.uid() = sender_id OR auth.uid() = recipient_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can send messages as themselves"
    ON founder_messages FOR INSERT
    WITH CHECK (auth.uid() = sender_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Service role manages founder messages"
    ON founder_messages FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ---------- founder_connections ----------
ALTER TABLE founder_connections ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users can read own connections"
    ON founder_connections FOR SELECT
    USING (auth.uid() = requester_id OR auth.uid() = recipient_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can create connection requests"
    ON founder_connections FOR INSERT
    WITH CHECK (auth.uid() = requester_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Recipient can accept or decline connections"
    ON founder_connections FOR UPDATE
    USING (auth.uid() = recipient_id OR auth.uid() = requester_id)
    WITH CHECK (auth.uid() = recipient_id OR auth.uid() = requester_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Either party can remove connections"
    ON founder_connections FOR DELETE
    USING (auth.uid() = requester_id OR auth.uid() = recipient_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Service role manages founder connections"
    ON founder_connections FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ---------- expert_listings ----------
ALTER TABLE expert_listings ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Authenticated users can read expert listings"
    ON expert_listings FOR SELECT
    USING (auth.uid() IS NOT NULL);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can create own expert listings"
    ON expert_listings FOR INSERT
    WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update own expert listings"
    ON expert_listings FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can delete own expert listings"
    ON expert_listings FOR DELETE
    USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Service role manages expert listings"
    ON expert_listings FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ---------- reputation_events ----------
ALTER TABLE reputation_events ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users can read own reputation events"
    ON reputation_events FOR SELECT
    USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Service role manages reputation events"
    ON reputation_events FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ---------- engagement_streaks ----------
ALTER TABLE engagement_streaks ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users can read own engagement streak"
    ON engagement_streaks FOR SELECT
    USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Service role manages engagement streaks"
    ON engagement_streaks FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- Section 8: Table comments
-- ============================================================================

COMMENT ON TABLE community_profiles IS
  'Public founder profiles for community features. Visibility controlled via visibility_settings JSONB. Phase 47.';

COMMENT ON TABLE consent_preferences IS
  'Per-category consent toggles (benchmarks, social_feed, directory, messaging, investor_intros). Gate for all data sharing. Phase 47.';

COMMENT ON TABLE consent_audit_log IS
  'Immutable audit trail for every consent_preferences change. Trigger-populated, append-only. Phase 47.';

COMMENT ON TABLE subcommunity_sponsors IS
  'Sponsorship records for subcommunities. Admin-managed via service role. Phase 48.';

COMMENT ON TABLE cohorts IS
  'Small-group cohort containers (stage, industry, custom). Auto-matched by system. Phase 48.';

COMMENT ON TABLE cohort_members IS
  'Cohort membership with member/facilitator roles. Managed by service role. Phase 48.';

COMMENT ON TABLE social_feed_posts IS
  'Social feed posts (milestone, achievement, update, shoutout). Counter-synced reaction_count and comment_count. Phase 49.';

COMMENT ON TABLE social_feed_reactions IS
  'Typed reactions on feed posts (encourage, celebrate, insightful). Unique per user+post+type. Phase 49.';

COMMENT ON TABLE social_feed_comments IS
  'Threaded comments on feed posts. parent_comment_id enables nested threading. Phase 49.';

COMMENT ON TABLE founder_messages IS
  'Direct messages between founders. Supports Fred-facilitated introductions. Phase 52.';

COMMENT ON TABLE founder_connections IS
  'Connection requests between founders (pending, accepted, blocked, declined). Phase 50.';

COMMENT ON TABLE expert_listings IS
  'Expertise marketplace listings (design review, tech architecture, GTM, fundraising, legal). Phase 51.';

COMMENT ON TABLE reputation_events IS
  'Point-based reputation events (intro_made, roundtable, help_given, expertise, mentor). Phase 53.';

COMMENT ON TABLE engagement_streaks IS
  'Daily check-in streak tracking. One row per user. Phase 53.';
