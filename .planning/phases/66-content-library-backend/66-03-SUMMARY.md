---
phase: 66-content-library-backend
plan: 03
subsystem: content-library
tags: [api-routes, mux, tier-enforcement, fred-tools, next.js]

dependency-graph:
  requires:
    - "66-01: content library schema (courses, modules, lessons, enrollments, content_progress)"
    - "66-02: lib/db/content.ts (getCatalog, getCourse, getLesson, searchContentLibrary, upsertProgress), lib/mux/tokens.ts (signPlaybackToken)"
  provides:
    - "GET /api/content — published course catalog with stage/topic filtering"
    - "GET /api/content/[courseId] — single course with modules and lessons"
    - "GET /api/content/[courseId]/lessons/[lessonId]/playback-token — tier-gated signed JWT"
    - "POST /api/content/progress — lesson watch progress upsert"
    - "FRED content-recommender tool queries real DB (searchContentLibrary)"
  affects:
    - "Phase 67 frontend: all content pages call these routes"
    - "FRED chat: content-recommender tool now returns real course results"

tech-stack:
  added: []
  patterns:
    - "Dynamic params as Promise<{...}> with await (Next.js 15 pattern)"
    - "Zod schema validation on POST bodies"
    - "Tier enforcement via checkTierForRequest() from lib/api/tier-middleware"
    - "Preview lessons bypass tier check (is_preview flag)"
    - "Graceful fallback in FRED tool catch block"

key-files:
  created:
    - app/api/content/route.ts
    - app/api/content/[courseId]/route.ts
    - app/api/content/[courseId]/lessons/[lessonId]/playback-token/route.ts
    - app/api/content/progress/route.ts
  modified:
    - lib/fred/tools/content-recommender.ts

decisions:
  - "Dynamic import of createServiceClient in playback-token route for module-level lookup (avoids circular import issues)"
  - "Tier check only fires when requiredTier > UserTier.FREE — free courses skip the DB lookup entirely"
  - "FRED tool falls back to coming_soon on any DB error (graceful degradation, never crashes FRED)"
  - "searchContentLibrary called with format param even though DB doesn't filter by format (future-proofing, ilike still works)"

metrics:
  duration: "~8 minutes"
  completed: "2026-02-25"
---

# Phase 66 Plan 03: Content API Routes + FRED Tool Update Summary

**One-liner:** 4 tier-enforced content API routes + FRED tool wired to real DB search with graceful fallback.

## API Routes Created and Their Contracts

### GET /api/content
- **Auth:** Requires authenticated user session
- **Query params:** `stage` (optional), `topic` (optional)
- **Response:** `{ courses: Course[] }` — only published courses
- **Tier gate:** None — returns all courses with `tier_required` field for frontend display
- **File:** `app/api/content/route.ts`

### GET /api/content/[courseId]
- **Auth:** Requires authenticated user session
- **Response:** `{ course: Course & { modules: (Module & { lessons: Lesson[] })[] } }`
- **Error:** 404 if course not found or not published
- **File:** `app/api/content/[courseId]/route.ts`

### GET /api/content/[courseId]/lessons/[lessonId]/playback-token
- **Auth:** Requires authenticated user session
- **Tier enforcement:**
  - `is_preview = true` → bypass tier check, issue token to all auth users
  - `tier_required = 'free'` → bypass tier check, issue token
  - `tier_required = 'pro'` → checkTierForRequest(req, UserTier.PRO)
  - `tier_required = 'studio'` → checkTierForRequest(req, UserTier.STUDIO)
- **Response (success):** `{ token: string, playbackId: string }` — 1-hour signed JWT
- **Response (tier fail):** `{ error: "Upgrade required", upgradeUrl: "/pricing" }` — 403
- **Response (not ready):** `{ error: "Video not ready" }` — 422
- **File:** `app/api/content/[courseId]/lessons/[lessonId]/playback-token/route.ts`

### POST /api/content/progress
- **Auth:** Requires authenticated user session
- **Body:** `{ lessonId: string (uuid), watchedPct: number (0-100), completed: boolean }`
- **Validation:** Zod schema with `.safeParse()` — 400 on invalid body
- **Response:** `{ ok: true }`
- **File:** `app/api/content/progress/route.ts`

## FRED Tool Update

**File:** `lib/fred/tools/content-recommender.ts`

Changed: `execute` function now calls `searchContentLibrary({ query, stage, format })` from `lib/db/content.ts`.

- **On success with results:** Returns `{ status: "success", query, courses: [...] }` with id, title, description, stage, topic, tier_required, slug
- **On success with no results:** Returns `{ status: "no_results", query, message, courses: [] }`
- **On any error:** Falls back to `{ status: "coming_soon", query, message, suggestedTopics: [] }` — never crashes FRED

Tool interface (description, inputSchema) is unchanged — no wiring changes needed in FRED registry.

## Tier Enforcement Logic

```
lesson.is_preview = true → SKIP tier check → issue token
lesson.is_preview = false → lookup module → lookup course.tier_required
  tier_required = 'free' → SKIP tier check → issue token
  tier_required = 'pro' → checkTierForRequest(req, UserTier.PRO)
    user.tier >= PRO → issue token
    user.tier < PRO → 403 { error: "Upgrade required", upgradeUrl: "/pricing" }
  tier_required = 'studio' → checkTierForRequest(req, UserTier.STUDIO)
    user.tier >= STUDIO → issue token
    user.tier < STUDIO → 403 { error: "Upgrade required", upgradeUrl: "/pricing" }
```

## Build Verification

- `npm run build` → "Compiled with warnings" (pre-existing warnings, zero new errors)
- All 4 content routes appear in build output:
  - `ƒ /api/content`
  - `ƒ /api/content/[courseId]`
  - `ƒ /api/content/[courseId]/lessons/[lessonId]/playback-token`
  - `ƒ /api/content/progress`

## Deviations from Plan

None — plan executed exactly as written.

## Verification Results
- `npx tsc --noEmit | grep app/api/content` → no output (zero errors) ✓
- `npx tsc --noEmit | grep content-recommender` → no output (zero errors) ✓
- `ls app/api/content/` → [courseId]/, progress/, route.ts ✓
- `ls app/api/content/[courseId]/lessons/[lessonId]/playback-token/` → route.ts ✓
- `grep "checkTierForRequest" playback-token/route.ts` → confirmed ✓
- `grep "signPlaybackToken" playback-token/route.ts` → confirmed ✓
- `grep "searchContentLibrary" content-recommender.ts` → confirmed ✓
- `grep "coming_soon" content-recommender.ts` → only in catch block ✓
- Build passes with all 4 routes compiled as dynamic server routes ✓
