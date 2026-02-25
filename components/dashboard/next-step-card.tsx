"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Undo2,
  Loader2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { StepPriority } from "@/lib/next-steps/next-steps-service";

// ============================================================================
// Priority Config
// ============================================================================

const PRIORITY_CONFIG: Record<
  StepPriority,
  { label: string; color: string; badgeBg: string }
> = {
  critical: {
    label: "Critical",
    color: "text-red-600 dark:text-red-400",
    badgeBg:
      "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800",
  },
  important: {
    label: "Important",
    color: "text-amber-600 dark:text-amber-400",
    badgeBg:
      "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800",
  },
  optional: {
    label: "Optional",
    color: "text-blue-600 dark:text-blue-400",
    badgeBg:
      "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800",
  },
};

// ============================================================================
// Component
// ============================================================================

interface NextStepCardProps {
  id: string;
  description: string;
  whyItMatters: string | null;
  priority: StepPriority;
  sourceConversationDate: string | null;
  completed: boolean;
  completedAt: string | null;
  createdAt: string;
  onToggleComplete: (stepId: string, completed: boolean) => Promise<void>;
  onDismiss?: (stepId: string) => Promise<void>;
}

/** Strip markdown syntax from a string for plain-text display */
function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, "$1")   // **bold**
    .replace(/\*(.*?)\*/g, "$1")        // *italic*
    .replace(/^#+\s+/gm, "")            // # headings
    .replace(/`(.*?)`/g, "$1")          // `code`
    .replace(/\[(.*?)\]\(.*?\)/g, "$1") // [link](url)
    .trim();
}

export function NextStepCard({
  id,
  description,
  whyItMatters,
  priority,
  sourceConversationDate,
  completed,
  createdAt,
  onToggleComplete,
  onDismiss,
}: NextStepCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dismissing, setDismissing] = useState(false);
  const [optimisticCompleted, setOptimisticCompleted] = useState(completed);

  const config = PRIORITY_CONFIG[priority];

  async function handleToggle() {
    const newState = !optimisticCompleted;
    setOptimisticCompleted(newState);
    setLoading(true);
    try {
      await onToggleComplete(id, newState);
    } catch {
      // Rollback on error
      setOptimisticCompleted(!newState);
    } finally {
      setLoading(false);
    }
  }

  async function handleDismiss() {
    if (!onDismiss) return;
    setDismissing(true);
    try {
      await onDismiss(id);
    } finally {
      setDismissing(false);
    }
  }

  return (
    <Card
      className={cn(
        "transition-all border-l-4",
        optimisticCompleted
          ? "border-l-gray-300 dark:border-l-gray-700 opacity-70"
          : priority === "critical"
          ? "border-l-red-500"
          : priority === "important"
          ? "border-l-amber-500"
          : "border-l-blue-500"
      )}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Complete/undo button */}
          <button
            onClick={handleToggle}
            disabled={loading}
            className={cn(
              "mt-0.5 flex-shrink-0 rounded-full p-0.5 transition-colors",
              optimisticCompleted
                ? "text-green-600 dark:text-green-400 hover:text-gray-400"
                : "text-gray-300 dark:text-gray-600 hover:text-green-500"
            )}
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : optimisticCompleted ? (
              <CheckCircle2 className="h-5 w-5" />
            ) : (
              <CheckCircle2 className="h-5 w-5" />
            )}
          </button>

          <div className="flex-1 min-w-0">
            {/* Header row */}
            <div className="flex items-start justify-between gap-2">
              <p
                className={cn(
                  "text-sm font-medium leading-snug",
                  optimisticCompleted
                    ? "line-through text-gray-400 dark:text-gray-500"
                    : "text-gray-900 dark:text-white"
                )}
              >
                {stripMarkdown(description)}
              </p>
              <div className="flex items-center gap-1 flex-shrink-0">
                <Badge
                  variant="outline"
                  className={cn("text-xs", config.badgeBg)}
                >
                  {config.label}
                </Badge>
                {onDismiss && !optimisticCompleted && (
                  <button
                    onClick={handleDismiss}
                    disabled={dismissing}
                    className="p-1 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    title="Dismiss"
                  >
                    {dismissing ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <X className="h-3.5 w-3.5" />
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Meta row */}
            <div className="flex items-center gap-3 mt-2">
              {/* Conversation link */}
              {sourceConversationDate && (
                <Link
                  href="/chat"
                  className="inline-flex items-center gap-1 text-xs text-[#ff6a1a] hover:text-[#ea580c] transition-colors"
                >
                  <MessageSquare className="h-3 w-3" />
                  View conversation
                </Link>
              )}

              {/* Created date */}
              <span className="text-xs text-gray-400 dark:text-gray-500">
                {new Date(createdAt).toLocaleDateString()}
              </span>

              {/* Why it matters toggle */}
              {whyItMatters && (
                <button
                  onClick={() => setExpanded(!expanded)}
                  className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                >
                  Why it matters
                  {expanded ? (
                    <ChevronUp className="h-3 w-3" />
                  ) : (
                    <ChevronDown className="h-3 w-3" />
                  )}
                </button>
              )}

              {/* Undo button for completed items */}
              {optimisticCompleted && (
                <button
                  onClick={handleToggle}
                  disabled={loading}
                  className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  <Undo2 className="h-3 w-3" />
                  Undo
                </button>
              )}
            </div>

            {/* Expanded "why it matters" */}
            {expanded && whyItMatters && (
              <div className="mt-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                {whyItMatters}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
