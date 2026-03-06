# Voice Integration Backend Debug Report

**Task:** AI-1415 — Test voice integration end-to-end across devices
**Date:** 2026-03-05
**Scope:** Backend API routes, voice worker, configuration, error handling

---

## Executive Summary

The backend voice infrastructure is mostly well-constructed, but has **two critical bugs** that will prevent the ElevenLabs TTS from working at all. The core LiveKit room creation and agent dispatch path (`POST /api/fred/call`) is correct. The issues are concentrated in the worker's ElevenLabs TTS configuration.

---

## Bug Inventory

### CRITICAL — ElevenLabs API key env var name mismatch

**File:** `workers/voice-agent/agent.ts` line 79, and `workers/voice-agent/docker-compose.yml`

**Problem:** The ElevenLabs plugin (`@livekit/agents-plugin-elevenlabs`) reads the key from `ELEVEN_API_KEY` (confirmed by reading `node_modules/@livekit/agents-plugin-elevenlabs/dist/tts.cjs` line 447):

```
const apiKey = opts.apiKey ?? process.env.ELEVEN_API_KEY;
if (!apiKey) {
  throw new Error(
    "ElevenLabs API key is required, either as argument or set ELEVEN_API_KEY environmental variable"
  );
}
```

The project stores the key as `ELEVENLABS_API_KEY` in `.env.local`. The worker's `.env.local` loader will set `ELEVENLABS_API_KEY` but the plugin looks for `ELEVEN_API_KEY`. The plugin will throw at startup and the voice agent will fail to initialize.

**Fix:** Add `ELEVEN_API_KEY` as an alias in `.env.local`:
```
ELEVEN_API_KEY="sk_cc9771cacdb9d9e2465cd7354dc7d3d56d1a8985ba5a82f0"
```
Or pass the key explicitly in the `TTS` constructor:
```typescript
const tts = new elevenlabs.TTS({
  voiceId: process.env.ELEVENLABS_VOICE_ID || 'fpxks3eObfRI1jkeCD2k',
  apiKey: process.env.ELEVENLABS_API_KEY,
});
```

### CRITICAL — ElevenLabs plugin peer dependency version mismatch

**File:** `package.json`, `package-lock.json`

**Problem:** The installed package versions are mismatched:
- `@livekit/agents@1.0.43`
- `@livekit/agents-plugin-openai@1.0.43` (peer: `@livekit/agents@1.0.43`) — OK
- `@livekit/agents-plugin-silero@1.0.43` (peer: `@livekit/agents@1.0.43`) — OK
- `@livekit/agents-plugin-elevenlabs@1.0.48` (peer: `@livekit/agents@1.0.48`) — MISMATCH

`npm list @livekit/agents` reports the elevenlabs plugin as `extraneous` and `invalid` due to the exact-version peer dependency. The `@livekit/agents` API changed between 1.0.43 and 1.0.48. The `AgentSession` constructor signature, `TTS` stream methods, and session event types may differ enough to cause runtime failures.

**Fix:** Pin all plugins to the same version. Either:
```bash
npm install @livekit/agents@1.0.48 @livekit/agents-plugin-openai@1.0.48 @livekit/agents-plugin-silero@1.0.48 @livekit/agents-plugin-elevenlabs@1.0.48
```
Or downgrade elevenlabs plugin:
```bash
npm install @livekit/agents-plugin-elevenlabs@1.0.43
```
(If 1.0.43 exists and includes ElevenLabs TTS support.)

### MEDIUM — ElevenLabs voice ID is hardcoded, ignores `ELEVENLABS_VOICE_ID` env var

**File:** `workers/voice-agent/agent.ts` line 79

**Problem:** The voice ID `fpxks3eObfRI1jkeCD2k` is hardcoded. The system env has `ELEVENLABS_VOICE_ID=bIHbv24MWmeRgasZH58o` (the correct Fred Sahara cloned voice from the commit message context). These are two different voice IDs. The hardcoded one may not be the correct/authorized one depending on which account's API key is active.

```typescript
// Current — hardcoded, ignores env
const tts = new elevenlabs.TTS({ voiceId: 'fpxks3eObfRI1jkeCD2k' });

// Should be — env-driven with fallback
const tts = new elevenlabs.TTS({
  voiceId: process.env.ELEVENLABS_VOICE_ID || 'fpxks3eObfRI1jkeCD2k',
  apiKey: process.env.ELEVENLABS_API_KEY,
});
```

### MEDIUM — `docker-compose.yml` missing ElevenLabs env vars

**File:** `workers/voice-agent/docker-compose.yml`

**Problem:** The docker-compose only passes four env vars to the container:
```yaml
environment:
  - LIVEKIT_API_KEY=${LIVEKIT_API_KEY}
  - LIVEKIT_API_SECRET=${LIVEKIT_API_SECRET}
  - LIVEKIT_URL=${LIVEKIT_URL}
  - OPENAI_API_KEY=${OPENAI_API_KEY}
```

`ELEVEN_API_KEY` (the name the plugin reads), `ELEVENLABS_API_KEY`, and `ELEVENLABS_VOICE_ID` are all absent. When deployed via Docker (or Railway), the worker will fail to initialize TTS because no ElevenLabs API key will be found.

**Fix:** Add to `docker-compose.yml`:
```yaml
  - ELEVEN_API_KEY=${ELEVENLABS_API_KEY}
  - ELEVENLABS_VOICE_ID=${ELEVENLABS_VOICE_ID}
```
And ensure the same vars are set in the Railway project environment.

---

## API Route Analysis

### `POST /api/fred/call` (LiveKit room creation + agent dispatch)

**File:** `app/api/fred/call/route.ts`

**Assessment: Correct.** The route properly:
1. Authenticates via `requireAuth()`
2. Validates request schema with Zod
3. Checks LiveKit env vars before use
4. Converts `wss://` URL to `https://` for server SDK (`getLivekitHttpUrl`)
5. Creates the room, optionally starts egress recording (non-blocking, silently skipped if S3 not configured)
6. Dispatches the agent via `AgentDispatchClient.createDispatch()`
7. Mints a participant JWT with correct grants

**Minor issue:** If `createDispatch()` throws (e.g., worker is not registered/connected to LiveKit), the entire route returns 500 with a generic "Failed to create call". The client gets no indication that the room was successfully created but the agent failed to dispatch. This means the user gets a room token that works but FRED never joins.

**Recommendation:** Separate room creation from dispatch. Return the token even if dispatch fails, and surface a specific `agentDispatched: false` flag to the client so the UI can show a warning.

### `POST /api/fred/whisper` (Whisper transcription)

**File:** `app/api/fred/whisper/route.ts`

**Assessment: Correct.** Validates `OPENAI_API_KEY`, checks file size limits, handles empty audio gracefully, and handles OpenAI 429 rate-limit errors specifically. No auth check on this route — any caller can post audio, though it's not behind a public URL that would be easily discoverable. Consider adding `requireAuth()` for completeness.

### `POST /api/fred/call/summary` (Post-call summary generation)

**File:** `app/api/fred/call/summary/route.ts`

**Assessment: Correct.** Auth-gated (Pro+), validates room ownership by checking `roomName.includes(userId)`, generates LLM summary with heuristic fallback, persists to `coaching_sessions` via service client, stores episodic memory. Non-blocking persistence means the response is not held up by DB failures.

### `POST /api/livekit/token` (General LiveKit token)

**File:** `app/api/livekit/token/route.ts`

**Assessment: Correct but more restrictive than `/api/fred/call`.** This route gates on Studio tier, while `/api/fred/call` allows all tiers. This is intentional — they serve different purposes (general video rooms vs. Fred coaching calls). Both sanitize room names and scope them to `userId`.

### `POST /api/livekit/webhook`

**File:** `app/api/livekit/webhook/route.ts`

**Assessment: Mostly correct.** Uses `WebhookReceiver` for signature verification. Handles `room_started`, `room_finished`, `participant_joined`, `participant_left`, and `egress_ended`.

**Minor issue 1:** `/api/livekit/webhook` is not in `WEBHOOK_PATHS` in `lib/api/cors.ts`. The middleware applies CORS headers to it. Since LiveKit sends webhooks server-to-server, CORS is irrelevant and this does not cause failures, but it is technically incorrect.

**Minor issue 2:** `video_rooms.host_user_id` is `UUID` type in the DB schema (`lib/db/migrations/015_video_calls.sql`), but `extractUserIdFromRoom()` returns a `string`. Supabase will coerce the string to UUID if it's in UUID format — and Supabase UUIDs are standard 36-char strings — so this works. But if `extractUserIdFromRoom()` returns `null` and the upsert sets `host_user_id: null`, that is fine (column allows null via `ON DELETE SET NULL`).

**Minor issue 3:** `coaching_sessions.user_id` is `TEXT` in the migration but the webhook upsert passes the string userId directly. This is consistent and correct.

---

## Voice Worker Analysis

### `workers/voice-agent/index.ts` — Entry point

**Assessment: Correct.** Loads `.env.local` before importing anything else. Uses `fileURLToPath` correctly for ESM. Passes `agentName: 'fred-cary-voice'` to `ServerOptions`, matching the constant in `/api/fred/call/route.ts`.

**Minor note:** The `.env.local` manual parser strips surrounding quotes but does not handle multiline values or values with embedded `=`. It will not correctly parse any complex value. For production, use `dotenv` package instead of hand-rolling the parser.

### `workers/voice-agent/agent.ts` — Agent definition

**Assessment: Contains the critical ELEVEN_API_KEY bug (see above), plus the issues listed below.**

**Issue: `session.start()` called before `ctx.connect()`**

```typescript
// Line 118-128 in agent.ts
await session.start({
  agent: new FredAgent(),
  room: ctx.room,
});

try {
  await ctx.connect();   // line 124
```

Reading `node_modules/@livekit/agents/dist/voice/agent_session.js` (line 198), `session.start()` internally calls `ctx.connect()` if the room is not yet connected:
```javascript
if (ctx) {
  if (room && ctx.room === room && !room.isConnected) {
    this.logger.debug("Auto-connecting to room via job context");
    tasks.push(ctx.connect());
  }
```

`ctx.connect()` is idempotent (returns early if `this.connected === true`), so the explicit call at line 124 is harmless. However, it's confusing and the LiveKit docs say to call `ctx.connect()` early. The current arrangement may cause the 10-second "did you forget to call ctx.connect()?" warning to not fire because `session.start()` handles it. No functional bug here, but the ordering is worth documenting.

**Recommendation:** Move `ctx.connect()` to before `session.start()` as the SDK docs recommend and to avoid confusion.

### `workers/voice-agent/tsconfig.json` — TypeScript config

**The `DOM` lib addition is noted:**

```json
"lib": ["ES2022", "DOM"]
```

**Assessment: Acceptable but not ideal.** `TextEncoder` is the reason — it's defined in both `DOM` and `@types/node`. Adding `DOM` pulls in browser-specific types (`window`, `document`, `navigator`, etc.) which could suppress type errors for accidental browser API usage in the Node.js worker. The correct fix would be to use `lib: ["ES2022"]` and rely on `@types/node` for `TextEncoder`, or add a `lib.dom.d.ts` exclude. However, since `tsx` is used at runtime (which does not typecheck), this is cosmetic and does not cause runtime failures.

### `workers/voice-agent/Dockerfile`

**Assessment:** The Dockerfile copies only `workers/voice-agent/` and `lib/fred-brain.ts`. The worker imports from `../../lib/fred-brain.ts` and `../../lib/voice-agent.ts`, but `lib/voice-agent.ts` is NOT copied. If the worker imports `voice-agent.ts`, the Docker build will fail at runtime.

Checking `agent.ts` imports: it only imports from `../../lib/fred-brain`, which is copied. The `lib/voice-agent.ts` is not imported by `agent.ts` or `index.ts`. The `tsconfig.json` includes it in compilation but not at runtime. So this is OK, but the tsconfig include is misleading.

---

## Environment Variable Audit

| Variable | Required By | Set In | Status |
|---|---|---|---|
| `LIVEKIT_URL` | API routes + worker | `.env.local` | OK |
| `LIVEKIT_API_KEY` | API routes + worker | `.env.local` | OK |
| `LIVEKIT_API_SECRET` | API routes + worker | `.env.local` | OK |
| `NEXT_PUBLIC_LIVEKIT_URL` | Client SDK | `.env.local` | OK |
| `OPENAI_API_KEY` | Whisper route + agent STT/LLM | `.env.local` | OK |
| `ELEVEN_API_KEY` | ElevenLabs TTS plugin | NOT SET ANYWHERE | **MISSING** |
| `ELEVENLABS_API_KEY` | (project convention) | `.env.local`, system env | Set but wrong name |
| `ELEVENLABS_VOICE_ID` | Should be used in agent.ts | System env | Set but ignored |
| `RECORDING_S3_ACCESS_KEY` | Optional egress recording | Not set | OK (optional) |
| `RECORDING_S3_SECRET` | Optional egress recording | Not set | OK (optional) |
| `RECORDING_S3_BUCKET` | Optional egress recording | Not set | OK (optional) |
| `RECORDING_S3_REGION` | Optional egress recording | Not set | OK (optional) |

---

## Error Handling Gaps

### When LiveKit is down
- `/api/fred/call`: `roomService.createRoom()` throws → caught → 500 "Failed to create call". No retry logic. Client must retry manually.
- `/api/livekit/webhook`: Fails to verify signature → 400. This is correct.

### When Whisper fails
- `/api/fred/whisper`: Catches `OpenAI.APIError` for 429, falls through to generic 500 for other errors. The error is logged. No client-visible detail on non-429 failures.

### When the agent worker is not running
- `/api/fred/call`: `dispatchClient.createDispatch()` will throw (LiveKit returns an error since no agent with name `fred-cary-voice` is registered). The route returns 500. The user gets no indication that the call could have started if the worker was running. Room token is not returned in this case. This is the most likely failure mode in a fresh deployment.

### When ElevenLabs TTS fails
- In the worker: `session.on(AgentSessionEventTypes.Error, ...)` logs the error. If TTS initialization fails (wrong API key or API key not set), the entire `entry()` function will throw during `new elevenlabs.TTS(...)`. The SDK wraps this and the agent job will fail. The room will remain open with no audio output from FRED. The user will hear silence.

### When user tier doesn't support voice
- `/api/fred/call`: Comments say "Voice calls now allowed for all tiers (client gating removed)". The `getUserTier()` call is made but the result is unused — no tier check. This appears intentional. All users can initiate voice calls.
- `/api/fred/call/summary`: Explicitly gates on `UserTier.PRO` (tier >= PRO required). Free users who somehow initiate a call will get a 403 when trying to generate a summary.

---

## Rate Limiting Assessment

Neither `/api/fred/call` nor `/api/fred/whisper` apply rate limiting. The call route creates a LiveKit room and dispatches an agent — two external API calls per request. A malicious or buggy client could spam these endpoints.

Recommendation: Apply Upstash Redis rate limiting (the infrastructure is already present in `lib/api/rate-limit.ts`) to both endpoints. Suggested limits: 5 calls/minute per user for `/api/fred/call`, 30 requests/minute per user for `/api/fred/whisper`.

---

## Database Schema Notes

The `coaching_sessions` table (migration 042) uses RLS tied to `auth.uid()`. The webhook uses the service client (bypasses RLS) which is correct for a server-side operation. The summary route also uses the service client — correct. There is no risk of RLS blocking webhook writes.

Migration 062 adds `recording_url`, `transcript_json`, `summary`, `decisions`, `next_actions`, `call_type`, and a unique constraint on `room_name`. The summary route depends on this migration being applied. If 062 has not been run, `UPDATE coaching_sessions SET transcript_json = ...` will fail silently (caught and logged as a warning, not a hard error).

---

## Fix Priority

| Priority | Issue | File |
|---|---|---|
| P0 | Add `ELEVEN_API_KEY` to `.env.local` (alias `ELEVENLABS_API_KEY`) | `.env.local` |
| P0 | Fix plugin version mismatch: pin all `@livekit/agents*` to same version | `package.json` |
| P1 | Pass `apiKey` and `voiceId` from env to `elevenlabs.TTS()` constructor | `workers/voice-agent/agent.ts` |
| P1 | Add `ELEVEN_API_KEY` (and `ELEVENLABS_VOICE_ID`) to `docker-compose.yml` | `workers/voice-agent/docker-compose.yml` |
| P2 | Return token even when agent dispatch fails; add `agentDispatched` field | `app/api/fred/call/route.ts` |
| P2 | Add `requireAuth()` to Whisper route | `app/api/fred/whisper/route.ts` |
| P3 | Add `/api/livekit/webhook` to `WEBHOOK_PATHS` | `lib/api/cors.ts` |
| P3 | Move `ctx.connect()` before `session.start()` in agent | `workers/voice-agent/agent.ts` |
| P3 | Add rate limiting to voice endpoints | `app/api/fred/call/route.ts`, `app/api/fred/whisper/route.ts` |
