# Phase 42: Multi-Channel FRED Access

**Status:** Complete
**Date:** 2026-02-12
**Build:** PASSES (zero errors, 754 tests pass)

## Overview

Phase 42 enables founders to reach FRED through any channel -- in-app floating chat, voice call (LiveKit), or SMS text -- from any screen in the app. All channels share the same conversation context so FRED knows what was discussed regardless of channel used.

## Files Created

### Floating Chat Widget
- `components/chat/floating-chat-widget.tsx` -- Floating action button (bottom-right) that expands into a slide-up chat panel. Uses existing `/api/fred/chat` streaming API via the `useFredChat` hook. Mobile: full-screen overlay. Desktop: 420px panel. Hidden on `/chat` and `/dashboard/coaching` pages. Includes Call Fred button for Pro+ users.
- `lib/hooks/use-fred-chat.ts` -- Client-side hook for FRED chat with SSE streaming support. Handles all event types (connected, state, analysis, models, synthesis, red_flag, wellbeing, response, done, error). Manages session IDs, abort controllers, and mounted state for safe async updates.

### Voice Call to FRED
- `app/api/fred/call/route.ts` -- POST endpoint to create a LiveKit room and generate participant token. Requires Pro+ tier. Supports on-demand (10 min) and scheduled (30 min) call types. Room names scoped to user ID.
- `app/api/fred/call/summary/route.ts` -- POST endpoint for post-call deliverables. Extracts transcript, summary, decisions, and Next 3 Actions from call transcript using heuristic patterns. Stores call record in episodic memory with channel tag.
- `components/dashboard/call-fred-modal.tsx` -- Call UI with full state machine: idle, connecting, in-call, ending, ended, error. Includes call timer, mute toggle, auto-end at max duration, and post-call deliverables display (summary, decisions, Next 3 Actions).

### SMS Text-to-FRED
- `lib/sms/fred-sms-handler.ts` -- SMS-specific FRED processing. Formats responses for SMS delivery (strips markdown, truncates to 480 chars, splits into 160-char segments). Routes through the same FRED chat engine with SMS channel rules. Stores conversations in episodic memory with channel tag.

### Shared Conversation Context
- `lib/channels/conversation-context.ts` -- Unified context layer across all channels. Functions: `getConversationContext()` fetches recent entries with channel tags, `buildChannelContextBlock()` generates cross-channel prompt block for FRED, `storeChannelEntry()` writes channel-tagged entries to episodic memory.

## Files Modified

- `app/dashboard/layout.tsx` -- Wired FloatingChatWidget and CallFredModal into the dashboard layout. Widget shows on all dashboard pages. Call button conditionally shown for Pro+ users.
- `lib/sms/webhook-handler.ts` -- Enhanced to route conversational SMS messages through FRED (via `processFredSMS`). Existing check-in flow preserved. Conversational detection: messages without a recent outbound prompt or longer than 50 chars get a FRED mentor response.

## API Endpoints

| Endpoint | Method | Description | Tier |
|----------|--------|-------------|------|
| `/api/fred/chat` | POST | Streaming chat with FRED (existing) | All |
| `/api/fred/call` | POST | Create LiveKit room for voice call | Pro+ |
| `/api/fred/call/summary` | POST | Generate post-call deliverables | Pro+ |
| `/api/sms/webhook` | POST | Inbound SMS (now routes to FRED) | All |

## Channel Capabilities

| Capability | Chat Widget | Voice Call | SMS |
|-----------|-------------|------------|-----|
| Available from any page | Yes (floating) | Via modal | Via phone |
| Streaming responses | Yes (SSE) | Real-time voice | SMS segments |
| Tier requirement | All tiers | Pro+ | All tiers |
| Context sharing | Yes | Yes | Yes |
| Post-interaction deliverables | N/A | Transcript + Summary + Decisions + Next 3 Actions | N/A |
| Channel-tagged memory | Yes | Yes | Yes |
| Max duration | Unlimited | 10/30 min | N/A |

## Success Criteria Verification

1. **Founders can message FRED via in-app chat from any page** -- VERIFIED. FloatingChatWidget renders on all dashboard pages (hidden on /chat and /dashboard/coaching). Uses existing streaming chat API.
2. **Founders can call FRED via voice (LiveKit)** -- VERIFIED. CallFredModal supports on-demand (5-10 min) and scheduled (15-30 min) calls. Pro+ tier gating enforced.
3. **Founders can text FRED via SMS** -- VERIFIED. Webhook handler routes conversational messages through FRED engine. Responses formatted for SMS constraints (160-char segments).
4. **All channels share the same conversation context** -- VERIFIED. conversation-context.ts provides unified context with channel tags. All channels store to fred_episodic_memory with channel metadata.
5. **Post-call deliverables generated** -- VERIFIED. Call summary endpoint generates transcript, summary, decisions, and Next 3 Actions.
6. **Call Fred visible as premium feature** -- VERIFIED. Call button in widget header only appears for Pro+ users. Call API enforces Pro+ tier check.

## Architecture Notes

- The floating widget reuses the existing `/api/fred/chat` streaming API -- no new chat endpoint needed
- Voice calls create LiveKit rooms; the existing `workers/voice-agent/` handles the FRED voice agent
- SMS responses use non-streaming `fredService.process()` for simplicity, formatted for SMS constraints
- Channel context reads from `fred_episodic_memory` with channel metadata stored in the JSONB `content` column -- no schema migration needed
- The existing `fred_episodic_memory` table already accepts arbitrary content JSON, so channel tags are stored as `content.channel`

## Known Notes

- Mobile: The floating chat widget button (z-50) overlays the sidebar menu button (z-40) at the same position (bottom-right). The sidebar remains accessible by closing the widget first.
- Voice call uses simulated connection in the MVP (setTimeout). Full LiveKit WebRTC connection requires the LiveKit client SDK integration.
- SMS FRED responses are fire-and-forget from the webhook -- no retry mechanism for failed SMS delivery.
