# Phase 62: Voice Agent Production Hardening - Research

**Researched:** 2026-02-19
**Domain:** LiveKit voice calls, Docker deployment, call recording/transcription
**Confidence:** HIGH

## Summary

This phase addresses 3 CRITICAL voice bugs documented in the existing audit reports (VOICE-UI-AUDIT.md, VOICE-API-AUDIT.md, VOICE-WORKER-AUDIT.md) plus reconnection handling and call recording/transcription. The codebase already has partial fixes in place -- the `call-fred-modal.tsx` already includes `TrackSubscribed`, `TrackUnsubscribed`, `Disconnected` handlers, and an agent join timeout. The `fred/call` route already uses the correct room name format (`${userId}_fred-call_${Date.now()}`). The Dockerfile already removed `--omit=dev` and uses `npm ci` without the flag.

However, critical gaps remain: no reconnection UI (Reconnecting/Reconnected events), no call recording via LiveKit Egress, no server-side transcription storage, the worker agent lacks a shutdown callback and error handling around connect/waitForParticipant, and several MEDIUM-severity issues from the audits are unaddressed (metadata overwrite in webhook, transcript size limit, webhook logging, fragile agent identity detection).

**Primary recommendation:** Validate the existing fixes work end-to-end in production, then layer on reconnection handling, recording via EgressClient (audio-only room composite), and server-side transcript persistence.

## Standard Stack

The established libraries/tools for this domain:

### Core (Already Installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `livekit-client` | ^2.16.1 | Browser WebRTC client | Official LiveKit JS SDK; used for Room, events, track management |
| `livekit-server-sdk` | ^2.15.0 | Server-side room/token/egress management | Official Node SDK; includes EgressClient, RoomServiceClient, AccessToken |
| `@livekit/agents` | ^1.0.43 | Voice agent worker framework | Official agent framework; defineAgent, JobContext, voice.Agent |
| `@livekit/agents-plugin-openai` | ^1.0.43 | STT/LLM/TTS providers | OpenAI integration for Whisper, GPT-4o, tts-1 |
| `@livekit/components-react` | ^2.9.17 | React LiveKit components | Installed but NOT used; could simplify audio handling |

### Supporting (Already Installed)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@livekit/protocol` | ^1.43.4 | Protocol types (RoomEgress, EgressInfo, etc.) | Auto-installed as dep; used for egress type definitions |

### Not Needed
| Instead of | Why Not |
|------------|---------|
| `@livekit/components-react` refactor | The manual Room API is already working with fixes in place; refactoring to components-react would be scope creep. The existing TrackSubscribed/TrackUnsubscribed handlers are correct. |
| Custom recording solution | LiveKit EgressClient provides audio-only room composite recording out of the box |

**No new packages needed.** All required functionality is available in the already-installed `livekit-server-sdk` v2.15.0 (EgressClient) and `livekit-client` v2.16.1 (reconnection events).

## Architecture Patterns

### Current Voice Call Architecture
```
User clicks "Call Fred"
  -> CallFredModal (client) -> POST /api/fred/call (server)
    -> RoomServiceClient.createRoom()
    -> AgentDispatchClient.createDispatch('fred-cary-voice')
    -> AccessToken.toJwt() -> return { token, url, room }
  -> Room.connect(url, token) (client)
  -> Voice agent worker picks up dispatch (Railway)
    -> defineAgent.entry() -> ctx.connect() -> ctx.waitForParticipant()
    -> VoiceAgent + AgentSession (Whisper STT -> GPT-4o -> tts-1 TTS)
    -> publishData(transcript, topic: 'transcript')
  -> Client receives DataReceived events, shows transcript
  -> User clicks End Call -> POST /api/fred/call/summary
  -> LiveKit webhooks -> /api/livekit/webhook (room_started, room_finished, participant_joined/left)
```

### Key Files
```
components/dashboard/call-fred-modal.tsx  # Client UI (already has P0/P1 fixes)
app/api/fred/call/route.ts               # Room creation + agent dispatch
app/api/fred/call/summary/route.ts       # Post-call LLM summary
app/api/livekit/webhook/route.ts         # LiveKit event handler
workers/voice-agent/agent.ts             # Voice agent entry point
workers/voice-agent/index.ts             # Worker bootstrap
workers/voice-agent/Dockerfile           # Docker build (already fixed)
lib/voice-agent.ts                       # Shared voice agent utilities
```

### Pattern 1: Audio-Only Room Composite Egress for Recording
**What:** Start an audio-only recording when a voice call room is created, stop it when the room ends.
**When to use:** Every fred-call room should be recorded for post-call playback.
**How it works:**
```typescript
// In POST /api/fred/call, after createRoom():
import { EgressClient, EncodedFileOutput } from 'livekit-server-sdk';
import { EncodedFileType } from '@livekit/protocol';

const egressClient = new EgressClient(httpUrl, apiKey, apiSecret);
const fileOutput = new EncodedFileOutput({
  fileType: EncodedFileType.OGG,
  filepath: `recordings/${roomName}.ogg`,
  output: {
    case: 's3',
    value: {
      accessKey: process.env.S3_ACCESS_KEY,
      secret: process.env.S3_SECRET,
      bucket: process.env.S3_BUCKET,
      region: process.env.S3_REGION,
    },
  },
});

await egressClient.startRoomCompositeEgress(roomName, fileOutput, {
  audioOnly: true,
});
```

**Alternative (simpler):** Use auto-egress on room creation:
```typescript
import { RoomEgress } from '@livekit/protocol';

await roomService.createRoom({
  name: roomName,
  emptyTimeout,
  maxParticipants: 2,
  egress: new RoomEgress({
    // auto-egress configuration
    participant: new AutoParticipantEgress({ ... }),
  }),
});
```

### Pattern 2: Reconnection UI Handling
**What:** Show visual feedback when connection is temporarily lost, recover gracefully.
**When to use:** All active voice calls should handle network interruptions.
```typescript
// In call-fred-modal.tsx, add to the room event setup:
room.on(RoomEvent.Reconnecting, () => {
  setConnectionQuality('reconnecting');
  // Show "Reconnecting..." banner in UI
});

room.on(RoomEvent.Reconnected, () => {
  setConnectionQuality('connected');
  // Hide reconnecting banner
});

room.on(RoomEvent.SignalReconnecting, () => {
  // Minor signal hiccup -- usually invisible to users
  // Optionally log to Sentry for monitoring
});
```

### Pattern 3: Worker Shutdown + Error Handling
**What:** Proper lifecycle management for the voice agent worker.
```typescript
// In agent.ts entry function:
export default defineAgent({
  entry: async (ctx: JobContext) => {
    try {
      await ctx.connect();
    } catch (err) {
      console.error('[Fred Voice Agent] Failed to connect:', err);
      return;
    }

    const participant = await ctx.waitForParticipant();

    // ... create session ...

    ctx.addShutdownCallback(async () => {
      console.log('[Fred Voice Agent] Shutting down...');
      await session.close();
    });

    await session.start({ agent, room: ctx.room });
    await new Promise((resolve) => setTimeout(resolve, 1000));
    session.say("Hey, Fred Cary here...");
  },
});
```

### Anti-Patterns to Avoid
- **Don't use `@livekit/components-react` LiveKitRoom for this modal:** The manual Room API is already working with correct event handlers. Migrating to components-react would be scope creep and risk regressions.
- **Don't build custom audio recording:** LiveKit EgressClient handles this natively with cloud storage upload.
- **Don't store recordings in the Next.js app filesystem:** Use S3-compatible storage (Supabase Storage or standalone S3 bucket).
- **Don't rely on client-side transcript as the source of truth:** The client transcript can be incomplete if the user disconnects. Store transcripts server-side via webhooks or worker data events.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Call recording | Custom WebRTC MediaRecorder | `EgressClient.startRoomCompositeEgress()` with `audioOnly: true` | Handles audio mixing, storage upload, format encoding. Edge cases with track subscription timing. |
| Reconnection logic | Custom WebSocket reconnect | LiveKit SDK built-in reconnection + `RoomEvent.Reconnecting/Reconnected` | SDK handles ICE restart, signal reconnection, track re-publishing automatically |
| Transcript storage | Custom real-time DB writes from client | Worker `publishData` + webhook persistence | Client transcript is unreliable (can miss data on disconnect) |
| Audio playback of remote tracks | Custom AudioContext management | `track.attach()` / `track.detach()` (already implemented) | SDK handles browser autoplay policies, track lifecycle |

## Common Pitfalls

### Pitfall 1: Remote Audio Not Playing (ALREADY FIXED)
**What goes wrong:** No `RoomEvent.TrackSubscribed` handler to attach remote audio tracks.
**Status:** FIXED in current `call-fred-modal.tsx` (lines 178-190). Handler attaches audio element to document.body and detaches on unsubscribe.
**Verification:** Confirm via manual test that Fred's voice is audible in Chrome, Safari, and Mobile Safari.

### Pitfall 2: Docker Container Won't Start (ALREADY FIXED)
**What goes wrong:** `npm ci --omit=dev` skips `tsx` devDependency, `npx tsx` CMD fails.
**Status:** FIXED in current Dockerfile (line 7: `RUN npm ci` without `--omit=dev`). Container installs all deps including tsx.
**Verification:** `docker build -t fred-voice -f workers/voice-agent/Dockerfile . && docker run fred-voice` should start without crash.
**Remaining issue:** Installing all deps bloats the image. Consider pre-compiling TypeScript as a production optimization (not blocking).

### Pitfall 3: Room Name Format Breaks Webhook Tracking (ALREADY FIXED)
**What goes wrong:** Webhook `extractUserIdFromRoom()` expects userId first in room name.
**Status:** FIXED in current `app/api/fred/call/route.ts` (line 85: `${userId}_fred-call_${Date.now()}`). Comment explicitly documents the convention.
**Verification:** After a voice call, `SELECT host_user_id FROM video_rooms WHERE room_name LIKE '%fred-call%'` should have non-null userId.

### Pitfall 4: Greeting Race Condition
**What goes wrong:** `session.say()` called before audio output track is ready, greeting silently dropped.
**Status:** PARTIALLY FIXED -- current agent.ts has a 1-second delay before `say()`. This is a heuristic; a more robust approach would listen for `AgentStateChanged` event.
**How to avoid:** The 1-second delay is pragmatic and likely sufficient. Monitor Sentry for reports of missing greeting.

### Pitfall 5: No Shutdown Callback on Worker
**What goes wrong:** Worker termination (Railway restart, room deletion) leaks OpenAI connections.
**Status:** FIXED in current `agent.ts` (lines 108-112). Shutdown callback calls `session.close()`.
**Verification:** Check Railway logs for clean shutdown messages on redeploy.

### Pitfall 6: Metadata Overwrite in Webhook
**What goes wrong:** `room_finished` webhook overwrites `room_started` metadata instead of merging.
**Status:** NOT FIXED. Webhook line 118-128 sets new metadata object, losing `max_participants` from `room_started`.
**How to fix:** Read existing metadata first, merge with new fields.

### Pitfall 7: No Transcript Size Limit
**What goes wrong:** Malicious/buggy client sends huge transcript array to summary endpoint, causing expensive LLM calls.
**Status:** NOT FIXED. `summary/route.ts` transcript array has no `.max()` Zod constraint.
**How to fix:** Add `.max(500)` to transcript array schema.

### Pitfall 8: Fragile Agent Identity Detection
**What goes wrong:** `extractUserIdFromIdentity()` returns null for any identity starting with "fred", including real users named Fred.
**Status:** NOT FIXED. Webhook line 300 uses heuristic prefix check.
**How to fix:** Check for exact agent name `fred-cary-voice` or check metadata for `"type":"ai_agent"`.

### Pitfall 9: Egress Requires Cloud Storage Configuration
**What goes wrong:** EgressClient needs S3-compatible storage credentials to upload recordings.
**Status:** NOT IMPLEMENTED. No storage configured for recordings.
**How to handle:** Use Supabase Storage (S3-compatible) or a dedicated S3 bucket. Environment variables needed: `S3_ACCESS_KEY`, `S3_SECRET`, `S3_BUCKET`, `S3_REGION`, `S3_ENDPOINT`.

### Pitfall 10: LiveKit Cloud Egress Service Must Be Enabled
**What goes wrong:** Egress API calls fail if egress service is not enabled in the LiveKit Cloud project.
**Status:** UNKNOWN. Need to verify LiveKit Cloud dashboard settings.
**How to handle:** Check LiveKit Cloud project settings for egress availability. Self-hosted egress requires a separate egress worker deployment; LiveKit Cloud includes it.

## Code Examples

### Example 1: Reconnection UI State (client-side)
```typescript
// Source: https://docs.livekit.io/reference/client-sdk-js/enums/RoomEvent.html
// Add to call-fred-modal.tsx alongside existing event handlers

const [connectionStatus, setConnectionStatus] = useState<'connected' | 'reconnecting'>('connected');

// In handleStartCall, after room creation:
room.on(RoomEvent.Reconnecting, () => {
  setConnectionStatus('reconnecting');
});

room.on(RoomEvent.Reconnected, () => {
  setConnectionStatus('connected');
});

// In JSX, when callState === 'in-call':
{connectionStatus === 'reconnecting' && (
  <div className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 text-xs text-center py-1 rounded">
    Reconnecting...
  </div>
)}
```

### Example 2: Audio-Only Recording via EgressClient (server-side)
```typescript
// Source: livekit-server-sdk v2.15.0 EgressClient.d.ts (verified in node_modules)
import { EgressClient } from 'livekit-server-sdk';
import { EncodedFileOutput, EncodedFileType } from '@livekit/protocol';

const egressClient = new EgressClient(httpUrl, apiKey, apiSecret);

// Start recording when room is created
const fileOutput = new EncodedFileOutput({
  fileType: EncodedFileType.OGG,
  filepath: `voice-recordings/${roomName}.ogg`,
  output: {
    case: 's3',
    value: {
      accessKey: process.env.RECORDING_S3_ACCESS_KEY!,
      secret: process.env.RECORDING_S3_SECRET!,
      bucket: process.env.RECORDING_S3_BUCKET!,
      region: process.env.RECORDING_S3_REGION!,
    },
  },
});

const egressInfo = await egressClient.startRoomCompositeEgress(
  roomName,
  fileOutput,
  { audioOnly: true }
);

// Store egressInfo.egressId to stop/query later
```

### Example 3: Persist Transcript Server-Side
```typescript
// In the webhook handler (room_finished event), save final transcript
// Or better: in the summary route, save transcript to a dedicated table

const { error } = await supabase
  .from('call_recordings')
  .upsert({
    room_name: roomName,
    user_id: hostUserId,
    transcript: transcriptEntries,
    recording_url: recordingUrl, // from egress completion webhook
    duration_seconds: durationSeconds,
    created_at: new Date().toISOString(),
  }, { onConflict: 'room_name' });
```

### Example 4: Fix Webhook Metadata Merge
```typescript
// In room_finished handler, merge metadata instead of overwrite
const { data: existingRoom } = await supabase
  .from('video_rooms')
  .select('id, started_at, metadata')
  .eq('room_name', roomName)
  .maybeSingle();

const mergedMetadata = {
  ...(existingRoom?.metadata || {}),
  livekit_sid: event.room?.sid,
  duration_seconds: durationSeconds,
};

await supabase
  .from('video_rooms')
  .update({
    status: 'ended',
    ended_at: now,
    metadata: mergedMetadata,
  })
  .eq('room_name', roomName);
```

### Example 5: Worker Error Handling
```typescript
// Source: @livekit/agents v1.0.43 type definitions (verified)
export default defineAgent({
  entry: async (ctx: JobContext) => {
    try {
      await ctx.connect();
    } catch (err) {
      console.error('[Fred Voice Agent] Failed to connect:', err);
      return; // Exit cleanly, worker can pick up next job
    }

    let participant;
    try {
      participant = await ctx.waitForParticipant();
    } catch (err) {
      console.error('[Fred Voice Agent] Participant wait failed:', err);
      return;
    }

    console.log(`[Fred Voice Agent] Participant joined: ${participant.identity}`);
    // ... rest of agent setup
  },
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual Room API without audio handling | `RoomEvent.TrackSubscribed` + `track.attach()` | Already in codebase | Users can hear Fred (P0 fix) |
| `npm ci --omit=dev` in Dockerfile | `npm ci` (all deps) | Already in codebase | Docker container starts |
| `fred-call_${userId}_${ts}` room name | `${userId}_fred-call_${ts}` room name | Already in codebase | Webhook tracking works |
| No shutdown callback | `ctx.addShutdownCallback()` | Already in codebase | Clean worker shutdown |
| No agent join timeout | 30-second timeout with ParticipantConnected clear | Already in codebase | Error shown if agent fails to join |
| No disconnect handler | `RoomEvent.Disconnected` handler | Already in codebase | User sees error on disconnect |
| No reconnection UI | Need to add `RoomEvent.Reconnecting/Reconnected` | NOT YET DONE | Graceful network interruption handling |
| No call recording | Need to add EgressClient audio-only recording | NOT YET DONE | Post-call playback |
| Client-only transcript | Need server-side persistence | NOT YET DONE | Reliable transcript storage |

**What's already been fixed (verified in source code):**
1. Remote audio track handling (call-fred-modal.tsx:178-190)
2. Docker `--omit=dev` removed (Dockerfile:7)
3. Room name format corrected (route.ts:85)
4. Shutdown callback added (agent.ts:108-112)
5. Greeting delay added (agent.ts:120)
6. Agent join timeout (call-fred-modal.tsx:244-263)
7. Disconnect handler (call-fred-modal.tsx:193-201)
8. Topic filter on DataReceived (call-fred-modal.tsx:207)
9. Redundant STT/LLM/TTS removed from AgentSession (agent.ts:81)

**What remains to be done:**
1. Reconnection UI (Reconnecting/Reconnected events)
2. Call recording via EgressClient
3. Server-side transcript persistence
4. Webhook metadata merge fix
5. Transcript size limit in summary route
6. Agent identity detection improvement
7. Webhook logging (withLogging wrapper)
8. Production Docker optimization (optional: pre-compile TS)
9. Verify all fixes work end-to-end in production
10. Database schema for call_recordings table (if not exists)

## Open Questions

1. **LiveKit Cloud Egress Availability**
   - What we know: EgressClient API is available in livekit-server-sdk v2.15.0
   - What's unclear: Whether egress is enabled in the project's LiveKit Cloud plan
   - Recommendation: Check LiveKit Cloud dashboard. If not available, defer recording to a later phase. Recording is valuable but not blocking for the core voice functionality.

2. **S3 Storage for Recordings**
   - What we know: Egress requires S3-compatible storage for file output
   - What's unclear: Whether Supabase Storage can be used as S3-compatible endpoint, or if a dedicated S3 bucket is needed
   - Recommendation: Use Supabase Storage if it exposes an S3-compatible API, otherwise provision a minimal S3 bucket. This needs investigation during implementation.

3. **Transcript Completeness**
   - What we know: Worker publishes transcript via `publishData`; client receives and displays it; summary route receives client-sent transcript
   - What's unclear: Whether the worker should also persist transcripts directly (bypassing client)
   - Recommendation: Persist from the summary route (already has the full transcript) into a dedicated table. The worker is a secondary source.

4. **Database Schema for Recordings**
   - What we know: `coaching_sessions` and `video_rooms` tables exist for call tracking
   - What's unclear: Whether a new `call_recordings` table is needed or if recording URL can be stored in existing tables
   - Recommendation: Add `recording_url` and `transcript_json` columns to `coaching_sessions` table to keep it simple.

## Sources

### Primary (HIGH confidence)
- `components/dashboard/call-fred-modal.tsx` -- verified current source code with all P0/P1 fixes
- `workers/voice-agent/agent.ts` -- verified current source code with shutdown callback
- `workers/voice-agent/Dockerfile` -- verified `npm ci` without `--omit=dev`
- `app/api/fred/call/route.ts` -- verified room name format `${userId}_fred-call_${Date.now()}`
- `app/api/livekit/webhook/route.ts` -- verified extractUserIdFromRoom logic
- `node_modules/livekit-server-sdk/dist/EgressClient.d.ts` -- verified EgressClient API surface
- `node_modules/livekit-server-sdk/dist/RoomServiceClient.d.ts` -- verified CreateOptions.egress field
- `.planning/VOICE-UI-AUDIT.md` -- 9 findings, 1 CRITICAL, 2 HIGH
- `.planning/VOICE-API-AUDIT.md` -- 13 findings, 2 HIGH
- `.planning/VOICE-WORKER-AUDIT.md` -- 10 findings, 3 HIGH
- `.planning/DEPLOY-VERIFY-2026-02-18-pass4-voice-e2e.md` -- 12/12 voice call E2E tests passing

### Secondary (MEDIUM confidence)
- [LiveKit JS Client SDK RoomEvent reference](https://docs.livekit.io/reference/client-sdk-js/enums/RoomEvent.html) -- reconnection event names
- [LiveKit Connecting docs](https://docs.livekit.io/home/client/connect/) -- reconnection behavior
- [LiveKit Room Composite Egress docs](https://docs.livekit.io/home/egress/room-composite/) -- audio-only recording
- [LiveKit Egress examples](https://docs.livekit.io/home/egress/examples/) -- EgressClient code patterns
- [LiveKit Session Recording docs](https://docs.livekit.io/agents/ops/recording/) -- agent session recording overview

### Tertiary (LOW confidence)
- LiveKit Cloud egress availability for this specific project -- needs verification

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries verified in node_modules, versions confirmed in package.json
- Bug fixes status: HIGH -- all 3 CRITICAL fixes verified in current source code
- Reconnection pattern: HIGH -- RoomEvent enum verified in SDK types
- Recording/Egress: MEDIUM -- API verified in SDK, but cloud availability and storage config need validation
- Remaining issues: HIGH -- cross-referenced across 3 audit reports with line numbers

**Research date:** 2026-02-19
**Valid until:** 2026-03-19 (stable -- LiveKit SDK is not rapidly changing)
