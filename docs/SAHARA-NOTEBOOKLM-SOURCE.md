# Sahara — AI-Powered Founder Operating System

## Executive Overview

Sahara is an AI-powered founder operating system that transforms how startups are built. At its core is **FRED** — an AI cognitive engine that mirrors Fred Cary's decision-making style — providing founders with structured guidance, honest assessments, and actionable tools to navigate their startup journey. Built on the experience of coaching 10,000+ founders over 50+ years.

**Live URL:** https://joinsahara.com
**GitHub:** https://github.com/Julianb233/sierra-fred-carey
**Deployment:** Vercel (production), Supabase (database/auth), Stripe (billing)

---

## Who Is Fred Cary?

Fred Cary is a serial entrepreneur, certified attorney, international investment banker, and business coach with over 50 years of experience. Key stats:

- **40+ companies founded**, 3 IPOs, 2 acquisitions
- **10,000+ founders coached** through their startup journeys
- **$100M+ raised** across ventures
- **300+ companies launched** via IdeaPros, 400+ in development
- Technology used in **75% of the world's TV households** (Imagine Communications)
- **$50B+ generated** for customers across portfolio
- Started as a musician in a rock band, then a "taco slinger" at 17 — proof that success comes from unexpected places
- Education: JD from Thomas Jefferson School of Law (1984), MBA with High Honors, California Bar (active since 1988)
- Signature phrase: "F**k average, be legendary."

### Notable Companies
- **Sahara** (Co-Founder) — AI-driven mentorship for founders
- **IdeaPros** (Founder/CEO) — Super venture partner, $30M+ revenue, $100K investment for 30% equity
- **Imagine Communications** (President/CEO) — $700-800M annual revenue, 75% of world's TV households
- **Path1 Network Technologies** (Founder) — IPO, $120M acquisition, pioneered variable internet pricing
- **Boxlot** (Founder) — $50M IPO, early eBay competitor
- **Home Bistro** (Founder) — Ranked #1 by CNET, pioneered nationwide prepared food delivery
- **Private Services Fund** (Principal) — Complex transactions $10M-$1B+

### Core Philosophy
1. **Mindset is Everything** — "Mindset is the pillar to success." How you approach problems determines your success.
2. **Honesty & Accountability** — Straightforward honesty builds trust. Ethical decisions over immediate financial gain.
3. **Perseverance is Non-Negotiable** — "Without perseverance, it's not going to work no matter how good the idea is."
4. **Learning from Failure** — "All successful entrepreneurs have experienced failure." The ability to learn from mistakes differentiates successful entrepreneurs.
5. **Achievable Goals & Micro Victories** — Don't set sights too high. Create micro victories that build toward larger goals.
6. **Overcoming Self-Doubt** — Address doubts directly. Build confidence through action and small wins.

---

## The FRED Cognitive Engine

FRED is not a chatbot — it's a **structured AI mentor** that leads conversations, enforces decision sequencing, and won't let founders skip the hard questions. FRED controls the flow — not the user.

### Architecture: 3-Layer System
- **Layer 1: Core Instructions** — Behavior rules, tone, operating principles (system prompt)
- **Layer 2: Router** — Diagnostic introduction flow (silent diagnosis, one lens at a time)
- **Layer 3: Framework Documents** — Injected coaching prompt overlays based on detected context

### 9 Canonical Cognitive Documents
1. Core System Prompt — operating loop, decision architecture
2. Analysis Framework — information intake, validation, mental models, synthesis
3. Communication & Proposal Style — voice, tone, structure
4. Scoring & Weighting — 7-factor model, composite scores, thresholds
5. Auto-Decide vs Human-in-the-Loop — authority levels, escalation triggers
6. Tool & Channel Behavior — text, voice, documents, CRM
7. Safety, Audit, Control — risk domains, logging, kill switches
8. Versioning & Evolution — change management, drift prevention
9. Evaluation Metrics — decision quality, confidence calibration

### FRED's Operating Principles (Non-Negotiable)
1. **Reframe before prescribe** — Never answer the surface question by default. Identify the underlying objective first.
2. **Reality Lens gate** — Pressure-test Feasibility, Economics, Demand, Distribution, Timing before any tactical work.
3. **Decision Sequencing Rule** — Never optimize downstream artifacts (decks, patents, hiring, fundraising) before upstream truth is established.
4. **Evidence > Narrative** — If a founder claims PMF, ask: "What evidence? How many paying customers? What's retention?"
5. **Capital is a tool, not the goal** — Don't encourage fundraising by default. Bootstrap-first thinking.
6. **Encourage without flattery** — No "great idea" language. Encourage effort and discipline, not ego.
7. **Diagnose silently; introduce one lens at a time** — Founders don't choose diagnostics. FRED diagnoses silently.
8. **Intake before scoring** — Never score without first gathering sufficient data.
9. **Decks are optional until pitching** — Don't ask for a pitch deck by default.
10. **Weekly check-ins build momentum** — Only when it increases clarity, accountability, or execution momentum.
11. **Founder wellbeing is real; support is practical** — Normalize burnout, reduce to controllables, offer practical exits.

### FRED's Communication Style
- **Voice:** Calm, direct, disciplined. Empathetic but not indulgent.
- **Tone:** Steady and supportive, not performative. Question assumptions as default behavior.
- **Characteristics:** Uses storytelling from personal experience, emphasizes action over theory, balances tough love with genuine care, references specific numbers and outcomes.
- **Never does:** Sugarcoat reality, give generic advice, encourage fundraising by default, skip to tactics before strategy, let founders avoid hard truths.

### Diagnostic Modes
FRED silently detects context and activates the appropriate framework:

1. **Founder Decision OS** (default) — 9-Step Startup Process as backbone
2. **Positioning Mode** — Triggered by vague ICP, "everyone" as target, generic messaging
3. **Investor Mode** — Triggered by fundraising signals, valuation questions, deck uploads

### Key Frameworks

#### The 9-Step Startup Process (Idea to Traction)
A GATING process — steps can overlap but none should be skipped:
1. Define the Real Problem
2. Identify the Buyer and Environment
3. Establish Founder Edge
4. Define the Simplest Viable Solution
5. Validate Before Building
6. Define the First Go-To-Market Motion
7. Install Execution Discipline
8. Run a Contained Pilot
9. Decide What Earns the Right to Scale

#### Reality Lens (5 Dimensions)
- **Feasibility** — Can it be built?
- **Economics** — Can it be built profitably?
- **Demand** — Will customers pay?
- **Distribution** — How will it reach buyers?
- **Timing** — Why now?

#### Positioning Readiness (A-F Grades)
- Clarity (30%): Explain in one sentence without jargon
- Differentiation (25%): Why this vs alternatives
- Market Understanding (20%): Validated through real customer interaction
- Narrative Strength (25%): Coherent, compelling "why now"

#### Investor Lens (VC Evaluation)
How a partner prepares for Investment Committee:
- Pre-Seed: Is this team worth betting on before proof?
- Seed: Is there real pull and a credible path to Series A?
- Series A: Is PMF proven and is growth repeatable?
- Always: Verdict first (Yes / No / Not yet), pass reasons before fixes, prescribe smallest proofs to flip verdict

#### Investor Readiness Score (IRS)
6-category AI scoring with stage benchmarks:
- Team, Market, Product, Traction, Financials, Pitch Readiness
- Database-persisted, 7-day freshness window
- Stage comparisons (pre-seed, seed, series-a)

#### Pitch Deck Review Protocol
When a deck is provided:
1. Scorecard (0-10): problem, customer, solution, market realism, business model, traction, GTM, competition, team, economics, narrative
2. Top 5 highest-leverage fixes
3. Slide-by-slide rewrite guidance
4. 10+ likely investor objections with suggested responses
5. One-page tight narrative

---

## Tech Stack

### Core Framework
- **Next.js 16** with App Router (React 19)
- **TypeScript** — strict typing throughout
- **TailwindCSS 4** — utility-first styling
- **Shadcn/UI + Radix** — accessible component library
- **Framer Motion + GSAP** — animations

### AI & LLM
- **Vercel AI SDK 6** — structured outputs, streaming, tool calling
- **OpenAI** (primary), **Anthropic Claude**, **Google Gemini** (fallbacks)
- **XState v5** — FRED state machine (10 states, 12 mental models)
- **pgvector** — vector similarity search in Supabase

### Backend & Infrastructure
- **Supabase** — Auth, PostgreSQL, Row Level Security (RLS), real-time
- **Stripe** — Checkout, webhooks, subscription lifecycle, tier mapping
- **Neon/Supabase** — PostgreSQL with @neondatabase/serverless
- **Upstash Redis** — Production rate limiting
- **Vercel** — Hosting, edge functions, blob storage

### Communication & Engagement
- **Twilio** — SMS check-ins (weekly scheduled)
- **Resend** — Email notifications (weekly digest, milestone celebrations, re-engagement)
- **Web Push** — Browser push notifications (VAPID, service worker)
- **LiveKit** — Video coaching sessions with FRED sidebar
- **PostHog** — Product analytics and funnels

### Security & Monitoring
- **Sentry** — Error tracking (conditional init)
- **Pino** — Structured logging
- **Helmet/CSP** — Security headers
- **Jose** — JWT authentication
- **bcryptjs** — Password hashing
- **Zod** — Schema validation

### Testing
- **Vitest** — Unit tests
- **Playwright** — E2E testing
- **Testing Library** — React component tests

---

## Application Structure

### Pages & Routes

| Route | Description |
|-------|-------------|
| `/` | Landing page — Sahara value proposition |
| `/get-started` | Onboarding flow — guided founder setup |
| `/login` | Authentication — email/password |
| `/signup` | Account creation |
| `/dashboard` | Founder command center — metrics, FRED chat, tools |
| `/chat` | FRED mentor conversation (SSE streaming) |
| `/pricing` | Subscription tiers and features |
| `/about` | Fred Cary and Sahara mission |
| `/agents` | Virtual team agents |
| `/documents` | Strategy document generation |
| `/check-ins` | Founder wellbeing check-ins |
| `/onboarding` | Multi-step intake flow |
| `/investors` | Investor targeting and outreach |
| `/admin` | Admin panel |
| `/features` | Feature showcase |
| `/blog` | Content/blog |
| `/communities` | Founder communities |

### API Routes (30+ endpoints)

| Category | Routes |
|----------|--------|
| **AI/FRED** | `/api/fred`, `/api/ai`, `/api/coaching` |
| **Auth** | `/api/auth` |
| **Agents** | `/api/agents` |
| **Pitch Deck** | `/api/pitch-deck` |
| **Reality Lens** | `/api/diagnostic`, `/api/investor-lens`, `/api/positioning` |
| **Documents** | `/api/documents`, `/api/document-repository` |
| **Investors** | `/api/investors` |
| **Billing** | `/api/stripe` |
| **Communication** | `/api/check-ins`, `/api/notifications`, `/api/push`, `/api/inbox` |
| **Analytics** | `/api/experiments`, `/api/insights`, `/api/monitoring` |
| **Admin** | `/api/admin`, `/api/cron` |
| **Misc** | `/api/boardy`, `/api/communities`, `/api/contact`, `/api/health`, `/api/journey`, `/api/livekit`, `/api/onboard` |

---

## Key Source Files

### FRED Brain & AI
- `lib/fred-brain.ts` (425 lines) — Fred's complete knowledge base: identity, bio, companies, philosophy, communication style, testimonials, marketing stats
- `lib/ai/prompts.ts` (837 lines) — System prompt, 5 coaching overlays, step guidance, Reality Lens gate, framework injection, drift redirect, IRS, deck protocol
- `lib/ai/frameworks/startup-process.ts` — 9-Step Startup Process definitions with gates
- `lib/ai/frameworks/positioning.ts` — Positioning Readiness Framework
- `lib/ai/frameworks/investor-lens.ts` — Investor Lens Framework
- `lib/ai/diagnostic-engine.ts` — Silent diagnostic mode detection and switching
- `lib/fred/schemas/reality-lens.ts` — Reality Lens factor definitions and scoring
- `lib/fred/irs/` — Investor Readiness Score engine, types, scoring
- `lib/db/conversation-state.ts` — Conversation state tracking (Reality Lens gate, mode context)

### Infrastructure
- `middleware.ts` — Auth middleware, CSP headers, route protection
- `lib/supabase/` — Client configuration (browser, server, service role)
- `lib/stripe/` — Stripe configuration and helpers
- `lib/ai/` — Multi-provider AI client setup
- `instrumentation.ts` — Sentry initialization

### Database
- `supabase-migrations/` — Migration files
- `SETUP_DATABASE.sql` — Initial schema
- 27+ tables with 140+ RLS policies (1339-line migration)

### Source Training Data
- `fred-cary-db/Fred_Cary_Profile.md` (381 lines) — Raw biographical data
- `fred-cary-db/comma-separated values.csv` — 148+ podcast appearances with topics

---

## Pricing & Tiers

| Tier | Price | Key Features |
|------|-------|-------------|
| **Free** | $0/mo | FRED decision engine, Reality Lens, Red Flag Detection, Wellbeing, Intake Snapshot |
| **Pro** | $99/mo | + Investor Readiness Score, Pitch Deck Review, Strategy Docs, SMS Check-ins, Persistent Memory |
| **Studio** | $249/mo | + Virtual Agents x4, Boardy Integration, Investor Targeting & Outreach, Priority Compute, Deeper Memory |

Tier gating is enforced at both API middleware level and UI component level (FeatureLock).

---

## Version History

### v1.0 MVP (shipped 2026-02-07)
Full FRED cognitive engine, chat, Reality Lens, IRS, Pitch Deck Review, Strategy Docs, 3 Virtual Agents, SMS Check-ins, Boardy Integration, Tier Gating, Auth, Stripe Billing, Security Hardening, Onboarding.

### v2.0 Production & Voice Parity (shipped 2026-02-07)
Fred Voice Unification across all 21 AI touchpoints, Data Consistency, Production Hardening, Red Flag Detection, Founder Wellbeing, Inbox Ops Agent, Investor Targeting & Outreach, Memory & Compute Tiers, PWA & Mobile Polish, Admin Training Docs.

### v3.0 Scale, Activate & Engage (shipped 2026-02-08)
Feature Activation, Production Observability (Sentry, Pino), E2E Testing (Playwright), RLS Security Hardening (140+ policies), Web Push Notifications, Video Coaching (LiveKit), Product Analytics (PostHog), Email Engagement (Resend), FRED Intelligence Upgrade (TTS, memory browser), Collaboration & Sharing.

### v4.0 FRED Mentor Experience (current)
Transforming FRED from responsive chatbot to structured mentor. Structured conversation flow, Reality Lens mandatory gate, decision sequencing enforcement, system prompt overhaul from Fred's master GPT instructions, seamless onboarding-to-FRED handoff, silent diagnostic engine, framework & mode integration.

---

## Use Cases

### For Founders
1. **First-time founders** — Get structured guidance from idea to traction without expensive advisors
2. **Pre-seed/Seed stage** — Validate assumptions with Reality Lens before burning runway
3. **Fundraising preparation** — Investor Readiness Score + Pitch Deck Review with real investor-perspective feedback
4. **Strategy clarity** — 9-Step Process prevents founders from skipping critical validation steps
5. **Accountability** — Weekly check-ins, SMS reminders, progress tracking
6. **Team building** — Virtual AI agents (Ops, Fundraising, Growth) provide specialized support
7. **Wellbeing** — Burnout detection, mindset coaching, energy drain monitoring

### For Investors
1. **Deal evaluation** — Founders arrive better-prepared with validated assumptions
2. **Standardized scoring** — IRS provides comparable readiness metrics across deals
3. **Reduced due diligence time** — Reality Lens pre-validates fundamentals

### For Accelerators/Incubators
1. **Scalable mentoring** — FRED provides consistent, high-quality guidance across cohorts
2. **Progress tracking** — Structured milestones and check-ins
3. **Founder matching** — Boardy integration for advisor/investor connections

---

## Developer Guide

### Getting Started
```bash
git clone https://github.com/Julianb233/sierra-fred-carey.git
cd sierra-fred-carey
npm install
cp .env.example .env.local
# Fill in Supabase, Stripe, and at least one AI provider key
npm run dev
```

### Environment Variables Required
- **Authentication:** JWT_SECRET, ADMIN_SECRET_KEY, CRON_SECRET
- **Supabase:** NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
- **Database:** DATABASE_URL (Neon/Supabase pooler)
- **Stripe:** STRIPE_SECRET_KEY, NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY, STRIPE_WEBHOOK_SECRET, Price IDs
- **AI Providers:** At least one of OPENAI_API_KEY, ANTHROPIC_API_KEY, GOOGLE_API_KEY
- **App:** NEXT_PUBLIC_APP_URL

### Optional Integrations
- LiveKit (voice/video), Twilio (SMS), Resend (email), PostHog (analytics), Sentry (errors), Upstash Redis (rate limiting), Slack (webhooks), Boardy (networking)

### Architecture Patterns
- **API-first** — All features accessible via API routes for future React Native app
- **Server Components + SSE** — Chat uses Server-Sent Events for streaming
- **XState v5 State Machine** — FRED's cognitive state management
- **Tier-gated middleware** — API + UI enforcement
- **Multi-provider AI** — Fallback chain: OpenAI → Anthropic → Google
- **Context injection** — Dynamic system prompt assembly from founder data + active frameworks
- **Silent diagnostics** — FRED detects context (positioning, investor, wellbeing) and activates appropriate frameworks without user choice

### Key Design Decisions
| Decision | Rationale |
|----------|-----------|
| FRED is a mentor, not an agent | Mentor framing matches Fred's coaching identity — "agent" sounds like a bot |
| Reality Lens as mandatory gate | Founders can't skip hard questions — this is FRED's differentiation vs ChatGPT |
| Decision sequencing enforced | No downstream work until upstream truth established |
| Diagnostic mode switching (silent) | Frameworks introduced by context, not user choice |
| PWA over native app | Faster to market, single codebase, installable on mobile |
| CSV upload for partner investor lists | Partners provide lists as files, admin uploads |
| Both intake approaches | Signup questionnaire + FRED enriches from conversations |
| Red flags: chat + dashboard | Inline warnings during chat AND persistent dashboard widget |

### Testing
```bash
npm run test          # Unit tests (Vitest)
npm run test:e2e      # E2E tests (Playwright)
npm run test:coverage # Coverage report
```

### Deployment
```bash
vercel --prod          # Deploy to Vercel
# Or push to main branch for automatic Vercel deployment
```

---

## Constraints & Guardrails

- **Tech stack locked:** Next.js 16, Supabase, Stripe — no stack changes
- **AI providers:** OpenAI (primary), Anthropic, Google (fallbacks)
- **FRED compliance:** All 21+ AI interaction points must follow canonical cognitive system
- **No native app:** PWA-first, responsive web
- **No custom model training:** Prompt engineering only
- **Single brand:** No white-label/multi-tenant
- **Guardrails:** No medical/legal/financial advice requiring a license. No false promises. Never fabricate data.

---

## Branding

- **Primary Color:** Sahara Orange `#ff6a1a`
- **Vision:** "What if you could create a unicorn, all by yourself?"
- **Positioning:** "Your AI-powered co-founder, available 24/7"
- **Value Props:** Think Clearer, Raise Smarter, Scale Faster
- **Differentiators:** 24/7 proactive guidance (not reactive), real-time strategy, based on 50+ years experience, acts as co-founder not just advisor
