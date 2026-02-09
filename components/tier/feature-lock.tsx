"use client";

import { ReactNode } from "react";
import { motion } from "framer-motion";
import { Lock, Rocket, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { UserTier, TIER_NAMES, canAccessFeature } from "@/lib/constants";
import { UpgradeTier } from "@/components/dashboard/UpgradeTier";

interface FeatureLockProps {
  /** Required tier to access this feature */
  requiredTier: UserTier;
  /** User's current tier */
  currentTier: UserTier;
  /** Feature name for display */
  featureName: string;
  /** Feature description */
  description?: string;
  /** Children to render when unlocked */
  children: ReactNode;
  /** Whether to blur the children when locked (vs hiding completely) */
  blur?: boolean;
  /** Additional className for the container */
  className?: string;
}

/**
 * Feature lock component that gates content by tier
 *
 * @example
 * <FeatureLock
 *   requiredTier={UserTier.PRO}
 *   currentTier={userTier}
 *   featureName="Pitch Deck Review"
 * >
 *   <PitchDeckReview />
 * </FeatureLock>
 */
export function FeatureLock({
  requiredTier,
  currentTier,
  featureName,
  description,
  children,
  blur = true,
  className,
}: FeatureLockProps) {
  const hasAccess = canAccessFeature(currentTier, requiredTier);

  // If user has access, just render children
  if (hasAccess) {
    return <>{children}</>;
  }

  return (
    <div className={cn("relative min-h-[300px]", className)}>
      {/* Lock overlay - uses min-height to ensure visibility when children not mounted */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={cn(
          "absolute inset-0 z-10 flex items-center justify-center",
          "bg-white/80 dark:bg-gray-950/80 backdrop-blur-md rounded-lg"
        )}
      >
        <div className="text-center p-6 max-w-sm">
          {/* Lock icon */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", delay: 0.1 }}
            className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-[#ff6a1a]/20 to-orange-400/20 flex items-center justify-center"
          >
            <Lock className="h-8 w-8 text-[#ff6a1a]" />
          </motion.div>

          {/* Title */}
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            {featureName}
          </h3>

          {/* Description */}
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            {description ||
              `This feature is available on ${TIER_NAMES[requiredTier]} and above.`}
          </p>

          {/* Upgrade button */}
          <UpgradeTier currentTier={currentTier} />
        </div>
      </motion.div>
    </div>
  );
}

/**
 * Compact feature lock for inline use
 */
export function InlineFeatureLock({
  requiredTier,
  currentTier,
  featureName,
  className,
}: {
  requiredTier: UserTier;
  currentTier: UserTier;
  featureName: string;
  className?: string;
}) {
  const hasAccess = canAccessFeature(currentTier, requiredTier);

  if (hasAccess) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        "inline-flex items-center gap-2 px-3 py-1.5 rounded-lg",
        "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400",
        "text-sm",
        className
      )}
    >
      <Lock className="h-3.5 w-3.5" />
      <span>
        {featureName} requires{" "}
        <span className="font-medium text-[#ff6a1a]">
          {TIER_NAMES[requiredTier]}
        </span>
      </span>
    </motion.div>
  );
}

/**
 * Coming soon badge for features not yet available
 */
export function ComingSoonBadge({
  featureName,
  className,
}: {
  featureName: string;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-1 rounded-full",
        "bg-gradient-to-r from-purple-500/10 to-pink-500/10",
        "border border-purple-500/20",
        "text-xs font-medium text-purple-600 dark:text-purple-400",
        className
      )}
    >
      <Sparkles className="h-3 w-3" />
      Coming Soon
    </motion.div>
  );
}

/**
 * Upgrade prompt card
 */
export function UpgradePromptCard({
  currentTier,
  targetTier,
  title,
  description,
  features,
  className,
}: {
  currentTier: UserTier;
  targetTier: UserTier;
  title: string;
  description: string;
  features?: string[];
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "p-6 rounded-xl",
        "bg-gradient-to-br from-[#ff6a1a]/5 to-orange-400/5",
        "border border-[#ff6a1a]/20",
        className
      )}
    >
      <div className="flex items-start gap-4">
        <div className="p-3 rounded-lg bg-[#ff6a1a]/10">
          <Rocket className="h-6 w-6 text-[#ff6a1a]" />
        </div>

        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
            {title}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            {description}
          </p>

          {features && features.length > 0 && (
            <ul className="space-y-1.5 mb-4">
              {features.map((feature, index) => (
                <li
                  key={index}
                  className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-[#ff6a1a]" />
                  {feature}
                </li>
              ))}
            </ul>
          )}

          <UpgradeTier currentTier={currentTier} />
        </div>
      </div>
    </motion.div>
  );
}
