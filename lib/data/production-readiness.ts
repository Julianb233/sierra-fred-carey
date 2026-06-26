/**
 * Production Readiness Data
 * Last updated: 2026-06-26
 *
 * This file contains the structured data powering the production readiness
 * dashboard shared with stakeholders (William, Fred, and the team).
 *
 * Canonical production URL: https://you.joinsahara.com
 * (joinsahara.com + www.joinsahara.com redirect to the canonical app domain.)
 */

export type StatusLevel = "complete" | "on-track" | "at-risk" | "blocked" | "not-started"

export interface HealthMetric {
  label: string
  value: string
  status: StatusLevel
  detail?: string
}

export interface Milestone {
  version: string
  name: string
  status: StatusLevel
  phasesComplete: number
  phasesTotal: number
  completedDate?: string
  highlights: string[]
}

export interface FeatureStatus {
  name: string
  tier: "Free" | "Pro" | "Studio" | "All"
  status: StatusLevel
  notes?: string
}

export interface OutstandingItem {
  id: string
  title: string
  severity: "critical" | "high" | "medium" | "low"
  category: "engineering" | "configuration" | "content" | "business" | "compliance"
  owner: string
  effort: string
  detail: string
  status: "open" | "in-progress" | "resolved"
}

export interface ReadinessCategory {
  name: string
  score: number
  maxScore: number
  items: { label: string; done: boolean; note?: string }[]
}

// ─── Overall Health ──────────────────────────────────────────────────────────

export const healthMetrics: HealthMetric[] = [
  {
    label: "Production Deploy",
    value: "Live",
    status: "complete",
    detail: "you.joinsahara.com — Vercel auto-deploy from main (joinsahara.com + www redirect to canonical)",
  },
  {
    label: "Test Suite",
    value: "CI-gated",
    status: "complete",
    detail: "400+ Vitest test files (incl. 120 mentor-chatbot cases, AI-3521); every PR gates on green tests + 70% coverage threshold",
  },
  {
    label: "TypeScript",
    value: "0 Errors",
    status: "complete",
    detail: "Clean compilation — down from 61 errors in v5.0",
  },
  {
    label: "App Surface",
    value: "126 routes",
    status: "complete",
    detail: "126 page routes + 248 API endpoints + 49 dashboard pages + 266 components in production",
  },
  {
    label: "Lint Status",
    value: "0 Errors",
    status: "complete",
    detail: "281 warnings remaining (non-blocking, mostly @typescript-eslint/no-explicit-any)",
  },
  {
    label: "WCAG 2.1 AA",
    value: "Compliant",
    status: "complete",
    detail: "Accessibility audit passed — skip nav, ARIA labels, focus management",
  },
  {
    label: "PWA / Offline",
    value: "Active",
    status: "complete",
    detail: "Serwist service worker — installable on mobile",
  },
  {
    label: "Error Monitoring",
    value: "Active",
    status: "complete",
    detail: "Sentry configured (DSN + auth token in Vercel) across client/server/edge + synthetic uptime monitor (AI-8649)",
  },
]

// ─── Milestones ──────────────────────────────────────────────────────────────

export const milestones: Milestone[] = [
  {
    version: "v1.0",
    name: "MVP",
    status: "complete",
    phasesComplete: 9,
    phasesTotal: 9,
    completedDate: "2026-02-06",
    highlights: [
      "FRED cognitive engine (XState v5 state machine)",
      "Free / Pro / Studio tier gating",
      "Supabase auth + onboarding flow",
      "Stripe checkout + webhooks",
      "17/17 requirements satisfied, 49/49 must-haves passed",
    ],
  },
  {
    version: "v2.0",
    name: "Production & Voice Parity",
    status: "complete",
    phasesComplete: 10,
    phasesTotal: 10,
    completedDate: "2026-02-12",
    highlights: [
      "LiveKit voice integration (Call FRED)",
      "Production hardening (7 security + UX fixes)",
      "Input sanitization, email enumeration prevention",
      "PWA manifest for mobile install",
    ],
  },
  {
    version: "v3.0",
    name: "Scale, Activate & Engage",
    status: "complete",
    phasesComplete: 10,
    phasesTotal: 10,
    completedDate: "2026-02-18",
    highlights: [
      "Push notifications system",
      "SMS daily guidance (Twilio)",
      "Content library (Mux video platform)",
      "Service marketplace with Stripe Connect",
    ],
  },
  {
    version: "v4.0",
    name: "FRED Mentor Experience",
    status: "complete",
    phasesComplete: 10,
    phasesTotal: 10,
    completedDate: "2026-02-22",
    highlights: [
      "FRED memory system (semantic + episodic)",
      "Mode-switching intelligence",
      "Tool use (investor readiness, positioning, strategy)",
      "Decision framework integration",
    ],
  },
  {
    version: "v5.0",
    name: "QA Fixes",
    status: "complete",
    phasesComplete: 9,
    phasesTotal: 9,
    completedDate: "2026-02-25",
    highlights: [
      "1,048 tests all green (from 790 passing)",
      "0 TypeScript errors (from 61)",
      "0 lint errors (from 335)",
      "Full E2E browser testing infrastructure",
    ],
  },
  {
    version: "v6.0",
    name: "Full Platform Maturity",
    status: "on-track",
    phasesComplete: 10,
    phasesTotal: 12,
    highlights: [
      "10 phases complete (59–69)",
      "2 blocked: Mux credentials, Boardy API partnership",
      "Community features, analytics, advanced FRED tools",
    ],
  },
  {
    version: "v7.0",
    name: "UX Feedback Loop",
    status: "complete",
    phasesComplete: 6,
    phasesTotal: 6,
    completedDate: "2026-03-06",
    highlights: [
      "Feedback collection UI (thumbs up/down)",
      "Sentiment analysis + admin dashboard",
      "Intelligence & pattern detection",
      "A/B testing framework",
      "RLHF-Lite prompt improvement pipeline",
    ],
  },
  {
    version: "v8.0",
    name: "Go-Live: Guided Venture Journey",
    status: "complete",
    phasesComplete: 14,
    phasesTotal: 14,
    completedDate: "2026-03-08",
    highlights: [
      "Oases 5-stage desert metaphor journey",
      "Stage-gated progression (no skipping ahead)",
      "Active memory extraction (14 core fields)",
      "Quick assessment (Reality Lens first interaction)",
      "Voice call context preamble + transcripts",
      "Builder tier ($39/mo) added",
      "User testing infrastructure",
    ],
  },
  {
    version: "Post-Launch",
    name: "Hardening, Migration & Launch Gating",
    status: "complete",
    phasesComplete: 1,
    phasesTotal: 1,
    completedDate: "2026-06-26",
    highlights: [
      "Firebase → Supabase migration verified (67/67 users, 100% field parity)",
      "Domain consolidated to you.joinsahara.com (joinsahara.com + www redirect)",
      "Sales + Marketplace gated off for launch via DISABLED_FEATURES (AI-8891)",
      "Sentry error monitoring + synthetic uptime monitor live (AI-8649)",
      "Automated founder progress report + downloadable PDF (AI-7369, AI-7489)",
      "Free-plan throttling + strategic upsell triggers (AI-6486)",
      "Internal token/credit usage tracking (AI-6487) + API cost reporting (AI-6017)",
      "Auto Research harness + 120 mentor-chatbot test cases (AI-3521)",
      "Backup SMS delivery for non-iMessage users (AI-8892)",
    ],
  },
]

// ─── Feature Status by Tier ──────────────────────────────────────────────────

export const featureStatuses: FeatureStatus[] = [
  // Free tier
  { name: "Chat with FRED", tier: "Free", status: "complete" },
  { name: "Reality Lens Assessment", tier: "Free", status: "complete" },
  { name: "Oases Journey Visualization", tier: "Free", status: "complete" },
  { name: "Get Started Checklist", tier: "Free", status: "complete" },
  { name: "Onboarding Flow", tier: "Free", status: "complete" },

  // Pro tier
  { name: "Investor Readiness Score", tier: "Pro", status: "complete" },
  { name: "Pitch Deck Review", tier: "Pro", status: "complete" },
  { name: "Strategy Documents", tier: "Pro", status: "complete" },
  { name: "Positioning Assessment", tier: "Pro", status: "complete" },
  { name: "Readiness Dashboard", tier: "Pro", status: "complete" },
  { name: "Call FRED (Voice)", tier: "Pro", status: "complete" },
  { name: "AI Insights", tier: "Pro", status: "complete" },
  { name: "Investor Targeting", tier: "Pro", status: "complete" },

  // Studio tier
  { name: "Virtual Team Agents (3)", tier: "Studio", status: "complete" },
  { name: "SMS Check-ins", tier: "Studio", status: "complete", notes: "Twilio configured (+ backup SMS, AI-8892); 10DLC carrier registration pending" },
  { name: "Boardy Networking", tier: "Studio", status: "blocked", notes: "Awaiting partnership agreement — out of launch scope" },
  { name: "Content Library", tier: "Studio", status: "at-risk", notes: "Platform built, awaiting Mux credentials + course uploads" },
  { name: "Service Marketplace", tier: "Studio", status: "on-track", notes: "Built but intentionally hidden at launch (AI-8891) — re-enable via DISABLED_FEATURES" },
  { name: "Sales Dashboard", tier: "Studio", status: "on-track", notes: "Built but intentionally hidden at launch (AI-8891) — re-enable via DISABLED_FEATURES" },

  // Cross-tier
  { name: "Stripe Payments", tier: "All", status: "complete" },
  { name: "Push Notifications", tier: "All", status: "complete" },
  { name: "Analytics (PostHog)", tier: "All", status: "complete" },
  { name: "Well-being Tracking", tier: "All", status: "complete" },
  { name: "Community Features", tier: "All", status: "complete" },
]

// ─── Outstanding Items ───────────────────────────────────────────────────────

export const outstandingItems: OutstandingItem[] = [
  {
    id: "OI-1",
    title: "Sentry error monitoring not active",
    severity: "high",
    category: "configuration",
    owner: "DevOps",
    effort: "30 min",
    detail: "RESOLVED — Sentry env vars (NEXT_PUBLIC_SENTRY_DSN, SENTRY_AUTH_TOKEN, SENTRY_ORG, SENTRY_PROJECT) are configured in Vercel across client/server/edge. A synthetic uptime monitor was added in AI-8649.",
    status: "resolved",
  },
  {
    id: "OI-2",
    title: "Twilio A2P 10DLC registration",
    severity: "high",
    category: "compliance",
    owner: "Founder / Business",
    effort: "2 hrs + 4-week approval",
    detail: "SMS code is complete. Carrier-level A2P registration required to avoid message blocking. 4-week approval timeline — should start immediately.",
    status: "open",
  },
  {
    id: "OI-3",
    title: "Content library empty — no courses uploaded",
    severity: "medium",
    category: "content",
    owner: "Content Team",
    effort: "Ongoing",
    detail: "Mux video platform is built (Phases 66-67). Mux credentials need to be added to Vercel, then courses need to be uploaded via Mux dashboard.",
    status: "open",
  },
  {
    id: "OI-4",
    title: "Service marketplace + Sales — hidden at launch by design",
    severity: "low",
    category: "business",
    owner: "Business Development",
    effort: "1-2 days to re-enable",
    detail: "DEFERRED BY DESIGN — Provider directory, booking flow, reviews, and FRED recommendations are fully built (Phases 68-69) but intentionally gated off for launch via DISABLED_FEATURES (AI-8891) to avoid founder confusion. Re-enable once providers are seeded by removing 'sales' and 'marketplace' from the constant.",
    status: "in-progress",
  },
  {
    id: "OI-5",
    title: "Boardy API integration blocked",
    severity: "low",
    category: "business",
    owner: "Partnerships",
    effort: "TBD",
    detail: "Stubbed with mock client. No public API docs available — requires formal partnership agreement. Recommendation: launch without Boardy, add when partnership materializes.",
    status: "open",
  },
  {
    id: "OI-6",
    title: "Mux credentials not in Vercel env",
    severity: "medium",
    category: "configuration",
    owner: "DevOps",
    effort: "15 min",
    detail: "Five Mux env vars needed: MUX_TOKEN_ID, MUX_TOKEN_SECRET, MUX_SIGNING_KEY_ID, MUX_SIGNING_PRIVATE_KEY, MUX_WEBHOOK_SECRET.",
    status: "open",
  },
  {
    id: "OI-7",
    title: "Stripe Connect for marketplace payments",
    severity: "medium",
    category: "configuration",
    owner: "Engineering + Finance",
    effort: "1-2 days",
    detail: "Schema and UI are built. Stripe Connect Express account needs to be created and STRIPE_CONNECT_SECRET_KEY added to env vars.",
    status: "open",
  },
  {
    id: "OI-8",
    title: "DB migrations 062 + 063 on production",
    severity: "medium",
    category: "engineering",
    owner: "Engineering",
    effort: "30 min",
    detail: "RESOLVED — Production Supabase is the live system of record following the Firebase → Supabase migration (verified 2026-04-24: 67/67 users, 100% field parity, 1003 chat rows). Voice recording columns and semantic memory RPCs are in place.",
    status: "resolved",
  },
]

// ─── Readiness Categories ────────────────────────────────────────────────────

export const readinessCategories: ReadinessCategory[] = [
  {
    name: "Core Platform",
    score: 8,
    maxScore: 8,
    items: [
      { label: "FRED cognitive engine operational", done: true },
      { label: "Supabase auth + sessions", done: true },
      { label: "Stripe payment processing", done: true },
      { label: "Dashboard command center", done: true },
      { label: "Oases journey framework", done: true },
      { label: "Onboarding + Reality Lens", done: true },
      { label: "Tier gating (Free/Builder/Pro/Studio)", done: true },
      { label: "PWA + mobile experience", done: true },
    ],
  },
  {
    name: "AI & Intelligence",
    score: 7,
    maxScore: 7,
    items: [
      { label: "FRED chat with cognitive framework", done: true },
      { label: "Voice calling (LiveKit)", done: true },
      { label: "Memory system (semantic + episodic)", done: true },
      { label: "Active memory extraction (14 fields)", done: true },
      { label: "Provider fallback chain (Claude → Gemini)", done: true },
      { label: "Feedback collection + RLHF-Lite", done: true },
      { label: "A/B testing framework", done: true },
    ],
  },
  {
    name: "Growth & Engagement",
    score: 4,
    maxScore: 7,
    items: [
      { label: "Push notifications", done: true },
      { label: "Analytics (PostHog)", done: true },
      { label: "Community features", done: true },
      { label: "SMS daily guidance", done: true, note: "10DLC registration pending" },
      { label: "Content library populated", done: false, note: "Platform built, awaiting Mux creds + uploads" },
      { label: "Service marketplace seeded", done: false, note: "Built; hidden at launch by design (AI-8891)" },
      { label: "Boardy networking active", done: false, note: "Partnership pending — out of launch scope" },
    ],
  },
  {
    name: "Operations & Monitoring",
    score: 6,
    maxScore: 6,
    items: [
      { label: "Production deploy on Vercel", done: true, note: "you.joinsahara.com canonical" },
      { label: "GitHub CI/CD pipeline", done: true },
      { label: "5,200+ automated tests (CI-gated)", done: true },
      { label: "User testing infrastructure", done: true },
      { label: "Error monitoring (Sentry) + synthetic monitor", done: true, note: "Configured in Vercel (AI-8649)" },
      { label: "Production DB on Supabase", done: true, note: "Firebase→Supabase migration verified" },
    ],
  },
]

// ─── Summary Stats ───────────────────────────────────────────────────────────

export const summaryStats = {
  overallReadiness: 91, // percentage
  milestonesComplete: 8, // v1-v5, v7, v8, Post-Launch (v6.0 still on-track 10/12)
  milestonesTotal: 9,
  totalPhases: 89,
  phasesComplete: 83,
  testsPassng: 5209, // total Vitest cases across the suite; CI-gated green on main
  testsFailing: 0,
  tsErrors: 0,
  lintErrors: 0,
  lintWarnings: 281,
  buildPages: 377, // routes in production build (static + dynamic, routes-manifest.json)
  openItems: 5, // OI-2, OI-3, OI-5, OI-6, OI-7 (OI-1 + OI-8 resolved, OI-4 deferred by design)
  criticalItems: 0,
  highItems: 1, // Twilio 10DLC carrier registration (business/compliance)
  lastUpdated: "2026-06-26",
}

// ─── Access Control ──────────────────────────────────────────────────────────

/**
 * Simple token-based access for the production readiness page.
 * This is a stakeholder view — not fully public but shareable via link.
 */
export const READINESS_ACCESS_TOKEN = "sahara-launch-2026"
