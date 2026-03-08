# Phase 74 Research: Intelligence & Pattern Detection

**Date:** 2026-03-08
**Phase:** 74 — Intelligence & Pattern Detection
**Goal:** AI analyzes feedback patterns automatically. Auto-create Linear issues from clusters. Stop the noise.

---

## Existing Infrastructure (from Phases 71-73)

### Database Schema (feedback_tables migration)
- `feedback_signals` — per-message thumbs/sentiment signals, indexed on user_id, session_id, created_at, signal_type
- `feedback_sessions` — session aggregates with sentiment_avg, sentiment_trend, flagged boolean
- `feedback_insights` — insight_type (pattern/cluster/trend/anomaly), severity, signal_ids UUID[], linear_issue_id, status workflow (new/reviewed/actioned/resolved/communicated)
- All tables have RLS; feedback_insights is service-role-only

### Existing DB Helpers (lib/db/feedback.ts, lib/db/feedback-admin.ts)
- `insertFeedbackInsight()` — already exists, inserts to feedback_insights
- `getInsightsByStatus()` — already exists, queries by status
- `getFeedbackStats()` — aggregate stats for dashboard
- `queryFeedbackSignalsAdmin()` — filterable signal list with pagination
- `createServiceClient()` — service-role Supabase client (bypasses RLS)

### Trigger.dev Already Configured
- `trigger.config.ts` exists with project ID `proj_uwuxpherghusguizvbvo`
- `trigger/` directory with `sahara-whatsapp-monitor.ts` as reference pattern
- Uses `schedules.task()` with cron expression, `@trigger.dev/sdk/v3`
- Pattern: dynamic imports for Supabase client inside task functions
- Linear API integration pattern already established (GraphQL, `Authorization: apiKey`)

### Vercel Cron Already Configured
- `vercel.json` has 5 existing cron jobs
- Can add a cron-triggered API route as alternative to Trigger.dev

### Admin Dashboard (app/admin/feedback/page.tsx)
- Stats cards, signals table, sessions table, category distribution
- Filter bar with date, channel, rating, category, tier, user
- CSV export button
- Links to session drill-down at `/admin/feedback/[sessionId]`

### FeedbackInsight Type (lib/feedback/types.ts)
```ts
interface FeedbackInsight {
  id: string
  insight_type: 'pattern' | 'cluster' | 'trend' | 'anomaly'
  title: string
  description: string | null
  category: string | null
  severity: 'low' | 'medium' | 'high' | 'critical'
  signal_count: number
  signal_ids: string[]
  status: 'new' | 'reviewed' | 'actioned' | 'resolved' | 'communicated'
  linear_issue_id: string | null
  actioned_at: string | null
  resolved_at: string | null
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}
```

---

## Requirements (REQ-I1 through REQ-I4)

1. **REQ-I1:** Trigger.dev daily job — cluster feedback by theme, identify recurring patterns, rank by frequency x severity, write to `feedback_insights`
2. **REQ-I2:** Deduplication — semantic matching + 4-hour aggregation windows before Linear issue creation; severity escalation not duplication
3. **REQ-I3:** "Top Issues This Week" section in admin dashboard with drill-down
4. **REQ-I4:** Linear auto-triage — create issues from clusters with links; link to existing when duplicate

---

## Architecture Decisions

### Trigger.dev vs Vercel Cron for Daily Job
- Trigger.dev already configured and used for WhatsApp monitor
- Trigger.dev allows longer execution (10 min vs Vercel cron 60s max)
- AI clustering may need 2-5 minutes for large feedback volumes
- **Decision: Use Trigger.dev** for the daily clustering job (consistent with existing pattern)

### AI Clustering Strategy
- Use Anthropic API (already used in WhatsApp monitor) for theme clustering
- Batch all unprocessed feedback signals (signal_type = thumbs_down, or thumbs_up with comments)
- LLM generates clusters with titles, descriptions, severity, and linked signal IDs
- Write clusters as `feedback_insights` with insight_type = 'cluster'

### Deduplication Strategy
- Before creating a Linear issue, query existing `feedback_insights` where `linear_issue_id IS NOT NULL`
- Use 4-hour window: skip if a similar insight was created in the last 4 hours
- Semantic matching: compare new cluster title against existing insight titles using simple keyword overlap + LLM confirmation
- If duplicate found: escalate severity on existing insight, don't create new Linear issue

### Linear Integration
- Reuse pattern from `sahara-whatsapp-monitor.ts` (GraphQL API, same team/project)
- Add labels: "Feedback", severity-based priority (critical=P1, high=P2, medium=P3, low=P4)
- Include source signal count and link back to admin dashboard

---

## Plan Structure (2 plans)

### Plan 01 (Wave 1): Trigger.dev Clustering Job + Deduplication
- Create `trigger/feedback-intelligence.ts` — daily scheduled task
- Create `lib/feedback/clustering.ts` — AI clustering logic
- Create `lib/feedback/dedup.ts` — deduplication logic
- Add DB helpers for insight queries (getRecentInsights, updateInsightSeverity)
- Wire up Linear issue auto-creation with dedup check

### Plan 02 (Wave 1, parallel): Admin Dashboard "Top Issues" Section
- Add "Top Issues This Week" card to admin feedback page
- Create API route `app/api/admin/feedback/insights/route.ts`
- Show insight list with drill-down to source signals
- Add insight status management (triage workflow)

---

## RESEARCH COMPLETE
