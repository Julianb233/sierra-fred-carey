---
phase: 74
plan: 02
subsystem: feedback-intelligence
tags: [linear-auto-triage, admin-dashboard, insights, api-routes]
requires: [74-01]
provides: [linear-triage, top-issues-dashboard, insights-api]
affects: [75, 76]
tech-stack:
  added: []
  patterns: [graphql-linear-api, admin-auth-guard, severity-to-priority-mapping]
key-files:
  preexisting:
    - lib/feedback/linear-auto-triage.ts
    - app/api/admin/feedback/insights/route.ts
    - app/api/admin/feedback/insights/[insightId]/linear/route.ts
    - app/admin/feedback/page.tsx
decisions:
  - id: "74-02-D1"
    title: "Severity-to-priority mapping: critical=1, high=2, medium=3, low=4"
    rationale: "Direct mapping to Linear's 4-level priority system"
  - id: "74-02-D2"
    title: "SeverityBadge as inline helper component"
    rationale: "Keeps component co-located with page, consistent with existing RatingCell/TierBadge pattern"
metrics:
  duration: "~3m"
  completed: "2026-03-08"
---

# Phase 74 Plan 02: Linear Auto-Triage & Admin Insights Dashboard Summary

## Status: COMPLETE

Linear auto-triage system and "Top Issues This Week" admin dashboard section for feedback intelligence.

## Tasks Completed

| Task | Name | Status | Key Changes |
|------|------|--------|-------------|
| 1 | Linear auto-triage library | Pre-existing | createLinearIssueFromInsight, severityToPriority, updateInsightWithLinearIssue |
| 2 | API endpoints for insights and Linear | Pre-existing | GET /api/admin/feedback/insights, POST /api/admin/feedback/insights/[id]/linear |
| 3 | Top Issues This Week dashboard section | Pre-existing | Full UI with table, severity badges, Linear creation buttons |

## What Was Built

### lib/feedback/linear-auto-triage.ts
- `severityToPriority()`: Maps feedback severity to Linear priority (critical=1, high=2, medium=3, low=4)
- `createLinearIssueFromInsight()`: Creates Linear issue via GraphQL with formatted description, signal summary, admin dashboard link
- `updateInsightWithLinearIssue()`: Updates insight row with linear_issue_id and actioned status

### app/api/admin/feedback/insights/route.ts
- GET endpoint returning top insights from `getTopInsightsThisWeek`
- Admin auth guard via `requireAdminRequest`
- Configurable limit parameter (max 50)

### app/api/admin/feedback/insights/[insightId]/linear/route.ts
- POST endpoint to create Linear issue from insight
- Duplicate check (409 if Linear issue already exists)
- Fetches insight, creates Linear issue, updates insight with identifier

### app/admin/feedback/page.tsx
- TopInsight type, state variables, fetchInsights callback
- handleCreateLinear handler with optimistic UI update
- "Top Issues This Week" Card section between stats and filters
- Table with columns: Issue, Severity, Signals, Category, Status, Linear, Actions
- SeverityBadge helper component with color-coded severity display
- "Create Linear Issue" button with loading state

## Requirements Coverage

- **REQ-I3:** "Top Issues This Week" with drill-down in admin dashboard
- **REQ-I4:** Linear auto-triage with correct labels, severity, and links

## Verification

- All files exist and contain expected exports
- UI section properly placed between stats cards and filters
- SeverityBadge component defined at bottom of page file
