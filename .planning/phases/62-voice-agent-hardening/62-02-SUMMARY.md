---
phase: 62-voice-agent-hardening
plan: 02
subsystem: voice-call
tags: [livekit, egress, recording, transcript, webhook, coaching-sessions]
dependency_graph:
  requires: [62-01]
  provides: [call-recording-egress, transcript-persistence, transcript-size-limit, egress-ended-webhook]
  affects: [63-fred-upgrade, 64-content-marketplace]
tech_stack:
  added: []
  patterns:
    - "LiveKit Egress recording with S3Upload output (non-blocking)"
    - "Webhook-driven recording URL population via egress_ended"
    - "Transcript/summary persistence to coaching_sessions"
key_files:
  created:
    - lib/db/migrations/062_call_recording_columns.sql
  modified:
    - app/api/fred/call/route.ts
    - app/api/fred/call/summary/route.ts
    - app/api/livekit/webhook/route.ts
decisions:
  - id: D62-02-01
    description: "Recording failure is non-blocking -- wrapped in try/catch, calls proceed without recording"
  - id: D62-02-02
    description: "Transcript capped at 500 entries to prevent abuse and expensive LLM calls"
  - id: D62-02-03
    description: "egress_ended webhook populates recording_url from fileResults[0].location"
  - id: D62-02-04
    description: "Recording storage deferred -- S3 env vars needed for LiveKit Egress recordings (user chose option-b)"
metrics:
  duration: multi-session (checkpoint pause for storage decision)
  completed: 2026-02-23
---

# Phase 62 Plan 02: Call Recording and Transcript Persistence Summary

LiveKit Egress audio recording with S3 storage support, transcript/summary persistence to coaching_sessions, egress_ended webhook for recording URL population, and transcript size limit at 500 entries. Recording storage deferred -- code is ready, awaiting S3 env vars.

## What Was Done

### Task 1: Add recording columns, egress recording start, and transcript size limit (d029f7d)

- Created migration `062_call_recording_columns.sql` adding `recording_url`, `transcript_json`, `summary`, `decisions`, `next_actions`, `call_type` columns to `coaching_sessions`
- Added unique constraint on `room_name` for upsert operations
- Added `EgressClient` recording start in `app/api/fred/call/route.ts` -- starts audio-only Egress recording when S3 credentials are configured, gracefully skips when they are not
- Added `.max(500)` to transcript array schema in `app/api/fred/call/summary/route.ts`
- Response from call route includes `egressId` field (null when recording unavailable)

**Files:** `lib/db/migrations/062_call_recording_columns.sql`, `app/api/fred/call/route.ts`, `app/api/fred/call/summary/route.ts`

### Task 2: Persist transcript/summary to coaching_sessions and add egress_ended webhook handler (dcfe18f)

- Summary route now persists `transcript_json`, `summary`, `decisions`, `next_actions`, and `call_type` to `coaching_sessions` table when call ends
- Added `egress_ended` case to webhook handler that extracts recording URL from `egressInfo.fileResults` and stores it in `coaching_sessions.recording_url`
- Fallback URL construction from S3 endpoint + bucket + room name when fileResults lacks location

**Files:** `app/api/fred/call/summary/route.ts`, `app/api/livekit/webhook/route.ts`

### Task 3: Recording storage configuration (checkpoint:decision -- deferred)

This was a checkpoint asking whether to configure S3 recording storage now or defer. The user chose **option-b: Defer recording storage to later**.

- Voice calls work fully without recording -- recording is an additive feature
- Code is ready and will auto-enable when S3 env vars are added
- Required env vars: `RECORDING_S3_ACCESS_KEY`, `RECORDING_S3_SECRET`, `RECORDING_S3_BUCKET`, `RECORDING_S3_REGION`, `RECORDING_S3_ENDPOINT`
- No code changes were needed for this decision

## Deviations from Plan

None - plan executed exactly as written.

## Verification

- `npx tsc --noEmit` passes with no new errors
- Migration file exists at `lib/db/migrations/062_call_recording_columns.sql`
- `app/api/fred/call/route.ts` imports `EgressClient`, `EncodedFileOutput`, `EncodedFileType`, `S3Upload` from `livekit-server-sdk`
- Recording starts when S3 credentials present, skips gracefully when missing
- `app/api/fred/call/summary/route.ts` has `.max(500)` on transcript array
- Summary route persists transcript and summary to coaching_sessions
- Webhook route has `egress_ended` case storing recording_url from fileResults
- Response includes `egressId` field

## Next Phase Readiness

- Phase 62 voice agent hardening is complete (both plans shipped)
- Recording will auto-enable when S3 credentials are configured (no code changes needed)
- Coaching session data (transcript, summary, decisions, next_actions) now persisted for FRED to reference in Phase 63
- Migration 062 needs to be run against the database

---
*Phase: 62-voice-agent-hardening*
*Completed: 2026-02-23*
