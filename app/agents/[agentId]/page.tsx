"use client";

import { motion } from "framer-motion";
import { Zap, Target, Rocket, Inbox, ArrowLeft, Activity, TrendingUp, Clock } from "lucide-react";
import Link from "next/link";
import { use } from "react";
import AgentAvatar from "@/components/agents/AgentAvatar";
import AgentChat from "@/components/agents/AgentChat";
import { Button } from "@/components/ui/button";

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
    glow: "bg-blue-500/20",
  },
  purple: {
    gradient: "from-purple-500 to-purple-600",
    text: "text-purple-500",
    bg: "bg-purple-500/10",
    glow: "bg-purple-500/20",
  },
  green: {
    gradient: "from-green-500 to-green-600",
    text: "text-green-500",
    bg: "bg-green-500/10",
    glow: "bg-green-500/20",
  },
  orange: {
    gradient: "from-orange-500 to-orange-600",
    text: "text-orange-500",
    bg: "bg-orange-500/10",
    glow: "bg-orange-500/20",
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
    return <div>Agent not found</div>;
  }

  const colors = colorMap[agent.color as keyof typeof colorMap];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-background/80 relative overflow-hidden">
      {/* Floating orb background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className={`absolute top-1/4 right-1/4 w-96 h-96 ${colors.glow} rounded-full blur-3xl`}
          animate={{
            x: [0, 100, 0],
            y: [0, -50, 0],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8">
        {/* Back button */}
        <Link href="/agents">
          <Button variant="ghost" className="mb-6">
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
            <p className="text-lg text-muted-foreground mb-4">{agent.description}</p>

            <div className="flex flex-wrap gap-2">
              {agent.capabilities.map((capability, index) => (
                <span
                  key={index}
                  className={`px-3 py-1 rounded-full ${colors.bg} border border-white/10 text-sm`}
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
            <div className="p-6 rounded-2xl bg-gradient-to-br from-white/5 to-white/0 border border-white/10 backdrop-blur-xl">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Performance
              </h3>

              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">Tasks Completed</span>
                    <span className={`text-2xl font-bold ${colors.text}`}>
                      {agent.tasksCompleted}
                    </span>
                  </div>
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <motion.div
                      className={`h-full bg-gradient-to-r ${colors.gradient}`}
                      initial={{ width: 0 }}
                      animate={{ width: "75%" }}
                      transition={{ duration: 1, delay: 0.5 }}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 text-sm">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Last active:</span>
                  <span className="font-medium">{agent.lastActivity}</span>
                </div>
              </div>
            </div>

            {/* Current Task */}
            {agent.currentTask && (
              <div className={`p-6 rounded-2xl ${colors.bg} border border-white/10 backdrop-blur-xl`}>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Activity className={`w-5 h-5 ${colors.text}`} />
                  Current Task
                </h3>
                <p className="text-sm">{agent.currentTask}</p>
              </div>
            )}

            {/* Recent Activity */}
            <div className="p-6 rounded-2xl bg-gradient-to-br from-white/5 to-white/0 border border-white/10 backdrop-blur-xl">
              <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
              <div className="space-y-3">
                {agent.recentTasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-start gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                  >
                    <div className={`w-2 h-2 mt-2 rounded-full ${
                      task.status === "completed" ? "bg-green-500" : colors.text
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{task.task}</p>
                      <p className="text-xs text-muted-foreground">{task.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
