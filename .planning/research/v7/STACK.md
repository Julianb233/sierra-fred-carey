# Stack Research -- v7.0 Closed-Loop UX Feedback System

**Project:** Sahara -- AI-Powered Founder OS
**Researched:** 2026-03-04
**Mode:** Ecosystem (stack dimension)
**Overall confidence:** MEDIUM-HIGH

---

## Existing Stack Leverage

Before adding anything new, here is what the current stack already covers. The goal is to maximize reuse and minimize new dependencies.

| Existing Tool | Already Installed | Covers | Gap |
|---|---|---|---|
| **PostHog** (`posthog-js` ^1.342, `posthog-node` ^5.24) | Yes | Session replay, product analytics, funnels, **Surveys (NPS, CSAT, thumbs, emoji)** | Need to activate Surveys feature -- no new library needed |
| **Vercel AI SDK** (`ai` ^6.0) | Yes | Structured output via `generateObject`, enum classification, streaming | Sentiment analysis, categorization, auto-prioritization all doable with existing `generateObject` + Zod schemas |
| **Supabase** (`@supabase/supabase-js` ^2.89) | Yes | PostgreSQL storage, realtime subscriptions, RLS, pgvector | Feedback tables, aggregation views, realtime admin dashboard |
| **Twilio** (`twilio` ^5.12) | Yes | SMS send/receive, webhook validation | SMS feedback ingestion ready; just needs inbound webhook handler |
| **Trigger.dev** (`@trigger.dev/sdk` ^4.4) | Yes | Scheduled tasks, background jobs | Feedback processing pipeline, batch analysis jobs |
| **Resend** (`resend` ^6.9) | Yes | Transactional email | Close-the-loop notifications to founders |
| **Sentry** (`@sentry/nextjs` ^10.38) | Yes | Error tracking, user feedback widget | Sentry has built-in User Feedback -- can capture crash-context feedback |
| **Stagehand/BrowserBase** (`@browserbasehq/stagehand` ^3.0) | Yes | Browser automation | WhatsApp Web scraping already implemented in `trigger/sahara-whatsapp-monitor.ts` |
| **XState** (`xstate` ^5.26) | Yes | State machines | Feedback lifecycle states (received -> classified -> triaged -> resolved -> notified) |
| **Zod** (`zod` ^4.3) | Yes | Schema validation | Feedback schema validation, AI structured output schemas |
| **Recharts** (`recharts` ^3.6) | Yes | Charting | Admin dashboard visualizations |

**Key insight: Over 70% of v7.0 requirements are achievable with existing dependencies.** The project already has PostHog (surveys + session replay + analytics), Vercel AI SDK (classification), Supabase (storage + realtime), and Trigger.dev (background processing). The main additions are for Linear API integration, LLM observability, and WhatsApp Cloud API (to replace the BrowserBase scraping approach).

---

## Recommended Additions

### 1. `@linear/sdk` -- Linear Issue Auto-Triage

| Field | Value |
|---|---|
| **Package** | `@linear/sdk` |
| **Version** | `^37.0.0` (latest as of 2026-03) |
| **Purpose** | Create issues, apply labels, link feedback clusters to Linear projects |
| **Confidence** | HIGH -- official SDK, TypeScript-native, GraphQL under the hood |

**Why:** The existing WhatsApp monitor (`trigger/sahara-whatsapp-monitor.ts`) already does raw GraphQL calls to Linear. The SDK provides typed operations, pagination, webhooks, and label management. Replace the raw `fetch` calls with the SDK for reliability and maintainability.

**Integration:** Server-side only. Used in Trigger.dev tasks and API routes. The existing `createLinearIssue()` function in the WhatsApp monitor becomes a 5-line SDK call.

```typescript
import { LinearClient } from "@linear/sdk";
const linear = new LinearClient({ apiKey: process.env.LINEAR_API_KEY });

const issue = await linear.createIssue({
  teamId: "...",
  title: "Bug: Voice cuts off on Samsung",
  description: "Auto-triaged from feedback cluster #42",
  priority: 2,
  labelIds: ["bug-label-id"],
});
```

---

### 2. `langfuse` -- LLM Observability and Prompt A/B Testing

| Field | Value |
|---|---|
| **Package** | `langfuse` + `@langfuse/vercel-ai` |
| **Version** | `^3.x` (latest) |
| **Purpose** | Trace every FRED interaction, version prompts, A/B test prompt variants, track quality scores |
| **Confidence** | HIGH -- official Vercel AI SDK integration, OpenTelemetry-based, cloud or self-hosted |

**Why this is the critical new addition:** The FRED self-improvement loop requires knowing WHICH prompt version produced WHICH response and whether the user gave it thumbs up or down. Langfuse is the only tool that natively bridges Vercel AI SDK telemetry with prompt versioning and user feedback scoring.

**What it provides:**
- **Prompt Management:** Version prompts, deploy to production, roll back bad versions
- **A/B Testing:** Label prompt versions (e.g., `v3-concise` vs `v3-verbose`), split traffic via feature flags, compare metrics
- **Trace-to-Feedback Linking:** Attach user feedback scores (thumbs up/down) to specific LLM traces
- **Cost Tracking:** Token usage per prompt version, per user tier
- **Evaluation:** Run automated evals on prompt versions before deploying

**Integration with existing stack:**

```typescript
// In lib/ai/ -- wrap existing Vercel AI SDK calls
import { LangfuseSpanProcessor } from "@langfuse/vercel-ai";
import { registerOTel } from "@vercel/otel";

registerOTel({
  serviceName: "sahara-fred",
  traceExporter: new LangfuseSpanProcessor(),
});

// Then in chat route, attach feedback:
import { Langfuse } from "langfuse";
const langfuse = new Langfuse();
langfuse.score({
  traceId: response.traceId,
  name: "user-feedback",
  value: thumbsUp ? 1 : 0,
});
```

**Pricing:** Free tier: 50k observations/month. Pro: $25/month for 1M observations. Self-host option available (Docker Compose with Postgres + ClickHouse).

**Recommendation:** Start with Langfuse Cloud free tier. Migrate to self-hosted only if volume exceeds free tier or data residency matters.

---

### 3. WhatsApp Cloud API (Official Meta SDK) -- Replace BrowserBase Scraping

| Field | Value |
|---|---|
| **Package** | `whatsapp` (official Meta SDK) |
| **Version** | `^1.x` |
| **Purpose** | Receive WhatsApp messages via webhook instead of browser scraping |
| **Confidence** | MEDIUM -- requires WhatsApp Business Account approval from Meta |

**Why:** The current approach in `trigger/sahara-whatsapp-monitor.ts` scrapes WhatsApp Web via BrowserBase/Stagehand. This is fragile (DOM changes break it), slow (browser spin-up), expensive (BrowserBase compute), and cannot send replies to individual users. The official WhatsApp Cloud API provides:

- **Webhooks:** Real-time message delivery (no polling/scraping)
- **Structured Messages:** Templates, buttons, interactive lists
- **Close-the-Loop:** Reply directly to the user who gave feedback
- **Reliability:** Official API, not screen scraping

**Caveat:** Requires a WhatsApp Business Account and Meta Business verification. Takes 1-2 weeks for approval. Group message reading may require additional permissions. This is a MEDIUM confidence recommendation because the approval process introduces timeline risk.

**Fallback:** Keep the BrowserBase approach as fallback during WhatsApp Business API approval. Run both in parallel during transition.

**Integration:**

```typescript
// API route: app/api/whatsapp/webhook/route.ts
import WhatsApp from "whatsapp";

const wa = new WhatsApp(process.env.WA_PHONE_NUMBER_ID);

// Webhook handler for incoming messages
export async function POST(req: Request) {
  const body = await req.json();
  // Parse incoming message, store in Supabase feedback table
  // Trigger AI classification via Trigger.dev task
}
```

---

### 4. `octokit` -- GitHub API Integration (Optional)

| Field | Value |
|---|---|
| **Package** | `octokit` |
| **Version** | `^4.x` |
| **Purpose** | Create GitHub issues from feedback, sync with Linear |
| **Confidence** | HIGH -- official GitHub SDK |

**Why:** Only needed if feedback should also flow to GitHub Issues (e.g., for open-source components or public-facing bug tracking). Since the project already uses Linear as the primary issue tracker, this is OPTIONAL.

**Recommendation:** Defer. Use Linear as the single issue destination. Add GitHub integration only if the team explicitly needs it for public-facing issue tracking.

---

## What NOT to Use (and Why)

### DO NOT add a standalone feedback widget library (Usersnap, PushFeedback, HappyReact, etc.)

**Why not:** PostHog Surveys already provides in-app NPS, CSAT, thumbs up/down, emoji reactions, free-text, and multiple choice -- all configurable from the PostHog dashboard without code changes. Adding a separate widget library means:
- Duplicate event tracking (PostHog + widget vendor)
- Extra bundle size
- Another SaaS subscription
- Data in two places

**Instead:** Use PostHog Surveys for all in-app feedback collection. Build a minimal custom `<ThumbsFeedback />` component for AI response ratings that posts to both PostHog (analytics) and Supabase (for Langfuse trace linking).

### DO NOT add Node.js NLP libraries (sentiment, winkNLP, NLP.js, natural)

**Why not:** These are dictionary-based or small-model approaches with ~84% accuracy at best. You already have Anthropic Claude and OpenAI GPT-4 via Vercel AI SDK. Using `generateObject` with a Zod schema for sentiment/category classification gives you:
- 95%+ accuracy on sentiment
- Multi-label categorization (bug, feature, UX, performance, etc.)
- Severity assessment
- Summary generation
- All in one call, with structured output

```typescript
const result = await generateObject({
  model: anthropic("claude-sonnet-4-20250514"),
  schema: z.object({
    sentiment: z.enum(["positive", "neutral", "negative", "frustrated"]),
    category: z.enum(["bug", "feature_request", "ux_friction", "praise", "question"]),
    severity: z.enum(["critical", "high", "medium", "low"]),
    summary: z.string(),
    actionRequired: z.boolean(),
  }),
  prompt: `Classify this user feedback: "${feedbackText}"`,
});
```

**Cost:** ~$0.003 per classification with Claude Sonnet. At 1000 feedback items/month = $3. Not worth optimizing with a local NLP library.

### DO NOT add Braintrust, PromptLayer, or Agenta for prompt management

**Why not:** Langfuse covers prompt management, A/B testing, evaluation, and observability in one tool with a native Vercel AI SDK integration. Adding a second tool creates fragmentation. Langfuse is also open-source and self-hostable, which the others are not (or with significant limitations).

### DO NOT add a separate session replay tool (LogRocket, FullStory, Hotjar)

**Why not:** PostHog session replay is already installed and configured. It integrates with PostHog surveys, analytics, and feature flags. Adding another session replay tool is pure duplication.

### DO NOT use Twilio for WhatsApp (Twilio WhatsApp API)

**Why not:** Twilio charges per-message for WhatsApp (~$0.005-0.08 per message depending on type). The Meta WhatsApp Cloud API has 1,000 free service conversations per month and lower per-conversation pricing after that. Since Sahara already has Twilio for SMS, using Meta directly for WhatsApp avoids an unnecessary middleman markup. The existing Twilio integration stays for SMS only.

---

## Integration Architecture

```
User Interaction Layer
  |
  +-- PostHog Surveys (NPS, CSAT, thumbs)  --.
  +-- Custom <ThumbsFeedback /> on AI chat  --+--> PostHog Events
  +-- Sentry User Feedback (crash context)  --'      |
  |                                                   v
  +-- WhatsApp Cloud API webhook  ---------> API Route --> Supabase feedback table
  +-- Twilio SMS inbound webhook  ---------> API Route --> Supabase feedback table
  |
  v
Trigger.dev Background Tasks
  |
  +-- classify-feedback (Vercel AI SDK generateObject)
  |     Output: sentiment, category, severity, summary
  |
  +-- cluster-feedback (aggregate similar items)
  |     Output: feedback clusters with counts
  |
  +-- triage-to-linear (Linear SDK)
  |     Output: Linear issues with labels + priority
  |
  +-- close-the-loop (Resend email + WhatsApp reply)
        Output: "We heard you, here's what we did"

LLM Observability Layer
  |
  +-- Langfuse traces (every FRED AI call)
  +-- Langfuse scores (linked to user thumbs up/down)
  +-- Langfuse prompt versions (A/B testing)

Admin Dashboard
  |
  +-- Supabase realtime (live feedback feed)
  +-- Recharts (sentiment trends, category breakdown)
  +-- PostHog embedded dashboards (session replay links)
```

---

## Database Schema Additions (Supabase)

New tables needed in Supabase:

```sql
-- Core feedback storage
CREATE TABLE feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users,
  source TEXT NOT NULL, -- 'in_app', 'whatsapp', 'sms', 'posthog_survey', 'sentry'
  channel TEXT, -- 'thumbs', 'nps', 'csat', 'free_text', 'voice_transcript'
  raw_content TEXT NOT NULL,
  -- AI classification (filled by Trigger.dev task)
  sentiment TEXT, -- 'positive', 'neutral', 'negative', 'frustrated'
  category TEXT, -- 'bug', 'feature_request', 'ux_friction', 'praise', 'question'
  severity TEXT, -- 'critical', 'high', 'medium', 'low'
  ai_summary TEXT,
  action_required BOOLEAN DEFAULT false,
  -- Linking
  langfuse_trace_id TEXT, -- Links to the AI interaction that prompted this feedback
  posthog_session_id TEXT, -- Links to session replay
  linear_issue_id TEXT, -- Created issue ID
  -- Lifecycle
  status TEXT DEFAULT 'new', -- 'new', 'classified', 'triaged', 'resolved', 'notified'
  resolved_at TIMESTAMPTZ,
  notified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Feedback clusters (aggregated similar items)
CREATE TABLE feedback_clusters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  feedback_count INT DEFAULT 0,
  avg_severity NUMERIC,
  linear_issue_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Prompt versions for A/B tracking (mirrors Langfuse, local reference)
CREATE TABLE prompt_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_name TEXT NOT NULL, -- e.g., 'fred-coaching', 'fred-onboarding'
  version TEXT NOT NULL,
  langfuse_prompt_id TEXT,
  is_active BOOLEAN DEFAULT false,
  positive_feedback_count INT DEFAULT 0,
  negative_feedback_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## Installation Plan

```bash
# New dependencies (3 packages)
npm install @linear/sdk langfuse @langfuse/vercel-ai

# Optional: WhatsApp Cloud API (when Meta Business approval comes through)
npm install whatsapp

# Optional: GitHub integration (defer unless explicitly needed)
# npm install octokit
```

**Total new dependencies: 3 required, 1 deferred, 1 optional.**

---

## Environment Variables Needed

```bash
# Langfuse (new)
LANGFUSE_PUBLIC_KEY=pk-lf-...
LANGFUSE_SECRET_KEY=sk-lf-...
LANGFUSE_BASEURL=https://cloud.langfuse.com  # or self-hosted URL

# Linear (already exists from WhatsApp monitor)
LINEAR_API_KEY=lin_api_...

# WhatsApp Cloud API (new, when approved)
WHATSAPP_TOKEN=...
WHATSAPP_PHONE_NUMBER_ID=...
WHATSAPP_VERIFY_TOKEN=...  # For webhook verification
WHATSAPP_BUSINESS_ACCOUNT_ID=...

# PostHog (already exists)
POSTHOG_API_KEY=...
NEXT_PUBLIC_POSTHOG_KEY=...
NEXT_PUBLIC_POSTHOG_HOST=...
```

---

## Confidence Assessment

| Area | Confidence | Reason |
|---|---|---|
| PostHog Surveys for in-app feedback | HIGH | Already installed, official docs confirm survey support with NPS/CSAT/thumbs |
| Vercel AI SDK for classification | HIGH | Already using generateObject extensively; structured output is core feature |
| Langfuse for LLM observability | HIGH | Official Vercel AI SDK integration, well-documented, recently acquired by ClickHouse |
| @linear/sdk for auto-triage | HIGH | Official SDK, TypeScript, already doing raw GraphQL to Linear |
| Supabase for feedback storage | HIGH | Already the database; just adding tables |
| WhatsApp Cloud API | MEDIUM | Requires Meta Business approval (1-2 week timeline risk); group message support needs verification |
| Trigger.dev for background processing | HIGH | Already using it for WhatsApp monitor |
| "No standalone NLP library" decision | HIGH | LLM-based classification is demonstrably superior and cost-negligible at this scale |

---

## Sources

- [PostHog Surveys](https://posthog.com/surveys) -- NPS, CSAT, custom surveys
- [PostHog Next.js Surveys Tutorial](https://posthog.com/tutorials/nextjs-surveys)
- [PostHog Session Replay API](https://posthog.com/docs/api/session-recordings)
- [Langfuse Vercel AI SDK Integration](https://langfuse.com/integrations/frameworks/vercel-ai-sdk)
- [Langfuse Prompt Management](https://langfuse.com/docs/prompt-management/get-started)
- [Langfuse A/B Testing](https://langfuse.com/docs/prompt-management/features/a-b-testing)
- [AI SDK Observability: Langfuse](https://ai-sdk.dev/providers/observability/langfuse)
- [Linear SDK npm](https://www.npmjs.com/package/@linear/sdk)
- [Linear Developers](https://linear.app/developers/sdk)
- [WhatsApp Node.js SDK (Official Meta)](https://github.com/WhatsApp/WhatsApp-Nodejs-SDK)
- [WhatsApp Receiving Messages](https://whatsapp.github.io/WhatsApp-Nodejs-SDK/receivingMessages/)
- [Sentry User Feedback for React](https://docs.sentry.io/platforms/javascript/guides/react/user-feedback/)
- [Vercel AI SDK Structured Output](https://ai-sdk.dev/docs/introduction)
