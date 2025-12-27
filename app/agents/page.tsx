"use client";

import { motion } from "framer-motion";
import { Zap, Target, Rocket, Inbox } from "lucide-react";
import AgentCard from "@/components/agents/AgentCard";

export type AgentType = {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: typeof Zap;
  status: "active" | "idle" | "busy";
  lastActivity: string;
  tasksCompleted: number;
  currentTask?: string;
};

const agents: AgentType[] = [
  {
    id: "founder-ops",
    name: "Founder Ops",
    description: "Sprint planning, decisions, and founder workflows",
    color: "blue",
    icon: Zap,
    status: "active",
    lastActivity: "2 minutes ago",
    tasksCompleted: 47,
    currentTask: "Analyzing Q1 OKRs",
  },
  {
    id: "fundraise-ops",
    name: "Fundraise Ops",
    description: "Investor outreach, pitch prep, and fundraising strategy",
    color: "purple",
    icon: Target,
    status: "busy",
    lastActivity: "5 minutes ago",
    tasksCompleted: 23,
    currentTask: "Preparing investor deck",
  },
  {
    id: "growth-ops",
    name: "Growth Ops",
    description: "Content creation, social media, and landing pages",
    color: "green",
    icon: Rocket,
    status: "active",
    lastActivity: "Just now",
    tasksCompleted: 156,
    currentTask: "Optimizing conversion funnel",
  },
  {
    id: "inbox-ops",
    name: "Inbox Ops",
    description: "Email triage, responses, and inbox zero management",
    color: "orange",
    icon: Inbox,
    status: "idle",
    lastActivity: "1 hour ago",
    tasksCompleted: 89,
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
    },
  },
};

export default function AgentsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-background/80 relative overflow-hidden">
      {/* Floating orbs background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"
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
        <motion.div
          className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"
          animate={{
            x: [0, -100, 0],
            y: [0, 50, 0],
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute top-1/2 right-1/3 w-80 h-80 bg-green-500/10 rounded-full blur-3xl"
          animate={{
            x: [0, 50, 0],
            y: [0, -100, 0],
            scale: [1, 1.3, 1],
          }}
          transition={{
            duration: 30,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </div>

      <div className="relative z-10 container mx-auto px-4 py-16">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="text-center mb-16"
        >
          <motion.div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-green-500/10 border border-white/10 backdrop-blur-sm mb-6"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-sm font-medium">All Systems Operational</span>
          </motion.div>

          <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-blue-500 via-purple-500 to-green-500 bg-clip-text text-transparent">
            Virtual Team Agents
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Your AI-powered team, working 24/7 to accelerate your startup journey
          </p>
        </motion.div>

        {/* Agent Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-6xl mx-auto"
        >
          {agents.map((agent) => (
            <motion.div key={agent.id} variants={itemVariants}>
              <AgentCard agent={agent} />
            </motion.div>
          ))}
        </motion.div>

        {/* Stats Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto"
        >
          <div className="p-6 rounded-2xl bg-gradient-to-br from-white/5 to-white/0 border border-white/10 backdrop-blur-sm">
            <div className="text-3xl font-bold bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent mb-2">
              315
            </div>
            <div className="text-sm text-muted-foreground">Total Tasks Completed</div>
          </div>

          <div className="p-6 rounded-2xl bg-gradient-to-br from-white/5 to-white/0 border border-white/10 backdrop-blur-sm">
            <div className="text-3xl font-bold bg-gradient-to-r from-purple-500 to-green-500 bg-clip-text text-transparent mb-2">
              3 / 4
            </div>
            <div className="text-sm text-muted-foreground">Agents Active</div>
          </div>

          <div className="p-6 rounded-2xl bg-gradient-to-br from-white/5 to-white/0 border border-white/10 backdrop-blur-sm">
            <div className="text-3xl font-bold bg-gradient-to-r from-green-500 to-blue-500 bg-clip-text text-transparent mb-2">
              98%
            </div>
            <div className="text-sm text-muted-foreground">Success Rate</div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
