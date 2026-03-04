# Architecture Research -- v7.0 UX Feedback Loop

**Domain:** Closed-loop feedback collection, AI analysis, and auto-prioritization for an AI coaching SaaS
**Researched:** 2026-03-04
**Overall confidence:** HIGH (built on existing codebase patterns, no novel technology required)

---

## System Overview

The feedback loop system collects user feedback from multiple channels (in-app widgets, WhatsApp, SMS, email replies, PostHog behavioral signals), stores it in a unified schema, runs AI-powered analysis to extract themes and sentiment, auto-prioritizes issues, and surfaces actionable summaries to the admin dashboard and optionally creates Linear/GitHub issues.

The key architectural insight: **this is NOT a new system -- it is a new data pipeline layered on top of existing infrastructure.** Sahara already has SMS webhooks (Twilio), push notifications, cron jobs, admin dashboard APIs, AI insight extraction (`lib/ai/insight-extractor.ts`), A/B testing (`lib/ai/ab-testing.ts`), and PostHog analytics. The feedback loop ties these together with a unified `feedback_events` table and a processing pipeline.

```
                    COLLECTION LAYER
    +--------+  +--------+  +-------+  +--------+  +---------+
    | In-App |  | SMS    |  | Email |  | WhatsApp|  | PostHog |
    | Widget |  | Webhook|  | Reply |  | Webhook |  | Signals |
    +---+----+  +---+----+  +---+---+  +---+-----+  +---+-----+
        |           |           |           |            |
        v           v           v           v            v
    +---------------------------------------------------------+
    |              INGESTION LAYER (API Routes)                |
    |  POST /api/feedback/submit  |  /api/feedback/webhook/*  |
    +---------------------------------------------------------+
                            |
                            v
    +---------------------------------------------------------+
    |              STORAGE LAYER (Supabase)                    |
    |  feedback_events | feedback_analysis | feedback_actions  |
    +---------------------------------------------------------+
                            |
                +-----------+-----------+
                |                       |
                v                       v
    +-------------------+   +-------------------+
    | ANALYSIS PIPELINE |   | ADMIN DASHBOARD   |
    | (Cron or Realtime)|   | (Read-only views) |
    | AI categorization |   | Filters, trends   |
    | Sentiment scoring |   | Priority queue    |
    | Theme clustering  |   +-------------------+
    +--------+----------+
             |
             v
    +-------------------+
    | ACTION LAYER      |
    | Linear issue sync |
    | GitHub issue sync |
    | Push notification |
    | FRED self-improve |
    +-------------------+
```

---

## Component Map

### 1. Feedback Collection Components

| Component | Location | Responsibility | Talks To |
|-----------|----------|---------------|----------|
| `FeedbackWidget` | `components/feedback/widget.tsx` | In-app thumbs/stars + text on any page | Feedback API |
| `ChatFeedbackInline` | `components/feedback/chat-inline.tsx` | Per-message thumbs in FRED chat | Feedback API |
| `NPS Survey` | `components/feedback/nps-modal.tsx` | Periodic NPS survey modal (triggered by PostHog cohort) | Feedback API |
| SMS Webhook Handler | `app/api/feedback/webhook/sms/route.ts` | Receives Twilio inbound, classifies as feedback | Feedback ingestion |
| WhatsApp Webhook Handler | `app/api/feedback/webhook/whatsapp/route.ts` | Receives WhatsApp Business API inbound | Feedback ingestion |
| Email Reply Parser | `app/api/feedback/webhook/email/route.ts` | Resend inbound webhook for reply parsing | Feedback ingestion |
| PostHog Signal Cron | `app/api/cron/feedback-signals/route.ts` | Polls PostHog for behavioral signals (rage clicks, drop-offs) | Feedback storage |

### 2. Ingestion & Storage Components

| Component | Location | Responsibility | Talks To |
|-----------|----------|---------------|----------|
| Feedback API | `app/api/feedback/submit/route.ts` | Unified ingestion endpoint, normalizes all channels | Supabase |
| Feedback DB Layer | `lib/db/feedback.ts` | CRUD for feedback_events, feedback_analysis, feedback_actions | Supabase |
| Feedback Types | `types/feedback.ts` | Shared TypeScript types for feedback domain | All components |

### 3. Analysis Pipeline Components

| Component | Location | Responsibility | Talks To |
|-----------|----------|---------------|----------|
| Feedback Analyzer | `lib/feedback/analyzer.ts` | AI-powered sentiment + categorization + priority scoring | Vercel AI SDK |
| Theme Clusterer | `lib/feedback/clusterer.ts` | Groups related feedback into themes using embeddings | pgvector |
| Priority Engine | `lib/feedback/priority-engine.ts` | Computes priority score from severity, frequency, user tier | Feedback DB |
| Analysis Cron | `app/api/cron/feedback-analysis/route.ts` | Batch processes unanalyzed feedback every hour | Analyzer + Clusterer |

### 4. Action Components

| Component | Location | Responsibility | Talks To |
|-----------|----------|---------------|----------|
| Linear Sync | `lib/feedback/integrations/linear.ts` | Creates/updates Linear issues from high-priority feedback | Linear API |
| GitHub Sync | `lib/feedback/integrations/github.ts` | Creates GitHub issues for bug reports | GitHub API |
| Admin Notifier | `lib/feedback/notify-admin.ts` | Push/email notifications for critical feedback | Push triggers |
| FRED Prompt Updater | `lib/feedback/fred-loop.ts` | Feeds analysis back into FRED prompt versioning | A/B testing system |

### 5. Admin Dashboard Components

| Component | Location | Responsibility | Talks To |
|-----------|----------|---------------|----------|
| Feedback Dashboard Page | `app/admin/feedback/page.tsx` | Main feedback overview with filters | Admin API |
| Feedback Detail Page | `app/admin/feedback/[id]/page.tsx` | Single feedback event with analysis | Admin API |
| Feedback Trends | `app/admin/feedback/trends/page.tsx` | Time-series charts, theme evolution | Admin API |
| Feedback API Routes | `app/api/admin/feedback/route.ts` | Admin-only endpoints for feedback data | Feedback DB |

---

## Data Flow

### Flow 1: In-App Feedback (Real-time)

```
User clicks thumbs-down on FRED response
  -> ChatFeedbackInline component captures:
     { responseId, rating: 'negative', comment?: string, pageContext, sessionId }
  -> POST /api/feedback/submit
  -> Validate auth (requireAuth from lib/auth)
  -> Normalize to FeedbackEvent schema
  -> INSERT into feedback_events (channel='in_app', subchannel='chat_rating')
  -> IF rating is negative AND comment present:
     -> Immediate lightweight sentiment analysis (fast model, same request)
     -> UPDATE feedback_events SET sentiment_score, initial_category
  -> IF severity >= 'high':
     -> Fire-and-forget: notifyAdminFeedback() via push/triggers
  -> Return { id, status: 'received' }
```

### Flow 2: SMS/WhatsApp Feedback (Webhook)

```
User sends SMS/WhatsApp message to Sahara number
  -> Twilio/WhatsApp Business webhook hits /api/feedback/webhook/sms
  -> Validate webhook signature (existing pattern from app/api/sms/webhook)
  -> Look up user by phone number (existing pattern from lib/db/sms.ts)
  -> Classify message intent: is this feedback or a chat message?
     -> Use fast LLM call: "Is this user feedback about the product, or a conversation with FRED?"
  -> IF feedback:
     -> Normalize to FeedbackEvent { channel='sms'|'whatsapp', raw_text, user_id }
     -> INSERT into feedback_events
     -> Send acknowledgment: "Thanks for the feedback! We'll look into this."
  -> IF chat:
     -> Route to existing FRED chat pipeline (processInboundSMS pattern)
```

### Flow 3: Batch Analysis Pipeline (Cron)

```
Every hour, Vercel Cron triggers GET /api/cron/feedback-analysis
  -> Auth via CRON_SECRET (existing pattern from weekly-digest)
  -> Query: SELECT * FROM feedback_events WHERE analyzed_at IS NULL LIMIT 50
  -> For each batch of ~10 events:
     -> Call Feedback Analyzer:
        - Sentiment score (-1.0 to 1.0)
        - Category (bug, feature_request, ux_issue, praise, confusion)
        - Subcategory (free text)
        - Urgency (low, medium, high, critical)
        - Affected feature (matched against PLATFORM_PAGES map)
     -> Generate embedding for theme clustering (pgvector)
     -> Run Priority Engine:
        priority = (urgency_weight * urgency)
                 + (frequency_weight * similar_count)
                 + (tier_weight * user_tier_multiplier)
                 + (recency_weight * recency_decay)
     -> UPDATE feedback_events SET analyzed_at, sentiment_score, category, priority_score
     -> INSERT into feedback_analysis (detailed analysis record)
  -> Run Theme Clusterer on all analyzed events from last 7 days:
     -> Cosine similarity on embeddings, group into themes
     -> UPDATE or INSERT feedback_themes
  -> IF any critical items found:
     -> Auto-create Linear issues via Linear Sync
     -> Notify admin via push
```

### Flow 4: FRED Self-Improvement Loop

```
Weekly cron (or manual admin trigger):
  -> Query feedback_events WHERE category IN ('confusion', 'ux_issue', 'feature_request')
     AND affected_feature LIKE '%fred%' AND created_at > now() - interval '7 days'
  -> Aggregate into prompt improvement suggestions:
     "Users report FRED asks too many questions before giving structure.
      12 feedback events, avg sentiment -0.6, top theme: 'overwhelming questions'"
  -> Present to admin dashboard as "Prompt Improvement Suggestions"
  -> Admin can:
     a) Create new prompt version in ai_prompts table
     b) Set up A/B test via existing ab-testing.ts infrastructure
     c) Monitor variant stats via getVariantStats()
  -> Feedback on new prompt version feeds back into feedback_events
  -> Circle completes
```

### Flow 5: PostHog Behavioral Signal Ingestion

```
Daily cron /api/cron/feedback-signals
  -> Query PostHog API for:
     - Rage click events (3+ clicks in 2 seconds on same element)
     - Session recordings with high frustration score
     - Feature drop-off rates (started but didn't complete)
     - Error page views
  -> For each signal above threshold:
     -> INSERT into feedback_events { channel='behavioral', subchannel='posthog' }
     -> Auto-categorize based on signal type
  -> These get picked up by the regular analysis pipeline
```

---

## Database Schema

### Core Tables

```sql
-- ============================================================================
-- feedback_events: The canonical store for ALL feedback from ALL channels
-- ============================================================================
CREATE TABLE feedback_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,  -- nullable for anonymous

  -- Source identification
  channel TEXT NOT NULL CHECK (channel IN ('in_app', 'sms', 'whatsapp', 'email', 'behavioral', 'manual')),
  subchannel TEXT,  -- e.g., 'chat_rating', 'nps', 'widget', 'posthog_rage_click'

  -- Raw feedback data
  rating_type TEXT CHECK (rating_type IN ('thumbs', 'stars', 'nps', 'sentiment', NULL)),
  rating_value INTEGER,  -- 0/1 for thumbs, 1-5 for stars, 0-10 for NPS
  raw_text TEXT,  -- User's verbatim feedback text

  -- Context at time of feedback
  page_context TEXT,  -- URL path where feedback was given
  session_id UUID,  -- Links to FRED session for chat feedback
  response_id UUID,  -- Links to specific AI response being rated
  metadata JSONB DEFAULT '{}',  -- Flexible: device info, screenshot URL, etc.

  -- Analysis results (populated by analysis pipeline)
  sentiment_score FLOAT,  -- -1.0 (negative) to 1.0 (positive)
  category TEXT,  -- bug, feature_request, ux_issue, praise, confusion
  subcategory TEXT,  -- More specific classification
  urgency TEXT CHECK (urgency IN ('low', 'medium', 'high', 'critical', NULL)),
  priority_score FLOAT DEFAULT 0,  -- Computed priority (higher = more urgent)
  affected_feature TEXT,  -- Which product feature this relates to
  theme_id UUID REFERENCES feedback_themes(id),  -- Cluster assignment
  embedding vector(1536),  -- For similarity search / clustering

  -- Processing state
  analyzed_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  resolution_type TEXT CHECK (resolution_type IN ('fixed', 'wont_fix', 'duplicate', 'acknowledged', NULL)),
  resolution_notes TEXT,

  -- Integrations
  linear_issue_id TEXT,  -- Linear issue ID if synced
  github_issue_url TEXT,  -- GitHub issue URL if synced

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for common query patterns
CREATE INDEX idx_feedback_events_user ON feedback_events(user_id);
CREATE INDEX idx_feedback_events_channel ON feedback_events(channel, created_at DESC);
CREATE INDEX idx_feedback_events_unanalyzed ON feedback_events(analyzed_at) WHERE analyzed_at IS NULL;
CREATE INDEX idx_feedback_events_priority ON feedback_events(priority_score DESC) WHERE resolved_at IS NULL;
CREATE INDEX idx_feedback_events_category ON feedback_events(category, created_at DESC);
CREATE INDEX idx_feedback_events_created ON feedback_events(created_at DESC);

-- RLS
ALTER TABLE feedback_events ENABLE ROW LEVEL SECURITY;

-- Users can view and insert their own feedback
CREATE POLICY "Users own feedback read"
  ON feedback_events FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users own feedback insert"
  ON feedback_events FOR INSERT WITH CHECK (auth.uid() = user_id);
-- Service role for analysis pipeline and admin
CREATE POLICY "Service role full access on feedback_events"
  ON feedback_events FOR ALL USING (auth.role() = 'service_role');


-- ============================================================================
-- feedback_themes: Clustered groups of related feedback
-- ============================================================================
CREATE TABLE feedback_themes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,  -- AI-generated theme name
  description TEXT,  -- AI-generated summary
  category TEXT,  -- Primary category of this theme
  event_count INTEGER NOT NULL DEFAULT 0,  -- Number of events in this theme
  avg_sentiment FLOAT,
  avg_priority FLOAT,
  representative_embedding vector(1536),  -- Centroid for similarity matching
  is_active BOOLEAN NOT NULL DEFAULT true,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_feedback_themes_active ON feedback_themes(is_active, avg_priority DESC);

ALTER TABLE feedback_themes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access on feedback_themes"
  ON feedback_themes FOR ALL USING (auth.role() = 'service_role');


-- ============================================================================
-- feedback_actions: Actions taken in response to feedback
-- ============================================================================
CREATE TABLE feedback_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feedback_event_id UUID REFERENCES feedback_events(id) ON DELETE CASCADE,
  theme_id UUID REFERENCES feedback_themes(id),  -- Can be theme-level action

  action_type TEXT NOT NULL CHECK (action_type IN (
    'linear_issue_created', 'github_issue_created', 'prompt_updated',
    'ab_test_created', 'admin_notified', 'user_notified',
    'manual_resolution', 'auto_resolved'
  )),
  action_data JSONB DEFAULT '{}',  -- Details of the action taken
  performed_by TEXT,  -- 'system' or admin user ID

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_feedback_actions_event ON feedback_actions(feedback_event_id);
CREATE INDEX idx_feedback_actions_theme ON feedback_actions(theme_id);

ALTER TABLE feedback_actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access on feedback_actions"
  ON feedback_actions FOR ALL USING (auth.role() = 'service_role');


-- ============================================================================
-- prompt_versions: Track prompt changes tied to feedback
-- (Extends existing ai_prompts table pattern)
-- ============================================================================
CREATE TABLE prompt_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_name TEXT NOT NULL,  -- References ai_prompts.name
  version INTEGER NOT NULL,
  content TEXT NOT NULL,
  change_reason TEXT,  -- Why this version was created
  feedback_theme_id UUID REFERENCES feedback_themes(id),  -- Which feedback drove this change
  created_by TEXT NOT NULL,  -- 'system' or admin user ID
  is_active BOOLEAN NOT NULL DEFAULT false,
  performance_score FLOAT,  -- Computed from feedback on this version
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(prompt_name, version)
);

CREATE INDEX idx_prompt_versions_active ON prompt_versions(prompt_name, is_active) WHERE is_active = true;

ALTER TABLE prompt_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access on prompt_versions"
  ON prompt_versions FOR ALL USING (auth.role() = 'service_role');
```

### Relationship to Existing Tables

```
feedback_events.response_id  --> ai_responses.id (existing)
feedback_events.session_id   --> (FRED session tracking)
feedback_events.user_id      --> auth.users.id (existing)
feedback_actions              --> ab_experiments (existing, via action_data)
prompt_versions               --> ai_prompts (existing)
feedback_events.embedding     --> pgvector extension (already enabled for investor matching)
```

---

## Integration with Existing Architecture

### Integration Point 1: FRED Chat Pipeline

**Where:** `app/api/fred/chat/route.ts` (the main chat endpoint)

**How:** After FRED generates a response, the response ID is included in the SSE stream. The client-side `ChatFeedbackInline` component renders thumbs up/down next to each FRED message. When the user rates a response:

```typescript
// In the existing chat route, after streaming completes:
// The response already has a unique ID from the ai_requests/ai_responses tables.
// No changes needed to the chat route itself.

// Client-side: useFredChat hook gets a new onFeedback callback
// that POSTs to /api/feedback/submit with { responseId, rating, comment }
```

**Changes to existing code:** Minimal. Add `responseId` to the streamed metadata (if not already present). The `useFredChat` hook adds a `submitFeedback(responseId, rating, comment?)` method.

### Integration Point 2: SMS Webhook

**Where:** `app/api/sms/webhook/route.ts` + `lib/sms/webhook-handler.ts`

**How:** The existing `processInboundSMS` function already handles inbound SMS. Add a classification step before routing:

```typescript
// In processInboundSMS, before routing to FRED:
const intent = await classifyMessageIntent(body); // 'feedback' | 'chat' | 'command'
if (intent === 'feedback') {
  await insertFeedbackEvent({
    channel: 'sms',
    user_id: userIdFromPhone,
    raw_text: body,
    metadata: { from: phoneNumber, messageSid }
  });
  await sendSMSReply(from, "Thanks for the feedback! We're on it.");
  return;
}
// ... existing FRED routing
```

### Integration Point 3: WhatsApp Business API (New)

**Where:** New `app/api/feedback/webhook/whatsapp/route.ts`

**How:** WhatsApp Business API sends webhooks to a configured URL. Architecture mirrors the Twilio SMS webhook pattern exactly:

1. Verify webhook signature (Meta provides a verification token)
2. Parse incoming message from webhook payload
3. Look up user by phone number
4. Classify intent (feedback vs chat)
5. Route accordingly

**Recommendation:** Use the official WhatsApp Business Cloud API (Meta). The existing Twilio integration could also route WhatsApp via Twilio's WhatsApp adapter, which would require zero new webhook infrastructure -- just enabling WhatsApp on the existing Twilio number. **Use Twilio for WhatsApp** to avoid a second webhook system.

### Integration Point 4: PostHog Analytics

**Where:** `lib/analytics/server.ts` (existing PostHog server client)

**How:** PostHog already tracks events defined in `lib/analytics/events.ts`. The behavioral signal cron queries PostHog's API for aggregate patterns:

```typescript
// In /api/cron/feedback-signals
const posthog = new PostHog(apiKey, { host });

// Query for rage clicks in last 24 hours
const rageClicks = await posthog.api.events.list({
  event: '$rageclick',
  after: yesterday,
  properties: { $current_url: { operator: 'is_set' } }
});

// Query for high-frustration sessions
// (requires PostHog session recording with AI analysis -- check plan tier)
```

**Caveat (MEDIUM confidence):** PostHog's Node SDK event query capabilities vary by plan. The `posthog-node` package is primarily for capturing events, not querying. For querying, you need the PostHog API directly (`fetch` to `/api/projects/:id/events`). Verify your PostHog plan supports the query API.

### Integration Point 5: A/B Testing System

**Where:** `lib/ai/ab-testing.ts` (existing, fully functional)

**How:** The FRED self-improvement loop connects feedback to prompt A/B tests:

```
Feedback Analysis identifies "FRED asks too many questions"
  -> Admin reviews in dashboard
  -> Admin creates new prompt version with shorter question flow
  -> Admin creates A/B experiment via existing createExperiment()
  -> New users are assigned variants via existing getVariantAssignment()
  -> Feedback on each variant feeds back into feedback_events
  -> getVariantStats() shows which prompt version gets better ratings
  -> Admin promotes winning variant via existing /api/admin/ab-tests/[id]/promote
```

No new code needed in `ab-testing.ts`. The connection is purely through the `feedback_events.response_id` -> `ai_requests.variant_id` -> `ab_variants.id` chain, which already exists.

### Integration Point 6: Push Notifications

**Where:** `lib/push/triggers.ts` (existing fire-and-forget pattern)

**How:** Add a new trigger function following the exact pattern of `notifyRedFlag`:

```typescript
export async function notifyFeedbackAlert(
  userId: string, // admin user ID
  data: { category: string; urgency: string; summary: string }
): Promise<void> {
  // Same pattern as notifyRedFlag: check preferences, build payload, fire-and-forget
}
```

### Integration Point 7: Admin Dashboard

**Where:** `app/admin/` (existing admin panel with auth via `isAdminSession`)

**How:** Add new pages under `app/admin/feedback/`. The admin API routes follow the exact same pattern as `app/api/admin/dashboard/route.ts` -- check `isAdminSession()`, query via `sql` template tag, return JSON.

### Integration Point 8: Linear API

**Where:** New `lib/feedback/integrations/linear.ts`

**How:** Linear has a well-documented GraphQL API. Use `@linear/sdk` package:

```typescript
import { LinearClient } from '@linear/sdk';

const linear = new LinearClient({ apiKey: process.env.LINEAR_API_KEY });

export async function createLinearIssue(feedback: FeedbackEvent, theme?: FeedbackTheme) {
  const issue = await linear.createIssue({
    teamId: process.env.LINEAR_TEAM_ID!,
    title: `[Feedback] ${feedback.category}: ${feedback.raw_text?.slice(0, 80)}`,
    description: buildLinearDescription(feedback, theme),
    priority: mapUrgencyToLinearPriority(feedback.urgency),
    labelIds: [getLabelId(feedback.category)],
  });

  // Store reference back
  await updateFeedbackEvent(feedback.id, { linear_issue_id: issue.id });
  await insertFeedbackAction({
    feedback_event_id: feedback.id,
    action_type: 'linear_issue_created',
    action_data: { issueId: issue.id, issueUrl: issue.url },
    performed_by: 'system'
  });
}
```

---

## Batch vs Real-Time Analysis: Recommendation

**Use a hybrid approach:**

| Feedback Type | Processing | Rationale |
|--------------|------------|-----------|
| In-app rating (thumbs/stars only, no text) | **Store immediately, no analysis needed** | Rating value is the analysis |
| In-app rating with comment | **Lightweight real-time sentiment** (fast model, <500ms) + **batch full analysis** | Quick sentiment for priority sorting; full categorization in batch |
| SMS/WhatsApp text | **Real-time intent classification** (is it feedback?) + **batch analysis** | Must classify immediately to route correctly |
| Email reply | **Batch only** | Not time-sensitive |
| PostHog behavioral | **Batch only** (daily cron) | Aggregate patterns, not individual events |
| NPS scores | **Store immediately** + **batch trend analysis** | Score is immediate; trend analysis is batch |

**Why not all real-time?** Cost and latency. Running a full AI categorization + embedding generation + priority computation on every feedback event would:
1. Add 2-5 seconds latency to the feedback submission response
2. Cost ~$0.01-0.05 per feedback event for GPT-4o analysis
3. Not provide meaningfully faster value (admin doesn't need sub-second analysis)

**Why not all batch?** Critical feedback (P0 bugs, user-reported outages) needs immediate admin notification. The lightweight real-time sentiment pass (using fast/mini model) catches these without full analysis.

---

## Event-Driven vs Polling: Recommendation

**Use Supabase Realtime for admin dashboard, cron for processing.**

| Component | Pattern | Rationale |
|-----------|---------|-----------|
| Analysis pipeline | **Cron (polling)** | Batch processing is more efficient; hourly is fast enough |
| Admin dashboard updates | **Supabase Realtime** | Admin sees new feedback appear live without refresh |
| PostHog signal ingestion | **Cron (daily)** | Aggregate behavioral data, not event-by-event |
| Linear/GitHub sync | **Triggered by analysis pipeline** | Runs as part of the batch analysis, not separately |
| Critical alert notifications | **Event-driven (in-line)** | Part of the ingestion API route, fire-and-forget |

Supabase Realtime is already available in the stack. The admin dashboard can subscribe to `feedback_events` INSERT events to show a live feed. This avoids building a separate WebSocket server or polling endpoint.

---

## FRED Self-Improvement Loop: Technical Design

### How It Works

```
1. FEEDBACK COLLECTION
   feedback_events accumulate with response_id linking to ai_requests/ai_responses

2. WEEKLY ANALYSIS (cron)
   - Query feedback WHERE category IN ('confusion', 'ux_issue') AND affected_feature LIKE '%fred%'
   - Group by theme
   - Generate "Prompt Improvement Report" via AI:
     Input: Top 5 themes with example feedback
     Output: Specific prompt change suggestions

3. ADMIN REVIEW (dashboard)
   - Admin sees report in /admin/feedback/prompt-suggestions
   - Each suggestion shows: theme, example feedback, current prompt excerpt, suggested change
   - Admin can: Accept (creates prompt version), Modify, Reject

4. PROMPT VERSIONING
   - New version inserted into prompt_versions table
   - Version is NOT automatically active
   - Admin creates A/B test: 80% current, 20% new
   - Existing ab-testing.ts handles variant assignment

5. MEASUREMENT
   - feedback_events on responses with new variant_id accumulate
   - After N responses (configurable, default 100), auto-compute:
     - Avg sentiment score for variant A vs B
     - Thumbs up/down ratio for variant A vs B
   - Surface in admin dashboard: "Variant B has 23% better sentiment"

6. PROMOTION
   - Admin promotes winning variant via /api/admin/ab-tests/[id]/promote
   - Existing promote route already handles this
   - Feedback loop completes
```

### Prompt Versioning Architecture

The existing `ai_prompts` table stores prompt content. The new `prompt_versions` table adds:
- Version history (immutable records)
- Change reason linking back to feedback themes
- Performance scoring from feedback data
- Active flag for which version is live

This sits alongside (not replacing) the existing A/B testing infrastructure. The A/B system tests variants; prompt_versions tracks the history.

---

## Build Order

The components have clear dependencies. Build in this order:

### Phase A: Foundation (No dependencies)
1. **Database schema** -- feedback_events, feedback_themes, feedback_actions, prompt_versions tables
2. **Type definitions** -- `types/feedback.ts` with all TypeScript interfaces
3. **Feedback DB layer** -- `lib/db/feedback.ts` CRUD operations
4. **Feedback API route** -- `POST /api/feedback/submit` (unified ingestion endpoint)

### Phase B: Collection Widgets (Depends on Phase A)
5. **ChatFeedbackInline component** -- Thumbs up/down on FRED messages
6. **FeedbackWidget component** -- Floating feedback button on all pages
7. **NPS Survey modal** -- Triggered by user cohort conditions
8. **useFredChat hook update** -- Add `submitFeedback` method

### Phase C: Multi-Channel Ingestion (Depends on Phase A)
9. **SMS feedback classification** -- Modify existing webhook handler
10. **WhatsApp via Twilio** -- Enable WhatsApp on Twilio number, add routing
11. **Email reply parsing** -- Resend inbound webhook
12. **PostHog signal cron** -- Daily behavioral signal ingestion

### Phase D: Analysis Pipeline (Depends on Phase A)
13. **Feedback Analyzer** -- AI sentiment + categorization
14. **Embedding generation** -- pgvector embeddings for each event
15. **Theme Clusterer** -- Group related feedback
16. **Priority Engine** -- Compute priority scores
17. **Analysis Cron job** -- Hourly batch processing

### Phase E: Admin Dashboard (Depends on Phase A + D)
18. **Admin feedback list view** -- Filterable, sortable table
19. **Admin feedback detail view** -- Single event with analysis
20. **Admin trends view** -- Charts over time
21. **Admin priority queue** -- Unresolved items sorted by priority
22. **Supabase Realtime subscription** -- Live updates

### Phase F: Integrations (Depends on Phase D)
23. **Linear issue sync** -- Auto-create issues from critical feedback
24. **GitHub issue sync** -- Bug reports to GitHub
25. **Admin push notifications** -- Critical feedback alerts

### Phase G: Self-Improvement Loop (Depends on Phase D + E)
26. **Prompt improvement report generator** -- Weekly AI analysis of FRED feedback
27. **Prompt versioning UI** -- Admin creates/manages prompt versions
28. **A/B test integration** -- Connect new versions to existing ab-testing.ts
29. **Performance measurement** -- Compare variant feedback scores

**Critical path:** A -> B + C + D (parallel) -> E + F (parallel) -> G

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Database schema | HIGH | Follows exact patterns from existing migrations (RLS, indexes, service_role policies) |
| In-app feedback collection | HIGH | Standard React component + API route, existing patterns |
| SMS integration | HIGH | Existing Twilio webhook handler, just add classification step |
| WhatsApp integration | MEDIUM | Twilio WhatsApp adapter is the pragmatic path; WhatsApp Business API directly adds complexity |
| PostHog signal ingestion | MEDIUM | Depends on PostHog plan and API access; query API differs from capture API |
| AI analysis pipeline | HIGH | Existing `insight-extractor.ts` pattern is nearly identical; same Vercel AI SDK |
| Theme clustering with pgvector | HIGH | pgvector already used for investor matching; same pattern |
| Linear API integration | MEDIUM | `@linear/sdk` is well-documented but verify team/label setup |
| A/B testing integration | HIGH | Existing system is complete and functional, just needs data connection |
| Admin dashboard | HIGH | Existing admin patterns (isAdminSession, sql queries) are well-established |

---

## Sources

- Codebase analysis: `lib/ai/ab-testing.ts`, `lib/ai/insight-extractor.ts`, `lib/push/triggers.ts`
- Codebase analysis: `app/api/sms/webhook/route.ts`, `app/api/cron/weekly-digest/route.ts`
- Codebase analysis: `app/api/admin/dashboard/route.ts`, `app/api/admin/training/ratings/route.ts`
- Codebase analysis: `lib/fred/machine.ts`, `lib/fred/service.ts`, `lib/ai/tier-routing.ts`
- Codebase analysis: `supabase/migrations/` for schema patterns
- Codebase analysis: `lib/analytics/server.ts` for PostHog integration pattern
- Existing PRD: `docs/prd-whatsapp-feedback-2026-03-03.md` for WhatsApp context
