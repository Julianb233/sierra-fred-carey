---
phase: 62-voice-agent-hardening
plan: 01
subsystem: voice-call
tags: [livekit, reconnection, webhook, voice-agent, error-handling]
dependency_graph:
  requires: []
  provides: [reconnection-ui, metadata-merge, agent-identity-fix, worker-error-handling]
  affects: [62-02]
tech_stack:
  added: []
  patterns: [event-driven-reconnection, metadata-merge-on-update]
key_files:
  created: []
  modified:
    - components/dashboard/call-fred-modal.tsx
    - app/api/livekit/webhook/route.ts
    - workers/voice-agent/agent.ts
decisions:
  - id: D62-01-01
    description: "Reconnection uses connectionStatus state with RoomEvent.Reconnecting/Reconnected"
  - id: D62-01-02
    description: "Agent identity detection uses exact match 'fred-cary-voice' instead of prefix 'fred'"
  - id: D62-01-03
    description: "Worker returns early on connect/waitForParticipant failure instead of crashing"
metrics:
  duration: 2m
  completed: 2026-02-20
---

# Phase 62 Plan 01: Voice Agent Hardening - Client and Webhook Fixes Summary

Reconnection UI banner in CallFredModal, webhook metadata merge to preserve room_started fields, exact-match agent identity detection, and try/catch error handling in voice worker entry.

## What Was Done

### Task 1: Reconnection UI Banner (f9c163c)

Added network reconnection feedback to the voice call modal:

- New `connectionStatus` state (`'connected' | 'reconnecting'`)
- `RoomEvent.Reconnecting` listener sets status to reconnecting
- `RoomEvent.Reconnected` listener resets status to connected
- Yellow banner with spinner appears above transcript during reconnection
- Status resets when modal opens

**Files modified:** `components/dashboard/call-fred-modal.tsx`

### Task 2: Webhook and Worker Bug Fixes (35dde4f)

Fixed three MEDIUM-severity audit findings:

**A. Metadata Merge (webhook):** The `room_finished` handler was overwriting metadata (losing `max_participants` from `room_started`). Now spreads existing metadata before adding `duration_seconds` and updated `livekit_sid`.

**B. Agent Identity Detection (webhook):** `extractUserIdFromIdentity()` used `identity.startsWith('fred')` which would match a human user named "Fred". Changed to exact match against `'fred-cary-voice'` (the FRED_AGENT_NAME constant).

**C. Worker Error Handling (agent.ts):** `ctx.connect()` and `ctx.waitForParticipant()` were unguarded -- any failure would crash the worker process. Wrapped both in try/catch with early return on failure.

**Files modified:** `app/api/livekit/webhook/route.ts`, `workers/voice-agent/agent.ts`

## Deviations from Plan

None - plan executed exactly as written.

## Verification

- `npx tsc --noEmit` passes with zero errors
- `RoomEvent.Reconnecting` and `RoomEvent.Reconnected` handlers present in call-fred-modal.tsx
- Metadata spread operator present in room_finished handler
- `identity === 'fred-cary-voice'` exact match in extractUserIdFromIdentity
- try/catch blocks around connect() and waitForParticipant() in agent.ts

## Next Phase Readiness

Plan 62-02 can proceed. No blockers introduced. The three MEDIUM-severity bugs are resolved, and the reconnection UX gap is closed.
