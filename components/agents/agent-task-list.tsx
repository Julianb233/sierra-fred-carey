"use client";

/**
 * Agent Task List Component
 * Phase 04: Studio Tier Features - Plan 04
 *
 * Renders a list of agent tasks with columns for agent type, task type,
 * description, status (color-coded badge), and created date.
 * Clicking a task row expands to show full output.
 */

import { useState } from "react";
import { ChevronDown, ChevronRight, Bot, DollarSign, TrendingUp, Inbox } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { AgentTask, AgentType, AgentStatus } from "@/lib/agents/types";

// ============================================================================
// Status Badge Configuration
// ============================================================================

const STATUS_CONFIG: Record<
  AgentStatus,
  { label: string; className: string }
> = {
  pending: {
    label: "Pending",
    className:
      "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800",
  },
  running: {
    label: "Running",
    className:
      "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800",
  },
  complete: {
    label: "Complete",
    className:
      "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800",
  },
  failed: {
    label: "Failed",
    className:
      "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800",
  },
  cancelled: {
    label: "Cancelled",
    className:
      "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 border-gray-200 dark:border-gray-700",
  },
};

const AGENT_ICON: Record<AgentType, typeof Bot> = {
  founder_ops: Bot,
  fundraising: DollarSign,
  growth: TrendingUp,
};

const AGENT_DISPLAY_NAME: Record<AgentType, string> = {
  founder_ops: "Founder Ops",
  fundraising: "Fundraising",
  growth: "Growth",
};

// ============================================================================
// Component
// ============================================================================

interface AgentTaskListProps {
  tasks: AgentTask[];
}

export function AgentTaskList({ tasks }: AgentTaskListProps) {
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);

  if (tasks.length === 0) {
    return (
      <div className="text-center py-12 px-4">
        <Inbox className="w-12 h-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          No agent tasks yet
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Dispatch a task to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-200 dark:divide-gray-800">
      {tasks.map((task) => {
        const isExpanded = expandedTaskId === task.id;
        const statusConfig = STATUS_CONFIG[task.status];
        const AgentIcon = AGENT_ICON[task.agentType];
        const agentName = AGENT_DISPLAY_NAME[task.agentType];

        return (
          <div key={task.id} className="group">
            {/* Task Row */}
            <button
              onClick={() =>
                setExpandedTaskId(isExpanded ? null : task.id)
              }
              className={cn(
                "w-full flex items-center gap-4 px-4 py-3",
                "text-left",
                "hover:bg-gray-50 dark:hover:bg-gray-800/50",
                "transition-colors duration-150"
              )}
            >
              {/* Expand indicator */}
              <div className="flex-shrink-0 w-5 text-gray-400">
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </div>

              {/* Agent Type Badge */}
              <div className="flex-shrink-0">
                <div className="flex items-center gap-1.5">
                  <AgentIcon className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-400 whitespace-nowrap">
                    {agentName}
                  </span>
                </div>
              </div>

              {/* Task Type */}
              <div className="flex-shrink-0 w-32">
                <span className="text-xs font-mono text-gray-500 dark:text-gray-500 truncate block">
                  {task.taskType}
                </span>
              </div>

              {/* Description (truncated) */}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-900 dark:text-white truncate">
                  {task.description}
                </p>
              </div>

              {/* Status Badge */}
              <div className="flex-shrink-0">
                <Badge
                  variant="outline"
                  className={cn(
                    "text-xs font-medium",
                    statusConfig.className
                  )}
                >
                  {statusConfig.label}
                </Badge>
              </div>

              {/* Created Date */}
              <div className="flex-shrink-0 w-24 text-right">
                <span className="text-xs text-gray-500 dark:text-gray-500">
                  {formatDate(task.createdAt)}
                </span>
              </div>
            </button>

            {/* Expanded Detail */}
            {isExpanded && (
              <div className="px-4 pb-4 pl-14">
                <div className="rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 p-4">
                  {/* Full Description */}
                  <div className="mb-3">
                    <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                      Description
                    </h4>
                    <p className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap">
                      {task.description}
                    </p>
                  </div>

                  {/* Output (if complete) */}
                  {task.output && (
                    <div className="mb-3">
                      <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                        Output
                      </h4>
                      <pre className="text-xs text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-900 rounded p-3 overflow-x-auto border border-gray-200 dark:border-gray-700 max-h-64 overflow-y-auto">
                        {typeof task.output === "string"
                          ? task.output
                          : JSON.stringify(task.output, null, 2)}
                      </pre>
                    </div>
                  )}

                  {/* Error (if failed) */}
                  {task.error && (
                    <div className="mb-3">
                      <h4 className="text-xs font-medium text-red-500 uppercase tracking-wider mb-1">
                        Error
                      </h4>
                      <p className="text-sm text-red-600 dark:text-red-400">
                        {task.error}
                      </p>
                    </div>
                  )}

                  {/* Metadata */}
                  <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-500">
                    <span>ID: {task.id.slice(0, 8)}...</span>
                    {task.startedAt && (
                      <span>Started: {formatDateTime(task.startedAt)}</span>
                    )}
                    {task.completedAt && (
                      <span>
                        Completed: {formatDateTime(task.completedAt)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ============================================================================
// Helpers
// ============================================================================

function formatDate(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function formatDateTime(date: Date): string {
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
