# Roadmap: Sahara

## Milestones

- [x] **v1.0 MVP** - Phases 1-11 (shipped 2026-02-07)
- [x] **v2.0 Production & Voice Parity** - Phases 12-23 (shipped 2026-02-07)
- [x] **v3.0 Scale, Activate & Engage** - Phases 24-33 (shipped 2026-02-08)
- [x] **v4.0 FRED Mentor Experience** - Phases 34-46 (shipped 2026-02-12)
- [x] **v5.0 QA Fixes — Production Polish** - Phases 54-58 (shipped 2026-02-18)
- [ ] **v6.0 Full Platform Maturity** - Phases 59-70

## v5.0 QA Fixes — Production Polish

**Milestone Goal:** Fix all 10 failing pages and 7 bugs found during full-platform Stagehand browser QA audit. Target: 100% page pass rate (currently 78%).

**Parallelism:** All 5 phases run simultaneously with zero file overlap.

**Source:** `.planning/v5.0-QA-FIXES-MILESTONE.md`

- [x] **Phase 54: Dashboard Routing Fix** — 3 dashboard routes render Settings instead of content (BUG-2) [CRITICAL]
- [x] **Phase 55: Infinite Loading Spinner Fixes** — 4 pages stuck on spinner with no error boundaries (BUG-1, BUG-3) [CRITICAL]
- [x] **Phase 56: Demo Page Auth Fix** — 2 demo pages redirect to login for unauthenticated users (BUG-5) [HIGH]
- [x] **Phase 57: Duplicate Logo UI Fix** — Second Sahara logo overlapping nav on 4 pages (BUG-4) [HIGH]
- [x] **Phase 58: Error State Polish** — "Failed to fetch" errors on next-steps and settings (BUG-6) [HIGH]

## v6.0 Full Platform Maturity

**Milestone Goal:** Make Sahara production-solid (infrastructure, voice, SMS), smarter (FRED intelligence, analytics), and feature-complete (content library, service marketplace, Boardy API).

**Parallelism:**
- Wave 1 (parallel, no dependencies): Phase 59, 60, 61 — infrastructure foundation
- Wave 2 (depends on Phase 59): Phase 62 — voice hardening
- Wave 3 (parallel, depends on infra): Phase 63, 64, 65 — core improvements
- Wave 4 (parallel, depends on Phase 63): Phase 66, 68 — content + marketplace backends
- Wave 5 (parallel, depends on Wave 4): Phase 67, 69 — content + marketplace frontends
- Wave 6 (depends on partnership): Phase 70 — Boardy API

**Source:** `.planning/research/SUMMARY.md`

- [x] **Phase 59: Sentry + Production Monitoring** — Error tracking, source maps, alerting, CI hardening [CRITICAL] (completed 2026-02-19)
- [x] **Phase 60: CI/CD & Testing Expansion** — Playwright in CI, visual regression, axe-core a11y, staging (completed 2026-02-19)
- [x] **Phase 61: Twilio SMS Activation** — A2P 10DLC registration, real SMS delivery, compliance (completed 2026-02-19)
- [x] **Phase 62: Voice Agent Production Hardening** — Fix 3 CRITICAL voice bugs, reconnection, recording [CRITICAL] (completed 2026-02-23)
- [x] **Phase 63: FRED Intelligence Upgrade** — Better memory, mode switching, new AI tools (completed 2026-02-23)
- [x] **Phase 64: Dashboard & Analytics Enhancement** — Historical trends, engagement scoring, data export (completed 2026-02-23)
- [x] **Phase 65: Mobile / UX Polish** — Serwist PWA, smooth animations, WCAG 2.1 AA compliance (completed 2026-02-23)
- [ ] **Phase 66: Content Library — Schema & Backend** — Mux video, 5 tables, API routes, admin management
- [ ] **Phase 67: Content Library — Frontend & FRED Integration** — Course catalog, video player, FRED recommendations
- [ ] **Phase 68: Service Marketplace — Schema & Backend** — Stripe Connect, 4 tables, booking flow
- [ ] **Phase 69: Service Marketplace — Frontend & Discovery** — Provider directory, search, reviews, FRED integration
- [ ] **Phase 70: Real Boardy API Integration** — RealBoardyClient, circuit breaker, cached fallback [RISK]

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

**Phase Numbering:** Integer phases (34-46). Decimal phases (e.g., 35.1) reserved for urgent insertions.

**Parallelism:**
- Wave 1 (foundation): Phase 34 -- system prompt overhaul, no dependencies
- Wave 2 (parallel, both depend on Phase 34): Phase 35 (onboarding handoff) + Phase 36 (conversation state & structured flow)
- Wave 3 (parallel, both depend on Phase 36): Phase 37 (Reality Lens gate & decision sequencing) + Phase 38 (framework & mode integration)
- Wave 4 (depends on Phases 37 + 38): Phase 39 (missing frameworks & gated reviews)
- Wave 5 (parallel, depends on Phase 39): Phase 40 (dashboard redesign) + Phase 41 (founder communities)
- Wave 6 (parallel, depends on Phase 40): Phase 42 (multi-channel FRED access) + Phase 43 (Next Steps Hub + Readiness Tab)
- Wave 7 (parallel): Phase 44 (document repository) + Phase 45 (chat UI redesign)
- Wave 8: Phase 46 (mobile app layout)

- [x] **Phase 34: System Prompt Overhaul** - Rebuild system prompt with mentor behaviors, dynamic context injection, and Fred's master GPT instructions
- [x] **Phase 35: Onboarding-to-FRED Handoff** - Seamless data flow from onboarding into FRED's first conversation with no repetition
- [x] **Phase 36: Conversation State & Structured Flow** - FRED leads conversations with state tracking, structured intake, and gentle redirects
- [x] **Phase 37: Reality Lens Gate & Decision Sequencing** - Reality Lens as mandatory gate before tactical advice, enforced step ordering
- [x] **Phase 38: Framework & Mode Integration** - Wire diagnostic engine and existing frameworks into chat as active conversation guides
- [x] **Phase 39: Missing Frameworks & Gated Reviews** - Complete Investor Readiness Score, formalize Deck Request Protocol, gate Pitch Deck Review
- [x] **Phase 40: Dashboard Redesign — Founder Command Center** - Nav restructure, Home with Snapshot Card + Decision Box + Funding Gauge + Weekly Momentum, dynamic display rules
- [x] **Phase 41: Founder Communities** - User-created communities with Circles, Topic Rooms, Events, and Graduates sections
- [x] **Phase 42: Multi-Channel FRED Access** - Call (scheduled + on-demand), text (SMS), and message FRED 24/7 from any screen
- [x] **Phase 43: Next Steps Hub & Readiness Tab** - Next Steps (Critical/Important/Optional) + combined Investor Readiness + Positioning Readiness view
- [x] **Phase 44: Document Repository** - Decks, Strategy Docs, Reports, Uploaded Files with "Review with Fred" action
- [x] **Phase 45: Chat UI Redesign** - Full-screen chat with active mode bar, side panel toggle (Snapshot, Next Steps, Documents)
- [x] **Phase 46: Mobile App Layout** - Mobile-specific nav, Today's Focus, simplified gauges, voice input, Call Fred
- [x] **Phase 47: Community Data Layer & Consent** - 14-table schema, consent-gated materialized views, consent CRUD, Settings UI

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

### Phase 40: Dashboard Redesign — Founder Command Center
**Goal**: Complete dashboard restructure — new left sidebar nav, Founder Command Center as home page with Snapshot Card, "Right Now" Decision Box, Funding Readiness Gauge, Weekly Momentum widget, and dynamic display rules that adapt to founder stage and state
**Depends on**: Phase 39 (Investor Readiness Score for gauge), Phase 35 (Founder Snapshot data)
**Requirements**: DASH-01, DASH-02, DASH-03, DASH-04, HUB-01, HUB-02, HUB-03, HUB-04
**Success Criteria** (what must be TRUE):
  1. Left sidebar nav restructured: Home, Chat with Fred, Next Steps, Readiness, Documents, Community, Profile
  2. Home page = Founder Command Center with: Snapshot Card (stage, constraint, 90-day goal, runway), "Right Now" Decision Box (most important decision + "Work on this with Fred" button), Funding Readiness Gauge (Red=Build / Yellow=Prove / Green=Raise), Weekly Momentum (last check-in summary, streak, Start Check-In button)
  3. Funding Readiness Gauge powered by IRS — never gamified, always tied to specific actions, shows top 2 blockers
  4. Dynamic display rules: hide gauge for early stage (show Positioning first), blur gauge if no intake completed, show Primary Constraint for growth stage, surface stabilization if high stress detected
  5. Dashboard answers: "What should I work on right now?"
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
**Goal**: Founders can reach FRED through any channel — in-app chat, voice call (scheduled + on-demand), or SMS text — 24/7 from any screen in the app
**Depends on**: Phase 40 (dashboard hub provides the UI surface for multi-channel access)
**Requirements**: CHANNEL-01, CHANNEL-02, CHANNEL-03, CHANNEL-04, CHANNEL-05, CHANNEL-06
**Success Criteria** (what must be TRUE):
  1. Founders can message FRED via in-app chat from any page (floating widget or persistent sidebar)
  2. Founders can call FRED via voice (LiveKit) — both scheduled calls (15-30 min) and on-demand decision calls (5-10 min)
  3. Founders can text FRED via SMS and receive structured mentor responses (builds on existing Twilio infrastructure)
  4. All channels share the same conversation context — FRED knows what was discussed regardless of channel used
  5. Post-call deliverables generated: transcript, summary, decisions made, Next 3 Actions
  6. Call Fred option visible as premium feature on dashboard and mobile
**Plans**: TBD

### Phase 43: Next Steps Hub & Readiness Tab
**Goal**: Founders have a dedicated execution surface showing prioritized next steps from FRED conversations, plus a unified readiness view combining Investor Readiness Score and Positioning Readiness grade
**Depends on**: Phase 40 (nav structure), Phase 39 (IRS and Positioning frameworks fully implemented)
**Requirements**: DASH-05, DASH-06, DASH-07, DASH-08, DASH-09
**Success Criteria** (what must be TRUE):
  1. Next Steps Hub page shows three priority tiers: Critical, Important, Optional
  2. Each next step shows description, why it matters, linked conversation, and mark-complete action
  3. Next steps are generated from FRED conversations (extracted from "Next 3 Actions" outputs)
  4. Readiness Tab shows Investor Readiness (score, zone, breakdown, historical trend, reassess button)
  5. Readiness Tab shows Positioning Readiness (grade A-F, narrative tightness 1-10, key gaps)
**Plans**: TBD

### Phase 44: Document Repository
**Goal**: Founders have organized access to all their documents — pitch decks, strategy docs, reports, and uploaded files — with the ability to review any document with FRED
**Depends on**: Phase 40 (nav structure)
**Requirements**: DASH-10, DASH-11, DASH-12
**Success Criteria** (what must be TRUE):
  1. Document repository page with folders: Decks, Strategy Docs, Reports, Uploaded Files
  2. View action opens document inline or in new tab
  3. "Review with Fred" action opens the document in chat context so FRED can analyze it
**Plans**: TBD

### Phase 45: Chat UI Redesign
**Goal**: FRED chat is a full-screen conversational interface with active mode indicator and contextual side panel showing founder snapshot, recent next steps, and uploaded documents
**Depends on**: Phase 36 (conversation state), Phase 38 (mode integration), Phase 43 (next steps)
**Requirements**: DASH-13, DASH-14, DASH-15
**Success Criteria** (what must be TRUE):
  1. Chat is full-screen with clean conversational layout
  2. Top bar shows active mode (Neutral, Positioning, Investor, Strategy) based on diagnostic engine state
  3. Toggleable side panel shows Founder Snapshot, Recent Next Steps, and Uploaded Documents
**Plans**: TBD

### Phase 46: Mobile App Layout
**Goal**: Sahara mobile experience is optimized for daily momentum — quick check-ins, fast decisions, emotional support, and simplified progress tracking
**Depends on**: Phases 40-45 (all dashboard features built for desktop first)
**Requirements**: MOBILE-01, MOBILE-02, MOBILE-03, MOBILE-04, MOBILE-05
**Success Criteria** (what must be TRUE):
  1. Mobile bottom nav: Home, Chat, Next, Progress, Profile
  2. Mobile Home shows Today's Focus, active next steps, Start Check-In button, simplified funding gauge
  3. Mobile Chat supports text, voice input, and Call Fred (premium)
  4. Progress tab shows funding readiness bar, positioning grade, momentum streak, last check-in summary
  5. All dynamic display rules apply on mobile (hide gauge for early stage, blur without intake, etc.)
**Plans**: TBD

### Phase 54: Dashboard Routing Fix
**Goal**: Fix 3 dashboard sub-routes (`/dashboard/communities`, `/dashboard/documents`, `/dashboard/coaching`) that render the Settings page instead of their intended content
**Depends on**: Nothing
**Gap Closure**: BUG-2 (CRITICAL)
**Success Criteria** (what must be TRUE):
  1. `/dashboard/communities` renders the Communities list page (Phase 41)
  2. `/dashboard/documents` renders the Document Repository page (Phase 44)
  3. `/dashboard/coaching` renders the Coaching Sessions page (Phase 29)
  4. No other dashboard routes are affected by the fix
  5. Each page shows appropriate content or FeatureLock for Free tier users
**Plans**: TBD

### Phase 55: Infinite Loading Spinner Fixes
**Goal**: Fix 4 pages stuck on permanent loading spinners by ensuring API routes return empty data (not errors) for new users and adding error boundaries with timeout fallbacks
**Depends on**: Nothing
**Gap Closure**: BUG-1, BUG-3 (CRITICAL)
**Success Criteria** (what must be TRUE):
  1. `/dashboard` renders Founder Command Center (even if data sections are empty)
  2. `/dashboard/strategy` renders Strategy page (empty state if no strategies)
  3. `/documents` renders Document list (empty state if no documents)
  4. `/check-ins` renders Check-ins list (empty state if no check-ins)
  5. No page shows an infinite spinner for longer than 5 seconds
  6. Each page shows a clear CTA for new users
**Plans**: TBD

### Phase 56: Demo Page Auth Fix
**Goal**: Fix `/demo/boardy` and `/demo/virtual-team` rendering login form for unauthenticated users by preventing TierProvider's subscription check from triggering a redirect on demo pages
**Depends on**: Nothing
**Gap Closure**: BUG-5 (HIGH)
**Success Criteria** (what must be TRUE):
  1. `/demo/boardy` renders the Boardy demo for unauthenticated users
  2. `/demo/virtual-team` renders the Virtual Team demo for unauthenticated users
  3. Other demo pages (`/demo/investor-lens`, `/demo/pitch-deck`, `/demo/reality-lens`) still work
  4. Authenticated users can also access demo pages normally
**Plans**: TBD

### Phase 57: Duplicate Logo UI Fix
**Goal**: Remove the second Sahara logo that appears overlapping the navigation bar on `/login`, `/chat`, and demo pages
**Depends on**: Nothing
**Gap Closure**: BUG-4 (HIGH)
**Success Criteria** (what must be TRUE):
  1. Only one Sahara logo is visible on `/login`
  2. Only one Sahara logo is visible on `/chat`
  3. Navigation links ("See It in Action", "About") are fully visible and clickable
  4. No layout shift or overlap on any page
**Plans**: TBD

### Phase 58: Error State Polish
**Goal**: Replace raw "Failed to fetch" error banners on `/dashboard/next-steps` and `/dashboard/settings` with user-friendly empty states and clear CTAs
**Depends on**: Nothing (can finalize after Phase 55)
**Gap Closure**: BUG-6 (HIGH)
**Success Criteria** (what must be TRUE):
  1. No red error banners visible on any page for new users
  2. `/dashboard/next-steps` shows empty state with "Chat with FRED" CTA
  3. `/dashboard/settings` notification channels shows setup guide instead of error
  4. All empty states have clear CTAs that guide users to the right action
**Plans**: TBD

### Phase 59: Sentry + Production Monitoring
**Goal**: Error tracking, source maps, alerting, and CI hardening so bugs are caught and reported automatically
**Depends on**: Nothing (infrastructure foundation)
**Requirements**: INFRA-01
**Success Criteria** (what must be TRUE):
  1. Sentry captures and reports runtime errors from production with source maps
  2. Alert rules notify team of critical errors within 5 minutes
  3. CI pipeline fails on type errors, lint errors, and test failures (no `|| true`)
  4. Performance monitoring tracks page load times and API response times
**Plans**: TBD

### Phase 60: CI/CD & Testing Expansion
**Goal**: Comprehensive CI with visual regression, accessibility testing, and staging environment
**Depends on**: Nothing (infrastructure foundation)
**Requirements**: INFRA-02
**Success Criteria** (what must be TRUE):
  1. Playwright E2E tests run in CI on every PR
  2. Visual regression baselines detect unintended UI changes
  3. Accessibility tests (axe-core) catch WCAG violations in CI
  4. Staging environment exists for pre-production testing
**Plans**: TBD

### Phase 61: Twilio SMS Activation
**Goal**: Real SMS delivery for weekly check-ins with A2P 10DLC compliance
**Depends on**: Nothing (infrastructure foundation)
**Requirements**: INFRA-03
**Success Criteria** (what must be TRUE):
  1. Weekly check-in SMS messages delivered to real phone numbers
  2. A2P 10DLC registration approved and active
  3. Users can opt-in and opt-out of SMS via settings
  4. SMS delivery status tracked and reported
**Plans**: TBD

### Phase 62: Voice Agent Production Hardening
**Goal**: Reliable LiveKit voice calls with recording and transcription
**Depends on**: Phase 59 (Sentry monitoring for voice errors)
**Requirements**: INFRA-04
**Success Criteria** (what must be TRUE):
  1. Users hear FRED's audio during voice calls (remote audio track plays)
  2. Voice agent Docker container starts and runs reliably
  3. Call recording and transcription work end-to-end
  4. Calls reconnect gracefully on network interruption
**Plans**: TBD

### Phase 63: FRED Intelligence Upgrade
**Goal**: Smarter FRED with better memory retrieval, mode switching, and new AI tools
**Depends on**: Phase 59 (Sentry), Phase 60 (CI)
**Requirements**: IMPROVE-01
**Success Criteria** (what must be TRUE):
  1. FRED retrieves relevant past conversation context more accurately
  2. Long conversations (50+ messages) don't degrade response quality
  3. Mode switching transitions are smoother with fewer false positives
  4. FRED has new tools for recommending content and finding providers
**Plans**: TBD

### Phase 64: Dashboard & Analytics Enhancement
**Goal**: Richer founder metrics with historical trends and engagement tracking
**Depends on**: Phase 59 (Sentry), Phase 60 (CI)
**Requirements**: IMPROVE-03
**Success Criteria** (what must be TRUE):
  1. Founder metrics dashboard shows historical trends (weekly/monthly charts)
  2. Engagement scoring tracks founder activity across features
  3. Data can be exported as CSV or PDF
  4. PostHog funnels visualize user journey bottlenecks
**Plans**: TBD

### Phase 65: Mobile / UX Polish
**Goal**: PWA refinements, smooth animations, and WCAG accessibility compliance
**Depends on**: Phase 59 (Sentry), Phase 60 (CI)
**Requirements**: IMPROVE-02
**Success Criteria** (what must be TRUE):
  1. Service worker caches content for offline access (Serwist)
  2. Page transitions and interactions have smooth animations
  3. WCAG 2.1 AA compliance on all core pages
  4. Push notifications work reliably on mobile
**Plans**: TBD

### Phase 66: Content Library — Schema & Backend
**Goal**: Content management backend with Mux video hosting and tier gating
**Depends on**: Phase 63 (FRED tools for content recommendation)
**Requirements**: FEATURE-01 (backend)
**Success Criteria** (what must be TRUE):
  1. Admin can create, edit, and organize courses with modules and lessons
  2. Video content hosted on Mux with adaptive bitrate streaming
  3. Content access gated by subscription tier
  4. API routes serve content catalog with filtering by stage and topic
**Plans**: TBD

### Phase 67: Content Library — Frontend & FRED Integration
**Goal**: Course catalog UI with FRED-recommended learning paths
**Depends on**: Phase 66 (content backend)
**Requirements**: FEATURE-01 (frontend)
**Success Criteria** (what must be TRUE):
  1. Founders browse and filter course catalog by stage, topic, and format
  2. Video player plays lessons with progress tracking
  3. FRED recommends relevant content during conversations
  4. "Ask FRED about this" button on content pages opens contextual chat
**Plans**: TBD

### Phase 68: Service Marketplace — Schema & Backend
**Goal**: Provider directory backend with Stripe Connect payments and booking
**Depends on**: Phase 63 (FRED tools for provider recommendation)
**Requirements**: FEATURE-02 (backend)
**Success Criteria** (what must be TRUE):
  1. Providers can be onboarded with profiles, services, and pricing
  2. Stripe Connect Express handles marketplace payments isolated from subscriptions
  3. Booking flow creates and tracks service engagements
  4. Review system captures and displays founder feedback
**Plans**: TBD

### Phase 69: Service Marketplace — Frontend & Discovery
**Goal**: Provider discovery UI with FRED-triggered recommendations
**Depends on**: Phase 68 (marketplace backend)
**Requirements**: FEATURE-02 (frontend)
**Success Criteria** (what must be TRUE):
  1. Founders browse and search provider directory with filters
  2. Provider profiles show services, reviews, and booking options
  3. FRED recommends providers during relevant conversations
  4. Booking confirmation and status tracking visible on dashboard
**Plans**: TBD

### Phase 70: Real Boardy API Integration
**Goal**: Live investor matching replacing mock client with real API
**Depends on**: Phase 63 (FRED intelligence), Phase 59 (Sentry monitoring)
**Requirements**: FEATURE-03
**Success Criteria** (what must be TRUE):
  1. RealBoardyClient connects to Boardy API with circuit breaker and fallback
  2. Investor matches based on founder's stage, sector, and readiness score
  3. Match results cached for performance and resilience
  4. Graceful fallback to enhanced mock if API is unavailable
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
| 34. System Prompt Overhaul | v4.0 | 3/3 | Complete | 2026-02-11 |
| 35. Onboarding-to-FRED Handoff | v4.0 | 1/1 | Complete | 2026-02-11 |
| 36. Conversation State & Structured Flow | v4.0 | 2/2 | Complete | 2026-02-11 |
| 37. Reality Lens Gate & Decision Sequencing | v4.0 | 1/1 | Complete | 2026-02-11 |
| 38. Framework & Mode Integration | v4.0 | 1/1 | Complete | 2026-02-11 |
| 39. Missing Frameworks & Gated Reviews | v4.0 | 1/1 | Complete | 2026-02-11 |
| 40. Dashboard Redesign — Founder Command Center | v4.0 | 1/1 (team) | Complete | 2026-02-12 |
| 41. Founder Communities | v4.0 | 2/2 | Complete | 2026-02-11 |
| 42. Multi-Channel FRED Access | v4.0 | 1/1 (team) | Complete | 2026-02-12 |
| 43. Next Steps Hub & Readiness Tab | v4.0 | 1/1 (team) | Complete | 2026-02-12 |
| 44. Document Repository | v4.0 | 1/1 (team) | Complete | 2026-02-12 |
| 45. Chat UI Redesign | v4.0 | 1/1 (team) | Complete | 2026-02-12 |
| 46. Mobile App Layout | v4.0 | 1/1 (team) | Complete | 2026-02-12 |
| 47. Community Data Layer & Consent | v4.0 | 2/2 | Complete | 2026-02-12 |

### v5.0 Execution

**Execution Order:** All 5 phases run in parallel (zero file overlap).

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 54. Dashboard Routing Fix | v5.0 | 1/1 | Complete | 2026-02-18 |
| 55. Infinite Loading Spinner Fixes | v5.0 | 1/1 | Complete | 2026-02-18 |
| 56. Demo Page Auth Fix | v5.0 | 1/1 | Complete | 2026-02-18 |
| 57. Duplicate Logo UI Fix | v5.0 | 1/1 | Complete | 2026-02-18 |
| 58. Error State Polish | v5.0 | 1/1 | Complete | 2026-02-18 |

### v6.0 Execution

**Execution Order:**
- Wave 1 (parallel): Phases 59, 60, 61
- Wave 2: Phase 62
- Wave 3 (parallel): Phases 63, 64, 65
- Wave 4 (parallel): Phases 66, 68
- Wave 5 (parallel): Phases 67, 69
- Wave 6: Phase 70

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 59. Sentry + Production Monitoring | v6.0 | 2/2 | Complete | 2026-02-19 |
| 60. CI/CD & Testing Expansion | v6.0 | 2/2 | Complete | 2026-02-19 |
| 61. Twilio SMS Activation | v6.0 | 2/2 | Complete | 2026-02-19 |
| 62. Voice Agent Production Hardening | v6.0 | 2/2 | Complete | 2026-02-23 |
| 63. FRED Intelligence Upgrade | v6.0 | 4/4 | Complete | 2026-02-23 |
| 64. Dashboard & Analytics Enhancement | v6.0 | 1/1 | Complete | 2026-02-23 |
| 65. Mobile / UX Polish | v6.0 | 4/4 | Complete | 2026-02-23 |
| 66. Content Library — Schema & Backend | v6.0 | 0/TBD | Not started | - |
| 67. Content Library — Frontend & FRED Integration | v6.0 | 0/TBD | Not started | - |
| 68. Service Marketplace — Schema & Backend | v6.0 | 0/TBD | Not started | - |
| 69. Service Marketplace — Frontend & Discovery | v6.0 | 0/TBD | Not started | - |
| 70. Real Boardy API Integration | v6.0 | 0/TBD | Not started | - |
