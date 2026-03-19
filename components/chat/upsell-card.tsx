"use client";

/**
 * UpsellCard — In-chat upgrade prompt component
 * AI-3579: Free-to-paid tier conversion
 *
 * Renders a contextual upgrade card inside chat messages when a free user
 * tries to access a paid-tier feature. Uses Stripe checkout for conversion.
 */

import { useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, ArrowRight, Loader2, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { redirectToCheckoutByTier, StripeNotConfiguredError } from "@/lib/stripe/client";
import { trackEvent } from "@/lib/analytics";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

interface UpsellCardProps {
  feature: string;
  requiredTier: "pro" | "studio";
  message: string;
}

// ============================================================================
// Tier display config
// ============================================================================

const TIER_CONFIG = {
  pro: {
    label: "Pro",
    price: "$29/mo",
    gradient: "from-[#ff6a1a] to-orange-400",
    borderColor: "border-[#ff6a1a]/30",
    bgGradient: "from-[#ff6a1a]/10 to-orange-400/10",
    icon: Sparkles,
    highlights: [
      "Full Investor Lens analysis",
      "Investor Readiness Score",
      "Pitch Deck Review & Scorecard",
      "Persistent founder memory",
    ],
  },
  studio: {
    label: "Studio",
    price: "$99/mo",
    gradient: "from-[#ff6a1a] via-orange-400 to-amber-400",
    borderColor: "border-[#ff6a1a]/40",
    bgGradient: "from-[#ff6a1a]/15 to-amber-400/10",
    icon: Crown,
    highlights: [
      "Virtual Team agents",
      "Weekly SMS Check-ins",
      "Boardy Investor Matching",
      "Priority compute & deep memory",
    ],
  },
} as const;

// ============================================================================
// Component
// ============================================================================

export function UpsellCard({ feature, requiredTier, message }: UpsellCardProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const config = TIER_CONFIG[requiredTier];
  const Icon = config.icon;

  const handleUpgrade = async () => {
    setIsLoading(true);
    setError(null);

    trackEvent(ANALYTICS_EVENTS.UPSELL.CTA_CLICKED, {
      feature,
      requiredTier,
      source: "chat",
    });

    try {
      await redirectToCheckoutByTier(requiredTier);
    } catch (err) {
      if (err instanceof StripeNotConfiguredError) {
        // Stripe not configured — redirect to pricing page
        window.location.href = "/pricing";
        return;
      }
      setError("Something went wrong. Try again or visit the pricing page.");
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.1 }}
      className="mt-3 not-prose"
    >
      <div
        className={cn(
          "rounded-xl border p-4 backdrop-blur-sm",
          config.borderColor,
          `bg-gradient-to-br ${config.bgGradient}`
        )}
      >
        {/* Header */}
        <div className="flex items-center gap-2 mb-2">
          <div
            className={cn(
              "w-7 h-7 rounded-lg flex items-center justify-center",
              `bg-gradient-to-br ${config.gradient}`
            )}
          >
            <Icon className="w-4 h-4 text-white" />
          </div>
          <div>
            <span className="text-xs font-semibold text-[#ff6a1a] uppercase tracking-wide">
              {config.label} Feature
            </span>
          </div>
        </div>

        {/* Message */}
        <p className="text-sm text-foreground/80 mb-3 leading-relaxed">
          {message}
        </p>

        {/* Feature highlights */}
        <div className="grid grid-cols-2 gap-1.5 mb-3">
          {config.highlights.map((highlight) => (
            <div key={highlight} className="flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-[#ff6a1a] shrink-0" />
              <span className="text-xs text-foreground/70">{highlight}</span>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="flex items-center gap-3">
          <Button
            size="sm"
            className={cn(
              "text-white font-medium",
              `bg-gradient-to-r ${config.gradient}`,
              "hover:opacity-90 transition-opacity"
            )}
            onClick={handleUpgrade}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
            ) : (
              <ArrowRight className="w-4 h-4 mr-1.5" />
            )}
            Upgrade to {config.label} {config.price}
          </Button>
          <a
            href="/pricing"
            className="text-xs text-foreground/50 hover:text-[#ff6a1a] transition-colors"
          >
            Compare plans
          </a>
        </div>

        {/* Error */}
        {error && (
          <p className="text-xs text-red-500 mt-2">{error}</p>
        )}
      </div>
    </motion.div>
  );
}
