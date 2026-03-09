---
phase: 82-chat-voice-continuity
plan: 02
subsystem: voice-bugs-mobile-polish
tags: [voice, elevenlabs, streaming, mobile, ux]
dependency_graph:
  requires: [82-01]
  provides: [fred-zaharix-voice, streaming-timeout, mobile-voice-ux]
  affects: []
tech_stack:
  added: []
  patterns: [streaming-inactivity-timeout, mobile-touch-targets]
key_files:
  created: []
  modified:
    - workers/voice-agent/agent.ts
    - lib/hooks/use-fred-chat.ts
    - components/dashboard/call-fred-modal.tsx
    - components/chat/voice-call-context-banner.tsx
decisions:
  - ElevenLabs voice ID changed to uxq5gLBpu73uF1Aqzb2t (Fred Zaharix)
  - 30-second streaming inactivity timeout prevents indefinite freezing
  - Mobile call controls use wider gap (gap-8) to prevent mis-taps
  - VoiceCallContextBanner dismiss button increased to p-1.5 with h-4 w-4 icon
metrics:
  duration: ~10min
  completed: 2026-03-09
---

# Phase 82 Plan 02: Voice Bugs & Mobile Polish Summary

Fred Zaharix ElevenLabs voice wired, chat streaming timeout added, mobile touch targets polished.

## What Was Done

### Task 1: Wire ElevenLabs Fred Zaharix voice ID and fix chat freezing
- Changed voice ID from `fpxks3eObfRI1jkeCD2k` to `uxq5gLBpu73uF1Aqzb2t` (Fred Zaharix)
- Added 30-second streaming inactivity timeout in `use-fred-chat.ts`
  - Uses `resetInactivityTimer()` on every data chunk
  - Cancels reader if no data for 30s, triggering retry logic
  - Timer cleaned up in `finally` block
- Verified `sendingRef.current` always reset in outer `finally` block (line 664)
- All 14 existing tests pass

### Task 2: Mobile call/text continuity polish
- Added `max-h-[90dvh] overflow-y-auto` to DialogContent for mobile viewport fit
- Changed call controls gap to `gap-8 sm:gap-6` for wider mobile spacing
- Increased VoiceCallContextBanner dismiss button from `p-0.5` to `p-1.5` with `h-4 w-4` icon
- Start Call button already has `h-12` (48px) -- meets 44px minimum
- Mute button is `h-14 w-14` (56px), End Call is `h-16 w-16` (64px) -- both exceed minimum

## Deviations from Plan

None -- plan executed exactly as written.

## Commits

| Commit | Description |
|--------|-------------|
| 14511ad | feat(82-02): wire Fred Zaharix voice ID and add chat streaming timeout |
| c010ce6 | feat(82-02): polish mobile call/text continuity touch targets |
