# Sahara — Product Requirements Document

**Version:** 1.0
**Date:** 2026-03-11
**Owners:** Julian Bradley, Ira Hayes
**Stakeholders:** Fred Cary (CEO/Product Owner), Alex LaTorre (Developer), Gregory (Engineering/Partnerships)
**Source:** Sahara Founders meetings (Feb 25, Mar 4, Mar 7, 2026) and WhatsApp group discussions

---

## Table of Contents

1. [Product Vision](#1-product-vision)
2. [Core Feature Priorities (Ranked)](#2-core-feature-priorities-ranked)
3. [Funnel vs Full Platform Roadmap](#3-funnel-vs-full-platform-roadmap)
4. [Voice/Chat Interaction Spec](#4-voicechat-interaction-spec)
5. [User Onboarding Flow](#5-user-onboarding-flow)
6. [Payment/Upgrade Flow](#6-paymentupgrade-flow)
7. [Definition of Done — Per Feature](#7-definition-of-done--per-feature)

---

## 1. Product Vision

**One-liner:** Sahara is an AI-powered founder operating system that provides co-founder-level intelligence to pre-seed and seed stage founders through a structured, guided venture journey.

**Core philosophy (Fred Cary, March 7, 2026):**
> "This is a guided venture journey, NOT a chatbot. Users must feel they've entered a structured journey, not opened a chat box."

**Target audience:** Pre-seed and seed stage founders. Not currently serving Series A+ (confirmed Fred, March 1, 2026).

**Key differentiator:** FRED cognitive engine — mirrors Fred Cary's decision-making style from 50+ years of entrepreneurial experience, 10,000+ founders coached, 40+ companies founded, 3 IPOs, 2 acquisitions. Unlike ChatGPT or generic AI tools, FRED enforces decision sequencing, pattern recognition, and reality checks before allowing founders to proceed.

**Branding:** Sahara desert theme. Milestones are called "Oases." Progress stages: Clarity → Validation → Build → Launch → Grow. Brand color: #ff6a1a (Sahara Orange).

---

## 2. Core Feature Priorities (Ranked)

Features are ranked by launch criticality and founder impact. Priority levels: P0 (must-have for launch), P1 (needed within 30 days of launch), P2 (quarter roadmap).

### P0 — Launch Critical

| # | Feature | Justification | Status |
|---|---------|---------------|--------|
| 1 | **Onboarding Redesign** | Fred's #1 concern: "Missing crucial handholding aspect." First impression determines retention. Must educate founders on journey philosophy before they interact with Mentor. | Active — Not shipped |
| 2 | **Chat with FRED (Mentor)** | "Killer feature, must be upfront" (Fred, Mar 7). Primary value delivery mechanism. | Shipped — Needs polish |
| 3 | **Oases Journey Visualization** | Core product identity. Without visible progress, founders treat it as a chatbot. Five-stage roadmap with stage gating enforces the "journey not chatbot" philosophy. | Active — Not shipped |
| 4 | **Reality Lens Assessment** | Mandatory first interaction. Surfaces gaps to motivate engagement. Fred: "Spook them in onboarding — show gaps." | Shipped — Needs gating integration |
| 5 | **FRED Brain Enhancements (7 rules)** | Fred's explicit directive (Mar 7): answer completeness, question discipline, compression, pattern recognition, reality check triggers, decision frameworks, traction coaching. | Partially integrated |
| 6 | **UI Relabeling** | "Fred AI" → "Mentor", "Journey" → "Progress". Confirmed requirement from Mar 4 meeting. | Active — Not shipped |
| 7 | **Mobile Responsiveness** | Palo Alto event attendees will be on phones. PWA must work flawlessly on mobile. | Shipped — Needs QA |

### P1 — Within 30 Days of Launch

| # | Feature | Justification | Status |
|---|---------|---------------|--------|
| 8 | **Voice Calls with FRED** | "Chat or call with Fred — killer feature." Continuity between text and voice. ElevenLabs "Fred Sahara" voice. | Shipped — Needs voice ID fix |
| 9 | **Pitch Deck Upload & Review** | Key paid-tier differentiator. Upload PDF/PPTX, AI scores on problem clarity, market size, investability. | Shipped — Behind paywall |
| 10 | **Founder Memory Layer** | Platform remembers user's idea, progress, mindset. Captures and rephrases inputs. "Per-user memory/mini-brain" (Fred). | Partially shipped |
| 11 | **Stripe Payment Flow** | $99/month Fundraising tier, $249/month Venture Studio. Fred says "NOT ready for payments yet" (Mar 7) — wired but not activated until full version ships. | Wired — Not activated |
| 12 | **Event Launch Kit** | QR code landing, two-week free trial for Palo Alto event (200 founders). | Not started |
| 13 | **Investor Readiness Score** | 6-category AI scoring with stage benchmarks. Paid tier feature. | Shipped |

### P2 — Quarter Roadmap

| # | Feature | Justification | Status |
|---|---------|---------------|--------|
| 14 | **Daily Guidance (SMS)** | Proactive Twilio outbound: "Validate pricing with 5 customers today." Mentor-tells-you style. | Not started |
| 15 | **Boardy VC Introductions** | Direct VC/angel introductions. Gated until 100% journey completion. Pending API credentials. | Stub only |
| 16 | **Virtual Team Agents** | Founder Ops, Fundraising, Growth agents. Venture Studio tier feature. | Shipped — Needs refinement |
| 17 | **Business Intelligence Radar** | Web research blurbs, inline articles, idea-readiness scoring with 24hr refresh. | Not started |
| 18 | **Strategy Documents** | Template-based AI generation, PDF export. | Shipped |
| 19 | **Advanced Analytics** | PostHog funnels, engagement dashboards, admin monitoring. | Partially shipped |
| 20 | **Community Features** | Founder communities, circles, topic rooms. | Shipped — Basic |

---

## 3. Funnel vs Full Platform Roadmap

Sahara has two deployment surfaces that serve different purposes and audiences.

### 3.1 Funnel (u.joinsahara.com)

**Purpose:** Mobile-first conversion funnel for ad traffic and event attendees. Lightweight entry point that converts visitors into platform users.

**Architecture:** Standalone Vite + React 19 app (separate from Next.js platform). Deployed independently on Vercel.

**Pages:**
1. **Landing** — Hero section, social proof, single CTA
2. **Chat** — Embedded lightweight chat interface (first taste of FRED)
3. **Journey** — Visual progress teaser showing what the full platform offers
4. **FAQ** — Common questions accordion

**Key characteristics:**
- Mobile-optimized (100dvh, safe-area-inset, sticky CTAs)
- Performance targets: LCP < 2.0s, INP < 150ms, CLS < 0.05
- Own Stripe integration for direct checkout
- Minimal auth — email capture first, full signup deferred
- Data syncs to main platform via `sync-service.ts`

**Conversion flow:**
```
Ad/QR Code → Landing Page → Try Chat with FRED → See Journey Preview → Sign Up → Redirect to Full Platform
```

**Launch timeline:** Ready for Palo Alto event. Alex's version goes live first.

### 3.2 Full Platform (joinsahara.com)

**Purpose:** Complete founder operating system. The guided venture journey with all features, dashboard, coaching tools, and paid tiers.

**Architecture:** Next.js 16 App Router with 36 dashboard pages, 220+ API endpoints. Deployed on Vercel.

**Key sections:**
1. **Public pages** — Landing, about, blog, features, pricing, demo pages
2. **Onboarding** — Multi-step wizard → Reality Lens → Dashboard welcome
3. **Dashboard** — Founder Command Center (Snapshot, Decision Box, Funding Gauge, Momentum)
4. **Mentor (Chat + Voice)** — Full-screen chat, voice calls, conversation history
5. **Progress (Oases)** — Journey visualization, stage tracking, completion metrics
6. **Investor Tools** — Readiness scoring, pitch deck review, targeting, Boardy matching
7. **Documents** — Strategy docs, pitch decks, reports, uploaded files
8. **Agents** — Virtual team members (Founder Ops, Fundraising, Growth)
9. **Admin** — AB tests, prompt management, voice config, sentiment analysis

**Launch timeline:** Julian's full version follows Alex's funnel launch. Payment activation deferred until full version is confirmed ready.

### 3.3 Roadmap Phases

| Phase | Surface | Timeline | Deliverables |
|-------|---------|----------|--------------|
| **Phase 1: Event Launch** | Funnel | Immediate | QR landing, FRED chat preview, email capture, free trial signup |
| **Phase 2: Platform Go-Live** | Full | 1-2 weeks post-event | Onboarding redesign, Oases visualization, UI relabeling, FRED brain enhancements |
| **Phase 3: Payments On** | Full | When Fred approves | Stripe activation, $99/$249 tiers enforced, pitch deck upload for paid users |
| **Phase 4: Engagement Loop** | Both | +30 days | Daily SMS guidance, founder memory polish, business intelligence radar |
| **Phase 5: Scale** | Both | +60 days | Boardy VC matching, advanced analytics, community features, Gregory partnership integration |

---

## 4. Voice/Chat Interaction Spec

### 4.1 Chat with FRED

**Entry point:** Prominent "Chat with Fred" button on dashboard (main view, not buried).

**Behavior:**
- FRED leads conversations using diagnostic mode — frameworks introduced by context, not user choice
- Reality Lens is a mandatory gate before tactical advice
- FRED follows the "reframe-before-prescribe" pattern: understand → reframe → advise
- All responses end with "Next 3 Actions" — concrete, actionable steps

**AI behavior rules (Fred's 7 brain enhancements):**
1. **Answer Completeness** — Complete answer in one response. No "Would you like to know more?" drip-feeding.
2. **Question Discipline** — Max 3 questions per response. Only ask when answer materially changes recommendation. State assumptions and proceed.
3. **Compression** — High signal, low friction. Clear headers, short paragraphs, bullet points. No motivational padding.
4. **Pattern Recognition** — Silently diagnose: Idea Without Customer, Tech First, Distribution Fantasy, Premature Fundraising, etc. Name the pattern, explain risk, redirect.
5. **Reality Check** — Detect delusion signals. Challenge calmly. Translate claims to testable hypotheses. Recommend smallest experiment.
6. **Decision Frameworks** — 10 structured tests (Problem, Customer, Wedge, Distribution, Build vs Validate, Fundraising, Focus, Founder Edge, Timing, Scalability).
7. **Traction Coaching** — Structured 0→10→100 customer stages. Founder-led outreach → repeatable acquisition → retention/PMF.

**Wellbeing monitoring:** If user expresses insecurity, burnout, or distress — normalize it, reduce to controllable actions, offer practical exits. Be steady and present, not therapeutic.

**Technical implementation:**
- Streaming via Vercel AI SDK (SSE)
- Multi-provider fallback: OpenAI GPT-4 Turbo → Anthropic Claude → Google Gemini
- Prompt injection guard
- Conversation history persisted in Supabase
- XState v5 state machine managing FRED's cognitive states (10 states, 12 mental models)

**Stage gating:** Users in "Clarity" stage cannot access pitch deck review tools. Users in "Validation" cannot build investor targeting outreach. FRED enforces this conversationally and the UI enforces it visually.

### 4.2 Voice Calls with FRED

**Voice identity:** "Fred Sahara" via ElevenLabs (Voice ID: `uxq5gLBpu73uF1Aqzb2t`)

**Architecture:**
- LiveKit for real-time audio/video conferencing
- ElevenLabs text-to-speech for FRED's voice
- Separate Node.js worker process (`workers/voice-agent/`) handles real-time transcription and response generation
- `@livekit/agents` SDK for server-side voice pipeline

**Requirements:**
- Seamless continuity between text chat and voice — context preserved when switching
- Mobile call/text continuity — voice calls work on mobile browsers via PWA
- Conversation from voice call appears in chat history (transcribed)
- Voice cuts must be resolved (known Samsung device issue)

**Supported interactions:**
- Open-ended coaching conversations
- Reality Lens assessments via voice
- Progress check-ins
- Pitch practice and feedback

**Error handling:**
- If voice connection drops, FRED sends a chat message acknowledging the interruption
- If TTS fails, fall back to text-only response
- Voice is not the only channel — always have chat as fallback

### 4.3 SMS (Daily Guidance)

**Purpose:** Proactive, orchestrated daily tasks. FRED tells the founder what to focus on (not "what do you need help with?").

**Examples:**
- "Today: reach out to 3 potential customers and ask about [specific pain point]."
- "This week's focus: validate your pricing assumption. Talk to 5 people."
- "You haven't checked in for 3 days. Your next step is [X]. Reply DONE when complete."

**Technical:**
- Twilio outbound SMS
- Platform return flow: SMS contains short link back to platform for full response (controls per-message costs)
- STOP/START compliance built in
- Cron-triggered based on founder's journey stage and last activity

---

## 5. User Onboarding Flow

### 5.1 Current Flow (Shipping Today)

```
Landing Page → Get Started → 3-Step Wizard → Signup → Dashboard (welcome=true)
```

Steps:
1. Select startup stage (Ideation / Pre-seed / Seed / Series A+)
2. Select biggest challenge (PMF / Fundraising / Team / Growth / Economics / Strategy)
3. Email + password signup

### 5.2 Redesigned Flow (P0 Priority)

Fred's directive: "Missing crucial handholding aspect at the beginning."

```
Landing/QR → Welcome Screen → Five Questions → Reality Lens → Dashboard + Mentor Orientation
```

**Step 1: Welcome Screen (Mandatory)**
- Full-screen educational moment
- Message: "This is a guided venture journey, not a transaction"
- Explains: what Sahara does, how FRED works, what to expect
- Communicates: "You're gaining a co-founder-level intelligence layer"
- Single CTA: "Begin Your Journey"

**Step 2: Five-Question Structured Intake**
- Free-text answers (not checkboxes — confirmed Mar 4 meeting)
- Questions capture: idea, stage, biggest challenge, goals, timeline
- FRED captures, rephrases, and stores answers as founder memory
- This data seeds the Reality Lens assessment

**Step 3: Reality Lens Check**
- First real interaction with FRED
- Assesses founder's idea readiness
- Surfaces gaps — "spook them" to motivate engagement
- Scores: problem clarity, customer evidence, competitive understanding, founder-market fit, timing
- Result determines starting Oasis stage

**Step 4: Dashboard Welcome + Orientation**
- Confetti animation (existing)
- Brief orientation: "Here's how to use Mentor + Progress"
- Shows Oases roadmap with current position highlighted
- Prominent "Chat with Fred" CTA
- Fund matching visibly grayed out with "Complete your journey to unlock" message

### 5.3 Funnel Onboarding (Lightweight)

For u.joinsahara.com (event/ad traffic):
```
QR/Ad → Landing → Try FRED (No Signup) → Impressed → Email Capture → Redirect to Full Platform Signup
```

Key difference: Let users experience FRED before asking for signup. Lower friction for conversion.

---

## 6. Payment/Upgrade Flow

### 6.1 Pricing Tiers

| Tier | Name | Price | Positioning |
|------|------|-------|-------------|
| Free | **Founder Decision OS** | $0/month | "Trust + habit" — generous free tier to prove value |
| Pro | **Fundraising & Strategy** | $99/month | "A serious founder commitment" — unlocks investor tools |
| Studio | **Venture Studio** | $249/month | "Hiring leverage, not buying software" — full agent team |

**Activation status:** NOT activated yet. Fred confirmed (Mar 7): "NOT ready for payments yet." Payments activate when Julian's full version is confirmed ready and Fred gives the go-ahead.

### 6.2 Feature Entitlements

| Feature | Free | Pro ($99) | Studio ($249) |
|---------|------|-----------|---------------|
| FRED Mentor (chat) | Yes | Yes | Yes |
| Reality Lens assessment | Yes | Yes | Yes |
| Red Flag Detection | Yes | Yes | Yes |
| Founder Wellbeing | Yes | Yes | Yes |
| Intake Snapshot | Yes | Yes | Yes |
| Basic journey tracking | Yes | Yes | Yes |
| Investor Readiness Score | — | Yes | Yes |
| Pitch Deck Review & Scoring | — | Yes | Yes |
| Strategy Documents | — | Yes | Yes |
| SMS Check-ins (weekly) | — | Yes | Yes |
| Persistent Memory | — | Yes | Yes |
| Advanced Coaching | — | Yes | Yes |
| Virtual Team Agents (x4) | — | — | Yes |
| Boardy VC Matching | — | — | Yes |
| Investor Targeting & Outreach | — | — | Yes |
| Priority Compute (faster models) | — | — | Yes |
| Deeper Memory Depth | — | — | Yes |
| Marketplace Access | — | — | Yes |

### 6.3 Upgrade Triggers

Upgrades are behavior-triggered, not desire-triggered (Fred's directive):

| Trigger | Suggested Upgrade | Mechanism |
|---------|-------------------|-----------|
| Founder completes Reality Lens + has 3+ chat sessions | Free → Pro | FRED suggests: "You're ready for investor analysis" |
| Founder attempts pitch deck upload on Free tier | Free → Pro | Feature gate with upgrade CTA |
| Founder reaches "Build" Oasis stage | Pro → Studio | FRED suggests: "You need a team now" |
| Founder hits rate limit on AI calls | Free → Pro | Soft gate: "Upgrade for unlimited coaching" |
| Founder requests investor introductions | Pro → Studio | Feature gate with Boardy preview |

### 6.4 Checkout Flow

**Architecture:** Hosted Stripe Checkout (PCI compliant, zero card handling on server)

**Flow:**
```
Upgrade CTA → POST /api/stripe/checkout (priceId, email) → Stripe Checkout Page →
Success → Webhook → Update user_subscriptions → Redirect to Dashboard
```

**Security layers:**
1. Input validation (email format, priceId whitelist)
2. Stripe signature verification (HMAC SHA256)
3. Timestamp validation (< 5 min, prevents replay attacks)
4. Idempotency check (stripe_event_id dedup in stripe_events table)
5. Server-side amount verification via Stripe SDK

**Free trial:** Two-week trial for event attendees. Activated via special signup link with trial flag. No credit card required during trial.

### 6.5 Downgrade / Cancellation

- Cancellation triggers end-of-billing-period access (not immediate cutoff)
- Founder keeps read access to documents and history
- AI features revert to Free tier limits
- FRED sends a "We'll miss you" message with summary of progress made

---

## 7. Definition of Done — Per Feature

### 7.1 Onboarding Redesign

| Criteria | Metric |
|----------|--------|
| Welcome screen renders on first sign-up | 100% of new users see it before dashboard |
| Five-question intake captures free-text answers | All 5 fields populated and stored in Supabase |
| Reality Lens runs automatically after intake | Score generated for every new user |
| Orientation message displays on first dashboard visit | "welcome=true" query param triggers it |
| Mobile responsive | Works on 375px viewport (iPhone SE) through 1440px desktop |
| Time to complete onboarding | < 5 minutes for average user |
| Founder memory seeded from intake | Profile fields populated in memory table |

### 7.2 Oases Journey Visualization

| Criteria | Metric |
|----------|--------|
| Five stages rendered visually | Clarity, Validation, Build, Launch, Grow all visible |
| Current stage highlighted | User's active stage has distinct visual treatment |
| Progress percentage displayed | Numerical percentage above roadmap |
| Stage gating enforced | Cannot access later-stage features (UI disabled + FRED blocks) |
| Progress persisted | Reloading page preserves state (Supabase-backed) |
| 120-step mapping functional | Individual steps within stages track completion |
| Fund matching locked | VC matching shows "Complete journey to unlock" until 100% |

### 7.3 Chat with FRED

| Criteria | Metric |
|----------|--------|
| Response streaming works | First token < 2 seconds, no freezing |
| FRED follows 7 brain enhancements | Manual review: answers complete, questions limited, compressed, patterns detected |
| Conversation history persists | Reload shows full history from Supabase |
| Multi-provider fallback works | If OpenAI fails, response comes from Claude or Gemini |
| Next 3 Actions present | Every substantive response ends with actionable steps |
| Stage-gating conversational | FRED redirects premature requests back to current stage |
| Mobile chat usable | Full-screen chat works on mobile with keyboard open |

### 7.4 Voice Calls with FRED

| Criteria | Metric |
|----------|--------|
| Voice call connects | LiveKit room created, audio streams both directions |
| Fred Sahara voice used | ElevenLabs voice ID renders correctly |
| Chat-voice context preserved | Switching from chat to voice (or back) retains conversation context |
| Transcription logged | Voice conversation appears in chat history |
| Mobile voice works | Voice calls function on mobile browser (PWA) |
| Graceful failure | Voice drop shows message, falls back to chat |

### 7.5 Stripe Payment Flow

| Criteria | Metric |
|----------|--------|
| Checkout creates subscription | Stripe dashboard shows active subscription after payment |
| Webhook processes reliably | stripe_events table logs all events; no duplicates |
| Tier updates in real-time | Dashboard reflects new tier within 30 seconds of payment |
| Feature gates enforce tiers | Paid features locked for Free users, unlocked for paying users |
| Free trial works | Event attendees get 14 days without credit card |
| Cancellation works | End-of-period access, then revert to Free |
| No double charges | Idempotency check prevents duplicate processing |

### 7.6 UI Relabeling

| Criteria | Metric |
|----------|--------|
| "Fred AI" → "Mentor" everywhere | grep "Fred AI" returns 0 results in UI components |
| "Journey" → "Progress" everywhere | grep for old label returns 0 in navigation/headers |
| "Chat with Fred" prominent | Button visible on dashboard main view without scrolling |
| "Open Roadmap" button visible | Persistently accessible from dashboard |
| Four main sections visible | Dashboard main view shows 4 key sections on load |

### 7.7 Founder Memory Layer

| Criteria | Metric |
|----------|--------|
| Memory stores structured data | Problem statement, traction, key decisions captured per user |
| Memory persists across sessions | Closing browser and returning shows stored memory |
| FRED references memory in responses | Coaching mentions prior inputs: "You mentioned..." |
| Memory updates from conversations | New inputs captured and stored automatically |
| Memory viewable by founder | Memory/mini-brain page shows stored profile data |

### 7.8 Daily Guidance (SMS)

| Criteria | Metric |
|----------|--------|
| Daily SMS sent based on stage | Founder receives stage-appropriate daily task |
| Proactive tone | Messages tell user what to do (not "what do you need?") |
| Platform return link | SMS contains link back to Sahara for full context |
| STOP compliance | Replying STOP immediately halts all messages |
| Cron triggers reliably | Messages send at configured time daily |

### 7.9 Event Launch Kit

| Criteria | Metric |
|----------|--------|
| QR code resolves to funnel | Scanning QR code loads u.joinsahara.com landing |
| Sign-up flow < 60 seconds | From scan to account created in under a minute |
| Free trial activates | Event attendees get 14-day trial automatically |
| Analytics track conversions | PostHog events fire for each funnel step |

---

## Appendix A: IdeaPros 120-Step Journey Reference

The 120-step IdeaPros founder program maps to Sahara's 5 Oases stages. Full mapping in `docs/IDEAPROS-JOURNEY-MAPPING.md`.

| Stage | Steps | Sub-Milestones | Fred's 9-Step Mapping |
|-------|-------|----------------|----------------------|
| Clarity | 1-28 | Self-Assessment, Problem Definition, Idea Crystallization, Founder Edge | Steps 1-3 |
| Validation | 29-56 | Customer Discovery, Competitive Landscape, Solution Validation, Business Model | Steps 2, 5-6 |
| Build | 57-80 | MVP Definition, Technical Planning, Build Sprint, Testing | Steps 4, 7 |
| Launch | 81-104 | Go-to-Market, Content & Presence, Sales Process, Launch Execution | Steps 6, 8 |
| Grow | 105-120 | Metrics & PMF, Fundraising Readiness, Scale Planning, Investor Prep | Step 9 |

## Appendix B: Team & Contacts

| Name | Email | Role |
|------|-------|------|
| Fred Cary | fred@fredcary.com | CEO/Product Owner |
| Julian Bradley | julianb233@gmail.com | Lead Developer (Full Platform) |
| Alex LaTorre | alex@buildifyhq.com | Developer (Funnel/joinsahara.com) |
| Ira Hayes | ira@marxed.com | AI/Operations |
| William Hood | williamlhood@gmail.com | Advisor |
| Gregory | — | Engineering/Partnerships (100+ accelerator network) |

## Appendix C: Technical Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS 4, Framer Motion, GSAP |
| Backend | Next.js API Routes (Vercel Serverless) |
| Database | Supabase (PostgreSQL + pgvector) |
| Auth | Supabase Auth (JWT via jose) |
| AI/LLM | OpenAI GPT-4 Turbo, Anthropic Claude, Google Gemini (via Vercel AI SDK v6) |
| State Machine | XState v5 (FRED cognitive engine) |
| Voice | LiveKit (real-time), ElevenLabs (TTS) |
| Payments | Stripe (Checkout, Webhooks, Subscriptions) |
| SMS | Twilio |
| Email | Resend |
| Analytics | PostHog |
| Error Tracking | Sentry |
| Storage | Vercel Blob (documents) |
| Rate Limiting | Upstash Redis |
| Deployment | Vercel |

## Appendix D: Key Decision Log

| Decision | Rationale | Status |
|----------|-----------|--------|
| Platform is a journey, not a chatbot | Core philosophy — users feel guided, not using a tool | Confirmed (Fred, Mar 7) |
| Stage-gating enforced | Users cannot skip ahead; sequenced decisions are FRED's differentiator | Confirmed (Fred, Mar 7) |
| "Oases" milestone naming | Desert theme matches brand, creates narrative arc | Confirmed (Fred, Mar 7) |
| "Mentor" not "Fred AI" in UI | Mentor framing matches coaching identity | Confirmed (Fred, Mar 4) |
| Pre-seed/seed focus only | Real value is with beginners; not serving Series A+ yet | Confirmed (Fred, Mar 1) |
| $99/month target price | Affordable vs expensive consultants; "serious founder commitment" | Confirmed (Fred, Mar 4) |
| No payments until full version ships | Wired but not activated; Fred gives go-ahead | Confirmed (Fred, Mar 7) |
| Funnel launches first (Alex's version) | Quick wins for event; Julian's platform follows | Confirmed (Fred, Mar 7) |
| Behavior-triggered upgrades | Upsell when founder's actions warrant it, not desire | Confirmed (Fred, Dec 21) |
| PWA over native app | Faster to market, single codebase, installable on mobile | Standing |
| Multi-AI provider fallback | No single point of failure; OpenAI → Claude → Gemini | Standing |
| FRED's 7 brain enhancements | Explicit directives from Fred for AI behavior tuning | Confirmed (Fred WhatsApp, Mar 7) |
