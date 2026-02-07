# Roadmap: Sahara

## Milestones

- [x] **v1.0 MVP** - Phases 1-11 (shipped 2026-02-07)
- [ ] **v2.0 Production & Voice Parity** - Phases 12-23 (in progress)

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

### v2.0 Production & Voice Parity

**Milestone Goal:** Close all gaps between what the website promises and what is actually built, unify Fred Cary's voice across all 21 AI interaction points, achieve production readiness, and deliver a polished PWA experience for mobile users.

**Phase Numbering:** Integer phases (12-23). Decimal phases (e.g., 14.1) reserved for urgent insertions.

**Parallelism:**
- Wave 1 (no interdependencies): Phases 12, 13, 14, 15, 22 -- all can run in parallel
- Wave 2 (soft dependency on Phase 13 for voice foundation): Phases 16, 17, 18, 19, 20, 21 -- all can run in parallel
- Wave 3 (depends on voice completion): Phase 23 -- after Phases 13, 14, 15

- [x] **Phase 12: Data Fixes & Production Hardening** - Fix data inconsistencies and harden production infrastructure
- [ ] **Phase 13: Voice -- Core AI Engines** - Main AI prompts speak as Fred Cary
- [ ] **Phase 14: Voice -- Agents & Channels** - Agent tools, SMS, and voice agent use Fred's voice
- [ ] **Phase 15: Voice -- Helpers & Activation** - Wire up unused fred-brain.ts exports and coaching prompts
- [ ] **Phase 16: Red Flag Detection** - Inline chat warnings and dashboard widget for risk identification
- [ ] **Phase 17: Founder Wellbeing** - Burnout detection, check-in page, and mindset coaching
- [ ] **Phase 18: Intake Snapshot & Strategy Reframing** - Enriched founder profiles and dedicated strategy UI
- [ ] **Phase 19: Inbox Ops Agent** - In-app message hub aggregating agent outputs and notifications
- [ ] **Phase 20: Investor Targeting, Outreach & Pipeline** - CSV uploads, AI matching, outreach sequences, CRM-lite tracker
- [ ] **Phase 21: Memory & Compute Tiers** - Tier-differentiated AI models, memory depth, and memory gating
- [ ] **Phase 22: PWA & Mobile Polish** - Offline fallback, install flow, responsive fixes, touch targets
- [ ] **Phase 23: Admin Training Docs** - Admin-only documentation section with voice rules and framework guides

## Phase Details

### Phase 12: Data Fixes & Production Hardening
**Goal**: The app displays consistent, correct data everywhere and the production infrastructure handles real-world traffic securely
**Depends on**: Nothing (no v2.0 dependencies; builds on v1.0 foundation)
**Requirements**: DATA-01, DATA-02, DATA-03, DATA-04, DATA-05, DATA-06, PROD-01, PROD-02, PROD-03, PROD-04, PROD-05, PROD-06, PROD-07
**Success Criteria** (what must be TRUE):
  1. Capital raised, years of experience, and SMS tier placement show one consistent value across every page and prompt
  2. Studio features display correct availability labels matching what is actually built
  3. All dashboard/settings/agents/chat routes are protected by edge middleware requiring authentication
  4. robots.txt, sitemap.ts, and CORS headers are present and correct for production deployment
  5. Rate limiting uses Redis/Upstash (not in-memory) and startup validation script confirms all required env vars
**Plans**: 2 plans

Plans:
- [x] 12-01-PLAN.md -- Data consistency fixes (MARKETING_STATS constant, capital raised, years of experience, SMS tier, Coming Soon labels, about page rewrite)
- [x] 12-02-PLAN.md -- Production infrastructure hardening (root middleware, robots.ts, sitemap.ts, CORS utility, Upstash rate limiting, env validation)

### Phase 13: Voice -- Core AI Engines
**Goal**: The five core AI features (chat, Reality Lens, Investor Readiness, Strategy Docs, Pitch Deck) all speak unmistakably as Fred Cary
**Depends on**: Nothing (parallel with Phase 12)
**Requirements**: VOICE-01, VOICE-02, VOICE-03, VOICE-04, VOICE-05
**Success Criteria** (what must be TRUE):
  1. FRED Chat responses reference Fred's personal experience and use his communication style (direct, mentor-like)
  2. Reality Lens analysis reads as Fred Cary giving his honest take, not a generic assessment tool
  3. Investor Readiness reports use Fred's investor perspective and credentials, not a generic "VC analyst"
  4. Strategy documents and Pitch Deck reviews cite "50+ years" and import personality from fred-brain.ts
**Plans**: TBD

Plans:
- [ ] 13-01: Core AI engine voice unification

### Phase 14: Voice -- Agents & Channels
**Goal**: All three virtual agents (12 tool prompts), SMS check-ins, and the voice agent speak as Fred Cary
**Depends on**: Nothing (parallel with Phases 12, 13)
**Requirements**: VOICE-06, VOICE-07, VOICE-08, VOICE-09, VOICE-10
**Success Criteria** (what must be TRUE):
  1. Founder Ops Agent tool responses (4 tools) sound like Fred mentoring, not a generic business consultant
  2. Fundraising Agent tool responses (4 tools) reflect Fred's fundraising experience and direct style
  3. Growth Agent tool responses (4 tools) use Fred's growth philosophy and real examples
  4. SMS check-in messages are motivational and personal in Fred's voice, not corporate templates
  5. Voice agent identifies as Fred Cary with no reference to "A Startup Biz" persona
**Plans**: TBD

Plans:
- [ ] 14-01: Agent tool prompt voice rewrite
- [ ] 14-02: SMS and voice agent voice rewrite

### Phase 15: Voice -- Helpers & Activation
**Goal**: All fred-brain.ts exports are actively used -- quotes appear in greetings, coaching prompts drive topic conversations, and media/testimonials enrich relevant interactions
**Depends on**: Nothing (parallel with Phases 12-14)
**Requirements**: VOICE-11, VOICE-12, VOICE-13, VOICE-14
**Success Criteria** (what must be TRUE):
  1. FRED_MEDIA and FRED_TESTIMONIALS are imported and used in prompts where Fred's credibility is relevant
  2. Chat greetings and SMS use getRandomQuote, getExperienceStatement, or getCredibilityStatement dynamically
  3. Chat API routes topic-specific conversations through COACHING_PROMPTS and getPromptForTopic
  4. Onboarding flow uses getFredGreeting for personalized welcome
**Plans**: TBD

Plans:
- [ ] 15-01: Activate fred-brain.ts helpers and coaching prompts

### Phase 16: Red Flag Detection
**Goal**: FRED identifies risks during conversations and surfaces them persistently so founders can track and address them
**Depends on**: Phase 13 (FRED chat should have Fred's voice before adding detection layer)
**Requirements**: FREE-01, FREE-02, FREE-03
**Success Criteria** (what must be TRUE):
  1. During a FRED chat conversation, the system detects and flags business risks (market, financial, team, etc.)
  2. Flagged risks appear as inline visual indicators in the chat UI (warning badges or highlighted text)
  3. Dashboard widget shows a persistent list of all current red flags with severity levels
**Plans**: TBD

Plans:
- [ ] 16-01: Red Flag Detection engine and UI

### Phase 17: Founder Wellbeing
**Goal**: FRED proactively supports founder mental health through detection, check-ins, and coaching grounded in Fred's philosophy
**Depends on**: Phase 13 (FRED chat should have Fred's voice before adding wellbeing detection)
**Requirements**: FREE-04, FREE-05, FREE-06
**Success Criteria** (what must be TRUE):
  1. During conversation, FRED detects burnout/stress signals and proactively offers support
  2. Founders can visit a dedicated check-in page to self-assess their mental state
  3. Mindset coaching mode is available using Fred's 6 philosophy principles (grit, resilience, etc.)
**Plans**: TBD

Plans:
- [ ] 17-01: Founder Wellbeing detection, check-in page, and coaching mode

### Phase 18: Intake Snapshot & Strategy Reframing
**Goal**: Founders have a rich, evolving profile generated from onboarding and conversations, plus a dedicated strategy reframing tool
**Depends on**: Nothing (parallel with Phases 16, 17)
**Requirements**: FREE-07, FREE-08, FREE-09, FREE-10
**Success Criteria** (what must be TRUE):
  1. Enriched onboarding questionnaire captures industry, revenue, team size, and funding history
  2. FRED auto-generates and enriches the founder profile from ongoing conversations over time
  3. Dashboard displays a viewable snapshot document showing the current founder profile
  4. Strategy & Execution Reframing has a dedicated UI applying Fred's 9-step framework (not just general chat)
**Plans**: TBD

Plans:
- [ ] 18-01: Founder Intake Snapshot
- [ ] 18-02: Strategy & Execution Reframing UI

### Phase 19: Inbox Ops Agent
**Goal**: Studio founders have a centralized message hub that aggregates and prioritizes output from all agents
**Depends on**: Nothing (can build independently; aggregates from existing agents)
**Requirements**: STUDIO-01, STUDIO-02, STUDIO-03, STUDIO-04
**Success Criteria** (what must be TRUE):
  1. In-app message hub page exists aggregating notifications from all agents
  2. Agent task completions, recommendations, and action items are displayed as messages
  3. Messages are categorized and priority-surfaced (urgent items first)
  4. Inbox Agent responses use Fred Cary's voice consistently with other agents
**Plans**: TBD

Plans:
- [ ] 19-01: Inbox Ops Agent hub and message aggregation

### Phase 20: Investor Targeting, Outreach & Pipeline
**Goal**: Studio founders can upload investor lists, get AI-matched recommendations, generate personalized outreach, and track their fundraising pipeline
**Depends on**: Nothing (parallel with Phase 19)
**Requirements**: STUDIO-05, STUDIO-06, STUDIO-07, STUDIO-08, STUDIO-09, STUDIO-10
**Success Criteria** (what must be TRUE):
  1. Admin can upload partner investor lists via CSV; founders can upload their own contact lists
  2. AI matches founders to relevant investors based on stage, sector, and check size
  3. AI generates personalized outreach email sequences with follow-up templates and timing recommendations
  4. CRM-lite pipeline view tracks investor conversations through stages (contacted, meeting, passed, committed)
**Plans**: TBD

Plans:
- [ ] 20-01: Investor list upload and AI targeting
- [ ] 20-02: Outreach sequencing and pipeline tracking

### Phase 21: Memory & Compute Tiers
**Goal**: Higher-paying tiers get measurably better AI (faster models, deeper context) and memory features are properly gated
**Depends on**: Nothing (parallel with Phases 19, 20)
**Requirements**: STUDIO-11, STUDIO-12, STUDIO-13
**Success Criteria** (what must be TRUE):
  1. Studio tier users get higher-quality AI models or queue priority compared to lower tiers
  2. Studio tier loads more episodic context and has longer memory retention than Pro
  3. Memory features (persistent context, conversation history beyond session) are restricted to Pro+ tiers
**Plans**: TBD

Plans:
- [ ] 21-01: Priority compute and tiered memory

### Phase 22: PWA & Mobile Polish
**Goal**: Sahara is installable as a PWA with a guided experience, and every page renders correctly on mobile devices
**Depends on**: Nothing (parallel with feature phases)
**Requirements**: PWA-01, PWA-02, PWA-03, PWA-04, PWA-05, PWA-06, PWA-07, PWA-08
**Success Criteria** (what must be TRUE):
  1. Offline fallback page with Sahara branding appears when the user has no connection
  2. Custom install prompt detects installability and guides users through "Add to Home Screen" on first visit
  3. PWA install instructions page provides step-by-step guides for both iOS Safari and Android Chrome
  4. Pricing table, all 17 fixed-width files, and all interactive elements render correctly on 375px viewport with 44px touch targets
**Plans**: 2 plans

Plans:
- [ ] 22-01-PLAN.md -- PWA install experience (offline fallback page, install prompt hook/component, install instructions page, SW update)
- [ ] 22-02-PLAN.md -- Mobile responsive fixes (pricing table card layout, fixed-width audit across 5 HIGH files, TabsList scroll on 8 files, touch target CSS)

### Phase 23: Admin Training Docs
**Goal**: Admin users have an in-app reference documenting how FRED communicates, what frameworks it uses, and how each agent behaves
**Depends on**: Phases 13, 14, 15 (voice work must be finalized before documenting voice rules)
**Requirements**: ADMIN-01, ADMIN-02, ADMIN-03, ADMIN-04, ADMIN-05
**Success Criteria** (what must be TRUE):
  1. Admin-only route (/dashboard/admin/training) exists with role-based access control
  2. Fred's Communication Style guide is readable and matches the actual implemented voice rules
  3. Framework Reference page covers 9-Step Startup Process, Positioning, Investor Lens, and Reality Lens
  4. Agent Behavior guide documents how each agent responds with examples
  5. FRED Identity & Background page shows bio, companies, philosophy, and media presence
**Plans**: TBD

Plans:
- [ ] 23-01: Admin training docs route and content pages

## Progress

**Execution Order:**
- Wave 1 (parallel): Phases 12, 13, 14, 15, 22
- Wave 2 (parallel, after wave 1): Phases 16, 17, 18, 19, 20, 21
- Wave 3 (after voice phases): Phase 23

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 12. Data Fixes & Production Hardening | v2.0 | 2/2 | Complete | 2026-02-07 |
| 13. Voice -- Core AI Engines | v2.0 | 0/1 | Not started | - |
| 14. Voice -- Agents & Channels | v2.0 | 0/2 | Not started | - |
| 15. Voice -- Helpers & Activation | v2.0 | 0/1 | Not started | - |
| 16. Red Flag Detection | v2.0 | 0/1 | Not started | - |
| 17. Founder Wellbeing | v2.0 | 0/1 | Not started | - |
| 18. Intake Snapshot & Strategy Reframing | v2.0 | 0/2 | Not started | - |
| 19. Inbox Ops Agent | v2.0 | 0/1 | Not started | - |
| 20. Investor Targeting, Outreach & Pipeline | v2.0 | 0/2 | Not started | - |
| 21. Memory & Compute Tiers | v2.0 | 0/1 | Not started | - |
| 22. PWA & Mobile Polish | v2.0 | 0/2 | Planned | - |
| 23. Admin Training Docs | v2.0 | 0/1 | Not started | - |
