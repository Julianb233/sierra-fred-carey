# Research Summary: Sahara v7.0 -- Closed-Loop UX Feedback System

**Domain:** AI-powered SaaS feedback loops (founder coaching vertical)
**Researched:** 2026-03-04
**Overall confidence:** MEDIUM-HIGH

## Executive Summary

Sahara v7.0 aims to build a complete feedback loop where founder interactions improve FRED's quality over time, while giving admins visibility into UX issues. Research reveals this is a well-understood domain with clear table-stakes patterns (thumbs up/down, admin dashboards, sentiment tracking) and meaningful differentiation opportunities (RLHF-lite prompt refinement, close-the-loop notifications, multi-channel aggregation).

Sahara has a significant head start. The existing A/B testing framework (`lib/ai/ab-testing.ts`), WhatsApp-to-Linear feedback pipeline (`trigger/sahara-whatsapp-monitor.ts`), and multi-channel conversation context (`lib/channels/conversation-context.ts`) provide foundational infrastructure that most products would need to build from scratch. v7.0 is about formalizing and extending these pieces into a coherent system, not starting from zero.

The biggest risk is over-engineering. The temptation to build a full feedback analytics platform (like Thematic, Canny, or Userpilot) is strong but misguided. Sahara is a founder OS, not a feedback tool. The right approach is a lean, tightly integrated feedback loop that makes FRED measurably better -- not a general-purpose feedback management system.

The critical differentiator for Sahara is D-2 (RLHF-Lite Prompt Refinement): using feedback signals to automatically propose prompt improvements, A/B test them, and deploy winners with human approval. This creates a genuine self-improving AI -- rare in the market and aligned with Sahara's core value proposition.

## Key Findings

**Stack:** No new major dependencies needed. Extends existing Supabase (data model), Vercel AI SDK (sentiment piggyback), Trigger.dev (scheduled analysis jobs), PostHog (analytics), and existing A/B testing infrastructure.

**Architecture:** Feedback flows through a unified `feedback_signals` table, gets analyzed by scheduled LLM jobs, surfaces in admin dashboard, and feeds back into prompt refinement via the existing A/B testing system.

**Critical pitfall:** Auto-deploying prompt changes without human review. Must have human-in-the-loop gate for all prompt modifications.

## Implications for Roadmap

Based on research, suggested phase structure:

1. **Foundation (Data + Collection)** -- Build feedback data model and thumbs up/down UI
   - Addresses: TS-4, TS-1
   - Avoids: Shipping collection without storage

2. **Visibility (Admin + Sentiment)** -- Admin dashboard and sentiment tracking
   - Addresses: TS-2, TS-3
   - Avoids: Collecting feedback into a black hole

3. **Intelligence (Analysis + A/B Integration)** -- AI categorization and feedback-aware experiments
   - Addresses: D-1, D-5, D-4
   - Avoids: Manual feedback review at scale

4. **Self-Improvement (RLHF-Lite + Close-the-Loop)** -- Prompt refinement and user notification
   - Addresses: D-2, D-3
   - Avoids: Building the hard part before data exists

**Phase ordering rationale:**
- Phase 1 must come first: nothing works without the data model
- Phase 2 gives immediate admin visibility (Fred Cary is already demanding this via WhatsApp)
- Phase 3 requires accumulated feedback data (2-4 weeks), so natural ordering
- Phase 4 is the capstone: self-improvement needs analysis infrastructure from Phase 3

**Research flags for phases:**
- Phase 3: Needs deeper research on statistical significance thresholds for A/B tests with feedback metrics
- Phase 4: RLHF-lite prompt refinement needs careful design -- research into prompt versioning schemas and regression testing

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Features (table stakes) | HIGH | Universal patterns, well-documented across industry |
| Features (differentiators) | MEDIUM | Individual components proven; integration is novel |
| Architecture | HIGH | Extends existing Sahara infrastructure, no new paradigms |
| Pitfalls | HIGH | Well-documented anti-patterns in feedback system design |

## Gaps to Address

- Statistical significance calculation for feedback-based A/B testing (what sample size is needed?)
- Voice call feedback UX (post-call rating prompt design, timing)
- SMS feedback collection UX (character limits, response parsing)
- Prompt versioning schema design (how to track which prompt version produced which response)
- Regression testing for prompt patches (how to ensure a fix for one topic does not degrade another)
