---
phase: 04
plan: 02
subsystem: founder-ops-agent
tags: [ai-sdk, agents, tools, zod, api-routes, studio-tier, tier-gating, xstate]
dependencies:
  requires: [04-01]
  provides: [founder-ops-agent, agent-api-routes, agent-dispatch, agent-task-status]
  affects: [04-03, 04-04, 04-07]
tech-stack:
  added: []
  patterns: [fire-and-forget-execution, orchestrator-subscriber-db-sync, tool-based-agent]
key-files:
  created:
    - lib/agents/founder-ops/prompts.ts
    - lib/agents/founder-ops/tools.ts
    - app/api/agents/route.ts
    - app/api/agents/[agentId]/route.ts
  modified:
    - lib/agents/founder-ops/agent.ts
decisions:
  - id: fire-and-forget-dispatch
    summary: "Agent execution runs in background via XState actor subscriber; POST returns 201 immediately with taskId"
  - id: rate-limit-active-tasks
    summary: "Max 5 concurrent active tasks per user to prevent runaway agent usage"
  - id: ownership-404-not-403
    summary: "Return 404 (not 403) when task belongs to another user to avoid leaking task existence"
  - id: orchestrator-subscriber-for-db-updates
    summary: "XState actor.subscribe() watches state transitions to sync task status to database"
metrics:
  duration: ~4 minutes
  completed: 2026-02-06
---

# Phase 04 Plan 02: Founder Ops Agent + Agent API Routes Summary

Founder Ops specialist agent with 4 AI-powered domain tools (draftEmail, createTask, scheduleMeeting, weeklyPriorities) using generateStructuredReliable, plus shared API routes for agent task dispatch with Studio tier gating, rate limiting, and fire-and-forget XState orchestrator execution.

## What Was Done

### Task 1: Founder Ops Agent Implementation (3 files)

Created the first specialist agent in the virtual team:

- **lib/agents/founder-ops/prompts.ts**: System prompt channeling Fred Cary's operational expertise. Covers email drafting, task management, meeting prep, and weekly priorities. Principles: actionable, specific, ruthless prioritization, concise outputs.

- **lib/agents/founder-ops/tools.ts**: Four domain tools using AI SDK `tool()` with Zod schemas:
  1. **draftEmail** - Takes recipient, subject, context, tone (formal/casual/urgent). Uses `generateStructuredReliable()` to generate structured `{ subject, body, suggestedFollowUp }`.
  2. **createTask** - Takes title, priority (low/med/high/critical), dueDate, category, rationale. Returns structured task object with `crypto.randomUUID()` ID. No DB write in tool (orchestrator handles persistence).
  3. **scheduleMeeting** - Takes attendees, topic, duration, keyQuestions. Uses `generateStructuredReliable()` to generate `{ agenda, preparationItems, expectedOutcomes }`.
  4. **weeklyPriorities** - Takes currentGoals, blockers, recentWins. Uses `generateStructuredReliable()` to generate `{ priorities[{title,why,metric}], dropCandidates, quickWins }`.

- **lib/agents/founder-ops/agent.ts**: Replaced stub with full implementation. Calls `runAgent()` from base-agent with `{ agentType: 'founder_ops', systemPrompt, tools: founderOpsTools, maxSteps: 8 }`.

### Task 2: Agent API Routes (2 files)

Created shared API routes used by all agent types:

- **POST /api/agents** (app/api/agents/route.ts):
  1. `requireAuth()` for user authentication
  2. Zod validation: agentType (enum), taskType (string), description (1-5000 chars), input (optional record)
  3. Studio tier gating via `getUserTier()` + `createTierErrorResponse()` (403 if not Studio)
  4. Rate limiting: `getActiveAgentTasks(userId)` rejects if >= 5 active tasks (429)
  5. Creates task in DB via `createAgentTask()`
  6. Fire-and-forget execution: `startAgentExecution()` spawns XState orchestrator actor, subscribes to state transitions, updates DB status (running -> complete/failed). Returns 201 immediately.

- **GET /api/agents** (app/api/agents/route.ts):
  1. `requireAuth()` for user authentication
  2. Query params: agentType, status, limit (default 20, max 100), offset (default 0)
  3. Validates enum values for agentType and status
  4. Returns paginated task list via `getAgentTasks()`

- **GET /api/agents/:taskId** (app/api/agents/[agentId]/route.ts):
  1. `requireAuth()` for user authentication
  2. Extracts taskId from path params (Next.js dynamic route)
  3. Fetches task via `getAgentTask(taskId)`
  4. Ownership verification: returns 404 (not 403) if task.userId !== userId
  5. Returns individual task details

## Decisions Made

| # | Decision | Reasoning |
|---|----------|-----------|
| 1 | Fire-and-forget dispatch pattern | Agents may take 30+ seconds; returning 201 immediately prevents request timeouts. XState actor subscriber handles DB updates asynchronously. |
| 2 | Max 5 concurrent active tasks | Prevents runaway agent usage. Uses 429 status code for rate limiting. |
| 3 | Return 404 instead of 403 for unauthorized task access | Security best practice: don't reveal whether a task ID exists to non-owners. |
| 4 | XState actor subscriber for DB sync | `actor.subscribe()` watches for 'complete', 'error', 'failed' states and updates the agent_tasks table accordingly. Clean separation of concerns. |

## Deviations from Plan

None - plan executed exactly as written.

## Commit History

| Commit | Type | Description |
|--------|------|-------------|
| bf8e608 | feat | Founder Ops Agent with 4 domain tools, system prompt, and agent runner |
| d61e63c | feat | Agent API routes with tier gating, rate limiting, and async dispatch |

## Next Phase Readiness

- **Plans 04-03, 04-04**: Can follow the exact same pattern -- create prompts.ts, tools.ts, update agent.ts stub. The API routes are shared and already support all three agent types.
- **Plan 04-07**: Studio Stripe integration can reference the tier gating pattern used here.
- The API contract is stable: `POST /api/agents` -> `{ taskId, status: 'pending' }`, `GET /api/agents` -> task list, `GET /api/agents/:id` -> task detail.

No blockers identified.
