# Voice API Route Audit Report

**Auditor:** api-auditor
**Date:** 2026-02-18
**Scope:** All 4 voice-related API routes + cross-cutting concerns
**SDK Version:** livekit-server-sdk v2.15.0 | @livekit/agents v1.0.43

---

## Table of Contents

1. [Route 1: POST /api/fred/call](#route-1-post-apifredcall)
2. [Route 2: POST /api/fred/call/summary](#route-2-post-apifredcallsummary)
3. [Route 3: POST /api/livekit/webhook](#route-3-post-apilivekitwebhook)
4. [Route 4: POST /api/livekit/token](#route-4-post-apilivekittoken)
5. [Cross-Route Consistency Checks](#cross-route-consistency-checks)
6. [Production Readiness Assessment](#production-readiness-assessment)
7. [Summary of All Findings](#summary-of-all-findings)

---

## Route 1: POST /api/fred/call

**File:** `app/api/fred/call/route.ts` (143 lines)
**Purpose:** Create LiveKit room, dispatch voice agent, generate user token

### Findings

#### MEDIUM: Room name format mismatch with webhook parser

- **Line 84:** Room name format is `fred-call_${userId}_${Date.now()}`
- **Webhook (line 53-54, 283-289):** `extractUserIdFromRoom()` expects pattern `${userId}_room-xxx-xxx` or `${userId}_fred-call-xxx` and splits on the **first** underscore
- **Impact:** The function splits on the first `_` correctly for `fred-call_UUID_timestamp`, extracting `fred-call` as the "userId candidate". Since `fred-call` is shorter than 32 chars, it returns `null`. The `hostUserId` will always be `null` for fred-call rooms.
- **Consequence:** `video_rooms.host_user_id` will be `null` for all voice call rooms, and the `coaching_sessions` upsert at webhook line 80 will be skipped because `if (roomName.includes('fred-call') && hostUserId)` requires a non-null hostUserId.

#### HIGH: Coaching sessions are never created for voice calls

- Directly caused by the room name format issue above. The room name `fred-call_UUID_timestamp` puts the prefix before the userId, so the webhook's `extractUserIdFromRoom()` cannot find the userId. The coaching_sessions insert on `room_started` is dead code for voice calls.
- The `room_finished` handler at line 152 does NOT check `hostUserId`, so it will attempt to update `coaching_sessions` where `room_name` matches -- but since no session was ever created on `room_started`, this update matches zero rows.
- **Fix:** Change room name format to `${userId}_fred-call_${Date.now()}` so the userId comes first, matching the convention the webhook parser expects.

#### LOW: TTL type mismatch (string vs number)

- **Line 34-37:** `TTL_MAP` returns strings like `"15m"` and `"45m"`
- **Line 110:** Passed to `AccessToken` constructor as `ttl` option
- The livekit-server-sdk v2.x `AccessToken` accepts `ttl` as a `string | number`. String format with units like `"15m"` is supported, so this works. Not a bug, but worth noting that the SDK documentation primarily shows numeric seconds.

#### LOW: `as any` cast on grant object

- **Line 119:** `at.addGrant({...} as any)` -- the `as any` cast suppresses type checking on the grant object.
- The livekit-server-sdk v2.x changed the `VideoGrant` type. The cast hides potential type mismatches. Should use the proper `VideoGrant` type from the SDK.

#### INFO: maxDuration vs emptyTimeout discrepancy

- **Line 89:** `emptyTimeout` for on-demand is 300s (5 min), scheduled is 600s (10 min)
- **Line 129:** `maxDuration` reported to client is 600s (10 min) for on-demand, 1800s (30 min) for scheduled
- These serve different purposes (emptyTimeout = auto-close when no one is in room; maxDuration = UI-facing limit), but the naming could be confusing. The room has no server-side `maxDuration` enforcement -- the UI would need to enforce this client-side.

#### GOOD: Proper env var validation

- Lines 71-81: All three LIVEKIT env vars checked before use. Returns 500 with a user-friendly error.

#### GOOD: Auth + tier gating

- Lines 46-57: `requireAuth()` + Pro tier check with proper error response.

#### GOOD: Request body validation

- Lines 59-67: Zod schema validation with structured error response.

---

## Route 2: POST /api/fred/call/summary

**File:** `app/api/fred/call/summary/route.ts` (262 lines)
**Purpose:** Generate post-call summary, decisions, and next actions from transcript

### Findings

#### MEDIUM: Room ownership check is fragile

- **Line 211:** `if (!roomName.includes(userId))` -- relies on the userId being a substring of the room name.
- If the room name format changes, or if a userId happens to be a substring of another user's room name (unlikely with UUIDs but not impossible with shorter IDs), this check could be bypassed or fail incorrectly.
- A more robust check would parse the room name format explicitly, e.g., checking that the room name starts with `fred-call_${userId}_`.

#### MEDIUM: No transcript length limit

- **Line 27-33:** The `transcript` array has no `.max()` constraint.
- A malicious or buggy client could send an extremely large transcript (thousands of entries), causing the LLM call to be very expensive or fail with token limits.
- **Fix:** Add `.max(500)` or similar to the transcript array schema, and consider truncating the transcript before sending to the LLM.

#### MEDIUM: Episodic memory insert silently swallows errors

- **Lines 226-244:** The `try/catch` around the Supabase insert logs a warning but does not affect the response. If the `fred_episodic_memory` table doesn't exist, has schema mismatches, or the insert fails for any reason, the user still gets a success response.
- This is acceptable for a non-critical feature, but there's no alerting or monitoring on these failures.

#### LOW: Heuristic regex patterns use global flag without resetting lastIndex

- **Lines 150-159, 166-175:** `actionPatterns` and `decisionPatterns` use the `g` flag. When used in a `for...of` loop, the regex `lastIndex` is reset for each new string in `fredMessages`, which is correct. No bug, but the pattern could be fragile if refactored.

#### LOW: Empty transcript edge case

- If the transcript array is empty (`[]`), `fullTranscript` becomes `""`, which gets sent to the LLM with an empty transcript. The LLM prompt says "If the transcript is too short to extract meaningful content, still produce a reasonable summary" -- so this is handled but produces a somewhat meaningless result. The heuristic fallback would produce a minimal summary like "Quick decision call completed (0 min)." with 3 identical placeholder actions.

#### GOOD: LLM with heuristic fallback

- Lines 62-74: Clean fallback pattern -- if LLM fails, heuristic extraction runs.

#### GOOD: Auth + tier gating matches call route

- Lines 186-196: Same Pro tier requirement as the call route.

---

## Route 3: POST /api/livekit/webhook

**File:** `app/api/livekit/webhook/route.ts` (304 lines)
**Purpose:** Handle LiveKit room lifecycle events, update database

### Findings

#### HIGH: Room name format assumption broken (cross-reference with Route 1)

- **Line 53-54, 283-289:** `extractUserIdFromRoom()` splits on first underscore and expects userId to come first.
- The `fred/call` route creates room names as `fred-call_${userId}_${Date.now()}` (prefix first).
- This means `extractUserIdFromRoom("fred-call_abc123-uuid-here_1708300000000")` returns `null` because `"fred-call"` is not 32+ chars.
- **Impact:** `host_user_id` is null for all voice call rooms. Coaching session tracking is broken.

#### MEDIUM: No webhook authentication for non-LiveKit callers

- **Lines 30-38:** The route correctly validates the webhook signature via `WebhookReceiver.receive()`. However, the route is a publicly accessible POST endpoint. If LiveKit Cloud has a bug or is compromised, or if someone replays a valid webhook payload, there's no additional protection (e.g., IP allowlisting, idempotency key).
- The `WebhookReceiver` validates the JWT in the authorization header using the API secret, which is strong cryptographic verification. The risk is low but worth noting for defense-in-depth.

#### MEDIUM: Metadata overwrite on room_finished

- **Line 118-128:** The `room_finished` update sets `metadata` to a new object `{ livekit_sid, duration_seconds }`, which **overwrites** the metadata set during `room_started` (which included `max_participants`).
- Should use a merge strategy instead:
  ```ts
  metadata: { ...existingMetadata, duration_seconds: durationSeconds }
  ```

#### MEDIUM: No withLogging wrapper

- Unlike the `fred/call` and `fred/call/summary` routes, the webhook handler does not use the `withLogging()` wrapper.
- This means no correlation ID, no structured request/response logging, and no duration tracking for webhook processing.
- Webhooks are often the hardest to debug in production -- logging is critical here.

#### LOW: AI agent identity detection is fragile

- **Line 300:** `if (identity.startsWith('ai-agent') || identity.startsWith('fred'))` -- this would also match a real user whose userId starts with "fred" (e.g., `fred-smith-uuid`).
- The voice agent's identity is set by LiveKit Agents framework and typically uses the agent name (`fred-cary-voice`) or a generated identity. This heuristic could cause real users named "Fred" to have `null` user_id in the participants table.
- **Fix:** Check for a more specific pattern, e.g., the exact agent name, or check participant metadata for an agent marker.

#### LOW: No idempotency handling

- If LiveKit sends the same webhook twice (retry due to timeout), the `room_started` upsert handles it (uses `onConflict: 'room_name'`), but `participant_joined` does an `insert` that could create duplicate records.
- **Fix:** Use upsert with a composite unique constraint on `(room_id, participant_identity)` or check for existing record before insert.

#### GOOD: Proper webhook signature validation

- Lines 29-38: Uses `WebhookReceiver` with API key/secret for cryptographic verification.

#### GOOD: Graceful error handling per event type

- Each case in the switch logs errors but doesn't crash the handler -- returns `{ received: true }` to acknowledge receipt.

---

## Route 4: POST/GET /api/livekit/token

**File:** `app/api/livekit/token/route.ts` (201 lines)
**Purpose:** Generate LiveKit access tokens for Studio-tier video rooms

### Findings

#### LOW: Different tier gating from fred/call route

- **Lines 37, 128:** Requires `UserTier.STUDIO` (tier 2) while `fred/call` requires `UserTier.PRO` (tier 1).
- This is intentional -- the token route is for Studio video rooms (team rooms), while fred/call is for voice coaching (Pro feature). Not a bug, but worth documenting the distinction.

#### LOW: No LIVEKIT_URL validation

- **Lines 67-76:** Checks `apiKey` and `apiSecret` but does NOT check `LIVEKIT_URL`.
- **Lines 104, 188:** Returns `process.env.LIVEKIT_URL` directly in response, which could be `undefined`.
- The client would receive `{ url: undefined }` and fail to connect. The `fred/call` route correctly checks all three env vars.
- **Fix:** Add `LIVEKIT_URL` to the validation check.

#### LOW: No request body validation (Zod)

- **Line 46:** Uses raw `await request.json()` destructuring without Zod validation.
- The `fred/call` route uses Zod for validation. Inconsistency in validation patterns.
- `participantName` could be any length or contain special characters. Only `roomName` is sanitized.

#### LOW: GET handler has `addGrant` without `as any` cast

- **Line 176-182:** The GET handler's `addGrant` call does not use `as any`, unlike the POST handler at line 99. This is inconsistent -- one compiles, one uses a cast. Suggests the type was correct all along and the `as any` in the POST handler is unnecessary.

#### GOOD: Room name sanitization

- Lines 14-20: Proper input sanitization with length limits and character allowlist.

#### GOOD: User-scoped room names

- Lines 26-28: Prevents cross-user room access by prefixing room names with userId.

---

## Cross-Route Consistency Checks

### Agent Name Consistency: PASS

| Location | Agent Name |
|----------|-----------|
| `app/api/fred/call/route.ts:25` | `"fred-cary-voice"` |
| `workers/voice-agent/index.ts:50` | `agentName: 'fred-cary-voice'` |
| `workers/voice-agent/livekit.toml:2` | `name = "fred-cary-voice"` |

All three locations use the same agent name. No mismatch.

### Environment Variables: PARTIAL PASS

| Env Var | fred/call | fred/call/summary | livekit/webhook | livekit/token |
|---------|-----------|-------------------|-----------------|---------------|
| `LIVEKIT_API_KEY` | Checked | N/A | Checked | Checked |
| `LIVEKIT_API_SECRET` | Checked | N/A | Checked | Checked |
| `LIVEKIT_URL` | Checked | N/A | N/A | **NOT checked** |

- The token route uses `LIVEKIT_URL` in the response but doesn't validate it exists.
- The webhook route doesn't need `LIVEKIT_URL` (it receives events, doesn't connect).

### Auth Patterns: PARTIAL PASS

| Route | Auth Method | Tier |
|-------|-----------|------|
| `fred/call` | `requireAuth()` + `getUserTier()` | Pro |
| `fred/call/summary` | `requireAuth()` + `getUserTier()` | Pro |
| `livekit/webhook` | WebhookReceiver (signature) | N/A |
| `livekit/token` | `requireAuth()` + `getUserTier()` | Studio |

- Consistent pattern for user-facing routes (requireAuth + tier check).
- Webhook uses appropriate machine-to-machine auth (signature verification).

### Logging Wrapper: PARTIAL PASS

| Route | Uses `withLogging()` |
|-------|---------------------|
| `fred/call` | Yes |
| `fred/call/summary` | Yes |
| `livekit/webhook` | **No** |
| `livekit/token` | **No** |

Two of four routes lack structured logging.

### Error Response Format: PARTIAL PASS

| Route | Error Format |
|-------|-------------|
| `fred/call` | `{ error: string }` with status code |
| `fred/call/summary` | `{ error: string, details? }` with status code |
| `livekit/webhook` | `{ error: string }` with status code |
| `livekit/token` | `{ error: string }` with status code |

Consistent format. The `fred/call/summary` route adds `details` for validation errors, which is fine.

---

## Production Readiness Assessment

### Ready for Production

1. **Agent dispatch flow** (fred/call) -- Room creation, agent dispatch, and token generation work correctly. The LiveKit SDK calls are properly sequenced.
2. **Webhook signature verification** -- Cryptographically validates incoming events. Proper security.
3. **Tier gating** -- All user-facing routes enforce correct tier requirements.
4. **Auth on all routes** -- No unauthenticated access to user-facing endpoints.
5. **Input validation** -- Zod schemas on fred/call and fred/call/summary routes.
6. **LLM fallback** -- Summary generation has heuristic fallback if LLM fails.
7. **Agent name consistency** -- All three locations match.

### Blocking Issues (Must Fix Before Production)

1. **HIGH: Room name format breaks webhook tracking** -- Voice call rooms use `fred-call_userId_timestamp` but the webhook parser expects `userId_...`. This means:
   - `host_user_id` is always null for voice call rooms
   - Coaching sessions are never created
   - Call duration tracking via coaching_sessions is broken
   - Participant userId attribution may be affected

2. **HIGH: Coaching sessions dead code** -- The `room_started` handler's coaching session insert is effectively dead for voice calls. Users will have no record of their voice coaching sessions in the database.

### Non-Blocking Issues (Should Fix)

3. **MEDIUM: Metadata overwrite in webhook room_finished** -- Loses room_started metadata.
4. **MEDIUM: No transcript size limit** -- Could lead to expensive LLM calls or failures.
5. **MEDIUM: Webhook missing withLogging** -- Harder to debug in production.
6. **MEDIUM: Fragile room ownership check in summary route** -- String-contains check.
7. **LOW: LIVEKIT_URL not validated in token route** -- Could return undefined to client.
8. **LOW: AI agent identity detection is fragile** -- Could misidentify real users.
9. **LOW: No idempotency on participant_joined webhook** -- Could create duplicates.

---

## Summary of All Findings

| # | Severity | Route | Finding |
|---|----------|-------|---------|
| 1 | **HIGH** | fred/call + webhook | Room name format `fred-call_userId_...` breaks webhook userId extraction; hostUserId is always null |
| 2 | **HIGH** | webhook | Coaching sessions never created for voice calls (dead code due to #1) |
| 3 | **MEDIUM** | webhook | Metadata overwrite on room_finished loses room_started data |
| 4 | **MEDIUM** | fred/call/summary | No transcript array size limit -- potential abuse/cost vector |
| 5 | **MEDIUM** | webhook | Missing `withLogging()` wrapper -- no structured logging or correlation IDs |
| 6 | **MEDIUM** | fred/call/summary | Room ownership check (`roomName.includes(userId)`) is fragile |
| 7 | **MEDIUM** | fred/call/summary | Episodic memory failures silently swallowed with no alerting |
| 8 | **LOW** | livekit/token | LIVEKIT_URL not validated; could return `undefined` to client |
| 9 | **LOW** | webhook | AI agent identity detection could misidentify users starting with "fred" |
| 10 | **LOW** | webhook | No idempotency on participant_joined -- duplicates possible on retries |
| 11 | **LOW** | livekit/token | No Zod validation on request body (inconsistent with other routes) |
| 12 | **LOW** | fred/call | `as any` cast on addGrant suppresses type checking |
| 13 | **LOW** | livekit/token | Inconsistent `as any` usage between POST and GET handlers |

**Overall Assessment:** The core voice call flow (room creation, agent dispatch, token generation) is functional and well-structured. The two HIGH severity issues both stem from the same root cause -- the room name format putting the prefix before the userId. Fixing the room name format to `${userId}_fred-call_${Date.now()}` would resolve both issues simultaneously and align with the webhook parser's expectations.
