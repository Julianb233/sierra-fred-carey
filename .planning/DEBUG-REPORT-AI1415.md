# Debug Report: AI-1415 — Voice Integration E2E Testing

**Date**: 2026-03-05
**Branch**: ai-1418-db-verify-journey-analyzer-score-persi
**Team**: 4-agent debug investigation (Frontend, Backend, Database, Code Review)

## Root Cause: Why Previous Attempt Produced "No Output"

Three independent failures combined to produce zero output:

### 1. CRITICAL — `base.skip()` Fatal in Playwright Fixtures
**File**: `tests/e2e/fixtures/auth.ts:6`
**Bug**: `base.skip()` called inside `base.extend()` fixture setup throws `SkipError` that prevents the fixture from yielding. Every test using `authenticatedPage` crashes silently.
**Fix**: Changed to `testInfo.skip()` which is the fixture-safe API. ✅ FIXED

### 2. CRITICAL — Missing E2E Credentials
`E2E_TEST_EMAIL` and `E2E_TEST_PASSWORD` not set in any env file. Even after fixing #1, all tests would skip.
**Status**: Documented — needs test account provisioning.

### 3. CRITICAL — webServer Timeout
Playwright config runs `npm run build && npm start` which triggers a full cold Webpack build exceeding the 3-minute timeout.
**Status**: Documented — should use `npm run dev` or pre-build.

## Bugs Found & Fixed

| # | Severity | Issue | File | Status |
|---|----------|-------|------|--------|
| 1 | P0 | `base.skip()` in fixture crashes silently | `tests/e2e/fixtures/auth.ts` | ✅ FIXED |
| 2 | P0 | ElevenLabs reads `ELEVEN_API_KEY` but env has `ELEVENLABS_API_KEY` | `workers/voice-agent/agent.ts` | ✅ FIXED |
| 3 | P0 | Voice ID hardcoded, ignoring `ELEVENLABS_VOICE_ID` env var | `workers/voice-agent/agent.ts` | ✅ FIXED |
| 4 | P1 | Docker Compose missing ElevenLabs env vars | `workers/voice-agent/docker-compose.yml` | ✅ FIXED |
| 5 | P1 | Tautological assertions (`\|\| true`) in 3 E2E tests | `tests/e2e/voice-integration.spec.ts` | ✅ FIXED |
| 6 | P1 | `ELEVEN_API_KEY` missing from .env.local | `.env.local` | ✅ FIXED |

## Known Issues (Not Fixed — Separate Tickets)

| # | Severity | Issue | Notes |
|---|----------|-------|-------|
| 7 | P0 | LiveKit plugin version mismatch (1.0.43 vs 1.0.48) | Run `npm install @livekit/agents@1.0.48 @livekit/agents-plugin-*@1.0.48` |
| 8 | P1 | Missing E2E test credentials | Need test account provisioning |
| 9 | P1 | webServer config runs full build (timeout risk) | Switch to `npm run dev` |
| 10 | P2 | `/api/fred/whisper` has no `requireAuth()` | Security: unauthenticated callers can consume OpenAI credits |
| 11 | P2 | No voice call history tables in database | `voice_agent_config`, `knowledge_base`, `escalation_rules` missing |
| 12 | P2 | `data-testid='call-fred'` missing from Call Fred button | E2E tests can't locate button |
| 13 | P3 | AudioContext resource leak in `useWhisperFlow` | Browsers cap at ~6-10 instances |
| 14 | P3 | Stale closures in `useWhisperFlow` and `call-fred-modal.tsx` effects | Missing deps in useEffect |
| 15 | P3 | No rate limiting on voice endpoints | Upstash Redis available but unused |
| 16 | P3 | `ctx.connect()` after `session.start()` (wrong order) | Harmless but SDK docs recommend connect first |

## Test Results

- **Unit tests (Vitest)**: 64/64 passing ✅ (all 4 voice test files)
- **E2E tests (Playwright)**: 27 tests defined, blocked by missing credentials

## Files Changed

1. `tests/e2e/fixtures/auth.ts` — Fixed fatal `base.skip()` → `testInfo.skip()`
2. `workers/voice-agent/agent.ts` — Fixed ElevenLabs API key + voice ID env var support
3. `workers/voice-agent/docker-compose.yml` — Added missing ElevenLabs env vars
4. `tests/e2e/voice-integration.spec.ts` — Removed 3 tautological `|| true` assertions
5. `.env.local` — Added `ELEVEN_API_KEY` alias
