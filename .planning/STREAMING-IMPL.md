# Live Token Streaming Implementation

**Date:** 2026-02-25
**Status:** Complete and deployed

## What Was Implemented

Live word-by-word token streaming for FRED's chat responses. Previously, FRED buffered the entire LLM response before sending it, causing 1-2 second silent waits. Now tokens appear within ~100ms of the first token being generated.

## Architecture

A `tokenChannel` object (`{ emit: (chunk: string) => void }`) is threaded from the HTTP route handler down through the XState machine into the decide actor where the LLM call happens.

### Data Flow

```
HTTP route (onToken SSE sender)
  → FredService.processStream (tokenChannel in machine input)
    → XState machine context (tokenChannel field)
      → decide actor (tokenChannel parameter)
        → generateWithLLM (tokenChannel parameter)
          → streamGenerate() iterated chunk by chunk
            → tokenChannel.emit(chunk) per chunk
              → send("token", { text: chunk }) SSE event
                → frontend hook appends chunk to streaming message
```

## Files Changed

### Backend

1. **`lib/fred/types.ts`** — Added `tokenChannel?: { emit: (chunk: string) => void } | null` to `FredContext` interface.

2. **`lib/fred/machine.ts`**
   - Added `tokenChannel` to machine input types
   - Added `tokenChannel` parameter to `createInitialContext()` and returned it in context
   - Added `tokenChannel` to `decide` actor input type
   - Passed `context.tokenChannel` in the `decide` state's `invoke.input`

3. **`lib/fred/actors/decide.ts`**
   - Added `streamGenerate` to static imports from `@/lib/ai/fred-client`
   - Added `tokenChannel` parameter to `decideActor()`, `buildResponseContent()`, and `generateWithLLM()`
   - `generateWithLLM()` now has two paths: streaming (via `streamGenerate` + `textStream` iteration) and buffered (original `generate` path)

4. **`lib/fred/service.ts`**
   - Added `onToken?: (chunk: string) => void` to `FredServiceOptions`
   - In `processStream()`, wraps `onToken` in a `tokenChannel` object passed to the machine

5. **`app/api/fred/chat/route.ts`**
   - Split the single `createFredService` call into two branches:
     - Non-streaming path: `createFredService` without `onToken` (buffered)
     - Streaming path: `createFredService` with `onToken: (chunk) => send("token", { text: chunk })`

### Frontend

6. **`lib/hooks/use-fred-chat.ts`**
   - Added `isStreaming?: boolean` to `FredMessage` interface
   - Added `streamingMessageIdRef` to track the active streaming message
   - Added `token` SSE event handler: creates streaming placeholder on first token, appends on subsequent tokens
   - Updated `response` handler: replaces streaming placeholder with final message (preserving ID), or appends normally if no streaming occurred

7. **`components/chat/chat-message.tsx`**
   - Added `isStreaming?: boolean` to `Message` interface
   - Added inline blinking cursor (`animate-pulse` span) that appears after content when `isStreaming === true`

## Commits

- `feat(fred-types): add tokenChannel to FredContext for streaming tokens`
- `feat(fred-machine): thread tokenChannel through machine input and decide actor`
- `feat(fred-decide): stream LLM tokens through tokenChannel in generateWithLLM`
- `feat(fred-service): pass onToken callback as tokenChannel to machine in processStream`
- `feat(fred-chat): send token SSE events as LLM generates response`
- `feat(use-fred-chat): handle token SSE events for live streaming message display`
- `feat(chat-message): add blinking cursor for actively streaming messages`

## Non-Streaming Path Unchanged

The `process()` method (used by non-streaming clients) receives no `tokenChannel` and continues buffering the full response. Tool calls (`getFredTools`) work in both paths since the `streamGenerate` options accept `tools` + `maxSteps`.

## Estimated Latency Improvement

- Before: User waits 800ms-2000ms in silence, then full response appears at once
- After: First token visible within ~100ms of the LLM starting generation
- Perceived latency improvement: 7-20x faster response feel
