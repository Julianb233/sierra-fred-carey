# Phase 04: Studio Tier Features - Research

**Researched:** 2026-02-05
**Domain:** Multi-agent AI orchestration, Twilio SMS, Boardy integration, Stripe tier extension
**Confidence:** MEDIUM (HIGH for SMS/Stripe, MEDIUM for agent architecture, LOW for Boardy)

## Summary

Phase 04 implements the Studio tier of Sahara, the highest-value tier featuring three virtual team agents (Founder Ops, Fundraising, Growth), weekly SMS check-ins via Twilio, Boardy investor/advisor matching integration, and the Studio tier Stripe upgrade flow.

The virtual agent architecture should use the existing Vercel AI SDK 6 Agent abstraction with an orchestrator-worker pattern built atop the project's established XState v5 actor model. Each specialized agent is an XState actor with its own state machine, coordinated by an orchestrator that delegates tasks and manages context. The existing circuit breaker, fallback chain, and reliability infrastructure already provide the 99%+ per-step reliability target.

Twilio SMS integration requires A2P 10DLC registration (already identified as a parallel track) with 10-15 day campaign review times. The `twilio` npm package (v5.11.x) is the standard SDK. Weekly check-ins should use Vercel Cron Jobs (vercel.json configuration) to trigger a Next.js API route that dispatches scheduled SMS via Twilio Messaging Services.

Boardy AI does NOT have a public developer API. The integration must be built as a "deep link + webhook" approach -- directing users to Boardy's platform and tracking referrals -- or as a mock/placeholder integration awaiting a future partnership API.

**Primary recommendation:** Build the orchestrator-worker agent architecture using XState v5 parallel states and the Vercel AI SDK 6 Agent abstraction, implement Twilio SMS with Vercel Cron Jobs for weekly scheduling, design Boardy integration as an abstracted interface that can start with deep links and evolve to a proper API when available.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `ai` (Vercel AI SDK) | ^6.0.72 | Agent abstraction, tools, generateText, generateObject | Already installed, provides Agent class for multi-step tool loops |
| `xstate` | ^5.26.0 | Orchestrator state machine, parallel agent states | Already installed, actor model perfect for multi-agent coordination |
| `@xstate/react` | ^6.0.0 | React bindings for agent state machines | Already installed |
| `twilio` | ^5.11.2 | SMS sending, receiving, scheduling, webhook validation | Industry standard Twilio Node.js SDK |
| `stripe` | ^20.1.0 | Studio tier checkout, subscription upgrade/downgrade | Already installed, extend for third tier |
| `zod` | ^4.3.6 | Schema validation for agent outputs, SMS payloads | Already installed, used throughout |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `date-fns` | ^3.6.0 | Weekly check-in scheduling, timezone handling | Already installed, date arithmetic for SMS scheduling |
| `postgres` | ^3.4.8 | Agent task storage, SMS log storage | Already installed, direct SQL for new tables |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom agent orchestrator | Mastra framework | Mastra adds external dependency; project already has XState + AI SDK which covers the same patterns without new deps |
| Custom cron scheduling | Twilio Message Scheduling API | Twilio scheduling requires MessagingService and has 15min-35day window; Vercel Cron is simpler for weekly cadence |
| Separate agent framework | OpenAI Agents SDK / LangGraph | Both add heavy dependencies; Vercel AI SDK 6 Agent class is sufficient and already integrated |

**Installation:**
```bash
pnpm add twilio
```

Only `twilio` is new. Everything else is already in the project.

## Architecture Patterns

### Recommended Project Structure
```
lib/
  agents/
    orchestrator.ts          # Main orchestrator - delegates to specialist agents
    types.ts                 # Shared agent types, task schemas
    machine.ts               # XState orchestrator state machine
    base-agent.ts            # Base agent class wrapping AI SDK Agent
    founder-ops/
      agent.ts               # Founder Ops agent definition (tools + system prompt)
      tools.ts               # Tools: scheduling, email drafts, task management
      prompts.ts             # System prompts and templates
    fundraising/
      agent.ts               # Fundraising agent definition
      tools.ts               # Tools: investor research, outreach, pipeline
      prompts.ts             # System prompts and templates
    growth/
      agent.ts               # Growth agent definition
      tools.ts               # Tools: analytics, experiments, channel optimization
      prompts.ts             # System prompts and templates
  sms/
    client.ts                # Twilio client wrapper
    scheduler.ts             # Weekly check-in scheduling logic
    templates.ts             # SMS message templates
    webhook-handler.ts       # Inbound SMS processing
    types.ts                 # SMS-related types
  boardy/
    client.ts                # Boardy integration client (abstracted interface)
    types.ts                 # Match types, referral types
    mock.ts                  # Mock implementation until real API available
app/
  api/
    agents/
      route.ts               # POST /api/agents - dispatch agent task
      [agentId]/
        route.ts             # GET/POST /api/agents/:agentId - agent status/commands
      tasks/
        route.ts             # GET /api/agents/tasks - list agent tasks
    sms/
      webhook/
        route.ts             # POST /api/sms/webhook - Twilio inbound webhook
      send/
        route.ts             # POST /api/sms/send - manual SMS send
    cron/
      weekly-checkin/
        route.ts             # GET /api/cron/weekly-checkin - Vercel Cron trigger
    boardy/
      match/
        route.ts             # GET /api/boardy/match - get investor matches
      callback/
        route.ts             # POST /api/boardy/callback - Boardy webhook/callback
  dashboard/
    agents/
      page.tsx               # Agent dashboard overview
      [agentId]/
        page.tsx             # Individual agent detail
    sms/
      page.tsx               # SMS check-in history and settings
    boardy/
      page.tsx               # Boardy integration page
components/
  agents/
    agent-card.tsx           # Agent status card
    agent-task-list.tsx      # Task list for an agent
    agent-chat.tsx           # Chat with specific agent
  sms/
    checkin-history.tsx      # SMS check-in history view
    checkin-settings.tsx     # Check-in preferences
  boardy/
    match-list.tsx           # Investor/advisor matches
    boardy-connect.tsx       # Connection to Boardy
```

### Pattern 1: Orchestrator-Worker with XState Parallel States

**What:** A central orchestrator XState machine that spawns/invokes specialist agent actors. Each agent is an XState actor wrapping a Vercel AI SDK Agent with specialized tools.

**When to use:** When multiple specialized agents need to work on different aspects of a founder's needs, potentially in parallel.

**Example:**
```typescript
// lib/agents/machine.ts
import { setup, assign, fromPromise } from "xstate";
import type { AgentTask, AgentResult } from "./types";

export const agentOrchestratorMachine = setup({
  types: {
    context: {} as {
      userId: string;
      tasks: AgentTask[];
      results: Map<string, AgentResult>;
      activeAgents: string[];
    },
    events: {} as
      | { type: "DISPATCH"; task: AgentTask }
      | { type: "AGENT_COMPLETE"; agentId: string; result: AgentResult }
      | { type: "AGENT_ERROR"; agentId: string; error: Error }
      | { type: "CANCEL_AGENT"; agentId: string },
  },
  actors: {
    founderOpsAgent: fromPromise<AgentResult, AgentTask>(
      async ({ input }) => {
        // Delegate to Vercel AI SDK Agent
        const { runFounderOpsAgent } = await import("./founder-ops/agent");
        return runFounderOpsAgent(input);
      }
    ),
    fundraisingAgent: fromPromise<AgentResult, AgentTask>(
      async ({ input }) => {
        const { runFundraisingAgent } = await import("./fundraising/agent");
        return runFundraisingAgent(input);
      }
    ),
    growthAgent: fromPromise<AgentResult, AgentTask>(
      async ({ input }) => {
        const { runGrowthAgent } = await import("./growth/agent");
        return runGrowthAgent(input);
      }
    ),
  },
}).createMachine({
  id: "agent-orchestrator",
  initial: "idle",
  states: {
    idle: {
      on: {
        DISPATCH: { target: "routing", actions: "enqueueTask" },
      },
    },
    routing: {
      always: [
        { guard: "isFounderOpsTask", target: "executing.founderOps" },
        { guard: "isFundraisingTask", target: "executing.fundraising" },
        { guard: "isGrowthTask", target: "executing.growth" },
      ],
    },
    executing: {
      type: "parallel",
      states: {
        founderOps: { /* invoke founderOpsAgent actor */ },
        fundraising: { /* invoke fundraisingAgent actor */ },
        growth: { /* invoke growthAgent actor */ },
      },
    },
    complete: { type: "final" },
  },
});
```

### Pattern 2: Vercel AI SDK Agent with Tools

**What:** Each specialist agent defined using the AI SDK Agent abstraction with domain-specific tools.

**When to use:** For each individual agent's implementation.

**Example:**
```typescript
// lib/agents/founder-ops/agent.ts
import { generateText, tool } from "ai";
import { z } from "zod";
import { getModel } from "@/lib/ai/providers";
import { generateStructuredReliable } from "@/lib/ai/fred-client";

const founderOpsTools = {
  draftEmail: tool({
    description: "Draft an email for the founder",
    parameters: z.object({
      recipient: z.string(),
      subject: z.string(),
      context: z.string(),
      tone: z.enum(["formal", "casual", "urgent"]),
    }),
    execute: async ({ recipient, subject, context, tone }) => {
      // Use AI to generate email draft
      const result = await generateStructuredReliable(
        `Draft an email to ${recipient} about: ${context}. Tone: ${tone}`,
        z.object({
          subject: z.string(),
          body: z.string(),
          suggestedFollowUp: z.string().optional(),
        })
      );
      return result.object;
    },
  }),

  createTask: tool({
    description: "Create a task for the founder's todo list",
    parameters: z.object({
      title: z.string(),
      priority: z.enum(["low", "medium", "high", "critical"]),
      dueDate: z.string().optional(),
      category: z.string(),
    }),
    execute: async ({ title, priority, dueDate, category }) => {
      // Store task in database
      // Return confirmation
      return { taskId: "...", status: "created" };
    },
  }),

  scheduleMeeting: tool({
    description: "Suggest meeting times and prepare agenda",
    parameters: z.object({
      attendees: z.array(z.string()),
      topic: z.string(),
      duration: z.number().describe("Duration in minutes"),
    }),
    execute: async ({ attendees, topic, duration }) => {
      return { suggested: true, topic, duration };
    },
  }),
};

export async function runFounderOpsAgent(task: AgentTask): Promise<AgentResult> {
  const result = await generateText({
    model: getModel("primary"),
    system: `You are the Founder Ops Agent for Sahara. You help founders with
    operational tasks: scheduling, email drafting, meeting prep, and task management.
    You have Fred Cary's perspective on founder operations.
    Always be actionable and specific.`,
    prompt: task.description,
    tools: founderOpsTools,
    maxSteps: 10, // Allow up to 10 tool calls
  });

  return {
    agentId: "founder-ops",
    taskId: task.id,
    output: result.text,
    toolCalls: result.steps.flatMap(s => s.toolCalls),
    status: "complete",
  };
}
```

### Pattern 3: Twilio SMS with Vercel Cron

**What:** Weekly SMS check-ins triggered by Vercel Cron Jobs, sent via Twilio Messaging Services.

**When to use:** For the automated weekly accountability check-in system.

**Example:**
```typescript
// app/api/cron/weekly-checkin/route.ts
import { NextRequest, NextResponse } from "next/server";
import { sendWeeklyCheckins } from "@/lib/sms/scheduler";

export async function GET(request: NextRequest) {
  // Verify Vercel Cron authorization
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await sendWeeklyCheckins();
    return NextResponse.json({
      sent: result.sent,
      failed: result.failed,
      skipped: result.skipped,
    });
  } catch (error) {
    console.error("[Cron] Weekly check-in error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
```

```json
// vercel.json addition
{
  "crons": [
    {
      "path": "/api/cron/weekly-checkin",
      "schedule": "0 14 * * 1"
    }
  ]
}
```

### Anti-Patterns to Avoid

- **Monolithic agent:** Do NOT build one giant agent that handles all tasks. Each agent must have focused domain tools and a specialized system prompt. The orchestrator routes, agents execute.
- **Polling for SMS responses:** Do NOT poll Twilio for responses. Use webhooks (inbound message webhook) to receive replies asynchronously.
- **Client-side agent execution:** Do NOT run agent logic on the client. All agent processing happens server-side in API routes. The client only receives status updates and results.
- **Storing Twilio credentials in code:** Use environment variables exclusively. The existing pattern in `lib/stripe/server.ts` (lazy-loaded client) should be replicated for Twilio.
- **Skipping A2P 10DLC:** Do NOT attempt to send production SMS without completing A2P 10DLC registration. Carriers will filter/block unregistered traffic, and Twilio will restrict your account.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| SMS sending/receiving | Custom HTTP to Twilio REST API | `twilio` npm package (v5.11.x) | Handles auth, retries, TwiML generation, webhook validation |
| Webhook signature validation | Custom HMAC-SHA1 validation | `twilio.validateRequest()` / `twilio.webhook()` | Cryptographically complex, easy to get wrong |
| Scheduled SMS dispatch | Custom setTimeout/setInterval queue | Vercel Cron Jobs + Twilio Messaging Services | Serverless environment has no persistent processes; cron is reliable |
| Agent tool orchestration loop | Custom while-loop with tool calls | Vercel AI SDK `generateText` with `maxSteps` | AI SDK handles tool call → response → next step loop automatically |
| Subscription upgrade proration | Manual invoice calculation | Stripe `subscriptions.update()` with `proration_behavior` | Stripe handles complex proration math, prorated invoices |
| Phone number validation | Custom regex | `twilio` Lookup API or E.164 format validation | International numbers have complex formats |

**Key insight:** The Vercel AI SDK 6 Agent abstraction and `maxSteps` parameter already handle the core agent loop (call LLM -> execute tools -> feed results back -> repeat). Do not build a custom tool-execution loop. XState orchestrates WHICH agent runs and manages cross-agent coordination, not the inner tool loop.

## Common Pitfalls

### Pitfall 1: A2P 10DLC Registration Delay

**What goes wrong:** SMS sending fails or messages are silently filtered because A2P 10DLC brand/campaign registration is not complete.
**Why it happens:** Campaign review takes 10-15 business days. Brand registration is quick (minutes), but campaign approval involves carrier review.
**How to avoid:** Start registration NOW (parallel track already identified). Register brand first, then submit campaign with detailed use case description (40-4096 chars). Use case: "Weekly accountability check-in for startup founders using Sahara platform."
**Warning signs:** Low delivery rates, messages not received, Twilio console showing "unregistered" campaign status.

### Pitfall 2: Agent Context Window Exhaustion

**What goes wrong:** Agents accumulate too many tool calls and conversation history, exceeding context limits and producing degraded outputs.
**Why it happens:** `maxSteps: 10` with verbose tool outputs can easily fill 128K+ token windows.
**How to avoid:** Keep tool outputs concise (return structured data, not prose). Set reasonable `maxSteps` (5-8 for most tasks). Summarize intermediate results. Use the existing memory architecture for persistent context instead of cramming everything into the prompt.
**Warning signs:** Agent responses becoming generic or repeating themselves, token usage approaching model limits, slower response times.

### Pitfall 3: Twilio Webhook URL Misconfiguration

**What goes wrong:** Inbound SMS responses are lost because the webhook URL is not correctly configured or not publicly accessible.
**Why it happens:** Twilio needs a public HTTPS URL to POST inbound messages. Development environments, Vercel preview deployments, and misconfigured DNS all break this.
**How to avoid:** Configure the webhook URL in Twilio Console to point to production deployment URL. Use ngrok for local development testing. Validate webhook signatures to prevent spoofing.
**Warning signs:** Users report responding to SMS but no response tracked, Twilio logs showing 4xx/5xx errors on webhook delivery.

### Pitfall 4: Parallel Agent Race Conditions

**What goes wrong:** Multiple agents operating on the same founder's data simultaneously create conflicting recommendations or duplicate actions.
**Why it happens:** Without coordination, the Growth Agent might suggest a pricing strategy that conflicts with the Fundraising Agent's investor narrative.
**How to avoid:** The orchestrator must maintain a shared context document that agents read before acting. Use database-level locking for critical operations. Design agent outputs as "recommendations" that go through the orchestrator for conflict resolution before execution.
**Warning signs:** Contradictory advice from different agents, duplicate emails or tasks created, confused founders.

### Pitfall 5: Stripe Tier Upgrade Edge Cases

**What goes wrong:** Users get stuck in incorrect tier states during upgrade/downgrade between Free->Pro->Studio.
**Why it happens:** Webhook race conditions, proration edge cases, subscription update failures mid-flow.
**How to avoid:** The existing Stripe webhook handler already has idempotency checks. Extend `getUserTierFromSubscription()` to recognize Studio-tier price IDs. Use `proration_behavior: 'always_invoice'` for immediate upgrades. Test the full Free->Pro->Studio and Studio->Pro->Free flows.
**Warning signs:** Users paying for Studio but seeing Pro features, tier context showing wrong tier after upgrade, Stripe dashboard showing "past_due" subscriptions.

### Pitfall 6: Vercel Cron Job Reliability

**What goes wrong:** Weekly check-in cron job fails silently or runs on preview deployments.
**Why it happens:** Vercel cron jobs ONLY run on production deployments. No built-in retry. No alerting by default.
**How to avoid:** Always deploy cron changes to production. Add error logging and external alerting (Slack webhook on failure). Implement the cron endpoint to be idempotent (safe to call multiple times). Verify with `CRON_SECRET` authorization header.
**Warning signs:** Users not receiving weekly check-ins, no cron execution logs in Vercel dashboard.

## Code Examples

### Twilio Client Wrapper

```typescript
// lib/sms/client.ts
import Twilio from "twilio";

let twilioClient: Twilio.Twilio | null = null;

function getTwilio(): Twilio.Twilio {
  if (!twilioClient) {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    if (!accountSid || !authToken) {
      throw new Error("TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN must be set");
    }
    twilioClient = Twilio(accountSid, authToken);
  }
  return twilioClient;
}

export async function sendSMS(to: string, body: string): Promise<string> {
  const client = getTwilio();
  const message = await client.messages.create({
    to,
    body,
    messagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID,
  });
  return message.sid;
}

export function validateWebhook(
  signature: string,
  url: string,
  params: Record<string, string>
): boolean {
  const authToken = process.env.TWILIO_AUTH_TOKEN!;
  return Twilio.validateRequest(authToken, signature, url, params);
}
```

### Inbound SMS Webhook Handler

```typescript
// app/api/sms/webhook/route.ts
import { NextRequest, NextResponse } from "next/server";
import { validateWebhook } from "@/lib/sms/client";
import { processInboundSMS } from "@/lib/sms/webhook-handler";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const params: Record<string, string> = {};
  formData.forEach((value, key) => {
    params[key] = value.toString();
  });

  // Validate Twilio signature
  const signature = request.headers.get("x-twilio-signature") || "";
  const url = `${process.env.NEXT_PUBLIC_APP_URL}/api/sms/webhook`;

  if (!validateWebhook(signature, url, params)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
  }

  const from = params.From;
  const body = params.Body;

  await processInboundSMS(from, body);

  // Return empty TwiML (no auto-reply needed)
  return new NextResponse(
    '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
    { headers: { "Content-Type": "text/xml" } }
  );
}
```

### Stripe Studio Tier Configuration

```typescript
// Extension to lib/stripe/config.ts
export const PLANS = {
  FREE: {
    id: "free",
    name: "Free",
    price: 0,
    priceId: null,
    features: [/* ... */],
  },
  FUNDRAISING: {
    id: "fundraising",
    name: "Fundraising & Strategy",
    price: 99,
    priceId: process.env.NEXT_PUBLIC_STRIPE_FUNDRAISING_PRICE_ID,
    features: [/* ... */],
  },
  VENTURE_STUDIO: {
    id: "venture_studio",
    name: "Venture Studio",
    price: 249,
    priceId: process.env.NEXT_PUBLIC_STRIPE_VENTURE_STUDIO_PRICE_ID,
    features: [
      "Everything in Fundraising",
      "Virtual Team: Founder Ops Agent",
      "Virtual Team: Fundraising Agent",
      "Virtual Team: Growth Agent",
      "Weekly SMS Check-ins",
      "Boardy investor/advisor matching",
      "Priority compute & deeper memory",
    ],
  },
} as const;
```

### Database Schema for Agent Tasks

```sql
-- Agent tasks table
CREATE TABLE agent_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  agent_type TEXT NOT NULL CHECK (agent_type IN ('founder_ops', 'fundraising', 'growth')),
  task_type TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'running', 'complete', 'failed', 'cancelled')),
  input JSONB NOT NULL DEFAULT '{}',
  output JSONB,
  error TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_agent_tasks_user ON agent_tasks(user_id);
CREATE INDEX idx_agent_tasks_status ON agent_tasks(status);
CREATE INDEX idx_agent_tasks_agent ON agent_tasks(agent_type);

-- SMS check-in tracking
CREATE TABLE sms_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  phone_number TEXT NOT NULL,
  message_sid TEXT, -- Twilio message SID
  direction TEXT NOT NULL CHECK (direction IN ('outbound', 'inbound')),
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'sent', 'delivered', 'failed', 'received')),
  week_number INTEGER NOT NULL, -- ISO week number
  year INTEGER NOT NULL,
  parent_checkin_id UUID REFERENCES sms_checkins(id), -- links responses to outbound
  accountability_score JSONB, -- AI-analyzed response quality
  sent_at TIMESTAMPTZ,
  received_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sms_checkins_user ON sms_checkins(user_id);
CREATE INDEX idx_sms_checkins_week ON sms_checkins(year, week_number);
CREATE INDEX idx_sms_checkins_phone ON sms_checkins(phone_number);

-- Boardy matches/referrals
CREATE TABLE boardy_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  match_type TEXT NOT NULL CHECK (match_type IN ('investor', 'advisor', 'mentor', 'partner')),
  match_name TEXT,
  match_description TEXT,
  match_score REAL, -- 0-1 relevance score
  status TEXT NOT NULL DEFAULT 'suggested'
    CHECK (status IN ('suggested', 'connected', 'intro_sent', 'meeting_scheduled', 'declined')),
  boardy_reference_id TEXT, -- External Boardy ID if available
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_boardy_matches_user ON boardy_matches(user_id);
CREATE INDEX idx_boardy_matches_status ON boardy_matches(status);

-- User SMS preferences
CREATE TABLE user_sms_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  phone_number TEXT,
  phone_verified BOOLEAN DEFAULT false,
  checkin_enabled BOOLEAN DEFAULT true,
  checkin_day INTEGER DEFAULT 1, -- 0=Sun, 1=Mon, ..., 6=Sat
  checkin_hour INTEGER DEFAULT 9, -- Hour in user's timezone (default 9am)
  timezone TEXT DEFAULT 'America/New_York',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### Vercel Cron Configuration

```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/weekly-checkin",
      "schedule": "0 14 * * 1"
    }
  ]
}
```

Note: The cron runs every Monday at 2 PM UTC (approximately 9-10 AM US time zones). The actual send time per user should be adjusted based on `user_sms_preferences.timezone`.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Custom agent loops with while(true) | Vercel AI SDK `maxSteps` parameter | AI SDK 5 (Jul 2025) | Eliminates custom loop code, built-in step management |
| LangChain agent executor | Vercel AI SDK Agent class | AI SDK 6 (2025) | Lighter weight, better TypeScript integration |
| Custom SMS queues (Bull/BullMQ) | Vercel Cron + Twilio Messaging Services | Vercel Cron GA (2024) | No Redis needed, serverless-native scheduling |
| Manual 10DLC phone calls | Self-service A2P 10DLC portal in Twilio Console | 2023 | Faster registration, API-based submission |
| Separate agent frameworks per agent | XState v5 actor model + AI SDK | XState v5 (Dec 2023) | Unified state management + AI capabilities |

**Deprecated/outdated:**
- `twilio` v3.x: Use v5.x (v4 was the TypeScript rewrite, v5 is current)
- Twilio short codes for A2P: 10DLC is now required for standard long code SMS
- Custom retry logic for agents: AI SDK handles retries internally with circuit breaker

## Open Questions

1. **Boardy API access**
   - What we know: Boardy AI is a voice-based networking platform. They match founders with investors/advisors via phone calls and double-opt-in email intros. They have raised $8M+.
   - What's unclear: No public developer API exists. No documented partner integration endpoint.
   - Recommendation: Build a Boardy integration interface with an abstraction layer. Start with deep-link referrals (direct users to Boardy's sign-up with referral tracking). Design the interface so a real API integration can be swapped in when/if partnership is established. Consider reaching out to Boardy's team for API access.

2. **Agent execution cost control**
   - What we know: Each agent invocation involves multiple LLM calls. Studio tier users may run agents frequently.
   - What's unclear: Exact cost per agent task. Whether token budgets need per-user rate limiting.
   - Recommendation: Implement token budgets per agent invocation (e.g., max 50K tokens per task). Track costs via the existing `estimateCost()` utility. Add rate limiting (e.g., 20 agent tasks per day per user for Studio tier).

3. **SMS opt-in/opt-out compliance**
   - What we know: A2P 10DLC requires explicit opt-in and STOP/HELP keyword support.
   - What's unclear: Exact opt-in flow within the Sahara onboarding.
   - Recommendation: Add SMS consent during onboarding or Studio tier upgrade. Implement STOP keyword handling in the inbound webhook. Store consent timestamp in `user_sms_preferences`.

4. **Vercel Cron Job plan limits**
   - What we know: Vercel Cron Jobs run only on production. Free/Hobby plans have limited cron invocations.
   - What's unclear: Exact invocation limits for the project's Vercel plan.
   - Recommendation: Weekly cron (1 invocation per week) is well within any plan's limits. If needed, the cron batches all user check-ins in a single invocation.

## Sources

### Primary (HIGH confidence)
- Vercel AI SDK 6 Agent documentation: https://ai-sdk.dev/docs/foundations/agents - Agent class, tools, maxSteps
- Vercel AI SDK Workflow patterns: https://ai-sdk.dev/docs/agents/workflows - Orchestrator-worker pattern
- Twilio official docs: https://www.twilio.com/docs/messaging/compliance/a2p-10dlc - A2P 10DLC registration
- Twilio Node.js SDK: https://www.npmjs.com/package/twilio - v5.11.2 latest
- Twilio Message Scheduling: https://www.twilio.com/docs/messaging/features/message-scheduling
- Twilio Webhook Security: https://www.twilio.com/docs/usage/webhooks/webhooks-security
- Vercel Cron Jobs: https://vercel.com/docs/cron-jobs - Configuration, quickstart, limitations
- Stripe Subscription Upgrades: https://docs.stripe.com/billing/subscriptions/upgrade-downgrade
- XState v5 Actors: https://stately.ai/docs/actors - Actor model, parallel states, spawned actors

### Secondary (MEDIUM confidence)
- Multi-agent orchestration patterns: https://arize.com/blog/orchestrator-worker-agents-a-practical-comparison-of-common-agent-frameworks/
- Twilio Next.js integration guide: https://www.sent.dm/resources/twilio-node-js-next-js-basic-send-sms
- Twilio inbound SMS with Next.js: https://www.sent.dm/resources/twilio-node-js-next-js-inbound-two-way-messaging

### Tertiary (LOW confidence)
- Boardy AI capabilities: https://www.boardy.ai/ - No public API documentation found
- Boardy funding/features: https://creandum.com/stories/backing-boardy-ai/ - Third-party article
- Agent framework landscape: https://kanerika.com/blogs/ai-agent-orchestration/ - General overview article

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries verified via npm, official docs, and existing codebase
- Agent architecture: MEDIUM - Pattern well-established (XState + AI SDK), but specific implementation requires design decisions
- SMS integration: HIGH - Twilio SDK is mature, well-documented, patterns are standard
- Boardy integration: LOW - No public API exists; integration design is speculative
- Stripe extension: HIGH - Existing patterns in codebase provide clear extension path
- Pitfalls: MEDIUM - Based on official documentation warnings and common community issues

**Research date:** 2026-02-05
**Valid until:** 2026-03-07 (30 days - stack is stable, Boardy situation may change)
