# Phase 19: Inbox Ops Agent - Research

**Researched:** 2026-02-07
**Domain:** Message hub page, agent output aggregation, priority surfacing, Fred's voice in inbox
**Confidence:** HIGH

## Phase Overview

Phase 19 creates a centralized in-app message hub for Studio tier founders. This hub aggregates outputs from all three virtual agents (Founder Ops, Fundraising, Growth), surfaces priority items, and presents everything in Fred Cary's voice. It serves as the "inbox" where founders check what their virtual team has produced.

### Requirements

| ID | Description | Tier |
|----|-------------|------|
| STUDIO-01 | In-app message hub aggregating notifications from all agents | Studio |
| STUDIO-02 | Agent task completions, recommendations, and action items displayed as messages | Studio |
| STUDIO-03 | Messages categorized and priority-surfaced (urgent items first) | Studio |
| STUDIO-04 | Inbox Agent responses use Fred Cary's voice consistently | Studio |

### Success Criteria

1. In-app message hub page exists aggregating notifications from all agents
2. Agent task completions, recommendations, and action items are displayed as messages
3. Messages are categorized and priority-surfaced (urgent items first)
4. Inbox Agent responses use Fred Cary's voice consistently with other agents

## What Exists in the Codebase

### Agent Infrastructure

The virtual agent system is fully built with three specialists:

**Agent types (lib/agents/types.ts):**
```typescript
export type AgentType = 'founder_ops' | 'fundraising' | 'growth';
export type AgentStatus = 'pending' | 'running' | 'complete' | 'failed' | 'cancelled';
```

**Agent task interface:**
```typescript
export interface AgentTask {
  id: string;
  userId: string;
  agentType: AgentType;
  taskType: string;
  description: string;
  status: AgentStatus;
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
  error?: string;
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

**Agent result interface:**
```typescript
export interface AgentResult {
  agentId: AgentType;
  taskId: string;
  output: string;
  toolCalls: Array<{ toolName: string; args: Record<string, unknown>; result: unknown }>;
  status: 'complete' | 'failed';
  error?: string;
  tokenUsage?: { prompt: number; completion: number; total: number };
}
```

### Agent Tasks Database (lib/db/agent-tasks.ts)

Full CRUD operations for the `agent_tasks` table:
- `createAgentTask(params)` -- creates a new task
- Additional operations for updating status, fetching by user, etc.
- Uses lazy-initialized Supabase client pattern

The `agent_tasks` table stores all task data including `output` as JSONB. This is the primary data source for the inbox.

### Base Agent Runner (lib/agents/base-agent.ts)

The `runAgent(config)` function executes agent tasks using `generateText()` from Vercel AI SDK with the agent's system prompt and tools. Results include the output text and all tool calls made.

### Agent Orchestrator (lib/agents/machine.ts)

An XState state machine that manages agent dispatch. The `OrchestratorContext` tracks:
- Current task being executed
- Results array from completed tasks
- Active agents
- Errors

### Fred Agent Voice (lib/agents/fred-agent-voice.ts)

The `FRED_AGENT_VOICE` constant provides a concise Fred Cary voice preamble for all agent-level prompts. This is already used by all three agent prompt files.

### Three Specialist Agents

Each agent has its own directory under `lib/agents/`:

1. **Founder Ops** (`lib/agents/founder-ops/`)
   - Tools: draftEmail, createTask, scheduleMeeting, weeklyPriorities
   - Prompt: `FOUNDER_OPS_SYSTEM_PROMPT`

2. **Fundraising** (`lib/agents/fundraising/`)
   - Tools: investorResearch, outreachDraft, pipelineAnalysis, meetingPrep
   - Prompt: `FUNDRAISING_SYSTEM_PROMPT`

3. **Growth** (`lib/agents/growth/`)
   - Tools: channelAnalysis, experimentDesign, funnelAnalysis, contentStrategy
   - Prompt: `GROWTH_SYSTEM_PROMPT`

### Agent API Routes (app/api/agents/)

- `app/api/agents/route.ts` -- Main agent dispatch endpoint
- `app/api/agents/[agentId]/` -- Agent-specific routes
- `app/api/agents/tasks/` -- Task management

### Notification Service (lib/notifications/)

A comprehensive notification system with:
- Multi-channel support (Slack, email, PagerDuty)
- Alert levels and types
- Batch notifications
- Retry logic

This is primarily for system-level alerting (errors, monitoring) rather than user-facing inbox messages, but the infrastructure patterns are reusable.

### Dashboard Agent Page (app/dashboard/agents/)

The existing agents dashboard shows the virtual team overview. The inbox would be a separate page or a tab alongside this.

## What Needs to Be Built

### 1. Inbox Hub Page (app/dashboard/inbox/page.tsx)

A new dashboard page serving as the centralized message hub:

**Layout:**
- Header: "Your Inbox" with unread count badge
- Filter bar: All | Founder Ops | Fundraising | Growth | Priority
- Message list: Chronologically sorted with priority items pinned to top
- Each message shows: agent icon, title, preview text, timestamp, priority badge, read/unread state

**Message card structure:**
- Agent avatar/icon (color-coded by agent type)
- Title (derived from task type or tool output)
- Preview (first 150 chars of the output)
- Timestamp (relative: "2 hours ago", "Yesterday")
- Priority badge (urgent, normal, low)
- Status indicator (new, read, action-needed, archived)
- Click to expand full message

**Empty state:** "Your virtual team hasn't produced any outputs yet. Dispatch a task from the Agents page to get started."

### 2. Inbox Message Component (components/inbox/inbox-message.tsx)

A reusable message card component:

```typescript
interface InboxMessage {
  id: string;
  agentType: AgentType;
  taskType: string;
  title: string;
  content: string;         // Full agent output
  preview: string;         // First 150 chars
  priority: 'urgent' | 'normal' | 'low';
  status: 'new' | 'read' | 'action_needed' | 'archived';
  toolCalls: string[];     // Names of tools used
  createdAt: Date;
  readAt?: Date;
}
```

### 3. Aggregation & Prioritization Logic (lib/agents/inbox/aggregator.ts)

A module that transforms raw `AgentTask` records into `InboxMessage` objects:

**Aggregation:**
- Fetch all completed agent tasks for the user
- Transform task output into human-readable messages
- Group related tasks (e.g., multiple fundraising tasks in one session)

**Prioritization rules:**
- **Urgent:** Tasks with time-sensitive outputs (meeting prep for meetings within 48h, investor follow-ups overdue)
- **Action-needed:** Tasks that produced recommendations requiring founder action (draft emails to review, priorities to approve)
- **Normal:** Completed analyses and research (investor research results, channel analysis)
- **Low:** Informational outputs (funnel analysis, content strategy suggestions)

**Voice enforcement:**
- Each message title and preview should be rewritten in Fred's voice
- Use `FRED_AGENT_VOICE` preamble for any AI-generated summaries
- Title patterns: "Fred's take on your fundraising pipeline" instead of "Pipeline Analysis Complete"

### 4. Inbox API Endpoints

**GET /api/inbox** -- Fetch inbox messages for authenticated user
- Query params: agentType, priority, status, limit, offset
- Returns: `{ messages: InboxMessage[], unread: number, total: number }`

**PATCH /api/inbox/[id]** -- Update message status
- Body: `{ status: 'read' | 'archived' }`
- Returns: updated message

**POST /api/inbox/mark-all-read** -- Mark all messages as read

**GET /api/inbox/count** -- Quick unread count for badge display
- Returns: `{ unread: number }`

### 5. Inbox Database Enhancements

Option A: Add inbox-specific columns to `agent_tasks`:
```sql
ALTER TABLE agent_tasks
  ADD COLUMN inbox_title TEXT,
  ADD COLUMN inbox_priority TEXT DEFAULT 'normal',
  ADD COLUMN inbox_status TEXT DEFAULT 'new',
  ADD COLUMN read_at TIMESTAMPTZ;
```

Option B: Create a separate `inbox_messages` view or table that aggregates from `agent_tasks`. This is cleaner but adds complexity.

Recommendation: Option A is simpler and avoids data synchronization issues. The `agent_tasks` table already contains all the data; we just need metadata for inbox display.

### 6. Dashboard Nav Integration

Add "Inbox" to the dashboard navigation in `lib/constants.ts`:
```typescript
{ id: "inbox", label: "Inbox", icon: "EnvelopeClosed", href: "/dashboard/inbox", tier: UserTier.STUDIO },
```

Include an unread count badge on the nav item.

### 7. Real-Time Updates (Optional)

For live inbox updates when agents complete tasks:
- Use Supabase Realtime subscriptions on `agent_tasks` table changes
- Or poll `/api/inbox/count` every 30 seconds for the badge

## Integration Points

| Component | Integrates With | How |
|-----------|----------------|-----|
| Inbox page | agent_tasks table | Reads completed tasks |
| Aggregator | Agent types/results | Transforms task data into messages |
| Aggregator | FRED_AGENT_VOICE | Applies Fred's voice to titles/previews |
| Inbox API | requireAuth + requireTier | Studio tier gating |
| Dashboard nav | constants.ts DASHBOARD_NAV | New nav entry with badge |
| Real-time | Supabase Realtime or polling | Live unread count |
| Agent dispatch | Inbox aggregator | Post-completion: generates inbox message |

## Suggested Plan Structure

### Plan 19-01: Inbox Hub + Message Aggregation

**Scope:** Full inbox feature in one plan

1. Add inbox metadata columns to `agent_tasks` (migration)
2. Create aggregation/prioritization module (`lib/agents/inbox/aggregator.ts`)
3. Create inbox API routes (GET /api/inbox, PATCH /api/inbox/[id], POST /api/inbox/mark-all-read, GET /api/inbox/count)
4. Create inbox message component (`components/inbox/inbox-message.tsx`)
5. Create inbox hub page (`app/dashboard/inbox/page.tsx`)
6. Add "Inbox" to dashboard navigation with unread badge
7. Update agent execution flow to set inbox_title and inbox_priority on task completion
8. Add FeatureLock gating for Studio tier
9. Tests for aggregator and API routes

## Key Files to Reference

| File | Purpose | Lines of Interest |
|------|---------|-------------------|
| `lib/agents/types.ts` | AgentType, AgentTask, AgentResult, AgentStatus | Full file |
| `lib/db/agent-tasks.ts` | CRUD operations for agent_tasks table | Full file |
| `lib/agents/base-agent.ts` | Agent runner (execution flow) | Full file |
| `lib/agents/machine.ts` | Orchestrator state machine | Full file |
| `lib/agents/fred-agent-voice.ts` | FRED_AGENT_VOICE constant | Full file |
| `lib/agents/founder-ops/tools.ts` | 4 Founder Ops tools | Full file |
| `lib/agents/fundraising/tools.ts` | 4 Fundraising tools | Full file |
| `lib/agents/growth/tools.ts` | 4 Growth tools | Full file |
| `app/api/agents/route.ts` | Agent dispatch API | Full file |
| `lib/notifications/service.ts` | Notification patterns (channel routing, retry) | Full file |
| `lib/constants.ts` | DASHBOARD_NAV, UserTier.STUDIO | 135-151 |

## Open Questions

1. **Separate table vs. extending agent_tasks:** Should inbox messages be in their own table or added as columns to agent_tasks? Recommendation: Extend agent_tasks with inbox metadata columns. Keeps data together, avoids sync issues.

2. **AI summarization for inbox titles:** Should each task result be summarized by AI into a short title, or should we use rule-based title generation from task type? Recommendation: Rule-based mapping first (e.g., `investorResearch` -> "Investor Research Results"). Add AI summarization as optional enhancement later.

3. **Notification on task completion:** Should the inbox also trigger push/email notifications when agents complete tasks? Recommendation: Not in this phase. The inbox is pull-based (user checks it). Push notifications can be added in a future phase using the existing notification service.

4. **Archiving and retention:** How long should inbox messages be retained? Recommendation: Keep all messages indefinitely (they are just views on agent_tasks). Add an "archived" status for the user to hide messages they have addressed.

## Sources

### Primary (HIGH confidence)
- `lib/agents/types.ts` -- Agent type system (direct reading)
- `lib/db/agent-tasks.ts` -- Agent tasks CRUD (direct reading)
- `lib/agents/fred-agent-voice.ts` -- Voice preamble (direct reading)
- `lib/agents/fundraising/tools.ts` -- Tool structure and output patterns (direct reading)
- `app/api/agents/route.ts` -- Agent dispatch flow (directory listing)
- `lib/notifications/service.ts` -- Notification patterns (direct reading)

### Secondary (MEDIUM confidence)
- `.planning/ROADMAP.md` -- Phase scope and success criteria
- `lib/constants.ts` -- Dashboard navigation structure

**Research date:** 2026-02-07
**Valid until:** Next agent infrastructure refactor
