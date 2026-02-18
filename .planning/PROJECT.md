# Sahara

## What This Is

Sahara is an AI-powered founder operating system that transforms how startups are built. Powered by FRED — an AI cognitive engine that mirrors Fred Cary's decision-making style — Sahara provides founders with structured guidance, honest assessments, and actionable tools to navigate their startup journey. Built on the experience of coaching 10,000+ founders.

## Core Value

Founders can make better decisions faster using FRED's structured cognitive frameworks — honest analysis, scored recommendations, and clear next actions.

## Current Milestone: v6.0 Full Platform Maturity

**Goal:** Make Sahara production-solid (infrastructure), smarter (FRED intelligence), and feature-complete (content library, service marketplace, Boardy) — the full platform maturity push.

**Target features:**
- Sentry error tracking + production monitoring with alerting
- CI/CD expansion + visual regression testing + staging environment
- Twilio SMS activation for real weekly check-ins
- FRED intelligence upgrade — better responses, smarter mode switching, improved memory
- Mobile / UX polish — PWA refinements, animations, accessibility
- Dashboard & analytics — richer visualizations, founder metrics, engagement tracking
- Voice agent production hardening — reliable LiveKit calls, recording, transcription
- Content library & courses — educational hub with FRED-recommended learning paths
- Service marketplace — vetted providers, discovery, reviews, booking
- Real Boardy API integration — live investor matching replacing mock client

**Previous Milestone:** v5.0 QA Fixes — Production Polish (SHIPPED 2026-02-18)

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

**Infrastructure & Ops (INFRA)**
- [ ] Sentry error tracking — DSN configuration, alerting rules, source maps, performance monitoring
- [ ] CI/CD expansion — Playwright E2E coverage, visual regression testing, staging environment, automated deploy checks
- [ ] Twilio SMS activation — Real credentials, weekly check-in scheduling, end-to-end SMS delivery
- [ ] Voice agent hardening — Production-ready LiveKit calls, call quality monitoring, recording/transcription reliability

**FRED & UX Improvements (IMPROVE)**
- [ ] FRED intelligence upgrade — Better response quality, smarter mode switching, improved memory retrieval, long conversation handling
- [ ] Mobile / UX polish — PWA refinements, animation smoothness, responsive edge cases, accessibility gaps
- [ ] Dashboard & analytics — Richer visualizations, founder metrics, engagement tracking, historical trends, export

**New Features (FEATURE)**
- [ ] Content library & courses — Educational hub with video lessons, founder playbooks, FRED-recommended learning paths
- [ ] Service marketplace — Vetted providers (lawyers, designers, devs), discovery, reviews, booking flow
- [ ] Real Boardy API integration — Replace mock client with live investor matching, warm intros, outreach sequencing

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
*Last updated: 2026-02-18 after v6.0 Full Platform Maturity milestone initialization*
