# Research Summary: v7.0 Closed-Loop UX Feedback System

**Domain:** Multi-channel feedback collection + AI analysis + auto-triage for AI SaaS
**Researched:** 2026-03-04
**Overall confidence:** MEDIUM-HIGH

---

## Executive Summary

Sahara's v7.0 milestone adds a closed-loop UX feedback system to the FRED cognitive engine. The core finding is that **over 70% of the required capabilities already exist in the current stack**. PostHog (already installed) provides surveys, session replay, and analytics. The Vercel AI SDK (already installed) handles sentiment analysis and categorization via structured output -- no standalone NLP library needed. Supabase provides storage and realtime subscriptions for the admin dashboard. Trigger.dev handles all background processing.

The critical new additions are limited to three packages: `@linear/sdk` for typed issue creation (replacing raw GraphQL calls), `langfuse` + `@langfuse/vercel-ai` for LLM observability and prompt A/B testing, and optionally `whatsapp` (Meta's official SDK) for replacing the fragile BrowserBase WhatsApp scraping approach. Total new dependencies: 3 required, 1 deferred.

The most important architectural decision is to build a **source-agnostic feedback pipeline**: all channels (in-app thumbs, PostHog surveys, WhatsApp, SMS, Sentry) normalize to the same Supabase schema and flow through the same classification and triage pipeline. This avoids the common mistake of building separate processing for each channel.

The highest-risk component is the FRED self-improvement loop (prompt A/B testing based on feedback). This requires Langfuse integration, sufficient feedback volume, and disciplined human review of prompt changes. Auto-deploying prompt changes without controlled testing is explicitly flagged as a critical pitfall.

## Key Findings

**Stack:** 3 new packages needed (`@linear/sdk`, `langfuse`, `@langfuse/vercel-ai`). Everything else leverages existing dependencies.

**Architecture:** Event-driven pipeline: COLLECT -> CLASSIFY -> TRIAGE -> CLOSE. All async via Trigger.dev. Never block user interactions on AI classification.

**Critical pitfall:** Prompt regression from uncontrolled self-improvement loop. Must A/B test prompt changes with Langfuse before deploying.

## Implications for Roadmap

Based on research, suggested phase structure:

1. **Feedback Collection Infrastructure** -- Foundation phase
   - Addresses: Supabase schema, PostHog Surveys activation, thumbs up/down component, feedback API routes
   - Avoids: Starting with analysis before having data to analyze
   - Rationale: Cannot do anything downstream without collection in place

2. **AI Classification Pipeline** -- Core intelligence phase
   - Addresses: Trigger.dev classification task, Vercel AI SDK structured output, admin dashboard (basic)
   - Avoids: Analysis paralysis (auto-classification prevents feedback pile-up)
   - Rationale: Raw feedback is useless; classification is what makes it actionable

3. **LLM Observability and Trace Linking** -- Langfuse integration phase
   - Addresses: Langfuse setup, trace-to-feedback linking, prompt versioning
   - Avoids: Building the self-improvement loop without the observability foundation
   - Rationale: Must be in place before A/B testing can begin; trace ID propagation is a prerequisite

4. **Auto-Triage and Linear Integration** -- Action phase
   - Addresses: Feedback clustering, Linear SDK issue creation, similarity dedup
   - Avoids: Per-feedback issue creation (which floods Linear)
   - Rationale: Clustering requires sufficient classified feedback data

5. **Close-the-Loop and WhatsApp API** -- Engagement phase
   - Addresses: Resolution notifications, WhatsApp Cloud API migration, multi-channel reply
   - Avoids: WhatsApp approval timeline blocking earlier phases
   - Rationale: Close-the-loop is the "loop" in "closed-loop"; deferred because it requires issues to be resolved first

6. **FRED Self-Improvement Loop** -- Advanced phase
   - Addresses: Prompt A/B testing, feedback-driven prompt refinement, automated eval pipeline
   - Avoids: Prompt regression from uncontrolled changes
   - Rationale: Requires all previous phases (collection, classification, observability) to be stable

**Phase ordering rationale:**
- Collection before classification (need data to classify)
- Classification before triage (need categories to cluster)
- Langfuse before A/B testing (need traces to correlate)
- Triage before close-the-loop (need resolved issues to notify about)
- Everything before self-improvement loop (most complex, highest risk)

**Research flags for phases:**
- Phase 3 (Langfuse): Likely needs deeper research on OpenTelemetry configuration in Next.js 16
- Phase 5 (WhatsApp): Meta Business approval process introduces timeline uncertainty
- Phase 6 (Self-improvement): Needs careful design of eval criteria before implementation

## Confidence Assessment

| Area | Confidence | Notes |
|---|---|---|
| Stack | HIGH | Minimal new dependencies; existing tools cover most needs |
| Features | HIGH | Table stakes well-understood; differentiators clearly defined |
| Architecture | MEDIUM-HIGH | Event-driven pipeline pattern is well-established; Langfuse integration specifics need verification during implementation |
| Pitfalls | MEDIUM | WhatsApp shadow delivery issue is documented but hard to fully prevent; prompt regression requires operational discipline |

## Gaps to Address

- **Langfuse + Next.js 16 + Vercel AI SDK 6 integration specifics:** Need to verify OpenTelemetry span processor works with the latest SDK versions during implementation
- **WhatsApp Business API group message support:** Unclear if the Cloud API can read messages from existing WhatsApp groups (vs only 1:1 conversations). May need to keep BrowserBase for group monitoring
- **PostHog Surveys custom styling:** Need to verify that survey widgets can be styled to match Sahara's design system (Sahara Orange #ff6a1a) without heavy customization
- **Langfuse pricing at scale:** Free tier is 50k observations/month. With multiple AI calls per user session, this may be reached quickly. Need to monitor usage during Phase 3
- **pgvector for feedback similarity:** Project already has pgvector but need to verify it is used for embeddings; may need to generate and store embeddings for feedback clustering
