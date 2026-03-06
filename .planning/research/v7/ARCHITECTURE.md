# Architecture Patterns -- v7.0 Closed-Loop UX Feedback System

**Domain:** Multi-channel feedback collection + AI analysis + auto-triage
**Researched:** 2026-03-04

---

## Recommended Architecture

### Overview

The feedback system is an **event-driven pipeline** with four stages:

```
COLLECT --> CLASSIFY --> TRIAGE --> CLOSE
```

Each stage is decoupled via Supabase (persistent state) and Trigger.dev (async processing). This avoids blocking user interactions and allows each stage to fail independently.

### Component Boundaries

| Component | Responsibility | Location | Communicates With |
|---|---|---|---|
| **Feedback Collectors** | Capture raw feedback from all channels | Client components + API routes | Supabase, PostHog |
| **Classification Pipeline** | AI-powered sentiment, category, severity analysis | Trigger.dev tasks | Vercel AI SDK, Supabase, Langfuse |
| **Triage Engine** | Cluster feedback, create Linear issues, assign priority | Trigger.dev tasks | Linear SDK, Supabase |
| **Close-the-Loop** | Notify users that their feedback was addressed | Trigger.dev tasks | Resend, WhatsApp API, Twilio |
| **Admin Dashboard** | Aggregate view of all feedback + actions | Next.js server components | Supabase, PostHog API |
| **LLM Observability** | Trace FRED calls, link feedback to traces, prompt versioning | Langfuse integration | Vercel AI SDK, Langfuse Cloud |

### Data Flow

```
1. USER GIVES FEEDBACK
   |
   +-- In-app thumbs (client) --> PostHog event + Supabase INSERT
   +-- PostHog survey response --> PostHog webhook --> API route --> Supabase INSERT
   +-- WhatsApp message --> Webhook API route --> Supabase INSERT
   +-- SMS reply --> Twilio webhook --> API route --> Supabase INSERT
   +-- Sentry crash report --> Sentry webhook --> API route --> Supabase INSERT
   |
2. TRIGGER.DEV TASK: classify-feedback
   Triggered by: Supabase realtime (on INSERT to feedback table)
   Input: raw feedback text
   Output: sentiment, category, severity, summary, action_required
   Writes: UPDATE feedback SET sentiment=..., category=..., ...
   |
3. TRIGGER.DEV TASK: cluster-and-triage (scheduled, runs hourly)
   Input: all feedback with status='classified' since last run
   Process: Group by category + similarity, create/update clusters
   Output: New/updated feedback_clusters rows
   If cluster.feedback_count >= threshold AND no linear_issue_id:
     --> Create Linear issue via @linear/sdk
     --> UPDATE feedback_clusters SET linear_issue_id=...
   |
4. TRIGGER.DEV TASK: close-the-loop (triggered when Linear issue status changes)
   Input: Linear webhook (issue moved to "Done")
   Process: Find all feedback items linked to this cluster
   Output: Send notification to each user via their source channel
     - In-app users: Resend email
     - WhatsApp users: WhatsApp reply
     - SMS users: Twilio SMS
```

---

## Patterns to Follow

### Pattern 1: Source-Agnostic Feedback Schema

All feedback, regardless of source, goes through the same schema and pipeline.

**What:** Every collector normalizes input to the same `feedback` table shape.
**Why:** Prevents N different analysis pipelines for N channels. One classification task handles everything.

```typescript
// lib/feedback/types.ts
interface FeedbackInput {
  userId?: string;          // null for anonymous WhatsApp
  source: "in_app" | "whatsapp" | "sms" | "posthog_survey" | "sentry";
  channel: "thumbs" | "nps" | "csat" | "free_text" | "voice_transcript";
  rawContent: string;
  metadata?: {
    langfuseTraceId?: string;
    posthogSessionId?: string;
    senderPhone?: string;  // For WhatsApp/SMS close-the-loop
    promptVersion?: string;
  };
}
```

### Pattern 2: Lazy Background Classification

**What:** Never classify feedback synchronously in the request path. Always defer to Trigger.dev.
**Why:** AI classification takes 1-3 seconds. Blocking the user's thumbs-down click on a loading spinner is terrible UX.

```typescript
// API route: immediately store, async classify
export async function POST(req: Request) {
  const feedback = await req.json();
  const { data } = await supabase.from("feedback").insert(feedback).select().single();

  // Fire-and-forget classification
  await tasks.trigger("classify-feedback", { feedbackId: data.id });

  return Response.json({ ok: true });
}
```

### Pattern 3: Feedback-to-Trace Linking via Langfuse

**What:** Every FRED AI response includes a `traceId` in its metadata. When the user clicks thumbs down, the `traceId` is sent alongside the feedback.
**Why:** This is how you answer "which prompt produced this bad response?" -- the foundation of the self-improvement loop.

```typescript
// In chat streaming response, include traceId in metadata
const response = await streamText({
  model: anthropic("claude-sonnet-4-20250514"),
  messages,
  experimental_telemetry: { isEnabled: true },
});

// Client receives traceId via response metadata
// ThumbsFeedback component sends it with the rating
```

### Pattern 4: Cluster-Then-Triage (Not Individual Triage)

**What:** Do not create a Linear issue for every single piece of feedback. Group similar feedback into clusters, then create one issue per cluster.
**Why:** 50 people saying "voice cuts off on Samsung" should be one P1 issue with "reported by 50 users," not 50 separate tickets.

```typescript
// Trigger.dev scheduled task
export const clusterAndTriage = schedules.task({
  id: "cluster-and-triage",
  cron: "0 * * * *", // hourly
  run: async () => {
    // 1. Fetch unprocessed classified feedback
    // 2. Use AI to group by similarity (embeddings or LLM)
    // 3. Create/update clusters
    // 4. For clusters above threshold, create Linear issue
  },
});
```

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Synchronous Feedback Processing

**What:** Classifying feedback in the same request that captures it.
**Why bad:** Adds 1-3 seconds to every feedback submission. Users stop giving feedback.
**Instead:** Store raw, classify async via Trigger.dev.

### Anti-Pattern 2: Per-Feedback Linear Issues

**What:** Creating a Linear issue for every thumbs-down or negative comment.
**Why bad:** Floods the issue tracker. Team ignores feedback because it is all noise.
**Instead:** Cluster similar feedback, create issues for clusters above a threshold.

### Anti-Pattern 3: Client-Side AI Classification

**What:** Running sentiment analysis in the browser.
**Why bad:** Exposes API keys, increases bundle size, inconsistent results, and cannot use server-only models.
**Instead:** All AI classification happens server-side in Trigger.dev tasks.

### Anti-Pattern 4: Separate Feedback Database

**What:** Using a dedicated feedback SaaS (Canny, UserVoice) with its own database.
**Why bad:** Data lives outside your control. Cannot join with user data, session replays, or LLM traces. Vendor lock-in.
**Instead:** Supabase is the source of truth. PostHog is for analytics views. Langfuse is for LLM traces. All linked by user ID and trace ID.

### Anti-Pattern 5: Overengineered Feedback Widget

**What:** Building a complex multi-step feedback modal with screenshots, recordings, and categorization by the user.
**Why bad:** High friction = low participation. The user should only need to click one button.
**Instead:** One-click thumbs up/down. Optional single text field on negative. AI does the categorization.

---

## Scalability Considerations

| Concern | At 100 users | At 10K users | At 1M users |
|---|---|---|---|
| Feedback volume | ~50/day, inline processing fine | ~500/day, Trigger.dev handles easily | ~5000/day, need batch processing and rate limits on classification |
| Classification cost | ~$0.15/day (negligible) | ~$1.50/day | ~$15/day, consider caching similar classifications |
| Linear issue volume | ~2-3/week manually reviewed | ~10-20/week via clustering | Need automated dedup and intelligent merging |
| PostHog volume | Within free tier | Within free tier | May need to increase plan |
| Langfuse traces | Within free tier | Approaching free tier limit | Need Pro plan or self-host |
| Admin dashboard | Simple table view | Needs pagination, filtering | Needs search, aggregation views, export |

At Sahara's current scale (early growth, pre-Series A), the 100-user column is the relevant design target. Build for 10K but do not over-engineer for 1M.
