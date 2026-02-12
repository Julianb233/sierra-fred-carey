"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  MessageSquare,
  ListChecks,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { NextStepCard } from "@/components/dashboard/next-step-card";
import type { NextStep, StepPriority } from "@/lib/next-steps/next-steps-service";

// ============================================================================
// Page Component
// ============================================================================

export default function NextStepsPage() {
  const [critical, setCritical] = useState<NextStep[]>([]);
  const [important, setImportant] = useState<NextStep[]>([]);
  const [optional, setOptional] = useState<NextStep[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);

  const applyData = useCallback(
    (data: { critical: NextStep[]; important: NextStep[]; optional: NextStep[] }) => {
      setCritical(data.critical || []);
      setImportant(data.important || []);
      setOptional(data.optional || []);
    },
    []
  );

  const fetchSteps = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch("/api/dashboard/next-steps");
      const json = await res.json();
      if (json.success) {
        applyData(json.data);
      } else {
        setError(json.error || "Failed to load next steps");
      }
    } catch {
      setError("Failed to load next steps");
    } finally {
      setLoading(false);
    }
  }, [applyData]);

  useEffect(() => {
    fetchSteps();
  }, [fetchSteps]);

  const handleRefresh = useCallback(async () => {
    try {
      setRefreshing(true);
      setError(null);
      const res = await fetch("/api/dashboard/next-steps", { method: "POST" });
      const json = await res.json();
      if (json.success) {
        applyData(json.data);
      } else {
        setError(json.error || "Failed to refresh next steps");
      }
    } catch {
      setError("Failed to refresh next steps");
    } finally {
      setRefreshing(false);
    }
  }, [applyData]);

  const handleToggleComplete = useCallback(
    async (stepId: string, completed: boolean) => {
      const res = await fetch("/api/dashboard/next-steps", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: stepId, completed }),
      });
      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error);
      }
      await fetchSteps();
    },
    [fetchSteps]
  );

  const handleDismiss = useCallback(
    async (stepId: string) => {
      const res = await fetch("/api/dashboard/next-steps", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: stepId, dismissed: true }),
      });
      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error);
      }
      await fetchSteps();
    },
    [fetchSteps]
  );

  // Separate completed from active within each priority group
  const activeCritical = critical.filter((s) => !s.completed);
  const activeImportant = important.filter((s) => !s.completed);
  const activeOptional = optional.filter((s) => !s.completed);
  const completedSteps = [
    ...critical.filter((s) => s.completed),
    ...important.filter((s) => s.completed),
    ...optional.filter((s) => s.completed),
  ];

  const totalActive = activeCritical.length + activeImportant.length + activeOptional.length;
  const isEmpty = totalActive === 0 && completedSteps.length === 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-[#ff6a1a]" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Next Steps
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Prioritized actions from your FRED conversations
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            {refreshing ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Refresh
          </Button>
          <Link href="/chat">
            <Button className="bg-[#ff6a1a] hover:bg-[#ea580c] text-white">
              <MessageSquare className="h-4 w-4 mr-2" />
              Chat with FRED
            </Button>
          </Link>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
          <p className="text-red-700 dark:text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Empty state */}
      {isEmpty && !error && (
        <Card>
          <CardContent className="py-16 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#ff6a1a]/10 flex items-center justify-center">
              <ListChecks className="h-8 w-8 text-[#ff6a1a]" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              No Next Steps Yet
            </h2>
            <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto mb-6">
              Chat with FRED to get personalized next steps for your startup.
              Every conversation generates actionable items prioritized for your
              stage.
            </p>
            <Link href="/chat">
              <Button className="bg-[#ff6a1a] hover:bg-[#ea580c] text-white">
                <MessageSquare className="h-4 w-4 mr-2" />
                Start a Conversation
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Active steps by priority tier */}
      <PrioritySection
        title="Critical"
        steps={activeCritical}
        priority="critical"
        onToggleComplete={handleToggleComplete}
        onDismiss={handleDismiss}
      />

      <PrioritySection
        title="Important"
        steps={activeImportant}
        priority="important"
        onToggleComplete={handleToggleComplete}
        onDismiss={handleDismiss}
      />

      <PrioritySection
        title="Optional"
        steps={activeOptional}
        priority="optional"
        onToggleComplete={handleToggleComplete}
        onDismiss={handleDismiss}
      />

      {/* Completed section (collapsed by default) */}
      {completedSteps.length > 0 && (
        <div>
          <button
            onClick={() => setShowCompleted(!showCompleted)}
            className="flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
          >
            {showCompleted ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
            Done ({completedSteps.length})
          </button>
          {showCompleted && (
            <div className="mt-3 space-y-2">
              {completedSteps.map((step) => (
                <NextStepCard
                  key={step.id}
                  id={step.id}
                  description={step.description}
                  whyItMatters={step.whyItMatters}
                  priority={step.priority}
                  sourceConversationDate={step.sourceConversationDate}
                  completed={step.completed}
                  completedAt={step.completedAt}
                  createdAt={step.createdAt}
                  onToggleComplete={handleToggleComplete}
                  onDismiss={handleDismiss}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Priority Section
// ============================================================================

const TIER_EMPTY_MESSAGES: Record<StepPriority, { icon: string; message: string }> = {
  critical: {
    icon: "text-red-400",
    message: "No critical actions right now. You're in good shape!",
  },
  important: {
    icon: "text-amber-400",
    message: "No important actions pending.",
  },
  optional: {
    icon: "text-blue-400",
    message: "No optional items at the moment.",
  },
};

function PrioritySection({
  title,
  steps,
  priority,
  onToggleComplete,
  onDismiss,
}: {
  title: string;
  steps: NextStep[];
  priority: StepPriority;
  onToggleComplete: (stepId: string, completed: boolean) => Promise<void>;
  onDismiss: (stepId: string) => Promise<void>;
}) {
  const colorMap: Record<StepPriority, string> = {
    critical: "text-red-600 dark:text-red-400",
    important: "text-amber-600 dark:text-amber-400",
    optional: "text-blue-600 dark:text-blue-400",
  };

  const empty = TIER_EMPTY_MESSAGES[priority];

  return (
    <div>
      <h2
        className={`text-sm font-semibold uppercase tracking-wider mb-3 ${colorMap[priority]}`}
      >
        {title} ({steps.length})
      </h2>
      {steps.length === 0 ? (
        <p className={`text-sm ${empty.icon} italic`}>{empty.message}</p>
      ) : (
        <div className="space-y-2">
          {steps.map((step) => (
            <NextStepCard
              key={step.id}
              {...step}
              onToggleComplete={onToggleComplete}
              onDismiss={onDismiss}
            />
          ))}
        </div>
      )}
    </div>
  );
}
