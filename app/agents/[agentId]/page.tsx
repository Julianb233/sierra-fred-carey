"use client";

import { motion } from "framer-motion";
import { Zap, Target, Rocket, Inbox, ArrowLeft, Activity, TrendingUp, Clock, Sparkles } from "lucide-react";
import Link from "next/link";
import { use } from "react";
import AgentAvatar from "@/components/agents/AgentAvatar";
import AgentChat from "@/components/agents/AgentChat";
import { Button } from "@/components/ui/button";
import Footer from "@/components/footer";

const agentData = {
  "founder-ops": {
    id: "founder-ops",
    name: "Founder Ops",
    description: "Sprint planning, decisions, and founder workflows",
    color: "blue",
    icon: Zap,
    status: "active" as const,
    lastActivity: "2 minutes ago",
    tasksCompleted: 47,
    currentTask: "Analyzing Q1 OKRs",
    capabilities: [
      "Strategic planning",
      "Decision frameworks",
      "OKR tracking",
      "Priority management",
      "Team coordination",
    ],
    recentTasks: [
      { id: 1, task: "Reviewed Q1 objectives", time: "2 min ago", status: "completed" },
      { id: 2, task: "Updated sprint roadmap", time: "15 min ago", status: "completed" },
      { id: 3, task: "Analyzed decision tree", time: "1 hour ago", status: "completed" },
    ],
    suggestedPrompts: [
      "Help me prioritize this week's tasks",
      "Create a decision framework for hiring",
      "Review my Q1 OKRs progress",
      "Suggest improvements to our sprint process",
    ],
    quickActions: [
      { label: "Review OKRs", action: "okrs" },
      { label: "Plan Sprint", action: "sprint" },
      { label: "Decision Matrix", action: "decision" },
      { label: "Team Sync", action: "sync" },
    ],
  },
  "fundraise-ops": {
    id: "fundraise-ops",
    name: "Fundraise Ops",
    description: "Investor outreach, pitch prep, and fundraising strategy",
    color: "purple",
    icon: Target,
    status: "busy" as const,
    lastActivity: "5 minutes ago",
    tasksCompleted: 23,
    currentTask: "Preparing investor deck",
    capabilities: [
      "Pitch deck creation",
      "Investor research",
      "Fundraising strategy",
      "Due diligence prep",
      "Email campaigns",
    ],
    recentTasks: [
      { id: 1, task: "Updated pitch deck", time: "5 min ago", status: "in-progress" },
      { id: 2, task: "Researched Series A investors", time: "30 min ago", status: "completed" },
      { id: 3, task: "Drafted investor email", time: "2 hours ago", status: "completed" },
    ],
    suggestedPrompts: [
      "Review my pitch deck for Series A",
      "Find investors who funded similar startups",
      "Draft an email to introduce our startup",
      "Create a fundraising timeline",
    ],
    quickActions: [
      { label: "Pitch Review", action: "pitch" },
      { label: "Investor List", action: "investors" },
      { label: "Email Draft", action: "email" },
      { label: "Due Diligence", action: "dd" },
    ],
  },
  "growth-ops": {
    id: "growth-ops",
    name: "Growth Ops",
    description: "Content creation, social media, and landing pages",
    color: "green",
    icon: Rocket,
    status: "active" as const,
    lastActivity: "Just now",
    tasksCompleted: 156,
    currentTask: "Optimizing conversion funnel",
    capabilities: [
      "Landing page optimization",
      "Content creation",
      "SEO strategy",
      "Social media management",
      "Analytics tracking",
    ],
    recentTasks: [
      { id: 1, task: "Optimized landing page CTA", time: "Just now", status: "completed" },
      { id: 2, task: "Published LinkedIn post", time: "10 min ago", status: "completed" },
      { id: 3, task: "Analyzed conversion metrics", time: "1 hour ago", status: "completed" },
    ],
    suggestedPrompts: [
      "Optimize our landing page for conversions",
      "Create a content calendar for next month",
      "Analyze our funnel drop-off points",
      "Suggest A/B test ideas for the homepage",
    ],
    quickActions: [
      { label: "Page Audit", action: "audit" },
      { label: "Content Ideas", action: "content" },
      { label: "SEO Check", action: "seo" },
      { label: "Analytics", action: "analytics" },
    ],
  },
  "inbox-ops": {
    id: "inbox-ops",
    name: "Inbox Ops",
    description: "Email triage, responses, and inbox zero management",
    color: "orange",
    icon: Inbox,
    status: "idle" as const,
    lastActivity: "1 hour ago",
    tasksCompleted: 89,
    currentTask: undefined as string | undefined,
    capabilities: [
      "Email triage",
      "Response drafting",
      "Calendar management",
      "Follow-up tracking",
      "Priority filtering",
    ],
    recentTasks: [
      { id: 1, task: "Triaged 23 emails", time: "1 hour ago", status: "completed" },
      { id: 2, task: "Drafted 5 responses", time: "2 hours ago", status: "completed" },
      { id: 3, task: "Scheduled follow-ups", time: "3 hours ago", status: "completed" },
    ],
    suggestedPrompts: [
      "Triage my inbox and categorize emails",
      "Draft a response to this customer inquiry",
      "Schedule follow-ups for this week",
      "Find all emails from investors",
    ],
    quickActions: [
      { label: "Triage Inbox", action: "triage" },
      { label: "Draft Response", action: "draft" },
      { label: "Follow-ups", action: "followup" },
      { label: "Search", action: "search" },
    ],
  },
};

const colorMap = {
  blue: {
    gradient: "from-blue-500 to-blue-600",
    text: "text-blue-500",
    bg: "bg-blue-500/10",
    border: "border-blue-500/20",
  },
  purple: {
    gradient: "from-purple-500 to-purple-600",
    text: "text-purple-500",
    bg: "bg-purple-500/10",
    border: "border-purple-500/20",
  },
  green: {
    gradient: "from-green-500 to-green-600",
    text: "text-green-500",
    bg: "bg-green-500/10",
    border: "border-green-500/20",
  },
  orange: {
    gradient: "from-[#ff6a1a] to-orange-600",
    text: "text-[#ff6a1a]",
    bg: "bg-[#ff6a1a]/10",
    border: "border-[#ff6a1a]/20",
  },
};

export default function AgentDetailPage({
  params,
}: {
  params: Promise<{ agentId: string }>;
}) {
  const resolvedParams = use(params);
  const agent = agentData[resolvedParams.agentId as keyof typeof agentData];

  if (!agent) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Agent not found</h1>
          <Link href="/agents">
            <Button className="bg-[#ff6a1a] hover:bg-[#ea580c] text-white">Back to Agents</Button>
          </Link>
        </div>
      </div>
    );
  }

  const colors = colorMap[agent.color as keyof typeof colorMap];

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 relative overflow-hidden">
      {/* Background blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-30">
        <div className="absolute top-20 left-[10%] w-72 h-72 bg-[#ff6a1a]/20 rounded-full blur-[100px]" />
        <div className="absolute bottom-20 right-[15%] w-80 h-80 bg-orange-400/15 rounded-full blur-[120px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-400/10 rounded-full blur-[150px]" />
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8">
        {/* Back button */}
        <Link href="/agents">
          <Button variant="ghost" className="mb-6 text-gray-600 dark:text-gray-400 hover:text-[#ff6a1a]">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Agents
          </Button>
        </Link>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex flex-col md:flex-row items-start md:items-center gap-6 mb-12"
        >
          <AgentAvatar
            icon={agent.icon}
            color={agent.color}
            status={agent.status}
            size="xl"
          />

          <div className="flex-1">
            <h1 className={`text-4xl md:text-5xl font-bold mb-2 bg-gradient-to-r ${colors.gradient} bg-clip-text text-transparent`}>
              {agent.name}
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400 mb-4">{agent.description}</p>

            <div className="flex flex-wrap gap-2">
              {agent.capabilities.map((capability, index) => (
                <span
                  key={index}
                  className={`px-3 py-1 rounded-full ${colors.bg} ${colors.border} border text-sm text-gray-700 dark:text-gray-300`}
                >
                  {capability}
                </span>
              ))}
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Chat Area */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="lg:col-span-2"
          >
            <AgentChat
              agentName={agent.name}
              agentColor={agent.color}
              suggestedPrompts={agent.suggestedPrompts}
              quickActions={agent.quickActions}
            />
          </motion.div>

          {/* Sidebar */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="space-y-6"
          >
            {/* Stats */}
            <div className="p-6 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-gray-900 dark:text-white">
                <TrendingUp className="w-5 h-5 text-[#ff6a1a]" />
                Performance
              </h3>

              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-500">Tasks Completed</span>
                    <span className={`text-2xl font-bold ${colors.text}`}>
                      {agent.tasksCompleted}
                    </span>
                  </div>
                  <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                    <motion.div
                      className={`h-full bg-gradient-to-r ${colors.gradient}`}
                      initial={{ width: 0 }}
                      animate={{ width: "75%" }}
                      transition={{ duration: 1, delay: 0.5 }}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 text-sm">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-500">Last active:</span>
                  <span className="font-medium text-gray-700 dark:text-gray-300">{agent.lastActivity}</span>
                </div>
              </div>
            </div>

            {/* Current Task */}
            {agent.currentTask && (
              <div className={`p-6 rounded-2xl ${colors.bg} border ${colors.border}`}>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2 text-gray-900 dark:text-white">
                  <Activity className={`w-5 h-5 ${colors.text}`} />
                  Current Task
                </h3>
                <p className="text-sm text-gray-700 dark:text-gray-300">{agent.currentTask}</p>
              </div>
            )}

            {/* Recent Activity */}
            <div className="p-6 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
              <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Recent Activity</h3>
              <div className="space-y-3">
                {agent.recentTasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <div className={`w-2 h-2 mt-2 rounded-full ${
                      task.status === "completed" ? "bg-green-500" : colors.text.replace("text-", "bg-")
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{task.task}</p>
                      <p className="text-xs text-gray-500">{task.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Sign Up CTA */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="p-6 rounded-2xl bg-gradient-to-br from-[#ff6a1a] to-orange-600 text-white"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-white/20 rounded-lg">
                  <Sparkles className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-semibold">Ready to get started?</h3>
              </div>
              <p className="text-sm text-white/90 mb-4">
                Sign up for free and let our AI agents automate your startup workflows.
              </p>
              <Link href="/signup">
                <Button className="w-full bg-white text-[#ff6a1a] hover:bg-white/90 font-semibold">
                  Sign Up for Free
                </Button>
              </Link>
              <p className="text-xs text-white/70 text-center mt-3">
                No credit card required
              </p>
            </motion.div>
          </motion.div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
