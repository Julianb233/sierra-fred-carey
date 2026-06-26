"use client";

import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { useDailyUsage, type ActionThrottleStatus } from "@/lib/hooks/use-daily-usage";

/**
 * Daily usage meter (AI-6486).
 *
 * Clear visual indicator of how much of each daily-capped action the free-tier
 * user has left, plus when it resets. Drops into any dashboard surface. Renders
 * nothing for users with no daily caps (paid tiers) or while unauthenticated.
 */

/** Human-readable labels for the capped action types. */
const ACTION_LABELS: Record<string, string> = {
  chat_message: "Chat messages",
  voice_call_minute: "Voice minutes",
  report_generation: "Reports",
  pitch_deck_review: "Deck reviews",
  investor_score: "Investor scores",
  strategy_doc: "Strategy docs",
  agent_run: "Agent runs",
  document_upload: "Document uploads",
  document_search: "Document searches",
  investor_match: "Investor matches",
};

function labelFor(action: string): string {
  return ACTION_LABELS[action] ?? action.replace(/_/g, " ");
}

function barColor(s: ActionThrottleStatus): string {
  if (s.blocked) return "bg-red-500";
  if (s.approaching) return "bg-amber-500";
  return "bg-[#ff6a1a]";
}

function resetLabel(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  if (hours >= 1) return `Resets in ${hours}h`;
  const mins = Math.max(1, Math.round(seconds / 60));
  return `Resets in ${mins}m`;
}

export interface UsageMeterProps {
  /** Restrict the meter to a subset of actions (e.g. ["chat_message"]). */
  actions?: string[];
  /** Hide actions the user has plenty of headroom on (show only at >= 50%). */
  onlyConstrained?: boolean;
  className?: string;
}

export function UsageMeter({ actions, onlyConstrained, className }: UsageMeterProps) {
  const { throttle, isLoading } = useDailyUsage();

  if (isLoading || !throttle || throttle.actions.length === 0) return null;

  let rows = throttle.actions;
  if (actions?.length) rows = rows.filter((a) => actions.includes(a.action));
  if (onlyConstrained) rows = rows.filter((a) => a.percentUsed >= 0.5);
  if (rows.length === 0) return null;

  return (
    <div
      className={cn(
        "rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4",
        className
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          Today&apos;s free usage
        </h3>
        <span className="text-xs text-gray-500">
          {resetLabel(throttle.resetsInSeconds)}
        </span>
      </div>

      <div className="space-y-3">
        {rows.map((s) => (
          <div key={s.action}>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-gray-700 dark:text-gray-300">
                {labelFor(s.action)}
              </span>
              <span
                className={cn(
                  "tabular-nums font-medium",
                  s.blocked
                    ? "text-red-500"
                    : s.approaching
                      ? "text-amber-600"
                      : "text-gray-500"
                )}
              >
                {s.used} / {s.limit}
              </span>
            </div>
            <Progress
              value={Math.round(s.percentUsed * 100)}
              className="h-2 bg-gray-100 dark:bg-gray-800"
              indicatorClassName={barColor(s)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export default UsageMeter;
