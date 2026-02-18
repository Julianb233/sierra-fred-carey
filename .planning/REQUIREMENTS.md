# Requirements: Sahara

**Defined:** 2026-02-07 (v2.0), updated 2026-02-11 (v4.0)
**Core Value:** Founders can make better decisions faster using FRED's structured cognitive frameworks.

## v4.0 Requirements

### System Prompt Overhaul (PROMPT)

- [ ] **PROMPT-01**: System prompt rebuilt from Fred Cary's master GPT instructions -- reframe-before-prescribe, critical-thinking default, mentor tone, decision architecture
- [ ] **PROMPT-02**: Mentor tone enforced -- encourage effort and discipline, not ego; no default praise or flattery ("great idea!", "brilliant!", "love it!")
- [ ] **PROMPT-03**: Founder Intake Protocol embedded -- automatically establish founder snapshot (stage, product status, revenue, runway, constraint, 90-day goal) when data is missing
- [ ] **PROMPT-04**: Output standard -- every substantive response ends with Next 3 Actions (specific, actionable, time-bound)
- [ ] **PROMPT-05**: Weekly Check-In Protocol -- structured framework (what moved, what's stuck, energy drains, next decision, priority)

### Onboarding-to-FRED Handoff (ONBOARD)

- [ ] **ONBOARD-01**: Onboarding captures full founder basics (stage, industry, challenge, revenue range, team size, funding history)
- [ ] **ONBOARD-02**: FRED's first conversation picks up seamlessly -- references what onboarding collected, goes deeper, never re-asks
- [ ] **ONBOARD-03**: No repetition -- FRED does not re-ask what the signup form already captured; detects missing data and fills gaps conversationally
- [ ] **ONBOARD-04**: Founder Snapshot populated and visible on dashboard from combined onboarding + FRED intake data

### Structured Mentor Flow (CHAT)

- [ ] **CHAT-01**: FRED leads conversations -- asks specific questions, guides to next step, controls the flow (not freeform)
- [ ] **CHAT-02**: Reframe-before-prescribe behavior -- FRED identifies the real underlying goal before answering the literal question
- [ ] **CHAT-03**: Critical-thinking default -- every substantive response surfaces assumptions, bottlenecks, tests, or decision criteria
- [ ] **CHAT-04**: Gentle redirect when founders drift off track -- acknowledge what they said, then steer back to structured path
- [ ] **CHAT-05**: Conversation state tracking -- FRED knows where the founder is in the process and what's been established vs what still needs validation

### Reality Lens Gate (GATE)

- [ ] **GATE-01**: Reality Lens (Feasibility, Economics, Demand, Distribution, Timing) runs as mandatory gate before tactical advice
- [ ] **GATE-02**: If foundation is weak, FRED says so plainly and redirects -- no sugarcoating, no letting founders skip ahead
- [ ] **GATE-03**: Decision sequencing enforced -- no decks, patents, hiring, fundraising, scaling until upstream truth established
- [ ] **GATE-04**: Pitch Deck Review gated -- 11-dimension scorecard (0-10 per dimension) only after Reality Lens passes
- [ ] **GATE-05**: Per-slide investor objections -- 2-3 skeptical questions per slide with knockout answers, generated as part of gated review

### Framework & Mode Integration (MODE)

- [ ] **MODE-01**: Diagnostic engine (lib/ai/diagnostic-engine.ts) wired into chat route -- silently detects context, introduces frameworks at right moment
- [ ] **MODE-02**: Investor Mode activates when fundraising signals detected -- applies Investor Lens (IC Verdict, pass reasons, de-risking actions), not user-chosen
- [ ] **MODE-03**: Positioning Mode activates when messaging/differentiation signals detected -- applies Positioning Framework (grade A-F, narrative tightness 1-10, gaps)
- [ ] **MODE-04**: 9-Step Startup Process (Idea to Traction) used as default decision sequencing backbone for early-stage founders
- [ ] **MODE-05**: Investor Readiness Score framework fully implemented -- AI scoring across 6 categories with stage benchmarks (currently DB schema only, no implementation)
- [ ] **MODE-06**: Deck Request Protocol formalized as standalone flow -- provisional verdict first, then decide if deck review would change verdict (currently embedded in Investor Lens)

### Dashboard Mentor Hub (HUB)

- [ ] **HUB-01**: Dashboard has prominent, always-visible "Contact Fred" section — start chat or call in one click
- [ ] **HUB-02**: Funding readiness progress wheel on dashboard — visual Red → Yellow → Green indicator powered by Investor Readiness Score
- [ ] **HUB-03**: Progress wheel updates dynamically as founder completes upstream validation steps (feasibility, demand, economics)
- [ ] **HUB-04**: Dashboard feels like "this is where you build your company" — FRED's presence is central, not buried in nav

### Founder Communities (COMM)

- [ ] **COMM-01**: Founders can create communities around topics, industries, or stages (self-started, not admin-curated)
- [ ] **COMM-02**: Founders can browse and join communities from the dashboard
- [ ] **COMM-03**: Community feeds show posts, questions, and updates from members
- [ ] **COMM-04**: Communities are self-moderated by users with basic moderation tools

### Multi-Channel FRED Access (CHANNEL)

- [ ] **CHANNEL-01**: In-app chat accessible from any page (floating widget or persistent sidebar)
- [ ] **CHANNEL-02**: Voice call to FRED from dashboard (leverages existing LiveKit infrastructure)
- [ ] **CHANNEL-03**: SMS text to FRED with structured mentor responses (leverages existing Twilio infrastructure)
- [ ] **CHANNEL-04**: All channels share conversation context — FRED knows what was discussed regardless of channel

## v6.0 Requirements

### Infrastructure & Ops (INFRA)

- [ ] **INFRA-01**: Sentry error tracking — DSN configuration, source maps uploading, alerting rules, performance monitoring
- [ ] **INFRA-02**: CI/CD expansion — Playwright E2E in CI, visual regression testing, axe-core accessibility, staging environment
- [ ] **INFRA-03**: Twilio SMS activation — A2P 10DLC registration, real SMS delivery, opt-in/opt-out compliance, delivery tracking
- [ ] **INFRA-04**: Voice agent hardening — Remote audio playback fix, Docker container fix, room name tracking, reconnection, recording/transcription

### FRED & UX Improvements (IMPROVE)

- [ ] **IMPROVE-01**: FRED intelligence upgrade — Better memory retrieval, long conversation handling, smoother mode switching, new AI tools (content + provider)
- [ ] **IMPROVE-02**: Mobile / UX polish — Serwist PWA caching, smooth animations, WCAG 2.1 AA compliance, push notification reliability
- [ ] **IMPROVE-03**: Dashboard & analytics — Historical trend charts, engagement scoring, data export (CSV/PDF), PostHog funnel visualization

### New Features (FEATURE)

- [ ] **FEATURE-01**: Content library & courses — Mux video hosting, course catalog with stage/topic filtering, progress tracking, FRED recommendations, tier gating
- [ ] **FEATURE-02**: Service marketplace — Provider directory with Stripe Connect payments, booking flow, reviews, FRED-triggered recommendations
- [ ] **FEATURE-03**: Real Boardy API integration — RealBoardyClient implementation, circuit breaker, cached fallback, readiness-gated matching

## v2.0 Requirements (SHIPPED)

<details>
<summary>v2.0 Requirements -- all shipped 2026-02-07</summary>

### Fred Voice Unification (VOICE)

- [x] **VOICE-01**: All AI interaction points import and use FRED_CAREY_SYSTEM_PROMPT or compose from fred-brain.ts exports
- [x] **VOICE-02**: Reality Lens engine uses Fred Cary persona (not generic "FRED" acronym)
- [x] **VOICE-03**: Investor Readiness Score engine uses Fred Cary persona (not generic "VC analyst")
- [x] **VOICE-04**: Strategy document generator imports fred-brain.ts (fix "40+ years" to "50+ years")
- [x] **VOICE-05**: Pitch deck analyzer imports fred-brain.ts (fix "30+ years" to "50+ years")
- [x] **VOICE-06**: All 4 Founder Ops Agent tool prompts use Fred's voice
- [x] **VOICE-07**: All 4 Fundraising Agent tool prompts use Fred's voice
- [x] **VOICE-08**: All 4 Growth Agent tool prompts use Fred's voice
- [x] **VOICE-09**: SMS check-in templates rewritten in Fred's voice (motivational, direct, personal)
- [x] **VOICE-10**: Voice agent cleaned up (remove "A Startup Biz", use Fred Cary persona)
- [x] **VOICE-11**: FRED_MEDIA and FRED_TESTIMONIALS exports activated and used in relevant prompts
- [x] **VOICE-12**: Helper functions (getRandomQuote, getExperienceStatement, getCredibilityStatement) wired into chat greetings and SMS
- [x] **VOICE-13**: COACHING_PROMPTS and getPromptForTopic used by chat API for topic-specific conversations
- [x] **VOICE-14**: getFredGreeting used in onboarding flow

### Missing Features -- Free Tier (FREE)

- [x] **FREE-01**: Red Flag Detection engine identifies risks during FRED chat conversations
- [x] **FREE-02**: Red Flag Detection renders inline visual indicators in chat UI (warning badges, highlighted text)
- [x] **FREE-03**: Red Flag Detection dashboard widget shows persistent list of current red flags with severity
- [x] **FREE-04**: Founder Wellbeing: FRED detects burnout/stress signals in conversation and proactively offers support
- [x] **FREE-05**: Founder Wellbeing: dedicated check-in page where founders assess their mental state
- [x] **FREE-06**: Founder Wellbeing: mindset coaching mode using Fred's 6 philosophy principles
- [x] **FREE-07**: Founder Intake Snapshot: enriched onboarding questionnaire captures industry, revenue, team size, funding history
- [x] **FREE-08**: Founder Intake Snapshot: FRED auto-generates and enriches founder profile from conversations over time
- [x] **FREE-09**: Founder Intake Snapshot: viewable snapshot document on dashboard showing current founder profile
- [x] **FREE-10**: Strategy & Execution Reframing: dedicated UI feature (not just general chat) that applies Fred's 9-step framework

### Missing Features -- Studio Tier (STUDIO)

- [x] **STUDIO-01**: Inbox Ops Agent: in-app message hub page aggregating notifications from all agents
- [x] **STUDIO-02**: Inbox Ops Agent: displays agent task completions, recommendations, and action items
- [x] **STUDIO-03**: Inbox Ops Agent: priority surfacing and categorization of messages
- [x] **STUDIO-04**: Inbox Ops Agent: agent prompts use Fred Cary's voice (consistent with other agents)
- [x] **STUDIO-05**: Investor Targeting: admin can upload partner investor lists via CSV
- [x] **STUDIO-06**: Investor Targeting: founders can upload their own investor contact lists
- [x] **STUDIO-07**: Investor Targeting: AI matches founders to relevant investors based on stage, sector, check size
- [x] **STUDIO-08**: Outreach Sequencing: AI generates personalized outreach email sequences per investor
- [x] **STUDIO-09**: Outreach Sequencing: follow-up templates and timing recommendations
- [x] **STUDIO-10**: Pipeline Tracking: CRM-lite view of investor conversations (contacted, meeting, passed, committed)
- [x] **STUDIO-11**: Priority Compute: Studio tier uses higher-quality AI models or gets queue priority
- [x] **STUDIO-12**: Deeper Memory: Studio tier loads more episodic context and has longer memory retention
- [x] **STUDIO-13**: Persistent Memory tier gating: memory features restricted to Pro+ (not available to Free)

### Production Readiness (PROD)

- [x] **PROD-01**: Root middleware.ts for edge-level auth protection on dashboard, settings, agents, chat routes
- [x] **PROD-02**: robots.txt created in /public/ with correct directives
- [x] **PROD-03**: Dynamic sitemap generation via app/sitemap.ts covering all public pages
- [x] **PROD-04**: Image optimization audit -- convert img tags to next/image across codebase
- [x] **PROD-05**: Redis/Upstash rate limiting replacing in-memory store for multi-instance scaling
- [x] **PROD-06**: CORS configuration applied to all API routes
- [x] **PROD-07**: Startup validation script checking all required env vars are present

### PWA & Mobile (PWA)

- [x] **PWA-01**: Dedicated offline fallback page with Sahara branding and retry functionality
- [x] **PWA-02**: Custom "Add to Home Screen" install prompt component (detects installability, shows on first visit)
- [x] **PWA-03**: PWA install instructions page with step-by-step guides for iOS Safari and Android Chrome
- [x] **PWA-04**: Smooth install experience -- guided flow from prompt to installed app
- [x] **PWA-05**: Pricing comparison table mobile layout fix (card-based alternative below 768px)
- [x] **PWA-06**: Fixed-width component audit and fix across 17 identified files
- [x] **PWA-07**: Touch target audit -- all interactive elements meet 44px minimum
- [x] **PWA-08**: All dashboard pages verified on 375px viewport (iPhone 12/13/14)

### Admin Training Docs (ADMIN)

- [x] **ADMIN-01**: Admin-only route (/dashboard/admin/training) with role-based access control
- [x] **ADMIN-02**: Fred's Communication Style guide page (voice, tone, do/don't rules from fred-brain.ts)
- [x] **ADMIN-03**: Framework Reference page (9-Step Startup Process, Positioning, Investor Lens, Reality Lens)
- [x] **ADMIN-04**: Agent Behavior guide (how each agent should respond, with examples)
- [x] **ADMIN-05**: FRED Identity & Background page (bio, companies, philosophy, media presence)

### Data Consistency (DATA)

- [x] **DATA-01**: Capital raised standardized to one correct number across all pages (homepage, about, footer)
- [x] **DATA-02**: Years of experience fixed to "50+" in all AI prompts and marketing copy
- [x] **DATA-03**: SMS Check-ins tier placement resolved -- single consistent tier across pricing, constants, and nav
- [x] **DATA-04**: Studio features "Coming Soon" labels synchronized with actual feature availability
- [x] **DATA-05**: Interactive page stats reconciled with homepage stats (or clearly differentiated)
- [x] **DATA-06**: About page timeline corrected to match Fred's actual history from fred-brain.ts

</details>

## Out of Scope

| Feature | Reason |
|---------|--------|
| Native mobile app | PWA-first strategy working; defer to v5.0+ |
| Custom AI model training | Use existing providers with prompt engineering |
| White-label/multi-tenant | Single brand (Sahara) only |
| Real Boardy API integration | Keep mock until Boardy API is available |
| Founder community / peer matching | Defer to v5.0+ |
| Content library / courses | Defer to v5.0+ |
| Service marketplace | Defer to v5.0+ |

## Traceability

### v4.0 FRED Mentor Experience

| Requirement | Phase | Status |
|-------------|-------|--------|
| PROMPT-01 | Phase 34 | Pending |
| PROMPT-02 | Phase 34 | Pending |
| PROMPT-03 | Phase 34 | Pending |
| PROMPT-04 | Phase 34 | Pending |
| PROMPT-05 | Phase 34 | Pending |
| ONBOARD-01 | Phase 35 | Pending |
| ONBOARD-02 | Phase 35 | Pending |
| ONBOARD-03 | Phase 35 | Pending |
| ONBOARD-04 | Phase 35 | Pending |
| CHAT-01 | Phase 36 | Pending |
| CHAT-02 | Phase 36 | Pending |
| CHAT-03 | Phase 36 | Pending |
| CHAT-04 | Phase 36 | Pending |
| CHAT-05 | Phase 36 | Pending |
| GATE-01 | Phase 37 | Pending |
| GATE-02 | Phase 37 | Pending |
| GATE-03 | Phase 37 | Pending |
| GATE-04 | Phase 39 | Pending |
| GATE-05 | Phase 39 | Pending |
| MODE-01 | Phase 38 | Pending |
| MODE-02 | Phase 38 | Pending |
| MODE-03 | Phase 38 | Pending |
| MODE-04 | Phase 38 | Pending |
| MODE-05 | Phase 39 | Pending |
| MODE-06 | Phase 39 | Pending |

| HUB-01 | Phase 40 | Pending |
| HUB-02 | Phase 40 | Pending |
| HUB-03 | Phase 40 | Pending |
| HUB-04 | Phase 40 | Pending |
| COMM-01 | Phase 41 | Pending |
| COMM-02 | Phase 41 | Pending |
| COMM-03 | Phase 41 | Pending |
| COMM-04 | Phase 41 | Pending |
| CHANNEL-01 | Phase 42 | Pending |
| CHANNEL-02 | Phase 42 | Pending |
| CHANNEL-03 | Phase 42 | Pending |
| CHANNEL-04 | Phase 42 | Pending |

**Coverage:**
- v4.0 requirements: 37 total
- Mapped to phases: 37
- Unmapped: 0

### v6.0 Full Platform Maturity

| Requirement | Phase | Status |
|-------------|-------|--------|
| INFRA-01 | Phase 59 | Pending |
| INFRA-02 | Phase 60 | Pending |
| INFRA-03 | Phase 61 | Pending |
| INFRA-04 | Phase 62 | Pending |
| IMPROVE-01 | Phase 63 | Pending |
| IMPROVE-02 | Phase 65 | Pending |
| IMPROVE-03 | Phase 64 | Pending |
| FEATURE-01 | Phases 66-67 | Pending |
| FEATURE-02 | Phases 68-69 | Pending |
| FEATURE-03 | Phase 70 | Pending |

**Coverage:**
- v6.0 requirements: 10 total
- Mapped to phases: 10
- Unmapped: 0

---
*Requirements defined: 2026-02-07 (v2.0)*
*Updated: 2026-02-11 -- v4.0 requirements added (37 total), phases 34-42 mapped*
*Updated: 2026-02-18 -- v6.0 requirements added (10 total), phases 59-70 mapped*
