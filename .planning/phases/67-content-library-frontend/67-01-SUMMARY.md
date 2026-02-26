---
phase: "67-content-library-frontend"
plan: "01"
subsystem: "content-library"
tags: ["nextjs", "react", "tailwind", "shadcn-ui", "content-library"]

dependency-graph:
  requires:
    - "66-content-library-backend (API routes, DB types)"
  provides:
    - "Course catalog page at /dashboard/content"
    - "Course detail page at /dashboard/content/[courseId]"
    - "Content nav item in dashboard sidebar"
  affects:
    - "67-02 (video player links from detail page)"
    - "67-03 (chat integration uses course data types)"

tech-stack:
  added: []
  patterns:
    - "Client component with useEffect fetch pattern (same as reality-lens page)"
    - "Accordion from shadcn/ui for module/lesson hierarchy"
    - "Skeleton loading states for async data"

key-files:
  created:
    - "app/dashboard/content/page.tsx"
    - "app/dashboard/content/[courseId]/page.tsx"
  modified:
    - "app/dashboard/layout.tsx"

decisions:
  - "Enroll button uses local state only (MVP) — no enrollments API call wired yet, backend table exists"
  - "Course catalog is gated at video level not browse level — all users can see all courses, tier gate is at playback-token"
  - "Empty state links to /chat for FRED guidance since no courses published yet"
  - "Lesson items without mux_status=ready render as cursor-not-allowed (not a broken link)"

metrics:
  duration: "~12 minutes"
  completed: "2026-02-26"
---

# Phase 67 Plan 01: Content Pages and Nav Summary

**One-liner:** Course catalog and detail pages with filter UI, module accordion, and Content nav item in sidebar.

## What Was Built

- **`app/dashboard/layout.tsx`** — Added `BookOpen` icon import and Content nav item linking to `/dashboard/content`. Inserted after Coaching in `coreNavItems` (always visible, no tier condition).

- **`app/dashboard/content/page.tsx`** — Course catalog page with:
  - Stage filter (idea/validation/growth) and topic filter (fundraising/product/growth/marketing/legal/operations)
  - Responsive course grid (1/2/3 columns)
  - `CourseCard` component with thumbnail, title, description, stage/topic badges, tier lock indicator
  - Loading skeleton (6 skeleton cards)
  - Empty state with BookOpen icon, "Coming Soon" message, and link to /chat
  - Error state for fetch failures
  - Filters trigger refetch via useEffect

- **`app/dashboard/content/[courseId]/page.tsx`** — Course detail page with:
  - Back link to catalog
  - Course header card with thumbnail banner, title, description, meta badges, enroll button
  - Enroll button toggles local enrolled state (MVP — no backend API call)
  - Module accordion (shadcn Accordion, first module open by default)
  - LessonItem component: links to video player when ready, lock icon for tier-gated, clock for processing
  - Preview badge on is_preview=true lessons
  - Duration formatted as "Xm Ys"
  - Loading skeleton and not-found state

## Deviations from Plan

None — plan executed exactly as written.

## Next Phase Readiness

Plan 67-02 (video player page) can proceed. The detail page already has lesson links pointing to `/dashboard/content/[courseId]/lessons/[lessonId]`.
