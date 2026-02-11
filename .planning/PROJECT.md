# Sahara

## What This Is

Sahara is an AI-powered founder operating system that transforms how startups are built. Powered by FRED — an AI cognitive engine that mirrors Fred Cary's decision-making style — Sahara provides founders with structured guidance, honest assessments, and actionable tools to navigate their startup journey. Built on the experience of coaching 10,000+ founders.

## Core Value

Founders can make better decisions faster using FRED's structured cognitive frameworks — honest analysis, scored recommendations, and clear next actions.

## Current Milestone: v4.0 FRED Mentor Experience

**Goal:** Transform FRED from a responsive chatbot into a structured mentor that leads conversations, enforces decision sequencing, and won't let founders skip the hard questions. FRED controls the flow — not the user.

**Target outcomes:**
- FRED leads every conversation like a structured intake interview — asks, listens, guides to next step
- Reality Lens (Feasibility, Economics, Demand, Distribution, Timing) is a mandatory gate before any tactical advice
- Decision sequencing enforced — no downstream work (decks, patents, hiring, fundraising) until upstream truth is established
- System prompt rebuilt from Fred Cary's master GPT instructions — reframe before prescribe, critical-thinking default, mentor tone
- Onboarding hands off seamlessly to FRED's first conversation — no repetition, FRED picks up where onboarding left off
- Diagnostic engine wired into chat — Investor Mode, Positioning Mode activated silently by context, not user choice
- Pitch Deck Review gated behind upstream validation — 11-dimension scorecard, slide-by-slide rewrites, per-slide investor objections only after foundation is solid
- Every substantive FRED response ends with Next 3 Actions
- Gentle redirect when founders go off track — acknowledge, then steer back

**Previous Milestone:** v3.0 Scale, Activate & Engage (SHIPPED 2026-02-08)

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

### Active

**Structured Mentor Flow (CHAT)**
- [ ] FRED leads conversations — asks specific questions, guides to next step, controls the flow
- [ ] Reframe-before-prescribe behavior — FRED identifies the real goal before answering the literal question
- [ ] Critical-thinking default — every response surfaces assumptions, bottlenecks, tests, or decision criteria
- [ ] Gentle redirect when founders drift off track — acknowledge, then steer back to structured path
- [ ] Conversation state tracking — FRED knows where the founder is in the process and what's been established

**Reality Lens Gate (GATE)**
- [ ] Reality Lens (Feasibility, Economics, Demand, Distribution, Timing) runs as mandatory gate before tactical advice
- [ ] If foundation is weak, FRED says so plainly and redirects — no sugarcoating
- [ ] Decision sequencing enforced — no decks, patents, hiring, fundraising until upstream truth established
- [ ] Pitch Deck Review gated — 11-dimension scorecard (0-10) only after Reality Lens passes
- [ ] Per-slide investor objections — 2-3 skeptical questions per slide with knockout answers

**System Prompt Overhaul (PROMPT)**
- [ ] System prompt rebuilt from Fred Cary's master GPT instructions
- [ ] Mentor tone — encourage effort and discipline, not ego; no default praise or flattery
- [ ] Founder Intake Protocol automatic — stage, product status, revenue, runway, constraint, 90-day goal
- [ ] Output standard — every substantive response ends with Next 3 Actions
- [ ] Weekly Check-In Protocol — structured framework (what moved, what's stuck, energy drains, next decision, priority)

**Onboarding → FRED Handoff (ONBOARD)**
- [ ] Onboarding captures founder basics (stage, industry, challenge, revenue, team, funding)
- [ ] FRED's first conversation picks up seamlessly — references what onboarding collected, goes deeper
- [ ] No repetition — FRED does not re-ask what the signup form already captured
- [ ] Founder Snapshot populated and visible on dashboard from combined onboarding + FRED intake

**Framework & Mode Integration (MODE)**
- [ ] Diagnostic engine wired into chat — silently detects context, introduces frameworks at right moment
- [ ] Investor Mode activates when fundraising signals detected — applies Investor Lens, not user-chosen
- [ ] Positioning Mode activates when messaging/differentiation signals detected — applies Positioning Framework
- [ ] 9-Step Startup Process (Idea → Traction) used as default decision sequencing backbone
- [ ] Investor Readiness Score framework fully implemented (currently DB schema only)
- [ ] Deck Request Protocol formalized as standalone (currently embedded in Investor Lens)

### Out of Scope

- Native mobile app — deferred; PWA-first strategy working
- Custom AI model training — use existing providers with prompt engineering
- White-label/multi-tenant — single brand (Sahara) only
- Real Boardy API integration — keep mock until Boardy API is available
- Founder community / peer matching — moved to v4.0 (Phase 41)
- Content library / courses — defer to v5.0+
- Service marketplace — defer to v5.0+

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
| Free | $0 | FRED decision engine, Reality Lens, Red Flag Detection, Wellbeing, Intake Snapshot |
| Pro | $99/mo | + Investor Readiness, Pitch Review, Strategy Docs, SMS Check-ins, Persistent Memory |
| Studio | $249/mo | + Virtual Agents x4, Boardy, Investor Targeting, Priority Compute, Deeper Memory |

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

---
*Last updated: 2026-02-11 after v4.0 FRED Mentor Experience milestone initialization*
