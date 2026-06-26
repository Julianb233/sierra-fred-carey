"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Daily usage / throttle hook (AI-6486).
 *
 * Fetches the authenticated user's daily per-action-type throttle status from
 * GET /api/usage/throttle and exposes helpers the UI uses to render the
 * remaining-usage indicator and decide when to surface an upsell.
 */

export interface ActionThrottleStatus {
  action: string;
  limit: number | null;
  used: number;
  remaining: number;
  unlimited: boolean;
  blocked: boolean;
  approaching: boolean;
  percentUsed: number;
}

export type UpsellReason = "limit_reached" | "approaching_limit" | null;

export interface DailyThrottle {
  tier: number;
  dayStart: string;
  resetsAt: string;
  resetsInSeconds: number;
  actions: ActionThrottleStatus[];
  upsell: UpsellReason;
}

export interface UseDailyUsage {
  throttle: DailyThrottle | null;
  isLoading: boolean;
  error: string | null;
  /** Re-fetch the throttle status (e.g. after taking an action). */
  refresh: () => Promise<void>;
  /** Throttle status for a single action, or null if uncapped/unknown. */
  forAction: (action: string) => ActionThrottleStatus | null;
  /** Whether the user is blocked from taking `action` right now. */
  isBlocked: (action: string) => boolean;
  /** Whether an upsell should be shown (any capped action blocked/approaching). */
  shouldUpsell: boolean;
}

export function useDailyUsage(options: { auto?: boolean } = {}): UseDailyUsage {
  const { auto = true } = options;
  const [throttle, setThrottle] = useState<DailyThrottle | null>(null);
  const [isLoading, setIsLoading] = useState(auto);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await fetch("/api/usage/throttle", { cache: "no-store" });
      if (!res.ok) {
        // Unauthenticated or error — treat as "no throttle data" rather than a
        // hard failure so anonymous/public surfaces don't break.
        setThrottle(null);
        return;
      }
      const json = await res.json();
      setThrottle((json?.throttle as DailyThrottle) ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load usage");
      setThrottle(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (auto) void refresh();
  }, [auto, refresh]);

  const forAction = useCallback(
    (action: string): ActionThrottleStatus | null =>
      throttle?.actions.find((a) => a.action === action) ?? null,
    [throttle]
  );

  const isBlocked = useCallback(
    (action: string): boolean => {
      const a = forAction(action);
      return a ? !a.unlimited && a.blocked : false;
    },
    [forAction]
  );

  return {
    throttle,
    isLoading,
    error,
    refresh,
    forAction,
    isBlocked,
    shouldUpsell: throttle?.upsell != null,
  };
}
