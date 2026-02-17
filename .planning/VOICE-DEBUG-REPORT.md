# Voice Agent Debug Report

**Date:** 2026-02-16
**Branch:** `ralph/phase-47-community-data-layer-consent`
**Team:** voice-debug (agent-dispatcher + backend-fixer)

## Summary

Fixed the critical launch blocker: the Fred Cary voice agent never auto-joined rooms created by `/api/fred/call`. Users would initiate a call and sit alone indefinitely.

---

## What Was Broken

### 1. Agent Never Dispatched (CRITICAL)

**Root cause:** `/api/fred/call/route.ts` only generated a user access token but never:
- Created the room on LiveKit's server
- Dispatched the voice agent to join the room

The `@livekit/agents` worker registers with `agentName: 'fred-cary-voice'`, which means it requires **explicit dispatch** -- it will NOT auto-join arbitrary rooms. Without a dispatch call, the worker never receives a job for the room.

**File:** `app/api/fred/call/route.ts`

### 2. Call Fred Button Not Wired (UI Gap)

**Root cause:** `components/dashboard/call-fred-modal.tsx` (482 lines, fully built) was never imported or rendered in any dashboard page. Users had no way to initiate a voice call.

**Files:** `app/dashboard/page.tsx`, `components/mobile/mobile-home.tsx`

### 3. Voice Agent Worker Type Errors

**Root cause:** `workers/voice-agent/agent.ts` had SDK API mismatches with `@livekit/agents` v1.0.43:
- `AgentSession()` called with no arguments (constructor requires `AgentSessionOptions`)
- Event names passed as raw strings instead of `AgentSessionEventTypes` enum values
- `ChatMessage.content` accessed with incorrect `.filter(c => c.type === 'text')` pattern (should use `.textContent` getter)

**File:** `workers/voice-agent/agent.ts`

### 4. Post-Call Summary Used Regex (Backend)

**Root cause:** The summary endpoint used regex-based extraction instead of LLM generation. Fixed by backend-fixer (Task #3).

**File:** `app/api/fred/call/summary/route.ts`

### 5. Webhook Lacked Business Logic (Backend)

**Root cause:** The LiveKit webhook handler at `/api/livekit/webhook/route.ts` only logged events without implementing room lifecycle tracking or analytics. Fixed by backend-fixer (Task #4).

**File:** `app/api/livekit/webhook/route.ts`

---

## What Was Fixed

### Fix 1: Explicit Agent Dispatch (`app/api/fred/call/route.ts`)

Added three-step flow:
1. **Room creation** via `RoomServiceClient.createRoom()` -- creates the room on LiveKit before the client connects, with `emptyTimeout` and `maxParticipants: 2`
2. **Agent dispatch** via `AgentDispatchClient.createDispatch()` -- explicitly dispatches `fred-cary-voice` to the room
3. **User token generation** -- unchanged

New imports: `AgentDispatchClient`, `RoomServiceClient` from `livekit-server-sdk`.
New helper: `getLivekitHttpUrl()` to convert `wss://` to `https://` for server SDK clients.
Constant: `FRED_AGENT_NAME = "fred-cary-voice"` matching the worker's registration.

Agent name verified consistent across:
- `app/api/fred/call/route.ts` (`FRED_AGENT_NAME`)
- `workers/voice-agent/index.ts` (`agentName: 'fred-cary-voice'`)
- `workers/voice-agent/livekit.toml` (`name = "fred-cary-voice"`)

### Fix 2: Call Fred Button in Dashboard (`app/dashboard/page.tsx`, `components/mobile/mobile-home.tsx`)

**Desktop:** Added "Call Fred" button in the dashboard header (top-right). Opens `CallFredModal` on click. Tier-gated to Pro+ users.

**Mobile:** Added full-width "Call Fred" button above the "Start Check-In" CTA. Same tier gating. When Call Fred is shown, the Check-In button switches to `outline` variant.

Both views import:
- `CallFredModal` from `@/components/dashboard/call-fred-modal`
- `UserTier` from `@/lib/constants`
- `useTier` from `@/lib/context/tier-context`

### Fix 3: Voice Agent Worker Types (`workers/voice-agent/agent.ts`)

- Extracted STT/LLM/TTS instances to pass to both `VoiceAgent` and `AgentSession`
- `AgentSession` now receives `{ stt, llm, tts }` options object
- Event handlers use `AgentSessionEventTypes.UserInputTranscribed`, `.ConversationItemAdded`, `.Error`, `.Close` enum values
- Conversation item text extraction uses `ev.item.textContent` getter (correct for `ChatMessage`)

---

## Verification Results

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` (Next.js) | PASS (2 pre-existing errors in `layout.tsx`, unrelated) |
| `npm run build` | PASS (compiled with 1 pre-existing warning in `global-error.tsx`) |
| `npm run worker:voice:build` | 1 pre-existing error (`window` in `lib/env.ts` -- transitive include from worker tsconfig) |
| Agent dispatch API types | PASS |
| UI components render | PASS (build succeeds) |

### Pre-existing Issues (Not Fixed)

1. **`app/dashboard/layout.tsx:310,323`** -- `stage: string | null | undefined` not assignable to `string | null`. Pre-existing type mismatch.
2. **`lib/env.ts:82`** -- `window` reference in worker build. The worker tsconfig includes `lib/voice-agent.ts` which transitively imports `lib/supabase/server` -> `lib/env.ts`. The `typeof window` guard works at runtime but TypeScript without DOM lib flags it.

---

## Production Environment Setup Required

### LiveKit Configuration

The following environment variables must be set for voice calls to work:

```
LIVEKIT_API_KEY=<from LiveKit Cloud dashboard>
LIVEKIT_API_SECRET=<from LiveKit Cloud dashboard>
LIVEKIT_URL=wss://<project>.livekit.cloud
NEXT_PUBLIC_LIVEKIT_URL=wss://<project>.livekit.cloud
OPENAI_API_KEY=<for STT/LLM/TTS in the voice agent>
```

### Voice Agent Worker Deployment

The voice agent worker (`workers/voice-agent/index.ts`) must run as a separate process:

- **Development:** `npm run worker:voice` (uses tsx, connects to LiveKit Cloud)
- **Production:** Deploy as a standalone service (Railway, Fly.io, or EC2). The worker connects to LiveKit Cloud via WebSocket and receives dispatch jobs.

The worker does NOT run inside the Next.js process -- it is a separate long-running process that must be deployed independently.

### LiveKit Cloud Setup

1. Create a LiveKit Cloud project at https://cloud.livekit.io
2. Note the project URL (e.g., `wss://sahara-ppvs24oj.livekit.cloud`)
3. Generate API key and secret from the dashboard
4. Set environment variables in both the Next.js app and the worker

### Webhook Configuration

Configure a LiveKit webhook endpoint in the LiveKit Cloud dashboard:
- URL: `https://your-domain.com/api/livekit/webhook`
- Events: Room Started, Room Finished, Participant Joined, Participant Left

---

## Remaining Manual Steps for Launch

### Before First Voice Call Works

1. **Set LiveKit env vars** in Vercel (or wherever Next.js is deployed): `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, `LIVEKIT_URL`, `NEXT_PUBLIC_LIVEKIT_URL`
2. **Set OpenAI env var** for the worker: `OPENAI_API_KEY` (used by Whisper STT, GPT-4o LLM, and TTS)
3. **Deploy the voice agent worker** as a standalone long-running process (Railway, Fly.io, or EC2). It must have the same `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, `LIVEKIT_URL`, and `OPENAI_API_KEY` env vars
4. **Verify worker connects** -- on startup it should log `[env] Loaded .env.local` and connect to LiveKit Cloud. Check LiveKit Cloud dashboard under "Agents" to confirm `fred-cary-voice` appears as registered
5. **Configure LiveKit webhook** in the LiveKit Cloud dashboard pointing to `https://your-domain.com/api/livekit/webhook`

### Smoke Test Checklist

- [ ] Log in as a Pro or Studio tier user
- [ ] Navigate to dashboard -- "Call Fred" button should be visible
- [ ] Click "Call Fred" -- modal opens with "Start Call" button
- [ ] Click "Start Call" -- should transition to "Connecting..." then "On Call with Fred"
- [ ] Fred should greet you within a few seconds ("Hey, Fred Cary here...")
- [ ] Speak -- Fred should respond with voice
- [ ] Transcript entries should appear in the data channel
- [ ] Click end call -- post-call summary should generate via LLM
- [ ] Free tier users should NOT see the "Call Fred" button

### Known Limitations

- The worker must be running 24/7 for calls to work. If it crashes or is not deployed, `AgentDispatchClient.createDispatch()` will succeed (the dispatch is queued) but no agent will join the room
- The `emptyTimeout` on rooms means abandoned rooms (where user never connects) are cleaned up after 5-10 minutes
- Post-call summary quality depends on transcript data being published via the data channel. If the agent crashes mid-call, the transcript may be incomplete

---

## Files Changed (by agent-dispatcher)

| File | Change |
|------|--------|
| `app/api/fred/call/route.ts` | Added room creation + agent dispatch |
| `app/dashboard/page.tsx` | Added Call Fred button + modal (desktop) |
| `components/mobile/mobile-home.tsx` | Added Call Fred button + modal (mobile) |
| `workers/voice-agent/agent.ts` | Fixed AgentSession constructor + event types |

## Files Changed (by backend-fixer)

| File | Change |
|------|--------|
| `app/api/fred/call/summary/route.ts` | LLM-generated post-call summaries |
| `app/api/livekit/webhook/route.ts` | Webhook business logic for room lifecycle |
