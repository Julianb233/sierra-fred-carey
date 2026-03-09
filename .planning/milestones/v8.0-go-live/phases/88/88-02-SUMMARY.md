---
phase: 88-event-launch-kit
plan: 02
subsystem: admin-analytics
tags: [event, analytics, admin, funnel, conversion]
requires: [88-01]
provides: [event-conversion-dashboard, funnel-metrics-api]
affects: []
tech-stack:
  added: []
  patterns: [profiles-based-funnel-metrics, admin-protected-api]
key-files:
  created:
    - app/api/admin/event-analytics/route.ts
    - app/admin/event-analytics/page.tsx
  modified:
    - lib/event/analytics.ts
decisions:
  - key: funnel-data-source
    value: "Profiles table (event_source, journey_welcomed, reality_lens_complete) + fred_memories for chat engagement"
  - key: qr-scan-tracking
    value: "QR scans tracked via PostHog client-side; admin page notes 'View in PostHog' for that metric"
metrics:
  duration: "~5 minutes"
  completed: "2026-03-09"
---

# Phase 88 Plan 02: Event Analytics Dashboard Summary

Admin conversion funnel dashboard for tracking event signup performance from QR scan to first FRED interaction.

## What Was Done

### Task 1: Create event analytics API endpoint
- Added `ONBOARDING_COMPLETE` and `FIRST_FRED_INTERACTION` constants to event analytics
- Created `GET /api/admin/event-analytics` with admin auth protection
- Queries profiles table by `event_source` for funnel metrics
- Returns funnel counts (signups, onboarding, reality lens, first chat) and recent signups list
- Supports `?slug=` query param for filtering by event

### Task 2: Create event analytics admin page
- Built `/admin/event-analytics` page with conversion funnel visualization
- 4-stage horizontal bar funnel with Sahara orange bars
- Summary stat cards showing conversion rates
- Recent signups table with completion status columns
- Event slug selector dropdown for filtering

## Decisions Made

1. **Profiles-based funnel**: Uses existing profile columns (event_source, journey_welcomed, reality_lens_complete) rather than PostHog event queries for simplicity and speed.
2. **fred_memories for chat engagement**: Counts distinct users in fred_memories table as proxy for "first FRED chat."
3. **QR scans deferred to PostHog**: Client-side `event_landing_view` events tracked in PostHog; admin page shows "View in PostHog" note.

## Deviations from Plan

None - plan executed exactly as written.

## Commits

| Hash | Message |
|------|---------|
| 972cba6 | feat(event): add event analytics API endpoint and funnel constants |
| 6b4a4b9 | feat(event): add event analytics admin dashboard with conversion funnel |
