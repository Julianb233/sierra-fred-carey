# Phase 02: Free Tier Features - Context

**Phase:** 02
**Goal:** Implement all Free tier features for Sahara
**Status:** In Progress
**Started:** 2026-02-05

---

## Overview

Phase 02 builds the Free tier experience on top of the FRED Cognitive Engine foundation (Phase 01). The Free tier includes:

1. **Reality Lens** - 5-factor startup assessment (DONE)
2. **FRED Chat** - AI co-founder chat interface
3. **Decision History** - Track past conversations and decisions
4. **Tier Gating** - Restrict Pro/Studio features
5. **Onboarding** - New user introduction flow

---

## Dependencies

- Phase 01 FRED Foundation (COMPLETE)
  - XState decision machine
  - 7-factor scoring
  - FRED memory system
  - Multi-provider AI reliability

---

## Key Files

### Existing (from Phase 01)
- `lib/fred/` - FRED cognitive engine
- `lib/db/fred-memory.ts` - Memory operations
- `app/api/fred/` - FRED API endpoints
- `lib/ai/` - AI client with fallback chain

### New for Phase 02
- `components/chat/` - Enhanced chat interface
- `components/history/` - Decision history UI
- `components/tier/` - Tier gating components
- `components/onboarding/` - Onboarding wizard
- `app/onboarding/` - Onboarding page
- `app/dashboard/history/` - History page

---

## Architecture Decisions

### Chat Interface
- Use Server-Sent Events (SSE) for streaming
- Show cognitive processing states in UI
- Store all conversations in episodic memory
- Support session resumption

### Tier Gating
- Client-side: Visual locks, upgrade prompts
- Server-side: API middleware, rate limiting
- Source of truth: Stripe subscription status
- Cache tier in context for performance

### Onboarding
- Multi-step wizard with skip option
- Store startup context in semantic memory
- Optional Reality Lens demo
- Progressive disclosure of features

---

## Rate Limits by Tier

| Endpoint | Free | Pro | Studio |
|----------|------|-----|--------|
| /api/fred/chat | 20/day | 100/day | Unlimited |
| /api/fred/reality-lens | 5/day | 50/day | 500/day |
| /api/fred/analyze | 5/day | 50/day | 500/day |

---

## Success Criteria

- [ ] Reality Lens produces useful 5-factor assessments
- [ ] Free users can chat with FRED and track decisions
- [ ] Tier gating correctly restricts Pro/Studio features
- [ ] New users complete onboarding flow

---

*Context file for Phase 02 - GSD Framework*
