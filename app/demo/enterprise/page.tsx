"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import Footer from "@/components/footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { FUNNEL_URL } from "@/lib/constants";
import {
  Users,
  LifeBuoy,
  Wallet,
  ShieldCheck,
  Briefcase,
  Lock,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Network,
  Send,
  Building2,
} from "lucide-react";

// ---------------------------------------------------------------------------
// AI-3523 — Enterprise multi-agent demo sandbox
//
// Built for William Hood's enterprise sales pitches. Demonstrates a fleet of
// enterprise AI agents (HR chatbot, IT helpdesk, Finance, Security, Sales) that
// integrate with common enterprise systems, plus an interactive role-based
// permission matrix so a prospect can see exactly how access is governed before
// any agent touches sensitive data.
// ---------------------------------------------------------------------------

type Role = "admin" | "manager" | "employee" | "contractor";

const ROLES: { id: Role; label: string; blurb: string }[] = [
  { id: "admin", label: "IT Admin", blurb: "Full governance & configuration" },
  { id: "manager", label: "People Manager", blurb: "Team-scoped operational access" },
  { id: "employee", label: "Employee", blurb: "Self-service requests only" },
  { id: "contractor", label: "Contractor", blurb: "Least-privilege, time-boxed" },
];

type Agent = {
  id: string;
  name: string;
  role: string;
  description: string;
  icon: typeof Users;
  color: string;
  integrations: string[];
  // default permission per role — the prospect can toggle these live
  defaults: Record<Role, boolean>;
  sample: { prompt: string; allowed: string; denied: string };
};

const AGENTS: Agent[] = [
  {
    id: "hr",
    name: "Amelia HR",
    role: "HR Chatbot",
    description:
      "Answers PTO balances, benefits, and policy questions; files leave requests and onboarding tasks.",
    icon: Users,
    color: "#ff6a1a",
    integrations: ["Workday", "BambooHR", "Slack", "Gmail"],
    defaults: { admin: true, manager: true, employee: true, contractor: false },
    sample: {
      prompt: "How many PTO days do I have left this quarter?",
      allowed:
        "You have 6.5 PTO days remaining this quarter. Want me to file a request? I can route approval to your manager automatically.",
      denied:
        "I can't share PTO balances for your role. Contractors don't accrue PTO in Workday — please contact your staffing coordinator.",
    },
  },
  {
    id: "it",
    name: "Autonomics IT",
    role: "IT Helpdesk AI",
    description:
      "Resolves access requests, password resets, VPN issues, and provisions software via approved workflows.",
    icon: LifeBuoy,
    color: "#3b82f6",
    integrations: ["ServiceNow", "Okta", "Jira", "Intune"],
    defaults: { admin: true, manager: true, employee: true, contractor: true },
    sample: {
      prompt: "I'm locked out of Okta and need access to the Figma workspace.",
      allowed:
        "Unlocked your Okta account and sent a verification push. Figma access needs manager sign-off — I've opened ServiceNow ticket INC-48213 and notified your approver.",
      denied:
        "Account unlock is available, but software provisioning for your role requires a sponsor. I've flagged this to IT Admin for review.",
    },
  },
  {
    id: "finance",
    name: "Ledger Finance",
    role: "Finance Ops AI",
    description:
      "Handles expense submissions, PO status, vendor lookups, and budget-vs-actual questions.",
    icon: Wallet,
    color: "#22c55e",
    integrations: ["NetSuite", "Ramp", "Expensify", "QuickBooks"],
    defaults: { admin: true, manager: true, employee: false, contractor: false },
    sample: {
      prompt: "What's our remaining Q3 marketing budget?",
      allowed:
        "Q3 marketing budget: $420k allocated, $311k spent, $109k remaining (74% utilized). I can break this down by campaign or vendor.",
      denied:
        "Budget figures are restricted to managers and finance admins. I can still help you submit an expense or check a reimbursement status.",
    },
  },
  {
    id: "security",
    name: "Sentry Security",
    role: "Security & Compliance AI",
    description:
      "Surfaces access reviews, flags risky permissions, and answers SOC 2 / policy compliance questions.",
    icon: ShieldCheck,
    color: "#a855f7",
    integrations: ["CrowdStrike", "Okta", "Vanta", "AWS IAM"],
    defaults: { admin: true, manager: false, employee: false, contractor: false },
    sample: {
      prompt: "Show me everyone with production database access.",
      allowed:
        "12 identities have prod DB access. 2 are stale (no login in 90 days) — recommend revoking. Want me to open an access-review task in Vanta?",
      denied:
        "Access-review data is admin-only under your SOC 2 controls. This request has been logged to the audit trail.",
    },
  },
  {
    id: "sales",
    name: "Pipeline Sales",
    role: "Sales Ops AI",
    description:
      "Pulls account history, drafts follow-ups, and updates CRM records inside approved territories.",
    icon: Briefcase,
    color: "#f59e0b",
    integrations: ["Salesforce", "HubSpot", "Gong", "Outreach"],
    defaults: { admin: true, manager: true, employee: true, contractor: false },
    sample: {
      prompt: "Summarize the Acme account and draft a renewal email.",
      allowed:
        "Acme: $84k ARR, renewal in 38 days, last QBR flagged onboarding friction. Drafted a renewal email referencing their new use case — review before send?",
      denied:
        "That account sits outside your assigned territory. I can only surface accounts you own. Ask your manager to extend territory scope.",
    },
  },
];

export default function EnterpriseDemoPage() {
  // permission matrix state, seeded from each agent's defaults
  const [permissions, setPermissions] = useState<Record<string, Record<Role, boolean>>>(
    () => Object.fromEntries(AGENTS.map((a) => [a.id, { ...a.defaults }])),
  );
  const [activeRole, setActiveRole] = useState<Role>("employee");
  const [activeAgentId, setActiveAgentId] = useState<string>("hr");

  const activeAgent = AGENTS.find((a) => a.id === activeAgentId)!;
  const isAllowed = permissions[activeAgentId][activeRole];

  const toggle = (agentId: string, role: Role) =>
    setPermissions((prev) => ({
      ...prev,
      [agentId]: { ...prev[agentId], [role]: !prev[agentId][role] },
    }));

  const grantedCount = useMemo(
    () => AGENTS.filter((a) => permissions[a.id][activeRole]).length,
    [permissions, activeRole],
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-gray-50 to-white dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <Badge className="mb-4 bg-[#ff6a1a]/10 text-[#ff6a1a] border-[#ff6a1a]/20">
              <Building2 className="h-3.5 w-3.5 mr-1.5" />
              Enterprise Sandbox
            </Badge>
            <h1 className="text-4xl sm:text-5xl font-bold mb-4">
              Multi-Agent{" "}
              <span className="bg-gradient-to-r from-[#ff6a1a] via-orange-500 to-[#ff6a1a] bg-clip-text text-transparent">
                Enterprise
              </span>{" "}
              Integrations
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              A fleet of governed AI agents — HR, IT, Finance, Security, and Sales —
              wired into your stack with role-based permissions you control. Pick a
              role, set what each agent can touch, then watch it respect those rules
              live.
            </p>
          </div>

          {/* Role selector */}
          <div className="mb-10">
            <div className="flex items-center gap-2 mb-3 text-sm font-medium text-gray-500 dark:text-gray-400">
              <Lock className="h-4 w-4" />
              Acting as role
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {ROLES.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setActiveRole(r.id)}
                  className={`text-left p-4 rounded-xl border transition-all ${
                    activeRole === r.id
                      ? "border-[#ff6a1a] bg-[#ff6a1a]/5 ring-1 ring-[#ff6a1a]/30"
                      : "border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 hover:border-[#ff6a1a]/30"
                  }`}
                >
                  <div className="font-semibold text-gray-900 dark:text-white">
                    {r.label}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {r.blurb}
                  </div>
                </button>
              ))}
            </div>
            <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
              <span className="font-semibold text-[#ff6a1a]">{grantedCount}</span> of{" "}
              {AGENTS.length} agents are available to{" "}
              <span className="font-medium">
                {ROLES.find((r) => r.id === activeRole)!.label}
              </span>{" "}
              with the current settings.
            </p>
          </div>

          {/* Permission matrix */}
          <div className="mb-12 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center gap-2">
              <Network className="h-5 w-5 text-[#ff6a1a]" />
              <h2 className="font-semibold text-gray-900 dark:text-white">
                Permission Matrix
              </h2>
              <span className="text-sm text-gray-500 dark:text-gray-400 ml-auto">
                Toggle access per role — changes apply to the simulator below
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 dark:text-gray-400">
                    <th className="px-6 py-3 font-medium">Agent</th>
                    {ROLES.map((r) => (
                      <th key={r.id} className="px-4 py-3 font-medium text-center">
                        {r.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {AGENTS.map((a) => {
                    const Icon = a.icon;
                    return (
                      <tr
                        key={a.id}
                        className="border-t border-gray-100 dark:border-gray-900"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div
                              className="p-2 rounded-lg shrink-0"
                              style={{ backgroundColor: `${a.color}1a`, color: a.color }}
                            >
                              <Icon className="h-4 w-4" />
                            </div>
                            <div>
                              <div className="font-medium text-gray-900 dark:text-white">
                                {a.name}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                {a.role}
                              </div>
                            </div>
                          </div>
                        </td>
                        {ROLES.map((r) => (
                          <td key={r.id} className="px-4 py-4 text-center">
                            <div className="flex justify-center">
                              <Switch
                                checked={permissions[a.id][r.id]}
                                onCheckedChange={() => toggle(a.id, r.id)}
                                aria-label={`${a.name} access for ${r.label}`}
                              />
                            </div>
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Agent grid + simulator */}
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Agent picker */}
            <div className="space-y-3">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                Agent Fleet
              </h3>
              {AGENTS.map((a) => {
                const Icon = a.icon;
                const allowed = permissions[a.id][activeRole];
                return (
                  <button
                    key={a.id}
                    onClick={() => setActiveAgentId(a.id)}
                    className={`w-full text-left p-4 rounded-xl border transition-all ${
                      activeAgentId === a.id
                        ? "border-[#ff6a1a] ring-1 ring-[#ff6a1a]/30"
                        : "border-gray-200 dark:border-gray-800 hover:border-[#ff6a1a]/30"
                    } bg-white dark:bg-gray-950`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className="p-2.5 rounded-lg shrink-0"
                        style={{ backgroundColor: `${a.color}1a`, color: a.color }}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-900 dark:text-white">
                            {a.name}
                          </span>
                          {allowed ? (
                            <Badge className="bg-green-500/10 text-green-600 border-green-500/20 text-[10px] px-1.5 py-0">
                              Permitted
                            </Badge>
                          ) : (
                            <Badge className="bg-red-500/10 text-red-600 border-red-500/20 text-[10px] px-1.5 py-0">
                              Restricted
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {a.description}
                        </p>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {a.integrations.map((i) => (
                            <span
                              key={i}
                              className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300"
                            >
                              {i}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Simulator */}
            <div className="lg:sticky lg:top-6 h-fit">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
                Permission-Aware Simulator
              </h3>
              <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 overflow-hidden">
                <div
                  className="px-5 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center gap-3"
                  style={{ backgroundColor: `${activeAgent.color}0d` }}
                >
                  <div
                    className="p-2 rounded-lg"
                    style={{
                      backgroundColor: `${activeAgent.color}1a`,
                      color: activeAgent.color,
                    }}
                  >
                    <activeAgent.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900 dark:text-white">
                      {activeAgent.name}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Responding to {ROLES.find((r) => r.id === activeRole)!.label}
                    </div>
                  </div>
                </div>

                <div className="p-5 space-y-4 min-h-[260px]">
                  {/* user prompt */}
                  <div className="flex justify-end">
                    <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-[#ff6a1a] text-white px-4 py-2.5 text-sm">
                      {activeAgent.sample.prompt}
                    </div>
                  </div>

                  {/* agent response */}
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={`${activeAgentId}-${activeRole}-${isAllowed}`}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.25 }}
                      className="flex justify-start"
                    >
                      <div className="max-w-[90%] space-y-2">
                        <div
                          className={`rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm border ${
                            isAllowed
                              ? "bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-gray-800 dark:text-gray-200"
                              : "bg-red-500/5 border-red-500/20 text-gray-800 dark:text-gray-200"
                          }`}
                        >
                          {isAllowed
                            ? activeAgent.sample.allowed
                            : activeAgent.sample.denied}
                        </div>
                        <div
                          className={`flex items-center gap-1.5 text-xs font-medium ${
                            isAllowed ? "text-green-600" : "text-red-600"
                          }`}
                        >
                          {isAllowed ? (
                            <>
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Access granted — request fulfilled within policy
                            </>
                          ) : (
                            <>
                              <XCircle className="h-3.5 w-3.5" />
                              Access denied — logged to audit trail
                            </>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  </AnimatePresence>
                </div>

                <div className="px-5 py-3 border-t border-gray-200 dark:border-gray-800 flex items-center gap-2 bg-gray-50 dark:bg-gray-900/50">
                  <input
                    disabled
                    placeholder="Try toggling this agent's permission above…"
                    className="flex-1 bg-transparent text-sm text-gray-500 dark:text-gray-400 outline-none cursor-not-allowed"
                  />
                  <Send className="h-4 w-4 text-gray-400" />
                </div>
              </div>

              <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
                Every action is scoped to the role&apos;s permissions, executed only
                through approved integrations, and written to an immutable audit log.
              </p>
            </div>
          </div>

          {/* CTA */}
          <div className="mt-16 text-center rounded-2xl border border-[#ff6a1a]/20 bg-[#ff6a1a]/5 px-6 py-10">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Ready to deploy governed agents in your org?
            </h2>
            <p className="text-gray-600 dark:text-gray-400 max-w-xl mx-auto mb-6">
              Sahara wires multi-agent automation into your enterprise stack with
              SSO, role-based permissions, and full auditability from day one.
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              <Button asChild className="bg-[#ff6a1a] hover:bg-[#ea580c]">
                <a href={FUNNEL_URL} target="_blank" rel="noopener noreferrer">
                  Book an enterprise demo
                  <ArrowRight className="h-4 w-4 ml-1.5" />
                </a>
              </Button>
              <Button asChild variant="outline">
                <Link href="/demo">Explore other demos</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
}
