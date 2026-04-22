"use client"

import { useSearchParams } from "next/navigation"
import { Suspense } from "react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  healthMetrics,
  milestones,
  featureStatuses,
  outstandingItems,
  readinessCategories,
  summaryStats,
  READINESS_ACCESS_TOKEN,
  type StatusLevel,
} from "@/lib/data/production-readiness"
import {
  CheckCircledIcon,
  CrossCircledIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  RocketIcon,
  LightningBoltIcon,
} from "@radix-ui/react-icons"

// ─── Status Helpers ──────────────────────────────────────────────────────────

function statusColor(status: StatusLevel) {
  switch (status) {
    case "complete":
      return "text-emerald-400"
    case "on-track":
      return "text-blue-400"
    case "at-risk":
      return "text-amber-400"
    case "blocked":
      return "text-red-400"
    case "not-started":
      return "text-zinc-500"
  }
}

function statusBg(status: StatusLevel) {
  switch (status) {
    case "complete":
      return "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
    case "on-track":
      return "bg-blue-500/10 border-blue-500/20 text-blue-400"
    case "at-risk":
      return "bg-amber-500/10 border-amber-500/20 text-amber-400"
    case "blocked":
      return "bg-red-500/10 border-red-500/20 text-red-400"
    case "not-started":
      return "bg-zinc-500/10 border-zinc-500/20 text-zinc-500"
  }
}

function StatusIcon({ status, className = "w-4 h-4" }: { status: StatusLevel; className?: string }) {
  switch (status) {
    case "complete":
      return <CheckCircledIcon className={`${className} text-emerald-400`} />
    case "on-track":
      return <ClockIcon className={`${className} text-blue-400`} />
    case "at-risk":
      return <ExclamationTriangleIcon className={`${className} text-amber-400`} />
    case "blocked":
      return <CrossCircledIcon className={`${className} text-red-400`} />
    case "not-started":
      return <ClockIcon className={`${className} text-zinc-500`} />
  }
}

function severityBadge(severity: string) {
  switch (severity) {
    case "critical":
      return "bg-red-500/20 text-red-300 border-red-500/30"
    case "high":
      return "bg-amber-500/20 text-amber-300 border-amber-500/30"
    case "medium":
      return "bg-blue-500/20 text-blue-300 border-blue-500/30"
    case "low":
      return "bg-zinc-500/20 text-zinc-400 border-zinc-500/30"
    default:
      return "bg-zinc-500/20 text-zinc-400 border-zinc-500/30"
  }
}

// ─── Dashboard Content ───────────────────────────────────────────────────────

function ReadinessDashboard() {
  const searchParams = useSearchParams()
  const token = searchParams.get("token")

  if (token !== READINESS_ACCESS_TOKEN) {
    return (
      <div className="min-h-dvh bg-[#080808] flex items-center justify-center">
        <Card className="bg-zinc-900/80 border-zinc-800 max-w-md mx-auto">
          <CardContent className="text-center py-12 px-8">
            <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center mx-auto mb-4">
              <ExclamationTriangleIcon className="w-8 h-8 text-zinc-500" />
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">Access Required</h2>
            <p className="text-zinc-400 text-sm">
              This dashboard requires a valid access token. Please use the link
              provided by the Sahara team.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const totalReadiness = readinessCategories.reduce((acc, c) => acc + c.score, 0)
  const totalMax = readinessCategories.reduce((acc, c) => acc + c.maxScore, 0)
  const readinessPercent = Math.round((totalReadiness / totalMax) * 100)

  return (
    <div className="min-h-dvh bg-[#080808] text-white">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center">
                <RocketIcon className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">Sahara Production Readiness</h1>
                <p className="text-xs text-zinc-400">AI-Powered Founder Operating System</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge className="bg-emerald-500/10 border-emerald-500/20 text-emerald-400 text-xs">
                Live on joinsahara.com
              </Badge>
              <span className="text-xs text-zinc-500">
                Updated {summaryStats.lastUpdated}
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* ── Hero Stats ──────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-zinc-900/80 border-zinc-800">
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-4xl font-bold text-orange-400">{readinessPercent}%</div>
                <div className="text-xs text-zinc-400 mt-1">Overall Readiness</div>
                <Progress
                  value={readinessPercent}
                  className="mt-3 h-2 bg-zinc-800"
                  indicatorClassName="bg-gradient-to-r from-orange-500 to-amber-500"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900/80 border-zinc-800">
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-4xl font-bold text-emerald-400">
                  {summaryStats.milestonesComplete}/{summaryStats.milestonesTotal}
                </div>
                <div className="text-xs text-zinc-400 mt-1">Milestones Complete</div>
                <Progress
                  value={(summaryStats.milestonesComplete / summaryStats.milestonesTotal) * 100}
                  className="mt-3 h-2 bg-zinc-800"
                  indicatorClassName="bg-emerald-500"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900/80 border-zinc-800">
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-4xl font-bold text-blue-400">
                  {summaryStats.testsPassng.toLocaleString()}
                </div>
                <div className="text-xs text-zinc-400 mt-1">Tests Passing</div>
                <div className="mt-3 flex items-center justify-center gap-1.5">
                  <CheckCircledIcon className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-xs text-emerald-400">0 failures</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900/80 border-zinc-800">
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-4xl font-bold text-purple-400">
                  {summaryStats.buildPages}
                </div>
                <div className="text-xs text-zinc-400 mt-1">Pages Built</div>
                <div className="mt-3 flex items-center justify-center gap-1.5">
                  <CheckCircledIcon className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-xs text-emerald-400">Clean build</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── Platform Health ─────────────────────────────────────────────── */}
        <Card className="bg-zinc-900/80 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <LightningBoltIcon className="w-5 h-5 text-orange-400" />
              Platform Health
            </CardTitle>
            <CardDescription>Real-time infrastructure and code quality metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {healthMetrics.map((metric) => (
                <div
                  key={metric.label}
                  className="flex items-start gap-3 p-3 rounded-lg bg-zinc-800/50 border border-zinc-700/50"
                >
                  <StatusIcon status={metric.status} className="w-5 h-5 mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-white">{metric.label}</div>
                    <div className={`text-sm font-semibold ${statusColor(metric.status)}`}>
                      {metric.value}
                    </div>
                    {metric.detail && (
                      <div className="text-xs text-zinc-500 mt-0.5 leading-tight">
                        {metric.detail}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* ── Milestone Progress ──────────────────────────────────────────── */}
        <Card className="bg-zinc-900/80 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <RocketIcon className="w-5 h-5 text-orange-400" />
              Milestone Progress
            </CardTitle>
            <CardDescription>
              {summaryStats.phasesComplete} of {summaryStats.totalPhases} phases shipped across{" "}
              {summaryStats.milestonesTotal} milestones
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {milestones.map((ms) => {
                const pct = Math.round((ms.phasesComplete / ms.phasesTotal) * 100)
                return (
                  <div
                    key={ms.version}
                    className="p-4 rounded-lg bg-zinc-800/50 border border-zinc-700/50"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <StatusIcon status={ms.status} />
                        <span className="font-semibold text-white">{ms.version}</span>
                        <span className="text-zinc-400 text-sm">{ms.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-zinc-500">
                          {ms.phasesComplete}/{ms.phasesTotal} phases
                        </span>
                        {ms.completedDate && (
                          <Badge
                            className={`text-xs ${statusBg(ms.status)} border`}
                          >
                            {ms.completedDate}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Progress
                      value={pct}
                      className="h-1.5 bg-zinc-700 mb-3"
                      indicatorClassName={
                        ms.status === "complete"
                          ? "bg-emerald-500"
                          : ms.status === "on-track"
                          ? "bg-blue-500"
                          : "bg-amber-500"
                      }
                    />
                    <div className="flex flex-wrap gap-1.5">
                      {ms.highlights.map((h, i) => (
                        <span
                          key={i}
                          className="text-xs px-2 py-0.5 rounded-full bg-zinc-700/60 text-zinc-300"
                        >
                          {h}
                        </span>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* ── Readiness Categories ────────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {readinessCategories.map((cat) => {
            const pct = Math.round((cat.score / cat.maxScore) * 100)
            return (
              <Card key={cat.name} className="bg-zinc-900/80 border-zinc-800">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-white text-base">{cat.name}</CardTitle>
                    <span className={`text-sm font-bold ${pct === 100 ? "text-emerald-400" : pct >= 70 ? "text-blue-400" : "text-amber-400"}`}>
                      {cat.score}/{cat.maxScore}
                    </span>
                  </div>
                  <Progress
                    value={pct}
                    className="h-1.5 bg-zinc-800"
                    indicatorClassName={
                      pct === 100
                        ? "bg-emerald-500"
                        : pct >= 70
                        ? "bg-blue-500"
                        : "bg-amber-500"
                    }
                  />
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {cat.items.map((item) => (
                      <div key={item.label} className="flex items-start gap-2">
                        {item.done ? (
                          <CheckCircledIcon className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                        ) : (
                          <CrossCircledIcon className="w-4 h-4 text-zinc-500 mt-0.5 shrink-0" />
                        )}
                        <div className="min-w-0">
                          <span className={`text-sm ${item.done ? "text-zinc-300" : "text-zinc-500"}`}>
                            {item.label}
                          </span>
                          {item.note && (
                            <span className="text-xs text-amber-400/70 ml-1.5">
                              — {item.note}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* ── Feature Status by Tier ──────────────────────────────────────── */}
        <Card className="bg-zinc-900/80 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white">Feature Status by Tier</CardTitle>
            <CardDescription>
              {featureStatuses.filter((f) => f.status === "complete").length} of{" "}
              {featureStatuses.length} features complete
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-700/50">
                    <th className="text-left py-2 px-3 text-zinc-400 font-medium">Feature</th>
                    <th className="text-left py-2 px-3 text-zinc-400 font-medium">Tier</th>
                    <th className="text-left py-2 px-3 text-zinc-400 font-medium">Status</th>
                    <th className="text-left py-2 px-3 text-zinc-400 font-medium">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {featureStatuses.map((feat) => (
                    <tr key={feat.name} className="border-b border-zinc-800/50">
                      <td className="py-2 px-3 text-zinc-200">{feat.name}</td>
                      <td className="py-2 px-3">
                        <Badge
                          className={`text-xs border ${
                            feat.tier === "Free"
                              ? "bg-zinc-700/50 text-zinc-300 border-zinc-600"
                              : feat.tier === "Pro"
                              ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                              : feat.tier === "Studio"
                              ? "bg-purple-500/10 text-purple-400 border-purple-500/20"
                              : "bg-orange-500/10 text-orange-400 border-orange-500/20"
                          }`}
                        >
                          {feat.tier}
                        </Badge>
                      </td>
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-1.5">
                          <StatusIcon status={feat.status} className="w-3.5 h-3.5" />
                          <span className={`text-xs font-medium capitalize ${statusColor(feat.status)}`}>
                            {feat.status.replace("-", " ")}
                          </span>
                        </div>
                      </td>
                      <td className="py-2 px-3 text-xs text-zinc-500">{feat.notes || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* ── Outstanding Items ────────────────────────────────────────────── */}
        <Card className="bg-zinc-900/80 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <ExclamationTriangleIcon className="w-5 h-5 text-amber-400" />
              Outstanding Items ({outstandingItems.filter((i) => i.status === "open").length} open)
            </CardTitle>
            <CardDescription>
              Items that need attention before or shortly after launch
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {outstandingItems.map((item) => (
                <div
                  key={item.id}
                  className="p-4 rounded-lg bg-zinc-800/50 border border-zinc-700/50"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className={`text-xs border ${severityBadge(item.severity)}`}>
                          {item.severity}
                        </Badge>
                        <Badge className="text-xs bg-zinc-700/50 text-zinc-400 border-zinc-600">
                          {item.category}
                        </Badge>
                        <span className="text-sm font-medium text-white">{item.title}</span>
                      </div>
                      <p className="text-xs text-zinc-400 leading-relaxed mt-1">{item.detail}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xs text-zinc-500">Owner: <span className="text-zinc-300">{item.owner}</span></div>
                      <div className="text-xs text-zinc-500">Effort: <span className="text-zinc-300">{item.effort}</span></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* ── Summary & Next Steps ────────────────────────────────────────── */}
        <Card className="bg-gradient-to-br from-zinc-900 to-zinc-900/80 border-orange-500/20">
          <CardHeader>
            <CardTitle className="text-white text-xl">Summary & Recommendation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
              <h3 className="text-emerald-400 font-semibold mb-2">Platform is Production-Ready</h3>
              <p className="text-zinc-300 text-sm leading-relaxed">
                Sahara has shipped <strong>82 phases across 8 milestones</strong> with a clean codebase
                (1,048 tests passing, 0 TypeScript errors, 0 lint errors). The core platform — FRED
                cognitive engine, Oases journey framework, tier gating, Stripe payments, and all
                Pro-tier features — is fully operational on <strong>joinsahara.com</strong>.
              </p>
            </div>

            <div className="p-4 rounded-lg bg-amber-500/5 border border-amber-500/20">
              <h3 className="text-amber-400 font-semibold mb-2">Remaining Work is Configuration & Content</h3>
              <p className="text-zinc-300 text-sm leading-relaxed">
                The 8 open items are almost entirely <strong>configuration and content</strong> — not engineering.
                Environment variables to add (Sentry, Mux), content to upload, providers to onboard,
                and one compliance registration (Twilio 10DLC). No code changes needed for core launch.
              </p>
            </div>

            <div className="p-4 rounded-lg bg-blue-500/5 border border-blue-500/20">
              <h3 className="text-blue-400 font-semibold mb-2">Recommended Next Steps</h3>
              <ol className="text-zinc-300 text-sm space-y-1.5 list-decimal list-inside">
                <li>Add Sentry env vars to Vercel (30 min — enables error visibility)</li>
                <li>Run DB migrations 062 + 063 on production Supabase (30 min)</li>
                <li>Start Twilio A2P 10DLC registration (4-week lead time)</li>
                <li>Add Mux credentials and upload initial course content</li>
                <li>Seed 5-10 service providers in the marketplace</li>
                <li>Configure Stripe Connect Express for marketplace payments</li>
                <li>Full QA pass with stakeholders on production</li>
              </ol>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <footer className="text-center py-8 border-t border-zinc-800">
          <p className="text-xs text-zinc-600">
            Sahara Production Readiness Dashboard — Confidential
          </p>
          <p className="text-xs text-zinc-700 mt-1">
            Built by AI Acrobatics for the Sahara founding team
          </p>
        </footer>
      </main>
    </div>
  )
}

// ─── Page Export (with Suspense for useSearchParams) ──────────────────────────

export default function ProductionReadinessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-dvh bg-[#080808] flex items-center justify-center">
          <div className="text-zinc-400 text-sm">Loading dashboard...</div>
        </div>
      }
    >
      <ReadinessDashboard />
    </Suspense>
  )
}
