"use client";

import { motion } from "framer-motion";
import { Zap, Target, Rocket, Inbox, Sparkles, ArrowRight, Share2, FileEdit, HeartHandshake, Layers, Calculator, Scale } from "lucide-react";
import Link from "next/link";
import AgentCard from "@/components/agents/AgentCard";
import { Button } from "@/components/ui/button";

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
  {
    id: "social-media-ops",
    name: "Social Media Manager",
    description: "Content scheduling, engagement tracking, and brand voice management",
    color: "pink",
    icon: Share2,
    status: "active",
    lastActivity: "10 minutes ago",
    tasksCompleted: 78,
    currentTask: "Scheduling LinkedIn posts",
  },
  {
    id: "copywriting-ops",
    name: "Copywriting Pro",
    description: "Sales copy, landing pages, email sequences, and ad creative",
    color: "indigo",
    icon: FileEdit,
    status: "active",
    lastActivity: "15 minutes ago",
    tasksCompleted: 112,
    currentTask: "Drafting email sequence",
  },
  {
    id: "customer-ops",
    name: "Customer Success",
    description: "Customer onboarding, support templates, and feedback analysis",
    color: "teal",
    icon: HeartHandshake,
    status: "idle",
    lastActivity: "30 minutes ago",
    tasksCompleted: 45,
  },
  {
    id: "product-ops",
    name: "Product Manager",
    description: "Feature prioritization, roadmap planning, and user story creation",
    color: "cyan",
    icon: Layers,
    status: "active",
    lastActivity: "5 minutes ago",
    tasksCompleted: 67,
    currentTask: "Updating product roadmap",
  },
  {
    id: "finance-ops",
    name: "Finance & Ops",
    description: "Invoicing, expense tracking, and financial projections",
    color: "emerald",
    icon: Calculator,
    status: "idle",
    lastActivity: "2 hours ago",
    tasksCompleted: 34,
  },
  {
    id: "legal-ops",
    name: "Legal Assistant",
    description: "Contract templates, compliance checks, and terms of service",
    color: "slate",
    icon: Scale,
    status: "idle",
    lastActivity: "1 day ago",
    tasksCompleted: 23,
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
    <div className="min-h-screen bg-white dark:bg-gray-950 relative overflow-hidden">
      {/* Background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-30">
        <motion.div
          className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#ff6a1a]/20 rounded-full blur-[100px]"
          animate={{
            x: [0, 50, 0],
            y: [0, -25, 0],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-orange-400/15 rounded-full blur-[120px]"
          animate={{
            x: [0, -50, 0],
            y: [0, 25, 0],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute top-1/2 right-1/3 w-80 h-80 bg-amber-400/10 rounded-full blur-[100px]"
          animate={{
            x: [0, 25, 0],
            y: [0, -50, 0],
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
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#ff6a1a]/10 border border-[#ff6a1a]/20 mb-6"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-sm font-medium text-[#ff6a1a]">All Systems Operational</span>
          </motion.div>

          <h1 className="text-5xl md:text-7xl font-bold mb-6 text-gray-900 dark:text-white">
            Virtual Team <span className="text-[#ff6a1a]">Agents</span>
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
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
          <div className="p-6 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-lg">
            <div className="text-3xl font-bold text-[#ff6a1a] mb-2">
              674
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Total Tasks Completed</div>
          </div>

          <div className="p-6 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-lg">
            <div className="text-3xl font-bold text-orange-500 mb-2">
              6 / 10
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Agents Active</div>
          </div>

          <div className="p-6 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-lg">
            <div className="text-3xl font-bold text-amber-500 mb-2">
              98%
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Success Rate</div>
          </div>
        </motion.div>

        {/* Sign Up CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1 }}
          className="mt-16 max-w-4xl mx-auto"
        >
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#ff6a1a] to-orange-600 p-8 md:p-12">
            {/* Background decoration */}
            <div className="absolute inset-0 overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full blur-2xl -translate-x-1/2 translate-y-1/2" />
            </div>

            <div className="relative z-10 text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 mb-6">
                <Sparkles className="w-4 h-4 text-white" />
                <span className="text-sm font-medium text-white">Start Free Today</span>
              </div>

              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Ready to automate your startup?
              </h2>
              <p className="text-lg text-white/90 mb-8 max-w-xl mx-auto">
                Sign up for free and get instant access to all AI agents.
                No credit card required.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link href="/signup">
                  <Button className="bg-white text-[#ff6a1a] hover:bg-white/90 font-semibold px-8 py-6 text-lg">
                    Sign Up for Free
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </Link>
                <Link href="/demo">
                  <Button variant="outline" className="border-white/50 text-white hover:bg-white/10 px-8 py-6 text-lg">
                    Watch Demo
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
