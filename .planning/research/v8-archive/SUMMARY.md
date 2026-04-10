# Research Summary -- v7.0 UX Feedback Loop

**Project:** Sahara v7.0
**Synthesized:** 2026-03-04
**Overall confidence:** MEDIUM-HIGH
**Inputs:** STACK.md, FEATURES.md, ARCHITECTURE.md, PITFALLS.md

---

## Executive Summary

- **Sahara is not starting from scratch.** The existing A/B testing framework, WhatsApp-to-Linear pipeline, multi-channel conversation context, PostHog analytics, and Resend email infrastructure provide 60-70% of the scaffolding needed. v7.0 adds new tables, API routes, UI components, and scheduled jobs -- not new infrastructure.

- **No new major dependencies required.** The entire feedback loop can be built on Supabase (storage), Vercel AI SDK (sentiment piggyback), Trigger.dev (scheduled analysis), and the existing A/B testing module. The only potential new library is `simple-statistics` for significance testing. This is a rare "extend everything, add nothing" milestone.

- **The critical differentiator is RLHF-Lite (D-2): feedback-driven prompt self-refinement with human-in-the-loop approval.** This is what makes Sahara's feedback loop more than a thumbs-up counter. Most AI products collect feedback for humans to act on. Sahara would use it to propose prompt patches, A/B test them, and deploy winners -- a genuine self-improving AI coaching engine.

- **The existential risk is FRED voice drift (Pitfall C1).** Feedback-driven optimization naturally favors agreeable, verbose, hedging language. FRED's core value is blunt truth-telling. An unguarded optimizer will sand down the edges that make FRED valuable. The immutable core prompt + layered supplemental guidance architecture is non-negotiable and must be in place before any optimization loop runs.

- **The biggest operational risk is over-engineering.** Building a full feedback analytics platform (Thematic, Canny, Userpilot) inside Sahara would be scope creep. The correct scope is a lean, tightly integrated loop: collect signals, detect patterns, propose improvements, test them, deploy winners, notify users. No more.

---

## Stack Consensus

**Recommendation: Zero new infrastructure. Extend everything that exists.**

| Technology | Status | v7.0 Role |
|------------|--------|-----------|
| Supabase | Existing | 3 new tables: `feedback_signals`, `feedback_sessions`, `feedback_insights` |
| Vercel AI SDK | Existing | Piggyback sentiment extraction on FRED's LLM calls (structured output field) |
| Trigger.dev | Existing | Daily pattern detection job, weekly prompt refinement proposals (mirrors WhatsApp monitor pattern) |
| PostHog | Existing | Feedback event tracking, funnel analysis for feedback submission rates |
| Resend | Existing | Close-the-loop notification emails, weekly feedback digest to admin |
| `lib/ai/ab-testing.ts` | Existing | Extend `getVariantStats()` with feedback metrics (thumbs ratio, sentiment) |
| `simple-statistics` | NEW (optional) | Chi-squared / t-test for A/B significance when D-5 is implemented |

**Alternatives rejected:** Dedicated feedback SaaS (Canny, UserVoice), separate NLP service (AWS Comprehend), external dashboard tool (Retool), external prompt eval tool (Braintrust, PromptLayer). All add dependencies that duplicate existing Sahara capabilities.

---

## Feature Priorities

### Table Stakes (must ship for v7.0 to be credible)

| ID | Feature | Complexity | Confidence | Rationale |
|----|---------|------------|------------|-----------|
| TS-4 | Feedback data model | Low-Medium | HIGH | Foundation for everything; 3 tables + indexes + RLS |
| TS-1 | Thumbs up/down on FRED responses | Low | HIGH | Universal pattern (ChatGPT, Claude, Copilot); absence signals "we don't care about quality" |
| TS-2 | Feedback admin dashboard | Medium | HIGH | Fred Cary is already demanding visibility via WhatsApp; extend existing `app/admin/` |
| TS-3 | Sentiment tracking on conversations | Medium | MEDIUM | LLM piggyback approach; flag sessions where sentiment degrades sharply |

### Differentiators (ordered by build priority based on dependencies)

| ID | Feature | Complexity | Confidence | Depends On |
|----|---------|------------|------------|------------|
| D-5 | A/B testing + feedback metrics | Medium | HIGH | TS-1, TS-4 |
| D-4 | Multi-channel feedback aggregation | Medium-High | MEDIUM | TS-1, TS-4 |
| D-1 | AI-powered categorization and pattern detection | Medium | MEDIUM | TS-3, TS-4 |
| D-2 | Prompt self-refinement (RLHF-Lite) | High | MEDIUM | D-1, D-5 |
| D-3 | Close-the-loop notifications | Medium | MEDIUM | D-1 |

### Defer to v8+ (anti-features)

- Full RLHF / model fine-tuning (wrong scale, wrong risk profile)
- Real-time feedback popups or interruptions (destroys coaching flow)
- NPS surveys inside FRED chat (conflates coaching with marketing)
- Public feedback board / feature voting (exposes roadmap, creates expectation debt)
- Automated prompt deployment without human review (prompt injection / regression risk)

---

## Architecture Blueprint

### Three-Layer Design

```
COLLECTION          ANALYSIS              ACTION
-----------         ----------            ------
Thumbs UI     -->   Sentiment Track  -->  Prompt Patches
Post-call     -->   Pattern Detect   -->  A/B Experiments
SMS rating    -->   AI Categorize    -->  Linear Issues
Implicit      -->   Trend Analysis   -->  Close-the-Loop
WhatsApp      -->                    -->  Admin Dashboard
      |                 |                      |
      v                 v                      v
+-----------------------------------------------------------+
|              FEEDBACK DATA LAYER (Supabase)                |
| feedback_signals | feedback_sessions | feedback_insights   |
| Links to: ai_requests, fred_episodic_memory, ab_variants   |
+-----------------------------------------------------------+
```

### Key Integration Points

1. **Feedback -> AI Requests:** `feedback_signals.ai_request_id` links every thumbs-up/down to the exact prompt version, model, and A/B variant that produced the response. Full traceability.
2. **Sentiment -> FRED Pipeline:** Sentiment extraction piggybacks on FRED's existing LLM calls via a structured output field. No separate NLP service.
3. **Pattern Detection -> Trigger.dev:** Daily scheduled job (same pattern as `sahara-whatsapp-monitor.ts`) clusters feedback, identifies themes, writes to `feedback_insights`.
4. **Prompt Patches -> A/B Testing:** Proposed patches enter the existing `ab_experiments` / `ab_variants` tables. Canary rollout via existing variant assignment.
5. **Close-the-Loop -> Resend:** Resolution notifications use existing `lib/email/` infrastructure.

### Key Architectural Patterns

- **Fire-and-forget for feedback writes** -- never block the chat pipeline
- **Scheduled batch analysis, not real-time** -- individual signals are noisy; patterns emerge over time
- **Extend, don't replace** -- wire into PostHog, Linear, A/B testing, admin panel; do not build parallel systems
- **Human-in-the-loop for prompt changes** -- AI proposes, admin reviews, A/B validates, admin promotes
- **Self-contained file structure** -- `lib/feedback/`, `components/feedback/`, `app/api/feedback/` to minimize git conflicts with concurrent agents

### Schema (3 new tables)

- `feedback_signals` -- explicit feedback (thumbs, ratings, comments) linked to `ai_requests`
- `feedback_sessions` -- session-level aggregates (sentiment arc, abandonment, engagement)
- `feedback_insights` -- AI-generated pattern analysis with status workflow (new -> reviewed -> actioned -> resolved)

---

## Critical Pitfalls

### Top 5 Risks (MUST address)

| # | Pitfall | Severity | Phase | Prevention |
|---|---------|----------|-------|------------|
| C1 | FRED voice drift from prompt optimization | CRITICAL | 1 | Immutable core prompt + layered supplemental guidance + voice regression test suite (20+ scenarios) + human gate |
| C2 | Feedback-driven issue flood without deduplication | CRITICAL | 2 | Semantic dedup before Linear issue creation + 4-hour aggregation windows + severity escalation not duplication |
| C3 | A/B testing without statistical controls | CRITICAL | 3 | Pre-registration + minimum sample size (500 sessions/variant) + segmented analysis + model drift guard |
| H1 | Feedback fatigue from wrong timing/frequency | HIGH | 2 | Session-end only + throttle per user (1 detailed/week) + passive signals first + progressive disclosure |
| H3 | Performance impact on chat pipeline | HIGH | 2 | Fire-and-forget writes + lazy-load widgets + batch Supabase writes + <50ms p95 budget + <20KB bundle budget |

### Secondary Risks (address but lower urgency)

| # | Pitfall | Severity | Phase | Key Mitigation |
|---|---------|----------|-------|----------------|
| H2 | Negativity bias in feedback data | HIGH | 2-3 | Stratified sampling by tier + separate bugs from quality feedback + weight by user value |
| H4 | WhatsApp API compliance (BrowserBase scraping) | HIGH | 1 | Migrate to official WhatsApp Business API before building notifications on top |
| H5 | Admin dashboard becomes data graveyard | HIGH | 4 | Build triage workflow not dashboard + weekly digest email + link themes to Linear |
| M1 | Sentiment overconfidence on short text | MEDIUM | 3 | Classify confidence alongside sentiment + context-aware analysis + "coaching discomfort" category |
| M3 | GDPR concerns with feedback + AI analysis | MEDIUM | 1-2 | Explicit consent at collection + data minimization before AI analysis + 90-day retention + right to deletion |

### Sahara-Specific Risks

- **F1:** Pre-commit hooks auto-revert changes to `dashboard/layout.tsx` -- use wrapper/adapter pattern for feedback UI
- **F2:** 335 existing lint errors hide new regressions -- baseline snapshot before Phase 1
- **F3:** FRED chat latency already a pain point -- profile pipeline before and after each feature addition
- **F4:** Concurrent agents cause git conflicts -- self-contained `lib/feedback/` directory structure
- **F5:** Free-tier users give biased negative feedback -- tier-aware weighting, minimum 5-message threshold

---

## Implications for Roadmap

### Suggested Phase Structure (6 phases)

**Phase 0: Pre-Work (Baseline and Guardrails)**
- Snapshot existing lint errors and test failures (delta checking for CI)
- Mark FRED core prompt as immutable constant
- Establish `lib/feedback/`, `components/feedback/`, `app/api/feedback/` directory structure
- Addresses: F1 (pre-commit hooks), F2 (lint baseline), C1 (voice protection)
- Uses: Existing codebase
- Standard patterns: Yes, skip research

**Phase 1: Foundation (Data Model + Voice Protection)**
- Create `feedback_signals`, `feedback_sessions`, `feedback_insights` tables with RLS
- Build layered prompt architecture (immutable core + mutable supplemental layer)
- Create voice regression test suite (20+ canonical FRED scenarios)
- Add GDPR consent mechanism to feedback collection points
- Addresses: TS-4, C1 prevention, M3 consent
- Avoids: C1 (voice drift) by establishing guardrails before any optimization
- Uses: Supabase (existing), `FRED_CAREY_SYSTEM_PROMPT`
- Standard patterns: Yes, database schema + RLS

**Phase 2: Collection (Feedback UI + Explicit Signals)**
- Thumbs up/down component on FRED chat responses (fire-and-forget writes)
- Progressive disclosure: thumbs-down expands to category selector + optional text
- Tier-aware collection (no widgets for users with <5 messages; weight Pro/Studio 3-5x)
- Performance validation (<50ms p95 latency impact, <20KB bundle addition)
- Addresses: TS-1, D-4 (chat channel), H1 prevention, H3 prevention
- Avoids: H1 (feedback fatigue) via session-end timing + throttling; H3 (performance) via fire-and-forget + lazy loading
- Uses: React components, Supabase, existing `use-fred-chat.ts` hook (via wrapper, not modification)
- Needs research: Feedback widget UX for voice call post-session rating

**Phase 3: Visibility (Admin Dashboard + Sentiment)**
- Feedback admin section in existing `app/admin/` panel
- Triage workflow (New -> Reviewed -> Actioned -> Resolved -> Communicated), not just charts
- Sentiment extraction piggybacking on FRED's LLM calls (structured output field)
- Flagged sessions where sentiment degrades sharply
- Weekly feedback digest email to admin via Resend
- Addresses: TS-2, TS-3, H5 prevention
- Avoids: H5 (data graveyard) by building workflow not dashboard; M1 (sentiment overconfidence) via confidence scores + coaching discomfort category
- Uses: Existing `app/admin/`, Vercel AI SDK structured output, Resend
- Standard patterns: Admin CRUD + LLM structured output

**Phase 4: Intelligence (Pattern Detection + A/B Integration)**
- Trigger.dev daily job for AI-powered feedback categorization and pattern detection
- Deduplication logic for Linear issue creation (semantic matching + aggregation windows)
- Extend `getVariantStats()` with feedback metrics (thumbs ratio, sentiment per variant)
- Statistical significance testing (minimum sample sizes, segmented analysis)
- Pre-registration template for experiments
- Addresses: D-1, D-5, C2 prevention, C3 prevention
- Avoids: C2 (issue flood) via dedup; C3 (bad stats) via significance testing
- Uses: Trigger.dev, `lib/ai/ab-testing.ts`, `simple-statistics` (new)
- Needs research: Optimal aggregation windows, sample size thresholds for Sahara's user base

**Phase 5: Self-Improvement (RLHF-Lite + Close-the-Loop)**
- Prompt self-refinement: feedback-weighted few-shot examples + category-driven prompt patches
- Prompt version control in `ab_experiments` / `ab_variants` tables
- Human-in-the-loop approval workflow in admin dashboard
- Close-the-loop monthly digest: "Here's what we improved based on your feedback"
- Staleness cutoff (30 days), severity threshold, opt-in notifications
- Addresses: D-2, D-3, M2 prevention
- Avoids: C1 (voice drift) via immutable core + regression tests from Phase 1; M2 (notification spam) via batching + throttling
- Uses: A/B testing infrastructure, Resend, admin approval queue
- Needs research: Prompt patch generation strategies, regression testing automation, feedback-to-fix linking data model

### Phase Ordering Rationale

1. **Phase 0 before everything:** Cannot measure regressions without a baseline; cannot protect FRED's voice without guardrails already in place.
2. **Phase 1 (data model) before Phase 2 (collection):** Nowhere to store feedback without the schema. GDPR consent must exist before collecting anything.
3. **Phase 2 (collection) before Phase 3 (visibility):** Dashboard is empty without data. 2-4 weeks of data accumulation needed before analysis is meaningful.
4. **Phase 3 (visibility) before Phase 4 (intelligence):** Admin needs to see raw feedback before trusting AI-generated insights. Builds confidence in the system.
5. **Phase 4 (intelligence) before Phase 5 (self-improvement):** RLHF-Lite needs pattern detection (D-1) and feedback-aware A/B testing (D-5) as inputs. Cannot propose prompt patches without knowing what is wrong.
6. **Phase 5 is the capstone:** It is the hardest and highest-value phase. It requires all prior infrastructure and accumulated data.

### Parallel Track Opportunities

- **Track A (User-facing):** Phase 2 collection can run in parallel with Phase 1 schema work (schema first, then UI immediately after)
- **Track B (Admin):** Phase 3 dashboard can begin design/wireframing while Phase 2 ships
- **Phases 4 and 5 are sequential:** Intelligence feeds self-improvement

### Research Flags

| Phase | Research Needed? | Reason |
|-------|-----------------|--------|
| Phase 0 | No | Standard engineering baseline work |
| Phase 1 | No | Standard Supabase schema + RLS; FRED prompt architecture documented |
| Phase 2 | Light | Voice call post-session UX; SMS rating collection mechanics |
| Phase 3 | No | Standard admin CRUD + LLM structured output |
| Phase 4 | Yes | Statistical significance thresholds for Sahara's scale; aggregation window tuning |
| Phase 5 | Yes | Prompt patch generation strategies; regression testing automation; feedback-to-fix linking |

---

## Cross-Cutting Concerns

These affect ALL phases and must be tracked throughout:

1. **FRED Voice Preservation:** Every phase that touches FRED's output must validate against the voice regression test suite. The immutable core prompt + supplemental guidance layer is a hard constraint.

2. **Performance Budget:** <50ms p95 latency increase on chat pipeline; <20KB bundle addition for feedback widgets. Measure before and after every phase.

3. **GDPR / Data Privacy:** Consent at collection, data minimization before AI analysis, 90-day retention policy, right-to-deletion cascade. Must be designed in from Phase 1, not bolted on.

4. **Tier-Aware Design:** All feedback collection, analysis, and optimization must segment by tier. Free-tier feedback is informational, not directional. Pro/Studio feedback drives prompt optimization.

5. **Fire-and-Forget Pattern:** All feedback writes are asynchronous and non-blocking. This is not optional -- FRED latency is already a documented pain point.

6. **Pre-Commit Hook Workaround:** Feedback UI must use wrapper/adapter components, not modify `dashboard/layout.tsx` or `documents/new/page.tsx` directly.

7. **Concurrent Agent Safety:** Self-contained directory structure (`lib/feedback/`, `components/feedback/`, `app/api/feedback/`). Minimize touchpoints with shared files.

---

## Open Questions

Aggregated from all 4 research files:

1. **Statistical thresholds:** What sample size is sufficient for A/B significance testing given Sahara's current user base? Is 500 sessions/variant realistic?
2. **Voice call feedback UX:** How to prompt for rating after a LiveKit voice session without disrupting the experience? Timing and modality are unclear.
3. **SMS feedback collection:** Character limits and response parsing for rating collection via SMS. How to handle non-numeric responses?
4. **Prompt versioning schema:** How to track which prompt version (core + supplemental + few-shot examples) produced which response? The current `ab_variants` table may need extension.
5. **Regression testing automation:** How to automatically validate that a prompt patch for one topic does not degrade another? What does the test harness look like?
6. **Feedback-to-fix linking:** Data model for connecting a Linear issue resolution back to the specific `feedback_signals` records that originated it. Required for close-the-loop.
7. **WhatsApp Business API migration timeline:** When to migrate off BrowserBase scraping? Before or during v7.0? What is the effort estimate?
8. **Implicit signal calibration:** What constitutes "session abandonment" vs. "user got what they needed quickly"? Heuristic design for implicit feedback.
9. **"Coaching discomfort" sentiment category:** How to distinguish "FRED was too harsh" (real issue) from "FRED challenged my assumptions and it was uncomfortable" (working as designed)?

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Zero new infrastructure; extending proven existing stack |
| Table Stakes Features | HIGH | Universal patterns (thumbs, dashboards) with extensive competitive examples |
| Differentiator Features | MEDIUM | Individual components proven; full integration (especially D-2 RLHF-Lite) is novel |
| Architecture | HIGH | Extends existing Sahara patterns; three-layer design is straightforward |
| Critical Pitfalls (C1-C3) | HIGH | Based on direct codebase analysis + well-documented industry anti-patterns |
| High Pitfalls (H1-H5) | MEDIUM-HIGH | UX patterns well-studied; Sahara-specific timing/impact extrapolated |
| Medium Pitfalls (M1-M4) | MEDIUM | Known risks with clear mitigations; severity depends on user geography and scale |
| FRED-Specific Risks (F1-F5) | HIGH | Based on documented project history and codebase constraints |

**Overall: MEDIUM-HIGH.** The domain is well-understood and Sahara's existing infrastructure provides strong scaffolding. The main uncertainty is in Phase 5 (RLHF-Lite) where the full integration is genuinely novel. Phases 0-4 use standard patterns with high confidence.

---

## Sources

Aggregated from all research files. Confidence annotations reflect cross-referencing across multiple research dimensions.

**First-Party (HIGH):**
- Sahara codebase: `lib/ai/ab-testing.ts`, `trigger/sahara-whatsapp-monitor.ts`, `lib/channels/conversation-context.ts`, `lib/ai/prompts.ts`, `lib/email/`
- Sahara `package.json` and existing infrastructure

**Industry Research (MEDIUM-HIGH):**
- [Braintrust: Prompt Evaluation Tools 2025](https://www.braintrust.dev/articles/best-prompt-evaluation-tools-2025)
- [Statsig: Prompt Regression Testing](https://www.statsig.com/perspectives/slug-prompt-regression-testing)
- [Statsig: When Statistical Significance Misleads](https://www.statsig.com/perspectives/abtesting-llms-misleading)
- [Microsoft Copilot Studio: Collect Thumbs Feedback](https://learn.microsoft.com/en-us/power-platform/release-plan/2025wave1/microsoft-copilot-studio/collect-thumbs-up-or-down-feedback-comments-agents)
- [Chatarmin: WhatsApp Messaging Limits 2026](https://chatarmin.com/en/blog/whats-app-messaging-limits)

**UX and Feedback Patterns (MEDIUM):**
- [Zonka Feedback: Thumbs Up/Down Surveys](https://www.zonkafeedback.com/blog/collecting-feedback-with-thumbs-up-thumbs-down-survey)
- [Thematic: Customer Feedback Loop Guide](https://getthematic.com/insights/customer-feedback-loop-guide)
- [Userpilot: AI Customer Feedback Analysis](https://userpilot.com/blog/ai-customer-feedback-analysis/)
- [FeatureBot: Closing the Feedback Loop](https://featurebot.com/blog/closing-the-feedback-loop)
- [OrangeLoops: UX Patterns for AI Assistants](https://orangeloops.com/2025/07/9-ux-patterns-to-build-trustworthy-ai-assistants/)

**Compliance and Regulatory (MEDIUM):**
- [SecurePrivacy: AI GDPR Compliance 2025](https://secureprivacy.ai/blog/ai-gdpr-compliance-challenges-2025)
- [Orrick: EDPB Opinion on AI and GDPR](https://www.orrick.com/en/Insights/2025/03/The-European-Data-Protection-Board-Shares-Opinion-on-How-to-Use-AI-in-Compliance-with-GDPR)
- [GMCSCO: WhatsApp API Compliance 2026](https://gmcsco.com/your-simple-guide-to-whatsapp-api-compliance-2026/)
