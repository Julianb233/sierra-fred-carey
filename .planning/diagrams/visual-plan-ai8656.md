# AI-8656 — "Call Fred" voice pipeline broken (root cause + fix)

## Pipeline (where it breaks)

```
 Browser (Call Fred modal)
   │  POST /api/fred/call
   ▼
 Next.js API  ──creates room──►  LiveKit Cloud
   │  AgentDispatchClient.createDispatch("fred-cary-voice")
   ▼
 LiveKit dispatch  ──needs a registered worker──►  ✗ NO WORKER (worker crashes on boot)

 workers/voice-agent/index.ts → cli.runApp → loads agent.ts
   agent.ts:4   import * as elevenlabs from '@livekit/agents-plugin-elevenlabs'
                ↑ package NOT in package.json, NOT installed → MODULE_NOT_FOUND on boot
   agent.ts:256 new elevenlabs.TTS({ voiceId })
                ↑ plugin defaults apiKey to process.env.ELEVEN_API_KEY and THROWS if unset,
                  but env defines ELEVENLABS_API_KEY → would throw even after install
```

Result: dispatch has no worker → agent never joins room → user speaks → silence.

## Fix (3 changes)

| Component | Change |
|-----------|--------|
| package.json | add `@livekit/agents-plugin-elevenlabs@^1.0.43` (exact peer-dep match to agents@1.0.43) |
| workers/voice-agent/agent.ts | pass `apiKey: ELEVENLABS_API_KEY ?? ELEVEN_API_KEY` to TTS so the env-var-name mismatch can't throw |
| .env.example | document ELEVENLABS_API_KEY + ELEVENLABS_VOICE_ID |

## Verification

- `npm ls @livekit/agents-plugin-elevenlabs` resolves
- Worker boots: agent.ts imports resolve, no MODULE_NOT_FOUND
- `npm run build` passes
- Live: restart `fred-cary-voice` worker (PM2 on Mac Mini), Call Fred → speak → Fred replies in cloned voice
