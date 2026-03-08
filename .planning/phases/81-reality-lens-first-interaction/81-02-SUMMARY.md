---
phase: 81-reality-lens-first-interaction
plan: 02
subsystem: reality-lens-wizard-ui
tags: [reality-lens, wizard, onboarding, oases, stage-placement, ui]
dependency-graph:
  requires: [81-01]
  provides:
    - Quick Reality Lens wizard UI at /dashboard/reality-lens/quick
    - First-time onboarding flow with intro screen
    - Already-completed redirect to dashboard
    - Quick check banner on existing Reality Lens page
  affects:
    - 80-01 (stage-gate enforcement reads oases_stage set by quick assessment)
    - 82-xx (voice agent could reference quick assessment results)
tech-stack:
  added: []
  patterns:
    - "Suspense boundary wrapping useSearchParams for Next.js compatibility"
    - "Step-by-step wizard with AnimatePresence slide transitions"
    - "localStorage-based banner dismissal persistence"
key-files:
  created:
    - app/dashboard/reality-lens/quick/page.tsx
  modified:
    - app/dashboard/reality-lens/page.tsx
decisions:
  - id: "81-02-d1"
    decision: "Suspense boundary wraps inner component using useSearchParams"
    reason: "Next.js requires Suspense when useSearchParams is used in client components"
  - id: "81-02-d2"
    decision: "Text fields require min 10 chars, select fields require selection"
    reason: "Matches Zod schema validation in API to prevent premature submission"
  - id: "81-02-d3"
    decision: "Stage badge colors match stage-config.ts assignments (amber/blue/green/purple/emerald)"
    reason: "Visual consistency with Oases stage branding throughout the platform"
  - id: "81-02-d4"
    decision: "Gaps card uses orange-tinted 'investor' framing, strengths use green-tinted card"
    reason: "Fred's strategy: spook founders about gaps to motivate engagement"
metrics:
  duration: "~15 minutes"
  completed: "2026-03-08"
---

# Phase 81 Plan 02: Quick Reality Lens Wizard UI Summary

**One-liner:** Step-by-step 6-question wizard at /dashboard/reality-lens/quick with first-time intro, animated transitions, score/stage/gap results, and quick-check banner on the existing Reality Lens page.

## What Was Built

### 1. Quick Reality Lens Wizard Page (`app/dashboard/reality-lens/quick/page.tsx`)

Full step-by-step wizard with these screens:

- **Intro Screen (step -1):** Only shown for first-time users (via `?first=true` query param). Shows Sahara-branded rocket icon, "Quick Reality Check" heading, and "This takes about 2 minutes" subtext with "Let's Go" button.

- **Question Flow (steps 0-5):** One question per screen using data from `QUICK_QUESTIONS`. Progress bar at top showing completion percentage. Text questions use Textarea with min 10 chars validation. Select questions use shadcn Select component. Back/Next navigation with Framer Motion slide transitions. Final step shows "Analyze My Idea" with RocketIcon.

- **Analyzing Screen:** Full-screen spinner with cycling messages every 2s ("Evaluating your idea...", "Analyzing market fit...", "Checking readiness...", "Identifying gaps..."). Posts answers to API at `/api/fred/reality-lens/quick`.

- **Results Screen:**
  - Large score number with color coding (green >= 75, amber >= 50, red < 50)
  - Verdict label (e.g., "Early Stage - Focus on Clarity")
  - Stage badge with desert-themed colors matching stage-config.ts
  - Orange-tinted gaps card: "What you need to figure out before investors will listen" with ExclamationTriangleIcon
  - Green-tinted strengths card: "What's working for you" with CheckCircledIcon
  - Next action highlighted card
  - "Continue to Your Journey" (Sahara orange) and "Get Detailed Analysis" (ghost) buttons

- **Completion Check:** On mount, fetches GET `/api/fred/reality-lens/quick`. If `complete === true`, redirects to `/dashboard` with toast notification.

- **Suspense Boundary:** Outer component wraps inner with `<Suspense>` for `useSearchParams` compatibility.

### 2. Reality Lens Page Updates (`app/dashboard/reality-lens/page.tsx`)

- **First-time redirect:** `useSearchParams` reads `?first=true` query param, redirects to `/dashboard/reality-lens/quick?first=true` via `router.replace`.
- **Quick Check Banner:** Fetches completion status on mount. If not complete and not dismissed, shows orange-tinted info banner: "New here? Take the 2-minute Quick Reality Check first" with "Take Quick Check" button and "Dismiss" button. Dismissal stored in localStorage (`sahara_quick_check_banner_dismissed`).
- All existing Reality Lens functionality preserved unchanged.

## Must-haves Verification

| Truth | Status |
|-------|--------|
| After onboarding, user lands on step-by-step 6-question wizard | PASS |
| Results screen shows score, stage placement, gaps, and strengths | PASS |
| Gaps framed as motivational ("what to figure out before investors will listen") | PASS |
| Already-completed users redirected to /dashboard | PASS |
| Continue button navigates to dashboard after viewing results | PASS |

## Key Links Verification

| From | To | Via | Status |
|------|----|-----|--------|
| quick/page.tsx | /api/fred/reality-lens/quick | fetch POST on submit, GET on mount | PASS |
| welcome/page.tsx | quick/page.tsx | router.push to /dashboard/reality-lens?first=true -> redirect to quick | PASS |

## TypeScript Compilation

`npx tsc --noEmit` -- zero errors in plan-scoped files. Pre-existing errors in `app/api/fred/chat/route.ts` are unrelated.

## Deviations from Plan

None -- plan executed as written. The existing code (from parallel agent) covered the base implementation; this execution verified all requirements and enhanced with missing features (Suspense boundary, min 10 char validation, verdict label display, orange/green tinted cards, stage colors from stage-config.ts, RocketIcon, proper button text/variants).

## Commits

- `9e6695b` feat(81-01): quick reality lens wizard UI page
- `a1e735c` feat(81-02): add quick reality check banner and first-time redirect to Reality Lens page
