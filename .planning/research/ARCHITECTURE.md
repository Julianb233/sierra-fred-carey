# Architecture Patterns: Sahara v6.0

**Domain:** AI-powered founder OS -- content library, service marketplace, Boardy API, infrastructure hardening
**Researched:** 2026-02-18
**Overall confidence:** HIGH (existing codebase thoroughly examined; integration patterns well-established)

---

## 1. Current Architecture Snapshot

Before designing v6.0 additions, here is what exists and what we must preserve.

### Existing Component Map

```
                        +-------------------+
                        |   Vercel Edge     |
                        |  (Next.js 16)     |
                        +--------+----------+
                                 |
              +------------------+------------------+
              |                  |                   |
     +--------v------+  +-------v-------+  +--------v--------+
     | App Router    |  | API Routes    |  | Cron Routes     |
     | ~210 pages    |  | ~100 routes   |  | weekly-checkin   |
     | React 19 RSC  |  | requireAuth() |  | weekly-digest    |
     +--------+------+  | tier-gate     |  | re-engagement    |
              |          +-------+-------+  +-----------------+
              |                  |
     +--------v------+  +-------v-------+
     | Client State  |  | Service Layer |
     | TierProvider  |  | lib/fred/*    |
     | React Context |  | lib/ai/*      |
     +---------------+  | lib/db/*      |
                        | lib/boardy/*  |
                        +-------+-------+
                                |
              +--+--------+-----+-----+----------+
              |  |        |           |           |
        +-----v--v+ +----v---+ +-----v----+ +----v------+
        | Supabase| | Stripe | | OpenAI   | | LiveKit   |
        | Postgres| | Billing| | GPT-4o   | | Cloud     |
        | Auth    | | Webhooks| | Whisper  | | Voice     |
        | Storage | +--------+ | TTS      | | Agent     |
        | RLS     |            +----------+ +-----+-----+
        | pgvector|                               |
        +---------+                         +-----v-----+
                                            | Worker    |
                                            | Railway/  |
                                            | Docker    |
                                            +-----------+
```

### Existing Patterns (Must Preserve)

| Pattern | Implementation | Where Used |
|---------|---------------|------------|
| Auth middleware | `requireAuth()` from `lib/auth.ts` | Every API route |
| Tier gating | `getUserTier()` + `createTierErrorResponse()` from `lib/api/tier-middleware.ts` | Paid features |
| Service client | `createServiceClient()` for server-side Supabase | All `lib/db/*.ts` |
| User-scoped client | `createClient()` for RLS-respecting queries | Some API routes |
| Strategy pattern | `getBoardyClient()` returns mock or real | `lib/boardy/client.ts` |
| DB row mapping | DB rows (snake_case) mapped to TS interfaces (camelCase) | All `lib/db/*.ts` |
| Stripe webhooks | Idempotent event processing with `recordStripeEvent()` | `app/api/stripe/webhook/route.ts` |
| XState state machine | FRED cognitive engine with 10 states | `lib/fred/index.ts` |
| Three-layer memory | Episodic + Semantic + Procedural with pgvector | `lib/db/fred-memory.ts` |
| Conversation state | 9-Step tracking + Reality Lens gates | `lib/db/conversation-state.ts` |
| File uploads | Vercel Blob for pitch decks, Supabase Storage for documents | `lib/storage/upload.ts` |
| Tier enum | `UserTier.FREE=0, PRO=1, STUDIO=2` | `lib/constants.ts` |

### Existing Database Tables (27+ tables)

Core: `profiles`, `user_subscriptions`, `stripe_events`
FRED: `episodic_memory`, `semantic_memory`, `procedural_memory`, `fred_conversation_state`, `fred_step_evidence`
Features: `boardy_matches`, `investor_readiness_scores`, `strategy_documents`, `document_repository`, `next_steps`
Community: `communities`, `community_members`, `community_posts`, `community_post_reactions`, `community_post_replies`
Community v2: `community_profiles`, `consent_preferences`, `consent_audit_log`, `cohorts`, `cohort_members`, `social_feed_posts`, `social_feed_reactions`, `social_feed_comments`, `founder_messages`, `founder_connections`, `expert_listings`, `reputation_events`, `engagement_streaks`

---

## 2. v6.0 New Components and Boundaries

### 2A. Content Library System

**Purpose:** Educational hub with video lessons, founder playbooks, and FRED-recommended learning paths.

**Component boundary:** Self-contained content domain that integrates with FRED's AI for personalized recommendations. Content is admin-authored, not user-generated.

#### Architecture Decision: Video Hosting

**Recommendation: Mux for video, Supabase Storage for documents/playbooks**

| Option | Pros | Cons | Verdict |
|--------|------|------|---------|
| Mux | Purpose-built video API, HLS adaptive streaming, built-in analytics, Next.js starter kit exists, handles encoding/CDN | Additional service cost (~$0.007/min encoding + $0.007/min streaming) | **Use this** |
| Supabase Storage | Already integrated, no new vendor | No transcoding, no adaptive streaming, no player analytics, not designed for video delivery | Use for PDFs/docs only |
| Cloudflare Stream | Good CDN, decent pricing | Less Next.js ecosystem support, another vendor to manage | Consider if cost-sensitive |
| Self-host (S3 + CloudFront) | Full control | Must build encoding pipeline, player, analytics from scratch | Overengineered for this stage |

**Rationale:** Mux has a dedicated [Next.js video course starter kit](https://github.com/muxinc/video-course-starter-kit) that handles exactly this use case. Encoding, adaptive bitrate, signed playback URLs for content gating, and per-video analytics are all built-in. Sahara already uses Vercel (Mux's parent company partner), so the integration is well-tested.

**Confidence:** HIGH -- Mux is the standard choice for Next.js video platforms.

#### Data Model: Content Library

```sql
-- Content hierarchy: Course > Module > Lesson
-- Admin-managed, not user-generated

CREATE TABLE content_courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  thumbnail_url TEXT,
  category TEXT NOT NULL,           -- 'fundraising', 'product', 'growth', 'operations', 'legal'
  difficulty TEXT NOT NULL,          -- 'beginner', 'intermediate', 'advanced'
  target_stage TEXT[],               -- ['idea', 'seed', 'series_a'] -- which founder stages
  estimated_hours NUMERIC(4,1),
  is_published BOOLEAN DEFAULT false,
  tier_required INTEGER NOT NULL DEFAULT 0,  -- 0=Free, 1=Pro, 2=Studio
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE content_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES content_courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE content_lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID NOT NULL REFERENCES content_modules(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  lesson_type TEXT NOT NULL,         -- 'video', 'article', 'playbook', 'worksheet'
  -- Video fields (Mux)
  mux_asset_id TEXT,                 -- Mux asset ID
  mux_playback_id TEXT,              -- Mux playback ID (public or signed)
  mux_upload_id TEXT,                -- For tracking upload status
  duration_seconds INTEGER,
  -- Article/playbook fields
  content_markdown TEXT,             -- For article/playbook lessons
  file_url TEXT,                     -- For downloadable worksheets
  -- Metadata
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_free_preview BOOLEAN DEFAULT false,  -- Allow free users to preview
  tier_required INTEGER,             -- Override course tier for specific lessons
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE content_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES content_lessons(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'not_started',  -- 'not_started', 'in_progress', 'completed'
  progress_percent INTEGER DEFAULT 0,           -- 0-100 for video position
  completed_at TIMESTAMPTZ,
  last_position_seconds INTEGER DEFAULT 0,      -- Video resume position
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, lesson_id)
);

-- FRED recommendations: which courses FRED has suggested to this founder
CREATE TABLE content_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES content_courses(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,               -- Why FRED recommended this
  source TEXT NOT NULL DEFAULT 'fred_conversation',  -- 'fred_conversation', 'stage_match', 'gap_analysis'
  source_id TEXT,                     -- e.g., conversation ID that triggered recommendation
  priority INTEGER DEFAULT 0,
  dismissed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, course_id)
);
```

**RLS policies follow existing pattern:** user_id scoping for progress/recommendations, open read for published courses.

#### Data Flow: Content Library

```
Admin uploads video
    --> Mux API (encoding, asset creation)
    --> Webhook: mux.asset.ready
    --> Store mux_asset_id, mux_playback_id in content_lessons

User browses courses
    --> API: GET /api/content/courses (tier-filtered)
    --> Client renders course catalog

User watches video
    --> API: GET /api/content/lessons/[id] (tier check)
    --> Returns signed Mux playback URL (time-limited)
    --> Mux Player component streams video
    --> Client posts progress: POST /api/content/progress

FRED recommends content
    --> During chat, FRED detects knowledge gap
    --> FRED calls tool: recommend_content(course_id, reason)
    --> Inserts into content_recommendations
    --> Shows in Next Steps Hub and Dashboard
```

#### SCORM/xAPI Decision

**Recommendation: Do NOT implement SCORM/xAPI for v6.0.**

SCORM/xAPI is for enterprise LMS interoperability (importing third-party courseware, reporting to corporate HR systems). Sahara's content is exclusively first-party (Fred Cary's lessons). The custom `content_progress` table provides all needed tracking (completion, position, time spent) without the complexity of xAPI statement storage or SCORM package parsing.

**Revisit if:** Sahara ever needs to import courses from external providers or export completion data to enterprise HR/LMS systems.

**Confidence:** HIGH -- SCORM/xAPI would be premature complexity.

---

### 2B. Service Marketplace

**Purpose:** Vetted service providers (lawyers, designers, developers) with discovery, reviews, booking, and payments.

**Component boundary:** Two-sided marketplace that extends the existing Stripe billing with Stripe Connect for provider payouts. Independent of FRED's AI except for provider recommendations.

#### Architecture Decision: Payment Model

**Recommendation: Stripe Connect (Standard accounts) with delayed payouts**

| Model | How It Works | Sahara Fit |
|-------|-------------|------------|
| Stripe Connect Standard | Providers create their own Stripe accounts, Sahara facilitates payments | **Best fit** -- providers are real businesses with existing Stripe accounts |
| Stripe Connect Express | Sahara onboards providers with simplified Stripe flow | Good for individuals, more Sahara liability |
| Stripe Connect Custom | Full control, full liability | Overengineered, too much compliance burden |

**Escrow approach:** Use Stripe's `transfer_data` with `on_behalf_of` + delayed transfers. Charge the buyer immediately, hold funds for a configurable period (default 7 days or until service delivery confirmed), then transfer to provider minus platform fee.

**Platform fee model:** Sahara takes a platform fee (configurable per category, suggest 10-15% starting point) deducted from the provider payout via `application_fee_amount` on PaymentIntents.

**Confidence:** HIGH -- Stripe Connect Standard is the standard pattern for professional service marketplaces.

#### Data Model: Service Marketplace

```sql
-- Service providers (professionals who offer services)
CREATE TABLE service_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,  -- Optional: provider may also be a Sahara user
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  description TEXT NOT NULL,
  avatar_url TEXT,
  category TEXT NOT NULL,            -- 'legal', 'design', 'development', 'marketing', 'finance', 'operations'
  specializations TEXT[],            -- ['startup_incorporation', 'ip_law', 'fundraising_counsel']
  location TEXT,
  website_url TEXT,
  -- Stripe Connect
  stripe_connect_account_id TEXT,    -- Stripe Connected Account ID
  stripe_onboarding_complete BOOLEAN DEFAULT false,
  -- Vetting
  is_vetted BOOLEAN DEFAULT false,
  vetted_at TIMESTAMPTZ,
  vetted_by TEXT,                    -- Admin who vetted
  is_active BOOLEAN DEFAULT true,
  -- Metrics (counter-synced by triggers)
  avg_rating NUMERIC(3,2) DEFAULT 0,
  review_count INTEGER DEFAULT 0,
  booking_count INTEGER DEFAULT 0,
  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Service listings (specific services a provider offers)
CREATE TABLE service_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES service_providers(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  price_type TEXT NOT NULL,          -- 'fixed', 'hourly', 'custom_quote'
  price_cents INTEGER,               -- Price in cents (null for custom_quote)
  currency TEXT DEFAULT 'usd',
  delivery_days INTEGER,             -- Estimated delivery time
  is_active BOOLEAN DEFAULT true,
  tier_required INTEGER DEFAULT 1,   -- Minimum tier to access (Pro by default)
  sort_order INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Service bookings (transactions between founders and providers)
CREATE TABLE service_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  listing_id UUID NOT NULL REFERENCES service_listings(id),
  provider_id UUID NOT NULL REFERENCES service_providers(id),
  -- Booking details
  status TEXT NOT NULL DEFAULT 'pending',  -- 'pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'disputed'
  message TEXT,                      -- Founder's message to provider
  -- Pricing
  price_cents INTEGER NOT NULL,
  platform_fee_cents INTEGER NOT NULL,
  currency TEXT DEFAULT 'usd',
  -- Stripe payment
  stripe_payment_intent_id TEXT,
  stripe_transfer_id TEXT,           -- Transfer to provider (created after completion)
  payment_status TEXT DEFAULT 'pending',  -- 'pending', 'captured', 'transferred', 'refunded'
  -- Scheduling
  scheduled_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Service reviews
CREATE TABLE service_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES service_bookings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES service_providers(id),
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title TEXT,
  content TEXT,
  is_verified BOOLEAN DEFAULT true,  -- Verified purchase
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(booking_id, user_id)        -- One review per booking per user
);
```

#### Data Flow: Service Marketplace

```
Provider onboarding:
    Admin invites provider --> Provider creates account
    --> Stripe Connect OAuth --> stripe_connect_account_id stored
    --> Admin vets and activates

Founder discovers provider:
    --> GET /api/marketplace/providers (search, filter by category)
    --> GET /api/marketplace/providers/[slug] (detail + reviews)
    --> FRED recommends: "You need a startup lawyer. Here are vetted options."

Founder books service:
    --> POST /api/marketplace/bookings (creates PaymentIntent with transfer_data)
    --> Stripe charges founder
    --> Provider notified (email + in-app)
    --> Status: pending --> confirmed --> in_progress

Service completed:
    --> Founder or provider marks complete
    --> POST /api/marketplace/bookings/[id]/complete
    --> Stripe transfer created to provider (minus platform fee)
    --> Founder prompted to review

Dispute flow:
    --> POST /api/marketplace/bookings/[id]/dispute
    --> Hold transfer, notify admin
    --> Admin resolves (refund or release)
```

#### Stripe Connect Webhook Extension

The existing `app/api/stripe/webhook/route.ts` must be extended to handle Connect events:

```
New webhook events to handle:
  - account.updated          --> Update stripe_onboarding_complete
  - transfer.created         --> Update booking payment_status
  - transfer.reversed        --> Handle refund/dispute
  - payment_intent.succeeded --> Update booking status (for marketplace payments)
```

**Key integration point:** The existing webhook handler uses idempotent event recording (`recordStripeEvent`). New marketplace events follow the same pattern -- add new `case` branches in the switch statement.

---

### 2C. Boardy API Integration

**Purpose:** Replace the `MockBoardyClient` with real Boardy API calls for live investor matching and warm intros.

**Component boundary:** The strategy pattern in `lib/boardy/client.ts` already isolates this. The boundary is clean -- implement `RealBoardyClient` implementing `BoardyClientInterface`, swap it in the factory.

#### Architecture Decision: Integration Approach

**Recommendation: Implement `RealBoardyClient` behind the existing strategy pattern factory**

The existing code is perfectly structured for this:

```typescript
// lib/boardy/client.ts -- existing factory, line 59-67:
export function getBoardyClient(): BoardyClient {
  if (!_client) {
    // THIS IS THE SWAP POINT:
    if (process.env.BOARDY_API_KEY) {
      _client = new BoardyClient(new RealBoardyClient());
    } else {
      _client = new BoardyClient(new MockBoardyClient());
    }
  }
  return _client;
}
```

**Confidence:** HIGH -- the architecture is already in place. This is a straight implementation task.

#### Boardy API Integration Notes

Boardy's public API documentation is not freely available (their website does not expose developer docs). The integration will require:

1. **Partner API access** -- Contact Boardy team for API credentials and documentation
2. **OAuth or API key auth** -- Likely API key based on their partner page pattern
3. **Webhook receiver** -- For match notifications and intro status updates
4. **Profile sync** -- Push founder profile data to Boardy for matching

**Confidence on API specifics:** LOW -- Boardy does not publish public API docs. The architecture handles this uncertainty by keeping the strategy pattern; if Boardy's API differs from our current `BoardyClientInterface`, we adapt the implementation without changing callers.

#### Data Model Changes

Minimal. The existing `boardy_matches` table and `BoardyMatch` interface cover the data needs. Add:

```sql
-- Track Boardy API sync status per user
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS boardy_profile_synced_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS boardy_profile_id TEXT;

-- Track intro requests and outcomes
ALTER TABLE boardy_matches ADD COLUMN IF NOT EXISTS boardy_intro_id TEXT;
ALTER TABLE boardy_matches ADD COLUMN IF NOT EXISTS intro_requested_at TIMESTAMPTZ;
ALTER TABLE boardy_matches ADD COLUMN IF NOT EXISTS intro_accepted_at TIMESTAMPTZ;
```

---

### 2D. Sentry Error Tracking & Production Monitoring

**Purpose:** Real-time error tracking, performance monitoring, alerting for production issues.

**Component boundary:** Cross-cutting concern. Sentry instruments the entire Next.js app (client, server, edge) without changing business logic.

#### Architecture Decision: Sentry Setup

**Recommendation: `@sentry/nextjs` SDK with App Router instrumentation**

The Sentry Next.js SDK provides automatic instrumentation for:
- Client-side errors and performance (React component rendering, web vitals)
- Server-side errors (API routes, RSC, middleware)
- Edge runtime errors (middleware)
- Source map upload via `withSentryConfig` in `next.config.ts`

#### File Structure

```
instrumentation-client.ts          -- NEW: Client Sentry init (replaces sentry.client.config.ts in newer SDK)
sentry.server.config.ts            -- NEW: Server-side Sentry init
sentry.edge.config.ts              -- NEW: Edge runtime Sentry init
instrumentation.ts                 -- NEW: Next.js instrumentation hook (imports server/edge configs)
next.config.ts                     -- MODIFIED: Wrap with withSentryConfig
.env.sentry-build-plugin           -- NEW: Sentry auth token for source maps (CI only, NOT committed)
```

#### Integration Points

```
Client errors:
    React error boundary --> Sentry.captureException()
    Unhandled rejections --> Auto-captured by SDK

Server errors:
    API route throws --> Auto-captured by SDK instrumentation
    Sentry.setUser({ id: userId }) --> Tag errors with user identity

Custom alerts:
    Stripe webhook failure --> Sentry.captureMessage('Webhook failed', 'error')
    FRED AI timeout --> Sentry.captureException(err, { tags: { component: 'fred-ai' }})
    LiveKit connection failure --> Sentry.captureException(err, { tags: { component: 'voice-agent' }})
```

#### User Context Integration

```typescript
// In API routes, after requireAuth():
import * as Sentry from '@sentry/nextjs';

const userId = await requireAuth();
Sentry.setUser({ id: userId });
// All subsequent errors in this request are tagged with the user
```

**Confidence:** HIGH -- Sentry's Next.js integration is mature and well-documented.

---

### 2E. Voice Agent Production Hardening

**Purpose:** Make the LiveKit voice worker reliable for production -- call quality monitoring, recording, transcription persistence, reconnection handling.

**Component boundary:** The voice worker (`workers/voice-agent/`) runs as a separate process on Railway/Docker. It communicates with the main app through LiveKit's room data channel and needs new API endpoints for persisting call data.

#### Current State

The existing voice agent is functional but minimal:
- `agent.ts`: 127 lines, uses `@livekit/agents` with OpenAI STT/LLM/TTS
- `index.ts`: CLI entry point loading `.env.local`
- `Dockerfile`: Node 22 slim, copies worker + `lib/fred-brain.ts`
- `livekit.toml`: Points to `sahara-ppvs24oj.livekit.cloud`
- Token route: `app/api/livekit/token/route.ts` with Studio tier gating and user-scoped rooms

#### What Needs Hardening

```
1. Call Recording & Persistence
   Worker publishes transcript via data channel (already implemented)
   --> NEW: API endpoint POST /api/voice/calls to persist call metadata
   --> NEW: API endpoint POST /api/voice/calls/[id]/transcript to persist transcript
   --> NEW: Post-call summary generation (FRED AI summarizes transcript)

2. Reconnection & Error Recovery
   Worker has basic error/close handlers (already implemented)
   --> NEW: Client-side reconnection logic (LiveKit SDK has built-in)
   --> NEW: Health check endpoint for monitoring

3. Call Quality Monitoring
   --> NEW: Track call duration, latency, errors per call
   --> NEW: Sentry integration in worker process (separate DSN)
   --> NEW: Metrics endpoint or Sentry breadcrumbs for call quality

4. FRED Context Integration
   Currently: Worker has static system prompt from fred-brain.ts
   --> NEW: Load founder context (stage, snapshot, conversation state) at call start
   --> API: GET /api/voice/context?userId=X returns personalized prompt context
   --> Worker builds dynamic prompt per participant
```

#### Data Model: Voice Calls

```sql
CREATE TABLE voice_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  room_name TEXT NOT NULL,
  call_type TEXT NOT NULL DEFAULT 'on_demand',  -- 'on_demand', 'scheduled'
  status TEXT NOT NULL DEFAULT 'active',         -- 'active', 'completed', 'failed', 'abandoned'
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  -- Quality metrics
  stt_model TEXT DEFAULT 'whisper-1',
  llm_model TEXT DEFAULT 'gpt-4o',
  tts_model TEXT DEFAULT 'tts-1',
  error_count INTEGER DEFAULT 0,
  -- Post-call outputs
  transcript JSONB,                   -- Array of {speaker, text, timestamp}
  summary TEXT,                       -- AI-generated summary
  next_actions JSONB,                 -- Extracted Next 3 Actions
  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for user's call history
CREATE INDEX idx_voice_calls_user ON voice_calls(user_id, started_at DESC);
```

#### Worker Architecture (Hardened)

```
                     +-------------------+
                     | LiveKit Cloud     |
                     | (Room Management) |
                     +--------+----------+
                              |
                    +---------v---------+
                    | Fred Voice Worker |
                    | (Railway/Docker)  |
                    |                   |
                    | 1. Wait for job   |
                    | 2. Load context   |<--- GET /api/voice/context
                    | 3. Join room      |
                    | 4. STT -> LLM -> TTS |
                    | 5. Publish transcripts |
                    | 6. On close:      |
                    |    - POST call data |--> POST /api/voice/calls
                    |    - Summarize     |--> POST /api/voice/calls/[id]/summary
                    +-------------------+
```

**Key constraint:** The worker currently copies only `lib/fred-brain.ts` into the Docker image. For dynamic context loading, the worker must make HTTP calls to the main app API rather than importing more lib code. This keeps the worker lightweight and decoupled.

**Confidence:** HIGH -- the existing worker architecture is sound; these are incremental additions.

---

## 3. Cross-Cutting Integration Points

### 3A. How New Features Connect to FRED

FRED is the central intelligence. Every new feature should feed data into and receive recommendations from FRED.

```
Content Library --> FRED:
  - FRED detects knowledge gap in conversation
  - FRED calls tool: recommend_content(course_id, reason)
  - Saved to content_recommendations
  - "You should watch the fundraising essentials course before your pitch"

Content Library <-- FRED:
  - Completed courses inform FRED's semantic memory
  - "I see you completed the IP strategy course. Let's apply that to your situation."

Service Marketplace --> FRED:
  - FRED detects founder needs professional help
  - FRED suggests marketplace category: "You need a startup lawyer. Check our marketplace."
  - NOT: FRED does not recommend specific providers (conflict of interest)

Boardy --> FRED:
  - FRED surfaces Boardy matches during investor conversations
  - "Boardy found 3 investor matches in your sector. Want me to walk through them?"

Voice Calls --> FRED:
  - Call transcripts feed into episodic memory
  - Post-call summaries stored as semantic memory
  - Next 3 Actions from calls appear in Next Steps Hub
```

### 3B. FRED Tool Calling Extension

The existing AI system uses Vercel AI SDK 6 tool calling. New features add new tools:

```typescript
// New tools for v6.0:
const v6Tools = {
  recommend_content: {
    description: "Recommend a course or lesson to the founder",
    parameters: z.object({
      courseId: z.string(),
      reason: z.string(),
    }),
  },
  suggest_marketplace: {
    description: "Suggest the founder check the service marketplace for a specific need",
    parameters: z.object({
      category: z.enum(['legal', 'design', 'development', 'marketing', 'finance', 'operations']),
      reason: z.string(),
    }),
  },
  surface_boardy_matches: {
    description: "Show the founder their current Boardy investor/advisor matches",
    parameters: z.object({
      matchType: z.enum(['investor', 'advisor', 'mentor', 'partner']).optional(),
    }),
  },
};
```

### 3C. Tier Gating for New Features

| Feature | Tier | Rationale |
|---------|------|-----------|
| Content library (browse/preview) | Free | Discovery drives upgrades |
| Content library (full access) | Pro | Core value prop |
| Content library (all courses) | Studio | Premium content |
| Service marketplace (browse) | Free | Discovery |
| Service marketplace (book) | Pro+ | Revenue feature |
| Boardy live matching | Studio | Premium feature (unchanged) |
| Voice calls | Studio | Already gated (unchanged) |
| Sentry monitoring | N/A | Infrastructure, no user tier |

### 3D. Shared UI Patterns

New pages follow the existing dashboard pattern:
- Left sidebar nav (already restructured in v4.0 Phase 40)
- Add "Learn" and "Marketplace" nav items
- Pages: `/dashboard/learn`, `/dashboard/learn/[slug]`, `/dashboard/marketplace`, `/dashboard/marketplace/[slug]`
- Reuse existing `FeatureLock` component for tier gating
- Reuse existing empty state patterns (fixed in v5.0 Phase 58)

---

## 4. Suggested Build Order

Dependencies dictate the build order. Here is the recommended sequence:

### Wave 1: Infrastructure (No Feature Dependencies)

**Sentry Error Tracking**
- Zero dependencies on other v6.0 features
- Benefits all subsequent development (catches bugs during build)
- Pure additive: 4 config files + `next.config.ts` modification
- Estimated effort: Small (1-2 plans)

**CI/CD Expansion** (Staging, Visual Regression)
- Pairs naturally with Sentry (monitoring + testing)
- No feature dependencies
- Estimated effort: Medium (2-3 plans)

### Wave 2: Content System Foundation

**Content Library Data Layer**
- Database schema, RLS policies, admin API routes
- No dependency on Mux yet (can seed with article/playbook content first)
- Must come before FRED integration (FRED needs something to recommend)
- Estimated effort: Medium (2-3 plans)

**Mux Video Integration**
- Depends on content schema existing
- Webhook receiver, upload pipeline, signed playback URLs
- Can be done in parallel with content UI
- Estimated effort: Medium (2 plans)

**Content Library UI + FRED Integration**
- Depends on data layer + Mux
- Course catalog, lesson viewer, progress tracking
- FRED tool: `recommend_content`
- Estimated effort: Medium (2-3 plans)

### Wave 3: Marketplace Foundation

**Stripe Connect Setup**
- Extends existing Stripe webhook handler
- Provider onboarding OAuth flow
- No dependency on marketplace UI
- Estimated effort: Medium (2 plans)

**Service Marketplace Data Layer + UI**
- Depends on Stripe Connect
- Provider profiles, listings, search, booking flow
- Review system
- Estimated effort: Large (3-4 plans)

### Wave 4: External API + Voice Hardening

**Boardy API Integration**
- Depends only on having Boardy API credentials (external dependency)
- Clean swap: `RealBoardyClient` replaces `MockBoardyClient`
- Can happen any time after credentials obtained
- Estimated effort: Medium (1-2 plans, depending on API complexity)

**Voice Agent Hardening**
- Independent of content/marketplace
- Call persistence, transcript storage, FRED context loading
- Sentry integration in worker
- Estimated effort: Medium (2-3 plans)

**Twilio SMS Activation**
- Independent of other features
- Swap test credentials for real ones
- End-to-end verification
- Estimated effort: Small (1 plan)

### Wave 5: Polish & Intelligence

**FRED Intelligence Upgrade**
- Benefits from all prior features existing (more data to draw from)
- Better response quality, memory retrieval, mode switching
- Estimated effort: Medium (2-3 plans)

**Mobile/UX Polish**
- After all features built, polish for mobile
- New nav items (Learn, Marketplace) need mobile layouts
- Estimated effort: Medium (2-3 plans)

**Dashboard & Analytics**
- After all data sources exist
- Richer visualizations combining content progress, marketplace activity, call history
- Estimated effort: Medium (2 plans)

### Build Order Rationale

```
Wave 1: Sentry + CI/CD
    |
    v
Wave 2: Content Library (schema -> Mux -> UI + FRED)
    |
    v
Wave 3: Marketplace (Stripe Connect -> schema + UI)
    |        \
    v         v
Wave 4a:    Wave 4b:    Wave 4c:
Boardy API  Voice       SMS
    |         |           |
    v         v           v
Wave 5: FRED upgrade + Mobile polish + Analytics
```

**Why this order:**
1. **Sentry first** -- catches bugs during all subsequent work
2. **Content before Marketplace** -- content is simpler (one-sided, admin-managed), provides learning foundation for founders
3. **Marketplace after content** -- marketplace is complex (two-sided, payments, reviews), benefits from Sentry being in place
4. **Boardy/Voice/SMS are independent** -- can parallelize in Wave 4
5. **FRED upgrade last** -- benefits from all new data sources existing

---

## 5. Anti-Patterns to Avoid

### Anti-Pattern 1: Monolithic Webhook Handler
**What:** Putting all Stripe, Mux, Boardy, and LiveKit webhooks in a single handler
**Why bad:** Single point of failure, hard to test, hard to debug
**Instead:** Separate webhook routes per service:
- `/api/stripe/webhook` -- existing (extend for Connect)
- `/api/mux/webhook` -- NEW for video encoding callbacks
- `/api/boardy/webhook` -- NEW for match notifications
- `/api/livekit/webhook` -- NEW for room events (optional)

### Anti-Pattern 2: Loading Full Course Data for FRED Context
**What:** Including all course content in FRED's system prompt
**Why bad:** Token waste, slow responses, irrelevant information
**Instead:** FRED calls `recommend_content` tool when it detects a gap. The tool queries relevant courses by category/stage and returns only titles + descriptions for FRED to reference.

### Anti-Pattern 3: Real-Time Chat in Marketplace
**What:** Building a real-time messaging system between founders and providers
**Why bad:** Massive complexity (presence, typing indicators, read receipts) for v6.0
**Instead:** Async messaging via booking messages (stored in `service_bookings.metadata` or a simple `marketplace_messages` table). Real-time can come in v7.0 if demand warrants it.

### Anti-Pattern 4: Building Custom Video Player
**What:** Building a custom HLS player instead of using Mux Player
**Why bad:** Adaptive bitrate, DRM, accessibility, analytics all need to be reimplemented
**Instead:** Use `@mux/mux-player-react` component. It handles everything and integrates with Mux Data for analytics.

### Anti-Pattern 5: Synchronous Boardy API Calls in Chat
**What:** Calling Boardy API synchronously when FRED mentions matches
**Why bad:** External API latency breaks chat streaming UX
**Instead:** Pre-fetch and cache Boardy matches. FRED references cached matches. Background job refreshes periodically.

---

## 6. Scalability Considerations

| Concern | Now (100 users) | 10K users | 100K users |
|---------|-----------------|-----------|------------|
| Video hosting | Mux handles CDN/delivery | Same (Mux scales horizontally) | Same (Mux usage-based pricing) |
| Content progress | Direct Supabase queries | Add composite index on (user_id, status) | Consider read replica |
| Marketplace search | Supabase text search | Add pg_trgm index for fuzzy search | Consider Typesense/Meilisearch |
| Marketplace payments | Stripe Connect Standard | Same (Stripe handles scale) | Consider Connect Custom for better UX |
| Voice calls | Single Railway worker | 2-3 workers (LiveKit distributes) | Kubernetes auto-scaling |
| Boardy API | Direct API calls | Cache with 5-min TTL | Cache + background sync job |
| Sentry | Default plan | Increase event quota | Sample rate tuning |

---

## 7. Component Communication Summary

| Source | Target | Method | Data |
|--------|--------|--------|------|
| Client | API Routes | HTTP (fetch) | JSON |
| API Routes | Supabase | Supabase client SDK | SQL (via PostgREST) |
| API Routes | Stripe | Stripe SDK | PaymentIntents, Transfers |
| API Routes | Mux | Mux Node SDK | Assets, Playback URLs |
| API Routes | Boardy | HTTP client | Matches, Profiles |
| API Routes | OpenAI | Vercel AI SDK | Chat completions, embeddings |
| Stripe | API Routes | Webhooks | Event payloads |
| Mux | API Routes | Webhooks | Asset status updates |
| LiveKit Cloud | Voice Worker | WebSocket (gRPC) | Room events, audio tracks |
| Voice Worker | API Routes | HTTP | Call data, transcripts |
| FRED Chat | Content DB | Tool calling | Course recommendations |
| FRED Chat | Marketplace DB | Tool calling | Category suggestions |
| Client | Sentry | SDK auto-capture | Errors, performance |
| API Routes | Sentry | SDK auto-capture | Errors, performance |

---

## Sources

- [Sentry Next.js Documentation](https://docs.sentry.io/platforms/javascript/guides/nextjs/) -- HIGH confidence
- [Sentry Manual Setup Guide](https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/) -- HIGH confidence
- [Mux Next.js Integration](https://www.mux.com/docs/integrations/next-js) -- HIGH confidence
- [Mux Video Course Starter Kit](https://github.com/muxinc/video-course-starter-kit) -- HIGH confidence
- [Stripe Connect Documentation](https://docs.stripe.com/connect) -- HIGH confidence
- [Stripe Connect Marketplace Overview](https://stripe.com/connect/marketplaces) -- HIGH confidence
- [LiveKit Agents Documentation](https://docs.livekit.io/agents/) -- HIGH confidence
- [LiveKit Agents JS SDK](https://docs.livekit.io/reference/agents-js/) -- HIGH confidence
- [Supabase Storage Signed URLs](https://supabase.com/docs/reference/javascript/storage-from-createsignedurl) -- HIGH confidence
- [Boardy AI Website](https://www.boardy.ai/) -- LOW confidence (no public API docs found)

---

*Architecture research complete. All component boundaries, data models, and integration patterns aligned with existing Sahara codebase patterns (requireAuth, tier-gate, service client, row mapping, idempotent webhooks).*
