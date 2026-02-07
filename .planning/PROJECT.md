# Sahara

## What This Is

Sahara is an AI-powered founder operating system that transforms how startups are built. Powered by FRED — an AI cognitive engine that mirrors Fred Cary's decision-making style — Sahara provides founders with structured guidance, honest assessments, and actionable tools to navigate their startup journey. Built on the experience of coaching 10,000+ founders.

## Core Value

Founders can make better decisions faster using FRED's structured cognitive frameworks — honest analysis, scored recommendations, and clear next actions.

## Current Milestone: v2.0 Production & Voice Parity

**Goal:** Close all gaps between what the website promises and what's actually built, unify Fred Cary's voice across all 21 AI interaction points, achieve production readiness, and deliver a polished PWA experience for mobile users.

**Target outcomes:**
- Every feature listed on the website has real logic behind it
- All AI interactions sound like Fred Cary (not generic experts)
- PWA installable with guided "Add to Home Screen" experience
- Mobile-first responsive across all pages
- Production infrastructure hardened (auth middleware, SEO, rate limiting)
- Admin training docs section for managing FRED's communication

## Requirements

### Validated

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

### Active

**Fred Voice Unification**
- [ ] All 21 AI interaction points use FRED_CAREY_SYSTEM_PROMPT or properly import fred-brain.ts
- [ ] Agent tool prompts (12 tools) reflect Fred's voice, not generic experts
- [ ] SMS templates rewritten in Fred's voice
- [ ] Unused fred-brain.ts exports activated (FRED_MEDIA, FRED_TESTIMONIALS, helpers)
- [ ] Data consistency fixed (years of experience, capital raised across all files)

**Missing Promised Features**
- [ ] Red Flag Detection — inline chat warnings + dashboard widget
- [ ] Founder Wellbeing — burnout detection + dedicated check-in page + mindset coaching mode
- [ ] Founder Intake Snapshot — enriched onboarding questionnaire + auto-generated profile from conversations
- [ ] Inbox Ops Agent — in-app message hub aggregating notifications and agent outputs
- [ ] Investor Targeting & Outreach — partner list uploads + custom outreach sequences + pipeline tracking
- [ ] Strategy & Execution Reframing — distinct feature with dedicated UI
- [ ] Priority Compute — tier-differentiated model selection or queue priority for Studio
- [ ] Deeper Memory — tier-differentiated memory depth (more context for higher tiers)
- [ ] Persistent Memory tier gating — actually restrict memory features to Pro+

**Production Readiness**
- [ ] Root middleware.ts for edge auth protection
- [ ] robots.txt in correct location
- [ ] Sitemap generation (app/sitemap.ts)
- [ ] Image optimization audit (convert to next/image)
- [ ] Redis/Upstash rate limiting for multi-instance scaling
- [ ] CORS configuration for all API routes
- [ ] Voice agent cleanup (remove "A Startup Biz" persona)

**PWA & Mobile**
- [ ] Dedicated offline fallback page
- [ ] Custom "Add to Home Screen" install prompt component
- [ ] PWA install instructions page (iOS + Android)
- [ ] Pricing comparison table mobile layout fix
- [ ] Fixed-width component audit (17 files)
- [ ] Touch target audit (44px minimum)

**Admin Training Docs**
- [ ] In-app admin-only documentation section
- [ ] Fred's communication rules extracted into readable guides
- [ ] Framework reference docs (9-step, Positioning, Investor Lens, Reality Lens)
- [ ] Agent behavior documentation

**Data Consistency**
- [ ] Capital raised: standardize across all pages
- [ ] Years of experience: 50+ everywhere (fix 30+ and 40+ references)
- [ ] SMS tier placement: resolve Pro vs Studio conflict
- [ ] Studio "Coming Soon" vs active feature contradiction

### Out of Scope

- Native mobile app — deferred to future milestone after web is complete
- Real-time video coaching — LiveKit infrastructure exists but not in v2 scope
- Custom AI model training — use existing providers with prompt engineering
- White-label/multi-tenant — single brand (Sahara) only
- Web Push notifications — defer to v2.1
- Real Boardy API integration — keep mock until Boardy API is available

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

---
*Last updated: 2026-02-07 after v2.0 milestone initialization*
