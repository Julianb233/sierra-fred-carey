---
phase: 82-chat-voice-continuity
plan: 02
subsystem: chat-voice-bridge
tags: [voice, chat, continuity, transcript, context-banner, ui]
dependency-graph:
  requires: [82-01]
  provides:
    - Voice transcript injection into chat history (injectVoiceTranscriptToChat)
    - POST /api/fred/call/transcript endpoint for client-side transcript posting
    - VoiceCallContextBanner component for pre/post call context awareness
    - Chat page integration with voice context fetching
  affects:
    - Chat page UX (seamless text/voice switching)
tech-stack:
  added: []
  patterns:
    - "Client-side transcript posting (LiveKit data channel -> POST endpoint)"
    - "Pre-call context banner with topic from /api/voice/context"
    - "Post-call summary banner with dismiss functionality"
key-files:
  created:
    - components/chat/voice-call-context-banner.tsx
  modified:
    - app/chat/page.tsx (added VoiceCallContextBanner, voice context fetching)
  pre-existing:
    - lib/fred/chat-voice-bridge.ts (injectVoiceTranscriptToChat already existed from 82-01)
    - app/api/fred/call/transcript/route.ts (already existed from 82-01)
decisions:
  - id: "82-02-d1"
    decision: "Reuse existing /api/voice/context endpoint for lastTopic fetching"
    reason: "Endpoint already returns lastTopic from 82-01, no need to duplicate"
  - id: "82-02-d2"
    decision: "Banner renders above chat area, not inside ChatInterface"
    reason: "Keeps ChatInterface component clean and focused on messages"
metrics:
  duration: "~10 minutes"
  completed: "2026-03-08"
---

# Phase 82 Plan 02: Voice Context Banner and Chat Integration Summary

**One-liner:** VoiceCallContextBanner component showing pre-call topic and post-call summary, integrated into the chat page with voice context fetching.

## What Was Built

### 1. VoiceCallContextBanner Component (`components/chat/voice-call-context-banner.tsx`)
- Pre-call state: Shows "FRED remembers: Last discussed -- [topic]" with Sahara orange accent and Phone icon
- Post-call state: Shows "Voice call summary: [summary]" with dismissible X button and left border accent
- Animated transitions (CSS animate-in)
- Returns null when no context is available

### 2. Chat Page Integration (`app/chat/page.tsx`)
- Added `lastDiscussedTopic` and `lastCallSummary` state variables
- Added useEffect to fetch voice context from `/api/voice/context` on mount
- Renders VoiceCallContextBanner above the chat area
- Banner passes `callModalOpen` as `isCallActive` to suppress pre-call banner during calls
- Dismiss handler clears `lastCallSummary` state

### Pre-existing (from 82-01)
- `injectVoiceTranscriptToChat` in `lib/fred/chat-voice-bridge.ts` -- stores transcript entries as channel entries
- `POST /api/fred/call/transcript` -- accepts and stores transcripts with auth and room ownership validation
- `lib/voice/transcript-injector.ts` -- LLM-powered transcript summarization
- `POST /api/voice/transcript` -- server-side transcript storage

## Verification

- `npx tsc --noEmit` passes with no errors in modified files
- VoiceCallContextBanner renders correctly for pre-call, post-call, and empty states
- Chat page imports and renders the banner component
