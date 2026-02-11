# Roadmap: Sahara

## Milestones

- [x] **v1.0 MVP** - Phases 1-11 (shipped 2026-02-07)
- [x] **v2.0 Production & Voice Parity** - Phases 12-23 (shipped 2026-02-07)
- [x] **v3.0 Scale, Activate & Engage** - Phases 24-33 (shipped 2026-02-08)
- [ ] **v4.0 FRED Mentor Experience** - Phases 34-42 (in progress)

## Phases

<details>
<summary>v1.0 MVP (Phases 1-11) - SHIPPED 2026-02-07</summary>

Built the core Sahara platform with FRED cognitive engine, tiered features, and monetization infrastructure.

- [x] Phase 01: FRED Cognitive Engine Foundation (6 plans)
- [x] Phase 02: Free Tier Features (5 plans)
- [x] Phase 03: Pro Tier Features (5 plans)
- [x] Phase 04: Studio Tier Features (7 plans)
- [x] Phase 05: Auth & Onboarding Fix (2 plans)
- [x] Phase 06: Tier Display & Stripe Wiring (2 plans)
- [x] Phase 07: Dashboard Integration & Strategy Completion (2 plans)
- [x] Phase 08: Final Polish & Chat Wiring (1 plan)
- [x] Phase 09: Stripe Checkout Fix (1 plan)
- [x] Phase 10: Production Hardening (8 gaps)
- [x] Phase 10b: Dashboard Polish & Missing Wiring (3 plans)
- [x] Phase 11: Security Hardening (6 plans)

See MILESTONES.md for full details.

</details>

<details>
<summary>v2.0 Production & Voice Parity (Phases 12-23) - SHIPPED 2026-02-07</summary>

Closed all gaps between what the website promises and what is actually built. Unified Fred Cary's voice across all 21 AI interaction points. Achieved production readiness and PWA mobile experience.

- [x] Phase 12: Data Fixes & Production Hardening (2 plans)
- [x] Phase 13: Voice -- Core AI Engines (1 plan)
- [x] Phase 14: Voice -- Agents & Channels (2 plans)
- [x] Phase 15: Voice -- Helpers & Activation (1 plan)
- [x] Phase 16: Red Flag Detection (1 plan)
- [x] Phase 17: Founder Wellbeing (1 plan)
- [x] Phase 18: Intake Snapshot & Strategy Reframing (2 plans)
- [x] Phase 19: Inbox Ops Agent (1 plan)
- [x] Phase 20: Investor Targeting, Outreach & Pipeline (2 plans)
- [x] Phase 21: Memory & Compute Tiers (1 plan)
- [x] Phase 22: PWA & Mobile Polish (2 plans)
- [x] Phase 23: Admin Training Docs (1 plan)

See MILESTONES.md for full details.

</details>

<details>
<summary>v3.0 Scale, Activate & Engage (Phases 24-33) - SHIPPED 2026-02-08</summary>

Made Sahara production-confident with observability, testing, security hardening, analytics, email engagement, and activated dormant integrations.

- [x] Phase 24: Feature Activation & Quick Fixes (2 plans)
- [x] Phase 25: Production Observability (2 plans)
- [x] Phase 26: E2E Testing & Coverage (2 plans)
- [x] Phase 27: RLS Security Hardening (2 plans)
- [x] Phase 28: Web Push Notifications (2 plans)
- [x] Phase 29: Video Coaching Sessions (2 plans)
- [x] Phase 30: Product Analytics & Growth (2 plans)
- [x] Phase 31: Email Engagement (2 plans)
- [x] Phase 32: FRED Intelligence Upgrade (2 plans)
- [x] Phase 33: Collaboration & Sharing (2 plans)

See MILESTONES.md for full details.

</details>

### v4.0 FRED Mentor Experience

**Milestone Goal:** Transform FRED from a responsive chatbot into a structured mentor that leads conversations, enforces decision sequencing through Reality Lens gating, and integrates existing frameworks as active conversation guides -- not passive tools. FRED controls the flow, not the user.

**Phase Numbering:** Integer phases (34-42). Decimal phases (e.g., 35.1) reserved for urgent insertions.

**Parallelism:**
- Wave 1 (foundation): Phase 34 -- system prompt overhaul, no dependencies
- Wave 2 (parallel, both depend on Phase 34): Phase 35 (onboarding handoff) + Phase 36 (conversation state & structured flow)
- Wave 3 (parallel, both depend on Phase 36): Phase 37 (Reality Lens gate & decision sequencing) + Phase 38 (framework & mode integration)
- Wave 4 (depends on Phases 37 + 38): Phase 39 (missing frameworks & gated reviews)
- Wave 5 (parallel, depends on Phase 39): Phase 40 (dashboard mentor hub) + Phase 41 (founder communities)
- Wave 6 (depends on Phase 40): Phase 42 (multi-channel FRED access — call, text, message)

- [ ] **Phase 34: System Prompt Overhaul** - Rebuild system prompt with mentor behaviors, dynamic context injection, and Fred's master GPT instructions
- [ ] **Phase 35: Onboarding-to-FRED Handoff** - Seamless data flow from onboarding into FRED's first conversation with no repetition
- [ ] **Phase 36: Conversation State & Structured Flow** - FRED leads conversations with state tracking, structured intake, and gentle redirects
- [ ] **Phase 37: Reality Lens Gate & Decision Sequencing** - Reality Lens as mandatory gate before tactical advice, enforced step ordering
- [ ] **Phase 38: Framework & Mode Integration** - Wire diagnostic engine and existing frameworks into chat as active conversation guides
- [ ] **Phase 39: Missing Frameworks & Gated Reviews** - Complete Investor Readiness Score, formalize Deck Request Protocol, gate Pitch Deck Review
- [ ] **Phase 40: Dashboard Mentor Hub & Readiness Wheel** - Prominent "Contact Fred" placement + funding readiness progress wheel (Red → Yellow → Green)
- [ ] **Phase 41: Founder Communities** - User-created communities, self-started, joinable from dashboard
- [ ] **Phase 42: Multi-Channel FRED Access** - Call, text (SMS), and message FRED 24/7 from any screen

## Phase Details

### Phase 34: System Prompt Overhaul
**Goal**: FRED speaks and thinks like a structured mentor -- reframing before prescribing, surfacing critical-thinking by default, using mentor tone without flattery, and ending every substantive response with Next 3 Actions
**Depends on**: Nothing (foundation for all v4.0 work)
**Requirements**: PROMPT-01, PROMPT-02, PROMPT-03, PROMPT-04, PROMPT-05
**Success Criteria** (what must be TRUE):
  1. FRED reframes the founder's question to identify the real underlying goal before answering the literal question asked
  2. Every FRED response surfaces at least one of: assumptions being made, bottlenecks to address, tests to run, or decision criteria to consider
  3. FRED never opens with default praise ("great idea!", "brilliant!", "love it!") -- instead encourages effort, discipline, and clear thinking
  4. Every substantive FRED response ends with a "Next 3 Actions" block containing specific, actionable next steps
  5. The system prompt dynamically incorporates founder context (stage, product status, revenue, constraints) rather than being static for every conversation
**Plans**: TBD

### Phase 35: Onboarding-to-FRED Handoff
**Goal**: When a founder finishes onboarding and opens their first FRED conversation, FRED already knows what onboarding captured and picks up where it left off -- no repeated questions, seamless continuity
**Depends on**: Phase 34 (new system prompt must accept dynamic founder context)
**Requirements**: ONBOARD-01, ONBOARD-02, ONBOARD-03, ONBOARD-04
**Success Criteria** (what must be TRUE):
  1. Onboarding captures the full founder snapshot: stage, industry, challenge, revenue range, team size, funding history
  2. FRED's first message after onboarding references what was already shared ("You mentioned you're at seed stage working on X...") and asks a deeper follow-up -- never re-asks stage or industry
  3. If a founder skips onboarding, FRED detects the missing data and runs the Founder Intake Protocol to gather it conversationally
  4. The combined onboarding + FRED intake data populates the Founder Snapshot visible on the dashboard
**Plans**: TBD

### Phase 36: Conversation State & Structured Flow
**Goal**: FRED leads every conversation like a structured mentor session -- asking specific questions, guiding to next steps, tracking where the founder is in the process, and gently redirecting when they drift off track
**Depends on**: Phase 34 (mentor behaviors must be in the system prompt)
**Requirements**: CHAT-01, CHAT-02, CHAT-03, CHAT-04, CHAT-05
**Success Criteria** (what must be TRUE):
  1. FRED drives the conversation by asking specific questions and guiding to next steps rather than passively waiting for input -- the founder answers, FRED leads
  2. FRED applies reframe-before-prescribe in every response: identifies the real underlying goal before answering the literal question
  3. FRED surfaces critical-thinking elements (assumptions, bottlenecks, tests, decision criteria) in every substantive response
  4. When a founder goes off track, FRED acknowledges what they said and steers back: "I hear you -- but before we go there, let's finish establishing X"
  5. FRED tracks conversation state -- knows what has been established (problem, buyer, economics) and what still needs validation -- and uses this to determine next questions
**Plans**: TBD

### Phase 37: Reality Lens Gate & Decision Sequencing
**Goal**: Reality Lens (Feasibility, Economics, Demand, Distribution, Timing) is a mandatory gate before any tactical advice, and FRED enforces decision sequencing so founders cannot skip upstream validation to work on downstream artifacts
**Depends on**: Phase 36 (conversation state tracking needed to enforce gates and track what has been validated)
**Requirements**: GATE-01, GATE-02, GATE-03
**Success Criteria** (what must be TRUE):
  1. When a founder asks about downstream work (pitch decks, patents, hiring plans, fundraising strategy, scaling), FRED checks whether upstream truth (feasibility, demand, economics, distribution) has been established -- if not, FRED redirects to validation first
  2. FRED runs Reality Lens assessment inline during conversation when the founder's idea foundation needs pressure-testing -- this is not a separate tool but part of the natural flow
  3. When Reality Lens reveals a weak foundation, FRED says so plainly and redirects: "Before we work on your deck, we need to address that you don't have a clear buyer yet" -- no sugarcoating, no letting the founder skip ahead
**Plans**: TBD

### Phase 38: Framework & Mode Integration
**Goal**: The diagnostic engine silently detects context and introduces the right framework at the right moment -- Investor Mode when fundraising signals appear, Positioning Mode when messaging signals appear, and the 9-Step Startup Process as the default decision sequencing backbone
**Depends on**: Phase 36 (conversation state tracking needed for mode switching and framework context)
**Requirements**: MODE-01, MODE-02, MODE-03, MODE-04
**Success Criteria** (what must be TRUE):
  1. The diagnostic engine (lib/ai/diagnostic-engine.ts) is wired into the chat route and analyzes every conversation for positioning and investor signals -- mode detection happens silently, not chosen by the user
  2. When fundraising signals are detected (mentions fundraising, valuation, deck), FRED transitions into Investor Mode and applies the Investor Lens framework -- including IC Verdict (Yes/No/Not Yet), pass reasons, and de-risking actions
  3. When positioning signals are detected (vague ICP, "everyone" target, generic messaging), FRED transitions into Positioning Mode and applies the Positioning Readiness Framework -- including grade (A-F), narrative tightness (1-10), and gaps
  4. The 9-Step Startup Process (Idea to Traction) is used as the default conversation backbone for early-stage founders -- FRED knows which step the founder is on and does not let them skip ahead
**Plans**: TBD

### Phase 39: Missing Frameworks & Gated Reviews
**Goal**: Investor Readiness Score is fully implemented (not just DB schema), Deck Request Protocol is formalized as a standalone flow, and Pitch Deck Review is gated behind upstream validation so founders earn the right to detailed deck feedback
**Depends on**: Phase 37 (gating logic) + Phase 38 (framework integration patterns)
**Requirements**: MODE-05, MODE-06, GATE-04, GATE-05
**Success Criteria** (what must be TRUE):
  1. Investor Readiness Score framework is fully implemented -- AI scoring across 6 categories with stage benchmarks, not just empty DB tables
  2. Deck Request Protocol is formalized as a standalone flow: FRED issues a provisional investor verdict first, then decides whether a deck review would materially change that verdict (never asks for a deck by default)
  3. Pitch Deck Review (11-dimension scorecard, 0-10 per dimension) is only accessible after the founder has passed upstream validation through Reality Lens -- FRED explains why if the founder tries to access it prematurely
  4. Per-slide investor objections (2-3 skeptical questions per slide with knockout answers) are generated as part of the gated Pitch Deck Review flow
**Plans**: TBD

### Phase 40: Dashboard Mentor Hub & Readiness Wheel
**Goal**: The dashboard is the founder's home base for building their company — with FRED always one click away and a persistent visual indicator (Red → Yellow → Green) showing how close they are to funding readiness
**Depends on**: Phase 39 (Investor Readiness Score must be fully implemented to power the readiness wheel)
**Requirements**: HUB-01, HUB-02, HUB-03, HUB-04
**Success Criteria** (what must be TRUE):
  1. Dashboard has a prominent, always-visible "Contact Fred" section — founders can start a chat or call from the dashboard in one click
  2. Funding readiness progress wheel displayed on dashboard — visual indicator (Red → Yellow → Green) powered by Investor Readiness Score, showing how far along the founder is toward being investor-ready
  3. Progress wheel updates dynamically as the founder completes upstream validation steps (feasibility, demand, economics, etc.)
  4. Dashboard feels like "this is where you build your company" — FRED's presence is central, not buried in a nav menu
**Plans**: TBD

### Phase 41: Founder Communities
**Goal**: Founders can join and create communities within Sahara — self-started groups that provide peer support, accountability, and stickiness beyond the FRED mentor relationship
**Depends on**: Phase 34 (basic mentor infrastructure needed, but communities are largely independent)
**Requirements**: COMM-01, COMM-02, COMM-03, COMM-04
**Success Criteria** (what must be TRUE):
  1. Founders can create communities around topics, industries, or stages (e.g., "Pre-seed SaaS", "Hardware Founders", "Second-time Founders")
  2. Founders can browse and join communities from the dashboard
  3. Community feeds show posts, questions, and updates from members
  4. Communities are self-started and self-moderated by users — not admin-curated
**Plans**: TBD

### Phase 42: Multi-Channel FRED Access
**Goal**: Founders can reach FRED through any channel — in-app chat, voice call, or SMS text — 24/7 from any screen in the app
**Depends on**: Phase 40 (dashboard hub provides the UI surface for multi-channel access)
**Requirements**: CHANNEL-01, CHANNEL-02, CHANNEL-03, CHANNEL-04
**Success Criteria** (what must be TRUE):
  1. Founders can message FRED via in-app chat from any page (floating widget or persistent sidebar)
  2. Founders can call FRED via voice (LiveKit integration already exists from v3.0) directly from the dashboard
  3. Founders can text FRED via SMS and receive structured mentor responses (builds on existing Twilio infrastructure)
  4. All channels share the same conversation context — FRED knows what was discussed regardless of channel used
**Plans**: TBD

## Progress

### v4.0 Execution

**Execution Order:**
- Wave 1: Phase 34
- Wave 2 (parallel): Phases 35, 36
- Wave 3 (parallel): Phases 37, 38
- Wave 4: Phase 39
- Wave 5 (parallel): Phases 40, 41
- Wave 6: Phase 42

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 34. System Prompt Overhaul | v4.0 | 0/TBD | Not started | - |
| 35. Onboarding-to-FRED Handoff | v4.0 | 0/TBD | Not started | - |
| 36. Conversation State & Structured Flow | v4.0 | 0/TBD | Not started | - |
| 37. Reality Lens Gate & Decision Sequencing | v4.0 | 0/TBD | Not started | - |
| 38. Framework & Mode Integration | v4.0 | 0/TBD | Not started | - |
| 39. Missing Frameworks & Gated Reviews | v4.0 | 0/TBD | Not started | - |
| 40. Dashboard Mentor Hub & Readiness Wheel | v4.0 | 0/TBD | Not started | - |
| 41. Founder Communities | v4.0 | 0/TBD | Not started | - |
| 42. Multi-Channel FRED Access | v4.0 | 0/TBD | Not started | - |
