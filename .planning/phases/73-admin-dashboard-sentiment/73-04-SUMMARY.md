---
phase: 73-admin-dashboard-sentiment
plan: 04
subsystem: admin-feedback
tags: [admin, feedback, csv-export, email-digest, cron, resend]
dependency-graph:
  requires: ["73-02"]
  provides: ["csv-export", "feedback-digest-email", "digest-cron"]
  affects: []
tech-stack:
  added: []
  patterns: ["csv-streaming", "cron-secret-hmac", "react-email-template"]
key-files:
  created:
    - app/api/admin/feedback/export/route.ts
    - app/api/cron/feedback-digest/route.ts
    - lib/email/templates/feedback-digest.tsx
  modified:
    - lib/db/feedback-admin.ts
    - app/admin/feedback/page.tsx
decisions:
  - id: "73-04-D1"
    decision: "Manual CSV builder instead of csv library"
    rationale: "No external dependency needed; simple escapeCsvValue function handles commas, quotes, newlines"
  - id: "73-04-D2"
    decision: "EmailLayout wrapper from existing templates"
    rationale: "Reuses shared email layout for consistent branding"
metrics:
  duration: "~5m"
  completed: "2026-03-06"
  note: "getDigestSummary and Export CSV button were accidentally removed by 73-03 commit; restored in fixup commit"
---

# Phase 73 Plan 04: CSV Export + Weekly Feedback Digest Summary

CSV export endpoint for filtered feedback data and weekly feedback digest email via Resend cron.

## Tasks Completed

| Task | Name | Commit | Key Changes |
|------|------|--------|-------------|
| 1 | CSV export endpoint + button | 292e9fc | export/route.ts, feedback/page.tsx button |
| 2 | Weekly digest email + cron | 292e9fc | feedback-digest/route.ts, feedback-digest.tsx, feedback-admin.ts |
| 3 | Restore regressions from 73-03 | (pending) | feedback-admin.ts getDigestSummary, feedback/page.tsx Export CSV button |

## What Was Built

### app/api/admin/feedback/export/route.ts (106 lines)
- GET handler with requireAdminRequest auth
- Accepts same 7 filter params as list endpoint
- limit=10000 for full export (not paginated)
- Manual CSV escaping (commas, quotes, newlines)
- Returns text/csv with Content-Disposition attachment header
- Filename: feedback-export-YYYY-MM-DD.csv

### app/api/cron/feedback-digest/route.ts (127 lines)
- GET handler with timing-safe CRON_SECRET auth (HMAC comparison)
- Calls getDigestSummary(7) for past week's data
- Sends email via sendEmail() with FeedbackDigest React Email template
- Admin email from ADMIN_EMAIL or ADMIN_FEEDBACK_EMAIL env var
- Graceful skip if no admin email configured
- Vercel cron schedule: "0 10 * * 1" (Monday 10am UTC)

### lib/email/templates/feedback-digest.tsx (281 lines)
- FeedbackDigest React Email component with StatCard helper
- Summary section: total signals, pos/neg ratio (color-coded), flagged sessions (red warning)
- Top categories: numbered list with coaching_discomfort "(working as designed)" note
- Daily volume: bar chart with Sahara Orange (#ff6a1a) proportional bars
- CTA button: "View Full Dashboard" linking to /admin/feedback
- Footer: "This is an automated weekly digest from Sahara."

### lib/db/feedback-admin.ts additions
- `getDigestSummary(daysBack)`: computes period, calls getFeedbackStats, queries flagged sessions, extracts top 5 categories
- Returns { stats, flaggedSessions, topCategories, period }

### app/admin/feedback/page.tsx updates
- "Export CSV" outline button in filter action bar
- Constructs URL with current filter params and opens in new tab

## Deviations from Plan

### Regression fix required
The 73-03 commit (9c27986) accidentally removed `getDigestSummary()` from feedback-admin.ts and the Export CSV button from the dashboard page. Both were restored.

## Requirements Coverage

- REQ-V6: CSV export with all relevant columns and current filters applied
- REQ-V7: Weekly feedback digest email via Resend with volume, trends, flagged sessions

## Verification

- TypeScript: 0 new type errors in modified files
- CSV export endpoint returns proper Content-Type and Content-Disposition headers
- Cron endpoint follows existing HMAC auth pattern
- Email template compiles with React Email components
- Export CSV button visible on admin feedback page
