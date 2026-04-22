"use client";

import { useState, useCallback } from "react";
import { Check, Rocket, Clock, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { UserTier, TIER_NAMES } from "@/lib/constants";
import { redirectToCheckout, redirectToPortal } from "@/lib/stripe/client";
import {
  usePaywall,
  getPaywallHeadline,
  getPaywallDescription,
  getTargetPlan,
} from "@/lib/context/paywall-context";

/**
 * Global paywall modal.
 * Renders once at the app level and is triggered via usePaywall().triggerPaywall().
 * Shows a focused upgrade prompt with a single CTA based on the trigger context.
 */
export function PaywallModal() {
  const { isOpen, config, dismiss } = usePaywall();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpgrade = useCallback(async () => {
    if (!config) return;

    const plan = getTargetPlan(config.requiredTier);
    if (!plan.priceId) {
      setError("Upgrade is not available at this time.");
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      await redirectToCheckout(plan.priceId);
    } catch (err) {
      console.error("[PaywallModal] Checkout error:", err);
      if (err instanceof Error) {
        if (err.message.includes("not configured")) {
          setError("Payment processing is temporarily unavailable.");
        } else {
          setError(err.message);
        }
      } else {
        setError("Failed to start checkout. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  }, [config]);

  const handleManage = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      await redirectToPortal();
    } catch (err) {
      console.error("[PaywallModal] Portal error:", err);
      setError("Failed to open billing portal.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  if (!config) return null;

  const headline = getPaywallHeadline(config);
  const description = getPaywallDescription(config);
  const plan = getTargetPlan(config.requiredTier);
  const tierName = config.requiredTier !== undefined
    ? TIER_NAMES[config.requiredTier]
    : plan.name;
  const isRateLimit = config.trigger === "rate-limit";
  const isAlreadyMaxTier =
    config.currentTier !== undefined && config.currentTier >= UserTier.STUDIO;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && dismiss()}>
      <DialogContent className="max-w-md">
        <DialogHeader className="text-center sm:text-center">
          <div className="mx-auto mb-4 w-14 h-14 rounded-full bg-gradient-to-br from-[#ff6a1a]/20 to-orange-400/20 flex items-center justify-center">
            {isRateLimit ? (
              <Clock className="h-7 w-7 text-[#ff6a1a]" />
            ) : (
              <Rocket className="h-7 w-7 text-[#ff6a1a]" />
            )}
          </div>
          <DialogTitle className="text-xl">{headline}</DialogTitle>
          <DialogDescription className="text-sm text-gray-600 dark:text-gray-400">
            {description}
          </DialogDescription>
        </DialogHeader>

        {/* Feature highlights */}
        {!isAlreadyMaxTier && plan.features.length > 0 && (
          <div className="mt-2 space-y-2">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              What you get with {tierName}
            </p>
            <ul className="space-y-1.5">
              {plan.features.slice(0, 5).map((feature, idx) => (
                <li
                  key={idx}
                  className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300"
                >
                  <div className="mt-0.5 p-0.5 rounded-full bg-[#ff6a1a]/20 flex-shrink-0">
                    <Check className="h-3 w-3 text-[#ff6a1a]" />
                  </div>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Price */}
        {!isAlreadyMaxTier && plan.price > 0 && (
          <div className="mt-3 text-center">
            <span className="text-2xl font-bold text-gray-900 dark:text-white">
              ${plan.price}
            </span>
            <span className="text-sm text-gray-500">/month</span>
          </div>
        )}

        {/* Error */}
        {error && (
          <p className="text-xs text-red-500 text-center mt-2">{error}</p>
        )}

        {/* CTA */}
        <div className="mt-4 flex flex-col gap-2">
          {isAlreadyMaxTier ? (
            <Button
              onClick={handleManage}
              disabled={isLoading}
              className="w-full"
              variant="outline"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Opening...
                </>
              ) : (
                "Manage Subscription"
              )}
            </Button>
          ) : (
            <Button
              onClick={handleUpgrade}
              disabled={isLoading}
              className={cn(
                "w-full",
                "bg-gradient-to-r from-[#ff6a1a] to-orange-400",
                "hover:from-[#ea580c] hover:to-orange-500",
                "text-white shadow-lg shadow-[#ff6a1a]/25"
              )}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Rocket className="mr-2 h-4 w-4" />
                  Upgrade to {tierName}
                </>
              )}
            </Button>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={dismiss}
            className="text-gray-500"
          >
            {isRateLimit ? "I'll wait" : "Maybe later"}
          </Button>
        </div>

        <p className="text-center text-xs text-gray-400 mt-1">
          14-day free trial. Cancel anytime.
        </p>
      </DialogContent>
    </Dialog>
  );
}
