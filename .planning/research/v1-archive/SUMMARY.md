# Research Summary

**Project:** Sahara - AI-Powered Founder Operating System with FRED Cognitive Engine
**Synthesized:** 2026-01-28
**Overall Confidence:** HIGH

---

## Executive Summary

Building Sahara/FRED requires constructing a **cognitive decision engine** with multi-step AI workflows, structured memory, and multi-provider reliability. The 2026 best practices are clear: use the Vercel AI SDK 6 for unified AI interactions, XState v5 for deterministic state machine control, and a three-layer memory architecture (episodic, semantic, procedural) using pgvector in Supabase. The existing Next.js 16 + Supabase + Stripe infrastructure is solid and should be extended, not replaced.

The critical risk is **AI reliability math**: a 95%-reliable step repeated 20 times yields only 36% workflow success. FRED's multi-step analysis flow (intake, validation, scoring, synthesis, decision) must target 99%+ per-step reliability with checkpoints, observability, and human escalation triggers built in from day one. Additionally, the 7-factor scoring engine must implement calibration tracking to prevent miscalibrated confidence from eroding user trust.

Feature-wise, the market has matured rapidly. Basic AI chat and pitch analysis are now table stakes. Sahara's differentiation comes from: (1) FRED's structured cognitive framework vs. generic ChatGPT wrappers, (2) memory persistence creating switching costs, (3) virtual team agents with specialized personas, and (4) SMS accountability check-ins - a surprisingly underserved niche. The pricing tiers are aggressive ($99 Pro, $249 Studio) and require clear value separation to justify conversion from strong free alternatives.

---

## Key Findings

### From STACK.md

| Technology | Purpose | Rationale |
|------------|---------|-----------|
| **Vercel AI SDK 6** | Unified AI interface | Replace custom multi-provider code. ToolLoopAgent for FRED, native Next.js, 2.8M weekly downloads |
| **XState v5** | Decision state machine | Visual debugging, TypeScript-first, Stately Studio for designing FRED's logic |
| **Zod 4** | Schema validation | 14x faster, built-in JSON Schema for AI structured outputs |
| **Twilio** | SMS check-ins | Industry standard, but A2P 10DLC registration requires 2-4 weeks lead time |
| **Vercel Cron** | Weekly scheduling | Native integration, no external service needed |

**Critical version requirements:**
- AI SDK 6.x (codemod available for migration)
- XState 5.x (dramatically improved TypeScript inference via `setup()`)
- Zod 4.x (performance critical for AI response validation)

### From FEATURES.md

**Must-Have (Table Stakes):**
- AI chat with context retention
- Startup assessment/scoring (Reality Lens)
- Pitch deck analysis (slide-by-slide feedback expected)
- Document generation
- Multi-provider AI reliability
- Secure data handling

**Should-Have (Differentiators):**
- FRED cognitive framework (7-factor scoring) - HIGH differentiation
- Memory & context persistence - HIGH differentiation (creates switching costs)
- Virtual team agents (specialized) - HIGH differentiation if executed well
- SMS accountability check-ins - UNDERSERVED market opportunity
- Investor Readiness Score - Competitive but can differentiate via depth

**Defer to v2+:**
- Outcome tracking (close the loop on advice quality)
- Multi-founder collaboration
- Integration ecosystem (CRM, financials)

**Anti-Features to Avoid:**
- Generic chatbot without structure
- Fake human-like personality
- Auto-generated pitch decks (review only)
- "Always on" unbounded agents
- Complex usage-based pricing

### From ARCHITECTURE.md

**Major Components:**

1. **FRED Cognitive Engine** - State machine with states: INTAKE -> VALIDATION -> MENTAL_MODELS -> SYNTHESIS -> AUTO-DECIDE/ESCALATE -> EXECUTE/HUMAN-IN-LOOP
2. **Memory Persistence** - Three-layer architecture (episodic, semantic, procedural) with pgvector
3. **Multi-Agent Router** - Orchestrator-worker pattern routing to specialized agents
4. **Document Pipeline** - PDF extraction -> chunking -> embedding -> RAG retrieval
5. **Safety/Audit Layer** - Three-layer governance, runtime validation, infrastructure controls

**Key Patterns:**
- State machine for all decision flows (deterministic, auditable)
- Repository pattern for memory (swappable, testable)
- Circuit breaker for AI providers (40% failure threshold, 20-min cooldown)
- Structured outputs with Zod validation (never raw AI to users)

**Critical Dependencies:**
```
FRED Cognitive Engine (foundation)
  -> Memory Persistence (required for context)
    -> All other features
```

### From PITFALLS.md

**Top 5 Critical Pitfalls:**

| Pitfall | Risk | Prevention |
|---------|------|------------|
| **#1 AI Reliability Math** | 20-step flow at 95%/step = 36% success | Target 99%+ per step, add checkpoints, observability from day one |
| **#2 Context Window Mythology** | 40-60% cost waste, "lost in middle" effect | Implement structured memory blocks, budget tokens, use selective retrieval |
| **#3 State Machine Underengineering** | Unpredictable agent behavior, debugging impossible | Use XState v5 with explicit states, deterministic backbone |
| **#4 Decision Score Miscalibration** | Bad decisions from false confidence, legal risk | Track predicted vs actual outcomes, add uncertainty ranges |
| **#5 A2P 10DLC Delays** | SMS feature blocked 2-4 weeks | Start registration IMMEDIATELY, plan for rejections |

**Phase-Specific Warnings:**
- FRED Foundation: Reliability, context, state machine, calibration
- Pro Tier: PDF processing fragility, Stripe webhook silent failures
- Studio Tier: 10DLC registration, persona drift

---

## Implications for Roadmap

Based on combined research, the following phase structure is recommended:

### Suggested Phase Structure

**Phase 1: FRED Cognitive Engine Foundation**
- **Rationale:** Everything depends on this. 100% of features use FRED's analysis framework.
- **Delivers:** Core state machine, 7-factor scoring, memory persistence, API endpoints
- **Features:** Basic FRED chat, decision framework, memory storage
- **Pitfalls to avoid:** #1 (reliability), #2 (context), #3 (state machine), #4 (calibration)
- **Research flag:** STANDARD PATTERNS - well-documented in XState, Vercel AI SDK docs

**Phase 2: Free Tier Value Proposition**
- **Rationale:** Validate core product, build user base, test FRED in production
- **Delivers:** Reality Lens (5-factor), decision history, tier gating infrastructure
- **Features:** Startup assessment, basic chat, decision tracking
- **Pitfalls to avoid:** #8 (too-generous tier), #12 (onboarding friction), #9 (scattered gating)
- **Research flag:** NEEDS RESEARCH - tier boundary optimization requires user testing

**Phase 3: Pro Tier - Investor Tools**
- **Rationale:** First monetization layer, builds on FRED foundation
- **Delivers:** Pitch deck analysis, investor readiness score, strategy documents
- **Features:** PDF upload/analysis, scoring dashboard, document generation
- **Pitfalls to avoid:** #6 (PDF fragility), #11 (Stripe webhooks)
- **Research flag:** STANDARD PATTERNS - RAG/PDF extraction well-documented

**Phase 4: Studio Tier - Virtual Team & SMS**
- **Rationale:** Premium differentiation, requires proven FRED engine
- **Delivers:** Specialized agents, SMS accountability, Boardy integration
- **Features:** Founder ops agent, fundraising agent, growth agent, weekly check-ins
- **Pitfalls to avoid:** #5 (10DLC - start registration in Phase 1!), #10 (persona drift)
- **Research flag:** NEEDS RESEARCH - agent orchestration patterns, persona stability

**Parallel Track: A2P 10DLC Registration**
- **Rationale:** 4-week lead time, cannot be parallelized with development
- **Action:** Start registration during Phase 1, expect completion by Phase 4

### Phase Grouping Rationale

| Grouping | Rationale |
|----------|-----------|
| FRED first | 100% dependency - nothing works without cognitive engine |
| Free before Pro | Validate product-market fit before monetization |
| Pro before Studio | Build PDF/document infrastructure before agents need it |
| SMS in Studio | Requires agent infrastructure + 10DLC compliance (long lead time) |
| Boardy parallel | External API, minimal dependencies, can proceed independently |

---

## Research Flags

| Phase | Research Need | Reason |
|-------|---------------|--------|
| Phase 1 | SKIP | Well-documented patterns: XState v5, Vercel AI SDK 6, Supabase pgvector |
| Phase 2 | `/gsd:research-phase` | Tier boundary optimization, onboarding funnel design |
| Phase 3 | SKIP | RAG patterns, PDF extraction well-documented |
| Phase 4 | `/gsd:research-phase` | Multi-agent orchestration, persona drift prevention, SMS compliance nuances |

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All recommendations from official docs, massive community adoption |
| Features | MEDIUM-HIGH | Table stakes clear; differentiator validation needs user feedback |
| Architecture | HIGH | Patterns from Google, Microsoft, LangChain; research citations solid |
| Pitfalls | HIGH | Multiple authoritative sources, production data from LangChain survey |

### Gaps to Address

1. **Calibration tracking implementation:** Research identifies the need but doesn't provide implementation patterns. Plan for experimentation.

2. **Persona drift detection:** Emerging research area. May need custom evaluation framework.

3. **Boardy API specifics:** External dependency. Confirm API availability, rate limits, terms before committing to timeline.

4. **Tier conversion optimization:** 2-5% freemium conversion is industry standard. Need metrics framework to iterate.

5. **@stately/agent maturity:** Marked MEDIUM confidence. Evaluate during Phase 1; fallback to direct XState + AI SDK if issues arise.

---

## Aggregated Sources

### HIGH Confidence
- Vercel AI SDK Documentation (ai-sdk.dev)
- XState v5 Documentation (stately.ai)
- Twilio SMS/10DLC Documentation
- Stripe Webhooks Documentation
- Supabase Realtime & pgvector Documentation
- LangChain State of Agent Engineering 2025
- Google Multi-Agent Design Patterns

### MEDIUM Confidence
- @stately/agent (newer, evaluate during implementation)
- Persona drift research (ArXiv)
- Freemium conversion benchmarks (industry varies)

### Research Pending
- Boardy API documentation (external dependency)
- User testing for tier boundaries

---

## Ready for Roadmap

This research provides clear guidance for roadmap construction:

1. **Technology stack is validated** - proceed with Vercel AI SDK 6, XState v5, existing Supabase/Stripe
2. **Phase order is dependency-driven** - FRED Foundation -> Free -> Pro -> Studio
3. **Critical risks identified** - reliability math, 10DLC registration, calibration
4. **Differentiation strategy clear** - cognitive framework, memory persistence, SMS accountability

**Recommended immediate actions:**
- Start A2P 10DLC registration (4-week lead time)
- Begin Phase 1 with constrained FRED scope
- Instrument observability from first commit
- Define tier boundaries before building Free tier features

---

*Synthesized from: STACK.md, FEATURES.md, ARCHITECTURE.md, PITFALLS.md*
*Research date: 2026-01-28*
