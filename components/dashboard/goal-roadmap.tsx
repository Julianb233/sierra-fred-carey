"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  Circle,
  Loader2,
  Target,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { FounderGoal } from "@/lib/goals/goal-service";

// ============================================================================
// Category Config
// ============================================================================

const CATEGORY_CONFIG: Record<string, { label: string; color: string }> = {
  validation: {
    label: "Validation",
    color: "text-purple-600 dark:text-purple-400",
  },
  product: {
    label: "Product",
    color: "text-blue-600 dark:text-blue-400",
  },
  growth: {
    label: "Growth",
    color: "text-green-600 dark:text-green-400",
  },
  fundraising: {
    label: "Fundraising",
    color: "text-[#ff6a1a]",
  },
  strategy: {
    label: "Strategy",
    color: "text-amber-600 dark:text-amber-400",
  },
};

// ============================================================================
// Goal Card
// ============================================================================

function GoalCard({
  goal,
  stepNumber,
  isCurrentStep,
  onToggle,
}: {
  goal: FounderGoal;
  stepNumber: number;
  isCurrentStep: boolean;
  onToggle: (goalId: string, completed: boolean) => Promise<void>;
}) {
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [optimisticCompleted, setOptimisticCompleted] = useState(goal.completed);
  const categoryConfig = CATEGORY_CONFIG[goal.category] || CATEGORY_CONFIG.strategy;

  async function handleToggle() {
    const newState = !optimisticCompleted;
    setOptimisticCompleted(newState);
    setLoading(true);
    try {
      await onToggle(goal.id, newState);
    } catch {
      setOptimisticCompleted(!newState);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className={cn(
        "relative flex items-start gap-4 py-4",
        isCurrentStep && !optimisticCompleted && "bg-[#ff6a1a]/5 -mx-4 px-4 rounded-xl"
      )}
    >
      {/* Step indicator */}
      <div className="flex flex-col items-center gap-1 pt-0.5">
        <button
          onClick={handleToggle}
          disabled={loading}
          className={cn(
            "flex-shrink-0 transition-all",
            optimisticCompleted
              ? "text-green-500 dark:text-green-400"
              : isCurrentStep
                ? "text-[#ff6a1a] hover:text-[#ea580c]"
                : "text-gray-300 dark:text-gray-600 hover:text-gray-400"
          )}
        >
          {loading ? (
            <Loader2 className="h-6 w-6 animate-spin" />
          ) : optimisticCompleted ? (
            <CheckCircle2 className="h-6 w-6" />
          ) : (
            <Circle className="h-6 w-6" />
          )}
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "text-xs font-bold uppercase tracking-wider",
                optimisticCompleted
                  ? "text-gray-400 dark:text-gray-500"
                  : isCurrentStep
                    ? "text-[#ff6a1a]"
                    : "text-gray-400 dark:text-gray-500"
              )}
            >
              Step {stepNumber}
            </span>
            <span className={cn("text-xs font-medium", categoryConfig.color)}>
              {categoryConfig.label}
            </span>
          </div>
        </div>

        <h4
          className={cn(
            "text-sm font-semibold mt-1 leading-snug",
            optimisticCompleted
              ? "line-through text-gray-400 dark:text-gray-500"
              : "text-gray-900 dark:text-white"
          )}
        >
          {goal.title}
        </h4>

        {/* Description toggle */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-1 inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
        >
          {expanded ? "Less" : "Details"}
          {expanded ? (
            <ChevronUp className="h-3 w-3" />
          ) : (
            <ChevronDown className="h-3 w-3" />
          )}
        </button>

        {expanded && (
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
            {goal.description}
          </p>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function GoalRoadmap() {
  const [goals, setGoals] = useState<FounderGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const fetchGoals = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard/goals");
      const json = await res.json();
      if (json.success) {
        setGoals(json.data || []);
      }
    } catch {
      console.warn("[GoalRoadmap] Failed to fetch goals");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGoals();
  }, [fetchGoals]);

  // Auto-generate goals if none exist
  useEffect(() => {
    if (!loading && goals.length === 0 && !generating) {
      setGenerating(true);
      fetch("/api/dashboard/goals", { method: "POST" })
        .then((res) => res.json())
        .then((json) => {
          if (json.success && json.data?.length > 0) {
            setGoals(json.data);
          }
        })
        .catch(() => {
          // Silently fail — table may not exist yet
        })
        .finally(() => setGenerating(false));
    }
  }, [loading, goals.length, generating]);

  const handleToggle = useCallback(
    async (goalId: string, completed: boolean) => {
      try {
        const res = await fetch("/api/dashboard/goals", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: goalId, completed }),
        });
        const json = await res.json();
        if (!json.success) {
          console.warn("[GoalRoadmap] Toggle failed:", json.error);
        }
        await fetchGoals();
      } catch {
        console.warn("[GoalRoadmap] Toggle request failed");
        await fetchGoals();
      }
    },
    [fetchGoals]
  );

  // Don't render anything while loading or if no goals generated
  if (loading || generating) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Loader2 className="h-6 w-6 animate-spin text-[#ff6a1a] mx-auto mb-2" />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {generating ? "Building your roadmap..." : "Loading goals..."}
          </p>
        </CardContent>
      </Card>
    );
  }

  if (goals.length === 0) {
    return null;
  }

  const completedCount = goals.filter((g) => g.completed).length;
  const totalCount = goals.length;
  const progressPercent = Math.round((completedCount / totalCount) * 100);
  const stageLabel = goals[0]?.stage
    ? goals[0].stage.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
    : "Your";

  // Find first incomplete goal as "current step"
  const currentGoalId = goals.find((g) => !g.completed)?.id;

  return (
    <Card className="overflow-hidden">
      {/* Header */}
      <div className="px-6 pt-6 pb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-[#ff6a1a]/10 flex items-center justify-center">
              <Target className="h-4 w-4 text-[#ff6a1a]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white">
                Your Roadmap
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {stageLabel} stage goals
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[#ff6a1a]" />
            <span className="text-sm font-semibold text-gray-900 dark:text-white">
              {completedCount}/{totalCount}
            </span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#ff6a1a] to-orange-400 transition-all duration-500 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Goals list */}
      <CardContent className="pt-0 pb-6">
        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {goals.map((goal, index) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              stepNumber={index + 1}
              isCurrentStep={goal.id === currentGoalId}
              onToggle={handleToggle}
            />
          ))}
        </div>

        {/* Completion message */}
        {completedCount === totalCount && (
          <div className="mt-4 p-4 rounded-xl bg-green-50 dark:bg-green-900/20 text-center">
            <p className="text-sm font-semibold text-green-700 dark:text-green-400">
              All goals complete! Chat with FRED to unlock your next milestones.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
