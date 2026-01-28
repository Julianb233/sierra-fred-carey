# Sahara

## What This Is

Sahara is an AI-powered founder operating system that transforms how startups are built. Powered by FRED — an AI cognitive engine that mirrors Fred Cary's decision-making style — Sahara provides founders with structured guidance, honest assessments, and actionable tools to navigate their startup journey. Built on the experience of coaching 10,000+ founders.

## Core Value

Founders can make better decisions faster using FRED's structured cognitive frameworks — honest analysis, scored recommendations, and clear next actions.

## Requirements

### Validated

- Auth system with Supabase — existing
- Stripe billing integration — existing
- Multi-provider AI client (OpenAI, Anthropic, Google) — existing
- Tier-based access control (Free, Pro, Studio) — existing
- Basic dashboard structure — existing

### Active

**FRED Cognitive Engine (Foundation)**
- [ ] 7-factor decision scoring engine (strategic alignment, leverage, speed, revenue, time, risk, relationships)
- [ ] Analysis framework implementation (intake → validation → mental models → synthesis)
- [ ] Communication & proposal style enforcement
- [ ] Auto-decide vs escalate logic
- [ ] Decision state machine
- [ ] Memory persistence (user preferences, past decisions, outcomes)
- [ ] Safety, audit, and control layer
- [ ] FRED initialization protocol per session

**Free Tier Features**
- [ ] Startup Reality Lens — 5-factor assessment (feasibility, economics, demand, distribution, timing)
- [ ] Basic FRED chat with cognitive framework compliance
- [ ] Decision history and context tracking

**Pro Tier Features ($99/mo)**
- [ ] Investor Readiness Score — 0-100% with breakdown
- [ ] Pitch Deck Review — PDF upload, scorecard, objections list, rewrite guidance
- [ ] Strategy Documents — executive summaries, market analysis, 30/60/90-day plans

**Studio Tier Features ($249/mo)**
- [ ] Virtual Team Agents — specialized AI assistants (founder ops, fundraising, growth, inbox)
- [ ] Weekly SMS Check-ins — Twilio-powered accountability with progress tracking
- [ ] Boardy Integration — investor/advisor matching (integration approach TBD)

**Infrastructure**
- [ ] Full Supabase schema for all features
- [ ] API-first architecture (mobile-ready)
- [ ] Responsive web design (PWA-capable)
- [ ] Architecture supporting future React Native app

### Out of Scope

- Native mobile app — deferred to future milestone after web is complete
- Real-time video coaching — LiveKit infrastructure exists but not in v1 scope
- Custom AI model training — use existing providers with prompt engineering
- White-label/multi-tenant — single brand (Sahara) only

## Context

**Fred Cary's Expertise:**
- 10,000+ founders coached
- $50M+ raised across ventures
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

**Existing Codebase:**
- Next.js 16 + React 19 with App Router
- Supabase (auth + Postgres database)
- Stripe (checkout, webhooks, subscriptions)
- Multi-provider AI with fallback chain
- Notification service (Slack, email, PagerDuty)
- LiveKit (video infrastructure, not in v1)
- Vercel deployment

**Pricing Tiers:**
| Tier | Price | Features |
|------|-------|----------|
| Free | $0 | FRED decision engine, Reality Lens, basic chat |
| Pro | $99/mo | + Investor Readiness, Pitch Review, Strategy Docs |
| Studio | $249/mo | + Virtual Agents, SMS Check-ins, Boardy |

## Constraints

- **Tech stack**: Next.js 16, Supabase, Stripe — keep existing infrastructure
- **AI providers**: OpenAI (primary), Anthropic, Google (fallbacks) — existing client
- **SMS**: Twilio for weekly check-ins
- **Mobile strategy**: Responsive web first, API-first design for future React Native
- **FRED compliance**: All AI interactions must follow canonical cognitive system exactly

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Tier-gated from start | Pricing structure on website, need to honor it | — Pending |
| API-first architecture | Enables future React Native app without rewrite | — Pending |
| Twilio for SMS | Industry standard, reliable | — Pending |
| FRED cognitive system as foundation | All features built on consistent decision framework | — Pending |

---
*Last updated: 2026-01-28 after initialization*
