---
phase: 04
plan: 01
subsystem: agent-architecture
tags: [xstate, ai-sdk, agents, database, orchestrator, studio-tier]
dependencies:
  requires: [01-02, 01-04, 01-06]
  provides: [agent-types, agent-task-schema, orchestrator-machine, base-agent-runner, agent-task-crud]
  affects: [04-02, 04-03, 04-04, 04-05, 04-06, 04-07]
tech-stack:
  added: []
  patterns: [orchestrator-worker, dynamic-import-agents, stopWhen-stepCountIs]
key-files:
  created:
    - lib/db/migrations/028_agent_tasks.sql
    - lib/db/migrations/029_sms_checkins.sql
    - lib/db/migrations/030_boardy_matches.sql
    - lib/db/migrations/031_user_sms_preferences.sql
    - lib/agents/types.ts
    - lib/agents/base-agent.ts
    - lib/agents/machine.ts
    - lib/db/agent-tasks.ts
  modified: []
decisions:
  - id: use-stopWhen-not-maxSteps
    summary: "AI SDK 6 uses stopWhen(stepCountIs(N)) instead of deprecated maxSteps"
  - id: use-supabase-direct-client
    summary: "agent-tasks.ts uses direct Supabase createClient with service role key matching documents.ts pattern"
  - id: dynamic-imports-for-agents
    summary: "Orchestrator uses dynamic import() for specialist agents to avoid circular deps"
  - id: totalUsage-for-token-tracking
    summary: "AI SDK 6 uses result.totalUsage (not result.usage) for aggregate step usage"
metrics:
  duration: ~5 minutes
  completed: 2026-02-06
---

# Phase 04 Plan 01: Virtual Agent Architecture Foundation Summary

JWT-free agent orchestrator foundation with XState v5 machine routing tasks to 3 specialist agents via guards, base agent wrapping AI SDK generateText with stopWhen(stepCountIs(N)), 4 SQL migrations covering agent tasks/SMS/Boardy/preferences, and Supabase CRUD operations.

## What Was Done

### Task 1: Database Migrations (4 SQL files)
Created the complete database schema for all Phase 04 Studio tier features:

- **028_agent_tasks.sql**: Core task queue table with `agent_type` CHECK constraint (founder_ops|fundraising|growth), `status` lifecycle (pending|running|complete|failed|cancelled), JSONB input/output, and indexes on user_id, status, agent_type
- **029_sms_checkins.sql**: SMS check-in tracking with direction (outbound|inbound), Twilio message_sid, parent-child self-reference for linking replies, accountability_score JSONB, ISO week/year tracking
- **030_boardy_matches.sql**: Boardy AI match storage with match_type (investor|advisor|mentor|partner), match_score (0-1 REAL), status workflow (suggested|connected|intro_sent|meeting_scheduled|declined), boardy_reference_id
- **031_user_sms_preferences.sql**: User SMS settings with user_id as PK, phone_number, verification flag, checkin schedule (day/hour/timezone)

### Task 2: Agent Type System + Base Agent + CRUD
Created the shared type system and execution infrastructure:

- **lib/agents/types.ts**: Exports `AgentType`, `AgentStatus`, `AgentTask`, `AgentResult`, `BaseAgentConfig`, `OrchestratorContext`, `OrchestratorEvent`
- **lib/agents/base-agent.ts**: `runAgent(config, task)` wraps AI SDK `generateText` with `stopWhen(stepCountIs(N))` for multi-step tool loops. Extracts tool calls from `step.toolCalls` using `input` property (AI SDK 6 naming). Tracks token usage via `result.totalUsage`. Error handling returns failed AgentResult instead of throwing.
- **lib/db/agent-tasks.ts**: Full CRUD using Supabase client with service role key -- `createAgentTask`, `getAgentTask`, `getAgentTasks` (with agentType/status/limit/offset filters), `getActiveAgentTasks` (pending+running), `updateAgentTask` (with camelCase-to-snake_case mapping and auto-updated_at)

### Task 3: XState v5 Orchestrator State Machine
Created the agent routing machine following lib/fred/machine.ts pattern:

- **8 states**: idle, routing, executing_founder_ops, executing_fundraising, executing_growth, complete, error, failed
- **3 guards**: isFounderOpsTask, isFundraisingTask, isGrowthTask -- check `context.currentTask.agentType`
- **3 actors**: Dynamic imports for specialist agents (resolved at runtime when Plans 04-02/03/04 are implemented)
- **Actions**: logTransition, storeTask, storeResult, storeError, addActiveAgent, removeActiveAgent, clearTask
- **Error recovery**: error state accepts DISPATCH to retry with new task, or CANCEL to transition to failed (final)

## Decisions Made

| # | Decision | Reasoning |
|---|----------|-----------|
| 1 | Use `stopWhen(stepCountIs(N))` instead of `maxSteps` | AI SDK 6 replaced `maxSteps` with `stopWhen` + `stepCountIs()` helper |
| 2 | Use `createServiceClient` for DB operations | Matches fred-memory.ts pattern, more consistent than direct createClient |
| 3 | Dynamic `import()` for specialist agents | Avoids circular dependencies; agents don't exist yet (Plans 02-04) |
| 4 | Use `result.totalUsage` for token tracking | AI SDK 6 provides `totalUsage` for aggregate across all steps |
| 5 | Tool call property is `input` not `args` | AI SDK 6 TypedToolCall uses `input` property for tool arguments |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] AI SDK 6 API changes**

- **Found during:** Task 2
- **Issue:** Plan referenced `maxSteps` parameter and `tc.args` property which don't exist in installed AI SDK 6.x
- **Fix:** Used `stopWhen: stepCountIs(N)` instead of `maxSteps`, and `tc.input` instead of `tc.args`
- **Files modified:** lib/agents/base-agent.ts
- **Commit:** d5d7c1f

## Commit History

| Commit | Type | Description |
|--------|------|-------------|
| 3c4ee6a | feat | Database migrations for Phase 04 Studio tier tables |
| d5d7c1f | feat | Agent type system, base agent runner, and task CRUD |
| 0e97ba9 | feat | XState v5 agent orchestrator state machine |

## Next Phase Readiness

All downstream plans (04-02 through 04-07) can now proceed:

- **Plans 04-02, 04-03, 04-04** (Wave 2): Import from `lib/agents/types.ts`, use `runAgent()` from `base-agent.ts`, export functions matching the dynamic imports in `machine.ts`
- **Plan 04-05** (Wave 3): SMS check-ins -- schema ready in 029/031 migrations
- **Plan 04-06** (Wave 4): Boardy integration -- schema ready in 030 migration
- **Plan 04-07** (Wave 4): Stripe upgrade -- agent_tasks table ready for tier gating

No blockers identified.
