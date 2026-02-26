---
phase: 66-content-library-backend
plan: 02
subsystem: content-library
tags: [mux, typescript, database, supabase, helpers]

dependency-graph:
  requires:
    - "66-01: @mux/mux-node installed, content library schema defined"
  provides:
    - "Mux singleton (lib/mux/client.ts)"
    - "Mux upload helpers: createDirectUpload, getAsset (lib/mux/uploads.ts)"
    - "Mux token helper: signPlaybackToken (lib/mux/tokens.ts)"
    - "DB content helpers: 12 exported functions (lib/db/content.ts)"
  affects:
    - "66-03: API routes and FRED tool import from these files"

tech-stack:
  added: []
  patterns:
    - "Mux singleton initialized with empty string fallback to prevent build-time crash"
    - "createServiceClient() used for all DB queries (complex queries, admin functions)"
    - "Supabase query builder pattern instead of sql template tag for JOIN-equivalent fetches"

key-files:
  created:
    - lib/mux/client.ts
    - lib/mux/uploads.ts
    - lib/mux/tokens.ts
    - lib/db/content.ts

decisions:
  - "Used type: 'video' instead of type: 'playback' in signPlaybackId — Mux SDK v12 uses 'video' as the type string for playback tokens"
  - "createServiceClient() used directly (not sql template tag) because content queries require multi-table fetches that the sql tag parser doesn't support"
  - "Mux client uses ?? '' fallback instead of non-null assertion to allow build-time compilation without credentials"
  - "webhookSecret passed as optional (process.env.MUX_WEBHOOK_SECRET without fallback) to allow undefined"

metrics:
  duration: "~5 minutes"
  completed: "2026-02-25"
---

# Phase 66 Plan 02: Mux Client + DB Content Helpers Summary

**One-liner:** 4 library files — Mux singleton, upload/token helpers, and 12 DB query functions for the content library.

## Files Created and Their Exports

### lib/mux/client.ts
- **Exports:** `mux` (Mux singleton)
- Initialized from `MUX_TOKEN_ID` and `MUX_TOKEN_SECRET`
- Warns (does not crash) when env vars are missing
- Passes optional `MUX_WEBHOOK_SECRET` for webhook signature verification

### lib/mux/uploads.ts
- **Exports:** `createDirectUpload(lessonId, corsOrigin)`, `getAsset(assetId)`
- createDirectUpload uses `playback_policies: ["signed"]` — never "public"
- passthrough set to lessonId so webhook can link Mux asset back to DB lesson row

### lib/mux/tokens.ts
- **Exports:** `signPlaybackToken(playbackId)`
- Generates 1-hour signed JWT using `mux.jwt.signPlaybackId`
- Always sets expiration to "1h" — no unbounded tokens

### lib/db/content.ts
- **Exports:** 12 functions + 4 types
  - Types: `Course`, `Module`, `Lesson`, `ContentProgress`
  - Public queries: `getCatalog`, `getCourse`, `getLesson`, `searchContentLibrary`, `upsertProgress`
  - Admin queries: `adminGetCourses`, `adminCreateCourse`, `adminUpdateCourse`, `adminCreateModule`, `adminCreateLesson`, `updateLessonMuxFields`, `getLessonByUploadId`

## TypeScript Issues Encountered

### Issue: Wrong type value for signPlaybackId
- **Error:** `Type '"playback"' is not assignable to type '"video" | "thumbnail" | ...`
- **Root cause:** Mux SDK v12 changed the type string from "playback" to "video" for video playback tokens
- **Fix:** Changed `type: "playback"` to `type: "video"` in lib/mux/tokens.ts
- **Commit:** Included in Plan 02 commit

## Key Implementation Decisions

1. **createServiceClient() over sql template tag:** The sql tag in this codebase is a lightweight Supabase query builder that doesn't support JOIN equivalents. getCourse() needs to fetch modules + lessons in parallel, which requires the Supabase client builder pattern.

2. **Mux credential handling:** `??  ""` fallback pattern (not `!` non-null assertion) allows TypeScript to compile cleanly in environments where Mux credentials are not yet set. Routes will fail at runtime with a clear Mux SDK error, not a build-time crash.

3. **searchContentLibrary uses ilike:** Case-insensitive LIKE on title and description, limited to 5 results. This is intentionally simple — no vector search needed for MVP content library.

## Deviations from Plan

### Auto-fixed Issues
**[Rule 1 - Bug] Fixed wrong Mux JWT type string**
- Found during: Task 1 TypeScript verification
- Issue: Plan specified `type: "playback"` but Mux SDK v12 defines the type enum as `"video" | "thumbnail" | "gif" | "storyboard" | "stats" | "drm_license"`
- Fix: Changed to `type: "video"` which is the correct value for video playback token signing
- Files modified: lib/mux/tokens.ts

## Verification Results
- `npx tsc --noEmit | grep lib/mux` → no output (zero errors) ✓
- `npx tsc --noEmit | grep lib/db/content` → no output (zero errors) ✓
- `ls lib/mux/` → client.ts, tokens.ts, uploads.ts ✓
- `grep -c "export" lib/db/content.ts` → 16 (includes type exports) ✓
- `grep "from.*@mux/mux-node" lib/mux/client.ts` → import confirmed ✓
- `grep "signPlaybackId" lib/mux/tokens.ts` → present with "1h" expiry ✓
