"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useDailyUsage, type DailyThrottle } from "@/lib/hooks/use-daily-usage";

/**
 * Strategic upsell trigger (AI-6486).
 *
 * Surfaces when a free-tier user is approaching or has hit a daily limit — the
 * "natural upsell moment" Fred wanted. Copy + urgency vary by reason:
 *   - approaching_limit -> soft nudge ("running low")
 *   - limit_reached     -> hard block ("you're out for today")
 *
 * Render-prop free, drop-in: <UpsellBanner /> anywhere inside an authed surface.
 * Renders nothing when there's nothing to upsell.
 */

function headline(throttle: DailyThrottle): string {
  if (throttle.upsell === "limit_reached") {
    return "You've hit today's free limit";
  }
  return "You're running low on free usage";
}

function subline(throttle: DailyThrottle): string {
  const blocked = throttle.actions.find((a) => a.blocked);
  const low = throttle.actions
    .filter((a) => a.approaching && !a.blocked)
    .sort((a, b) => b.percentUsed - a.percentUsed)[0];

  if (throttle.upsell === "limit_reached" && blocked) {
    const hours = Math.max(1, Math.round(throttle.resetsInSeconds / 3600));
    return `Your daily limit resets in ${hours}h. Upgrade for higher limits and uninterrupted access.`;
  }
  if (low) {
    return `Only ${low.remaining} left today. Upgrade for higher daily limits and keep your momentum.`;
  }
  return "Upgrade for higher daily limits and uninterrupted access.";
}

export interface UpsellBannerProps {
  /** Where the upgrade CTA points. Defaults to the pricing page. */
  upgradeHref?: string;
  className?: string;
  /** Called when the upgrade CTA is clicked (e.g. analytics). */
  onUpgradeClick?: () => void;
}

export function UpsellBanner({
  upgradeHref = "/pricing",
  className,
  onUpgradeClick,
}: UpsellBannerProps) {
  const { throttle } = useDailyUsage();

  if (!throttle || throttle.upsell == null) return null;

  const hard = throttle.upsell === "limit_reached";

  return (
    <div
      role="status"
      className={cn(
        "rounded-xl border p-4 flex flex-col sm:flex-row sm:items-center gap-3",
        hard
          ? "border-red-300 bg-red-50 dark:border-red-900/50 dark:bg-red-950/30"
          : "border-amber-300 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/30",
        className
      )}
    >
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            "text-sm font-semibold",
            hard
              ? "text-red-700 dark:text-red-300"
              : "text-amber-700 dark:text-amber-300"
          )}
        >
          {headline(throttle)}
        </p>
        <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
          {subline(throttle)}
        </p>
      </div>
      <Button
        asChild
        size="sm"
        className="bg-[#ff6a1a] hover:bg-[#ea580c] text-white shrink-0"
      >
        <Link href={upgradeHref} onClick={onUpgradeClick}>
          Upgrade
        </Link>
      </Button>
    </div>
  );
}

export default UpsellBanner;
