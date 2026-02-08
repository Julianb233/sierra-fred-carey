# Sahara

## What This Is

Sahara is an AI-powered founder operating system that transforms how startups are built. Powered by FRED — an AI cognitive engine that mirrors Fred Cary's decision-making style — Sahara provides founders with structured guidance, honest assessments, and actionable tools to navigate their startup journey. Built on the experience of coaching 10,000+ founders.

## Core Value

Founders can make better decisions faster using FRED's structured cognitive frameworks — honest analysis, scored recommendations, and clear next actions.

## Current Milestone: v3.0 Launch Readiness

**Goal:** Make Sahara production-confident for real paying users by adding observability, analytics, user-facing email, and activating the dormant integrations that are already 85-95% built.

**Target outcomes:**
- Error tracking via Sentry — visibility into every production error
- Product analytics (Vercel Analytics or PostHog) — track activation funnels and feature adoption
- Health/uptime endpoint for production monitoring
- Transactional user emails via Resend (welcome, weekly digest, milestone celebrations)
- Slack notifications activated (95% built, needs webhook)
- SMS check-ins activated (85% built, needs Twilio creds)
- LiveKit video coaching activated for Studio tier (90% built, needs creds)
- UX audit pass to catch broken/rough edges before real users arrive

**Previous Milestone:** v2.0 Production & Voice Parity (SHIPPED 2026-02-07)

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

### Active

**Observability & Monitoring**
- [ ] Sentry error tracking integrated across API routes and client components
- [ ] Product analytics (Vercel Analytics or PostHog) tracking page views and feature adoption
- [ ] Health/uptime endpoint (`/api/health`) with dependency checks (DB, AI, Stripe)
- [ ] Structured logging for production debugging

**User Email Communications**
- [ ] Resend integration activated with transactional email templates
- [ ] Welcome email on signup
- [ ] Weekly digest email (FRED insights, activity summary, red flags)
- [ ] Milestone celebration emails (first analysis, first strategy doc, etc.)

**Integration Activation**
- [ ] Slack notifications wired to production events (errors, signups, payments)
- [ ] SMS check-ins fully activated with Twilio credentials
- [ ] LiveKit video coaching sessions activated for Studio tier
- [ ] Email notifications (Resend) wired to agent completions and alerts

**UX Audit & Polish**
- [ ] Full app walkthrough on 375px viewport — catch broken layouts
- [ ] Navigation audit — every nav link leads to a working page
- [ ] Form validation audit — all forms show clear errors
- [ ] Loading/empty states — no blank pages when data is missing
- [ ] Blog posts migrated from hardcoded to database-backed (12 posts currently hardcoded)

### Out of Scope

- Native mobile app — deferred; PWA-first strategy working
- Custom AI model training — use existing providers with prompt engineering
- White-label/multi-tenant — single brand (Sahara) only
- Real Boardy API integration — keep mock until Boardy API is available
- Founder community / peer matching — defer to v3.1+
- Content library / courses — defer to v3.1+
- Service marketplace — defer to v3.1+
- Web Push notifications — defer to v3.1+
- FRED voice output (TTS) — defer to v3.1+
- Co-founder collaboration / sharing — defer to v3.1+
- E2E test suite (Playwright) — defer to v3.1+
- Row-Level Security audit — defer to v3.1+

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
*Last updated: 2026-02-07 after v3.0 Launch Readiness milestone initialization*
