# Phase 47: Community Data Layer & Consent - Research

**Researched:** 2026-02-11
**Domain:** Database schema design, consent management, anonymized data pipelines, subcommunity infrastructure
**Confidence:** HIGH

## Summary

Phase 47 is the foundational data layer for ALL community features (Phases 47-53). The existing codebase already has a solid Phase 41 community foundation: 5 tables (`communities`, `community_members`, `community_posts`, `community_post_reactions`, `community_post_replies`) with full RLS, trigger-based counter sync, and complete CRUD API routes. Phase 47 must EXTEND this foundation -- not rebuild it -- by adding community profiles, consent management, subcommunity sponsorship, anonymized data pipeline, and the schema scaffolding for 6 downstream phases.

The profiles table already has rich founder data (stage, industry, revenue_range, team_size, funding_history, product_status, traction, runway, primary_constraint, ninety_day_goal) from migrations 032, 037, and 050. The settings page stores notification preferences in `profiles.metadata` (JSONB). The push notification preferences pattern in `lib/push/preferences.ts` provides an excellent model for consent management -- category-based opt-in/out stored in a dedicated table with merge-with-defaults logic.

**Primary recommendation:** Create a single large migration (053) with ~12 new tables and ~2 new views that covers ALL downstream phase schema needs. Use a dedicated `consent_preferences` table (not JSONB on profiles) for granular consent management. Use a `community_profiles` table that references `profiles` for community-visible data. Leverage existing Supabase RLS patterns (DO $$ BEGIN...EXCEPTION WHEN duplicate_object THEN NULL; END $$) from migration 051.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Supabase (Postgres) | Already in use | Database, RLS, auth | Existing infrastructure, all 52 migrations built on it |
| @supabase/supabase-js | Already in use | Client SDK | Used by all db modules |
| @supabase/ssr | Already in use | Server-side auth | Used in lib/supabase/server.ts |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Supabase Realtime | Built into Supabase | Live subscriptions | Social feed updates, messaging (Phase 49/52, not Phase 47) |
| Zod (v4.3.6) | Already installed | Schema validation | API route input validation |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Dedicated consent_preferences table | JSONB column on profiles | Separate table is better: queryable, indexable, auditable, supports consent history |
| community_profiles table | Extending profiles directly | Separate table avoids bloating the auth trigger, keeps community data opt-in |
| Postgres materialized views | Real-time computed aggregates | Materialized views are better for benchmarks -- refreshed on schedule, not per-request |

**Installation:**
No new dependencies needed. This phase is purely database schema, API routes, and TypeScript modules.

## Architecture Patterns

### Recommended Project Structure
```
lib/db/
  migrations/
    053_community_data_layer.sql    # Single migration with all new tables
  communities.ts                    # EXTEND (already exists from Phase 41)
  community-profiles.ts             # NEW: community profile CRUD
  consent.ts                        # NEW: consent preferences CRUD
  subcommunities.ts                 # NEW: subcommunity CRUD
  benchmark-pipeline.ts             # NEW: anonymized aggregation queries

app/api/
  communities/                      # EXISTING (Phase 41)
    [slug]/
      subcommunities/               # NEW: subcommunity routes
        route.ts
        [subId]/
          route.ts
          members/
            route.ts
          sponsors/
            route.ts
  community/
    profile/
      route.ts                      # NEW: community profile CRUD
    consent/
      route.ts                      # NEW: consent preferences
  benchmarks/
    aggregates/
      route.ts                      # NEW: anonymized pipeline

app/dashboard/
  settings/
    page.tsx                        # MODIFY: add consent management section
  communities/                      # EXISTING (Phase 41)
```

### Pattern 1: RLS Policy Pattern (from existing codebase)
**What:** All new tables follow the existing RLS pattern from migration 051
**When to use:** Every new table
**Example:**
```sql
-- Source: lib/db/migrations/051_founder_communities.sql (line 211-256)
ALTER TABLE new_table ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "policy_name"
    ON new_table FOR SELECT
    USING (auth.uid() IS NOT NULL AND ...);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Service role manages new_table"
    ON new_table FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
```

### Pattern 2: Trigger-Based Counter Sync (from existing codebase)
**What:** Use INSERT/DELETE triggers to maintain denormalized counts
**When to use:** Any table where a related table's count is needed frequently (member counts, reaction counts)
**Example:**
```sql
-- Source: lib/db/migrations/051_founder_communities.sql (line 143-160)
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
```

### Pattern 3: Service Client for Server Operations (from existing codebase)
**What:** Use `createServiceClient()` (bypasses RLS) for server-side CRUD modules
**When to use:** All `lib/db/*.ts` modules
**Example:**
```typescript
// Source: lib/db/communities.ts (line 220)
import { createServiceClient } from "@/lib/supabase/server";

export async function createCommunityProfile(params: {...}): Promise<CommunityProfile> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("community_profiles")
    .insert({...})
    .select()
    .single();
  if (error) throw new Error(`Failed: ${error.message}`);
  return mapRow(data);
}
```

### Pattern 4: Tier Gating for API Routes (from existing codebase)
**What:** Use `requireTier()` wrapper or `checkTierForRequest()` to gate features by tier
**When to use:** Any API route that has tier-specific access
**Example:**
```typescript
// Source: lib/api/tier-middleware.ts (line 132-185)
import { requireTier } from "@/lib/api/tier-middleware";
import { UserTier } from "@/lib/constants";

// Entire route requires Studio
export const POST = requireTier(UserTier.STUDIO)(async (req) => {
  return NextResponse.json({ success: true });
});

// Or inline check for mixed-tier responses
export async function GET(req: NextRequest) {
  const { tier, userId } = await getTierForRequest(req);
  if (tier >= UserTier.PRO) {
    // Return full segmented benchmarks
  } else {
    // Return stage average only
  }
}
```

### Pattern 5: Consent-Gated Queries (NEW pattern for this phase)
**What:** All data pipeline queries must join with consent_preferences to respect user choices
**When to use:** Any query that aggregates or exposes user data to other users
**Example:**
```sql
-- Only aggregate data from users who consented to benchmarks
CREATE OR REPLACE VIEW benchmark_aggregates AS
SELECT
  p.stage,
  p.industry,
  COUNT(*) as founder_count,
  AVG(irs.overall_score) as avg_irs_score,
  -- ... more aggregates
FROM profiles p
JOIN consent_preferences cp ON cp.user_id = p.id
  AND cp.category = 'benchmarks'
  AND cp.enabled = true
LEFT JOIN investor_readiness_scores irs ON irs.user_id = p.id
WHERE p.stage IS NOT NULL
GROUP BY p.stage, p.industry
HAVING COUNT(*) >= 5;  -- k-anonymity: minimum 5 founders per bucket
```

### Anti-Patterns to Avoid
- **Storing consent in profiles.metadata JSONB:** Not queryable in SQL JOINs, not auditable, no history. Use a dedicated table.
- **Adding community fields to the profiles table directly:** Bloats the auth trigger (`handle_new_user`), makes community data non-opt-in. Use a separate `community_profiles` table.
- **Creating separate migrations per table:** All tables should be in ONE migration for atomic deployment and FK consistency.
- **Using Supabase Realtime for Phase 47:** Real-time subscriptions are for Phases 49/52 (feed/messaging). Phase 47 is schema-only foundation.
- **Exposing individual user data in aggregate views:** Always enforce k-anonymity (minimum group size) and consent checks.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Tier checking | Custom subscription lookup | `getUserTier()` from `lib/api/tier-middleware.ts` | Already resolves Stripe price IDs, handles grace periods |
| Auth validation | Manual JWT parsing | `requireAuth()` from `lib/auth.ts` | Already handles session cookies, token refresh |
| API response format | Custom response shapes | `{ success: true/false, data/error }` pattern | Every existing route uses this, consistency matters |
| Slug generation | Custom slug logic | Existing slug pattern from `lib/db/communities.ts` line 222-229 | Already handles deduplication with timestamp suffix |
| Updated_at triggers | Manual timestamp updates | `update_updated_at_column()` function from migration 049 | Already exists globally, reuse with CREATE TRIGGER |
| Counter sync | Application-level counting | Postgres triggers (pattern from migration 051) | Race-condition-free, guaranteed consistency |
| Push notification preferences | Custom preferences storage | Follow `lib/push/preferences.ts` pattern | Category-based defaults with merge logic, well-tested |

**Key insight:** The codebase has mature, well-tested patterns for every infrastructure concern. Phase 47's job is schema design and data modeling, not reinventing infrastructure.

## Common Pitfalls

### Pitfall 1: Schema That Requires Future Migrations
**What goes wrong:** Designing tables that can't support downstream phases, requiring ALTER TABLE migrations that are risky in production.
**Why it happens:** Not analyzing ALL 6 downstream phases' requirements before designing tables.
**How to avoid:** The schema must support Phases 48-53 from day one. Every table listed in this research was derived from analyzing ALL downstream requirements.
**Warning signs:** If a planned table doesn't have at least one downstream phase that needs it, question whether it belongs in Phase 47.

### Pitfall 2: Consent That Only Works at Insert Time
**What goes wrong:** Checking consent only when data is first created, not when it's queried. If a user revokes consent, their data continues to appear in aggregates.
**Why it happens:** Treating consent as a one-time check rather than a live filter.
**How to avoid:** Consent must be enforced at QUERY time via JOINs or views, not just at INSERT time. When a user revokes benchmark consent, their data must immediately disappear from aggregates.
**Warning signs:** Any aggregate query that does not JOIN with consent_preferences.

### Pitfall 3: De-anonymization Through Small Group Sizes
**What goes wrong:** Aggregate data reveals individual founders when the group is too small (e.g., "1 founder in AR at Series A stage" effectively identifies them).
**Why it happens:** No minimum group size enforcement.
**How to avoid:** All aggregate views/queries must have `HAVING COUNT(*) >= 5` (k-anonymity threshold). Free tier sees even less granular data.
**Warning signs:** Any benchmark query that returns results for groups smaller than 5.

### Pitfall 4: Community Profiles Leaking Private Data
**What goes wrong:** Community profile shows data the user didn't explicitly make public (e.g., revenue_range, runway details from their private profile).
**Why it happens:** Joining community_profiles with profiles and exposing all columns.
**How to avoid:** `community_profiles` has its own columns for public-facing data. The visibility_settings JSONB controls which fields are shown. RLS policies should restrict what other users can see based on visibility settings.
**Warning signs:** Any query that SELECTs from `profiles` directly for community display purposes.

### Pitfall 5: Subcommunities Duplicating the communities Table
**What goes wrong:** Creating a separate `subcommunities` table that duplicates the structure of `communities`, leading to two parallel systems.
**Why it happens:** Not recognizing that subcommunities ARE communities with a parent reference.
**How to avoid:** Add a `parent_community_id` column to the existing `communities` table (or create a `subcommunity` category type). Subcommunities should reuse the same members, posts, reactions, and replies infrastructure.
**Warning signs:** If you're creating `subcommunity_posts`, `subcommunity_members` tables that mirror the community tables.

### Pitfall 6: RLS Policies Conflicting with Phase 41
**What goes wrong:** New RLS policies on existing tables (like `communities`) conflict with Phase 41's policies, causing silent permission denials.
**Why it happens:** Postgres RLS is additive -- multiple SELECT policies are ORed, but UPDATE/DELETE policies can conflict.
**How to avoid:** Use ALTER on existing columns rather than adding conflicting policies. For new columns on `communities` (like `parent_community_id` or sponsorship fields), the existing policies still apply. Only add NEW policies for NEW tables.
**Warning signs:** "Permission denied" errors on operations that worked before Phase 47.

## Code Examples

### Example 1: Community Profile CRUD Module
```typescript
// Source: follows pattern from lib/db/communities.ts
import { createServiceClient } from "@/lib/supabase/server";

export interface CommunityProfile {
  id: string;
  userId: string;
  displayName: string;
  bio: string;
  stage: string | null;
  industry: string | null;
  achievements: string[];
  visibilitySettings: {
    show_name: boolean;
    show_stage: boolean;
    show_industry: boolean;
    show_bio: boolean;
    show_achievements: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

export async function getOrCreateCommunityProfile(
  userId: string
): Promise<CommunityProfile> {
  const supabase = createServiceClient();

  // Try to get existing
  const { data, error } = await supabase
    .from("community_profiles")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (data) return mapProfile(data);

  // Create from profiles table data
  const { data: profile } = await supabase
    .from("profiles")
    .select("name, stage, industry")
    .eq("id", userId)
    .single();

  const { data: newProfile, error: insertError } = await supabase
    .from("community_profiles")
    .insert({
      user_id: userId,
      display_name: profile?.name || "Anonymous Founder",
      bio: "",
      stage: profile?.stage || null,
      industry: profile?.industry || null,
      achievements: [],
      visibility_settings: {
        show_name: true,
        show_stage: true,
        show_industry: true,
        show_bio: true,
        show_achievements: true,
      },
    })
    .select()
    .single();

  if (insertError) throw new Error(`Failed: ${insertError.message}`);
  return mapProfile(newProfile);
}
```

### Example 2: Consent Preferences Module
```typescript
// Source: follows pattern from lib/push/preferences.ts
export type ConsentCategory =
  | "benchmarks"
  | "social_feed"
  | "directory"
  | "messaging";

export interface ConsentCategoryConfig {
  enabled: boolean;
  label: string;
  description: string;
}

export const CONSENT_DEFAULTS: Record<ConsentCategory, ConsentCategoryConfig> = {
  benchmarks: {
    enabled: false, // Opt-IN (default off)
    label: "Benchmark Data",
    description: "Allow your anonymized data to be included in community benchmarks",
  },
  social_feed: {
    enabled: false,
    label: "Social Feed",
    description: "Allow your milestones to appear in the community feed",
  },
  directory: {
    enabled: false,
    label: "Founder Directory",
    description: "Make your profile searchable in the founder directory",
  },
  messaging: {
    enabled: false,
    label: "Direct Messaging",
    description: "Allow other founders to send you direct messages",
  },
};
```

### Example 3: Anonymized Aggregate View
```sql
-- Materialized view for benchmark aggregates
-- Refreshed by cron job, never computed on-demand
CREATE MATERIALIZED VIEW IF NOT EXISTS benchmark_stage_aggregates AS
SELECT
  p.stage,
  COUNT(*) as founder_count,
  AVG(irs.overall_score)::NUMERIC(5,2) as avg_irs_score,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY irs.overall_score) as median_irs_score,
  COUNT(DISTINCT rf.category) as avg_red_flag_categories,
  COUNT(DISTINCT m.id) FILTER (WHERE m.status = 'completed') as avg_completed_milestones
FROM profiles p
INNER JOIN consent_preferences cp
  ON cp.user_id = p.id
  AND cp.category = 'benchmarks'
  AND cp.enabled = true
LEFT JOIN LATERAL (
  SELECT overall_score FROM investor_readiness_scores
  WHERE user_id = p.id
  ORDER BY created_at DESC LIMIT 1
) irs ON true
LEFT JOIN fred_red_flags rf ON rf.user_id = p.id AND rf.status = 'active'
LEFT JOIN milestones m ON m.user_id = p.id::text
WHERE p.stage IS NOT NULL
GROUP BY p.stage
HAVING COUNT(*) >= 5;

-- Refresh function called by cron
CREATE OR REPLACE FUNCTION refresh_benchmark_aggregates()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY benchmark_stage_aggregates;
END;
$$ LANGUAGE plpgsql;
```

## Existing Infrastructure Analysis

### Profiles Table (Current State)
From migrations 032, 037, 048, 050:
```
profiles (
  id UUID PK REFERENCES auth.users,
  email TEXT,
  name TEXT,
  stage TEXT,                    -- idea, mvp, pre-seed, seed, series-a
  challenges JSONB DEFAULT '[]',
  teammate_emails JSONB DEFAULT '[]',
  tier INTEGER DEFAULT 0,       -- 0=Free, 1=Pro, 2=Studio
  onboarding_completed BOOLEAN,
  industry TEXT,                 -- from enrichment
  revenue_range TEXT,            -- pre-revenue, $0-10k, etc.
  team_size INTEGER,
  funding_history TEXT,          -- bootstrapped, angel, seed, etc.
  enriched_at TIMESTAMPTZ,
  enrichment_source TEXT,
  product_status TEXT,           -- idea, prototype, mvp, launched, scaling
  traction TEXT,                 -- free-text
  runway JSONB DEFAULT '{}',    -- {time, money, energy}
  primary_constraint TEXT,       -- demand, distribution, etc.
  ninety_day_goal TEXT,
  metadata JSONB,               -- used for notification_prefs, company_name
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
```

**Note:** The `metadata` column is NOT in any migration file but is used in the settings page. It was likely added directly to the database. The settings page stores `notification_prefs` and `company_name` in it. This is an important precedent -- consent preferences should NOT go in this JSONB blob.

### Phase 41 Foundation (Already Delivered)
From migration 051:
```
communities           - community spaces (name, slug, category, creator_id, member_count)
community_members     - membership (community_id, user_id, role: owner/moderator/member)
community_posts       - posts (community_id, author_id, content, post_type: post/question/update/milestone)
community_post_reactions - typed reactions (post_id, user_id, reaction_type: like/insightful/support)
community_post_replies   - threaded replies (post_id, author_id, parent_reply_id)
```

All have RLS, triggers for counter sync, and full API routes at `app/api/communities/`.

### Tier System (Already Delivered)
- `UserTier` enum: FREE=0, PRO=1, STUDIO=2
- `user_subscriptions` table links users to Stripe
- `getUserTier()` in `lib/api/tier-middleware.ts` resolves tier from subscription
- `requireTier(UserTier.PRO)` wrapper for route-level gating
- `checkTierForRequest()` for inline tier checks
- Communities nav item is currently `tier: UserTier.FREE` in constants

### Data Available for Benchmarks
These tables contain aggregatable founder data:
- `profiles` -- stage, industry, revenue_range, team_size, funding_history, product_status
- `investor_readiness_scores` -- overall_score, category_scores (team, market, product, traction, financials, pitch)
- `fred_red_flags` -- category, severity, status
- `milestones` -- category, status, completed_at
- `fred_conversation_state` -- current_step, step_statuses, diagnostic_tags
- `journey_events` -- event_type, score changes

## Complete Schema Design for Phase 47

### Tables to CREATE (new)

#### 1. community_profiles
```sql
CREATE TABLE community_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL DEFAULT '',
  bio TEXT NOT NULL DEFAULT '',
  avatar_url TEXT,
  stage TEXT,           -- copied from profiles at creation, user can customize
  industry TEXT,        -- copied from profiles at creation, user can customize
  achievements TEXT[] NOT NULL DEFAULT '{}',
  visibility_settings JSONB NOT NULL DEFAULT '{
    "show_name": true,
    "show_stage": true,
    "show_industry": true,
    "show_bio": true,
    "show_achievements": true
  }'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);
```
**Used by:** Phases 47, 49, 50, 51, 52, 53

#### 2. consent_preferences
```sql
CREATE TABLE consent_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('benchmarks', 'social_feed', 'directory', 'messaging')),
  enabled BOOLEAN NOT NULL DEFAULT false,   -- opt-IN by default (off)
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, category)
);
```
**Used by:** Phases 47, 48, 49, 52

#### 3. consent_audit_log
```sql
CREATE TABLE consent_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  previous_value BOOLEAN NOT NULL,
  new_value BOOLEAN NOT NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_address TEXT,
  user_agent TEXT
);
```
**Used by:** Phase 47 (compliance/audit trail)

#### 4. subcommunity_sponsors
```sql
CREATE TABLE subcommunity_sponsors (
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
  UNIQUE(community_id, sponsor_user_id)
);
```
**Used by:** Phase 47

#### 5. cohorts
```sql
CREATE TABLE cohorts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  cohort_type TEXT NOT NULL DEFAULT 'stage' CHECK (cohort_type IN ('stage', 'industry', 'custom')),
  max_members INTEGER NOT NULL DEFAULT 8,
  status TEXT NOT NULL DEFAULT 'forming' CHECK (status IN ('forming', 'active', 'archived')),
  match_criteria JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```
**Used by:** Phase 50

#### 6. cohort_members
```sql
CREATE TABLE cohort_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cohort_id UUID NOT NULL REFERENCES cohorts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'facilitator')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  left_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  UNIQUE(cohort_id, user_id)
);
```
**Used by:** Phases 50, 51

#### 7. social_feed_posts
```sql
CREATE TABLE social_feed_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  post_type TEXT NOT NULL DEFAULT 'milestone'
    CHECK (post_type IN ('milestone', 'achievement', 'update', 'shoutout')),
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
```
**Used by:** Phase 49

#### 8. social_feed_reactions
```sql
CREATE TABLE social_feed_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES social_feed_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reaction_type TEXT NOT NULL DEFAULT 'encourage'
    CHECK (reaction_type IN ('encourage', 'celebrate', 'insightful')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(post_id, user_id, reaction_type)
);
```
**Used by:** Phase 49

#### 9. social_feed_comments
```sql
CREATE TABLE social_feed_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES social_feed_posts(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  parent_comment_id UUID REFERENCES social_feed_comments(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```
**Used by:** Phase 49

#### 10. founder_messages
```sql
CREATE TABLE founder_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  is_fred_facilitated BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```
**Used by:** Phase 52

#### 11. founder_connections
```sql
CREATE TABLE founder_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'blocked', 'declined')),
  source TEXT NOT NULL DEFAULT 'directory'
    CHECK (source IN ('directory', 'cohort', 'fred_suggestion', 'community')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(requester_id, recipient_id)
);
```
**Used by:** Phases 52, 53

#### 12. expert_listings
```sql
CREATE TABLE expert_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  expertise_type TEXT NOT NULL
    CHECK (expertise_type IN ('design_review', 'tech_architecture', 'gtm_strategy', 'fundraising', 'legal', 'other')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```
**Used by:** Phase 53

#### 13. reputation_events
```sql
CREATE TABLE reputation_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL
    CHECK (event_type IN ('intro_made', 'roundtable_participation', 'help_given', 'expertise_shared', 'mentor_session')),
  points INTEGER NOT NULL DEFAULT 1,
  source_id UUID,          -- FK to the source entity (cohort, expert_listing, etc.)
  source_type TEXT,         -- 'cohort', 'expert_listing', 'connection'
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```
**Used by:** Phase 53

#### 14. engagement_streaks
```sql
CREATE TABLE engagement_streaks (
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
```
**Used by:** Phase 51

### Columns to ADD to existing tables

#### communities (extend for subcommunity support)
```sql
ALTER TABLE communities ADD COLUMN IF NOT EXISTS parent_community_id UUID REFERENCES communities(id) ON DELETE CASCADE;
ALTER TABLE communities ADD COLUMN IF NOT EXISTS is_sponsored BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE communities ADD COLUMN IF NOT EXISTS tier_required INTEGER NOT NULL DEFAULT 0;
```
**Rationale:** Subcommunities ARE communities with a parent reference. Adding `parent_community_id` to the existing `communities` table avoids duplicating the entire community infrastructure.

### Views to CREATE

#### benchmark_stage_aggregates (Materialized View)
Anonymized, consent-gated aggregate data by stage.
**Used by:** Phase 48

#### benchmark_industry_aggregates (Materialized View)
Anonymized, consent-gated aggregate data by industry.
**Used by:** Phase 48

## RLS Strategy

### Pattern for New Tables
Follow the exact pattern from migration 051 (Phase 41). Every table gets:

1. `ENABLE ROW LEVEL SECURITY`
2. User-scoped SELECT (via `auth.uid()`)
3. User-scoped INSERT (`auth.uid() = user_id`)
4. User-scoped UPDATE (`auth.uid() = user_id`)
5. User-scoped DELETE (`auth.uid() = user_id`)
6. Service role full access (`auth.jwt() ->> 'role' = 'service_role'`)

### Special RLS Cases

**community_profiles:**
- SELECT: Any authenticated user can read profiles WHERE visibility allows (check visibility_settings JSONB). Service role can read all.
- INSERT/UPDATE/DELETE: Only own profile (`auth.uid() = user_id`)

**consent_preferences:**
- SELECT/INSERT/UPDATE/DELETE: Only own preferences (`auth.uid() = user_id`)
- Service role can read all (for aggregate pipeline)

**founder_messages:**
- SELECT: Sender OR recipient (`auth.uid() = sender_id OR auth.uid() = recipient_id`)
- INSERT: Only as sender (`auth.uid() = sender_id`)
- No UPDATE (messages are immutable)
- No DELETE by users (admin only via service role)

**social_feed_posts:**
- SELECT: All authenticated users (public feed, consent check at application level)
- INSERT: Only own posts, requires social_feed consent
- UPDATE/DELETE: Only own posts

**Materialized views:**
- Not subject to RLS (they are pre-aggregated, anonymized)
- Access controlled at API route level via tier gating

### Interaction with Phase 41 Policies
The existing Phase 41 RLS policies on `communities`, `community_members`, `community_posts`, `community_post_reactions`, and `community_post_replies` remain UNTOUCHED. The new `parent_community_id` column on `communities` is covered by existing policies since they don't restrict based on that column.

New policies are only needed for the `subcommunity_sponsors` table (which is a new table) and to allow community browsing to include subcommunities.

## Supabase Real-time Strategy

**Phase 47: DO NOT USE real-time.** This phase is infrastructure/schema only.

**Future phases that should use real-time:**
- Phase 49 (Milestone Social Feed): Subscribe to `social_feed_posts` for live feed updates
- Phase 52 (Direct Messaging): Subscribe to `founder_messages` for instant message delivery

**How to prepare:** Ensure tables that will use real-time have:
1. `REPLICA IDENTITY FULL` set (required for UPDATE/DELETE subscriptions)
2. Publication enabled for the table

```sql
-- Prepare for future real-time (Phase 49/52)
ALTER TABLE social_feed_posts REPLICA IDENTITY FULL;
ALTER TABLE founder_messages REPLICA IDENTITY FULL;
```

## Anonymized Data Pipeline Design

### Data Flow
1. **Source tables:** profiles, investor_readiness_scores, fred_red_flags, milestones, fred_conversation_state
2. **Consent gate:** JOIN with consent_preferences WHERE category='benchmarks' AND enabled=true
3. **Aggregation:** Materialized views compute per-stage and per-industry aggregates
4. **k-Anonymity:** HAVING COUNT(*) >= 5 ensures no individual can be identified
5. **Refresh:** Cron job calls `REFRESH MATERIALIZED VIEW CONCURRENTLY` every 6 hours
6. **Serving:** API routes query the materialized view (not source tables), apply tier-based filtering

### What Gets Aggregated
| Source Table | Metric | Aggregation |
|-------------|--------|-------------|
| investor_readiness_scores | IRS overall score | AVG, MEDIAN, percentile distribution |
| investor_readiness_scores | Category scores | AVG per category (team, market, product, etc.) |
| fred_red_flags | Risk distribution | COUNT by category and severity |
| milestones | Milestone completion rates | COUNT completed / COUNT total by category |
| fred_conversation_state | Process progress | Distribution of current_step |
| profiles | Stage distribution | COUNT by stage |

### Tier-Based Access
| Data | Free | Pro | Studio |
|------|------|-----|--------|
| Stage average IRS | Yes | Yes | Yes |
| Industry-segmented benchmarks | No | Yes | Yes |
| Red Flag heatmap | No | Yes | Yes |
| Custom segment queries | No | No | Yes |

## Subcommunity Design Decision

**DECISION: Subcommunities extend the `communities` table with `parent_community_id`.**

Rationale:
- The existing `communities` table, `community_members`, `community_posts`, and all associated triggers/RLS/API routes work unchanged for subcommunities
- A subcommunity is just a community with `parent_community_id != NULL`
- The existing slug-based API routes (`/api/communities/[slug]`) work for both
- Members of a subcommunity are NOT automatically members of the parent (explicit join required)
- The `category` column on communities already supports 'industry', 'stage', 'topic', 'general'

**What Phase 47 adds to communities:**
- `parent_community_id UUID REFERENCES communities(id)` -- links subcommunity to parent
- `is_sponsored BOOLEAN DEFAULT false` -- marks sponsored subcommunities
- `tier_required INTEGER DEFAULT 0` -- minimum tier to access (for tier gating)

**New table for sponsorship:**
- `subcommunity_sponsors` -- tracks who sponsors what, with branding assets and expiry

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Notification prefs in profiles.metadata JSONB | Dedicated notification_configs table + push preferences module | Phase 28/31 | Consent should follow this evolution: dedicated table, not JSONB blob |
| user_id VARCHAR in early tables | user_id UUID REFERENCES auth.users in later tables | Phase 27+ | All new tables must use UUID with FK to auth.users |
| current_setting('app.user_id') for RLS | auth.uid() for RLS | Phase 27+ | All new RLS policies must use auth.uid(), not current_setting |
| No counter sync | Trigger-based counter sync | Phase 41 | All tables with denormalized counts must use triggers |

**Deprecated/outdated:**
- `current_setting('app.user_id', true)` in RLS policies (used by migration 009, 012) -- replaced by `auth.uid()` in all modern tables
- `user_id TEXT/VARCHAR` column types -- all new tables use `UUID REFERENCES auth.users(id)`

## Open Questions

Things that couldn't be fully resolved:

1. **profiles.metadata column origin**
   - What we know: The settings page reads/writes `metadata.notification_prefs` and `metadata.company_name` from the profiles table. No migration explicitly adds this column.
   - What's unclear: Was it added via Supabase dashboard directly? Is it a native Supabase column?
   - Recommendation: Do NOT use profiles.metadata for consent. Create a dedicated consent_preferences table. But be aware this column exists and is used.

2. **Materialized view refresh strategy**
   - What we know: Supabase supports pg_cron for scheduled jobs. Materialized views with CONCURRENTLY require a unique index.
   - What's unclear: Whether pg_cron is enabled on this Supabase instance, or if we need a Vercel Cron / external trigger.
   - Recommendation: Plan for both -- create a Postgres function for the refresh, then trigger it via pg_cron if available OR via an API endpoint called by Vercel Cron.

3. **How Phase 41 UI handles communities nav**
   - What we know: `DASHBOARD_NAV` in constants.ts already has communities at `UserTier.FREE`. The UI pages exist at `app/dashboard/communities/`.
   - What's unclear: Whether the communities UI already has subcommunity browsing or if that's entirely new.
   - Recommendation: Check the community page UI before planning Phase 47 UI tasks. The settings page consent section is definitely new.

4. **Investor warm intro consent (Phase 53)**
   - What we know: EXPERT-02 requires founders to opt-in to investor warm introductions.
   - What's unclear: Whether this needs a separate consent category or falls under 'directory'.
   - Recommendation: Add it as a 5th consent category ('investor_intros') in the CHECK constraint, but don't expose it in UI until Phase 53.

## Sources

### Primary (HIGH confidence)
- `/opt/agency-workspace/sierra-fred-carey/lib/db/migrations/051_founder_communities.sql` -- Phase 41 schema (5 tables, RLS, triggers)
- `/opt/agency-workspace/sierra-fred-carey/lib/db/communities.ts` -- Phase 41 CRUD module (1071 lines)
- `/opt/agency-workspace/sierra-fred-carey/lib/db/migrations/032_profiles_table_trigger.sql` -- Base profiles schema
- `/opt/agency-workspace/sierra-fred-carey/lib/db/migrations/037_enriched_profiles.sql` -- Enrichment columns
- `/opt/agency-workspace/sierra-fred-carey/lib/db/migrations/050_founder_snapshot_columns.sql` -- Founder snapshot columns
- `/opt/agency-workspace/sierra-fred-carey/lib/db/migrations/033_user_subscriptions.sql` -- Subscription/tier schema
- `/opt/agency-workspace/sierra-fred-carey/lib/constants.ts` -- UserTier enum, feature matrix
- `/opt/agency-workspace/sierra-fred-carey/lib/api/tier-middleware.ts` -- Tier gating infrastructure
- `/opt/agency-workspace/sierra-fred-carey/lib/push/preferences.ts` -- Category-based preferences pattern
- `/opt/agency-workspace/sierra-fred-carey/app/dashboard/settings/page.tsx` -- Settings UI pattern
- `/opt/agency-workspace/sierra-fred-carey/lib/db/migrations/040_rls_hardening.sql` -- RLS hardening pattern
- `/opt/agency-workspace/sierra-fred-carey/lib/db/migrations/043_sharing_infrastructure.sql` -- Sharing/collaboration schema
- `/opt/agency-workspace/sierra-fred-carey/lib/db/migrations/036_red_flags.sql` -- Red flags schema (benchmark source)
- `/opt/agency-workspace/sierra-fred-carey/lib/db/migrations/025_investor_readiness_scores.sql` -- IRS schema (benchmark source)
- `/opt/agency-workspace/sierra-fred-carey/lib/db/migrations/009_journey_tables.sql` -- Milestones schema (benchmark source)
- `/opt/agency-workspace/sierra-fred-carey/lib/db/migrations/049_conversation_state.sql` -- Conversation state (benchmark source)
- `/opt/agency-workspace/sierra-fred-carey/.planning/ROADMAP.md` -- Phase dependencies and success criteria
- `/opt/agency-workspace/sierra-fred-carey/.planning/REQUIREMENTS-v5.md` -- Detailed requirements for all phases
- `/opt/agency-workspace/sierra-fred-carey/.planning/phases/41-founder-communities/41-01-PLAN.md` -- Phase 41 plan

### Secondary (MEDIUM confidence)
- Supabase RLS documentation -- standard patterns for row-level security
- PostgreSQL materialized views -- standard approach for pre-computed aggregates
- k-anonymity principles -- minimum group size of 5 for anonymization

### Tertiary (LOW confidence)
- None. All findings are based on direct codebase analysis.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- entirely based on existing codebase infrastructure, no new libraries needed
- Architecture: HIGH -- all patterns derived from existing codebase conventions (migrations 040, 041, 043, 051)
- Schema design: HIGH -- derived from analyzing all 7 downstream phase requirements against existing tables
- Pitfalls: HIGH -- identified from actual codebase patterns and anti-patterns observed in migration history
- Anonymized pipeline: MEDIUM -- materialized view approach is standard but refresh mechanism needs validation
- Consent model: HIGH -- follows proven push preferences pattern from lib/push/preferences.ts

**Research date:** 2026-02-11
**Valid until:** 2026-03-11 (stable domain, 30-day validity)
