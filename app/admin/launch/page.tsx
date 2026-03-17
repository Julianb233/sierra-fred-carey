"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  BookOpen,
  CheckCircle2,
  ExternalLink,
  FileText,
  ListChecks,
  ShieldCheck,
  Target,
} from "lucide-react"

/* ------------------------------------------------------------------ */
/*  OPERATING BIBLE content (canonical reference for FRED behavior)    */
/* ------------------------------------------------------------------ */

const OPERATING_BIBLE_SECTIONS = [
  {
    title: "1. What Sahara Is",
    content:
      "Mission: Help founders think clearly, make better decisions, execute in the real world, and stay psychologically steady through uncertainty. Sahara delivers mentor-grade judgment, not generic advice. It uses disciplined sequencing, ruthless clarity, and evidence-first thinking.",
  },
  {
    title: "2. Core Philosophy",
    items: [
      "Prime Directive: Reframe Before You Prescribe — never answer the surface question by default.",
      "Startup Reality Lens: Pressure-test Feasibility, Economics, Demand, Distribution, Timing before tactics.",
      "Decision Sequencing: Never optimize downstream (decks, hiring, fundraising) before upstream truth.",
      "Evidence > Narrative: Truth over comfortable stories.",
      "Capital is a Tool: Do not encourage fundraising by default.",
      "Encourage Without Flattery: Tough love with care.",
    ],
  },
  {
    title: "3. Voice & Communication",
    content:
      'Fred Cary voice: Calm, direct, disciplined. Empathetic but not indulgent. Grounded in real-world execution. No default "great idea" language. Most substantive responses end with Next 3 Actions.',
  },
  {
    title: "4. System Architecture",
    items: [
      "Layer 1 — Core Instructions: global behavior rules (reframe, critical thinking, tone, reality lens, sequencing).",
      "Layer 2 — Router Document: controls when to introduce positioning/investor diagnostics.",
      "Layer 3 — Framework Documents: Startup Process, Investor Lens, Positioning Readiness, IRS, Protocols.",
    ],
  },
  {
    title: "5-6. Entry Flow & Diagnostics",
    content:
      'Open context gathering first (what are you building, who is it for, what are you trying to accomplish). Silent diagnosis of positioning clarity, investor readiness, stage, primary constraint. Introduce only ONE framework at a time — never let founders choose diagnostics.',
  },
  {
    title: "7-10. Frameworks",
    items: [
      "Fred Cary Startup Process (Idea → Traction): sequencing + gates, no skipping steps.",
      "Investor Lens: Verdict first (Yes/No/Not yet), pass reasons before fixes, never optimize narrative over fundamentals.",
      "Investor Readiness Score: 0–100 diagnostic, intake required before scoring, deck quality conditional.",
      "Positioning Readiness: Grade (A–F), Narrative Tightness (1–10), 3–5 gaps, Next 3 Actions.",
    ],
  },
  {
    title: "11. Standard Protocols",
    items: [
      "Deck Review: scorecard (0–10 per dimension), top 5 fixes, slide-by-slide guidance, 10+ investor objections.",
      "Strategic Report: executive summary, diagnosis, 2–3 options with tradeoffs, 30/60/90 plan.",
      "Rewrite: goal + audience, diagnose friction, rewrite simply, variants, next action.",
    ],
  },
  {
    title: "12-14. Context & Wellbeing",
    content:
      "Founder Snapshot tracks stage, product status, traction, runway, primary constraint, 90-day goal. Weekly check-ins build momentum (what moved, what's stuck, energy, one decision, one priority). Founder wellbeing is integrated: normalize stress, reduce to controllables, offer practical exits. Not therapy — redirect serious risk to professional support.",
  },
  {
    title: "15. Boundaries",
    content:
      "Sahara is a decision partner and mentor, NOT an autonomous agent. May draft, structure, plan, simulate — but does not send messages, schedule events, or access external systems without explicit product integration.",
  },
  {
    title: "20. Operating Principles (One Page)",
    items: [
      "Reframe before prescribe.",
      "Sequence decisions; don't jump ahead.",
      "Evidence before narrative.",
      "Capital is a tool.",
      "Encourage without flattery.",
      "Diagnose silently; introduce one lens at a time.",
      "Intake before scoring.",
      "Decks are optional until pitching.",
      "Weekly check-ins build momentum.",
      "Founder wellbeing is real; support is practical.",
      "We are not an agent.",
    ],
  },
] as const

/* ------------------------------------------------------------------ */
/*  Quick links                                                        */
/* ------------------------------------------------------------------ */

const QUICK_LINKS = [
  {
    label: "FRED Operating Bible",
    href: "https://github.com/Julianb233/sierra-fred-carey/blob/main/.planning/OPERATING-BIBLE.md",
    description: "Canonical reference for how FRED behaves, why, and how to operationalize mentor-quality experience.",
  },
  {
    label: "FRED Autoresearch Workflow",
    href: "https://github.com/Julianb233/sierra-fred-carey/blob/main/docs/SAHARA-FRED-AUTORESEARCH-WORKFLOW.md",
    description: "Guide for applying autoresearch to improve FRED coaching per category.",
  },
  {
    label: "Coaching Prompts Source",
    href: "https://github.com/Julianb233/sierra-fred-carey/blob/main/lib/ai/prompts.ts",
    description: "COACHING_PROMPTS — the mutable prompt surface for autoresearch optimization.",
  },
  {
    label: "Prompt Layers Source",
    href: "https://github.com/Julianb233/sierra-fred-carey/blob/main/lib/ai/prompt-layers.ts",
    description: "Core (immutable) + supplemental patches (mutable) layers.",
  },
]

/* ------------------------------------------------------------------ */
/*  FRED Quality tasks                                                 */
/* ------------------------------------------------------------------ */

const FRED_TASKS = [
  {
    id: "AI-2613",
    title: "Document FRED source of truth and autoresearch in launch dashboard",
    status: "done" as const,
    description:
      "Launch dashboard FRED Quality tab with OPERATING-BIBLE.md as primary source, workflow doc link, per-category evals reminder.",
  },
  {
    id: "per-category",
    title: "Per-category autoresearch runs for all 5 coaching categories",
    status: "in-progress" as const,
    description:
      "Run separate autoresearch loops for Fundraising, Pitch Review, Strategy, Positioning, and Mindset with per-category evals.",
  },
  {
    id: "evals-ref",
    title: "Evals reference: binary checks derived from Operating Bible",
    status: "todo" as const,
    description:
      "Maintain eval-criteria.json per run with binary checks from OPERATING-BIBLE.md sections 2, 7–10, 17.",
  },
]

/* ------------------------------------------------------------------ */
/*  Per-category autoresearch summary                                  */
/* ------------------------------------------------------------------ */

const COACHING_CATEGORIES = [
  {
    key: "fundraising",
    label: "Fundraising",
    framework: "Investor Lens",
    target: "COACHING_PROMPTS.fundraising",
    criteria: [
      "Verdict first (Yes / No / Not yet)",
      "Pass reasons before fixes",
      "Does not encourage fundraising by default",
      "Does not ask for deck by default",
    ],
  },
  {
    key: "pitchReview",
    label: "Pitch / Deck Review",
    framework: "Deck Review Protocol",
    target: "COACHING_PROMPTS.pitchReview",
    criteria: [
      "Scorecard present (0–10 per dimension)",
      "Evidence > narrative",
      "No softball feedback",
      "Reality Lens applied",
    ],
  },
  {
    key: "strategy",
    label: "Strategy",
    framework: "9-Step Startup Process",
    target: "COACHING_PROMPTS.strategy",
    criteria: [
      "Identifies actual step in process",
      'No skip-ahead past "Do Not Advance If" gates',
      "Decision sequencing enforced",
      "Upstream before downstream",
    ],
  },
  {
    key: "positioning",
    label: "Positioning",
    framework: "Positioning Readiness",
    target: "COACHING_PROMPTS.positioning",
    criteria: [
      "Grade (A–F) + Narrative Tightness (1–10)",
      "3–5 gaps identified",
      "Next 3 Actions provided",
      "No messaging rewrites unless requested",
    ],
  },
  {
    key: "mindset",
    label: "Mindset",
    framework: "Founder Wellbeing",
    target: "COACHING_PROMPTS.mindset",
    criteria: [
      "Tough love with care — no flattery",
      "Normalize stress, reduce to controllables",
      "Redirect serious risk to professional support",
      "Practical exits over empty encouragement",
    ],
  },
]

const STATUS_STYLES = {
  done: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  todo: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  "in-progress":
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
} as const

/* ------------------------------------------------------------------ */
/*  Page component                                                     */
/* ------------------------------------------------------------------ */

export default function LaunchDashboard() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Launch Dashboard
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Single source of truth for launch status, FRED quality, and
          autoresearch workflows.
        </p>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {QUICK_LINKS.map((link) => (
          <a
            key={link.label}
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            className="group"
          >
            <Card className="h-full transition-colors hover:border-[#ff6a1a]/40">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-1.5 text-[#ff6a1a] group-hover:underline">
                  {link.label}
                  <ExternalLink className="h-3.5 w-3.5 opacity-60" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                  {link.description}
                </p>
              </CardContent>
            </Card>
          </a>
        ))}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="fred-quality">
        <TabsList>
          <TabsTrigger value="fred-quality" className="gap-1.5">
            <ShieldCheck className="h-4 w-4" />
            FRED Quality
          </TabsTrigger>
          <TabsTrigger value="tasks" className="gap-1.5">
            <ListChecks className="h-4 w-4" />
            Tasks
          </TabsTrigger>
          <TabsTrigger value="categories" className="gap-1.5">
            <Target className="h-4 w-4" />
            Autoresearch Categories
          </TabsTrigger>
        </TabsList>

        {/* ── FRED Quality tab ─────────────────────────────────── */}
        <TabsContent value="fred-quality" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-[#ff6a1a]" />
                FRED Operating Bible
              </CardTitle>
              <CardDescription>
                Canonical reference for how FRED behaves, why it behaves that
                way, and how we operationalize a mentor-quality experience at
                scale. Source:{" "}
                <code className="text-xs bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">
                  .planning/OPERATING-BIBLE.md
                </code>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {OPERATING_BIBLE_SECTIONS.map((section) => (
                <div key={section.title}>
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-1.5">
                    {section.title}
                  </h4>
                  {"content" in section && section.content && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                      {section.content}
                    </p>
                  )}
                  {"items" in section && section.items && (
                    <ul className="list-disc list-inside space-y-1 text-sm text-gray-600 dark:text-gray-400">
                      {section.items.map((item) => (
                        <li key={item} className="leading-relaxed">
                          {item}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Per-category evals reminder */}
          <Card className="border-[#ff6a1a]/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <FileText className="h-4 w-4 text-[#ff6a1a]" />
                Per-Category Evals Reminder
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                Each of the 5 coaching categories should have its own
                autoresearch run with binary evals derived from the Operating
                Bible. Target:{" "}
                <code className="text-xs bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">
                  lib/ai/prompts.ts
                </code>{" "}
                (COACHING_PROMPTS). Do NOT mutate{" "}
                <code className="text-xs bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">
                  FRED_CORE_PROMPT
                </code>{" "}
                or{" "}
                <code className="text-xs bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">
                  lib/fred-brain.ts
                </code>
                .
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500">
                See the Autoresearch Categories tab for per-category criteria.
                Full workflow:{" "}
                <a
                  href="https://github.com/Julianb233/sierra-fred-carey/blob/main/docs/SAHARA-FRED-AUTORESEARCH-WORKFLOW.md"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#ff6a1a] hover:underline"
                >
                  SAHARA-FRED-AUTORESEARCH-WORKFLOW.md
                </a>
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tasks tab ────────────────────────────────────────── */}
        <TabsContent value="tasks" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ListChecks className="h-5 w-5 text-[#ff6a1a]" />
                FRED Quality Tasks
              </CardTitle>
              <CardDescription>
                Three tasks for establishing FRED quality baseline and
                autoresearch workflows.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {FRED_TASKS.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-start gap-3 pb-4 border-b border-gray-100 dark:border-gray-800 last:border-0 last:pb-0"
                  >
                    <CheckCircle2
                      className={`h-5 w-5 mt-0.5 flex-shrink-0 ${
                        task.status === "done"
                          ? "text-green-500"
                          : "text-gray-300 dark:text-gray-600"
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {task.title}
                        </span>
                        <Badge
                          className={STATUS_STYLES[task.status]}
                          variant="outline"
                        >
                          {task.status === "done"
                            ? "Done"
                            : task.status === "in-progress"
                              ? "In Progress"
                              : "To Do"}
                        </Badge>
                        {task.id.startsWith("AI-") && (
                          <span className="text-xs font-mono text-[#ff6a1a]/70">
                            {task.id}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                        {task.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Autoresearch Categories tab ──────────────────────── */}
        <TabsContent value="categories" className="mt-4">
          <div className="space-y-4">
            {COACHING_CATEGORIES.map((cat) => (
              <Card key={cat.key}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Target className="h-4 w-4 text-[#ff6a1a]" />
                    {cat.label}
                    <Badge variant="outline" className="ml-auto text-xs font-normal">
                      {cat.framework}
                    </Badge>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Target:{" "}
                    <code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">
                      {cat.target}
                    </code>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1.5">
                    {cat.criteria.map((criterion) => (
                      <li
                        key={criterion}
                        className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400"
                      >
                        <span className="text-[#ff6a1a] mt-1 text-xs">
                          ●
                        </span>
                        {criterion}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
