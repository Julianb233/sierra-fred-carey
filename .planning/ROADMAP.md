# Roadmap: Sahara v7.0 — UX Feedback Loop

## Milestones

- [x] **v1.0 MVP** — Phases 1-11 (shipped 2026-02-07)
- [x] **v2.0 Production & Voice Parity** — Phases 12-23 (shipped 2026-02-07)
- [x] **v3.0 Scale, Activate & Engage** — Phases 24-33 (shipped 2026-02-08)
- [x] **v4.0 FRED Mentor Experience** — Phases 34-47 (shipped 2026-02-12)
- [x] **v5.0 QA Fixes** — Phases 54-58 (shipped 2026-02-18)
- [~] **v6.0 Full Platform Maturity** — Phases 59-70 (67% complete, 2 blocked)
- [ ] **v7.0 UX Feedback Loop** — Phases 71-76

---

## v7.0 Phases

### Phase 71: Foundation & Guardrails
**Goal:** Establish the data model, protect FRED's voice, and set up the infrastructure for the entire feedback system.

**Requirements:** REQ-F1, REQ-F2, REQ-F3, REQ-F4, REQ-F5, REQ-F6

**Success criteria:**
- [ ] 3 new tables (`feedback_signals`, `feedback_sessions`, `feedback_insights`) with RLS policies pass migration
- [ ] FRED core prompt is an immutable constant; supplemental layer exists and is mutable
- [ ] Voice regression test suite runs 20+ scenarios and passes before any prompt modification
- [ ] GDPR consent flow exists at feedback collection points with 90-day retention enforcement
- [ ] `lib/feedback/`, `components/feedback/`, `app/api/feedback/` directories created
- [ ] Baseline lint/test snapshot documented; CI delta checking configured

**Research needed:** No — standard Supabase schema + RLS + prompt architecture
**Estimated plans:** 2-3

---

### Phase 72: Feedback Collection
**Goal:** Ship the thumbs up/down UI on FRED chat responses. Start collecting explicit feedback from founders.

**Requirements:** REQ-C1, REQ-C2, REQ-C3, REQ-C4, REQ-C5, REQ-C6

**Success criteria:**
- [ ] Every FRED chat response shows thumbs up/down icons inline
- [ ] Thumbs-down expands to category selector + free-text; thumbs-up shows optional text box
- [ ] Feedback writes are fire-and-forget — zero visible latency on chat
- [ ] Performance validated: <50ms p95 latency increase, <20KB bundle addition
- [ ] Widgets hidden for users with <5 messages; throttle: max 1 detailed feedback/user/week
- [ ] Feedback records appear in `feedback_signals` table with correct user, message, session, channel linkage

**Research needed:** Light — voice call post-session UX (deferred to v8)
**Estimated plans:** 2

---

### Phase 73: Admin Dashboard & Sentiment
**Goal:** Give Fred Cary visibility into what founders are saying. Add sentiment tracking to FRED's pipeline.

**Requirements:** REQ-V1, REQ-V2, REQ-V3, REQ-V4, REQ-V5, REQ-V6, REQ-V7, REQ-S1, REQ-S2, REQ-S3, REQ-S4

**Success criteria:**
- [ ] Admin feedback section accessible at `/admin/feedback` with triage workflow (New → Reviewed → Actioned → Resolved → Communicated)
- [ ] Filters work: date range, channel, rating, category, tier, user
- [ ] Aggregate stats visible: daily volume, positive/negative ratio, category distribution
- [ ] Per-session drill-down shows full conversation with feedback annotations
- [ ] CSV export downloads feedback data
- [ ] Weekly digest email sends to admin via Resend
- [ ] FRED responses include sentiment field (positive/neutral/negative/frustrated + confidence)
- [ ] Sessions with sharp sentiment degradation auto-flagged and visible in dashboard
- [ ] "Coaching discomfort" category distinguishes valid discomfort from quality issues

**Research needed:** No — standard admin CRUD + LLM structured output
**Estimated plans:** 3-4

---

### Phase 74: Intelligence & Pattern Detection
**Goal:** AI analyzes feedback patterns automatically. Auto-create Linear issues from clusters. Stop the noise.

**Requirements:** REQ-I1, REQ-I2, REQ-I3, REQ-I4

**Success criteria:**
- [ ] Trigger.dev daily job runs, clusters feedback by theme, writes to `feedback_insights`
- [ ] Deduplication prevents duplicate Linear issues (semantic matching + 4-hour windows)
- [ ] "Top Issues This Week" section in admin dashboard with drill-down to source feedback
- [ ] Linear issues auto-created from feedback clusters with correct labels, severity, and links

**Research needed:** Light — optimal aggregation windows for Sahara's user volume
**Estimated plans:** 2

---

### Phase 75: A/B Testing + Feedback Metrics
**Goal:** Make experiments measure user satisfaction, not just technical metrics. Connect feedback signals to A/B testing.

**Requirements:** REQ-A1, REQ-A2, REQ-A3, REQ-A4

**Success criteria:**
- [ ] `getVariantStats()` returns thumbs ratio, sentiment score, and session completion per variant
- [ ] Significance testing enforces minimum 500 sessions/variant; uses chi-squared for binary, t-test for continuous
- [ ] Pre-registration template captures hypothesis, metrics, sample size before experiment starts
- [ ] Admin dashboard shows experiment results with feedback metrics; winning variants auto-flagged

**Research needed:** Yes — statistical significance thresholds for Sahara's user base
**Estimated plans:** 2

---

### Phase 76: FRED Self-Improvement (RLHF-Lite) + Close-the-Loop
**Goal:** The crown jewel — FRED actually gets better from feedback. Close the loop with founders.

**Requirements:** REQ-R1, REQ-R2, REQ-R3, REQ-R4, REQ-R5, REQ-L1, REQ-L2, REQ-L3, REQ-L4

**Success criteria:**
- [ ] Thumbs-up responses stored as positive few-shot examples; thumbs-down as negative examples
- [ ] When pattern detection finds recurring complaint, system generates prompt patch for that topic
- [ ] Prompt versions tracked in DB with full traceability to source feedback signals
- [ ] Admin approval queue: proposed patches visible, reviewable, and triggerable as A/B tests
- [ ] After prompt patch deploys, system tracks thumbs-up improvement over 2-week window
- [ ] Monthly "improvements from your feedback" digest sent via Resend to opted-in founders
- [ ] Notification respects preferences, 30-day staleness cutoff, severity threshold

**Research needed:** Yes — prompt patch generation, regression testing automation, feedback-to-fix linking
**Estimated plans:** 3-4

---

## Requirement Coverage

| Requirement | Phase | Status |
|-------------|-------|--------|
| REQ-F1 | 71 | Pending |
| REQ-F2 | 71 | Pending |
| REQ-F3 | 71 | Pending |
| REQ-F4 | 71 | Pending |
| REQ-F5 | 71 | Pending |
| REQ-F6 | 71 | Pending |
| REQ-C1 | 72 | Pending |
| REQ-C2 | 72 | Pending |
| REQ-C3 | 72 | Pending |
| REQ-C4 | 72 | Pending |
| REQ-C5 | 72 | Pending |
| REQ-C6 | 72 | Pending |
| REQ-V1 | 73 | Pending |
| REQ-V2 | 73 | Pending |
| REQ-V3 | 73 | Pending |
| REQ-V4 | 73 | Pending |
| REQ-V5 | 73 | Pending |
| REQ-V6 | 73 | Pending |
| REQ-V7 | 73 | Pending |
| REQ-S1 | 73 | Pending |
| REQ-S2 | 73 | Pending |
| REQ-S3 | 73 | Pending |
| REQ-S4 | 73 | Pending |
| REQ-I1 | 74 | Pending |
| REQ-I2 | 74 | Pending |
| REQ-I3 | 74 | Pending |
| REQ-I4 | 74 | Pending |
| REQ-A1 | 75 | Pending |
| REQ-A2 | 75 | Pending |
| REQ-A3 | 75 | Pending |
| REQ-A4 | 75 | Pending |
| REQ-R1 | 76 | Pending |
| REQ-R2 | 76 | Pending |
| REQ-R3 | 76 | Pending |
| REQ-R4 | 76 | Pending |
| REQ-R5 | 76 | Pending |
| REQ-L1 | 76 | Pending |
| REQ-L2 | 76 | Pending |
| REQ-L3 | 76 | Pending |
| REQ-L4 | 76 | Pending |

**Coverage: 40/40 requirements mapped. 0 orphaned.**

---

## Phase Dependencies

```
Phase 71 (Foundation)
  |
  +---> Phase 72 (Collection) ----+
  |                                |
  +---> Phase 73 (Dashboard) -----+---> Phase 75 (A/B + Feedback)
         |                         |           |
         +---> Phase 74 (Intel) ---+           +---> Phase 76 (RLHF-Lite)
                    |                                    ^
                    +------------------------------------+
```

**Critical path:** 71 → 72 → 75 → 76
**Parallel opportunity:** 72 and 73 can run in parallel after 71 completes

---

## Cross-Cutting Concerns (All Phases)

1. FRED voice regression tests run before any prompt-touching change
2. Performance budget validated after each phase (<50ms p95, <20KB)
3. GDPR consent enforced at every collection point
4. Fire-and-forget for all feedback writes
5. Self-contained `lib/feedback/` directory structure

---

*Created: 2026-03-04 | Phases: 71-76 | Requirements: 40 mapped*
