# Voice Agent Worker -- Deep Audit Report

**Auditor:** worker-auditor
**Date:** 2026-02-18
**SDK Version:** @livekit/agents v1.0.43, @livekit/agents-plugin-openai v1.0.43
**Files Audited:**
- `workers/voice-agent/agent.ts`
- `workers/voice-agent/index.ts`
- `workers/voice-agent/tsconfig.json`
- `workers/voice-agent/livekit.toml`
- `workers/voice-agent/Dockerfile`
- `workers/voice-agent/docker-compose.yml`
- `workers/voice-agent/railway.json`
- `lib/fred-brain.ts`
- `package.json`
- All relevant SDK `.d.ts` type definitions

---

## EXECUTIVE SUMMARY

The voice agent worker is **structurally correct** for the @livekit/agents v1.0.43 SDK. The `defineAgent`, `JobContext`, `voice.Agent`, `AgentSession`, and event system are all used according to the actual TypeScript type definitions. There are **no critical API misuse bugs**. However, there are several medium-severity issues around redundant configuration, missing error handling, and build/deployment concerns.

**Finding counts:** 0 CRITICAL | 2 HIGH | 5 MEDIUM | 3 LOW

---

## 1. SDK API CORRECTNESS

### 1.1 `defineAgent` + `JobContext` flow -- CORRECT

**File:** `workers/voice-agent/agent.ts:45-117`

```ts
export default defineAgent({
  entry: async (ctx: JobContext) => {
    await ctx.connect();
    const participant = await ctx.waitForParticipant();
    // ...
  },
});
```

**Verified against:** `node_modules/@livekit/agents/dist/generator.d.ts`

The `defineAgent` function accepts `{ entry, prewarm? }` and returns the same object. The `entry` callback receives a `JobContext`. Calling `ctx.connect()` first, then `ctx.waitForParticipant()` matches the SDK docs ("recommended to run connect as early as possible"). This is **correct**.

### 1.2 `voice.Agent` (VoiceAgent) constructor -- CORRECT

**File:** `workers/voice-agent/agent.ts:74-79`

```ts
const agent = new VoiceAgent({
  instructions: buildFredVoicePrompt(),
  stt,
  llm,
  tts,
});
```

**Verified against:** `node_modules/@livekit/agents/dist/voice/agent.d.ts:28-41`

The `AgentOptions` interface accepts `{ instructions, stt?, llm?, tts?, ... }`. All three provider params are optional. The `instructions` field is required (type `string`). This is **correct**.

### 1.3 `AgentSession` constructor -- CORRECT but REDUNDANT

**File:** `workers/voice-agent/agent.ts:81`

```ts
const session = new AgentSession({ stt, llm, tts });
```

**Verified against:** `node_modules/@livekit/agents/dist/voice/agent_session.d.ts:49-58`

`AgentSessionOptions` accepts `{ stt?, llm?, tts?, ... }`. This is a valid constructor call.

**HOWEVER:** Both `VoiceAgent` and `AgentSession` receive the same `stt`, `llm`, `tts` instances. The `AgentSession.start()` method receives the `agent` (VoiceAgent) and uses the agent's providers as the primary source. The session-level providers act as fallback/override. Passing them to both is **redundant but not harmful**. See finding M-1 below.

### 1.4 `session.start({ agent, room })` -- CORRECT

**File:** `workers/voice-agent/agent.ts:108-111`

```ts
await session.start({
  agent,
  room: ctx.room,
});
```

**Verified against:** `node_modules/@livekit/agents/dist/voice/agent_session.d.ts:110-116`

The `start` method signature is:
```ts
start({ agent, room?, inputOptions?, outputOptions?, record? }): Promise<void>
```

Passing `agent` (a `voice.Agent` instance) and `room` (from `ctx.room`) is **correct**. The `room` param is optional (for testing without a room), so passing it explicitly is good practice.

### 1.5 `session.say()` -- CORRECT

**File:** `workers/voice-agent/agent.ts:114-116`

```ts
session.say(
  "Hey, Fred Cary here. What's on your mind? Let's get into it.",
);
```

**Verified against:** `node_modules/@livekit/agents/dist/voice/agent_session.d.ts:120-124`

```ts
say(text: string | ReadableStream<string>, options?: {
    audio?: ReadableStream<AudioFrame>;
    allowInterruptions?: boolean;
    addToChatCtx?: boolean;
}): SpeechHandle;
```

`session.say()` accepts a string and returns a `SpeechHandle`. This is **correct**. The greeting is not awaited, which is fine -- `say()` returns synchronously with a handle.

### 1.6 `AgentSessionEventTypes` enum values -- CORRECT

**File:** `workers/voice-agent/agent.ts:83-106`

**Verified against:** `node_modules/@livekit/agents/dist/voice/events.d.ts:9-19`

```ts
enum AgentSessionEventTypes {
    UserInputTranscribed = "user_input_transcribed",
    ConversationItemAdded = "conversation_item_added",
    Error = "error",
    Close = "close"
}
```

All four event types used in the code (`UserInputTranscribed`, `ConversationItemAdded`, `Error`, `Close`) are valid enum members. **Correct**.

### 1.7 Event payload properties -- CORRECT

**UserInputTranscribed event** (`agent.ts:83-88`):
- `ev.isFinal` -- type is `boolean` per `UserInputTranscribedEvent` (events.d.ts:47). **Correct**.
- `ev.transcript` -- type is `string` per events.d.ts:46. **Correct**.

**ConversationItemAdded event** (`agent.ts:90-98`):
- `ev.item` -- type is `ChatMessage` per events.d.ts:70. **Correct**.
- `ev.item.role` -- type is `ChatRole` = `'developer' | 'system' | 'user' | 'assistant'`. Checking `=== 'assistant'` is **correct**.
- `ev.item.textContent` -- getter returns `string | undefined` per chat_context.d.ts:62. **Correct**.

**Error event** (`agent.ts:100-102`):
- `ev.error` -- type is `RealtimeModelError | STTError | TTSError | LLMError | unknown`. **Correct**.

**Close event** (`agent.ts:104-106`):
- `ev.reason` -- type is `ShutdownReason` (string). **Correct**.

### 1.8 STT/LLM/TTS constructors -- CORRECT

**File:** `workers/voice-agent/agent.ts:70-72`

```ts
const stt = new STT({ model: 'whisper-1' });
const llm = new LLM({ model: 'gpt-4o', temperature: 0.7 });
const tts = new TTS({ model: 'tts-1', voice: 'alloy' });
```

**Verified against** plugin types:
- `STT` constructor: `Partial<STTOptions>` where `model: WhisperModels | string`. `'whisper-1'` is a valid `WhisperModels`. **Correct**.
- `LLM` constructor: `Partial<LLMOptions>` where `model: string | ChatModels`, `temperature?: number`. `'gpt-4o'` is a valid `ChatModels`. **Correct**.
- `TTS` constructor: `Partial<TTSOptions>` where `model: TTSModels | string`, `voice: TTSVoices`. `'tts-1'` is a valid `TTSModels`, `'alloy'` is a valid `TTSVoices`. **Correct**.

### 1.9 `publishData` for transcript relay -- CORRECT

**File:** `workers/voice-agent/agent.ts:56-68`

```ts
ctx.room.localParticipant?.publishData(data, {
  reliable: true,
  topic: 'transcript',
});
```

The `localParticipant` is accessed via optional chaining (safe -- undefined before connect). The `publishData` method on `LocalParticipant` from `@livekit/rtc-node` accepts `(data: Uint8Array, options)`. The `TextEncoder().encode()` produces a `Uint8Array`. **Correct**.

### 1.10 `cli.runApp` + `ServerOptions` -- CORRECT

**File:** `workers/voice-agent/index.ts:47-52`

```ts
cli.runApp(
  new ServerOptions({
    agent: fileURLToPath(new URL('./agent.ts', import.meta.url)),
    agentName: 'fred-cary-voice',
  }),
);
```

**Verified against:** `node_modules/@livekit/agents/dist/worker.d.ts:59-87` and `cli.d.ts:13`

- `cli.runApp` accepts `ServerOptions`. **Correct**.
- `ServerOptions.agent` is documented as "Path to a file that has Agent as a default export". The code resolves the path correctly. **Correct**.
- `ServerOptions.agentName` is an optional `string`. **Correct**.

---

## 2. FINDINGS

### H-1: No graceful shutdown handling (HIGH)

**File:** `workers/voice-agent/agent.ts:46-117`

The entry function creates a session but never registers a shutdown callback. If the job is terminated (e.g., room deleted, participant disconnects, Railway restart), the session may not be properly closed.

```ts
// Missing:
ctx.addShutdownCallback(async () => {
  await session.close();
});
```

The `JobContext` provides `addShutdownCallback()` specifically for this purpose. Without it, the OpenAI STT/LLM/TTS connections may leak on shutdown.

**Impact:** Resource leaks on worker restart, potential orphaned WebSocket connections to OpenAI.

**Fix:** Add a shutdown callback after `session.start()`.

---

### H-2: `session.say()` called before session is fully initialized (HIGH)

**File:** `workers/voice-agent/agent.ts:108-116`

```ts
await session.start({ agent, room: ctx.room });

// Send Fred's greeting
session.say("Hey, Fred Cary here. What's on your mind? Let's get into it.");
```

While `session.start()` is awaited, the greeting is fired immediately after. Depending on the internal startup sequence (audio track publication, WebRTC negotiation), the TTS audio for the greeting may be generated before the audio output track is ready, causing the greeting to be silently dropped.

**Impact:** The greeting may not be heard by the first participant in some cases (race with audio track setup).

**Fix:** Add a small delay or listen for `AgentSessionEventTypes.AgentStateChanged` to transition from `'initializing'` to `'listening'` before calling `say()`.

---

### M-1: Redundant STT/LLM/TTS passed to both Agent and AgentSession (MEDIUM)

**File:** `workers/voice-agent/agent.ts:74-81`

```ts
const agent = new VoiceAgent({ instructions: ..., stt, llm, tts });
const session = new AgentSession({ stt, llm, tts });
```

Both receive identical `stt`, `llm`, `tts` instances. The `VoiceAgent` class stores these and they are used as the primary pipeline configuration when the session runs. The `AgentSession`-level providers act as session-wide defaults/overrides.

**Impact:** No runtime bug, but confusing code that suggests both are needed. If the Agent and Session providers diverge in the future, behavior becomes unpredictable.

**Fix:** Pass `stt`, `llm`, `tts` only to `VoiceAgent`. The session will use the agent's providers:

```ts
const agent = new VoiceAgent({ instructions: ..., stt, llm, tts });
const session = new AgentSession();
```

---

### M-2: No error handling around `ctx.connect()` or `ctx.waitForParticipant()` (MEDIUM)

**File:** `workers/voice-agent/agent.ts:47-49`

```ts
await ctx.connect();
const participant = await ctx.waitForParticipant();
```

Neither call has a try/catch. If `connect()` fails (e.g., invalid token, network error), the process will throw an unhandled promise rejection. If `waitForParticipant()` hangs (participant never joins), the worker process is blocked indefinitely.

**Impact:** Worker process crash on connection failure; indefinite hang if participant never connects.

**Fix:** Wrap in try/catch with logging, and consider a timeout for `waitForParticipant()`:

```ts
try {
  await ctx.connect();
  const participant = await ctx.waitForParticipant();
} catch (err) {
  console.error('[Fred Voice Agent] Failed to connect:', err);
  ctx.shutdown('connection_failed');
  return;
}
```

---

### M-3: `publishTranscript` silently fails if `localParticipant` is undefined (MEDIUM)

**File:** `workers/voice-agent/agent.ts:64`

```ts
ctx.room.localParticipant?.publishData(data, { ... });
```

The optional chaining (`?.`) means if `localParticipant` is undefined (before connect completes, or after disconnect), the data silently vanishes with no log. This could make debugging transcript issues very difficult.

**Impact:** Silent data loss for transcripts if room connection is unstable.

**Fix:** Add a null check with warning log, or at minimum ensure transcripts are only published when connected.

---

### M-4: Dockerfile missing `lib/voice-agent.ts` and `lib/agents/fred-agent-voice.ts` (MEDIUM)

**File:** `workers/voice-agent/Dockerfile:11`

The Dockerfile copies:
```dockerfile
COPY workers/voice-agent/ ./workers/voice-agent/
COPY lib/fred-brain.ts ./lib/fred-brain.ts
```

The `tsconfig.json` includes:
```json
"include": [
  "./**/*.ts",
  "../../lib/fred-brain.ts",
  "../../lib/voice-agent.ts",
  "../../lib/agents/fred-agent-voice.ts"
]
```

However, `agent.ts` only imports from `../../lib/fred-brain` -- it does NOT import `lib/voice-agent.ts` or `lib/agents/fred-agent-voice.ts`. So the Dockerfile is **correct for runtime**, but the TypeScript compilation (`worker:voice:build` script) would fail inside Docker because those included files are missing.

**Impact:** `tsc -p workers/voice-agent/tsconfig.json` would fail inside the Docker container. The runtime works because `npx tsx` transpiles on-the-fly without pre-compilation.

**Fix:** Either:
1. Remove the extra files from `tsconfig.json` `include` (if not needed), or
2. Add COPY directives for `lib/voice-agent.ts` and `lib/agents/fred-agent-voice.ts` to the Dockerfile.

Option 1 is preferred since the worker does not import those files.

---

### M-5: .env.local parsing does not handle inline comments or multiline values (MEDIUM)

**File:** `workers/voice-agent/index.ts:9-26`

The custom env parser handles:
- Empty lines and `#` comment lines
- Lines without `=`
- Surrounding quotes on values

It does NOT handle:
- Inline comments: `KEY=value # this is a comment` would set the value to `value # this is a comment`
- Multiline values (heredoc-style)
- Values with embedded newlines (`\n` escape sequences)

**Impact:** Unexpected behavior if `.env.local` uses inline comments (common pattern). Unlikely to cause production issues since Railway/Docker Compose use proper env injection.

**Fix:** For production, this is low risk since Docker environments use proper env vars. But the parser could be improved or replaced with `dotenv` package if needed.

---

### L-1: Agent name "fred-cary-voice" vs livekit.toml consistency (LOW)

**File:** `workers/voice-agent/index.ts:50`, `workers/voice-agent/livekit.toml:2`

Both use `fred-cary-voice`. The name in `livekit.toml` is `"fred-cary-voice"` and the `agentName` in `ServerOptions` is `'fred-cary-voice'`. These are **consistent**. No issue.

However, note the name uses "cary" not "carey" (which appears in the repo name `sierra-fred-carey`). This may be intentional (Fred Cary is the actual person's name) but worth confirming the spelling is deliberate.

---

### L-2: `console.log` used instead of structured logging (LOW)

**File:** `workers/voice-agent/agent.ts` (multiple lines)

The worker uses `console.log` and `console.error` for all logging. The main application has a `lib/logger.ts` (pino-based). The LiveKit agents SDK also has its own logging system (`@livekit/agents/dist/log.d.ts`).

**Impact:** Logs may not be structured/parseable in production log aggregation systems. No runtime bug.

**Fix:** Consider using the SDK's built-in logger or a lightweight structured logger for the worker process.

---

### L-3: Docker CMD uses `npx tsx` which adds startup latency (LOW)

**File:** `workers/voice-agent/Dockerfile:14`

```dockerfile
CMD ["npx", "tsx", "workers/voice-agent/index.ts", "start"]
```

Using `npx tsx` means the TypeScript is transpiled at startup. This adds 2-5 seconds of cold start latency. For a long-running worker, this is a one-time cost and acceptable.

**Impact:** Minor startup latency. No runtime impact.

**Fix:** For production optimization, pre-compile with `tsc` and run `node dist/index.js`. But this requires fixing the tsconfig include issues (see M-4).

---

## 3. BUILD & DEPLOYMENT

### 3.1 tsconfig.json

**File:** `workers/voice-agent/tsconfig.json`

- `rootDir: "../.."` is set to the repo root, which is correct since the worker imports `../../lib/fred-brain`.
- `moduleResolution: "bundler"` is fine for tsx runtime.
- `paths: { "@/*": ["../../*"] }` is configured but NOT used in agent.ts (it uses relative imports). This is fine.
- The `include` array has extra entries (`lib/voice-agent.ts`, `lib/agents/fred-agent-voice.ts`) that are not imported by the worker. See M-4.

### 3.2 Dockerfile

- Base image `node:22-slim` is appropriate.
- `npm ci --omit=dev` installs only production deps. This works because `tsx` is a devDependency but is invoked via `npx` which can resolve from the local node_modules. **Wait -- this is a potential issue:** if `tsx` is a devDependency and `--omit=dev` skips it, then `npx tsx` would fail.

Let me verify: In `package.json`, `tsx` is listed under `devDependencies`. The Dockerfile runs `npm ci --omit=dev`, which means `tsx` will NOT be installed. The CMD `npx tsx workers/voice-agent/index.ts start` will therefore fail because `tsx` is not available.

**This is actually a HIGH issue, promoted to H-3 below.**

### H-3: `tsx` is a devDependency but Dockerfile omits dev deps (HIGH -- CORRECTION: promoted from build section)

**File:** `workers/voice-agent/Dockerfile:7,14`

```dockerfile
RUN npm ci --omit=dev
# ...
CMD ["npx", "tsx", "workers/voice-agent/index.ts", "start"]
```

`tsx` is listed in `devDependencies` in `package.json`. With `--omit=dev`, it won't be installed. The CMD will fail at runtime.

**Impact:** Docker container will crash immediately on startup. **This is a blocker for deployment.**

**Fix:** Either:
1. Move `tsx` to `dependencies` in `package.json`, or
2. Add a build step: `RUN npx tsx --version` to verify, or better:
3. Pre-compile TypeScript and run with `node`:
   ```dockerfile
   RUN npx tsx --version || npm install tsx
   # or better:
   COPY tsconfig.json ./
   RUN npx tsc -p workers/voice-agent/tsconfig.json
   CMD ["node", "workers/voice-agent/dist/index.js", "start"]
   ```

**Recommended fix:** Move `tsx` to `dependencies` for the simplest fix, or pre-compile for production optimization.

---

## 4. SUMMARY TABLE

| ID   | Severity | Description                                                      | File(s)                   |
|------|----------|------------------------------------------------------------------|---------------------------|
| H-1  | HIGH     | No shutdown callback to close session on worker termination      | agent.ts:46-117           |
| H-2  | HIGH     | Greeting `say()` may race with audio track initialization        | agent.ts:108-116          |
| H-3  | HIGH     | `tsx` is devDependency; Docker `--omit=dev` will break CMD       | Dockerfile:7,14           |
| M-1  | MEDIUM   | Redundant STT/LLM/TTS passed to both Agent and AgentSession     | agent.ts:74-81            |
| M-2  | MEDIUM   | No error handling around connect/waitForParticipant              | agent.ts:47-49            |
| M-3  | MEDIUM   | publishTranscript silently fails if localParticipant is null     | agent.ts:64               |
| M-4  | MEDIUM   | tsconfig includes files not copied in Dockerfile                 | tsconfig.json, Dockerfile |
| M-5  | MEDIUM   | .env.local parser does not handle inline comments                | index.ts:9-26             |
| L-1  | LOW      | Agent name spelling ("cary" vs "carey") -- likely intentional    | index.ts:50, livekit.toml |
| L-2  | LOW      | console.log used instead of structured logging                   | agent.ts (multiple)       |
| L-3  | LOW      | npx tsx adds cold start latency in Docker                        | Dockerfile:14             |

---

## 5. VERDICT

The SDK API usage is **correct across the board**. The `defineAgent` -> `JobContext` -> `voice.Agent` -> `AgentSession` -> event handling pipeline matches the v1.0.43 type definitions precisely. Event payload property access (`ev.isFinal`, `ev.transcript`, `ev.item.role`, `ev.item.textContent`, `ev.error`, `ev.reason`) are all type-safe.

The **most critical deployment blocker** is H-3 (tsx missing in production Docker image). H-1 and H-2 are production-readiness issues that should be fixed before launch.

The code is well-structured and follows the SDK patterns correctly. With the HIGH findings addressed, this worker should function properly in production.
