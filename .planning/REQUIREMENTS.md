# Requirements: Sahara v2.0

**Defined:** 2026-02-07
**Core Value:** Every feature promised on the website has real logic, all AI speaks in Fred's voice, and the app is production-ready and installable on mobile.

## v2.0 Requirements

### Fred Voice Unification (VOICE)

- [ ] **VOICE-01**: All AI interaction points import and use FRED_CAREY_SYSTEM_PROMPT or compose from fred-brain.ts exports
- [ ] **VOICE-02**: Reality Lens engine uses Fred Cary persona (not generic "FRED" acronym)
- [ ] **VOICE-03**: Investor Readiness Score engine uses Fred Cary persona (not generic "VC analyst")
- [ ] **VOICE-04**: Strategy document generator imports fred-brain.ts (fix "40+ years" to "50+ years")
- [ ] **VOICE-05**: Pitch deck analyzer imports fred-brain.ts (fix "30+ years" to "50+ years")
- [ ] **VOICE-06**: All 4 Founder Ops Agent tool prompts use Fred's voice
- [ ] **VOICE-07**: All 4 Fundraising Agent tool prompts use Fred's voice
- [ ] **VOICE-08**: All 4 Growth Agent tool prompts use Fred's voice
- [ ] **VOICE-09**: SMS check-in templates rewritten in Fred's voice (motivational, direct, personal)
- [ ] **VOICE-10**: Voice agent cleaned up (remove "A Startup Biz", use Fred Cary persona)
- [ ] **VOICE-11**: FRED_MEDIA and FRED_TESTIMONIALS exports activated and used in relevant prompts
- [ ] **VOICE-12**: Helper functions (getRandomQuote, getExperienceStatement, getCredibilityStatement) wired into chat greetings and SMS
- [ ] **VOICE-13**: COACHING_PROMPTS and getPromptForTopic used by chat API for topic-specific conversations
- [ ] **VOICE-14**: getFredGreeting used in onboarding flow

### Missing Features — Free Tier (FREE)

- [ ] **FREE-01**: Red Flag Detection engine identifies risks during FRED chat conversations
- [ ] **FREE-02**: Red Flag Detection renders inline visual indicators in chat UI (warning badges, highlighted text)
- [ ] **FREE-03**: Red Flag Detection dashboard widget shows persistent list of current red flags with severity
- [ ] **FREE-04**: Founder Wellbeing: FRED detects burnout/stress signals in conversation and proactively offers support
- [ ] **FREE-05**: Founder Wellbeing: dedicated check-in page where founders assess their mental state
- [ ] **FREE-06**: Founder Wellbeing: mindset coaching mode using Fred's 6 philosophy principles
- [ ] **FREE-07**: Founder Intake Snapshot: enriched onboarding questionnaire captures industry, revenue, team size, funding history
- [ ] **FREE-08**: Founder Intake Snapshot: FRED auto-generates and enriches founder profile from conversations over time
- [ ] **FREE-09**: Founder Intake Snapshot: viewable snapshot document on dashboard showing current founder profile
- [ ] **FREE-10**: Strategy & Execution Reframing: dedicated UI feature (not just general chat) that applies Fred's 9-step framework

### Missing Features — Studio Tier (STUDIO)

- [ ] **STUDIO-01**: Inbox Ops Agent: in-app message hub page aggregating notifications from all agents
- [ ] **STUDIO-02**: Inbox Ops Agent: displays agent task completions, recommendations, and action items
- [ ] **STUDIO-03**: Inbox Ops Agent: priority surfacing and categorization of messages
- [ ] **STUDIO-04**: Inbox Ops Agent: agent prompts use Fred Cary's voice (consistent with other agents)
- [ ] **STUDIO-05**: Investor Targeting: admin can upload partner investor lists via CSV
- [ ] **STUDIO-06**: Investor Targeting: founders can upload their own investor contact lists
- [ ] **STUDIO-07**: Investor Targeting: AI matches founders to relevant investors based on stage, sector, check size
- [ ] **STUDIO-08**: Outreach Sequencing: AI generates personalized outreach email sequences per investor
- [ ] **STUDIO-09**: Outreach Sequencing: follow-up templates and timing recommendations
- [ ] **STUDIO-10**: Pipeline Tracking: CRM-lite view of investor conversations (contacted, meeting, passed, committed)
- [ ] **STUDIO-11**: Priority Compute: Studio tier uses higher-quality AI models or gets queue priority
- [ ] **STUDIO-12**: Deeper Memory: Studio tier loads more episodic context and has longer memory retention
- [ ] **STUDIO-13**: Persistent Memory tier gating: memory features restricted to Pro+ (not available to Free)

### Production Readiness (PROD)

- [ ] **PROD-01**: Root middleware.ts for edge-level auth protection on dashboard, settings, agents, chat routes
- [ ] **PROD-02**: robots.txt created in /public/ with correct directives
- [ ] **PROD-03**: Dynamic sitemap generation via app/sitemap.ts covering all public pages
- [ ] **PROD-04**: Image optimization audit — convert img tags to next/image across codebase
- [ ] **PROD-05**: Redis/Upstash rate limiting replacing in-memory store for multi-instance scaling
- [ ] **PROD-06**: CORS configuration applied to all API routes
- [ ] **PROD-07**: Startup validation script checking all required env vars are present

### PWA & Mobile (PWA)

- [ ] **PWA-01**: Dedicated offline fallback page with Sahara branding and retry functionality
- [ ] **PWA-02**: Custom "Add to Home Screen" install prompt component (detects installability, shows on first visit)
- [ ] **PWA-03**: PWA install instructions page with step-by-step guides for iOS Safari and Android Chrome
- [ ] **PWA-04**: Smooth install experience — guided flow from prompt to installed app
- [ ] **PWA-05**: Pricing comparison table mobile layout fix (card-based alternative below 768px)
- [ ] **PWA-06**: Fixed-width component audit and fix across 17 identified files
- [ ] **PWA-07**: Touch target audit — all interactive elements meet 44px minimum
- [ ] **PWA-08**: All dashboard pages verified on 375px viewport (iPhone 12/13/14)

### Admin Training Docs (ADMIN)

- [ ] **ADMIN-01**: Admin-only route (/dashboard/admin/training) with role-based access control
- [ ] **ADMIN-02**: Fred's Communication Style guide page (voice, tone, do/don't rules from fred-brain.ts)
- [ ] **ADMIN-03**: Framework Reference page (9-Step Startup Process, Positioning, Investor Lens, Reality Lens)
- [ ] **ADMIN-04**: Agent Behavior guide (how each agent should respond, with examples)
- [ ] **ADMIN-05**: FRED Identity & Background page (bio, companies, philosophy, media presence)

### Data Consistency (DATA)

- [ ] **DATA-01**: Capital raised standardized to one correct number across all pages (homepage, about, footer)
- [ ] **DATA-02**: Years of experience fixed to "50+" in all AI prompts and marketing copy
- [ ] **DATA-03**: SMS Check-ins tier placement resolved — single consistent tier across pricing, constants, and nav
- [ ] **DATA-04**: Studio features "Coming Soon" labels synchronized with actual feature availability
- [ ] **DATA-05**: Interactive page stats reconciled with homepage stats (or clearly differentiated)
- [ ] **DATA-06**: About page timeline corrected to match Fred's actual history from fred-brain.ts

## Future Requirements (v2.1+)

### Notifications
- **NOTIF-01**: Web Push notifications for agent task completions
- **NOTIF-02**: Push notification permission request during onboarding
- **NOTIF-03**: Notification preferences in settings

### Integrations
- **INTEG-01**: Real Boardy API integration (replace mock client when API available)
- **INTEG-02**: Calendar integration for meeting scheduling (Founder Ops Agent)
- **INTEG-03**: Email integration for Inbox Agent (Gmail/Outlook OAuth)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Native mobile app | PWA-first strategy for v2.0; native deferred to v3.0 |
| Real-time video coaching | LiveKit infra exists but not in v2 scope |
| Custom AI model training | Use existing providers with improved prompts |
| White-label/multi-tenant | Single brand (Sahara) only |
| Real Boardy API | Keep mock until external API confirmed available |
| Web Push notifications | Defer to v2.1 after PWA foundation is solid |
| Email OAuth for Inbox Agent | In-app message hub first; real email integration in v2.1 |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| VOICE-01 through VOICE-14 | TBD | Pending |
| FREE-01 through FREE-10 | TBD | Pending |
| STUDIO-01 through STUDIO-13 | TBD | Pending |
| PROD-01 through PROD-07 | TBD | Pending |
| PWA-01 through PWA-08 | TBD | Pending |
| ADMIN-01 through ADMIN-05 | TBD | Pending |
| DATA-01 through DATA-06 | TBD | Pending |

**Coverage:**
- v2.0 requirements: 63 total
- Mapped to phases: 0 (pending roadmap)
- Unmapped: 63

---
*Requirements defined: 2026-02-07*
*Last updated: 2026-02-07 after gap analysis audit*
