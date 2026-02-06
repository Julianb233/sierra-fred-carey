# Roadmap

**Project:** Sahara - AI-Powered Founder Operating System
**Current Milestone:** v1.0 MVP
**Status:** In Progress
**Started:** 2026-02-05

---

## Milestone: v1.0 MVP

Build the core Sahara platform with FRED cognitive engine, tiered features, and monetization infrastructure.

### Phases

- [x] **Phase 01: FRED Cognitive Engine Foundation** - Core AI decision framework, state machine, memory persistence, 7-factor scoring
  - [x] 01-01-PLAN.md — Database schema for FRED memory (episodic, semantic, procedural)
  - [x] 01-02-PLAN.md — XState v5 decision state machine (INTAKE → VALIDATION → MENTAL_MODELS → SYNTHESIS → DECIDE)
  - [x] 01-03-PLAN.md — 7-factor scoring engine implementation (strategic alignment, leverage, speed, revenue, time, risk, relationships)
  - [x] 01-04-PLAN.md — Vercel AI SDK 6 integration with structured outputs
  - [x] 01-05-PLAN.md — FRED API endpoints (/api/fred/analyze, /api/fred/decide, /api/fred/memory, /api/fred/chat)
  - [x] 01-06-PLAN.md — Circuit breaker and multi-provider reliability (99%+ per-step target)

- [x] **Phase 02: Free Tier Features** - Startup Reality Lens, basic FRED chat, tier gating infrastructure
  - [x] 02-01-PLAN.md — Reality Lens 5-factor assessment engine (feasibility, economics, demand, distribution, timing)
  - [x] 02-02-PLAN.md — FRED chat interface with cognitive framework compliance
  - [x] 02-03-PLAN.md — Decision history and context tracking
  - [x] 02-04-PLAN.md — Tier gating middleware and UI components
  - [x] 02-05-PLAN.md — Onboarding flow with FRED introduction

- [x] **Phase 03: Pro Tier Features** - Investor Readiness Score, Pitch Deck Review, Strategy Documents
  - [x] 03-01-PLAN.md — PDF upload and document pipeline (extraction → chunking → embedding)
  - [x] 03-02-PLAN.md — Investor Readiness Score (0-100% with breakdown)
  - [x] 03-03-PLAN.md — Pitch Deck Review with slide-by-slide analysis
  - [x] 03-04-PLAN.md — Strategy document generation (executive summaries, market analysis, 30/60/90-day plans)
  - [x] 03-05-PLAN.md — Pro tier Stripe integration and upgrade flow

- [ ] **Phase 04: Studio Tier Features** - Virtual Team Agents, SMS Check-ins, Boardy Integration
  - [ ] 04-01-PLAN.md — Virtual agent architecture (orchestrator-worker pattern)
  - [ ] 04-02-PLAN.md — Founder Ops Agent implementation
  - [ ] 04-03-PLAN.md — Fundraising Agent implementation
  - [ ] 04-04-PLAN.md — Growth Agent implementation
  - [ ] 04-05-PLAN.md — Twilio SMS weekly check-ins with accountability tracking
  - [ ] 04-06-PLAN.md — Boardy integration for investor/advisor matching
  - [ ] 04-07-PLAN.md — Studio tier Stripe integration and upgrade flow

### Parallel Track

- [ ] **A2P 10DLC Registration** - Start during Phase 01, required for SMS in Phase 04
  - Register brand with Twilio
  - Submit campaign use case
  - Allow 2-4 weeks for approval

---

## Dependencies

```
Phase 01 (FRED Foundation)
    ↓
Phase 02 (Free Tier) ← depends on FRED being complete
    ↓
Phase 03 (Pro Tier) ← depends on Free Tier infrastructure
    ↓
Phase 04 (Studio Tier) ← depends on Pro Tier document pipeline
```

Within phases:
- 01-01 (schema) → 01-02 (state machine) → 01-03 (scoring) → 01-04, 01-05, 01-06 (can parallel)
- 02-01 through 02-05 are mostly parallelizable after 02-01
- 03-01 (PDF pipeline) → 03-02, 03-03, 03-04 (can parallel) → 03-05 (integration)
- 04-01 (architecture) → 04-02, 04-03, 04-04 (can parallel) → 04-05 (SMS) → 04-06, 04-07 (can parallel)

---

## Risk Mitigations

| Risk | Mitigation |
|------|------------|
| AI reliability (95% × 20 steps = 36% success) | Target 99%+ per step, checkpoints, observability from day one |
| Context window mythology | Structured memory blocks, budget tokens, selective retrieval |
| State machine underengineering | XState v5 with explicit states, deterministic backbone |
| Decision score miscalibration | Track predicted vs actual outcomes, add uncertainty ranges |
| A2P 10DLC delays (2-4 weeks) | Start registration during Phase 01 |
| PDF processing fragility | Robust error handling, multiple extraction strategies |
| Stripe webhook silent failures | Comprehensive logging, retry mechanism |

---

## Success Criteria

**Phase 01 Complete When:**
- [x] FRED state machine passes all decision flow tests
- [x] 7-factor scoring produces consistent, explainable results
- [x] Memory persistence stores and retrieves context correctly (API endpoints complete)
- [x] Multi-provider fallback achieves 99%+ availability (circuit breaker + fallback chain)

**Phase 02 Complete When:**
- [x] Reality Lens produces useful 5-factor assessments
- [x] Free users can chat with FRED and track decisions
- [x] Tier gating correctly restricts Pro/Studio features

**Phase 03 Complete When:**
- [x] PDF upload and analysis working for pitch decks
- [x] Investor Readiness Score calculating correctly
- [x] Strategy documents generating with quality output
- [x] Pro tier purchase flow complete

**Phase 04 Complete When:**
- [ ] All three virtual agents operational
- [ ] SMS check-ins sending weekly with responses tracked
- [ ] Studio tier purchase flow complete

---

*Generated from research: 2026-02-05*
*Based on: .planning/research/SUMMARY.md*
