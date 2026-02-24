---
phase: 62-voice-agent-hardening
plan: 02
subsystem: api
tags: [livekit, egress, s3, supabase-storage, recording, transcript, webhook]

# Dependency graph
requires:
  - phase: 62-voice-agent-hardening-01
    provides: Voice client reconnection, webhook room_started handler, worker hardening
provides:
  - Call recording via LiveKit Egress with S3-compatible storage
  - Transcript and summary persistence to coaching_sessions table
  - Transcript size limit (500 entries) for abuse prevention
  - egress_ended webhook handler storing recording_url
  - Recording storage env vars documented in .env.example
affects: [63-fred-upgrade, 64-content-marketplace]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "LiveKit Egress recording with S3Upload output"
    - "Non-blocking recording start (try/catch fallback)"
    - "Webhook-driven recording URL population"

key-files:
  created:
    - lib/db/migrations/062_call_recording_columns.sql
  modified:
    - app/api/fred/call/route.ts
    - app/api/fred/call/summary/route.ts
    - app/api/livekit/webhook/route.ts
    - .env.example

key-decisions:
  - "Recording failure does not block calls -- wrapped in try/catch with console.warn"
  - "Supabase Storage chosen for S3-compatible recording storage (same infrastructure)"
  - "Transcript capped at 500 entries to prevent abuse/expensive LLM calls"
  - "egress_ended webhook populates recording_url from fileResults[0].location"

patterns-established:
  - "Non-blocking recording: Egress start in try/catch, null egressId when unavailable"
  - "Webhook-driven data population: room_started creates row, egress_ended fills recording_url, summary endpoint fills transcript"

# Metrics
duration: multi-session (checkpoint pause)
completed: 2026-02-23
---

# Phase 62 Plan 02: Call Recording and Transcript Persistence Summary

**LiveKit Egress audio recording with Supabase S3 storage, transcript/summary persistence to coaching_sessions, and egress_ended webhook for recording URL population**

## Performance

- **Duration:** Multi-session (checkpoint pause for storage decision)
- **Started:** 2026-02-23T16:40:11Z
- **Completed:** 2026-02-24T03:01:28Z
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments
- Call recording starts automatically via LiveKit Egress when S3 credentials are configured, with graceful fallback when they are not
- Transcript and summary (including decisions and next_actions) are persisted to coaching_sessions when a call ends
- The egress_ended webhook handler stores the recording URL in coaching_sessions once LiveKit uploads the audio file to S3
- Transcript input capped at 500 entries to prevent abuse
- Recording storage environment variables documented and configured for Supabase Storage S3

## Task Commits

Each task was committed atomically:

1. **Task 1: Add recording columns, egress recording start, and transcript size limit** - `d029f7d` (feat)
2. **Task 2: Persist transcript/summary to coaching_sessions and add egress_ended webhook handler** - `dcfe18f` (feat)
3. **Task 3: Configure Supabase Storage S3 recording credentials** - `a5ef770` (chore)

## Files Created/Modified
- `lib/db/migrations/062_call_recording_columns.sql` - Adds recording_url, transcript_json, summary, decisions, next_actions, call_type columns to coaching_sessions
- `app/api/fred/call/route.ts` - EgressClient recording start after room creation (non-blocking)
- `app/api/fred/call/summary/route.ts` - Transcript size limit (.max(500)) and persistence to coaching_sessions
- `app/api/livekit/webhook/route.ts` - egress_ended case that stores recording_url from fileResults
- `.env.example` - RECORDING_S3_* env vars documented with setup instructions

## Decisions Made
- Supabase Storage selected for recording storage (S3-compatible, same infrastructure as existing Supabase usage)
- Recording failure is non-blocking -- calls proceed without recording if S3 credentials are missing or Egress fails
- Transcript capped at 500 entries to prevent abuse and expensive LLM summarization calls
- egress_ended webhook reads fileResults[0].location first, falls back to constructing URL from S3 endpoint + bucket + room name

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required

**External services require manual configuration:**

1. **Supabase Storage bucket:** Create a bucket named `voice-recordings` in Supabase Dashboard -> Storage
2. **S3 access keys:** Generate S3 access keys in Supabase Dashboard -> Settings -> Storage -> S3 Access Keys
3. **Environment variables:** Fill in `RECORDING_S3_ACCESS_KEY` and `RECORDING_S3_SECRET` in `.env.local` with the generated keys
4. **Production:** Configure the same `RECORDING_S3_*` variables in Vercel Dashboard environment variables
5. **LiveKit Egress:** Verify Egress is available in your LiveKit Cloud plan (Cloud Dashboard -> Project Settings)
6. **Database migration:** Run `062_call_recording_columns.sql` against the database

## Next Phase Readiness
- Voice agent recording and transcript persistence complete
- Recording will work as soon as S3 credentials are configured (no code changes needed)
- Ready for Phase 63 (FRED Upgrade) -- coaching session data now persisted for FRED to reference

---
*Phase: 62-voice-agent-hardening*
*Completed: 2026-02-23*
