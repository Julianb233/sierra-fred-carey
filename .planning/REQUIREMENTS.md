# Requirements — v7.0 UX Feedback Loop

**Milestone:** v7.0
**Defined:** 2026-03-04
**Source:** Research (FEATURES.md, SUMMARY.md, ARCHITECTURE.md, PITFALLS.md)
**Previous:** v1.0-v6.0 requirements archived (all shipped or carried)

---

## v7.0 Scope (35 requirements, 8 categories)

### Foundation & Guardrails (6)

- [ ] **REQ-F1:** Feedback data model — `feedback_signals`, `feedback_sessions`, `feedback_insights` tables with RLS policies, linked to `ai_requests` and `fred_episodic_memory`
- [ ] **REQ-F2:** Immutable core prompt architecture — FRED's core system prompt marked as constant; supplemental guidance layer for mutable additions; no optimization can modify the core
- [ ] **REQ-F3:** Voice regression test suite — 20+ canonical FRED scenarios testing blunt truth-telling, reframe-before-prescribe, and mentor tone; automated validation before prompt changes deploy
- [ ] **REQ-F4:** GDPR consent mechanism — explicit opt-in before feedback collection; data minimization before AI analysis; 90-day retention policy; right-to-deletion cascade
- [ ] **REQ-F5:** Self-contained directory structure — `lib/feedback/`, `components/feedback/`, `app/api/feedback/` to minimize git conflicts with concurrent agents
- [ ] **REQ-F6:** Lint/test baseline snapshot — document existing 335 lint errors and 12 test failures; CI uses delta checking so new regressions are caught

### Feedback Collection (6)

- [ ] **REQ-C1:** Thumbs up/down on every FRED chat response — inline icons, fire-and-forget write, zero UX friction
- [ ] **REQ-C2:** Thumbs-down expansion — category selector (irrelevant, incorrect, too vague, too long, wrong tone) + optional free-text box
- [ ] **REQ-C3:** Thumbs-up expansion — optional "What was helpful?" text box
- [ ] **REQ-C4:** Performance budget enforced — <50ms p95 latency increase on chat pipeline; <20KB bundle addition for feedback widgets
- [ ] **REQ-C5:** Tier-aware collection — no widgets for users with <5 messages in session; weight Pro/Studio feedback 3-5x in analysis
- [ ] **REQ-C6:** Feedback throttling — max 1 detailed feedback prompt per user per week; passive signals unlimited

### Admin Visibility (7)

- [ ] **REQ-V1:** Feedback admin section in existing `app/admin/` panel — not a separate app
- [ ] **REQ-V2:** Triage workflow — statuses: New → Reviewed → Actioned → Resolved → Communicated (not just read-only charts)
- [ ] **REQ-V3:** Feedback feed with filters — date range, channel, rating, category, tier, user
- [ ] **REQ-V4:** Aggregate stats — daily volume, positive/negative ratio, category distribution, response time to resolution
- [ ] **REQ-V5:** Per-session drill-down — view full conversation with feedback annotations and sentiment arc
- [ ] **REQ-V6:** CSV export for offline analysis
- [ ] **REQ-V7:** Weekly feedback digest email to admin via Resend

### Sentiment Analysis (4)

- [ ] **REQ-S1:** Per-message sentiment extraction piggybacking on FRED's LLM calls — structured output field (positive/neutral/negative/frustrated + confidence score)
- [ ] **REQ-S2:** Session-level sentiment aggregation — weighted average with frustration spike detection
- [ ] **REQ-S3:** Flagged sessions — auto-flag sessions where sentiment degrades sharply; surface in admin dashboard
- [ ] **REQ-S4:** "Coaching discomfort" category — distinguish "FRED was too harsh" (real issue) from "FRED challenged my assumptions" (working as designed)

### Intelligence & Pattern Detection (4)

- [x] **REQ-I1:** Trigger.dev daily job for AI-powered feedback categorization — cluster by theme, identify recurring patterns, rank by frequency × severity
- [x] **REQ-I2:** Deduplication logic — semantic matching + 4-hour aggregation windows before Linear issue creation; severity escalation not duplication
- [x] **REQ-I3:** "Top Issues This Week" with drill-down in admin dashboard
- [x] **REQ-I4:** Linear auto-triage — create issues from feedback clusters with Browserbase replay links as proof; link to existing issues when duplicate detected

### A/B Testing Integration (4)

- [ ] **REQ-A1:** Extend `getVariantStats()` with feedback metrics — thumbs-up ratio, average sentiment score, session completion rate per variant
- [ ] **REQ-A2:** Statistical significance testing — chi-squared for binary feedback, t-test for sentiment; minimum 500 sessions/variant before declaring winner
- [ ] **REQ-A3:** Experiment pre-registration template — hypothesis, metrics, sample size, duration before starting
- [ ] **REQ-A4:** Admin dashboard: experiment results with feedback-aware metrics, auto-flag winning variants

### FRED Self-Improvement / RLHF-Lite (5)

- [ ] **REQ-R1:** Feedback-weighted few-shot examples — thumbs-up responses become positive examples; thumbs-down become "avoid this" negative examples in prompt library
- [ ] **REQ-R2:** Category-driven prompt patches — when pattern detection identifies recurring complaint, generate supplemental prompt instructions for that coaching topic
- [ ] **REQ-R3:** Prompt version control — store versions in extended `ab_experiments` schema; each patch creates new version; full traceability to source feedback
- [ ] **REQ-R4:** Human-in-the-loop gate — prompt patches proposed in admin dashboard; admin reviews, approves, and triggers A/B test; no auto-deployment ever
- [ ] **REQ-R5:** Feedback loop closure validation — after deploying a prompt patch, track whether thumbs-up ratio improves for that topic over 2-week window

### Close-the-Loop (4) -- DEFERRED to late v7.0 or v7.1

- [ ] **REQ-L1:** Track which feedback signals contributed to which prompt patches or bug fixes
- [ ] **REQ-L2:** Monthly digest notification — "Here's what we improved based on your feedback" via email (Resend)
- [ ] **REQ-L3:** Staleness cutoff — only notify about improvements from last 30 days; severity threshold (skip trivial fixes)
- [ ] **REQ-L4:** Opt-in notifications — respect existing notification preferences; never spam

---

## Deferred to v8+

- Full RLHF / model fine-tuning — wrong scale and risk for Sahara
- Real-time feedback popups or interruptions — destroys coaching flow
- NPS surveys inside FRED chat — conflates coaching with marketing
- Public feedback board / feature voting — exposes roadmap, creates expectation debt
- Automated prompt deployment without human review — prompt injection / regression risk
- Voice call post-session rating widget — needs UX research on timing
- SMS rating collection — character limits and parsing complexity
- WhatsApp Business API migration — separate infrastructure effort

---

## Out of Scope

- Custom feedback analytics SaaS (use PostHog + admin dashboard)
- Separate NLP service for sentiment (piggyback on existing LLM)
- External prompt eval tools (extend existing A/B testing)
- Mobile-specific feedback UI (PWA responsive handles it)
- Multi-language feedback analysis

---

## Cross-Cutting Constraints

1. **FRED Voice Preservation:** Every phase touching FRED output validates against voice regression suite
2. **Performance Budget:** <50ms p95 chat latency increase; <20KB feedback widget bundle
3. **GDPR:** Consent at collection, minimization before analysis, 90-day retention, deletion cascade
4. **Tier-Aware:** Free-tier feedback is informational; Pro/Studio drives optimization
5. **Fire-and-Forget:** All feedback writes async and non-blocking
6. **Pre-Commit Hooks:** Use wrapper/adapter pattern, not modify protected files
