---
phase: "67-content-library-frontend"
plan: "02"
subsystem: "content-library"
tags: ["mux", "video-player", "tier-gating", "progress-tracking"]

dependency-graph:
  requires:
    - "67-01 (course detail page with lesson links)"
    - "66-content-library-backend (playback-token API, progress API)"
  provides:
    - "Video player page at /dashboard/content/[courseId]/lessons/[lessonId]"
    - "@mux/mux-player-react installed"
  affects:
    - "67-03 (chat integration links to lesson pages)"

tech-stack:
  added:
    - "@mux/mux-player-react@^3.11.4"
  patterns:
    - "Fire-and-forget progress saves at percentage milestones"
    - "Parallel Promise.all for course nav + playback token fetches"
    - "useRef for milestone deduplication across renders"

key-files:
  created:
    - "app/dashboard/content/[courseId]/lessons/[lessonId]/page.tsx"
  modified:
    - "package.json"
    - "package-lock.json"

decisions:
  - "onTimeUpdate handler cast as any — MuxPlayer's GenericEventListener<Event> is not assignable to React's standard event handler type signature"
  - "Course tier for upgrade prompt read from course nav fetch (not repeated token endpoint call)"
  - "Milestone deduplication uses useRef<Set<number>> — resets on lessonId change"
  - "Both fetches (course nav + playback token) run in parallel with Promise.all for lower latency"

metrics:
  duration: "~10 minutes"
  completed: "2026-02-26"
---

# Phase 67 Plan 02: Video Player Page Summary

**One-liner:** Mux video player with signed token, auto-progress saves at milestones, tier-gate upgrade prompt, and lesson sidebar navigation.

## What Was Built

- **`@mux/mux-player-react@^3.11.4`** installed via npm.

- **`app/dashboard/content/[courseId]/lessons/[lessonId]/page.tsx`** — Video player page:
  - `useParams()` to get courseId and lessonId
  - Parallel `Promise.all` fetches for course nav (sidebar) + playback token
  - `MuxPlayer` with `playbackId` and `tokens={{ playback: token }}`
  - `onTimeUpdate` handler fires `saveProgress()` at 25/50/75/100% marks
  - `saveProgress()` uses `useRef<Set<number>>` to deduplicate milestone reports
  - Fire-and-forget `fetch("/api/content/progress", ...)` — never blocks UI
  - **403 response** → `UpgradePrompt` component with Lock icon and "Upgrade Now" → `/pricing`
  - **Other errors** → video-unavailable state with retry button
  - **Lesson sidebar** with module sections, current lesson highlighted in orange, play/clock icons per lesson status

## Deviations from Plan

**[Rule 2 - Missing Critical] TypeScript cast for onTimeUpdate**
- MuxPlayer's `onTimeUpdate` prop type is `GenericEventListener<Event>` not React's `SyntheticEvent`
- Cast as `any` with eslint-disable comment — safe since the handler only reads `event.target.currentTime` and `event.target.duration` which are standard HTMLMediaElement properties

## Next Phase Readiness

Plan 67-03 (FRED chat integration) can proceed. The CourseCardInline component needs to be created and wired into the chat message renderer.
