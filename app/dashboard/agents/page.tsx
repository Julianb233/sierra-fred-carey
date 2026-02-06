"use client";

/**
 * Agent Dashboard Page
 * Phase 04: Studio Tier Features - Plan 04
 *
 * Displays the Virtual Team: 3 agent cards in a responsive grid,
 * a dispatch modal for sending tasks, and a task history list.
 * Studio tier gated - non-Studio users see a locked overlay.
 */

import { useState, useEffect, useCallback } from "react";
import { Bot, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AgentCard, AGENT_CONFIG } from "@/components/agents/agent-card";
import { AgentTaskList } from "@/components/agents/agent-task-list";
import { DispatchTaskModal } from "@/components/agents/dispatch-task-modal";
import { FeatureLock } from "@/components/tier/feature-lock";
import { useUserTier } from "@/lib/context/tier-context";
import { UserTier } from "@/lib/constants";
import type { AgentType, AgentTask } from "@/lib/agents/types";

// ============================================================================
// Types
// ============================================================================

interface AgentStats {
  agentType: AgentType;
  taskCount: number;
  lastActive?: string;
}

// ============================================================================
// Page Component
// ============================================================================

export default function AgentsPage() {
  // Tier check
  const { tier: userTier, isLoading: isTierLoading } = useUserTier();

  // State
  const [tasks, setTasks] = useState<AgentTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAgentType, setSelectedAgentType] = useState<
    AgentType | undefined
  >(undefined);

  // Fetch tasks
  const fetchTasks = useCallback(async () => {
    try {
      const response = await fetch("/api/agents/tasks?limit=50");
      if (!response.ok) {
        if (response.status === 401) {
          setError("Please sign in to view agent tasks.");
          return;
        }
        throw new Error("Failed to fetch tasks");
      }
      const data = await response.json();
      if (data.success) {
        // Map date strings back to Date objects
        const mappedTasks: AgentTask[] = (data.tasks || []).map(
          (t: Record<string, unknown>) => ({
            ...t,
            createdAt: new Date(t.createdAt as string),
            updatedAt: new Date(t.updatedAt as string),
            startedAt: t.startedAt
              ? new Date(t.startedAt as string)
              : undefined,
            completedAt: t.completedAt
              ? new Date(t.completedAt as string)
              : undefined,
          })
        );
        setTasks(mappedTasks);
      }
    } catch (err) {
      console.error("[AgentsPage] Error fetching tasks:", err);
      setError("Failed to load agent tasks.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Compute per-agent stats from tasks
  const agentStats: AgentStats[] = (
    ["founder_ops", "fundraising", "growth"] as AgentType[]
  ).map((type) => {
    const agentTasks = tasks.filter((t) => t.agentType === type);
    const lastTask = agentTasks[0]; // Already sorted by created_at desc
    return {
      agentType: type,
      taskCount: agentTasks.length,
      lastActive: lastTask
        ? formatRelativeTime(lastTask.createdAt)
        : undefined,
    };
  });

  // Dispatch handler
  const handleDispatch = (agentType: AgentType) => {
    setSelectedAgentType(agentType);
    setIsModalOpen(true);
  };

  // Callback when task is dispatched
  const handleTaskDispatched = (_taskId: string) => {
    // Refetch task list to include the new task
    fetchTasks();
  };

  // Loading skeleton while tier is resolving
  if (isTierLoading) {
    return (
      <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-5 w-96" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Page Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <Users className="w-8 h-8 text-[#ff6a1a]" />
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
            Virtual Team
          </h1>
          <Badge className="bg-[#ff6a1a] hover:bg-[#ff6a1a]/90 text-white">
            Studio
          </Badge>
        </div>
        <p className="text-gray-600 dark:text-gray-400">
          Your AI-powered team of specialist agents
        </p>
      </div>

      {/* Feature Lock Wrapper */}
      <FeatureLock
        requiredTier={UserTier.STUDIO}
        currentTier={userTier}
        featureName="Virtual Team"
        description="Access your AI-powered team of specialist agents with a Studio tier subscription."
      >
        {/* Agent Cards Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <AgentCardSkeleton key={i} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {agentStats.map((stats) => {
              const config = AGENT_CONFIG[stats.agentType];
              return (
                <AgentCard
                  key={stats.agentType}
                  agentType={stats.agentType}
                  name={config.displayName}
                  description={config.description}
                  taskCount={stats.taskCount}
                  lastActive={stats.lastActive}
                  onDispatch={() => handleDispatch(stats.agentType)}
                />
              );
            })}
          </div>
        )}

        {/* Task History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-gray-500" />
              Task History
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <TaskListSkeleton />
            ) : error ? (
              <div className="text-center py-8 px-4">
                <p className="text-sm text-red-500">{error}</p>
              </div>
            ) : (
              <AgentTaskList tasks={tasks} />
            )}
          </CardContent>
        </Card>
      </FeatureLock>

      {/* Dispatch Modal */}
      <DispatchTaskModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedAgentType(undefined);
        }}
        defaultAgentType={selectedAgentType}
        onTaskDispatched={handleTaskDispatched}
      />
    </div>
  );
}

// ============================================================================
// Skeleton Components
// ============================================================================

function AgentCardSkeleton() {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-6 space-y-4">
      <div className="flex items-center gap-3">
        <Skeleton className="w-12 h-12 rounded-lg" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-32" />
        </div>
      </div>
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
      <div className="flex gap-4">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-20" />
      </div>
      <Skeleton className="h-8 w-full rounded-md" />
    </div>
  );
}

function TaskListSkeleton() {
  return (
    <div className="divide-y divide-gray-200 dark:divide-gray-800">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-3">
          <Skeleton className="w-5 h-5" />
          <Skeleton className="w-20 h-4" />
          <Skeleton className="w-24 h-4" />
          <Skeleton className="flex-1 h-4" />
          <Skeleton className="w-16 h-5 rounded-full" />
          <Skeleton className="w-16 h-4" />
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// Helpers
// ============================================================================

function formatRelativeTime(date: Date): string {
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
