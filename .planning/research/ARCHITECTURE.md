# Architecture Patterns -- v7.0 UX Feedback Loop

**Domain:** Closed-loop UX feedback for AI coaching platform
**Researched:** 2026-03-04

---

## Recommended Architecture

The feedback loop is NOT a separate system. It extends Sahara's existing architecture with three new layers: Collection, Analysis, and Action.

```
+------------------+     +------------------+     +------------------+
|  COLLECTION      |     |  ANALYSIS        |     |  ACTION          |
|                  |     |                  |     |                  |
| Thumbs UI (chat) | --> | Sentiment Track  | --> | Prompt Patches   |
| Post-call rating | --> | Pattern Detect   | --> | A/B Experiments  |
| SMS rating       | --> | AI Categorize    | --> | Linear Issues    |
| Implicit signals | --> | Trend Analysis   | --> | Close-the-Loop   |
| WhatsApp monitor | --> |                  | --> | Admin Dashboard  |
+------------------+     +------------------+     +------------------+
        |                        |                        |
        v                        v                        v
+------------------------------------------------------------------+
|                     FEEDBACK DATA LAYER                           |
|  feedback_signals | feedback_sessions | feedback_insights         |
|  (links to: ai_requests, fred_episodic_memory, ab_variants)      |
+------------------------------------------------------------------+
```

### Component Boundaries

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| Feedback Collection UI | Render thumbs, capture ratings, submit signals | `feedback_signals` table via API route |
| Feedback API Routes | Validate and store feedback, link to AI requests | Supabase, existing `ai_requests` table |
| Sentiment Extractor | Detect user sentiment per message | FRED's LLM pipeline (piggyback), `feedback_sessions` |
| Pattern Detector | Scheduled job: cluster feedback, identify themes | `feedback_signals`, `feedback_insights`, Trigger.dev |
| Prompt Refiner | Propose prompt patches from patterns | `feedback_insights`, `ab_experiments`, admin approval queue |
| Admin Dashboard | Visualize feedback, manage experiments, approve patches | All feedback tables, existing admin panel |
| Notification Sender | Close-the-loop notifications to founders | `feedback_signals` (linked users), existing email/notification infra |

### Data Flow

1. **Founder interacts with FRED** (chat/voice/SMS) -- creates `ai_requests` + `ai_responses` records
2. **Founder provides feedback** (thumbs, rating, or implicit signal) -- creates `feedback_signals` record linked to `ai_request_id`
3. **Sentiment extractor** (inline or async) adds sentiment score to `feedback_sessions`
4. **Pattern detector** (daily Trigger.dev job) analyzes recent signals, produces `feedback_insights`
5. **Prompt refiner** (weekly or on-demand) generates prompt patch proposals from insights
6. **Admin reviews** patches in dashboard, approves, triggers A/B experiment
7. **A/B test runs** with feedback metrics as success criteria
8. **Winning variant promoted** -- admin marks as default
9. **Close-the-loop notification** sent to founders whose feedback contributed

---

## Patterns to Follow

### Pattern 1: Fire-and-Forget Feedback Storage
**What:** Feedback submission must never block the user. Write to database asynchronously. If the write fails, log and retry -- never show the user an error.
**When:** All explicit feedback collection (thumbs, ratings, comments)
**Why:** Sahara already uses this pattern for episodic memory (`storeChannelEntry` in `conversation-context.ts`). Feedback follows the same principle.
**Example:**
```typescript
// In chat-message.tsx click handler
async function handleThumbsDown(messageId: string) {
  setRating(-1); // Optimistic UI update
  // Fire and forget -- do not await in the render path
  submitFeedback({ messageId, rating: -1, channel: 'chat' })
    .catch(err => logger.error('Feedback submit failed', err));
}
```

### Pattern 2: Scheduled Batch Analysis (Not Real-Time)
**What:** Feedback analysis runs on a schedule (daily/weekly), not on every individual signal. Mirrors the existing WhatsApp monitor pattern.
**When:** Pattern detection (D-1), prompt refinement proposals (D-2)
**Why:** Individual feedback signals are noisy. Patterns emerge over time. Real-time analysis wastes compute and produces low-quality insights.
**Example:** Trigger.dev scheduled task, same infrastructure as `sahara-whatsapp-monitor.ts`.

### Pattern 3: Extend, Don't Replace Existing Systems
**What:** Wire feedback into existing infrastructure (A/B testing, PostHog, Linear, admin panel) rather than building parallel systems.
**When:** All v7.0 features
**Why:** Sahara already has analytics (PostHog), issue tracking (Linear), experimentation (A/B testing), notifications (email/SMS). Feedback adds a new signal type, not a new system.

### Pattern 4: Human-in-the-Loop for Prompt Changes
**What:** No automated prompt modification. All changes go through: AI proposes -> Admin reviews -> A/B test validates -> Admin promotes.
**When:** D-2 (RLHF-lite)
**Why:** Prompt changes affect every founder's coaching experience. The blast radius of a bad prompt change is 100% of users.

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Separate Feedback Microservice
**What:** Building feedback as a separate service with its own database, API, and deployment.
**Why bad:** Sahara is a monolithic Next.js app. A microservice adds deployment complexity, network latency, and data synchronization overhead for no benefit at this scale.
**Instead:** New tables in existing Supabase database. New API routes in existing `app/api/`. New components in existing component library.

### Anti-Pattern 2: Real-Time Feedback Dashboard
**What:** WebSocket-powered live dashboard that updates as feedback arrives.
**Why bad:** Feedback is not a real-time concern. No one watches a feedback dashboard like a stock ticker. The engineering cost of real-time updates is high for no user benefit.
**Instead:** Dashboard refreshes on page load. Add a "last updated" timestamp. Scheduled analysis results update daily.

### Anti-Pattern 3: Storing Feedback Separate from AI Request Context
**What:** A `feedback` table with no foreign key to `ai_requests` or `ai_responses`.
**Why bad:** You cannot trace feedback to the prompt version, model, or A/B variant that produced the response. Analysis is impossible.
**Instead:** `feedback_signals.ai_request_id` -> `ai_requests.id` -> `ai_requests.variant_id` -> `ab_variants.prompt_id`. Full traceability.

---

## Key Schema Design

```sql
-- Core feedback signal (explicit: thumbs, ratings, comments)
CREATE TABLE feedback_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  ai_request_id UUID REFERENCES ai_requests(id),  -- links to prompt version + variant
  session_id TEXT,
  channel TEXT NOT NULL DEFAULT 'chat',  -- chat | voice | sms | whatsapp
  signal_type TEXT NOT NULL,  -- thumbs | rating | comment | implicit
  rating SMALLINT,  -- 1 (positive) or -1 (negative)
  categories TEXT[],  -- ['too_vague', 'wrong_stage']
  comment TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Session-level aggregates (sentiment arc, engagement)
CREATE TABLE feedback_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  session_id TEXT NOT NULL,
  channel TEXT NOT NULL,
  avg_sentiment REAL,  -- -1.0 to 1.0
  sentiment_trend TEXT,  -- 'improving' | 'stable' | 'declining'
  explicit_rating SMALLINT,  -- post-session rating if given
  message_count INT,
  abandoned BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI-generated insights from feedback analysis
CREATE TABLE feedback_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  insight_type TEXT NOT NULL,  -- 'pattern' | 'regression' | 'improvement'
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT,
  frequency INT,  -- how many signals contributed
  severity TEXT,  -- 'critical' | 'moderate' | 'minor'
  signal_ids UUID[],  -- references to contributing feedback_signals
  suggested_action TEXT,  -- AI-proposed fix
  status TEXT DEFAULT 'new',  -- 'new' | 'reviewed' | 'actioned' | 'dismissed'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX idx_feedback_signals_user ON feedback_signals(user_id, created_at DESC);
CREATE INDEX idx_feedback_signals_channel ON feedback_signals(channel, created_at DESC);
CREATE INDEX idx_feedback_signals_rating ON feedback_signals(rating, created_at DESC);
CREATE INDEX idx_feedback_sessions_user ON feedback_sessions(user_id, created_at DESC);
CREATE INDEX idx_feedback_insights_status ON feedback_insights(status, created_at DESC);
```

---

## Sources

- Sahara codebase: `lib/ai/ab-testing.ts`, `trigger/sahara-whatsapp-monitor.ts`, `lib/channels/conversation-context.ts`
- [Braintrust: Prompt Evaluation Tools 2025](https://www.braintrust.dev/articles/best-prompt-evaluation-tools-2025) -- trace-to-evaluation pipeline
- [Maxim AI: Prompt A/B Testing Guide](https://www.getmaxim.ai/articles/how-to-perform-a-b-testing-with-prompts-a-comprehensive-guide-for-ai-teams/) -- experiment design
