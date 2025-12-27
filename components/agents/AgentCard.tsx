"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { LucideIcon, Activity, Clock, CheckCircle2, ArrowRight } from "lucide-react";
import { Card3D } from "@/components/premium/Card3D";
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
    gradient: "from-blue-500/20 to-blue-600/20",
    border: "border-blue-500/30",
    glow: "shadow-blue-500/20 hover:shadow-blue-500/40",
    text: "text-blue-500",
    bg: "bg-blue-500/10",
  },
  purple: {
    gradient: "from-purple-500/20 to-purple-600/20",
    border: "border-purple-500/30",
    glow: "shadow-purple-500/20 hover:shadow-purple-500/40",
    text: "text-purple-500",
    bg: "bg-purple-500/10",
  },
  green: {
    gradient: "from-green-500/20 to-green-600/20",
    border: "border-green-500/30",
    glow: "shadow-green-500/20 hover:shadow-green-500/40",
    text: "text-green-500",
    bg: "bg-green-500/10",
  },
  orange: {
    gradient: "from-orange-500/20 to-orange-600/20",
    border: "border-orange-500/30",
    glow: "shadow-orange-500/20 hover:shadow-orange-500/40",
    text: "text-orange-500",
    bg: "bg-orange-500/10",
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
    color: "bg-yellow-500",
    pulse: true,
  },
  idle: {
    label: "Idle",
    color: "bg-gray-500",
    pulse: false,
  },
};

export default function AgentCard({ agent }: AgentCardProps) {
  const colors = colorMap[agent.color as keyof typeof colorMap];
  const status = statusConfig[agent.status];

  return (
    <Link href={`/agents/${agent.id}`}>
      <Card3D
        className={`group relative overflow-hidden rounded-2xl bg-gradient-to-br from-white/5 to-white/0 border backdrop-blur-xl
          ${colors.border} ${colors.glow} transition-all duration-500 hover:scale-[1.02]`}
        rotationIntensity={6}
      >
        {/* Gradient overlay */}
        <div className={`absolute inset-0 bg-gradient-to-br ${colors.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />

        {/* Animated gradient border on hover */}
        <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500">
          <div className={`absolute inset-0 rounded-2xl bg-gradient-to-r ${colors.gradient} blur-xl`} />
        </div>

        <div className="relative z-10 p-6">
          {/* Header with Avatar and Status */}
          <div className="flex items-start justify-between mb-4">
            <AgentAvatar
              icon={agent.icon}
              color={agent.color}
              status={agent.status}
              size="lg"
            />

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm">
              <div className={`w-2 h-2 rounded-full ${status.color} ${status.pulse ? "animate-pulse" : ""}`} />
              <span className="text-xs font-medium">{status.label}</span>
            </div>
          </div>

          {/* Agent Name and Description */}
          <div className="mb-6">
            <h3 className="text-2xl font-bold mb-2 group-hover:translate-x-1 transition-transform duration-300">
              {agent.name}
            </h3>
            <p className="text-sm text-muted-foreground line-clamp-2">
              {agent.description}
            </p>
          </div>

          {/* Current Task */}
          {agent.currentTask && (
            <div className={`mb-4 p-3 rounded-lg ${colors.bg} border ${colors.border}`}>
              <div className="flex items-start gap-2">
                <Activity className={`w-4 h-4 mt-0.5 ${colors.text}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground mb-1">Currently Working On</p>
                  <p className="text-sm font-medium truncate">{agent.currentTask}</p>
                </div>
              </div>
            </div>
          )}

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="p-3 rounded-lg bg-white/5 border border-white/10">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Completed</span>
              </div>
              <p className={`text-xl font-bold ${colors.text}`}>{agent.tasksCompleted}</p>
            </div>

            <div className="p-3 rounded-lg bg-white/5 border border-white/10">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Last Active</span>
              </div>
              <p className="text-sm font-medium">{agent.lastActivity}</p>
            </div>
          </div>

          {/* Activity Sparkline (mock data) */}
          <div className="mb-4">
            <div className="flex items-end gap-1 h-12">
              {Array.from({ length: 12 }).map((_, i) => {
                const height = Math.random() * 100;
                return (
                  <motion.div
                    key={i}
                    className={`flex-1 rounded-t ${colors.bg} opacity-50 group-hover:opacity-100 transition-opacity`}
                    initial={{ height: 0 }}
                    animate={{ height: `${height}%` }}
                    transition={{ duration: 0.5, delay: i * 0.05 }}
                  />
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground mt-2">Activity last 24h</p>
          </div>

          {/* CTA */}
          <div className="flex items-center justify-between pt-4 border-t border-white/10">
            <span className="text-sm font-medium">View Details</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </Card3D>
    </Link>
  );
}
