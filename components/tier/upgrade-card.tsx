"use client";

/**
 * Upgrade Card Component
 * Phase 04: Studio Tier Features - Plan 07
 *
 * Promotes Studio tier upgrade from Pro.
 * Shows appropriate messaging based on current tier.
 */

import { useState, useCallback } from "react";
import { Check, Crown, Loader2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { UserTier, TIER_NAMES } from "@/lib/constants";
import { PLANS } from "@/lib/stripe/config";

interface UpgradeCardProps {
  currentTier: UserTier;
  targetTier?: UserTier;
}

export function UpgradeCard({
  currentTier,
  targetTier = UserTier.STUDIO,
}: UpgradeCardProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpgrade = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier: "VENTURE_STUDIO" }),
      });

      const data = await response.json();

      if (data.error) {
        setError(data.message || data.error);
        return;
      }

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error("[UpgradeCard] Checkout error:", err);
      setError("Failed to start checkout. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleManage = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch("/api/stripe/portal", {
        method: "POST",
      });

      const data = await response.json();

      if (data.error) {
        setError(data.message || data.error);
        return;
      }

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error("[UpgradeCard] Portal error:", err);
      setError("Failed to open billing portal. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Studio user - show "You're on Studio" with manage button
  if (currentTier >= UserTier.STUDIO) {
    return (
      <Card className="border-2 border-orange-500/30 bg-gradient-to-br from-orange-500/5 to-orange-400/5">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-orange-500" />
            <CardTitle className="text-lg">Venture Studio Plan</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            You are on the Studio plan with full access to all features.
          </p>
        </CardContent>
        <CardFooter>
          {error && (
            <p className="text-xs text-red-500 mb-2 w-full">{error}</p>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleManage}
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Opening...
              </>
            ) : (
              <>
                <ExternalLink className="mr-2 h-4 w-4" />
                Manage Subscription
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    );
  }

  // Free user - show Pro upgrade first
  if (currentTier === UserTier.FREE) {
    return (
      <Card className="border border-gray-200 dark:border-gray-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Upgrade Your Plan</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
            Upgrade to {TIER_NAMES[UserTier.PRO]} first to unlock Pro features,
            then level up to Studio for the full Virtual Team experience.
          </p>
          <div className="text-xs text-gray-500 dark:text-gray-500">
            Free &rarr; Pro ($99/mo) &rarr; Studio ($249/mo)
          </div>
        </CardContent>
        <CardFooter>
          <Button
            size="sm"
            className="w-full bg-[#ff6a1a] hover:bg-[#ea580c] text-white"
            onClick={async () => {
              try {
                setIsLoading(true);
                setError(null);
                const response = await fetch("/api/stripe/checkout", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ tier: "FUNDRAISING" }),
                });
                const data = await response.json();
                if (data.error) {
                  setError(data.message || data.error);
                  return;
                }
                if (data.url) {
                  window.location.href = data.url;
                }
              } catch (err) {
                console.error("[UpgradeCard] Checkout error:", err);
                setError("Failed to start checkout. Please try again.");
              } finally {
                setIsLoading(false);
              }
            }}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              "Upgrade to Pro"
            )}
          </Button>
        </CardFooter>
      </Card>
    );
  }

  // Pro user - show Studio upgrade card
  const studioFeatures = PLANS.VENTURE_STUDIO.features;

  return (
    <Card className="border-2 border-orange-500/30 bg-gradient-to-br from-orange-500/5 to-orange-400/5 overflow-hidden">
      {/* Gradient header bar */}
      <div className="h-1.5 bg-gradient-to-r from-[#ff6a1a] to-orange-400" />

      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-orange-500" />
            <CardTitle className="text-lg">Upgrade to Venture Studio</CardTitle>
          </div>
          <div className="text-right">
            <span className="text-2xl font-bold text-gray-900 dark:text-white">
              $249
            </span>
            <span className="text-sm text-gray-500">/month</span>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <ul className="space-y-2">
          {studioFeatures.map((feature, idx) => (
            <li
              key={idx}
              className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300"
            >
              <Check className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </CardContent>

      <CardFooter className="flex-col gap-2">
        {error && (
          <p className="text-xs text-red-500 w-full">{error}</p>
        )}
        <Button
          size="lg"
          onClick={handleUpgrade}
          disabled={isLoading}
          className="w-full bg-gradient-to-r from-[#ff6a1a] to-orange-400 hover:from-[#ea580c] hover:to-orange-500 text-white shadow-lg shadow-[#ff6a1a]/25"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            "Upgrade Now"
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
