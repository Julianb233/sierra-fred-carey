"use client";

/**
 * Agent Status Card Component
 * Phase 04: Studio Tier Features - Plan 04
 *
 * Displays an agent's status, task count, and last active time.
 * Includes a "New Task" button to dispatch tasks.
 * Used on the agent dashboard page.
 */

import { Bot, DollarSign, TrendingUp, Clock, CheckCircle2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { AgentType } from "@/lib/agents/types";

// ============================================================================
// Agent Display Configuration
// ============================================================================

const AGENT_CONFIG: Record<
  AgentType,
  {
    displayName: string;
    description: string;
    icon: typeof Bot;
    accentClass: string;
    bgClass: string;
  }
> = {
  founder_ops: {
    displayName: "Founder Ops",
    description:
      "Handles emails, task management, meeting prep, and weekly priorities for founders.",
    icon: Bot,
    accentClass: "text-[#ff6a1a]",
    bgClass: "bg-[#ff6a1a]/10",
  },
  fundraising: {
    displayName: "Fundraising",
    description:
      "Researches investors, drafts outreach, builds pitch strategies, and tracks your pipeline.",
    icon: DollarSign,
    accentClass: "text-blue-500",
    bgClass: "bg-blue-500/10",
  },
  growth: {
    displayName: "Growth",
    description:
      "Analyzes channels, designs experiments, optimizes funnels, and plans content strategy.",
    icon: TrendingUp,
    accentClass: "text-emerald-500",
    bgClass: "bg-emerald-500/10",
  },
};

// ============================================================================
// Component
// ============================================================================

interface AgentCardProps {
  agentType: AgentType;
  name: string;
  description: string;
  taskCount: number;
  lastActive?: string;
  onDispatch: () => void;
}

export function AgentCard({
  agentType,
  name,
  description,
  taskCount,
  lastActive,
  onDispatch,
}: AgentCardProps) {
  const config = AGENT_CONFIG[agentType];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl",
        "bg-white dark:bg-gray-900",
        "border border-gray-200 dark:border-gray-800",
        "hover:border-[#ff6a1a]/30 dark:hover:border-[#ff6a1a]/30",
        "shadow-sm hover:shadow-md",
        "transition-all duration-200",
        "p-6"
      )}
    >
      {/* Header: Icon + Name */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "w-12 h-12 rounded-lg flex items-center justify-center",
              config.bgClass
            )}
          >
            <Icon className={cn("w-6 h-6", config.accentClass)} />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">
              {name}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
              {agentType.replace("_", " ")} agent
            </p>
          </div>
        </div>
      </div>

      {/* Description */}
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
        {description}
      </p>

      {/* Stats */}
      <div className="flex items-center gap-4 mb-4">
        <div className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400">
          <CheckCircle2 className="w-4 h-4 text-green-500" />
          <span>
            {taskCount} task{taskCount !== 1 ? "s" : ""}
          </span>
        </div>
        {lastActive && (
          <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-500">
            <Clock className="w-4 h-4" />
            <span>{lastActive}</span>
          </div>
        )}
      </div>

      {/* New Task Button */}
      <Button
        onClick={onDispatch}
        variant="orange-outline"
        size="sm"
        className="w-full"
      >
        <Plus className="w-4 h-4 mr-1" />
        New Task
      </Button>
    </div>
  );
}

export { AGENT_CONFIG };
