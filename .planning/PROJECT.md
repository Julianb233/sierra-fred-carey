# Sahara

## What This Is

Sahara is an AI-powered founder operating system that transforms how startups are built. Powered by FRED — an AI cognitive engine that mirrors Fred Cary's decision-making style — Sahara provides founders with structured guidance, honest assessments, and actionable tools to navigate their startup journey. Built on the experience of coaching 10,000+ founders.

## Core Value

Founders can make better decisions faster using FRED's structured cognitive frameworks — honest analysis, scored recommendations, and clear next actions.

## Current Milestone: v9.0 Founder Journey Report & $39 Tier

**Goal:** Generate a polished Founder Journey Report when founders complete all 19 roadmap steps, introduce a new $39/mo tier as the conversion moment from free to paid, and restructure tier gating so the 19-step journey is the definitive free experience.

**Target features:**
- Founder Journey Report — Compile all 19 roadmap step answers into a polished, positive report with FRED re-synthesized summaries (more detail, not less). Covers: what the company is, what it does, how it works, pricing model, LTV, CAC, founder story, differentiator, mindset, scaling plan, leadership
- Report delivery — Web view (on-platform report page per founder), branded PDF download (Sahara design), and email delivery with PDF attachment
- FRED report synthesis — AI re-processes all 19 answers into richer, more detailed summaries for the report. Each section gets narrative context, not just the raw answer. Positive and upbeat tone celebrating what the founder has built
- AI-suggested bonus steps — After completing 19 steps, FRED analyzes the founder's specific business and may suggest 1-2 personalized additional steps ("for YOUR business, you also need...")
- Per-founder report storage — Each founder's report stored in their own folder/record, retrievable anytime, versioned if they update answers
- Paywall conversion flow — Report delivery is the graduation moment. After receiving the report: "You've built the model. Ready to turn this into a structured business you can execute? Upgrade to $39/mo"
- New $39/mo Essentials tier — Between Free and Pro. Includes: everything in Free + Investor Readiness scoring + Strategy outputs (plans, roadmaps) + Go-to-market strategy + First year summary + Stage scoring & guidance + Priority FRED responses
- Tier restructure — Ensure 19-step journey + profile/memory saving are solidly in Free tier. Move features that belong in $39 out of Free. Stripe product/price for $39 tier
- Report as deck foundation — Architecture the report data so it can be reused as the basis for a pitch deck generator in a future milestone

**Previous Milestone:** v8.0 Go-Live: Guided Venture Journey (SHIPPED 2026-03-09)

**The 19-Step Founder Roadmap (5 sections):**
1. **Your Core Offer** (4 steps) — Define product/service, ideal customer, problem in their words, pricing & why
2. **Your Founder Story** (3 steps) — Personal why, unfair advantage, 30-second elevator pitch
3. **Unit Economics** (4 steps) — CAC, LTV, LTV:CAC ratio, path to profitability
4. **Scaling Operations** (4 steps) — #1 process that breaks at scale, bottleneck automation, core playbooks, repeatable acquisition channel
5. **Leadership Mindset** (4 steps) — Delegate something you love, hard conversation, support system, leadership style

## Requirements

### Validated

**v1.0 MVP (shipped 2026-02-07)**
- [x] FRED Cognitive Engine — XState v5 state machine, 7-factor scoring, 12 mental models, memory persistence
- [x] FRED Chat — SSE streaming, prompt injection guard, cognitive step indicators
- [x] Reality Lens — 5-factor AI assessment with heuristic fallback, tier rate limits
- [x] Investor Readiness Score — 6-category AI scoring, stage benchmarks, DB persistence
- [x] Pitch Deck Review — PDF upload, slide classification, per-slide analysis, structure/content scoring
- [x] Strategy Documents — Template-based sequential AI generation, PDF export
- [x] Virtual Team Agents x3 — Founder Ops, Fundraising, Growth with AI tool-calling loops
- [x] SMS Check-ins — Twilio integration, cron scheduler, webhook handler, STOP/START compliance
- [x] Boardy Integration — Strategy pattern with mock client, AI-generated matches
- [x] Tier Gating — API middleware + UI FeatureLock + tiered rate limits + Stripe subscription check
- [x] Auth System — Supabase auth, password signup, session persistence
- [x] Stripe Billing — Checkout, webhooks, subscription lifecycle, tier mapping
- [x] Security Hardening — CSP headers, admin sessions, rate limiting, input sanitization, error sanitization
- [x] Onboarding Flow — Multi-step with stage/challenge capture

**v2.0 Production & Voice Parity (shipped 2026-02-07)**
- [x] Fred Voice Unification — All 21 AI interaction points speak as Fred Cary
- [x] Data Consistency — Capital raised, years of experience, tier placement standardized
- [x] Production Hardening — Root middleware, robots.txt, sitemap, CORS, Upstash rate limiting
- [x] Red Flag Detection — Inline chat warnings + dashboard widget
- [x] Founder Wellbeing — Burnout detection + check-in page + mindset coaching
- [x] Founder Intake Snapshot — Enriched onboarding + auto-generated profile from conversations
- [x] Inbox Ops Agent — In-app message hub aggregating notifications and agent outputs
- [x] Investor Targeting & Outreach — CSV uploads, AI matching, outreach sequences, pipeline CRM
- [x] Strategy & Execution Reframing — Dedicated UI with Fred's 9-step framework
- [x] Memory & Compute Tiers — Tier-differentiated models, memory depth, memory gating
- [x] PWA & Mobile Polish — Offline fallback, install flow, responsive fixes, touch targets
- [x] Admin Training Docs — In-app admin documentation with voice rules and framework guides

**v3.0 Scale, Activate & Engage (shipped 2026-02-08)**
- [x] Feature Activation — Coming Soon removal, offline page, monitoring export, account deletion
- [x] Production Observability — Sentry conditional init, Pino structured logging, CI quality gates
- [x] E2E Testing — Playwright setup, critical flow tests, coverage thresholds
- [x] RLS Security Hardening — 1339-line migration, 27 tables, 140+ policies, user-scoped clients
- [x] Web Push Notifications — Service worker push, subscriptions, preferences
- [x] Video Coaching Sessions — LiveKit UI activation, FRED sidebar
- [x] Product Analytics & Growth — PostHog, funnels, onboarding checklist
- [x] Email Engagement — Resend SDK, weekly digest, milestone celebrations, re-engagement
- [x] FRED Intelligence Upgrade — TTS voice, memory browser, export
- [x] Collaboration & Sharing — Co-founder invites, shareable links, team-scoped sharing

**v4.0 FRED Mentor Experience (shipped 2026-02-12)**
- [x] Structured Mentor Flow — FRED leads conversations, reframe-before-prescribe, conversation state tracking
- [x] Reality Lens Gate — Mandatory gate before tactical advice, decision sequencing enforced
- [x] System Prompt Overhaul — Fred Cary's master instructions, mentor tone, Next 3 Actions output standard
- [x] Onboarding → FRED Handoff — Seamless data flow, no repetition, Founder Snapshot populated
- [x] Framework & Mode Integration — Diagnostic engine, Investor/Positioning modes, 9-Step Process backbone
- [x] Dashboard Redesign — Founder Command Center with Snapshot, Decision Box, Funding Gauge, Momentum
- [x] Founder Communities — User-created communities, circles, topic rooms
- [x] Multi-Channel FRED Access — Voice calls (LiveKit), SMS, in-app chat from any screen
- [x] Next Steps Hub & Readiness Tab — Critical/Important/Optional priorities, combined readiness view
- [x] Document Repository — Decks, Strategy Docs, Reports, Uploaded Files with "Review with Fred"
- [x] Chat UI Redesign — Full-screen chat, active mode bar, side panel toggle
- [x] Mobile App Layout — Mobile nav, Today's Focus, simplified gauges, voice input

**v5.0 QA Fixes — Production Polish (shipped 2026-02-18)**
- [x] Dashboard Routing Fix — 3 sub-routes rendering wrong content
- [x] Infinite Loading Spinner Fixes — 4 pages stuck on spinner, error boundaries added
- [x] Demo Page Auth Fix — Demo pages accessible without login
- [x] Duplicate Logo UI Fix — Single logo, clean nav layout
- [x] Error State Polish — User-friendly empty states replacing raw error banners

### Active

**v9.0 — Founder Journey Report (REPORT)**
- [ ] Report data aggregation — API to compile all 19 roadmap step answers + metadata for a given founder
- [ ] FRED report synthesis — AI re-processes all 19 answers into richer, narrative summaries. Positive/upbeat tone. More detail than the raw step summaries
- [ ] Report web view — On-platform report page (`/dashboard/report`) showing all 5 sections with synthesized answers, executive summary, and founder profile
- [ ] Report PDF generation — Branded Sahara PDF with professional layout, all 19 step summaries, executive summary section, downloadable from web view
- [ ] Report email delivery — Auto-send PDF + web link via email when founder completes all 19 steps
- [ ] Per-founder report storage — Store generated reports per founder, retrievable anytime, versioned if answers update
- [ ] AI-suggested bonus steps — After 19-step completion, FRED analyzes the specific business and suggests 1-2 personalized additional steps
- [ ] Report as deck foundation — Structure report data model so it can feed a future pitch deck generator

**v9.0 — $39 Essentials Tier (TIER39)**
- [ ] Stripe product & price — Create $39/mo Essentials tier in Stripe, wire checkout flow
- [ ] Tier gating middleware — Add "essentials" tier between free and pro in tier-check middleware
- [ ] Essentials feature set — Gate these behind $39: Investor Readiness scoring, Strategy outputs (plans/roadmaps), Go-to-market strategy, First year summary, Stage scoring & guidance, Priority FRED responses
- [ ] Tier restructure — Ensure 19-step journey + profile/memory saving are solidly in Free. Move features that belong in $39 out of Free if needed
- [ ] Pricing page update — Add $39 Essentials tier to pricing page between Free and Pro

**v9.0 — Paywall Conversion Flow (CONVERT)**
- [ ] Report graduation CTA — After report delivery, show conversion screen: "You've built the model. Ready to turn this into a structured business?"
- [ ] Upgrade flow — Seamless path from report → $39 checkout → unlocked Essentials features
- [ ] Conversion copy — "Free = take your idea and build a real business model. $39 = turn that model into a structured business you can execute"

**v8.0 — Onboarding Transformation (ONBOARD)**
- [ ] Welcome screen — Mandatory educational screen on first sign-up: "This is a guided venture journey, not a transaction", how it works, what to expect
- [ ] Reality lens check — First interaction assesses founder's idea readiness, surfaces gaps to motivate engagement ("spook them")
- [ ] Five-question structured flow — New accounts start with structured intake collecting idea, stage, challenge, goals, timeline as free-text answers
- [ ] Handholding orientation — Concise onboarding guide/first-statement before users interact with Mentor explaining how to use Mentor + Progress
- [ ] IdeaPros template mapping — Map IdeaPros ~120-step user journey as structural template for Sahara's founder workflow

**v8.0 — Oases Journey System (JOURNEY)**
- [ ] Five-stage roadmap — Clarity → Validation → Build → Launch → Grow as "Oases" desert milestones (matches Sahara branding)
- [ ] Journey visualization UI — Progress roadmap graphic prominently displayed below chat/call, progress percentage above business-intelligence radar
- [ ] Stage gating — Users cannot skip ahead (e.g., no pitch deck before problem validation), enforced at FRED conversation + UI level
- [ ] Stage completion tracking — Track which roadmap questions answered, compute per-stage and overall completion percentage
- [ ] Fund matching gating — VC matching grayed out / locked until 100% journey completion

**v8.0 — UI Relabeling & Navigation (UILABEL)**
- [ ] Rename "Fred AI" → "Mentor" across all UI surfaces
- [ ] Rename "Journey" → "Progress" across all UI surfaces
- [ ] Prominent "Chat with Fred" entry point — Upfront, not buried; killer feature positioning
- [ ] "Open Roadmap" button — Visible and persistently accessible
- [ ] Four main sections persistently visible on main view (mobile + desktop)
- [ ] Onboarding checkbox → text field conversion — Free-text answers that FRED captures, rephrases, stores as memory

**v8.0 — Founder Memory & Intelligence (MEMORY)**
- [ ] Per-user memory/mini-brain — Store cleaned chat data as structured memory, capture problem statements, traction, and key decisions
- [ ] Capture and restate — FRED rephrases user inputs and stores for later reference and updates
- [ ] Business intelligence radar — Actionable blurbs/headlines from periodic web searches, inline article feature
- [ ] Idea-readiness scoring — 24hr refresh cycle with personalized explanatory copy for each user

**v8.0 — Daily Guidance & Outreach (GUIDE)**
- [ ] Daily task orchestration — FRED sends methodical daily tasks via SMS ("validate pricing with 5 customers today")
- [ ] Mentor-style outbound — Tells user what to focus on, not "what do you need help with today?"
- [ ] Twilio integration — Outbound SMS for daily guidance (existing Twilio wiring, extend for proactive guidance)
- [ ] Platform return flow — Cost-effective strategy to bring users back to platform for full responses (avoid expensive per-message SMS)

**v8.0 — Chat & Voice Polish (VOICE)**
- [ ] Fix chat freezing/response-chopping — Bug in demo system causing chat to freeze mid-response
- [ ] Voice ID wiring — Fred Zaharix voice ID integration, API key + account access confirmed
- [ ] Chat-voice continuity — Seamless transition between text chat and voice call, context preserved
- [ ] Mobile call/text continuity — Ensure voice calls and text work smoothly on mobile devices

**v8.0 — Event Launch Kit (EVENT)**
- [ ] QR code landing flow — 3-4 slide presentation deck links to QR code, instant sign-up flow for Palo Alto event (200 founders)
- [ ] Two-week free trial — Trial mechanism ready for event attendees (activated when Fred says go)
- [ ] Subscription flow — Stripe checkout wired for $99/month, NOT activated until Julian's full version ships
- [ ] Pitch deck upload — Document upload for paid tier pitch deck review (Pro/Studio feature, critical for paid launch)

**v8.0 — User Testing Loop (TEST)**
- [ ] Systematic test accounts — Create new accounts and go through full onboarding to validate interest/five-question system
- [ ] Mobile device testing — Test call/text continuity on mobile, validate responsive behavior
- [ ] Event feedback collection — Framework to collect and process feedback from first 200 event attendees
- [ ] Iteration workflow — Process for analyzing user behavior, prioritizing fixes, and iterating before scaling

**Carried (DEFERRED)**
- [ ] Feedback intelligence phases (74-76) — Pattern detection, auto-triage, self-improvement loop (from v7.0)
- [ ] Real Boardy API integration — Blocked pending partnership and API credentials (from v6.0)
- [ ] Mux admin routes — Blocked pending Mux credentials (from v6.0)

### Out of Scope

- Native mobile app — deferred; PWA-first strategy working
- Custom AI model training — use existing providers with prompt engineering
- White-label/multi-tenant — single brand (Sahara) only

## Context

**Fred Cary's Expertise:**
- 10,000+ founders coached
- 50+ years of entrepreneurial experience
- Founded 40+ companies, 3 IPOs, 2 acquisitions
- Deep expertise in startup strategy, fundraising, founder psychology

**FRED Cognitive System:**
9 canonical documents define exactly how FRED operates:
1. Core System Prompt — operating loop, decision architecture
2. Analysis Framework — information intake, validation, mental models, synthesis
3. Communication & Proposal Style — voice, tone, structure
4. Scoring & Weighting — 7-factor model, composite scores, thresholds
5. Auto-Decide vs Human-in-the-Loop — authority levels, escalation triggers
6. Tool & Channel Behavior — text, voice, documents, CRM
7. Safety, Audit, Control — risk domains, logging, kill switches
8. Versioning & Evolution — change management, drift prevention
9. Evaluation Metrics — decision quality, confidence calibration

**Source Training Documents:**
- `lib/fred-brain.ts` — 410 lines, Fred's complete knowledge base (identity, bio, companies, philosophy, communication style, media, testimonials, messaging)
- `lib/ai/prompts.ts` — 246 lines, system prompt + 5 coaching prompts + frameworks
- `fred-cary-db/Fred_Cary_Profile.md` — 381 lines, raw biographical data
- `fred-cary-db/comma-separated values.csv` — 148+ podcast appearances with topics

**Fred's 7 FRED Brain Enhancements (March 7, 2026 — from WhatsApp):**
Fred made these enhancements to his ChatGPT FRED version and explicitly said "these should be added to the brain":
1. **Answer Completeness Rule** — Complete answer in one response. No drip-feeding ("Would you like to know the next thing..."). Instead: "I also recommend...", "One additional improvement is..."
2. **Question Discipline Rule** — Only ask questions when they materially change the recommendation. Max 3 questions. No curiosity questions. If reasonable assumptions can be made, state assumptions and proceed.
3. **Compression Rule (Fred Voice)** — High signal, low friction. Clear section headers, short paragraphs, bullet points for frameworks, plain language. Avoid long motivational explanations, repetition, storytelling unless strategically useful.
4. **Founder Pattern Recognition Layer** — Silently diagnose founder situation before giving advice. Detect: Idea Without Customer, Tech First Problem Second, Everyone Is the Customer, Distribution Fantasy, Premature Fundraising, Feature Not Business, Consulting Disguised as Startup, Vanity Traction, Overbuilt Product. Name the pattern, explain risk, redirect to correct next step.
5. **Reality Check Trigger** — Detect founder delusion signals (huge market with no evidence, assumes viral growth, expects funding before traction, dismisses competitors, builds before validating). Challenge calmly, translate claim to testable hypothesis, recommend smallest real-world experiment.
6. **Decision Framework Library** — Apply structured decision tests: Problem Test, Customer Test, Wedge Test, Distribution Test, Build vs Validate Test, Fundraising Test, Focus Test, Founder Edge Test, Timing Test, Scalability Test. Use them explicitly in responses.
7. **Traction Coaching Mode** — Structured 0→10→100 customers system. Stage 1 (First 10): founder-led outreach, problem interviews, concierge MVP. Stage 2 (First 100): repeatable acquisition path, track conversion. Stage 3 (Toward PMF): cohort analysis, narrow ICP, retention. Favor founder-led sales early, manual validation before building, speed of learning over polish.

**Founder Wellbeing Prompt (from Fred's WhatsApp, March 7):**
"If a user expresses insecurity, doubt, imposter syndrome, burnout, stress, relationship or family strain, or decision paralysis: Normalize it as common, not weakness. Reduce the problem to what's controllable now. Offer practical exits (simplify priorities, restore basics, add support, define the next step). Be steady and present, not therapeutic or dismissive. If signals indicate serious mental health risk, encourage professional or local support."

**Existing Codebase (v1.0 complete):**
- Next.js 16 + React 19 with App Router
- Supabase (auth + Postgres + pgvector)
- Stripe (checkout, webhooks, subscriptions)
- XState v5 (FRED state machine, 10 states, 12 mental models)
- Vercel AI SDK 6 (structured outputs, streaming, tool calling)
- Twilio (SMS check-ins)
- Custom service worker (PWA foundations)
- Vercel deployment

**Pricing Tiers:**
| Tier | Price | Features |
|------|-------|----------|
| Free | $0 | 19-step Founder Roadmap, FRED decision engine, Reality Lens, Profile & Memory saving, Journey Report |
| Essentials | $39/mo | + Investor Readiness, Strategy outputs (plans/roadmaps), Go-to-market strategy, First year summary, Stage scoring & guidance, Priority FRED responses |
| Pro | $99/mo | + Pitch Review, Strategy Docs, SMS Check-ins, Deeper Memory |
| Studio | $249/mo | + Virtual Agents x4, Boardy, Investor Targeting, Priority Compute, Deepest Memory |

## Constraints

- **Tech stack**: Next.js 16, Supabase, Stripe — keep existing infrastructure
- **AI providers**: OpenAI (primary), Anthropic, Google (fallbacks) — existing client
- **SMS**: Twilio for weekly check-ins
- **Mobile strategy**: PWA-first, responsive web, API-first for future React Native
- **FRED compliance**: All AI interactions must follow canonical cognitive system exactly
- **Partner data**: Strategic partners provide investor lists via CSV upload

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Tier-gated from start | Pricing structure on website, need to honor it | ✓ Good |
| API-first architecture | Enables future React Native app without rewrite | ✓ Good |
| Twilio for SMS | Industry standard, reliable | ✓ Good |
| FRED cognitive system as foundation | All features built on consistent decision framework | ✓ Good |
| PWA over native app | Faster to market, single codebase, installable on mobile | — Pending |
| Admin-only training docs | Employees need reference, users don't need to see internals | — Pending |
| CSV upload for partner investor lists | Partners provide lists as files, admin uploads | — Pending |
| In-app message hub (not email integration) | Inbox Agent aggregates internal notifications/outputs | — Pending |
| All three wellbeing modes | Burnout detection + check-in page + mindset coaching | — Pending |
| Both intake approaches | Signup questionnaire + FRED enriches from conversations | — Pending |
| Red flags: chat + dashboard | Inline warnings during chat AND persistent dashboard widget | — Pending |

| FRED is a mentor, not an agent | Mentor framing matches Fred's coaching identity; "agent" sounds like a bot | — Pending |
| Reality Lens as mandatory gate | Founders can't skip hard questions — this is FRED's differentiation vs ChatGPT | — Pending |
| Decision sequencing enforced | No downstream work until upstream truth established | — Pending |
| Diagnostic mode switching (silent) | Frameworks introduced by context, not user choice | — Pending |

| Closed-loop feedback system | Feedback → AI analysis → prioritize → fix → notify founder — full cycle | — Pending |
| Multi-channel collection | In-app + WhatsApp + SMS + analytics — no single point of failure | — Pending |
| FRED self-improvement from feedback | Negative signals trigger prompt refinement, not just bug reports | — Pending |
| "Oases" milestone naming | Desert-themed milestones match Sahara brand, create story arc | ✓ Confirmed (Fred, Mar 7) |
| Platform is a journey, not a chatbot | Users must feel guided venture journey, not chat tool | ✓ Confirmed (Fred, Mar 7) |
| Stage-gating enforced | Users cannot skip ahead (no pitch deck before validation) | ✓ Confirmed (Fred, Mar 7) |
| No payment until full version ready | Paid tier delayed until pitch deck upload + document review ships | ✓ Confirmed (Fred, Mar 7) |
| Launch with Alex's version first | joinsahara.com version goes live; Julian's full version follows | ✓ Confirmed (Fred, Mar 7) |
| "Mentor" not "Fred AI" | UI labels must say Mentor/Progress, not Fred AI/Journey | ✓ Confirmed (Fred, Mar 7) |
| Daily guidance is proactive | FRED tells users what to do, doesn't ask what they need | ✓ Confirmed (Fred, Mar 7) |
| $99/month target price | Positioned as affordable alternative to expensive consultants | ✓ Confirmed (Fred, Mar 4) |
| 7 FRED brain enhancements | Answer Completeness, Question Discipline, Compression, Pattern Recognition, Reality Check, Decision Frameworks, Traction Coaching | ✓ Confirmed (Fred WhatsApp, Mar 7) |
| Pre-seed/seed focus only | Not serving Series A+ well yet; real value is with beginners | ✓ Confirmed (Fred WhatsApp, Mar 1) |
| ElevenLabs voice: "Fred Sahara" | Voice ID: uxq5gLBpu73uF1Aqzb2t, API key shared in WhatsApp | ✓ Confirmed (WhatsApp, Feb 27-28) |

| 19-step journey = free tier graduation | Report is the conversion moment; proves value before asking for payment | — Pending |
| New $39/mo Essentials tier | Bridge between Free and Pro; lowers barrier to first payment | — Pending |
| Report re-synthesized with more detail | Positive/upbeat, richer than raw step summaries; celebrates what founder built | — Pending |
| AI-suggested bonus steps post-completion | FRED personalizes 1-2 extra steps per business type after 19-step completion | — Pending |
| Free tier includes profile + memory saving | Already built; confirm it stays free to maximize 19-step completion rate | — Pending |
| Report = future deck foundation | Data model structured so pitch deck generator can reuse report content | — Pending |

---
*Last updated: 2026-04-08 after v9.0 Founder Journey Report & $39 Tier milestone initialization*
