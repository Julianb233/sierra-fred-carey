---
phase: 04
plan: 04
subsystem: growth-agent-dashboard
tags: [growth-agent, ai-tools, dashboard-ui, dispatch-modal, task-list, studio-tier]
dependencies:
  requires: [04-01]
  provides: [growth-agent, agent-dashboard, dispatch-modal, tasks-api]
  affects: [04-05, 04-06, 04-07]
tech-stack:
  added: []
  patterns: [generateStructuredReliable-for-tools, agent-card-pattern, dispatch-modal-pattern, feature-lock-gating]
key-files:
  created:
    - lib/agents/growth/prompts.ts
    - lib/agents/growth/tools.ts
    - app/api/agents/tasks/route.ts
    - components/agents/agent-card.tsx
    - components/agents/agent-task-list.tsx
    - components/agents/dispatch-task-modal.tsx
  modified:
    - lib/agents/growth/agent.ts
    - app/dashboard/agents/page.tsx
    - lib/ai/fred-client.ts
    - lib/ai/index.ts
    - app/api/agents/route.ts
decisions:
  - id: match-founder-ops-tool-pattern
    summary: "Growth tools follow exact same pattern as founder-ops tools: AI SDK tool() with generateStructuredReliable for structured output"
  - id: separate-tasks-api-endpoint
    summary: "Created /api/agents/tasks dedicated endpoint even though /api/agents GET exists, for cleaner separation of concerns"
  - id: tier-context-for-dashboard
    summary: "Dashboard uses useUserTier hook from tier-context instead of hardcoded tier state for proper runtime gating"
  - id: lowercase-component-naming
    summary: "New components use kebab-case filenames (agent-card.tsx) alongside existing PascalCase (AgentCard.tsx) for plan-specified paths"
metrics:
  duration: ~9 minutes
  completed: 2026-02-06
---

# Phase 04 Plan 04: Growth Agent + Dashboard UI Summary

Growth Agent with 4 domain tools (channelAnalysis, experimentDesign, funnelAnalysis, contentStrategy) using generateStructuredReliable, plus agent dashboard page with 3 agent cards, dispatch modal for browser-based task submission, and expandable task history list with status badges.

## What Was Done

### Task 1: Growth Agent Implementation (3 files)

**lib/agents/growth/prompts.ts:**
- Exported `GROWTH_SYSTEM_PROMPT` encoding Fred Cary's growth philosophy
- Key principles: measurement-driven growth, retention before acquisition, statistical significance for A/B tests, unscalable-first for first 100 customers

**lib/agents/growth/tools.ts:**
- 4 domain tools using AI SDK `tool()` with Zod schemas:
  1. `channelAnalysis` - Ranks current channels by ROI, suggests new channels, recommends budget allocation. Input: currentChannels, stage, monthlyBudget, targetCustomerProfile.
  2. `experimentDesign` - Creates rigorous A/B test design with control/test groups, sample sizes, duration, success criteria. Input: hypothesis, metric, currentBaseline, channel, budget.
  3. `funnelAnalysis` - Identifies biggest conversion dropoff, likely causes, and optimizations by effort level. Input: stages (name/visitors/conversions), product, pricingModel.
  4. `contentStrategy` - Creates content pillars, 4-week calendar, and quick wins. Input: targetAudience, product, currentContent, goals.
- All tools use `generateStructuredReliable` for AI output with provider fallback

**lib/agents/growth/agent.ts:**
- Replaced stub with full implementation
- `runGrowthAgent(task)` calls `runAgent()` with growth config (8 max steps)

### Task 2: Dashboard UI, Tasks API, Dispatch Modal (6 files)

**app/api/agents/tasks/route.ts:**
- GET handler returning up to 50 recent tasks for authenticated user
- Supports `agentType`, `status`, and `limit` query parameters
- Uses `requireAuth()` for authentication

**components/agents/agent-card.tsx:**
- `AgentCard` component with `agentType`, `name`, `description`, `taskCount`, `lastActive`, `onDispatch` props
- Agent-specific icons: Bot (founder_ops), DollarSign (fundraising), TrendingUp (growth)
- Agent-specific accent colors: orange, blue, emerald
- "New Task" button triggers `onDispatch` callback
- Exported `AGENT_CONFIG` for reuse in dashboard page

**components/agents/agent-task-list.tsx:**
- `AgentTaskList` with expandable task rows
- Columns: expand indicator, agent type badge, task type (monospace), description (truncated), status badge, created date
- Status colors: pending=yellow, running=blue, complete=green, failed=red, cancelled=gray
- Expanded view shows full description, output (JSON), error, and metadata
- Empty state: "No agent tasks yet. Dispatch a task to get started."
- Relative time formatting (just now, Xm ago, Xh ago, Xd ago)

**components/agents/dispatch-task-modal.tsx:**
- `DispatchTaskModal` with overlay, Escape/click-outside to close
- Form: agent type dropdown, task type input with per-agent suggestions, description textarea (10-5000 chars)
- POSTs to `/api/agents` on submit
- States: idle, submitting (spinner), success (green), error (red), tier-error (amber with upgrade link)
- Auto-closes after 800ms success animation
- Calls `onTaskDispatched(taskId)` on success for parent refetch

**app/dashboard/agents/page.tsx:**
- Replaced static preview page with functional data-driven page
- Fetches tasks from `/api/agents/tasks` on mount
- 3 `AgentCard` components in responsive grid (lg:3, md:2, sm:1)
- Per-agent stats computed from task list (count, last active)
- Each card's "New Task" opens dispatch modal with agent pre-selected
- `AgentTaskList` below cards shows full task history
- `FeatureLock` wrapper for Studio tier gating
- `useUserTier` hook from tier-context for runtime tier check
- Loading skeletons for cards and task list
- Refetch on successful dispatch

## Decisions Made

| # | Decision | Reasoning |
|---|----------|-----------|
| 1 | Match founder-ops tool pattern | Consistency across all 3 specialist agents; same tool() + generateStructuredReliable pattern |
| 2 | Separate /api/agents/tasks endpoint | Cleaner separation from the main /api/agents route (POST dispatch + GET listing); tasks endpoint focused on recent results |
| 3 | useUserTier hook for dashboard | Runtime tier resolution via context instead of hardcoded state; proper integration with existing tier system |
| 4 | Task type suggestions per agent | Pre-populated clickable suggestions improve UX and guide users to valid task types |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Existing dashboard page was static preview**

- **Found during:** Task 2
- **Issue:** `app/dashboard/agents/page.tsx` already existed as a static "Coming Soon" preview page with mock data (4 hardcoded agents, no real API integration)
- **Fix:** Replaced entirely with functional data-driven page that fetches real tasks from API
- **Files modified:** app/dashboard/agents/page.tsx
- **Commit:** 66694a9

**2. [Rule 3 - Blocking] Existing agent API already had GET/POST handlers**

- **Found during:** Task 2
- **Issue:** `app/api/agents/route.ts` already implemented both GET and POST from Plan 04-02. Plan 04-04 specified a separate `/api/agents/tasks/route.ts` which overlaps.
- **Fix:** Created the separate tasks endpoint as specified, providing a focused alternative. Both endpoints work; the tasks endpoint defaults to 50 results and is used by the dashboard.
- **Files created:** app/api/agents/tasks/route.ts
- **Commit:** 66694a9

**3. [Rule 3 - Blocking] Missing generateStructuredReliable function in fred-client.ts**

- **Found during:** Task 1 (re-execution)
- **Issue:** All agent tools import `generateStructuredReliable` from `@/lib/ai/fred-client`, but the function was never committed to the file. Only `generateStructured` (without fallback/retry) existed.
- **Fix:** Added `generateStructuredReliable` function with circuit breaker + fallback chain support, plus the necessary imports from fallback-chain.ts and retry.ts. Also exported from lib/ai/index.ts.
- **Files modified:** lib/ai/fred-client.ts, lib/ai/index.ts
- **Commit:** 172f303

**4. [Rule 1 - Bug] Zod v4 z.record() requires two arguments**

- **Found during:** Task 2 (re-execution)
- **Issue:** `app/api/agents/route.ts` used `z.record(z.unknown())` which fails in Zod v4 (requires key type as first arg)
- **Fix:** Changed to `z.record(z.string(), z.unknown())`
- **Files modified:** app/api/agents/route.ts
- **Commit:** 4d15704

## Commit History

| Commit | Type | Description |
|--------|------|-------------|
| ca880ca | feat | Growth Agent with 4 domain tools (prompts, tools, agent) |
| 66694a9 | feat | Agent dashboard UI, tasks API, dispatch modal, task list |
| 172f303 | feat | generateStructuredReliable in fred-client.ts with fallback |
| 4d15704 | fix | Zod v4 z.record fix and export generateStructuredReliable |

## Next Phase Readiness

With all 3 specialist agents complete and the dashboard UI functional:

- **Plan 04-05** (Wave 3): SMS check-ins -- can proceed independently (uses agent task infrastructure for accountability tracking)
- **Plan 04-06** (Wave 4): Boardy integration -- dashboard is ready to show additional agent types if needed
- **Plan 04-07** (Wave 4): Studio Stripe integration -- agent dashboard exists for post-upgrade landing

The complete Virtual Team is now:
1. Founder Ops Agent (Plan 04-02): emails, tasks, meetings, priorities
2. Fundraising Agent (Plan 04-03): investor research, outreach, pitch strategy, pipeline
3. Growth Agent (Plan 04-04): channels, experiments, funnels, content strategy

All three are registered with the XState orchestrator and dispatchable from the dashboard.
