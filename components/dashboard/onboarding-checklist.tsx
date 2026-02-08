"use client";

/**
 * Onboarding Checklist Component
 *
 * Phase 30-01: A "Getting Started" card shown on the dashboard with 5 tasks
 * to guide new founders through their first Sahara experience.
 * Dismissible, collapsible, with progress tracking and analytics events.
 */

import { useState } from "react";
import Link from "next/link";
import { trackEvent } from "@/lib/analytics";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { useOnboardingChecklist, type ChecklistTask } from "@/lib/hooks/use-onboarding-checklist";

function CheckIcon({ completed }: { completed: boolean }) {
  if (completed) {
    return (
      <svg
        className="h-5 w-5 text-green-500 flex-shrink-0"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    );
  }

  return (
    <svg
      className="h-5 w-5 text-muted-foreground/40 flex-shrink-0"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <circle cx="12" cy="12" r="9" />
    </svg>
  );
}

function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg
      className={`h-5 w-5 text-muted-foreground transition-transform ${
        expanded ? "rotate-180" : ""
      }`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );
}

function TaskRow({ task }: { task: ChecklistTask }) {
  return (
    <div className="flex items-center gap-3 py-2">
      <CheckIcon completed={task.completed} />
      <span
        className={`flex-1 text-sm ${
          task.completed
            ? "text-muted-foreground line-through"
            : "text-foreground"
        }`}
      >
        {task.label}
      </span>
      {!task.completed && task.href && (
        <Link
          href={task.href}
          className="text-xs font-medium text-primary hover:text-primary/80 transition-colors whitespace-nowrap"
          onClick={() => {
            trackEvent(ANALYTICS_EVENTS.ONBOARDING.STEP_COMPLETED, {
              step: task.id,
            });
          }}
        >
          {task.cta}
        </Link>
      )}
    </div>
  );
}

export function OnboardingChecklist() {
  const { tasks, completedCount, totalCount, isDismissed, dismiss } =
    useOnboardingChecklist();
  const [expanded, setExpanded] = useState(true);

  if (isDismissed) return null;

  // Hide when all tasks completed (auto-dismiss after a moment)
  if (completedCount === totalCount) return null;

  const progressPercent = Math.round((completedCount / totalCount) * 100);

  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          className="flex items-center gap-2 flex-1 text-left"
          onClick={() => setExpanded(!expanded)}
        >
          <h3 className="text-sm font-semibold text-foreground">
            Getting Started
          </h3>
          <span className="text-xs text-muted-foreground">
            {completedCount}/{totalCount} complete
          </span>
          <ChevronIcon expanded={expanded} />
        </button>
        <button
          type="button"
          className="text-xs text-muted-foreground hover:text-foreground transition-colors ml-2"
          onClick={() => {
            trackEvent(ANALYTICS_EVENTS.ONBOARDING.SKIPPED, {
              completedCount,
              totalCount,
            });
            dismiss();
          }}
        >
          Dismiss
        </button>
      </div>

      {/* Progress bar */}
      <div className="mt-3 h-1.5 w-full rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Tasks */}
      {expanded && (
        <div className="mt-3 divide-y divide-border">
          {tasks.map((task) => (
            <TaskRow key={task.id} task={task} />
          ))}
        </div>
      )}
    </div>
  );
}
