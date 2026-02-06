"use client";

import { Sparkles, Crown, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { UserTier, TIER_BADGES } from "@/lib/constants";

interface TierBadgeProps {
  tier: UserTier;
  size?: "sm" | "md" | "lg";
  showIcon?: boolean;
  className?: string;
}

const TIER_ICONS = {
  [UserTier.FREE]: Zap,
  [UserTier.PRO]: Sparkles,
  [UserTier.STUDIO]: Crown,
};

const SIZE_CLASSES = {
  sm: "text-xs px-1.5 py-0.5",
  md: "text-sm px-2 py-0.5",
  lg: "text-base px-3 py-1",
};

const ICON_SIZES = {
  sm: "h-3 w-3",
  md: "h-3.5 w-3.5",
  lg: "h-4 w-4",
};

export function TierBadge({
  tier,
  size = "md",
  showIcon = true,
  className,
}: TierBadgeProps) {
  const config = TIER_BADGES[tier];
  const Icon = TIER_ICONS[tier];

  return (
    <Badge
      variant="secondary"
      className={cn(
        "font-medium",
        SIZE_CLASSES[size],
        config.className,
        className
      )}
    >
      {showIcon && Icon && (
        <Icon className={cn(ICON_SIZES[size], "mr-1")} />
      )}
      {config.label}
    </Badge>
  );
}

/**
 * Animated tier badge with glow effect for Pro/Studio
 */
export function AnimatedTierBadge({
  tier,
  className,
}: {
  tier: UserTier;
  className?: string;
}) {
  const config = TIER_BADGES[tier];
  const Icon = TIER_ICONS[tier];

  if (tier === UserTier.FREE) {
    return <TierBadge tier={tier} className={className} />;
  }

  return (
    <div className={cn("relative", className)}>
      {/* Glow effect */}
      <div
        className={cn(
          "absolute inset-0 rounded-full blur-sm opacity-50",
          tier === UserTier.PRO && "bg-[#ff6a1a]",
          tier === UserTier.STUDIO && "bg-gradient-to-r from-[#ff6a1a] to-orange-400"
        )}
      />
      <Badge
        variant="secondary"
        className={cn(
          "relative font-medium text-sm px-3 py-1",
          config.className
        )}
      >
        {Icon && <Icon className="h-4 w-4 mr-1.5" />}
        {config.label}
      </Badge>
    </div>
  );
}

/**
 * Minimal tier indicator (just icon)
 */
export function TierIcon({
  tier,
  className,
}: {
  tier: UserTier;
  className?: string;
}) {
  const Icon = TIER_ICONS[tier];

  const colorClass = {
    [UserTier.FREE]: "text-gray-400",
    [UserTier.PRO]: "text-[#ff6a1a]",
    [UserTier.STUDIO]: "text-orange-400",
  }[tier];

  return <Icon className={cn("h-4 w-4", colorClass, className)} />;
}
