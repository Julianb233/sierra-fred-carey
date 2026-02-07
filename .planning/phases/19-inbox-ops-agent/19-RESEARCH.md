# Phase 19: Inbox Ops Agent - Research

**Researched:** 2026-02-07
**Domain:** In-app message hub, agent output aggregation, priority surfacing, notification architecture
**Confidence:** HIGH

## Summary

This research investigates everything needed to build the Inbox Ops Agent -- a centralized in-app message hub for Studio tier founders that aggregates, categorizes, and priority-surfaces outputs from all three existing agents (Founder Ops, Fundraising, Growth). The investigation covers the existing agent system architecture, database schema, notification infrastructure, dashboard patterns, Fred's voice integration, and tier gating mechanisms.

**Key finding:** The existing `agent_tasks` table already stores all agent outputs with structured JSONB `output` fields, status tracking, and timestamps. The Inbox Ops Agent does NOT need to be a fourth "specialist agent" with its own AI tools -- it is an aggregation and presentation layer that reads from existing data sources and optionally uses AI to summarize, prioritize, and categorize agent outputs in Fred Cary's voice.

**Critical distinction from demo pages:** The demo pages (`app/agents/page.tsx`, `app/agents/[agentId]/page.tsx`) conceptualize "Inbox Ops" as an email triage agent (triaging external emails, drafting responses). The ROADMAP and REQUIREMENTS define it differently: an in-app message hub aggregating *internal* agent notifications and outputs. The REQUIREMENTS document explicitly scopes out email OAuth integration: "In-app message hub first; real email integration in v2.1." This research follows the ROADMAP/REQUIREMENTS definition, not the demo page concept.

**Primary recommendation:** Build the inbox as a read-only aggregation layer with a new dashboard page, a lightweight `inbox_messages` table for derived metadata (read/unread state, AI-generated summaries, priority), and a post-completion hook that creates inbox messages when agent tasks finish. Generate Fred-voiced summaries at task completion time (not on page load) and store them in the database.

## Standard Stack

No new libraries are needed. This phase uses only existing project dependencies.

### Core (already in project)
| Library | Purpose | Why Relevant |
|---------|---------|--------------|
| Next.js 16 (App Router) | Page routing and API routes | New `/dashboard/inbox` page and `/api/inbox` API routes |
| Supabase | Database queries (agent_tasks table) | Read agent task outputs for message aggregation |
| Vercel AI SDK 6 | AI summarization | Summarize multi-tool agent outputs into concise Fred-voiced messages |
| Zod | Schema validation | Validate inbox message shapes and AI summary output |
| lucide-react | Icons | Inbox icon, category icons, priority indicators |
| framer-motion | Animations | Existing dashboard animation patterns |
| `@/lib/fred-brain` | Fred Cary knowledge base | Source for voice in AI-generated summaries |
| `@/lib/agents/fred-agent-voice.ts` | Concise voice constant | `FRED_AGENT_VOICE` for system prompts |

## Architecture Patterns

### Current State: Agent Task Data Flow

The existing system follows this flow:

```
User dispatches task via POST /api/agents
  -> createAgentTask() inserts row in agent_tasks (status: pending)
  -> startAgentExecution() creates XState actor (fire-and-forget)
    -> agentOrchestratorMachine routes to specialist agent
      -> runAgent() calls generateText() with tools
        -> Tools call generateStructuredReliable() for AI-powered structured output
      -> Result stored: updateAgentTask(taskId, { status: "complete", output: { text, toolCalls, tokenUsage } })
  -> User polls GET /api/agents/tasks to see results
```

**Key data already available in `agent_tasks.output` JSONB:**

When an agent task completes, the orchestrator's `storeResult` action stores this structure (from `app/api/agents/route.ts` lines 286-293):
```typescript
{
  text: string;          // Final agent response text
  toolCalls: Array<{     // Structured outputs from each tool
    toolName: string;    // e.g., "weeklyPriorities", "investorResearch", "channelAnalysis"
    args: Record<string, unknown>;
    result: unknown;     // The actual structured tool output
  }>;
  tokenUsage: { prompt: number; completion: number; total: number };
}
```

This means the Inbox Ops Agent has rich structured data to aggregate without needing to re-query the AI. Each tool call's `result` contains actionable data. For example:
- `weeklyPriorities` returns `{ priorities: [...], dropCandidates: [...], quickWins: [...] }`
- `investorResearch` returns `{ investors: [...], searchStrategy: string }`
- `channelAnalysis` returns `{ rankedChannels: [...], newChannelSuggestions: [...], budgetAllocation: [...] }`
- `pipelineAnalysis` returns `{ summary, priorityActions: [...], staleLeads: [...], pipelineHealth, recommendations: [...] }`

### Current Activity Aggregation Pattern

The dashboard overview page (`app/dashboard/page.tsx`) already aggregates recent activity from multiple tables via `GET /api/dashboard/stats`. The `getRecentActivity()` function in `app/api/dashboard/stats/route.ts` queries:
- `fred_episodic_memory` (conversations)
- `pitch_reviews` (pitch deck reviews)
- `strategy_documents` (strategy docs)

And merges them into a sorted activity feed with `{ action, item, time, score }`. The Inbox Ops Agent page should follow this same pattern but focused on `agent_tasks` with richer rendering.

### Existing Notification System (NOT for reuse as inbox)

The `lib/notifications/` system is designed for external notifications (Slack webhooks, PagerDuty, email via Resend). It has:
- `notification_configs` table (per-user channel configs with webhook URLs, API keys)
- `notification_logs` table (delivery audit log)
- Rate limiting, retry logic, multi-channel dispatch
- Alert types: `performance`, `errors`, `traffic`, `significance`, `winner`

This system is for sending alerts OUT to external channels. The Inbox Ops Agent is the opposite: it aggregates internal data and displays it IN-APP. The two systems are complementary but architecturally separate. The notification system could optionally be triggered when high-priority inbox items arrive, but that is a future enhancement.

### Three Specialist Agents (Data Sources for Inbox)

Each agent has its own directory under `lib/agents/` with `agent.ts`, `prompts.ts`, and `tools.ts`:

**1. Founder Ops** (`lib/agents/founder-ops/`)
- System prompt: `FOUNDER_OPS_SYSTEM_PROMPT` -- imports `FRED_BIO` and `FRED_COMMUNICATION_STYLE` from `fred-brain.ts`
- Tools: `draftEmail`, `createTask`, `scheduleMeeting`, `weeklyPriorities`
- Each tool uses `generateStructuredReliable()` with `FRED_AGENT_VOICE` in the system param
- maxSteps: 8

**2. Fundraising** (`lib/agents/fundraising/`)
- System prompt: `FUNDRAISING_SYSTEM_PROMPT` -- imports `FRED_BIO` from `fred-brain.ts`
- Tools: `investorResearch`, `outreachDraft`, `pipelineAnalysis`, `meetingPrep`
- Each tool uses `generateStructuredReliable()` with `FRED_AGENT_VOICE` in the system param
- maxSteps: 8

**3. Growth** (`lib/agents/growth/`)
- System prompt: `GROWTH_SYSTEM_PROMPT` -- imports `FRED_BIO` from `fred-brain.ts`
- Tools: `channelAnalysis`, `experimentDesign`, `funnelAnalysis`, `contentStrategy`
- Each tool uses `generateStructuredReliable()` with `FRED_AGENT_VOICE` in the system param
- maxSteps: 8

### Agent Execution & State Machine

The XState v5 orchestrator (`lib/agents/machine.ts`) manages task routing:
- States: `idle` -> `routing` -> `executing_{agent}` -> `complete` | `error` -> `failed`
- Guards check `context.currentTask.agentType` to route to the correct specialist
- Dynamic imports keep agent code tree-shakable
- The `complete` and `error` final states trigger DB updates via `actor.subscribe()` in `app/api/agents/route.ts`

The fire-and-forget pattern in `startAgentExecution()` is the natural hook point for inbox message creation. When the actor reaches `complete`, it already calls `updateAgentTask()` -- an inbox message creation call can be added alongside.

### Tier Gating

The inbox must be Studio-tier gated, matching the Virtual Team pattern:

**Nav config** (from `app/dashboard/layout.tsx`):
```typescript
{
  name: "Virtual Team",
  href: "/dashboard/agents",
  icon: <RocketIcon className="h-4 w-4" />,
  tier: 2,
  badge: "Studio",
},
```

**Page-level gating** (from `app/dashboard/agents/page.tsx`):
```typescript
<FeatureLock
  requiredTier={UserTier.STUDIO}
  currentTier={userTier}
  featureName="Virtual Team"
  description="Access your AI-powered team of specialist agents with a Studio tier subscription."
>
  {/* page content */}
</FeatureLock>
```

**API-level gating** (from `app/api/agents/route.ts`):
```typescript
const userTier = await getUserTier(userId);
if (userTier < UserTier.STUDIO) {
  return createTierErrorResponse({ allowed: false, userTier, requiredTier: UserTier.STUDIO, userId });
}
```

### Fred's Voice Integration

The `FRED_AGENT_VOICE` constant from `lib/agents/fred-agent-voice.ts` is a concise voice preamble:
```typescript
export const FRED_AGENT_VOICE = `You are Fred Cary, serial entrepreneur with ${FRED_BIO.yearsExperience}+ years of experience and ${FRED_BIO.companiesFounded}+ companies founded. ${FRED_COMMUNICATION_STYLE.voice.primary}. ${FRED_COMMUNICATION_STYLE.voice.tone}. Give specific, actionable advice based on real-world experience. No generic consulting speak.`;
```

All three agent prompt files (`founder-ops/prompts.ts`, `fundraising/prompts.ts`, `growth/prompts.ts`) already import from `fred-brain.ts`. All tool-level system prompts use `FRED_AGENT_VOICE`. The inbox should use the same constant for any AI-generated summaries.

### Database Schema: agent_tasks Table

From `lib/db/migrations/028_agent_tasks.sql`:
```sql
CREATE TABLE IF NOT EXISTS agent_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
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
```

Indexes: `user_id`, `status`, `agent_type`.

### Dashboard Navigation

Both `app/dashboard/layout.tsx` and `app/dashboard/dashboard-shell.tsx` have identical `navItems` arrays with tier-gated entries. Studio items currently include:
- Weekly Check-ins (`tier: 2`)
- Virtual Team (`tier: 2`)
- Boardy Integration (`tier: 2`)

`lib/constants.ts` has a separate `DASHBOARD_NAV` array with the same structure.

**WARNING:** `dashboard/layout.tsx` is listed in MEMORY.md file modification constraints: "Pre-commit hooks auto-revert changes to: dashboard/layout.tsx." The `dashboard-shell.tsx` file has the same navItems and may not be under the same constraint.

## Proposed Architecture

### Inbox as Read-Only Aggregation Layer

```
                    +--------------------------+
                    |  /dashboard/inbox (page) |
                    |  InboxPage component     |
                    +-----------+--------------+
                                |
                    GET /api/inbox/messages
                                |
                    +-----------v--------------+
                    |  Inbox API Route          |
                    |  - Queries inbox_messages |
                    |  - Applies filters        |
                    |  - Returns sorted list    |
                    +-----------+--------------+
                                |
                    +-----------v--------------+
                    |  inbox_messages table     |
                    |  (derived from            |
                    |   agent_tasks on          |
                    |   task completion)        |
                    +--------------------------+
                                ^
                    +-----------+--------------+
                    |  Post-completion hook     |
                    |  in startAgentExecution() |
                    |  -> createInboxMessage()  |
                    |  -> generateInboxSummary()|
                    +--------------------------+
```

The Inbox Agent is NOT a fourth specialist agent in the XState orchestrator. It does not need:
- Its own `agent.ts` / `prompts.ts` / `tools.ts` in `lib/agents/`
- A new guard/state in the orchestrator machine
- Its own `agentType` in the `AgentType` union

### Database: inbox_messages Table

```sql
CREATE TABLE IF NOT EXISTS inbox_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  agent_task_id UUID REFERENCES agent_tasks(id) ON DELETE CASCADE,

  -- Derived fields
  category TEXT NOT NULL CHECK (category IN ('ops', 'fundraising', 'growth')),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('urgent', 'normal', 'low')),
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  action_items JSONB DEFAULT '[]',

  -- State
  is_read BOOLEAN NOT NULL DEFAULT false,
  is_pinned BOOLEAN NOT NULL DEFAULT false,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  read_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_inbox_messages_user ON inbox_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_inbox_messages_user_unread ON inbox_messages(user_id) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_inbox_messages_priority ON inbox_messages(priority);
CREATE INDEX IF NOT EXISTS idx_inbox_messages_category ON inbox_messages(category);
CREATE INDEX IF NOT EXISTS idx_inbox_messages_created ON inbox_messages(created_at DESC);
```

**Why a separate table instead of extending agent_tasks:**
1. Avoids mixing operational task data with presentation/UI state (read/unread, pinned)
2. Stores AI-generated summaries without modifying the agent output pipeline
3. Can have its own indexes optimized for inbox queries
4. Does not require modifying the `AgentType` constraint or the `agent_tasks` CHECK constraints
5. CASCADE delete ensures cleanup when tasks are deleted

### Category Mapping

The category maps directly from `agent_tasks.agent_type`:

| agent_type | Inbox Category | Display Label | Icon (lucide) | Color |
|-----------|---------------|---------------|---------------|-------|
| `founder_ops` | `ops` | Operations | Bot | `text-[#ff6a1a]` / `bg-[#ff6a1a]/10` |
| `fundraising` | `fundraising` | Fundraising | DollarSign | `text-blue-500` / `bg-blue-500/10` |
| `growth` | `growth` | Growth | TrendingUp | `text-emerald-500` / `bg-emerald-500/10` |

This reuses the existing `AGENT_CONFIG` pattern from `components/agents/agent-card.tsx`.

### Priority Logic

Priority is derived from the agent task data, not manually set. Deterministic heuristics:

| Condition | Priority | Reasoning |
|-----------|----------|-----------|
| Task has `status: "failed"` | `urgent` | Failed tasks need immediate attention |
| Task `taskType` is `weekly_priorities` | `urgent` | Weekly priorities are time-sensitive |
| Task `taskType` is `meeting_prep` | `urgent` | Meeting prep implies an upcoming meeting |
| Task `taskType` is `pipeline_analysis` | `urgent` | Fundraising momentum requires prompt action |
| Task completed within last 2 hours | `normal` | Recent completions are relevant |
| Task completed over 24 hours ago and unread | `low` | Older unread items are less actionable |
| Default | `normal` | Base priority for all other tasks |

### Post-Completion Hook

When an agent task completes in `startAgentExecution()` (`app/api/agents/route.ts`), the `actor.subscribe()` handler fires on `state.matches("complete")`. This is the natural place to trigger inbox message creation:

```typescript
if (state.matches("complete")) {
  const latestResult = state.context.results[state.context.results.length - 1];

  // Existing: update task status
  await updateAgentTask(taskId, { status: "complete", output: ..., completedAt: new Date() });

  // NEW: create inbox message from completed task (fire-and-forget)
  createInboxMessageFromTask(userId, taskId, task, latestResult).catch((err) =>
    console.error(`[Agent API] Failed to create inbox message for task ${taskId}:`, err)
  );
}
```

The inbox message creation is fire-and-forget, consistent with the existing pattern. If it fails, the agent task still completes successfully.

## File-by-File Change Map

| File | Change Type | Complexity | Requirement |
|------|-------------|------------|-------------|
| `lib/db/migrations/036_inbox_messages.sql` (NEW) | DB migration for inbox_messages table | Low | STUDIO-01, STUDIO-02 |
| `lib/inbox/types.ts` (NEW) | Inbox message types and category/priority constants | Low | STUDIO-01 |
| `lib/inbox/priority.ts` (NEW) | Priority derivation logic | Low | STUDIO-03 |
| `lib/inbox/summarize.ts` (NEW) | AI summary generation with Fred's voice | Medium | STUDIO-04 |
| `lib/db/inbox.ts` (NEW) | Inbox DB operations (create, list, mark-read, count) | Medium | STUDIO-01, STUDIO-02 |
| `app/api/inbox/messages/route.ts` (NEW) | GET inbox messages API | Medium | STUDIO-01, STUDIO-02, STUDIO-03 |
| `app/api/inbox/[id]/route.ts` (NEW) | PATCH mark message read/pinned | Low | STUDIO-01 |
| `app/api/inbox/count/route.ts` (NEW) | GET unread count for badge | Low | STUDIO-01 |
| `app/dashboard/inbox/page.tsx` (NEW) | Inbox hub page | Medium | STUDIO-01 |
| `components/inbox/inbox-message-card.tsx` (NEW) | Message card component | Medium | STUDIO-02, STUDIO-03 |
| `components/inbox/inbox-filter-bar.tsx` (NEW) | Filter/category bar component | Low | STUDIO-03 |
| `app/dashboard/layout.tsx` | Add "Inbox" nav item | Low | STUDIO-01 |
| `app/dashboard/dashboard-shell.tsx` | Add "Inbox" nav item (duplicate sidebar) | Low | STUDIO-01 |
| `lib/constants.ts` | Add inbox to DASHBOARD_NAV and TIER_FEATURES | Low | STUDIO-01 |
| `app/api/agents/route.ts` | Add post-completion hook for inbox message creation | Low | STUDIO-02 |

**Files NOT modified:**
| File | Reason |
|------|--------|
| `lib/agents/types.ts` | No new agent type needed; inbox is an aggregation layer |
| `lib/agents/machine.ts` | No new orchestrator state; inbox reads existing data |
| `lib/agents/base-agent.ts` | No changes to agent execution |
| `lib/agents/founder-ops/*` | Existing agents unchanged |
| `lib/agents/fundraising/*` | Existing agents unchanged |
| `lib/agents/growth/*` | Existing agents unchanged |

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Agent task queries | Custom SQL queries | `getAgentTasks()` from `lib/db/agent-tasks.ts` | Already handles filters, pagination, status mapping |
| Tier gating (UI) | Custom auth overlay | `FeatureLock` component from `components/tier/feature-lock.tsx` | Consistent with all other Studio features |
| Tier gating (API) | Custom tier checks | `getUserTier()` + `createTierErrorResponse()` from `lib/api/tier-middleware.ts` | Pattern used by all agent APIs |
| Fred's voice | Inline system prompts | `FRED_AGENT_VOICE` from `lib/agents/fred-agent-voice.ts` | Single source of truth, already used by all 3 agents |
| Structured AI output | Raw `generateText()` | `generateStructuredReliable()` from `lib/ai/fred-client.ts` | Handles retries, schema validation, model fallback |
| Date formatting | Custom date logic | Copy `formatRelativeTime()` from existing dashboard components | Used in `agent-task-list.tsx`, `app/dashboard/page.tsx` |
| Status badges | Custom badge styles | `STATUS_CONFIG` pattern from `components/agents/agent-task-list.tsx` | Consistent visual language |
| Category icons | New icon mapping | `AGENT_CONFIG` from `components/agents/agent-card.tsx` | Already maps agent types to icons and colors |
| Auth middleware | Custom auth | `requireAuth()` from `lib/auth` | Standard across all protected routes |
| Supabase client | Direct `createClient()` | Lazy init proxy pattern from `lib/db/agent-tasks.ts` | Prevents build-time crashes |

## Common Pitfalls

### Pitfall 1: Building a Fourth Specialist Agent
**What goes wrong:** Treating the Inbox Ops Agent as a fourth agent type alongside founder_ops, fundraising, and growth. Adding `inbox_ops` to the `AgentType` union, creating `lib/agents/inbox-ops/agent.ts`, and wiring it into the XState orchestrator.
**Why it happens:** The name "Inbox Ops Agent" and the demo pages (`app/agents/page.tsx`) suggest it is another autonomous agent.
**How to avoid:** The ROADMAP requirement is an aggregation layer, not an autonomous agent. It reads from existing agent outputs, not from external data sources. It does not dispatch its own AI tool calls. The only AI it needs is optional summarization of existing outputs.
**Warning signs:** Creating `lib/agents/inbox-ops/` directory, modifying `AgentType` union, adding a new guard to the orchestrator machine.

### Pitfall 2: Conflating Demo Page Concept with ROADMAP Scope
**What goes wrong:** Building the demo page's "email triage, responses, inbox zero management" concept instead of the ROADMAP's "in-app message hub aggregating notifications from all agents."
**Why it happens:** The demo pages (`app/agents/page.tsx`, `app/agents/[agentId]/page.tsx`) have hardcoded mock data showing Inbox Ops as an email management agent with capabilities like "Email triage", "Response drafting", "Calendar management."
**How to avoid:** Follow REQUIREMENTS.md: STUDIO-01 through STUDIO-04. The scope is aggregating internal agent outputs, not managing external email. REQUIREMENTS.md explicitly defers email integration: "Email OAuth for Inbox Agent -- In-app message hub first; real email integration in v2.1."
**Warning signs:** Building email OAuth flows, email parsing, external inbox connections.

### Pitfall 3: Regenerating AI Summaries on Every Page Load
**What goes wrong:** Calling `generateStructuredReliable()` to create Fred-voiced summaries every time the inbox page loads, causing latency and token costs that scale with message count.
**Why it happens:** Not caching the generated summary in the database.
**How to avoid:** Generate the summary ONCE when the inbox message is created (in the post-completion hook) and store it in the `inbox_messages.summary` column. The page just reads the pre-generated summary.
**Warning signs:** AI calls in the GET /api/inbox/messages route handler, increasing page load times as message count grows.

### Pitfall 4: Modifying dashboard/layout.tsx Directly
**What goes wrong:** Pre-commit hooks auto-revert changes to `dashboard/layout.tsx`, losing the "Inbox" nav item addition.
**Why it happens:** File modification constraints documented in MEMORY.md: "Pre-commit hooks auto-revert changes to: dashboard/layout.tsx."
**How to avoid:** Either coordinate with team to temporarily disable the hook for this change, or use the documented workaround pattern (adapter routes or wrapper files). The `dashboard-shell.tsx` file has the same navItems array and may not be under the same constraint -- test this first.
**Warning signs:** Changes to layout.tsx disappearing after commit.

### Pitfall 5: Over-Engineering Priority Logic
**What goes wrong:** Building a complex ML-based priority system when simple heuristics suffice for MVP.
**Why it happens:** "Priority surfacing" (STUDIO-03) sounds like it needs sophisticated ranking.
**How to avoid:** Start with deterministic rules: failed tasks are urgent, time-sensitive task types are urgent, recent completions are normal, old items are low. The priority is calculated once at message creation time and stored. Enhance with AI priority scoring later if needed.
**Warning signs:** Building embeddings, vector similarity, or custom ranking models for priority.

### Pitfall 6: Breaking the Agent Tasks API Contract
**What goes wrong:** Modifying the agent task output structure to fit inbox needs, breaking the existing Virtual Team page that reads the same data.
**Why it happens:** The inbox wants differently shaped data than what `agent_tasks.output` provides.
**How to avoid:** The inbox layer transforms data for display WITHOUT modifying the source. The `inbox_messages` table stores the derived view. Never change the output schema written by the agent orchestrator.
**Warning signs:** Modifying `storeResult` action in the orchestrator machine, changing the shape of `AgentResult`.

### Pitfall 7: Missing Graceful Degradation for Missing Table
**What goes wrong:** The inbox page crashes if the `inbox_messages` migration has not been applied (common in dev environments).
**Why it happens:** Supabase throws errors when querying a nonexistent table.
**How to avoid:** Follow the pattern in `lib/db/agent-tasks.ts` which catches `PGRST205` / `42P01` errors and returns empty arrays gracefully. Apply the same pattern in `lib/db/inbox.ts`.
**Warning signs:** Uncaught Supabase errors on the inbox page.

## Code Examples

### Example 1: Inbox Message Types

Source: Derived from `lib/agents/types.ts` and `components/agents/agent-card.tsx`.

```typescript
// lib/inbox/types.ts

export type InboxCategory = 'ops' | 'fundraising' | 'growth';
export type InboxPriority = 'urgent' | 'normal' | 'low';

export interface InboxMessage {
  id: string;
  userId: string;
  agentTaskId: string;
  category: InboxCategory;
  priority: InboxPriority;
  title: string;
  summary: string;
  actionItems: string[];
  agentType: 'founder_ops' | 'fundraising' | 'growth';
  taskType: string;
  isRead: boolean;
  isPinned: boolean;
  createdAt: Date;
  readAt?: Date;
}

export const CATEGORY_FROM_AGENT: Record<string, InboxCategory> = {
  founder_ops: 'ops',
  fundraising: 'fundraising',
  growth: 'growth',
};

export const CATEGORY_CONFIG: Record<InboxCategory, {
  label: string;
  color: string;
  bgColor: string;
}> = {
  ops: { label: 'Operations', color: 'text-[#ff6a1a]', bgColor: 'bg-[#ff6a1a]/10' },
  fundraising: { label: 'Fundraising', color: 'text-blue-500', bgColor: 'bg-blue-500/10' },
  growth: { label: 'Growth', color: 'text-emerald-500', bgColor: 'bg-emerald-500/10' },
};

export const PRIORITY_CONFIG: Record<InboxPriority, {
  label: string;
  className: string;
  sortOrder: number;
}> = {
  urgent: {
    label: 'Urgent',
    className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    sortOrder: 0,
  },
  normal: {
    label: 'Normal',
    className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    sortOrder: 1,
  },
  low: {
    label: 'Low',
    className: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
    sortOrder: 2,
  },
};
```

### Example 2: Priority Logic

```typescript
// lib/inbox/priority.ts

import type { InboxPriority } from './types';
import type { AgentTask } from '@/lib/agents/types';

const URGENT_TASK_TYPES = new Set([
  'weekly_priorities',
  'meeting_prep',
  'pipeline_analysis',
]);

export function derivePriority(task: AgentTask): InboxPriority {
  // Failed tasks are always urgent
  if (task.status === 'failed') return 'urgent';

  // Time-sensitive task types
  if (URGENT_TASK_TYPES.has(task.taskType)) return 'urgent';

  // Recent completions (within 2 hours)
  if (task.completedAt) {
    const hoursAgo = (Date.now() - task.completedAt.getTime()) / (1000 * 60 * 60);
    if (hoursAgo <= 2) return 'normal';
    if (hoursAgo > 24) return 'low';
  }

  return 'normal';
}
```

### Example 3: AI Summary Generation with Fred's Voice

```typescript
// lib/inbox/summarize.ts

import { z } from 'zod';
import { generateStructuredReliable } from '@/lib/ai/fred-client';
import { FRED_AGENT_VOICE } from '@/lib/agents/fred-agent-voice';
import type { AgentTask } from '@/lib/agents/types';

const inboxSummarySchema = z.object({
  title: z.string().describe("Short, punchy title for the inbox message (under 60 chars)"),
  summary: z.string().describe("2-3 sentence summary in Fred Cary's direct, no-BS voice"),
  actionItems: z.array(z.string()).describe("Specific next steps the founder should take, max 3"),
});

export async function generateInboxSummary(task: AgentTask): Promise<{
  title: string;
  summary: string;
  actionItems: string[];
}> {
  const outputText = task.output
    ? typeof task.output === 'string'
      ? task.output
      : JSON.stringify(task.output, null, 2)
    : 'No output available';

  const prompt = `Summarize this completed agent task for a founder's inbox.

Agent: ${task.agentType.replace('_', ' ')}
Task Type: ${task.taskType}
Description: ${task.description}
Status: ${task.status}

Output:
${outputText.slice(0, 3000)}

Create a concise inbox message with:
1. A punchy title (under 60 chars)
2. A 2-3 sentence summary that leads with what matters most
3. Up to 3 specific, actionable next steps`;

  const result = await generateStructuredReliable(prompt, inboxSummarySchema, {
    system: `${FRED_AGENT_VOICE}\n\nYou are summarizing agent outputs for a founder's inbox. Be concise and direct. Lead with what matters most. Every word earns its place.`,
    temperature: 0.4,
  });

  return result.object;
}

/**
 * Fallback: template-based title for when AI summarization is skipped or fails.
 */
export function generateFallbackTitle(taskType: string, agentType: string): string {
  const TITLE_MAP: Record<string, string> = {
    email_draft: 'Email draft ready for review',
    task_creation: 'New task created',
    meeting_prep: 'Meeting prep complete',
    weekly_priorities: 'Your weekly priorities',
    investor_research: 'Investor research results',
    outreach_draft: 'Outreach email drafted',
    pipeline_analysis: 'Pipeline analysis ready',
    channel_analysis: 'Channel analysis complete',
    experiment_design: 'Experiment design ready',
    funnel_analysis: 'Funnel analysis complete',
    content_strategy: 'Content strategy drafted',
  };

  return TITLE_MAP[taskType] || `${agentType.replace('_', ' ')} task complete`;
}
```

### Example 4: Navigation Integration

```typescript
// Addition to navItems in dashboard layout (position before "Virtual Team")
{
  name: "Inbox",
  href: "/dashboard/inbox",
  icon: <EnvelopeClosedIcon className="h-4 w-4" />,
  tier: 2,
  badge: "Studio",
},
```

### Example 5: Post-Completion Hook

Source: Derived from `app/api/agents/route.ts` lines 282-298.

```typescript
// In startAgentExecution(), inside actor.subscribe() next handler:

if (state.matches("complete")) {
  const latestResult = state.context.results[state.context.results.length - 1];

  // Existing: update task status
  updateAgentTask(taskId, {
    status: "complete",
    output: latestResult ? { text: latestResult.output, toolCalls: latestResult.toolCalls, tokenUsage: latestResult.tokenUsage } : {},
    completedAt: new Date(),
  }).catch(/* existing error handling */);

  // NEW: create inbox message (fire-and-forget)
  if (latestResult) {
    createInboxMessageFromTask({
      userId,
      taskId,
      agentType: task.agentType,
      taskType: task.taskType,
      description: task.description,
      status: 'complete',
      output: latestResult,
      completedAt: new Date(),
    }).catch((err) =>
      console.error(`[Agent API] Failed to create inbox message for task ${taskId}:`, err)
    );
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| No centralized message view | Agent tasks visible only on Virtual Team page | Phase 04 | Users must go to Virtual Team to see results |
| No priority surfacing | Tasks listed chronologically by creation date | Phase 04 | Time-sensitive items get buried in the list |
| No cross-agent view | Each agent type shown separately via agent cards | Phase 04 | No unified view of all agent activity |
| No Fred-voiced summaries of outputs | Raw task output displayed as JSON/text | Phase 04 | Users must parse structured data themselves |
| External notification system only | Slack/PD/email for monitoring alerts | Monitoring phase | No in-app notification center for agent outputs |

## Open Questions

1. **Should failed agent tasks appear in the inbox?**
   - What we know: Failed tasks have `status: "failed"` and an `error` field. They surface as "urgent" priority in the proposed logic.
   - What's unclear: Should they appear as inbox messages, or only on the Virtual Team page?
   - Recommendation: Include failed tasks with a clear "Failed" visual indicator and a "Retry" action button linking to the Virtual Team page. Founders need to know when their agents fail.

2. **How deep should AI summarization go?**
   - What we know: STUDIO-04 requires Fred's voice. The agent outputs already contain structured data. Generating AI summaries adds ~2-5 seconds and ~500 tokens per message at creation time.
   - What's unclear: Should every completed task get an AI summary, or should we use template-based fallbacks for most tasks and AI only for complex multi-tool outputs?
   - Recommendation: Use template-based titles for all tasks. Use AI summarization only when the output contains multiple tool calls (indicating a complex result that benefits from synthesis). Store the `generateFallbackTitle()` result initially, with an option to "Summarize with Fred" button per message.

3. **Dashboard layout.tsx modification constraint**
   - What we know: MEMORY.md documents pre-commit hooks that auto-revert changes to `dashboard/layout.tsx`.
   - What's unclear: Whether the constraint applies to `dashboard-shell.tsx` as well (it has the same navItems array).
   - Recommendation: Test both files. If layout.tsx is locked, modify `dashboard-shell.tsx` and `lib/constants.ts` DASHBOARD_NAV only.

4. **Unread count badge in sidebar**
   - What we know: The sidebar nav supports `badge` text (e.g., "Studio", "Free"). Adding a dynamic unread count requires state management.
   - What's unclear: How to update the badge without prop drilling through the layout.
   - Recommendation: Defer dynamic badge count to a polish iteration. For MVP, the inbox page itself shows unread vs read state. The nav item can show a static "New" badge when unread count > 0, polled via `useEffect` in the layout.

5. **Real-time updates**
   - What we know: Agent tasks complete asynchronously (fire-and-forget). The Virtual Team page polls `GET /api/agents/tasks` but does NOT use Supabase realtime subscriptions (no realtime usage found anywhere in the codebase).
   - What's unclear: Whether the inbox should poll for new messages or use Supabase realtime.
   - Recommendation: Start with polling (30-second interval). Supabase realtime would be a new pattern in the codebase. Adding it for this feature alone introduces new infrastructure that should be a deliberate architectural decision.

6. **Relationship to existing dashboard "Recent Activity"**
   - What we know: The dashboard overview (`app/dashboard/page.tsx`) shows a "Recent Activity" feed from conversations, pitch reviews, and strategy docs. It does NOT currently include agent task completions.
   - What's unclear: Should agent task completions also appear in the dashboard Recent Activity?
   - Recommendation: Out of scope for Phase 19. Can be added later by extending `getRecentActivity()` in `app/api/dashboard/stats/route.ts` to also query `agent_tasks`.

## Sources

### Primary (HIGH confidence)
- `lib/agents/types.ts` -- Read in full (110 lines). Defines `AgentType`, `AgentStatus`, `AgentTask`, `AgentResult`, `BaseAgentConfig`, `OrchestratorContext`, `OrchestratorEvent`
- `lib/agents/base-agent.ts` -- Read in full (102 lines). `runAgent()` wraps `generateText()` with tools and `stopWhen`
- `lib/agents/machine.ts` -- Read in full (338 lines). XState v5 orchestrator with 3 specialist agent actors, routing guards, state transitions
- `lib/agents/fred-agent-voice.ts` -- Read in full (19 lines). `FRED_AGENT_VOICE` constant importing from `fred-brain.ts`
- `lib/agents/founder-ops/agent.ts` -- Read in full (39 lines). `runFounderOpsAgent()` with maxSteps: 8
- `lib/agents/founder-ops/prompts.ts` -- Read in full (26 lines). System prompt importing `FRED_BIO`, `FRED_COMMUNICATION_STYLE`
- `lib/agents/founder-ops/tools.ts` -- Read in full (264 lines). 4 tools with `FRED_AGENT_VOICE` in system prompts
- `lib/agents/fundraising/agent.ts` -- Read in full (41 lines). `runFundraisingAgent()` with maxSteps: 8
- `lib/agents/fundraising/prompts.ts` -- Read in full (27 lines). System prompt importing `FRED_BIO`
- `lib/agents/fundraising/tools.ts` -- Read in full (312 lines). 4 tools with `FRED_AGENT_VOICE` in system prompts
- `lib/agents/growth/agent.ts` -- Read in full (40 lines). `runGrowthAgent()` with maxSteps: 8
- `lib/agents/growth/prompts.ts` -- Read in full (27 lines). System prompt importing `FRED_BIO`
- `lib/agents/growth/tools.ts` -- Read in full (261 lines). 4 tools with `FRED_AGENT_VOICE` in system prompts
- `lib/db/agent-tasks.ts` -- Read in full (227 lines). CRUD operations for agent_tasks, lazy Supabase init, graceful table-missing handling
- `lib/db/migrations/028_agent_tasks.sql` -- Read in full (32 lines). Table schema with JSONB input/output, indexes
- `app/api/agents/route.ts` -- Read in full (365 lines). POST dispatch + GET list + fire-and-forget execution with XState actor, post-completion DB updates
- `app/api/agents/tasks/route.ts` -- Read in full (90 lines). GET endpoint for task history with Studio tier gating
- `app/dashboard/agents/page.tsx` -- Read in full (285 lines). Virtual Team page with agent cards, task history, FeatureLock
- `app/dashboard/layout.tsx` -- Read in full (334 lines). Sidebar navigation with tier gating, navItems array
- `app/dashboard/dashboard-shell.tsx` -- Read in full (319 lines). Duplicate sidebar with identical navItems
- `app/dashboard/page.tsx` -- Read in full (404 lines). Dashboard overview with stats, quick actions, recent activity feed
- `app/api/dashboard/stats/route.ts` -- Read in full (206 lines). Multi-table activity aggregation pattern
- `components/agents/agent-card.tsx` -- Read in full (150 lines). AGENT_CONFIG with display names, icons, colors per agent type
- `components/agents/agent-task-list.tsx` -- Read in full (257 lines). Task list with expand/collapse, STATUS_CONFIG for badges
- `components/agents/dispatch-task-modal.tsx` -- Read in full (385 lines). TASK_TYPE_SUGGESTIONS mapping per agent
- `components/agents/AgentCard.tsx` -- Read in full (212 lines). Demo-style agent card with colorMap
- `components/agents/AgentChat.tsx` -- Read in full (277 lines). Demo chat interface (mock responses, not connected)
- `components/agents/AgentAvatar.tsx` -- Read in full (222 lines). Animated avatar component
- `components/tier/feature-lock.tsx` -- Read in full (228 lines). FeatureLock, InlineFeatureLock, ComingSoonBadge, UpgradePromptCard
- `lib/constants.ts` -- Read in full (171 lines). UserTier enum, TIER_FEATURES, DASHBOARD_NAV, canAccessFeature helper
- `lib/hooks/use-fred-chat.ts` -- Read in full (404 lines). SSE streaming hook pattern for FRED chat
- `lib/notifications/types.ts` -- Read in full (145 lines). External notification types (Slack, PagerDuty, email)
- `lib/notifications/index.ts` -- Read in full (653 lines). Unified notification dispatcher with rate limiting
- `lib/notifications/service.ts` -- Read in full (538 lines). NotificationService class with retry logic
- `lib/db/migrations/012_notification_configs.sql` -- Read in full (132 lines). notification_configs and notification_logs table schema
- `lib/fred-brain.ts` -- Read (60 lines header). FRED_IDENTITY, FRED_BIO exports
- `app/agents/page.tsx` -- Read (80 lines). Demo agents list including "Inbox Ops" as email triage (NOT the ROADMAP scope)
- `app/agents/[agentId]/page.tsx` -- Read (lines 100-180). Demo "inbox-ops" config with email capabilities (NOT the ROADMAP scope)
- `.planning/ROADMAP.md` -- Searched for Phase 19 definition, requirements, success criteria
- `.planning/REQUIREMENTS.md` -- Searched for STUDIO-01 through STUDIO-04 definitions and explicit scope exclusions
- `.planning/PROJECT.md` -- Searched for Inbox Ops Agent scope definition and deferral notes
- Full grep across codebase for "Inbox Ops", "inbox", "message hub", "notification", "FeatureLock", "realtime", and related patterns

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all existing, no new dependencies needed
- Architecture: HIGH -- agent data flow fully traced from dispatch to DB storage to UI rendering
- Database schema: HIGH -- `agent_tasks` table schema, JSONB output structure, and notification tables all read directly
- Tier gating: HIGH -- FeatureLock pattern, tier middleware, nav config all documented from source
- Fred's voice: HIGH -- `FRED_AGENT_VOICE` and `fred-brain.ts` patterns traced across all 3 agents and 12 tools
- Priority logic: MEDIUM -- heuristic-based, will need validation against real agent output data
- Layout constraint: HIGH -- documented in MEMORY.md, verified in codebase exploration
- Demo vs ROADMAP scope: HIGH -- both definitions read directly, clear distinction documented

**Research date:** 2026-02-07
**Valid until:** Indefinite (no external dependencies; only dependent on project source code which was read directly)
