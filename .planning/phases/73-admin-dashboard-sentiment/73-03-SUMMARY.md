---
phase: 73-admin-dashboard-sentiment
plan: 03
subsystem: admin-feedback
tags: [admin, feedback, drill-down, sentiment-arc, triage, session-detail]
dependency-graph:
  requires: ["73-01", "73-02"]
  provides: ["session-drill-down", "triage-workflow", "session-detail-api", "triage-api"]
  affects: ["74-*"]
tech-stack:
  added: []
  patterns: ["dynamic-route-param", "triage-state-machine", "sentiment-visualization"]
key-files:
  created:
    - app/admin/feedback/[sessionId]/page.tsx
    - app/api/admin/feedback/sessions/[sessionId]/route.ts
    - app/api/admin/feedback/triage/route.ts
  modified:
    - lib/db/feedback-admin.ts
    - app/admin/feedback/page.tsx
decisions:
  - id: "73-03-D1"
    decision: "Simple div-based sentiment arc instead of charting library"
    rationale: "No external dependency needed; colored dots on horizontal timeline is sufficient for admin use"
  - id: "73-03-D2"
    decision: "5-second window for matching signals to messages"
    rationale: "Feedback signals and messages may not have exact timestamp match; 5s window catches fire-and-forget async writes"
metrics:
  duration: "~6m"
  completed: "2026-03-06"
---

# Phase 73 Plan 03: Session Drill-Down + Triage Workflow Summary

Per-session drill-down page with full conversation replay, sentiment arc visualization, inline feedback annotations, and 5-step triage workflow.

## Tasks Completed

| Task | Name | Commit | Key Changes |
|------|------|--------|-------------|
| 1 | Session detail API + triage API | 9c27986 | sessions/[sessionId]/route.ts, triage/route.ts, feedback-admin.ts |
| 2 | Session drill-down page + dashboard links | 9c27986 | [sessionId]/page.tsx, feedback/page.tsx sessions tab |

## What Was Built

### app/admin/feedback/[sessionId]/page.tsx (607 lines)
- Header with session ID, channel badge, timestamp, message count, flagged badge
- Sentiment arc: horizontal timeline with colored dots (green/gray/orange/red), connecting lines, degradation highlights, legend
- Conversation replay: chat-like layout with user (right) and FRED (left), inline feedback annotations, coaching discomfort blue badges with tooltip
- Triage panel: visual status progression (new → reviewed → actioned → resolved → communicated), next-status buttons with PATCH calls
- Signals summary table: time, type, rating, category, sentiment score, confidence, comment

### app/api/admin/feedback/sessions/[sessionId]/route.ts (46 lines)
- GET handler with requireAdminRequest auth
- Returns { session, signals, messages } from getSessionDetail()
- 401/404/500 error handling

### app/api/admin/feedback/triage/route.ts (62 lines)
- PATCH handler with requireAdminRequest auth
- Body: { id, table, status } with validation
- Calls updateTriageStatus() and returns updated row

### lib/db/feedback-admin.ts additions
- `getSessionDetail(sessionId)`: queries feedback_sessions, feedback_signals, fred_episodic_memory
- `updateTriageStatus(id, table, newStatus)`: validates against INSIGHT_STATUSES, sets actioned_at/resolved_at timestamps
- `getSessionsWithFeedback(limit)`: sessions with signal counts for sessions tab

### app/admin/feedback/page.tsx updates
- Signals tab: clickable rows linking to /admin/feedback/{sessionId}
- New Sessions tab: session list with signal counts, trend badges, flagged status (red left border)

## Requirements Coverage

- REQ-V2: Triage workflow with 5 statuses (New → Reviewed → Actioned → Resolved → Communicated)
- REQ-V5: Per-session drill-down with full conversation, feedback annotations, and sentiment arc

## Verification

- TypeScript: 0 new type errors
- Build: npm run build passes
- All API routes protected by requireAdminRequest
- Triage workflow validates status transitions
