# Voice Call UI Audit Report

**Auditor:** ui-auditor
**Date:** 2026-02-18
**Scope:** CallFredModal component, dashboard/mobile integration, LiveKit client SDK usage, tier gating

---

## 1. State Machine Analysis

### Defined States

| State | Description |
|-------|------------|
| `idle` | Modal open, awaiting user action |
| `connecting` | POST /api/fred/call sent, awaiting response + Room.connect() |
| `in-call` | Connected to LiveKit room, mic active, timer running |
| `ending` | Room disconnected, fetching summary from /api/fred/call/summary |
| `ended` | Summary displayed (or "Call completed" fallback) |
| `error` | Any failure during connection |

### Transitions

```
idle --[Start Call]--> connecting
connecting --[success]--> in-call
connecting --[failure]--> error
in-call --[End Call / max duration]--> ending
ending --[summary fetched/failed]--> ended
error --[Retry]--> connecting
error --[Close]--> (modal closes)
ended --[Done/Close]--> (modal closes)
```

### Verdict: SOUND
The state machine is well-defined and covers the primary happy path and error recovery. However, there are notable gaps documented below.

---

## 2. LiveKit Client SDK Usage

### Version
- `livekit-client`: ^2.16.1
- `@livekit/components-react`: ^2.9.17 (installed but NOT used by CallFredModal)

### Connection Method
The modal uses **manual Room construction** (`new Room()`) and `room.connect(url, token)` rather than the higher-level `@livekit/components-react` hooks (`LiveKitRoom`, `useRoom`, etc.). This is a valid approach but means the component is responsible for all lifecycle management.

**File:** `components/dashboard/call-fred-modal.tsx:160-187`

```typescript
const room = new Room();
roomRef.current = room;
// ... event listener setup ...
await room.connect(data.url, data.token);
await room.localParticipant.setMicrophoneEnabled(true);
```

### Token Flow
1. Modal POSTs to `/api/fred/call` with `{ callType }`
2. API creates LiveKit room, dispatches voice agent, generates JWT token
3. Response: `{ token, url, room: roomName, callType, maxDuration }`
4. Modal uses `data.url` (server LIVEKIT_URL, typically `wss://...`) and `data.token` to connect

**Note:** The API returns `LIVEKIT_URL` (server-side env), NOT `NEXT_PUBLIC_LIVEKIT_URL`. This is correct since the URL comes from the server response, not the client environment.

### Audio Track Handling

**Local mic:** Published via `room.localParticipant.setMicrophoneEnabled(true)` after connection.

**Remote agent audio:** The component does NOT explicitly subscribe to or handle remote audio tracks. LiveKit's default behavior auto-subscribes to remote tracks, but there is no code to:
- Attach remote audio to an `<audio>` element
- Handle `RoomEvent.TrackSubscribed` for the agent's audio
- Handle `AudioPlaybackStatusChanged` for autoplay policy issues

**This is a potential CRITICAL issue** -- see Finding #1 below.

### Data Channel / Transcript

**Voice agent** (`workers/voice-agent/agent.ts:56-68`) publishes transcript data with:
```typescript
ctx.room.localParticipant?.publishData(data, {
  reliable: true,
  topic: 'transcript',
});
```

**Modal handler** (`call-fred-modal.tsx:164-179`):
```typescript
room.on(RoomEvent.DataReceived, (payload: Uint8Array) => {
  // Parses JSON from payload
});
```

The `RoomEvent.DataReceived` signature in livekit-client v2 is:
```
(payload: Uint8Array, participant: Participant, kind: DataPacket_Kind, topic?: string)
```

The modal only destructures `payload` and ignores `topic`. It does not filter by `topic: 'transcript'`. Currently this works because the agent only sends transcript data, but it's fragile -- see Finding #3.

---

## 3. Findings

### FINDING #1: No Remote Audio Track Handling [CRITICAL]

**File:** `components/dashboard/call-fred-modal.tsx`
**Lines:** 159-199

The modal connects to the LiveKit room and enables the local mic, but there is **no code to handle the remote participant's (Fred agent's) audio track**. The component:

1. Does NOT listen for `RoomEvent.TrackSubscribed`
2. Does NOT create or attach an `<audio>` element for remote audio playback
3. Does NOT handle browser autoplay policy (`RoomEvent.AudioPlaybackStatusChanged`)

**Impact:** In many browsers (especially mobile), auto-subscribed remote audio tracks are NOT automatically played. Without explicitly attaching the remote audio track to an HTMLAudioElement, the user may connect to the call but **hear nothing from Fred**.

LiveKit's `@livekit/components-react` handles this automatically, but since the modal uses the raw `livekit-client` SDK, it must manage audio playback manually.

**Expected fix pattern:**
```typescript
room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
  if (track.kind === Track.Kind.Audio) {
    const audioElement = track.attach();
    document.body.appendChild(audioElement);
  }
});

room.on(RoomEvent.TrackUnsubscribed, (track) => {
  track.detach().forEach(el => el.remove());
});
```

**Severity: CRITICAL** -- The call may appear connected but produce no agent audio.

---

### FINDING #2: No Agent Join Timeout [HIGH]

**File:** `components/dashboard/call-fred-modal.tsx:140-205`

After `room.connect()` succeeds and the mic is enabled, the state transitions to `in-call`. However, there is no verification that the **voice agent has actually joined the room**. If agent dispatch fails silently (worker down, dispatch queue full, etc.), the user will sit in an `in-call` state with:
- Timer counting up
- No agent audio
- No transcript updates
- No indication anything is wrong

**Expected:** Listen for `RoomEvent.ParticipantConnected` with a timeout (e.g., 15-30 seconds). If no remote participant joins within the timeout, transition to `error` state with a message like "Fred couldn't join the call. Please try again."

**Severity: HIGH** -- Silent failure leads to confusing UX.

---

### FINDING #3: DataReceived Handler Lacks Topic Filter [MEDIUM]

**File:** `components/dashboard/call-fred-modal.tsx:164`

The `RoomEvent.DataReceived` handler processes ALL data packets without filtering by `topic`. The voice agent publishes with `topic: 'transcript'`, but if other data packets are sent in the room (future features, LiveKit internal, etc.), they will be parsed and potentially added as transcript entries.

**Expected:**
```typescript
room.on(RoomEvent.DataReceived, (payload, participant, kind, topic) => {
  if (topic !== 'transcript') return;
  // ... parse and add entry
});
```

**Severity: MEDIUM** -- Works now but fragile. Could cause phantom transcript entries if data channel usage expands.

---

### FINDING #4: No RoomEvent.Disconnected Handler [HIGH]

**File:** `components/dashboard/call-fred-modal.tsx`

The component does not listen for `RoomEvent.Disconnected`. If the room disconnects unexpectedly (network drop, server-side room deletion, `emptyTimeout` triggered, duplicate identity), the UI will remain in `in-call` state with:
- Timer still counting
- Mute/End buttons still visible
- No indication the connection was lost

**Expected:** Listen for `RoomEvent.Disconnected` and transition to an appropriate state (error with reconnect option, or ended with explanation).

```typescript
room.on(RoomEvent.Disconnected, (reason) => {
  setCallState("error");
  setError("Call disconnected unexpectedly. Please try again.");
});
```

**Severity: HIGH** -- User has no feedback on connection loss.

---

### FINDING #5: handleEndCall Missing from useEffect Dependencies [MEDIUM]

**File:** `components/dashboard/call-fred-modal.tsx:107-111`

```typescript
useEffect(() => {
  if (callState === "in-call" && seconds >= maxDuration) {
    handleEndCall();
  }
}, [seconds, callState, maxDuration]);
```

`handleEndCall` is not in the dependency array but is referenced inside the effect. This is a React hooks lint violation. Since `handleEndCall` is not wrapped in `useCallback`, it is recreated each render, and the stale closure may reference old state values (`transcriptEntries`, `seconds`, `roomNameRef`).

In practice, `handleEndCall` captures `seconds` and `transcriptEntries` via closure, so when the max-duration auto-end fires, it may use stale transcript data for the summary request.

**Severity: MEDIUM** -- Potential stale closure bug for auto-end summary.

---

### FINDING #6: Double-Click on Start Call Not Prevented [LOW]

**File:** `components/dashboard/call-fred-modal.tsx:330-336`

The "Start Call" button does not check `callState === "connecting"` to disable itself. If a user double-clicks rapidly before the state transitions to "connecting" (which happens synchronously at the top of `handleStartCall`), two parallel API calls and room connections could be initiated.

The `setCallState("connecting")` at the top of `handleStartCall` is synchronous, so React batching should prevent most double-click scenarios. However, a `disabled={callState !== "idle"}` prop would be more robust.

**Severity: LOW** -- Unlikely in practice due to React state batching.

---

### FINDING #7: Summary Fetch Failure is Silent [LOW]

**File:** `components/dashboard/call-fred-modal.tsx:230-264`

When the summary API call fails (non-200 response or network error), the component transitions to `ended` with `callSummary === null`, showing a generic "Call completed." message. The user gets no indication that a summary was expected but failed to generate.

The `response.ok` check on line 251 only logs a warning for network errors but does nothing for non-200 responses -- they are silently ignored.

**Severity: LOW** -- Graceful degradation is acceptable, but a toast notification or small message ("Summary unavailable") would improve UX.

---

### FINDING #8: Modal Cannot Be Closed During Active Call [LOW]

**File:** `components/dashboard/call-fred-modal.tsx:267-273`

```typescript
const handleClose = () => {
  if (callState === "in-call") {
    return; // Don't allow closing during active call
  }
  onOpenChange(false);
};
```

This prevents closing during `in-call` but does NOT prevent closing during `connecting` or `ending`. Closing during `connecting` will leave a dangling `fetch` and potentially an orphaned LiveKit room connection (the unmount cleanup will fire, but the async `handleStartCall` may still be running). Closing during `ending` will abort the summary display.

Additionally, there is no visual indicator to the user explaining why the dialog won't close during a call (e.g., no "End the call first" tooltip or disabled overlay close).

**Severity: LOW** -- The cleanup effect on unmount handles room disconnect, mitigating the worst case.

---

### FINDING #9: Timer Doesn't Reset on Retry After Error [LOW]

**File:** `components/dashboard/call-fred-modal.tsx:124-138`

Timer reset happens when `open` changes (modal opens/closes), but not when `handleStartCall` is called for a retry. If a user hits error state at 0:03, then retries, the timer continues from the previous value until the modal is reopened.

Actually, looking more carefully, `resetTimer` is only called in the `open` effect. But `handleStartCall` does not call `resetTimer()`. Since the timer only ticks when `callState === "in-call"`, and the seconds accumulate, a retry would start the timer from where it left off (though it would likely be near 0 since the timer wasn't running during `error` state).

**Severity: LOW** -- Marginal impact since timer is paused during non-in-call states.

---

## 4. Tier Gating Verification

### Desktop Dashboard (`app/dashboard/page.tsx`)

```typescript
const { tier, refresh: refreshTier } = useTier();
const canCallFred = tier >= UserTier.PRO; // Line 32
```

- **Button visibility:** Line 181-189 -- Call Fred button only renders when `canCallFred` is true.
- **Modal rendering:** Line 224-229 -- `CallFredModal` only rendered when `canCallFred` is true.
- **Correct:** Uses `useTier()` from TierProvider context. UserTier.PRO = 1, so Pro (1) and Studio (2) both pass the `>=` check.

### Mobile Home (`components/mobile/mobile-home.tsx`)

```typescript
const { tier } = useTier();
const canCallFred = tier >= UserTier.PRO; // Line 70
```

- **Button visibility:** Line 189-197 -- Call Fred button only renders when `canCallFred`.
- **Modal rendering:** Line 244-249 -- Same conditional guard.
- **Button variant switching:** Line 201-210 -- "Start Check-In" uses `outline` variant when `canCallFred` (Call Fred is primary), `default` variant otherwise.
- **Correct:** Consistent with desktop implementation.

### Server-Side Tier Check (`app/api/fred/call/route.ts`)

```typescript
const userTier = await getUserTier(userId);
if (userTier < UserTier.PRO) {
  return createTierErrorResponse({ ... });
}
```

- **Correct:** Server validates tier independently, preventing bypass via direct API calls.

### Verdict: PASS
Tier gating is correctly implemented on both client (UI visibility) and server (API enforcement) sides. The numeric comparison (`>=`) is appropriate for the enum-based tier system.

---

## 5. Cleanup and Lifecycle

### Modal Close (not during call)
- `useEffect` on `open` change: disconnects room when `open` becomes false. (Line 131-137)
- `handleClose` prevents closing during `in-call`. (Line 267-273)

### Component Unmount
- `useEffect` cleanup: disconnects room on unmount. (Line 114-121)

### Manual End Call
- `handleEndCall` disconnects room before fetching summary. (Line 224-228)

### Gap: No cleanup for orphaned rooms if `handleStartCall` fetch is in-flight when modal closes. The abort controller pattern is not used for the POST /api/fred/call request.

---

## 6. Summary Table

| # | Finding | Severity | Category |
|---|---------|----------|----------|
| 1 | No remote audio track attachment | **CRITICAL** | LiveKit SDK |
| 2 | No agent join timeout | **HIGH** | UX Edge Case |
| 3 | DataReceived lacks topic filter | **MEDIUM** | LiveKit SDK |
| 4 | No RoomEvent.Disconnected handler | **HIGH** | Error Handling |
| 5 | handleEndCall missing from useEffect deps | **MEDIUM** | React Hooks |
| 6 | Double-click on Start Call not prevented | **LOW** | UX Edge Case |
| 7 | Summary fetch failure is silent | **LOW** | UX |
| 8 | Modal closable during connecting/ending | **LOW** | UX Edge Case |
| 9 | Timer doesn't reset on retry | **LOW** | UX |

### Priority Recommendation
1. **Fix #1 immediately** -- without remote audio attachment, the call feature is potentially non-functional.
2. **Fix #4 and #2** -- connection resilience is essential for production.
3. **Fix #3 and #5** -- correctness improvements.
4. **Address LOW items** as polish.

---

## 7. Package Versions

| Package | Version | Notes |
|---------|---------|-------|
| livekit-client | ^2.16.1 | Current stable. Manual Room API used correctly. |
| @livekit/components-react | ^2.9.17 | Installed but NOT used by CallFredModal. Could simplify audio handling if adopted. |
| @livekit/agents | ^1.0.43 | Server-side agent framework (worker). |
| @livekit/agents-plugin-openai | ^1.0.43 | Voice agent LLM/STT/TTS integration. |

---

## 8. Architecture Observation

The voice agent (`workers/voice-agent/agent.ts`) uses `@livekit/agents` v1.0.43 with the new `voice.Agent` / `AgentSession` pattern. The transcript is published via `publishData` with `topic: 'transcript'`. This is a clean separation between the agent worker and the client UI.

However, the client-side modal does not leverage `@livekit/components-react` which would provide:
- Automatic audio track management
- Built-in `useDataChannel` hook with topic filtering
- `AudioPlaybackStatusChanged` handling

Using `@livekit/components-react` with `<LiveKitRoom>` + `useDataChannel('transcript')` would eliminate Findings #1, #3, and parts of #4. This would be a worthwhile refactor.
