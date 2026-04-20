---
phase: 93-pdf-template-generation
plan: 02
subsystem: api
tags: [report-generation, trigger-dev, next-api, aggregator, synthesizer]

# Dependency graph
requires:
  - phase: 91-report-storage-stripe
    provides: founder_reports table, createReport, getNextVersion, updateReportStatus
  - phase: 92-report-aggregation-synthesis
    provides: aggregateReportData, synthesizeReport
  - phase: 93-01
    provides: generateFounderReportPdf Trigger task, buildReportDocument PDF template
provides:
  - generateReport(userId) orchestrator function
  - POST /api/reports/generate endpoint returning 202 with reportId
  - Step snapshot capture for version diffing
affects: [94 (email delivery needs reportId), 95 (portal download polls status)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Orchestrator pattern: aggregate -> synthesize -> DB record -> trigger fire-and-forget"
    - "202 Accepted response for async background processing"

key-files:
  created:
    - lib/report/generate-report.ts
    - app/api/reports/generate/route.ts
  modified: []

key-decisions:
  - "Step snapshot built from aggregated sections (stepId -> answer), not from raw oases_progress rows"
  - "Trigger failure after DB creation marks report as failed and re-throws"
  - "API route accepts no request body — userId derived from auth, everything else from pipeline"

patterns-established:
  - "Report orchestrator pattern: single entry point combining aggregation, synthesis, DB, and async task dispatch"
  - "202 Accepted + reportId polling pattern for long-running generation"

# Metrics
duration: 5min
completed: 2026-04-08
---

# Phase 93 Plan 02: API Route & Report Generation Orchestrator Summary

**POST /api/reports/generate endpoint wiring full pipeline: aggregate answers -> AI synthesis -> DB record -> Trigger.dev PDF dispatch, returning 202 with reportId for polling**

## Performance

- **Duration:** 5 min
- **Started:** 2026-04-08T21:14:18Z
- **Completed:** 2026-04-08T21:19:00Z
- **Tasks:** 2
- **Files created:** 2

## Accomplishments
- Report generation orchestrator function connecting all pipeline stages (aggregator, synthesizer, DB CRUD, Trigger.dev task)
- Step snapshot captured at generation time as `Record<string, string>` for future version diffing
- POST /api/reports/generate endpoint with auth, 202 response, and error handling
- Trigger failure after DB record creation properly marks report as failed before re-throwing

## Task Commits

Each task was committed atomically:

1. **Task 1: Report generation orchestrator** - `4e3aaae` (feat)
2. **Task 2: API route** - `2937e1b` (feat)

## Files Created/Modified
- `lib/report/generate-report.ts` - generateReport(userId) orchestrator: aggregate -> synthesize -> createReport -> trigger PDF task
- `app/api/reports/generate/route.ts` - POST endpoint: requireAuth() -> generateReport() -> 202 JSON response

## Decisions Made
- Step snapshot built by iterating `aggregated.sections[].steps[]` using stepId as key and answer text as value — directly from the aggregated data structure rather than re-querying raw progress rows
- Trigger failure handling: best-effort status update to "failed" with try/catch wrapping the updateReportStatus call to avoid masking the original error
- API route uses no request body parsing — simplifies the contract since userId comes from auth and all other data is derived from the pipeline

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required. (BLOB_READ_WRITE_TOKEN requirement documented in 93-01 still applies.)

## Next Phase Readiness
- Full end-to-end pipeline wired: POST /api/reports/generate -> aggregateReportData -> synthesizeReport -> createReport -> generateFounderReportPdf.trigger()
- Client can POST to generate a report and receive reportId for polling
- Status polling endpoint (GET) planned for Phase 94
- Email delivery with report link planned for Phase 94

---
*Phase: 93-pdf-template-generation*
*Completed: 2026-04-08*
