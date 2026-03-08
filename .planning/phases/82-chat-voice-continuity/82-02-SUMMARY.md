---
phase: 82-chat-voice-continuity
plan: 02
subsystem: chat-voice-bridge
tags: [voice, chat, continuity, transcript, context-banner, ui]
dependency-graph:
  requires: [82-01]
  provides:
    - Voice transcript injection into chat history (dual endpoint strategy)
    - POST /api/fred/call/transcript endpoint for channel-entry based transcript storage
    - VoiceCallContextBanner component for pre/post call context awareness
    - Chat page integration with voice context fetching and onCallEnd callback
  affects:
    - Chat page UX (seamless text/voice switching)
    - CallFredModal (dual transcript POST, onCallEnd callback)
tech-stack:
  added: []
  patterns:
    - "Dual transcript injection: /api/voice/transcript (LLM summary) + /api/fred/call/transcript (channel entries)"
    - "Pre-call context banner with topic from /api/voice/context"
    - "Post-call summary banner with dismiss functionality via onCallEnd callback"
    - "framer-motion AnimatePresence for banner transitions"
key-files:
  created:
    - components/chat/voice-call-context-banner.tsx
    - app/api/fred/call/transcript/route.ts
  modified:
    - app/chat/page.tsx (VoiceCallContextBanner, voice context fetch, onCallEnd wiring)
    - components/dashboard/call-fred-modal.tsx (onCallEnd prop, dual transcript POST)
    - app/api/livekit/webhook/route.ts (Phase 82 comment about client-side injection)
  pre-existing:
    - lib/fred/chat-voice-bridge.ts (injectVoiceTranscriptToChat from 82-01)
    - lib/voice/chat-context-loader.ts (loadChatContextForVoice from 82-01)
    - lib/voice/transcript-injector.ts (summarizeTranscript from 82-01)
    - app/api/voice/context/route.ts (GET context endpoint from 82-01)
    - app/api/voice/transcript/route.ts (POST transcript endpoint from 82-01)
    - components/voice/last-discussed.tsx (LastDiscussed component from 82-01)
decisions:
  - id: "82-02-d1"
    decision: "Dual transcript injection via Promise.allSettled"
    reason: "voice/transcript provides LLM-summarized episodic memory; fred/call/transcript provides channel-entry based storage. Both fire in parallel; failure of one does not block the other."
  - id: "82-02-d2"
    decision: "onCallEnd callback for summary propagation"
    reason: "Allows chat page to show post-call banner immediately without re-fetching from server"
  - id: "82-02-d3"
    decision: "framer-motion AnimatePresence with mode='wait' for banner transitions"
    reason: "Smooth animation between pre-call and post-call states; complies with plan requirement for fade + slide"
metrics:
  duration: "~15 minutes"
  completed: "2026-03-08"
---

# Phase 82 Plan 02: Voice Context Banner and Chat Integration Summary

**One-liner:** Complete bidirectional context bridge with animated UI banners, dual transcript injection, and seamless text/voice switching.

## What Was Built

### 1. VoiceCallContextBanner Component (`components/chat/voice-call-context-banner.tsx`)
- **Pre-call state:** Shows "FRED remembers: Last discussed -- [topic]" with Sahara orange accent and Phone icon
- **Post-call state:** Shows "Voice call summary: [summary]" with dismissible X button and left border accent
- **Animated:** framer-motion AnimatePresence with fade + slide-from-top transitions (200ms)
- Returns null when no context is available

### 2. Chat Page Integration (`app/chat/page.tsx`)
- `lastDiscussedTopic` and `lastCallSummary` state variables
- useEffect fetches voice context from `/api/voice/context` on mount for pre-call banner
- VoiceCallContextBanner rendered above the chat area, max-w-4xl aligned with chat
- `callModalOpen` passed as `isCallActive` to suppress pre-call banner during calls
- `onCallEnd` callback on CallFredModal propagates summary to `setLastCallSummary`
- Dismiss handler clears `lastCallSummary` state

### 3. CallFredModal Enhancements (`components/dashboard/call-fred-modal.tsx`)
- Added `onCallEnd?: (summary: string | null) => void` callback prop
- Dual transcript POST on call end via `Promise.allSettled`:
  - `/api/voice/transcript` -- LLM-summarized episodic memory storage
  - `/api/fred/call/transcript` -- Channel-entry based storage with room ownership validation
- Fires `onCallEnd(summaryText)` after all transcript injections complete

### 4. LiveKit Webhook (`app/api/livekit/webhook/route.ts`)
- Comment in `room_finished` handler documenting that transcript injection is client-side

### Pre-existing (from 82-01)
- `injectVoiceTranscriptToChat` in `lib/fred/chat-voice-bridge.ts`
- `POST /api/fred/call/transcript` with auth + room ownership validation
- `POST /api/voice/transcript` with LLM summarization
- `GET /api/voice/context` returning lastTopic and preamble
- `LastDiscussed` component in call modal idle state

## Must-Have Truth Verification

- [x] After a voice call ends, the transcript and summary are injected back into the chat history
- [x] Before a voice call starts, the user sees "FRED remembers: Last discussed -- [topic]"
- [x] Switching between text and voice on mobile feels seamless with no context loss

## Verification

- `npx tsc --noEmit` passes for all Phase 82 files (3 pre-existing errors in fred/chat/route.ts unrelated)
- VoiceCallContextBanner renders correctly for pre-call, post-call, and empty states
- Dual transcript POST fires on call end with Promise.allSettled
- Room ownership validation prevents cross-user transcript injection
