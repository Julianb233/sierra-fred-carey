# Functional Gap Analysis — Existing System (IdeaPros) vs Julian's System (Sahara)

> **Linear:** AI-6019 · **Owner of analysis:** Alex Latorre · **Client:** Sahara — AI Founder OS (Fred Cary)
> **Source meeting:** Sahara Tech Meeting, 2026-03-30 (Fireflies `01KMXZJ66RDFWE2FB16ZK23T3X`)
> **Task framing:** *"Compare features between existing systems, find what needs replication. Alex to identify functional gaps."*
> **Method:** Code-grounded — every status below is verified against the live `sahara` repo, not against a spec doc.

---

## 1. What "existing system" and "Julian's system" mean

| Term | Concretely |
|---|---|
| **Existing system** | **IdeaPros** — Fred Cary's prior venture-building program: a structured, sequential **~120-step** founder journey (idea → investment-ready), mapped in `docs/IDEAPROS-JOURNEY-MAPPING.md`. This is the methodology Sahara is meant to replicate and automate. |
| **Julian's system** | **Sahara** — the AI Founder OS built by AI Acrobatics (this repo), deployed at joinsahara.com. FRED cognitive engine + chat/voice/SMS + dashboard + 5-stage "Oases" journey. |

The question this analysis answers: **what does IdeaPros functionally do that Sahara does not yet replicate — and where Sahara *appears* to have a feature, is it actually wired end-to-end?**

---

## 2. Executive summary — the headline gaps

Sahara has shipped a deep feature surface (v1.0–v8.0: FRED engine, chat/voice/SMS, scoring, decks, agents, billing). The gaps are **not** "missing big features" — they are **depth and wiring gaps** against the IdeaPros method:

| # | Gap | Severity | One-line |
|---|---|---|---|
| **G1** | **120-step granularity is orphaned** | **P0** | The full 120-step IdeaPros template exists in code (`lib/oases/ideapros-journey-steps.ts`) but is **not consumed anywhere** — completion is tracked only at the coarse 5-stage level (20% per stage). |
| **G2** | **No per-step completion tracking in the DB** | **P0** | There is no `journey_steps` / `completed_steps` table. A founder cannot see or be gated on "Step 31: conduct 5 discovery calls." |
| **G3** | **Structured deliverable steps are conversational, not artifact-gated** | **P1** | IdeaPros steps demand concrete artifacts (ICP doc, interview script, competitive matrix, financial model). Sahara satisfies most of these through FRED chat, not through tracked, completable artifacts. |
| **G4** | **Fund matching is mock-only** | **P1 (blocked)** | `lib/boardy/*` is a mock client; real VC/angel intros await the Boardy partnership + API key (carried block, v6.0 Phase 70). |
| **G5** | **Stage-gating is intent-based, not step-completion-based** | **P1** | `lib/ai/stage-gate/*` redirects founders by *conversation intent*, but does not enforce "you cannot start Build until Validation steps are 100% done." |
| **G6** | **Video coaching depends on Mux credentials** | **P2 (blocked)** | LiveKit live calls ship; recorded/admin video routes are blocked pending Mux credentials (carried block, v6.0 Phase 66 Plan 04). |

**Bottom line:** Sahara has *more* breadth than IdeaPros in places (voice, real-time AI, analytics). The replication gap is **structural**: IdeaPros is a 120-step checklist that *forces* sequence and produces artifacts; Sahara is currently a 5-stage AI mentor that *discusses* the same content. The single highest-leverage replication task is **wiring the already-authored 120-step template (G1/G2) into the journey UI, completion math, and stage gate.**

---

## 3. Feature parity matrix (code-grounded)

Status legend: ✅ Shipped & wired · 🟡 Partial / shallow · 🟠 Authored but orphaned (exists in code, not consumed) · ⛔ Blocked (credential/partnership) · ❌ Gap (not built)

| IdeaPros capability area | Sahara status | Evidence in repo |
|---|---|---|
| Founder self-assessment & profile | ✅ | onboarding flow, `lib/fred/founder-context-types.ts`, profiles table |
| Problem definition / Reality Lens | ✅ | `lib/fred/reality-lens.ts`, `reality-lens-quick.ts` |
| Idea crystallization / FRED coaching | ✅ | `lib/fred-brain.ts`, `lib/ai/fred-client.ts`, chat + voice + SMS |
| Investor Readiness Score | ✅ | `lib/fred/irs/`, `lib/fred/scoring/` |
| Pitch deck upload + review | ✅ | `app/deck`, `lib/ai/deck-scoring.ts`, `lib/fred/pitch/` |
| Strategy / planning documents | ✅ | `lib/fred/strategy/`, templates incl. `market-analysis.ts` |
| Virtual team agents (Ops/Fundraising/Growth) | ✅ | `lib/agents/founder-ops`, `lib/agents/fundraising`, `lib/agents/growth` |
| Investor targeting + outreach + pipeline | ✅ | `app/dashboard/investor-targeting/pipeline/`, migration `039_investor_pipeline.sql` |
| Daily guidance / SMS check-ins | ✅ | `lib/sms/fred-sms-handler.ts`, Twilio cron |
| 5-Oases journey + progress % | ✅ | `lib/journey/completion.ts`, `lib/oases/stage-config.ts`, `app/progress-report` |
| **120-step sequential program** | 🟠 | `lib/oases/ideapros-journey-steps.ts` (121 step defs) — **no importers** |
| **Per-step completion tracking** | ❌ | no `journey_steps`/`completed_steps` table in `lib/db/migrations/` |
| **Step-level stage gating** | 🟡 | `lib/ai/stage-gate/` gates by *intent*, not step completion |
| Customer-discovery artifacts (ICP, interview script, 5 calls) | 🟡 | discussed via FRED frameworks; no tracked completable artifact |
| Competitive positioning matrix | 🟡 | `lib/ai/frameworks/positioning.ts` (prompt framework, not a saved matrix artifact) |
| Financial model / 12-mo projections / OKRs | 🟡 | `lib/agents/fundraising/tools.ts`, `lib/ai/frameworks/investor-lens.ts` (advisory, no model artifact) |
| Due-diligence data room | 🟡 | document repository exists; no dedicated data-room/checklist construct |
| Fund matching (real VC intros) | ⛔ | `lib/boardy/mock.ts` — mock client; awaits Boardy API |
| Recorded video coaching / admin video | ⛔ | LiveKit live ships; Mux-backed routes blocked on credentials |

---

## 4. G1/G2 — the orphaned 120-step engine (the core gap)

This is the most important finding and the cheapest to close because **the data already exists**.

**What exists:**
- `lib/oases/ideapros-journey-steps.ts` defines all 120 steps with `id`, `stage`, `order`, `label`, `description`, `category`, `completionCriteria`, `estimatedMinutes`, `requiresFred`, `autoComplete`.
- `docs/IDEAPROS-JOURNEY-MAPPING.md` documents the same 120 steps mapped to the 5 Oases stages and Fred's 9-Step Process.

**What's missing (the wiring):**
1. **No consumer.** `grep -rl "ideapros-journey-steps"` across `lib/ app/ components/` returns **nothing** — the template is dead code from a UI/completion standpoint.
2. **Coarse completion only.** `lib/journey/completion.ts` computes journey % from a single `profiles.oases_stage` field via fixed `STAGE_WEIGHTS` (clarity 20 → grow 100). A founder is "40% done" the instant they're tagged `validation`, regardless of whether they did 1 or 25 of that stage's steps.
3. **No per-step persistence.** `lib/db/migrations/` has `009_journey_tables.sql` (milestones + journey_events timeline) but **no step-completion table**. There is nowhere to record "step c09 done."
4. **Gate doesn't reference steps.** `lib/ai/stage-gate/stage-gate-validator.ts` keys off conversation intent, not "are this stage's required steps complete."

**Consequence vs IdeaPros:** IdeaPros' core value is the *forced, visible checklist* — a founder always knows the next concrete action and cannot skip ahead. Sahara today gives the *content* of those steps through FRED but not the *structure* (sequence, visible checklist, completion gating). To a founder migrating from IdeaPros, this reads as "the program lost its backbone."

---

## 5. Stage-by-stage replication detail

| Oasis | IdeaPros steps | Sahara coverage | Replication gap |
|---|---|---|---|
| **Clarity** (1–28) | Self-assessment, problem def, idea crystallization, founder edge | FRED chat + Reality Lens + onboarding cover the *content* | Steps not individually trackable/gated; founder-edge & mindset checks not artifacted |
| **Validation** (29–56) | Customer discovery, competitive landscape, solution validation, business-model basics | FRED frameworks (`positioning.ts`, `market-analysis.ts`) | "5 discovery calls", "10-Q interview script", "positioning matrix" are not completable artifacts with criteria checks |
| **Build** (57–84) | Product dev, strategy/OKRs, investor materials | Strategy docs + deck review ship | 90-day OKRs, 12-mo financial model, hiring/legal checklists not tracked deliverables |
| **Launch** (85–108) | GTM execution, traction, fundraise prep | Investor pipeline + outreach ship | Metric-threshold gates (25 users, 40% retention, $1K MRR, IRS≥70) not auto-checked against tracked data |
| **Grow** (109–120) | Scale ops, fundraise & network, growth optimization | Dashboards + Boardy stub | Fund matching mocked (⛔); PMF/scale gates manual |

---

## 6. Prioritized replication backlog

Recommended follow-up Linear issues (Sahara project, `sahara` + `paid-active` labels):

| Priority | Replication task | Closes | Effort |
|---|---|---|---|
| **P0** | Wire `ideapros-journey-steps.ts` into a `journey_steps`/`founder_step_progress` table + completion service; surface a per-step checklist in the Progress UI | G1, G2 | M–L |
| **P0** | Recompute journey % from completed-steps-within-stage instead of flat `STAGE_WEIGHTS` | G1 | S–M |
| **P1** | Make `stage-gate-validator` also enforce "stage N steps complete before stage N+1" | G5 | M |
| **P1** | Promote the high-value artifact steps (ICP, interview script, competitive matrix, financial model, OKRs) into tracked, completable deliverables with `completionCriteria` checks | G3 | L |
| **P1 (blocked)** | Swap `lib/boardy/mock.ts` for the real Boardy client once API access lands (tracks v6.0 Phase 70) | G4 | S once unblocked |
| **P2 (blocked)** | Enable Mux-backed recorded/admin video routes once credentials land (tracks v6.0 Phase 66 Plan 04) | G6 | S once unblocked |
| **P2** | Auto-evaluate metric-threshold steps (user count, retention, MRR, IRS) against tracked analytics/scoring data | Stage gates | M |

---

## 7. What Sahara already does *better* than IdeaPros (do not regress)

For balance — these are net advantages of Julian's system that should be preserved through any replication work:

- **Real-time AI mentor** across **voice (LiveKit), chat (multi-provider), and SMS (Twilio)** — IdeaPros was a structured-content program, not a conversational AI.
- **Automated scoring** (Reality Lens, IRS, deck scoring) instead of manual coach assessment.
- **Founder memory / mini-brain** (`lib/fred/active-memory.ts`, context-builder) persisting across sessions.
- **Product analytics + observability** (PostHog, Sentry, structured logging) the original program lacked.

The replication goal is to add IdeaPros' **structural rigor** (the visible, gated, artifact-producing 120-step backbone) **on top of** these advantages — not to trade conversational depth for a static checklist.

---

## 8. Evidence appendix (verification commands)

```bash
# G1 — template exists, 120 step defs
grep -c "id:" lib/oases/ideapros-journey-steps.ts        # → 121 (incl. interface)

# G1 — template is orphaned (no consumers)
grep -rl "ideapros-journey-steps" lib/ app/ components/   # → (empty)

# G1 — completion is coarse 5-stage only
sed -n '36,46p' lib/journey/completion.ts                 # STAGE_WEIGHTS 20/40/60/80/100

# G2 — no per-step progress table
ls lib/db/migrations/ | grep -iE 'step|journey|oas'       # journey_tables, score constraints — no step table
grep -rli "completed_steps\|step_id\|journey_steps" lib/db/migrations/   # → (empty)

# G4 — Boardy is mocked
ls lib/boardy/                                            # client.ts, mock.ts, intro-templates.ts, types.ts
```

---

*Prepared as the AI-6019 deliverable from the 2026-03-30 Sahara Tech Meeting. Companion deliverable: `docs/AI-6017-FRED-COMMUNICATION-API-COST-ESTIMATE.md` (same meeting). Source method reference: `docs/IDEAPROS-JOURNEY-MAPPING.md` (AI-1802).*
