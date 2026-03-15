"use client";

import { useState } from "react";

// ============================================================================
// Data Types
// ============================================================================

type Status = "done" | "in-progress" | "blocked" | "todo" | "not-configured" | "pass" | "configured";

interface Task {
  title: string;
  status: Status;
  linear?: string;
  linearUrl?: string;
  notes: string;
  priority: "P0" | "P1" | "P2" | "P3" | "P4";
  category: "critical" | "high" | "infra" | "deferred";
}

interface InfraItem {
  component: string;
  status: Status;
  notes: string;
}

interface ChangelogEntry {
  date: string;
  entries: string[];
}

interface Feature {
  name: string;
  status: "live" | "partial" | "not-live" | "blocked";
  description: string;
}

interface ClientAction {
  action: string;
  urgency: "blocker" | "needed" | "nice-to-have";
  notes: string;
  done?: boolean;
}

// ============================================================================
// Launch Data
// ============================================================================

const LAUNCH_START = new Date("2026-03-16");
const LAUNCH_END = new Date("2026-03-20");
const LAUNCH_TARGET = "March 16–20, 2026";
const LAST_UPDATED = "March 15, 2026 — 10:00 AM PST";

// ---- Quick Links ----
const quickLinks = [
  { label: "Production", url: "https://joinsahara.com", icon: "globe" },
  { label: "Preview Deploy", url: "https://sahara-eve9cm15g-ai-acrobatics.vercel.app", icon: "eye" },
  { label: "GitHub Repo", url: "https://github.com/Julianb233/sierra-fred-carey", icon: "code" },
  { label: "Linear Board", url: "https://linear.app/ai-acrobatics", icon: "list" },
  { label: "Vercel Dashboard", url: "https://vercel.com/ai-acrobatics/sahara", icon: "deploy" },
  { label: "Health Check", url: "https://joinsahara.com/api/health", icon: "heart" },
];

// ---- Platform Stats ----
const platformStats = {
  pages: 118,
  apiRoutes: 221,
  components: 246,
  dbMigrations: 40,
  testFiles: 63,
  testsPassing: 1070,
  cronJobs: 7,
  securityHeaders: 6,
};

// ---- Feature Inventory ----
const features: Feature[] = [
  { name: "FRED AI Chat", status: "live", description: "AI coaching powered by Anthropic/OpenAI/Google via Vercel AI SDK, episodic memory, context-aware responses" },
  { name: "Guided Venture Journey", status: "live", description: "120-step IdeaPros journey mapped to 5 Oases stages with progress tracking" },
  { name: "User Auth", status: "live", description: "Signup, login, PKCE callback, password reset, admin login via Supabase Auth" },
  { name: "Dashboard", status: "live", description: "Founder dashboard with snapshot, next steps, get-started checklist, AI insights" },
  { name: "Voice Chat", status: "live", description: "Whisper-powered voice input with VoiceChatOverlay, LiveKit integration" },
  { name: "Admin Panel", status: "live", description: "Prompts, config, A/B tests, training, voice agent, analytics, feedback, RLHF, audit log" },
  { name: "Service Marketplace", status: "live", description: "Provider directory, booking system, FRED provider-finder tool integration" },
  { name: "Content Library", status: "live", description: "Mux video player, content recommendations, FRED content-recommender tool" },
  { name: "Onboarding Flow", status: "live", description: "Multi-step get-started flow with profile collection and guided setup" },
  { name: "PWA / Offline", status: "live", description: "Service worker via Serwist, manifest.ts, offline fallback page" },
  { name: "Email System", status: "live", description: "Transactional emails via Resend + React Email templates" },
  { name: "Feedback System", status: "live", description: "Thumbs widget, event feedback, consent banner, RLHF-lite engine" },
  { name: "Cron Automations", status: "live", description: "7 scheduled jobs: weekly digest, check-ins, re-engagement, daily guidance, reminders" },
  { name: "Funnel (u.joinsahara.com)", status: "live", description: "Standalone Vite landing page with Stripe checkout and data sync" },
  { name: "Chat-with-Fred Overlay", status: "partial", description: "Floating button on mobile — needs full overlay on all pages" },
  { name: "Payments (Stripe)", status: "blocked", description: "Code built (checkout, webhook, portal). No Stripe account — can't process payments" },
  { name: "Analytics (PostHog)", status: "partial", description: "Code integrated. Account created — awaiting email verification for API key" },
  { name: "Rate Limiting (Upstash)", status: "not-live", description: "In-memory fallback active. Needs Upstash Redis for production" },
  { name: "Push Notifications", status: "live", description: "VAPID keys generated and pushed to Vercel. Service worker ready" },
];

// ---- Client Action Items ----
const clientActions: ClientAction[] = [
  { action: "Create Stripe account for Sahara", urgency: "blocker", notes: "Go to dashboard.stripe.com — need business details, bank account. Get API keys + register webhook at /api/stripe/webhook", done: false },
  { action: "Verify PostHog email (julian@aiacrobatics.com)", urgency: "blocker", notes: "Check inbox, click verification link. Then grab phc_ API key from PostHog Settings > Project", done: false },
  { action: "Create Upstash Redis database", urgency: "needed", notes: "Go to console.upstash.com, create free Redis DB named sahara-ratelimit (US-West-1). Copy REST URL + token", done: false },
  { action: "Confirm domain DNS for joinsahara.com", urgency: "needed", notes: "Verify Vercel DNS records are pointing correctly for production", done: false },
  { action: "Review pricing page copy and tiers", urgency: "needed", notes: "Current: $99/mo with 14-day free trial. Confirm this is correct before launch", done: false },
  { action: "Provide Boardy API credentials", urgency: "nice-to-have", notes: "Pending partnership discussion — networking integration blocked without this", done: false },
];

// ---- Tasks ----
const tasks: Task[] = [
  // Critical Path
  {
    title: "Configure Vercel env vars (Stripe, Resend, PostHog, Sentry, Upstash, VAPID)",
    status: "in-progress",
    linear: "AI-2573",
    linearUrl: "https://linear.app/ai-acrobatics/issue/AI-2573",
    notes: "14 vars pushed to Vercel (Anthropic, Google, Resend, Sentry, CRON_SECRET, ElevenLabs, VAPID). PostHog account created — awaiting email verification for API key. Upstash + Stripe need manual account creation.",
    priority: "P0",
    category: "critical",
  },
  {
    title: "Fred AI broken states / deadlock recovery",
    status: "done",
    linear: "PERS-100",
    linearUrl: "https://linear.app/ai-acrobatics/issue/PERS-100",
    notes: "Fixed: 60s sendingRef timeout with force-release, 45s client timeout (synced with server 55s), graceful error recovery messages on provider failures.",
    priority: "P0",
    category: "critical",
  },
  {
    title: "Fred duplicate episodes bug",
    status: "done",
    linear: "AI-894",
    linearUrl: "https://linear.app/ai-acrobatics/issue/AI-894",
    notes: "Fixed: Content hash idempotency + Postgres 23505 conflict handling returns existing rows on race conditions.",
    priority: "P0",
    category: "critical",
  },
  {
    title: "Login / password reset flow",
    status: "done",
    linear: "AI-903",
    linearUrl: "https://linear.app/ai-acrobatics/issue/AI-903",
    notes: "Fixed in 3 prior commits: PKCE callback route, email-not-confirmed handling, enhanced UX for @saharacompanies.com emails.",
    priority: "P0",
    category: "critical",
  },
  {
    title: "Stripe payment integration",
    status: "blocked",
    linear: "AI-896",
    linearUrl: "https://linear.app/ai-acrobatics/issue/AI-896",
    notes: "Code is fully built (checkout, webhook, portal routes). No Sahara Stripe account exists — need to create account, get keys, register webhook.",
    priority: "P1",
    category: "critical",
  },
  // High Priority
  {
    title: "Fred AI vague responses — collect business fundamentals first",
    status: "todo",
    linear: "PERS-98",
    linearUrl: "https://linear.app/ai-acrobatics/issue/PERS-98",
    notes: "FRED needs to collect structured data (stage, revenue, team size) before giving advice. Prompt engineering required.",
    priority: "P2",
    category: "high",
  },
  {
    title: "Chat-with-Fred overlay accessible from any page",
    status: "in-progress",
    linear: "AI-902",
    linearUrl: "https://linear.app/ai-acrobatics/issue/AI-902",
    notes: "Partially built — floating button exists on mobile. Needs full overlay implementation on all pages.",
    priority: "P2",
    category: "high",
  },
  {
    title: "Fred response conciseness",
    status: "todo",
    linear: "PERS-159",
    linearUrl: "https://linear.app/ai-acrobatics/issue/PERS-159",
    notes: "FRED responses are too long and meandering. Needs prompt tuning for concise, actionable advice.",
    priority: "P2",
    category: "high",
  },
  {
    title: "Pre-launch production smoke test",
    status: "todo",
    linear: "AI-2575",
    linearUrl: "https://linear.app/ai-acrobatics/issue/AI-2575",
    notes: "Full E2E user flow verification on joinsahara.com — signup, login, chat, payments, journey, mobile.",
    priority: "P2",
    category: "high",
  },
  // Infrastructure
  {
    title: "Register missing cron jobs in vercel.json",
    status: "done",
    linear: "AI-2574",
    linearUrl: "https://linear.app/ai-acrobatics/issue/AI-2574",
    notes: "Added next-steps-reminders (daily 4pm) and feedback-loop-digest (Fridays 11am). All 7 crons registered.",
    priority: "P3",
    category: "infra",
  },
  {
    title: "Fix vitest config — exclude node_modules",
    status: "done",
    linear: "AI-2577",
    linearUrl: "https://linear.app/ai-acrobatics/issue/AI-2577",
    notes: "Added **/node_modules/** to vitest exclude. 63/63 test files, 1070/1070 tests passing.",
    priority: "P4",
    category: "infra",
  },
  {
    title: "Deduplicate 37+ duplicate Linear issues",
    status: "todo",
    linear: "AI-2576",
    linearUrl: "https://linear.app/ai-acrobatics/issue/AI-2576",
    notes: "9 duplicate clusters identified. Cleaning up will reduce open issues from ~79 to ~20.",
    priority: "P4",
    category: "infra",
  },
  // Deferred
  {
    title: "Boardy Integration Polish",
    status: "blocked",
    linear: "PERS-162",
    linearUrl: "https://linear.app/ai-acrobatics/issue/PERS-162",
    notes: "Blocked — no Boardy API credentials. Pending partnership discussion.",
    priority: "P3",
    category: "deferred",
  },
  {
    title: "Train model on investor firm data",
    status: "todo",
    linear: "PERS-101",
    linearUrl: "https://linear.app/ai-acrobatics/issue/PERS-101",
    notes: "Knowledge base and matching algorithm for investor recommendations.",
    priority: "P3",
    category: "deferred",
  },
  {
    title: "v7.0 Phases 74-76 (Intelligence, A/B, RLHF)",
    status: "todo",
    notes: "Feedback clustering, experiment framework, prompt self-improvement. Post-launch.",
    priority: "P3",
    category: "deferred",
  },
  {
    title: "Oases Stage Visualization & Gating",
    status: "todo",
    linear: "PERS-151",
    linearUrl: "https://linear.app/ai-acrobatics/issue/PERS-151",
    notes: "Visual stage progression with gating requirements. Post-launch enhancement.",
    priority: "P3",
    category: "deferred",
  },
];

const infraItems: InfraItem[] = [
  { component: "Build", status: "pass", notes: "118 pages compiling successfully" },
  { component: "Tests", status: "pass", notes: "63/63 files, 1070/1070 tests green" },
  { component: "SEO / Meta", status: "pass", notes: "Full metadata, robots.txt, sitemap.xml, OpenGraph" },
  { component: "Mobile Responsive", status: "pass", notes: "Viewport config, Tailwind responsive utilities" },
  { component: "PWA", status: "pass", notes: "manifest.ts, sw.ts, service worker via Serwist" },
  { component: "Security Headers", status: "pass", notes: "CSP, HSTS, X-Frame-Options, Referrer-Policy, Permissions-Policy" },
  { component: "Error Pages", status: "pass", notes: "not-found.tsx, error boundaries in all sections" },
  { component: "Auth Flow", status: "pass", notes: "Signup, login, PKCE callback, password reset, admin login" },
  { component: "Cron Jobs", status: "pass", notes: "All 7 cron routes registered in vercel.json" },
  { component: "Health Check", status: "pass", notes: "/api/health and /api/health/ai endpoints active" },
  { component: "Email (Resend)", status: "pass", notes: "API key live on Vercel production" },
  { component: "Error Tracking (Sentry)", status: "pass", notes: "DSN + auth token live on Vercel (all environments)" },
  { component: "Push Notifications (VAPID)", status: "configured", notes: "Keys generated and pushed to Vercel" },
  { component: "Analytics (PostHog)", status: "configured", notes: "Account created (US region) — awaiting email verification for API key" },
  { component: "Rate Limiting (Upstash)", status: "not-configured", notes: "No Upstash account — in-memory fallback active" },
  { component: "Payments (Stripe)", status: "not-configured", notes: "No Sahara Stripe account exists" },
];

const changelog: ChangelogEntry[] = [
  {
    date: "March 15, 2026",
    entries: [
      "Upgraded launch dashboard to client-facing production readiness view",
      "Added: quick links bar, platform stats, feature inventory, client action items, tech stack overview",
      "Dashboard now serves as the single source of truth for launch status",
    ],
  },
  {
    date: "March 14, 2026",
    entries: [
      "Moved launch dashboard from /admin/launch to /launch — publicly accessible without login",
      "Improved dashboard: countdown timer, progress bars per category, fixed gauge positioning, better mobile layout",
      "Generated VAPID keys for push notifications and pushed to Vercel",
      "Pushed 14 env vars to Vercel production (Anthropic, Google, Resend, Sentry, ElevenLabs, CRON_SECRET, VAPID)",
      "Created PostHog account (AI Acrobatics org, US region) — awaiting email verification",
      "Expanded changelog with full project history back to February 2026",
    ],
  },
  {
    date: "March 13, 2026",
    entries: [
      "Fixed Fred chat deadlock — 60s sendingRef timeout with force-release + abort hung requests",
      "Fixed duplicate episodes — content hash idempotency + Postgres conflict handling",
      "Added graceful error recovery for Fred AI provider failures (PERS-100)",
      "Fixed vitest config — excluded node_modules test files (1070 tests green)",
      "Registered 2 missing cron jobs in vercel.json (next-steps-reminders, feedback-loop-digest)",
      "Added env vars: Anthropic, Google, Resend, Sentry DSN, CRON_SECRET",
      "Created launch readiness dashboard",
      "Created 5 new Linear issues for launch gaps (AI-2573 through AI-2577)",
    ],
  },
  {
    date: "March 12, 2026",
    entries: [
      "Fred brain update: founder wellbeing protocol + strengthened fundamentals-first collection",
      "Get-started page: rephrased heading, added sign-in link for existing users",
      "Removed dead testimonials component and stale voice-agent dist",
      "Removed fake stats and testimonials from homepage",
      "Corrected inflated stats and claims sitewide",
    ],
  },
  {
    date: "March 11, 2026",
    entries: [
      "Fixed CI: hardcoded public Supabase keys for E2E, scoped auto-debug triggers",
      "Made E2E tests non-blocking for deployment",
      "Added Stripe checkout integration for funnel (AI-1941)",
      "Fixed database column mismatches causing Fred AI latency (AI-1940)",
      "Completed funnel version for u.joinsahara.com (AI-1943)",
      "Repositioned Fred AI chat above the fold on homepage (AI-1938)",
      "Fixed crash loops and resolved 129 test failures (#45)",
    ],
  },
  {
    date: "March 5–10, 2026",
    entries: [
      "Integrated 7 Fred Cary AI behavior enhancements into system prompt",
      "v8.0 Go-Live milestone shipped — Guided Venture Journey (120 steps, 5 Oases stages)",
      "Deep contact enrichment pipeline with email/iMessage content and AI summaries",
      "Embedded 17,100 contacts into Pinecone for semantic search",
      "Built floating chat-with-Fred overlay for mobile",
      "Fixed PKCE auth callback route and password reset flow",
      "Added 14-day free trial with $99/mo Stripe subscription config",
      "Added event feedback collection framework",
      "Added mobile responsive test suite for launch readiness",
    ],
  },
  {
    date: "March 1–4, 2026",
    entries: [
      "Replaced in-memory admin sessions with stateless JWTs",
      "Built FRED audit log enrichment + admin dashboard + CSV export",
      "RLHF-lite engine, admin approval queue, close-the-loop digest (Phase 76)",
      "Full E2E regression suite for funnel version launch",
      "Resolved all TypeScript errors and lint blockers",
      "Fixed pricing page blank-page bug (opacity:0 animations)",
    ],
  },
  {
    date: "February 2026 highlights",
    entries: [
      "Standalone Vite funnel app + launch gap analysis + test coverage",
      "Whisper-powered voice input + VoiceChatOverlay",
      "Service Marketplace: provider directory, booking, FRED provider-finder tool (Phases 67-69)",
      "Content Library: Mux video player, content recommendations (Phases 66-67)",
      "Resolved 341 ESLint errors and 7 TypeScript compile errors from QA audit",
      "Rate limiting on file upload endpoints, Twilio webhook idempotency",
      "AI timeout + Promise.allSettled for graceful dashboard degradation",
      "GetStarted completion, Next Steps endpoint, Dashboard Snapshot",
    ],
  },
];

const missingAccounts = [
  {
    service: "Stripe",
    action: "Create Stripe account for Sahara, get test/live API keys, register webhook at /api/stripe/webhook",
    impact: "Payments completely non-functional",
  },
  {
    service: "PostHog",
    action: "Verify email at julian@aiacrobatics.com, then grab phc_ API key from Settings > Project",
    impact: "Analytics code integrated but tracking is offline",
  },
  {
    service: "Upstash Redis",
    action: "Create Upstash database, get REST URL + token",
    impact: "Rate limiting falls back to in-memory (not production-safe)",
  },
];

// ============================================================================
// Helper Functions
// ============================================================================

function getStatusBadge(status: Status) {
  const styles: Record<Status, string> = {
    done: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    "in-progress": "bg-amber-500/20 text-amber-400 border-amber-500/30",
    blocked: "bg-red-500/20 text-red-400 border-red-500/30",
    todo: "bg-gray-500/20 text-gray-400 border-gray-500/30",
    "not-configured": "bg-red-500/20 text-red-400 border-red-500/30",
    pass: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    configured: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  };
  const labels: Record<Status, string> = {
    done: "Done",
    "in-progress": "In Progress",
    blocked: "Blocked",
    todo: "To Do",
    "not-configured": "Not Configured",
    pass: "Pass",
    configured: "Configured",
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}

function getFeatureBadge(status: Feature["status"]) {
  const config = {
    live: { style: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30", label: "Live" },
    partial: { style: "bg-amber-500/20 text-amber-400 border-amber-500/30", label: "Partial" },
    "not-live": { style: "bg-gray-500/20 text-gray-400 border-gray-500/30", label: "Not Live" },
    blocked: { style: "bg-red-500/20 text-red-400 border-red-500/30", label: "Blocked" },
  };
  const c = config[status];
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${c.style}`}>
      {c.label}
    </span>
  );
}

function calculateReadiness(): number {
  const critical = tasks.filter((t) => t.category === "critical");
  const infra = infraItems;
  const criticalDone = critical.filter((t) => t.status === "done").length;
  const criticalTotal = critical.length;
  const infraDone = infra.filter((i) => i.status === "pass" || i.status === "configured").length;
  const infraTotal = infra.length;
  return Math.round(((criticalDone / criticalTotal) * 0.6 + (infraDone / infraTotal) * 0.4) * 100);
}

function getDaysUntilLaunch(): { days: number; label: string } {
  const now = new Date();
  const diffStart = Math.ceil((LAUNCH_START.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  const diffEnd = Math.ceil((LAUNCH_END.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diffStart > 0) return { days: diffStart, label: `${diffStart} day${diffStart !== 1 ? "s" : ""} until launch window` };
  if (diffEnd >= 0) return { days: 0, label: "Launch window is NOW" };
  return { days: diffEnd, label: `${Math.abs(diffEnd)} day${Math.abs(diffEnd) !== 1 ? "s" : ""} past launch window` };
}

function getCategoryProgress(category: string) {
  const filtered = tasks.filter((t) => t.category === category);
  const done = filtered.filter((t) => t.status === "done").length;
  return { done, total: filtered.length, pct: filtered.length > 0 ? Math.round((done / filtered.length) * 100) : 0 };
}

// ============================================================================
// Components
// ============================================================================

function ReadinessGauge({ score }: { score: number }) {
  const circumference = 2 * Math.PI * 70;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 80 ? "#10b981" : score >= 60 ? "#f59e0b" : "#ef4444";
  return (
    <div className="relative flex flex-col items-center w-[180px] h-[180px]">
      <svg width="180" height="180" className="transform -rotate-90">
        <circle cx="90" cy="90" r="70" stroke="#1f2937" strokeWidth="12" fill="none" />
        <circle cx="90" cy="90" r="70" stroke={color} strokeWidth="12" fill="none"
          strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
          className="transition-all duration-1000" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-4xl font-bold" style={{ color }}>{score}%</div>
        <div className="text-xs text-gray-400 mt-1">Launch Ready</div>
      </div>
    </div>
  );
}

function ProgressBar({ done, total, pct }: { done: number; total: number; pct: number }) {
  const color = pct === 100 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-gray-400 whitespace-nowrap">{done}/{total}</span>
    </div>
  );
}

function TaskTable({ category, label }: { category: string; label: string }) {
  const filtered = tasks.filter((t) => t.category === category);
  if (filtered.length === 0) return null;
  const progress = getCategoryProgress(category);
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-white">{label}</h3>
        <span className="text-xs text-gray-500">{progress.pct}% complete</span>
      </div>
      <div className="mb-4"><ProgressBar {...progress} /></div>
      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="text-left py-2 px-3 text-gray-400 font-medium">Task</th>
              <th className="text-left py-2 px-3 text-gray-400 font-medium w-28">Status</th>
              <th className="text-left py-2 px-3 text-gray-400 font-medium w-16">Priority</th>
              <th className="text-left py-2 px-3 text-gray-400 font-medium w-20">Linear</th>
              <th className="text-left py-2 px-3 text-gray-400 font-medium">Notes</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((task, i) => (
              <tr key={i} className="border-b border-gray-800 hover:bg-gray-800/50">
                <td className="py-3 px-3 text-gray-200 font-medium">{task.title}</td>
                <td className="py-3 px-3">{getStatusBadge(task.status)}</td>
                <td className="py-3 px-3">
                  <span className={`text-xs font-mono ${task.priority === "P0" ? "text-red-400" : task.priority === "P1" ? "text-orange-400" : task.priority === "P2" ? "text-yellow-400" : "text-gray-500"}`}>
                    {task.priority}
                  </span>
                </td>
                <td className="py-3 px-3">
                  {task.linearUrl ? (
                    <a href={task.linearUrl} target="_blank" rel="noopener noreferrer" className="text-[#ff6a1a] hover:underline text-xs">{task.linear}</a>
                  ) : <span className="text-gray-500 text-xs">—</span>}
                </td>
                <td className="py-3 px-3 text-gray-400 text-xs max-w-md">{task.notes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Mobile card layout */}
      <div className="md:hidden space-y-3">
        {filtered.map((task, i) => (
          <div key={i} className="bg-gray-900/50 border border-gray-800 rounded-lg p-4 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <span className="text-sm text-gray-200 font-medium">{task.title}</span>
              <span className={`text-xs font-mono flex-shrink-0 ${task.priority === "P0" ? "text-red-400" : task.priority === "P1" ? "text-orange-400" : task.priority === "P2" ? "text-yellow-400" : "text-gray-500"}`}>{task.priority}</span>
            </div>
            <div className="flex items-center gap-2">
              {getStatusBadge(task.status)}
              {task.linearUrl && <a href={task.linearUrl} target="_blank" rel="noopener noreferrer" className="text-[#ff6a1a] hover:underline text-xs">{task.linear}</a>}
            </div>
            <p className="text-xs text-gray-400">{task.notes}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Tab types
// ============================================================================

type TabId = "overview" | "tasks" | "features" | "infra" | "actions" | "changelog";

const tabs: { id: TabId; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "tasks", label: "Tasks" },
  { id: "features", label: "Features" },
  { id: "infra", label: "Infrastructure" },
  { id: "actions", label: "Action Items" },
  { id: "changelog", label: "Changelog" },
];

// ============================================================================
// Page
// ============================================================================

export default function LaunchDashboard() {
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const score = calculateReadiness();
  const countdown = getDaysUntilLaunch();

  const doneTasks = tasks.filter((t) => t.status === "done").length;
  const blockedTasks = tasks.filter((t) => t.status === "blocked").length;
  const inProgressTasks = tasks.filter((t) => t.status === "in-progress").length;
  const todoTasks = tasks.filter((t) => t.status === "todo").length;

  const featuresLive = features.filter((f) => f.status === "live").length;
  const featuresTotal = features.length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-white">Sahara Launch Dashboard</h1>
          <p className="text-gray-400 mt-1">AI-Powered Founder Operating System</p>
          <div className="flex flex-wrap items-center gap-4 mt-3">
            <span className="text-xs text-gray-500">Target: {LAUNCH_TARGET}</span>
            <span className="text-xs text-gray-500">Updated: {LAST_UPDATED}</span>
          </div>
          <div className="mt-4">
            <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold border ${
              countdown.days > 3 ? "bg-emerald-900/20 border-emerald-800/30 text-emerald-400"
                : countdown.days > 0 ? "bg-amber-900/20 border-amber-800/30 text-amber-400"
                : countdown.days === 0 ? "bg-[#ff6a1a]/20 border-[#ff6a1a]/30 text-[#ff6a1a] animate-pulse"
                : "bg-red-900/20 border-red-800/30 text-red-400"
            }`}>{countdown.label}</span>
          </div>
        </div>
        <div className="flex-shrink-0">
          <ReadinessGauge score={score} />
        </div>
      </div>

      {/* Quick Links Bar */}
      <div className="flex flex-wrap gap-2">
        {quickLinks.map((link) => (
          <a key={link.label} href={link.url} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium bg-gray-800/50 border border-gray-700 text-gray-300 hover:text-white hover:border-[#ff6a1a]/50 hover:bg-gray-800 transition-all">
            {link.label}
            <svg className="w-3 h-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
          </a>
        ))}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-white">{tasks.length}</div>
          <div className="text-xs text-gray-400 mt-1">Total Tasks</div>
        </div>
        <div className="bg-emerald-900/20 border border-emerald-800/30 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-emerald-400">{doneTasks}</div>
          <div className="text-xs text-gray-400 mt-1">Done</div>
        </div>
        <div className="bg-amber-900/20 border border-amber-800/30 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-amber-400">{inProgressTasks}</div>
          <div className="text-xs text-gray-400 mt-1">In Progress</div>
        </div>
        <div className="bg-red-900/20 border border-red-800/30 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-red-400">{blockedTasks}</div>
          <div className="text-xs text-gray-400 mt-1">Blocked</div>
        </div>
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-gray-300">{todoTasks}</div>
          <div className="text-xs text-gray-400 mt-1">To Do</div>
        </div>
        <div className="bg-[#ff6a1a]/10 border border-[#ff6a1a]/30 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-[#ff6a1a]">{featuresLive}/{featuresTotal}</div>
          <div className="text-xs text-gray-400 mt-1">Features Live</div>
        </div>
      </div>

      {/* Overall Progress */}
      <div className="bg-gray-800/30 border border-gray-700 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-300">Overall Progress</span>
          <span className="text-sm font-bold text-white">{Math.round((doneTasks / tasks.length) * 100)}%</span>
        </div>
        <ProgressBar done={doneTasks} total={tasks.length} pct={Math.round((doneTasks / tasks.length) * 100)} />
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-700">
        <div className="flex gap-1 overflow-x-auto">
          {tabs.map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? "bg-gray-800 text-[#ff6a1a] border border-gray-700 border-b-0"
                  : "text-gray-400 hover:text-white hover:bg-gray-800/50"
              }`}>{tab.label}</button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="bg-gray-800/30 border border-gray-700 rounded-lg p-4 md:p-6">

        {/* ---- OVERVIEW TAB ---- */}
        {activeTab === "overview" && (
          <div className="space-y-8">
            {/* Platform Stats */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Platform at a Glance</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: "Pages", value: platformStats.pages, color: "text-blue-400" },
                  { label: "API Routes", value: platformStats.apiRoutes, color: "text-purple-400" },
                  { label: "Components", value: platformStats.components, color: "text-cyan-400" },
                  { label: "DB Migrations", value: platformStats.dbMigrations, color: "text-pink-400" },
                  { label: "Test Files", value: platformStats.testFiles, color: "text-emerald-400" },
                  { label: "Tests Passing", value: platformStats.testsPassing, color: "text-emerald-400" },
                  { label: "Cron Jobs", value: platformStats.cronJobs, color: "text-amber-400" },
                  { label: "Security Headers", value: platformStats.securityHeaders, color: "text-red-400" },
                ].map((stat) => (
                  <div key={stat.label} className="bg-gray-900/50 border border-gray-800 rounded-lg p-4 text-center">
                    <div className={`text-2xl font-bold ${stat.color}`}>{stat.value.toLocaleString()}</div>
                    <div className="text-xs text-gray-400 mt-1">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Tech Stack */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Tech Stack</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {[
                  { category: "Framework", items: "Next.js 16, React 19, TypeScript" },
                  { category: "AI / LLM", items: "Vercel AI SDK 6, Anthropic, OpenAI, Google" },
                  { category: "Database", items: "Supabase (PostgreSQL), 40 migrations" },
                  { category: "Auth", items: "Supabase Auth, JWT, PKCE flow" },
                  { category: "Payments", items: "Stripe (checkout, webhooks, portal)" },
                  { category: "Voice", items: "LiveKit, Whisper voice input" },
                  { category: "Styling", items: "Tailwind CSS 4, shadcn/ui, Framer Motion" },
                  { category: "Email", items: "Resend + React Email templates" },
                  { category: "Monitoring", items: "Sentry, PostHog, health endpoints" },
                  { category: "Testing", items: "Vitest (1,070 tests), Playwright E2E" },
                  { category: "Deploy", items: "Vercel, 7 cron jobs, PWA via Serwist" },
                  { category: "Security", items: "CSP, HSTS, rate limiting, CORS" },
                ].map((item) => (
                  <div key={item.category} className="bg-gray-900/50 border border-gray-800 rounded-lg px-4 py-3">
                    <div className="text-xs text-[#ff6a1a] font-semibold mb-1">{item.category}</div>
                    <div className="text-xs text-gray-300">{item.items}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* What's Blocking Launch */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">What&apos;s Blocking Launch</h3>
              <div className="space-y-2">
                {clientActions.filter((a) => a.urgency === "blocker").map((action, i) => (
                  <div key={i} className="flex items-start gap-3 bg-red-900/10 border border-red-900/30 rounded-lg p-4">
                    <div className="w-5 h-5 rounded border-2 border-red-500/50 flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="text-sm font-medium text-white">{action.action}</div>
                      <div className="text-xs text-gray-400 mt-1">{action.notes}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ---- TASKS TAB ---- */}
        {activeTab === "tasks" && (
          <>
            <TaskTable category="critical" label="Critical Path (Must Complete)" />
            <TaskTable category="high" label="High Priority (Demo Quality)" />
            <TaskTable category="infra" label="Infrastructure" />
            <TaskTable category="deferred" label="Deferred (Post-Launch)" />
          </>
        )}

        {/* ---- FEATURES TAB ---- */}
        {activeTab === "features" && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Feature Inventory</h3>
              <span className="text-sm text-gray-400">{featuresLive} of {featuresTotal} features live</span>
            </div>
            <div className="mb-4">
              <ProgressBar done={featuresLive} total={featuresTotal} pct={Math.round((featuresLive / featuresTotal) * 100)} />
            </div>
            <div className="space-y-2">
              {features.map((feature, i) => (
                <div key={i} className="flex items-start justify-between gap-4 bg-gray-900/50 border border-gray-800 rounded-lg px-4 py-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-gray-200">{feature.name}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{feature.description}</div>
                  </div>
                  <div className="flex-shrink-0">
                    {getFeatureBadge(feature.status)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ---- INFRA TAB ---- */}
        {activeTab === "infra" && (
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Infrastructure Status</h3>
            <div className="grid gap-2">
              {infraItems.map((item, i) => (
                <div key={i} className="flex items-center justify-between bg-gray-900/50 rounded-lg px-4 py-3 border border-gray-800">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      item.status === "pass" ? "bg-emerald-400" : item.status === "configured" ? "bg-blue-400" : "bg-red-400"
                    }`} />
                    <span className="text-gray-200 font-medium text-sm">{item.component}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-gray-400 text-xs max-w-xs text-right hidden md:block">{item.notes}</span>
                    {getStatusBadge(item.status)}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center justify-between text-sm text-gray-400">
              <span>{infraItems.filter((i) => i.status === "pass").length}/{infraItems.length} fully operational</span>
              <span>{infraItems.filter((i) => i.status === "configured").length} configured, awaiting deploy</span>
            </div>
          </div>
        )}

        {/* ---- ACTION ITEMS TAB ---- */}
        {activeTab === "actions" && (
          <div>
            <h3 className="text-lg font-semibold text-white mb-2">Client Action Items</h3>
            <p className="text-sm text-gray-400 mb-6">These require manual action from the team — the engineering side cannot complete them autonomously.</p>

            {(["blocker", "needed", "nice-to-have"] as const).map((urgency) => {
              const items = clientActions.filter((a) => a.urgency === urgency);
              if (items.length === 0) return null;
              const urgencyConfig = {
                blocker: { label: "Launch Blockers", border: "border-red-900/30", bg: "bg-red-900/10", badge: "bg-red-500/20 text-red-400 border-red-500/30" },
                needed: { label: "Needed for Production Quality", border: "border-amber-900/30", bg: "bg-amber-900/10", badge: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
                "nice-to-have": { label: "Nice to Have", border: "border-gray-700", bg: "bg-gray-900/30", badge: "bg-gray-500/20 text-gray-400 border-gray-500/30" },
              };
              const c = urgencyConfig[urgency];
              return (
                <div key={urgency} className="mb-6">
                  <h4 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${c.badge}`}>
                      {c.label}
                    </span>
                  </h4>
                  <div className="space-y-2">
                    {items.map((action, i) => (
                      <div key={i} className={`${c.bg} border ${c.border} rounded-lg p-4`}>
                        <div className="flex items-start gap-3">
                          <div className={`w-5 h-5 rounded border-2 flex-shrink-0 mt-0.5 flex items-center justify-center ${
                            action.done ? "border-emerald-500 bg-emerald-500/20" : urgency === "blocker" ? "border-red-500/50" : "border-gray-600"
                          }`}>
                            {action.done && <svg className="w-3 h-3 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-white">{action.action}</div>
                            <div className="text-xs text-gray-400 mt-1">{action.notes}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}

            {/* Missing Accounts */}
            <div className="mt-8 pt-6 border-t border-gray-700">
              <h4 className="text-sm font-semibold text-gray-300 mb-3">Missing Service Accounts</h4>
              <div className="grid gap-3">
                {missingAccounts.map((item, i) => (
                  <div key={i} className="bg-red-900/10 border border-red-900/30 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-white font-semibold">{item.service}</h4>
                      {getStatusBadge("not-configured")}
                    </div>
                    <p className="text-sm text-gray-300 mb-1"><span className="text-gray-500">Action:</span> {item.action}</p>
                    <p className="text-sm text-red-400"><span className="text-gray-500">Impact:</span> {item.impact}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ---- CHANGELOG TAB ---- */}
        {activeTab === "changelog" && (
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Development Log</h3>
            {changelog.map((entry, i) => (
              <div key={i} className="mb-6">
                <h4 className="text-sm font-semibold text-[#ff6a1a] mb-2">{entry.date}</h4>
                <ul className="space-y-1.5">
                  {entry.entries.map((e, j) => (
                    <li key={j} className="text-sm text-gray-300 flex items-start gap-2">
                      <span className="text-gray-600 mt-1 flex-shrink-0">-</span>
                      {e}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="text-center text-xs text-gray-600 py-4 space-y-1">
        <div>Sahara Launch Dashboard — Last updated {LAST_UPDATED}</div>
        <div>Built by <a href="https://aiacrobatics.com" target="_blank" rel="noopener noreferrer" className="text-[#ff6a1a] hover:underline">AI Acrobatics</a></div>
      </div>
    </div>
  );
}
