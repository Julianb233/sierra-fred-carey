# Phase 01: FRED Cognitive Engine Foundation

## Overview

Build the core FRED cognitive engine that powers all Sahara features. This is the foundation layer - nothing else works without it.

## Scope

### In Scope
- Database schema for three-layer memory (episodic, semantic, procedural)
- XState v5 decision state machine
- 7-factor scoring engine
- Vercel AI SDK 6 integration
- FRED API endpoints
- Multi-provider reliability with circuit breaker

### Out of Scope
- User-facing UI (handled in Phase 02)
- Tier gating (handled in Phase 02)
- Document processing (handled in Phase 03)
- Virtual agents (handled in Phase 04)

## Technical Context

### Existing Infrastructure
- Next.js 16 with App Router
- Supabase (auth + Postgres)
- Multi-provider AI client (needs upgrade to AI SDK 6)
- Stripe billing (ready for tier gating)

### New Dependencies
- `ai` package v6 (Vercel AI SDK)
- `xstate` v5
- `zod` v4 (for structured outputs)
- `pgvector` extension in Supabase

### Key Files to Modify
- `lib/ai/client.ts` - Replace with AI SDK 6
- `lib/db/` - Add memory schema queries
- `app/api/` - Add FRED endpoints

## Success Criteria

1. FRED state machine passes all decision flow tests
2. 7-factor scoring produces consistent, explainable results
3. Memory persistence stores and retrieves context correctly
4. Multi-provider fallback achieves 99%+ availability

## Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| AI reliability math | HIGH | HIGH | Target 99%+ per step, checkpoint every state transition |
| XState learning curve | MEDIUM | MEDIUM | Use Stately Studio for visual debugging |
| pgvector performance | LOW | MEDIUM | Index properly, test with realistic data volumes |

## Plan Order

1. **01-01**: Database schema (foundation - everything depends on this)
2. **01-02**: State machine (core FRED logic)
3. **01-03**: Scoring engine (decision quality)
4. **01-04**: AI SDK integration (provider abstraction)
5. **01-05**: API endpoints (external interface)
6. **01-06**: Circuit breaker (reliability)

Plans 04-06 can be partially parallelized after 01-02 is complete.

---

*Phase context created: 2026-02-05*
