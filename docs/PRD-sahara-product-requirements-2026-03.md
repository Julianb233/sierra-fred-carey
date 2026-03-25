# Sahara — Product Requirements Document (PRD)

**Version:** 1.0
**Date:** March 9, 2026
**Owners:** Julian Bradley, Ira Hayes
**Stakeholders:** Fred Cary (CEO/Product Owner), Alex De La Torre (Developer), Gregory (Engineering/Partnerships)
**Origin:** Sahara Founders Meeting — February 25, 2026 (41:00 timestamp), supplemented by March 4 & March 7 strategy sessions
**Linear:** [AI-1904](https://linear.app/ai-acrobatics/issue/AI-1904/product-create-prd-for-sahara-priorities-workflows-feature-rollouts)

---

## Table of Contents

1. [Product Vision](#1-product-vision)
2. [Core Feature Priorities (Ranked)](#2-core-feature-priorities-ranked)
3. [Funnel vs Full Platform Roadmap](#3-funnel-vs-full-platform-roadmap)
4. [Voice / Chat Interaction Spec](#4-voice--chat-interaction-spec)
5. [User Onboarding Flow](#5-user-onboarding-flow)
6. [Payment / Upgrade Flow](#6-payment--upgrade-flow)
7. [Definition of Done — Per Feature](#7-definition-of-done--per-feature)
8. [Technical Constraints](#8-technical-constraints)
9. [Open Questions](#9-open-questions)

---

## 1. Product Vision

**Sahara is a guided venture journey, not a chatbot.** Powered by FRED — an AI cognitive engine modeled after Fred Cary's 50+ years coaching 10,000+ founders — Sahara provides pre-seed and seed founders with structured, stage-gated guidance to build investor-ready companies.

### Core Philosophy (confirmed March 7, 2026)

- Users must feel they've entered a **structured journey**, not opened a chat box
- FRED **leads** the conversation — tells founders what to focus on, doesn't ask "what do you need?"
- Founders **cannot skip stages** (no pitch deck before problem validation)
- The experience should feel like gaining a **"co-founder-level intelligence layer"**
- Target audience: **pre-seed and seed stage founders** (not serving Series A+ deeply yet)

### Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Free → Pro conversion | 25% (from 3-5% baseline) | Stripe events / signup count |
| Onboarding completion rate | >80% | PostHog funnel |
| Weekly active users | >40% of signups | PostHog DAU/WAU |
| FRED conversation depth | >5 messages per session | Chat analytics |
| Oases stage progression | >50% advance past Clarity | Journey stage tracking |
| Event trial → paid conversion | >15% | Stripe + signup source |
| NPS from first 200 users | >50 | Post-event survey |

---

## 2. Core Feature Priorities (Ranked)

Features are ranked by launch criticality and user impact. Tiers: **P0** (launch blocker), **P1** (launch week), **P2** (first 30 days), **P3** (post-launch).

### P0 — Launch Blockers (Must ship before Palo Alto event)

| # | Feature | Description | Status |
|---|---------|-------------|--------|
| 1 | **Onboarding Redesign** | Mandatory welcome screen → reality lens check → 5-question structured flow → handholding orientation | 🔴 Not started |
| 2 | **Oases Journey Visualization** | 5-stage roadmap (Clarity → Validation → Build → Launch → Grow) with stage gating and progress % | 🔴 Not started |
| 3 | **UI Relabeling** | "Fred AI" → "Mentor", "Journey" → "Progress", prominent "Chat with Fred" entry point | 🔴 Not started |
| 4 | **Chat Bug Fix** | Fix chat freezing/response-chopping in demo system | 🟡 Known bug |
| 5 | **Event Launch Kit** | QR code landing → instant signup → 2-week free trial mechanism | 🔴 Not started |

### P1 — Launch Week (First 200 users)

| # | Feature | Description | Status |
|---|---------|-------------|--------|
| 6 | **Founder Memory Layer** | Per-user memory/mini-brain storing cleaned chat data, problem statements, traction, key decisions | 🟡 Partial (basic memory exists) |
| 7 | **FRED Brain Enhancements** | 7 enhancements from Fred (answer completeness, question discipline, compression, pattern recognition, reality check, decision frameworks, traction coaching) | 🟡 Partial |
| 8 | **Voice ID Integration** | Fred Zaharix voice via ElevenLabs (ID: `uxq5gLBpu73uF1Aqzb2t`), chat-voice continuity | 🟡 LiveKit exists, voice ID pending |
| 9 | **Mobile Polish** | Call/text continuity on mobile, responsive fixes, Samsung voice bug | 🟡 PWA exists |

### P2 — First 30 Days (Retention & engagement)

| # | Feature | Description | Status |
|---|---------|-------------|--------|
| 10 | **Daily Guidance System** | Proactive daily tasks via Twilio SMS ("validate pricing with 5 customers today"), platform return flow | 🟡 SMS check-ins exist, proactive guidance not |
| 11 | **Business Intelligence Radar** | Actionable blurbs/headlines from web research, idea-readiness scoring (24hr refresh) | 🔴 Not started |
| 12 | **Pitch Deck Upload (Paid)** | Document upload + AI review for Pro/Studio tier (launch payment trigger) | ✅ Built (gated behind tier) |
| 13 | **Subscription Activation** | Stripe checkout wired at $99/month — NOT activated until Julian's full version ships | ✅ Built (deactivated) |

### P3 — Post-Launch (Scale)

| # | Feature | Description | Status |
|---|---------|-------------|--------|
| 14 | **Fund Matching / Boardy** | VC matching grayed out until 100% journey completion, Boardy API for direct intros | 🟡 Strategy pattern built, real API pending |
| 15 | **User Testing Feedback Loop** | Systematic test accounts, mobile testing protocol, event feedback collection | 🔴 Not started |
| 16 | **IdeaPros Template Mapping** | Map ~120-step IdeaPros user journey as structural template | 🔴 Not started |
| 17 | **Gregory Partnership Integration** | White-label or direct integration with Gregory's 100+ accelerator platform (3M founders) | 🔴 Not started |

---

## 3. Funnel vs Full Platform Roadmap

### Phase 1: Event Funnel (Pre-launch — Target: Palo Alto event)

**Goal:** Get 200 founders from QR code → signed up → first FRED interaction in under 3 minutes.

```
[QR Code on slide] → u.joinsahara.com
    ↓
[Welcome Screen] "This is a guided venture journey"
    ↓
[5-Question Intake] idea, stage, challenge, goals, timeline
    ↓
[Reality Lens Check] first FRED interaction — surface gaps
    ↓
[Account Created] → Dashboard with Oases progress
    ↓
[2-week free trial active]
```

**Key requirements:**
- Mobile-first (90%+ of event attendees will use phones)
- Signup-to-value in <3 minutes
- No payment collection at event (2-week trial auto-starts)
- PostHog tracking on every step for funnel analysis

### Phase 2: Full Platform (Post-launch — Julian's version)

**Goal:** Convert trial users to $99/month subscribers by demonstrating irreplaceable value.

```
[Daily SMS] "Validate pricing with 5 customers today"
    ↓ (brings user back to platform)
[Dashboard] Oases progress + FRED chat + Business Intelligence
    ↓
[Mentor Chat/Call] Structured conversation, stage-appropriate
    ↓
[Stage Gate] Complete current Oasis before advancing
    ↓
[Pro Features Unlock] Investor Readiness, Pitch Deck, Strategy Docs
    ↓
[Payment Prompt] When user hits Pro-gated feature naturally
```

### Phase 3: Scale (Post-200 users)

**Goal:** Partnerships, accelerator integration, Series A+ support.

```
[Gregory Partnership] → 100+ accelerator referrals
[Boardy Integration] → Direct VC/angel introductions at journey completion
[Advanced Analytics] → Cohort analysis, retention metrics
[Mobile App] → React Native (API-first architecture ready)
```

### Roadmap Timeline

| Phase | Timeline | Milestone |
|-------|----------|-----------|
| Phase 1: Event Funnel | Now → Palo Alto event | 200 founders onboarded |
| Phase 2: Full Platform | Event + 2 weeks | Payment activation, $99/mo |
| Phase 3: Scale | Event + 60 days | Gregory partnership live |

---

## 4. Voice / Chat Interaction Spec

### 4.1 Chat with FRED (Mentor)

**Entry points:**
- Prominent "Chat with Fred" button on main view (above fold, not buried)
- Dashboard quick-access widget
- Contextual prompts within Oases stages ("Discuss this with your Mentor")

**Conversation behavior:**

1. **FRED leads.** Opens with context-aware prompt based on user's Oasis stage and last interaction
2. **Reframe before prescribe.** Restates the user's situation before giving advice
3. **Stage-appropriate routing.** Uses `detectTopic()` + `COACHING_PROMPTS` to activate correct mode:
   - Default: Startup Process guidance
   - Triggered: Investor Lens, Positioning, Scoring (only when appropriate)
   - Silent: Diagnostic mode switching (user doesn't choose frameworks)
4. **Answer completeness.** Complete answer in one response — no drip-feeding
5. **Question discipline.** Max 3 questions, only when they materially change the recommendation
6. **Pattern recognition.** Silently detect and name founder patterns (Idea Without Customer, Premature Fundraising, etc.)
7. **Next 3 Actions.** Every response ends with concrete, prioritized next actions
8. **Memory persistence.** Captures and stores problem statements, traction data, key decisions per tier limits:
   - Free: 5 messages / 0 days persistence
   - Pro: 20 messages / 30 days
   - Studio: 50 messages / 90 days

**Streaming:** Server-Sent Events (SSE) via Vercel AI SDK, cognitive step indicators during processing.

**Model routing:**
- Free tier: `gpt-4o-mini` (cost-efficient)
- Pro/Studio: `gpt-4o` (primary), Anthropic/Google (fallback)

### 4.2 Voice Call with FRED

**Technology:** LiveKit (WebRTC) + ElevenLabs TTS

**Voice identity:**
- Voice: "Fred Sahara" via ElevenLabs
- Voice ID: `uxq5gLBpu73uF1Aqzb2t`
- Preamble: `buildFredVoicePreamble()` composable utility

**Call flow:**
1. User taps "Call Fred" from chat or dashboard
2. LiveKit room created, voice agent connects
3. FRED speaks with Fred Cary's voice and coaching style
4. Context from chat history is injected — no repetition
5. Call ends → conversation summary saved to chat history
6. User can seamlessly switch between text and voice

**Requirements:**
- Chat-voice continuity: context preserved across modalities
- Mobile: works on iOS Safari, Android Chrome, Samsung Internet
- Samsung bug: investigate and fix voice cutoff issue (P1)
- Minimum 5-minute sustained connection without drops
- Fallback: if voice fails, graceful degradation to text chat with error message

### 4.3 SMS Outbound (Daily Guidance)

**Technology:** Twilio (existing integration)

**Behavior:**
- FRED sends proactive daily task via SMS at configured time
- Mentor style: "Validate pricing with 5 customers today" (not "what do you need?")
- SMS includes deep link back to platform for full context
- Cost management: short SMS with platform-return CTA (avoid expensive per-message replies)
- STOP/START compliance (already implemented)

**Tier gating:**
- Free: No SMS
- Pro/Studio: Daily guidance SMS enabled

---

## 5. User Onboarding Flow

### 5.1 Flow Diagram

```
[Landing / QR Code]
    ↓
┌─────────────────────────────────────────┐
│ STEP 0: Welcome Screen (mandatory)      │
│ "This is a guided venture journey,      │
│  not a transaction."                    │
│ - How Sahara works                      │
│ - What to expect                        │
│ - Meet your Mentor (Fred)               │
│ [Continue →]                            │
└─────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────┐
│ STEP 1-5: Structured Intake             │
│ (free-text fields, NOT checkboxes)      │
│                                         │
│ 1. "Describe your startup idea"         │
│ 2. "What stage are you at?"             │
│    (Ideation / Pre-seed / Seed / A+)    │
│ 3. "What's your #1 challenge right now?"│
│ 4. "What's your goal for the next       │
│     90 days?"                           │
│ 5. "How soon do you plan to raise       │
│     funding?"                           │
│                                         │
│ [Each answer saved as founder memory]   │
└─────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────┐
│ STEP 6: Account Creation                │
│ Email + Password (Supabase Auth)        │
│ [Create Account →]                      │
└─────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────┐
│ STEP 7: Reality Lens Check              │
│ FRED's first interaction — assesses     │
│ idea readiness, surfaces gaps.          │
│ "Spook them" — show what's missing to   │
│ motivate engagement.                    │
│ Results populate Oases starting state.  │
└─────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────┐
│ STEP 8: Handholding Orientation         │
│ Quick guide: how to use Mentor +        │
│ Progress. Points to key features.       │
│ "Your journey starts at Clarity."       │
│ [Enter Dashboard →]                     │
└─────────────────────────────────────────┘
    ↓
[Dashboard — Oases progress visible, first tasks ready]
```

### 5.2 Data Capture

Each onboarding answer is:
1. Saved raw to `onboarding` table
2. FRED rephrases and stores as structured `founder_memory`
3. Used to compute initial Oasis stage placement
4. Populates Founder Snapshot widget on dashboard

### 5.3 Stage Placement Logic

| User says they're at... | Initial Oasis | Available features |
|--------------------------|--------------|-------------------|
| Ideation | Clarity (1/5) | Free tier only |
| Pre-seed | Validation (2/5) | Prompt for Pro upgrade |
| Seed | Build (3/5) | Prompt for Pro upgrade |
| Series A+ | Advisory mode | Limited scope messaging |

---

## 6. Payment / Upgrade Flow

### 6.1 Pricing Tiers

| Tier | Price | Target Audience | Key Unlocks |
|------|-------|----------------|-------------|
| **Free** | $0 | First-time founders, ideation stage | FRED Decision OS, Reality Lens, Red Flag Detection, Wellbeing, Intake Snapshot |
| **Pro** | $99/mo | Pre-seed/seed actively fundraising | + Investor Readiness Score, Pitch Deck Review, Strategy Docs, SMS Check-ins, Persistent Memory (20msg/30d) |
| **Studio** | $249/mo | Funded founders needing execution leverage | + Virtual Team Agents ×4, Boardy, Investor Targeting, Priority Compute, Deep Memory (50msg/90d) |

### 6.2 Upgrade Trigger Points

Upgrades are triggered **by behavior, not by desire** (Fred's directive):

| Trigger | What happens |
|---------|-------------|
| User reaches Validation oasis + asks about investors | Soft prompt: "Unlock Investor Lens to get scored" |
| User tries to upload pitch deck (Free tier) | FeatureLock: "Upgrade to Pro for Pitch Deck Review" |
| User exhausts Free memory limit (5 messages) | Prompt: "Your mentor remembers more on Pro" |
| User completes Reality Lens + asks for strategy doc | FeatureLock: "Strategy Documents available on Pro" |
| Pro user needs virtual team agents | FeatureLock: "Upgrade to Studio for your Virtual Team" |

### 6.3 Payment Flow

```
[User hits tier-gated feature]
    ↓
[FeatureLock overlay — explains what they unlock]
    ↓
[Upgrade CTA → /pricing page]
    ↓
[Stripe Checkout ($99/mo or $249/mo)]
    ↓
[Stripe webhook → update subscription in Supabase]
    ↓
[getUserSubscription() returns new tier]
    ↓
[Feature unlocked — user redirected to feature]
```

### 6.4 Event-Specific Flow

For Palo Alto event attendees:
1. QR code → signup flow (no payment)
2. 2-week free trial auto-activates Pro tier
3. Trial countdown visible on dashboard
4. Day 12: email reminder "Your trial ends in 2 days"
5. Day 14: trial expires → Free tier (data preserved)
6. Stripe checkout available for conversion

### 6.5 Payment Rules

- **NO payment collected until Julian's full version ships** (Fred confirmed March 7)
- Subscription button exists but is not activated in production until explicit go-ahead
- Apple App Store avoidance: web-only transactions (no 30% cut)
- RevenueCat evaluated but deferred — Stripe handles web subscriptions

---

## 7. Definition of Done — Per Feature

### 7.1 Onboarding Redesign

- [ ] Welcome screen renders as first view for new signups (not skippable)
- [ ] Welcome screen explains: what Sahara is, how it works, what to expect
- [ ] 5-question intake uses **free-text fields** (not checkboxes)
- [ ] Each answer saved to database AND processed into founder memory
- [ ] FRED rephrases each answer and stores structured version
- [ ] Account creation (email + password) works via Supabase Auth
- [ ] Reality Lens check triggers automatically after account creation
- [ ] Reality Lens results populate initial Oasis stage
- [ ] Handholding orientation screen explains Mentor + Progress
- [ ] Total onboarding time <3 minutes (measured via PostHog)
- [ ] Mobile-responsive at 375px width
- [ ] Works on iOS Safari, Android Chrome

### 7.2 Oases Journey Visualization

- [ ] 5 stages displayed: Clarity → Validation → Build → Launch → Grow
- [ ] Desert/oasis visual theme consistent with Sahara branding
- [ ] Progress percentage displayed prominently (dashboard + above BI radar)
- [ ] Per-stage completion tracking (which questions answered, tasks done)
- [ ] Stage gating enforced: cannot access later stage content without completing prior
- [ ] Stage gating enforced in FRED conversation (won't discuss pitch deck at Clarity stage)
- [ ] Current stage highlighted, future stages grayed/locked
- [ ] "Open Roadmap" button persistently visible on main view
- [ ] Responsive on mobile and desktop

### 7.3 UI Relabeling

- [ ] All instances of "Fred AI" replaced with "Mentor"
- [ ] All instances of "Journey" (as nav label) replaced with "Progress"
- [ ] "Chat with Fred" button prominent and above-fold on main view
- [ ] 4 main sections persistently visible on main view (mobile + desktop)
- [ ] Verified via global search — zero remaining old labels

### 7.4 Chat Bug Fix

- [ ] Chat freezing/response-chopping bug identified and fixed
- [ ] 10 consecutive chat messages without freeze (manual test)
- [ ] SSE streaming confirmed working in Chrome, Safari, Firefox
- [ ] Error boundary catches and displays friendly error if stream fails

### 7.5 Event Launch Kit

- [ ] QR code generated that links to `u.joinsahara.com` (or equivalent)
- [ ] QR landing is mobile-first, loads in <2 seconds
- [ ] Signup flow from QR → first FRED interaction in <3 minutes
- [ ] 2-week free trial mechanism implemented (Stripe trial period)
- [ ] Trial countdown visible on dashboard
- [ ] Trial expiration email sent at day 12
- [ ] PostHog tracks: QR scan → signup → first chat → trial → conversion

### 7.6 Founder Memory Layer

- [ ] Per-user memory store (Supabase table) captures chat-extracted data
- [ ] FRED captures and rephrases: problem statement, traction, stage, key decisions
- [ ] Memory persists across sessions per tier limits
- [ ] Memory accessible via memory browser UI (existing)
- [ ] Memory informs FRED responses (injected into prompt context)
- [ ] Memory export works (existing)

### 7.7 FRED Brain Enhancements

- [ ] Answer completeness: complete answer in one response, no "would you like to know..."
- [ ] Question discipline: max 3 questions, only decision-critical
- [ ] Compression: clear headers, short paragraphs, bullet points, no repetition
- [ ] Pattern recognition: detects 9 founder patterns, names them, redirects
- [ ] Reality check trigger: detects delusion signals, translates to testable hypothesis
- [ ] Decision frameworks: 10 structured tests applied explicitly in responses
- [ ] Traction coaching: 0→10→100 customer stages
- [ ] Founder wellbeing: normalizes doubt, offers practical exits
- [ ] Verified via 3 test scenarios (vague founder, premature fundraiser, explicit scoring request)

### 7.8 Voice ID Integration

- [ ] ElevenLabs "Fred Sahara" voice connected (voice ID: `uxq5gLBpu73uF1Aqzb2t`)
- [ ] Voice calls use Fred's voice (not default TTS)
- [ ] Chat-voice continuity: context preserved when switching modalities
- [ ] Works on iOS Safari, Android Chrome
- [ ] Samsung voice cutoff bug investigated and fixed
- [ ] 5-minute sustained call without drops (tested on 3 device types)

### 7.9 Daily Guidance System

- [ ] FRED generates personalized daily task based on user's Oasis stage
- [ ] Task sent via Twilio SMS at user's configured time
- [ ] SMS includes platform deep link
- [ ] Mentor tone: directive ("Do X today") not passive ("What do you need?")
- [ ] Cost-effective: short SMS with CTA to return to platform for details
- [ ] STOP/START compliance maintained
- [ ] Pro/Studio tier only (Free tier excluded)

### 7.10 Business Intelligence Radar

- [ ] Actionable blurbs/headlines from web research displayed on dashboard
- [ ] Refreshes every 24 hours per user
- [ ] Personalized to user's industry/sector from onboarding data
- [ ] Idea-readiness scoring with explanatory copy
- [ ] Inline article/blurb feature (expandable)

### 7.11 Subscription Activation

- [ ] Stripe checkout for $99/mo (Pro) and $249/mo (Studio) functions end-to-end
- [ ] Webhook processes subscription lifecycle correctly
- [ ] `getUserSubscription()` returns correct tier post-purchase
- [ ] FeatureLock components unlock immediately after upgrade
- [ ] Gated behind feature flag — NOT activated until explicit go-ahead from Fred

### 7.12 Fund Matching / Boardy

- [ ] VC matching section visible but grayed out until 100% journey completion
- [ ] Boardy API integration (when partnership credentials available)
- [ ] Match results display investor name, thesis, relevance score
- [ ] Intro request flow (email to matched investor via Boardy)

---

## 8. Technical Constraints

| Constraint | Detail |
|------------|--------|
| **Stack** | Next.js 16, Supabase, Stripe, Vercel AI SDK 6 — no additions without discussion |
| **Build** | `next build --webpack` (Turbopack incompatible with App Router pages-manifest) |
| **AI Providers** | OpenAI (primary), Anthropic, Google (fallbacks) — tier-routed via `getModelForTier()` |
| **Voice** | LiveKit WebRTC + ElevenLabs TTS — existing worker process |
| **SMS** | Twilio — existing integration, extend for proactive outbound |
| **Auth** | Supabase Auth (JWT via jose), session persistence |
| **Payments** | Stripe only (no RevenueCat for web), feature-flagged |
| **Mobile** | PWA-first, responsive web, API-first for future React Native |
| **FRED Compliance** | All AI interactions must follow 9 canonical cognitive documents exactly |
| **Deployment** | Vercel (auto-deploy on push to main) |
| **Testing** | Vitest (unit, 598 tests passing), Playwright (E2E) |

---

## 9. Open Questions

| # | Question | Owner | Status |
|---|----------|-------|--------|
| 1 | Compute cost per active user — what's the break-even at $99/mo? | Ira Hayes | 🔴 Pending |
| 2 | When does Fred give the go-ahead to activate payments? | Fred Cary | 🔴 Pending |
| 3 | Gregory partnership structure — white-label, merger, or integration? | Fred + Gregory | 🔴 Pending |
| 4 | Boardy API credentials — when available? | Fred Cary | 🔴 Blocked |
| 5 | IdeaPros 120-step template — who maps it? | Ira Hayes | 🔴 Pending |
| 6 | ElevenLabs voice re-authentication — Fred needs to re-record | Fred Cary | 🟡 In progress |
| 7 | Palo Alto event date — confirmed? | Fred Cary | 🔴 Pending |
| 8 | Robert Williams user testing — who coordinates the first 200 feedback? | Ira Hayes | 🔴 Pending |
| 9 | Alex's joinsahara.com vs Julian's version — migration plan? | Julian + Alex | 🔴 Pending |

---

## Appendix A: Feature-Tier Matrix

| Feature | Free | Pro ($99) | Studio ($249) |
|---------|------|-----------|---------------|
| FRED Decision OS (Mentor chat) | ✅ | ✅ | ✅ |
| Reality Lens | ✅ | ✅ | ✅ |
| Red Flag Detection | ✅ | ✅ | ✅ |
| Founder Wellbeing | ✅ | ✅ | ✅ |
| Founder Intake Snapshot | ✅ | ✅ | ✅ |
| Oases Journey Progress | ✅ | ✅ | ✅ |
| Strategy & Execution Reframing | ✅ | ✅ | ✅ |
| Investor Readiness Score | ❌ | ✅ | ✅ |
| Investor Lens (Pre-Seed/Seed/A) | ❌ | ✅ | ✅ |
| Pitch Deck Review | ❌ | ✅ | ✅ |
| Strategy Documents | ❌ | ✅ | ✅ |
| Weekly SMS Check-ins | ❌ | ✅ | ✅ |
| Daily Guidance SMS | ❌ | ✅ | ✅ |
| Persistent Memory (20msg/30d) | ❌ | ✅ | ✅ |
| Voice Calls with FRED | ❌ | ✅ | ✅ |
| Virtual Team Agents ×4 | ❌ | ❌ | ✅ |
| Boardy / VC Matching | ❌ | ❌ | ✅ |
| Investor Targeting & Outreach | ❌ | ❌ | ✅ |
| Priority Compute | ❌ | ❌ | ✅ |
| Deep Memory (50msg/90d) | ❌ | ❌ | ✅ |

## Appendix B: FRED Cognitive System Reference

FRED operates according to 9 canonical documents:

1. **Core System Prompt** — operating loop, decision architecture
2. **Analysis Framework** — information intake, validation, mental models, synthesis
3. **Communication & Proposal Style** — voice, tone, structure
4. **Scoring & Weighting** — 7-factor model, composite scores, thresholds
5. **Auto-Decide vs Human-in-the-Loop** — authority levels, escalation triggers
6. **Tool & Channel Behavior** — text, voice, documents, CRM
7. **Safety, Audit, Control** — risk domains, logging, kill switches
8. **Versioning & Evolution** — change management, drift prevention
9. **Evaluation Metrics** — decision quality, confidence calibration

Key behavioral rules (from Fred's 7 Brain Enhancements, March 7, 2026):
- Complete answer in one response — no drip-feeding
- Max 3 questions, only when decision-critical
- High signal, low friction — headers, bullets, plain language
- Silently diagnose founder pattern before advising
- Detect delusion signals, translate to testable hypothesis
- Apply structured decision tests explicitly
- 0→10→100 customer traction coaching system

## Appendix C: Meeting Sources

| Date | Meeting | Key Decisions |
|------|---------|---------------|
| Feb 25, 2026 | Sahara Founders | Agreed to create this PRD |
| Mar 4, 2026 | Sahara Founders | Gregory partnership, Palo Alto event plan, action items |
| Mar 7, 2026 | Strategy Session | "Journey not chatbot", Oases naming, stage gating, no payment yet, 7 brain enhancements |
| Mar 7, 2026 | Fred WhatsApp | 7 FRED brain enhancements, wellbeing prompt, "add to the brain" |
| Mar 8, 2026 | WhatsApp export | Ongoing bug reports, deck.joinsahara.com issues |

---

*This is a living document. Update as decisions are made and features ship.*
*Last updated: March 9, 2026*
