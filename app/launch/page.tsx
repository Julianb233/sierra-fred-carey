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

// ============================================================================
// Launch Data
// ============================================================================

const LAUNCH_START = new Date("2026-03-16");
const LAUNCH_END = new Date("2026-03-20");
const LAUNCH_TARGET = "March 16–20, 2026";
const LAST_UPDATED = "March 14, 2026 — 10:00 AM PST";

const tasks: Task[] = [
  // Critical Path
  {
    title: "Configure Vercel env vars (Stripe, Resend, PostHog, Sentry, Upstash, VAPID)",
    status: "in-progress",
    linear: "AI-2573",
    linearUrl: "https://linear.app/ai-acrobatics/issue/AI-2573",
    notes: "Anthropic, Google, Resend, Sentry, CRON_SECRET done locally. Stripe, PostHog, Upstash, VAPID still need accounts created. All must be pushed to Vercel.",
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
  { component: "Build", status: "pass", notes: "221 pages compiling successfully" },
  { component: "Tests", status: "pass", notes: "63/63 files, 1070/1070 tests green" },
  { component: "SEO / Meta", status: "pass", notes: "Full metadata, robots.txt, sitemap.xml, OpenGraph" },
  { component: "Mobile Responsive", status: "pass", notes: "Viewport config, Tailwind responsive utilities" },
  { component: "PWA", status: "pass", notes: "manifest.ts, sw.ts, service worker via Serwist" },
  { component: "Security Headers", status: "pass", notes: "CSP, HSTS, X-Frame-Options, Referrer-Policy" },
  { component: "Error Pages", status: "pass", notes: "not-found.tsx, error boundaries in all sections" },
  { component: "Auth Flow", status: "pass", notes: "Signup, login, PKCE callback, password reset, admin login" },
  { component: "Cron Jobs", status: "pass", notes: "All 7 cron routes registered in vercel.json" },
  { component: "Email (Resend)", status: "configured", notes: "API key set locally — needs Vercel deploy" },
  { component: "Error Tracking (Sentry)", status: "configured", notes: "DSN set locally — needs Vercel deploy" },
  { component: "Analytics (PostHog)", status: "not-configured", notes: "No PostHog account — need to create project" },
  { component: "Rate Limiting (Upstash)", status: "not-configured", notes: "No Upstash account — in-memory fallback active" },
  { component: "Payments (Stripe)", status: "not-configured", notes: "No Sahara Stripe account exists" },
];

const changelog: ChangelogEntry[] = [
  {
    date: "March 14, 2026",
    entries: [
      "Moved launch dashboard from /admin/launch to /launch — publicly accessible without login",
      "Improved dashboard: countdown timer, progress bars per category, fixed gauge positioning, better mobile layout",
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
      "Fixed voice regression test snapshots (version 1.1.0 → 1.3.0, updated SHA-256)",
      "Fixed get-started test assertion (UI text changed)",
      "Confirmed login/password reset flow already fixed (3 prior commits)",
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
];

const missingAccounts = [
  {
    service: "Stripe",
    action: "Create Stripe account for Sahara, get test/live API keys, register webhook at /api/stripe/webhook",
    impact: "Payments completely non-functional",
  },
  {
    service: "PostHog",
    action: "Create PostHog project, get NEXT_PUBLIC_POSTHOG_KEY",
    impact: "Zero analytics — can't track user behavior or funnel conversion",
  },
  {
    service: "Upstash Redis",
    action: "Create Upstash database, get REST URL + token",
    impact: "Rate limiting falls back to in-memory (not production-safe)",
  },
  {
    service: "VAPID Keys",
    action: "Run: npx web-push generate-vapid-keys",
    impact: "Push notifications disabled",
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
    configured: "Configured (local)",
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[status]}`}>
      {labels[status]}
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

  if (diffStart > 0) {
    return { days: diffStart, label: `${diffStart} day${diffStart !== 1 ? "s" : ""} until launch window` };
  } else if (diffEnd >= 0) {
    return { days: 0, label: "Launch window is NOW" };
  } else {
    return { days: diffEnd, label: `${Math.abs(diffEnd)} day${Math.abs(diffEnd) !== 1 ? "s" : ""} past launch window` };
  }
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
        <circle
          cx="90"
          cy="90"
          r="70"
          stroke={color}
          strokeWidth="12"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-1000"
        />
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
      <div className="mb-4">
        <ProgressBar {...progress} />
      </div>

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
                    <a href={task.linearUrl} target="_blank" rel="noopener noreferrer" className="text-[#ff6a1a] hover:underline text-xs">
                      {task.linear}
                    </a>
                  ) : (
                    <span className="text-gray-500 text-xs">—</span>
                  )}
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
              <span className={`text-xs font-mono flex-shrink-0 ${task.priority === "P0" ? "text-red-400" : task.priority === "P1" ? "text-orange-400" : task.priority === "P2" ? "text-yellow-400" : "text-gray-500"}`}>
                {task.priority}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {getStatusBadge(task.status)}
              {task.linearUrl && (
                <a href={task.linearUrl} target="_blank" rel="noopener noreferrer" className="text-[#ff6a1a] hover:underline text-xs">
                  {task.linear}
                </a>
              )}
            </div>
            <p className="text-xs text-gray-400">{task.notes}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Page
// ============================================================================

export default function LaunchDashboard() {
  const [activeTab, setActiveTab] = useState<"tasks" | "infra" | "changelog" | "accounts">("tasks");
  const score = calculateReadiness();
  const countdown = getDaysUntilLaunch();

  const doneTasks = tasks.filter((t) => t.status === "done").length;
  const blockedTasks = tasks.filter((t) => t.status === "blocked").length;
  const inProgressTasks = tasks.filter((t) => t.status === "in-progress").length;
  const todoTasks = tasks.filter((t) => t.status === "todo").length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-white">Launch Dashboard</h1>
          <p className="text-gray-400 mt-1">
            Sahara — AI-Powered Founder OS —{" "}
            <a href="https://joinsahara.com" target="_blank" rel="noopener noreferrer" className="text-[#ff6a1a] hover:underline">
              joinsahara.com
            </a>
          </p>
          <div className="flex flex-wrap items-center gap-4 mt-3">
            <span className="text-xs text-gray-500">Target: {LAUNCH_TARGET}</span>
            <span className="text-xs text-gray-500">Updated: {LAST_UPDATED}</span>
          </div>
          {/* Countdown */}
          <div className="mt-4">
            <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold border ${
              countdown.days > 3
                ? "bg-emerald-900/20 border-emerald-800/30 text-emerald-400"
                : countdown.days > 0
                ? "bg-amber-900/20 border-amber-800/30 text-amber-400"
                : countdown.days === 0
                ? "bg-[#ff6a1a]/20 border-[#ff6a1a]/30 text-[#ff6a1a] animate-pulse"
                : "bg-red-900/20 border-red-800/30 text-red-400"
            }`}>
              {countdown.label}
            </span>
          </div>
        </div>
        <div className="flex-shrink-0">
          <ReadinessGauge score={score} />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
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
          {(["tasks", "infra", "changelog", "accounts"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors whitespace-nowrap ${
                activeTab === tab
                  ? "bg-gray-800 text-[#ff6a1a] border border-gray-700 border-b-0"
                  : "text-gray-400 hover:text-white hover:bg-gray-800/50"
              }`}
            >
              {tab === "tasks" ? "Tasks" : tab === "infra" ? "Infrastructure" : tab === "changelog" ? "Changelog" : "Missing Accounts"}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="bg-gray-800/30 border border-gray-700 rounded-lg p-4 md:p-6">
        {activeTab === "tasks" && (
          <>
            <TaskTable category="critical" label="Critical Path (Must Complete)" />
            <TaskTable category="high" label="High Priority (Demo Quality)" />
            <TaskTable category="infra" label="Infrastructure" />
            <TaskTable category="deferred" label="Deferred (Post-Launch)" />
          </>
        )}

        {activeTab === "infra" && (
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Infrastructure Status</h3>
            <div className="grid gap-2">
              {infraItems.map((item, i) => (
                <div key={i} className="flex items-center justify-between bg-gray-900/50 rounded-lg px-4 py-3 border border-gray-800">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      item.status === "pass" ? "bg-emerald-400" :
                      item.status === "configured" ? "bg-blue-400" :
                      "bg-red-400"
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
            <div className="mt-4 text-sm text-gray-400">
              {infraItems.filter((i) => i.status === "pass").length}/{infraItems.length} components fully operational
            </div>
          </div>
        )}

        {activeTab === "changelog" && (
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Recent Changes</h3>
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

        {activeTab === "accounts" && (
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Missing Accounts / Keys Needed</h3>
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
        )}
      </div>

      {/* Footer */}
      <div className="text-center text-xs text-gray-600 py-4">
        Sahara Launch Dashboard — Last updated {LAST_UPDATED}
      </div>
    </div>
  );
}
