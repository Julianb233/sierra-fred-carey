/**
 * Production Readiness Data
 * Last updated: 2026-03-27
 *
 * This file contains the structured data powering the production readiness
 * dashboard shared with stakeholders (William, Fred, and the team).
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
    detail: "joinsahara.com — Vercel auto-deploy from main",
  },
  {
    label: "Test Suite",
    value: "1,048 / 1,048",
    status: "complete",
    detail: "All tests passing (Vitest) — 0 failures",
  },
  {
    label: "TypeScript",
    value: "0 Errors",
    status: "complete",
    detail: "Clean compilation — down from 61 errors in v5.0",
  },
  {
    label: "Build Status",
    value: "221 Pages",
    status: "complete",
    detail: "Clean production build, zero build errors",
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
    value: "Pending Setup",
    status: "at-risk",
    detail: "Sentry code deployed but env vars not configured (AI-388)",
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
  { name: "SMS Check-ins", tier: "Studio", status: "complete", notes: "Twilio 10DLC registration pending" },
  { name: "Boardy Networking", tier: "Studio", status: "blocked", notes: "Awaiting partnership agreement" },
  { name: "Content Library", tier: "Studio", status: "at-risk", notes: "Platform built, no content uploaded yet" },
  { name: "Service Marketplace", tier: "Studio", status: "at-risk", notes: "Platform built, no providers seeded" },

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
    detail: "Sentry code is deployed and wrapped around the app. Three env vars need to be added to Vercel: SENTRY_DSN, SENTRY_AUTH_TOKEN, NEXT_PUBLIC_SENTRY_DSN.",
    status: "open",
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
    title: "Service marketplace — no providers seeded",
    severity: "medium",
    category: "business",
    owner: "Business Development",
    effort: "1-2 days",
    detail: "Provider directory, booking flow, reviews, and FRED recommendations are built (Phases 68-69). Needs initial providers (lawyers, accountants, advisors) seeded in the database.",
    status: "open",
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
    detail: "Voice recording columns and semantic memory vector search RPCs need to be applied to production Supabase. Run via SQL editor or migration CLI.",
    status: "open",
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
      { label: "Content library populated", done: false, note: "Platform built, no content" },
      { label: "Service marketplace seeded", done: false, note: "Platform built, no providers" },
      { label: "Boardy networking active", done: false, note: "Partnership pending" },
    ],
  },
  {
    name: "Operations & Monitoring",
    score: 4,
    maxScore: 6,
    items: [
      { label: "Production deploy on Vercel", done: true },
      { label: "GitHub CI/CD pipeline", done: true },
      { label: "1,048 automated tests passing", done: true },
      { label: "User testing infrastructure", done: true },
      { label: "Error monitoring (Sentry)", done: false, note: "Env vars needed" },
      { label: "Production DB migrations applied", done: false, note: "Migrations 062-063 pending" },
    ],
  },
]

// ─── Summary Stats ───────────────────────────────────────────────────────────

export const summaryStats = {
  overallReadiness: 82, // percentage
  milestonesComplete: 7,
  milestonesTotal: 8,
  totalPhases: 88,
  phasesComplete: 82,
  testsPassng: 1048,
  testsFailing: 0,
  tsErrors: 0,
  lintErrors: 0,
  lintWarnings: 281,
  buildPages: 221,
  openItems: 8,
  criticalItems: 0,
  highItems: 2,
  lastUpdated: "2026-03-27",
}

// ─── Access Control ──────────────────────────────────────────────────────────

/**
 * Simple token-based access for the production readiness page.
 * This is a stakeholder view — not fully public but shareable via link.
 */
export const READINESS_ACCESS_TOKEN = "sahara-launch-2026"
