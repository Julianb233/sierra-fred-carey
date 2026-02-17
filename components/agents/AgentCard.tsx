"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { LucideIcon, Activity, Clock, CheckCircle2, ArrowRight } from "lucide-react";
import AgentAvatar from "./AgentAvatar";

type AgentStatus = "active" | "idle" | "busy";

interface AgentCardProps {
  agent: {
    id: string;
    name: string;
    description: string;
    color: string;
    icon: LucideIcon;
    status: AgentStatus;
    lastActivity: string;
    tasksCompleted: number;
    currentTask?: string;
  };
}

const colorMap = {
  blue: {
    gradient: "from-[#ff6a1a]/20 to-orange-400/20",
    border: "border-[#ff6a1a]/30",
    glow: "shadow-[#ff6a1a]/10 hover:shadow-[#ff6a1a]/20",
    text: "text-[#ff6a1a]",
    bg: "bg-[#ff6a1a]/10",
  },
  purple: {
    gradient: "from-orange-500/20 to-amber-500/20",
    border: "border-orange-500/30",
    glow: "shadow-orange-500/10 hover:shadow-orange-500/20",
    text: "text-orange-500",
    bg: "bg-orange-500/10",
  },
  green: {
    gradient: "from-amber-500/20 to-orange-400/20",
    border: "border-amber-500/30",
    glow: "shadow-amber-500/10 hover:shadow-amber-500/20",
    text: "text-amber-500",
    bg: "bg-amber-500/10",
  },
  orange: {
    gradient: "from-[#ff6a1a]/20 to-orange-600/20",
    border: "border-[#ff6a1a]/30",
    glow: "shadow-[#ff6a1a]/10 hover:shadow-[#ff6a1a]/20",
    text: "text-[#ff6a1a]",
    bg: "bg-[#ff6a1a]/10",
  },
  pink: {
    gradient: "from-pink-500/20 to-pink-600/20",
    border: "border-pink-500/30",
    glow: "shadow-pink-500/10 hover:shadow-pink-500/20",
    text: "text-pink-500",
    bg: "bg-pink-500/10",
  },
  indigo: {
    gradient: "from-indigo-500/20 to-indigo-600/20",
    border: "border-indigo-500/30",
    glow: "shadow-indigo-500/10 hover:shadow-indigo-500/20",
    text: "text-indigo-500",
    bg: "bg-indigo-500/10",
  },
  teal: {
    gradient: "from-teal-500/20 to-teal-600/20",
    border: "border-teal-500/30",
    glow: "shadow-teal-500/10 hover:shadow-teal-500/20",
    text: "text-teal-500",
    bg: "bg-teal-500/10",
  },
  cyan: {
    gradient: "from-cyan-500/20 to-cyan-600/20",
    border: "border-cyan-500/30",
    glow: "shadow-cyan-500/10 hover:shadow-cyan-500/20",
    text: "text-cyan-500",
    bg: "bg-cyan-500/10",
  },
  emerald: {
    gradient: "from-emerald-500/20 to-emerald-600/20",
    border: "border-emerald-500/30",
    glow: "shadow-emerald-500/10 hover:shadow-emerald-500/20",
    text: "text-emerald-500",
    bg: "bg-emerald-500/10",
  },
  slate: {
    gradient: "from-slate-500/20 to-slate-600/20",
    border: "border-slate-500/30",
    glow: "shadow-slate-500/10 hover:shadow-slate-500/20",
    text: "text-slate-500",
    bg: "bg-slate-500/10",
  },
};

const statusConfig = {
  active: {
    label: "Active",
    color: "bg-green-500",
    pulse: true,
  },
  busy: {
    label: "Busy",
    color: "bg-amber-500",
    pulse: true,
  },
  idle: {
    label: "Idle",
    color: "bg-gray-400",
    pulse: false,
  },
};

export default function AgentCard({ agent }: AgentCardProps) {
  const colors = colorMap[agent.color as keyof typeof colorMap];
  const status = statusConfig[agent.status];

  return (
    <Link href={`/agents/${agent.id}`}>
      <motion.div
        className={`group relative overflow-hidden rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800
          hover:border-[#ff6a1a]/30 shadow-lg hover:shadow-xl transition-all duration-300`}
        whileHover={{ y: -4 }}
      >
        <div className="relative z-10 p-6">
          {/* Header with Avatar and Status */}
          <div className="flex items-start justify-between mb-4">
            <AgentAvatar
              icon={agent.icon}
              color={agent.color}
              status={agent.status}
              size="lg"
            />

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
              <div className={`w-2 h-2 rounded-full ${status.color} ${status.pulse ? "animate-pulse" : ""}`} />
              <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{status.label}</span>
            </div>
          </div>

          {/* Agent Name and Description */}
          <div className="mb-6">
            <h3 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white group-hover:text-[#ff6a1a] transition-colors">
              {agent.name}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
              {agent.description}
            </p>
          </div>

          {/* Current Task */}
          {agent.currentTask && (
            <div className={`mb-4 p-3 rounded-lg ${colors.bg} border ${colors.border}`}>
              <div className="flex items-start gap-2">
                <Activity className={`w-4 h-4 mt-0.5 ${colors.text}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Currently Working On</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{agent.currentTask}</p>
                </div>
              </div>
            </div>
          )}

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-gray-500" />
                <span className="text-xs text-gray-500">Completed</span>
              </div>
              <p className={`text-xl font-bold ${colors.text}`}>{agent.tasksCompleted}</p>
            </div>

            <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="w-3.5 h-3.5 text-gray-500" />
                <span className="text-xs text-gray-500">Last Active</span>
              </div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">{agent.lastActivity}</p>
            </div>
          </div>

          {/* CTA */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-800">
            <span className="text-sm font-medium text-gray-900 dark:text-white group-hover:text-[#ff6a1a] transition-colors">View Details</span>
            <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-[#ff6a1a] group-hover:translate-x-1 transition-all" />
          </div>
        </div>
      </motion.div>
    </Link>
  );
}
