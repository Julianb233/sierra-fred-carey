# LiveKit Wire-Up Summary

## Overview

Replaced the simulated (setTimeout-based) voice call flow in CallFredModal with a real LiveKit client connection, and added real-time transcript publishing from the backend voice agent to the frontend via LiveKit DataChannel.

## Files Changed

### `components/dashboard/call-fred-modal.tsx` (frontend)

- **Real LiveKit Room connection**: Replaced the `setTimeout` simulation with `new Room()` + `room.connect(data.url, data.token)` using credentials returned from the `/api/fred/call` API endpoint.
- **Room cleanup on unmount/close**: Added `useEffect` cleanup that calls `room.disconnect()` on component unmount, and also disconnects when the modal `open` prop transitions to `false`.
- **Microphone permission handling**: After connecting, calls `room.localParticipant.setMicrophoneEnabled(true)` with a try/catch. If the user denies mic access, the room is disconnected and a descriptive error is shown.
- **Real mute/unmute**: Replaced the UI-only `setIsMuted` toggle with `handleToggleMute`, which calls `room.localParticipant.setMicrophoneEnabled(!newMuted)`. Includes optimistic state update with revert on failure.
- **Transcript capture via DataReceived**: Listens for `RoomEvent.DataReceived` events, parses the JSON payload (`{ speaker, text, timestamp }`), and appends entries to `transcriptEntries` state. These entries are sent to the post-call summary API.
- **End call disconnects room**: `handleEndCall` now calls `room.disconnect()` before generating the summary.

### `workers/voice-agent/agent.ts` (backend)

- **Transcript publishing**: Added a `publishTranscript(speaker, text)` helper that encodes `{ speaker, text, timestamp }` as JSON and publishes via `ctx.room.localParticipant.publishData()` with `reliable: true` and `topic: 'transcript'`.
- **Wired into session events**: Called `publishTranscript('user', ...)` inside the `user_input_transcribed` handler and `publishTranscript('fred', ...)` inside `conversation_item_added`, so both sides of the conversation are streamed to the frontend in real time.

### `app/api/fred/call/route.ts` (API route)

No changes. The endpoint already returns `{ token, url, room }` which the frontend now uses to connect.

## Verification Results

| Check | Result |
|-------|--------|
| `npm run build` | PASS - compiles with no new errors |
| `npm test` (790 pass / 11 fail) | PASS - all 11 failures are pre-existing in `documents.test.tsx`, not related to LiveKit changes |
| `npm run worker:voice:build` | Pre-existing TS errors (same on clean main) - not introduced by this change |
| No hardcoded credentials/URLs | PASS |
| Room.disconnect() on unmount | PASS |
| Room.disconnect() on end call | PASS |
| Room.disconnect() on modal close | PASS |
| Microphone permission with graceful error | PASS |
| Mute/unmute wired to real audio track | PASS |
| Timer still works during calls | PASS |
| Max duration auto-end disconnects room | PASS |
| Transcript data parsed from DataReceived | PASS |
| Post-call summary receives real transcripts | PASS |
| No NEXT_PUBLIC_ env vars for LiveKit | PASS - URL comes from API response |
