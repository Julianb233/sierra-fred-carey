# Phase 16-01: Red Flag Detection Engine and Dashboard Widget

## Status: COMPLETE
**Completed:** 2026-02-07

## What Was Built

### 1. Type Definitions (`lib/fred/types.ts`)
- Added `RedFlagCategory` type: "market" | "financial" | "team" | "product" | "legal" | "competitive"
- Added `Severity` type: "low" | "medium" | "high" | "critical"
- Added `FlagStatus` type: "active" | "acknowledged" | "resolved" | "dismissed"
- Added `RedFlag` interface with id, userId, category, severity, title, description, status, sourceMessageId, detectedAt, resolvedAt
- Added optional `redFlags?: RedFlag[]` field to `SynthesisResult` interface

### 2. Detection Engine (`lib/fred/risks/detection-engine.ts`)
- `detectRedFlags(synthesis, userId)` — analyzes SynthesisResult risks and classifies them into 6 categories using keyword matching
- `categorizeRisk(description)` — helper that maps risk descriptions to RedFlagCategory via keyword scoring
- Severity determination based on composite score and per-risk impact/likelihood
- Title generation with category prefix and truncation

### 3. Database Migration (`lib/db/migrations/036_red_flags.sql`)
- `fred_red_flags` table with UUID PK, user_id FK, category, severity, title, description, status, source_message_id, detected_at, resolved_at, created_at, updated_at
- CHECK constraints on category, severity, and status columns
- Composite index on (user_id, status) for dashboard queries
- RLS policies: SELECT, INSERT, UPDATE, DELETE restricted to own rows
- Auto-update trigger for updated_at

### 4. CRUD Layer (`lib/db/red-flags.ts`)
- `getRedFlags(userId, status?)` — list flags with optional status filter, sorted by severity then date
- `createRedFlag(flag)` — insert new flag
- `updateRedFlag(id, userId, updates)` — update status/resolvedAt
- `deleteRedFlag(id, userId)` — hard delete
- Snake_case to camelCase mapping via `rowToRedFlag()` helper

### 5. API Routes
- `GET /api/red-flags?status=active` — list flags for authenticated user
- `POST /api/red-flags` — create flag with validation (category, severity, title, description required)
- `PATCH /api/red-flags/[id]` — update flag status, auto-sets resolvedAt when status is "resolved"
- `DELETE /api/red-flags/[id]` — delete flag

### 6. Synthesize Actor Integration (`lib/fred/actors/synthesize.ts`)
- Imports `detectRedFlags` from detection engine
- Calls `detectRedFlags()` after `identifyRisks()` to produce structured RedFlag objects
- Attaches `redFlags` array to the returned SynthesisResult
- No changes to existing scoring logic or factor calculations

### 7. Chat Route Integration (`app/api/fred/chat/route.ts`)
- Imports `createRedFlag` from `lib/db/red-flags`
- After synthesis, persists detected flags via `createRedFlag()` with actual userId
- Emits `red_flag` SSE event with persisted flags (including DB-generated IDs)
- Graceful error handling — flag persistence failures don't block the chat response

### 8. Client Hook Update (`lib/hooks/use-fred-chat.ts`)
- Added `redFlags` state variable (`RedFlag[]`)
- Handles `red_flag` SSE event type, appending new flags to state
- Exports `redFlags` from hook return value
- Clears redFlags on conversation reset

### 9. Chat Message Integration (`components/chat/chat-message.tsx`)
- Added optional `risks?: RedFlag[]` prop to ChatMessageProps
- Renders `RedFlagBadge` components in a flex-wrap container below message content
- Only renders when risks array is present and non-empty
- Animated entrance with motion.div

### 10. Dashboard Widget (`components/dashboard/red-flags-widget.tsx`)
- Fetches active flags from `GET /api/red-flags?status=active` on mount
- Displays "Risk Alerts" card with count badge
- Groups flags by severity (critical, high, medium, low)
- Each flag shows category label, severity dot, title, and detected date
- "Acknowledge" button PATCHes status to "acknowledged" and removes from list
- Empty state: green checkmark with "No active risk flags detected"
- Loading state: skeleton placeholders
- Error handling: graceful catch with message display

### 11. Dashboard Page Integration (`app/dashboard/page.tsx`)
- Imported `RedFlagsWidget` component
- Rendered between Stats Grid and Quick Actions sections

## Files Modified
- `lib/fred/types.ts` — added RedFlag types + redFlags field on SynthesisResult
- `lib/fred/actors/synthesize.ts` — wired detectRedFlags after identifyRisks
- `app/api/fred/chat/route.ts` — added red flag persistence and SSE emission
- `lib/hooks/use-fred-chat.ts` — added red_flag event handling and state
- `components/chat/chat-message.tsx` — added risks prop and RedFlagBadge rendering
- `app/dashboard/page.tsx` — added RedFlagsWidget

## Files Created
- `lib/fred/risks/detection-engine.ts` — detection engine
- `lib/db/migrations/036_red_flags.sql` — database migration
- `lib/db/red-flags.ts` — CRUD operations
- `app/api/red-flags/route.ts` — GET/POST API route
- `app/api/red-flags/[id]/route.ts` — PATCH/DELETE API route
- `components/dashboard/red-flags-widget.tsx` — dashboard widget

## Verification
- TypeScript: `npx tsc --noEmit` passes with 0 errors
- All type exports verified
- All CRUD functions exported
- Detection engine wired through synthesize -> chat -> SSE -> client
- Dashboard widget integrated
