"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import {
  CheckIcon,
  RocketIcon,
  StarIcon,
  LightningBoltIcon,
  ExclamationTriangleIcon,
  ReloadIcon,
} from "@radix-ui/react-icons";
import { cn } from "@/lib/utils";
import { PLANS, type PlanId } from "@/lib/stripe/config";
import { UserTier, TIER_NAMES, getUpgradeTier } from "@/lib/constants";
import { redirectToCheckout, redirectToPortal } from "@/lib/stripe/client";

interface UpgradeTierProps {
  currentTier: UserTier;
  isSubscriptionActive?: boolean;
  onUpgradeSuccess?: () => void;
}

interface PlanCardProps {
  plan: (typeof PLANS)[PlanId];
  isCurrentPlan: boolean;
  isUpgrade: boolean;
  isLoading: boolean;
  onSelect: (priceId: string) => void;
  error?: string | null;
}

const PLAN_ICONS: Record<string, typeof StarIcon> = {
  free: LightningBoltIcon,
  fundraising: StarIcon,
  venture_studio: RocketIcon,
};

const PLAN_GRADIENTS: Record<string, string> = {
  free: "from-gray-400 to-gray-500",
  fundraising: "from-[#ff6a1a] to-orange-400",
  venture_studio: "from-orange-600 to-[#ff6a1a]",
};

function PlanCard({
  plan,
  isCurrentPlan,
  isUpgrade,
  isLoading,
  onSelect,
  error,
}: PlanCardProps) {
  const Icon = PLAN_ICONS[plan.id] || StarIcon;
  const gradient = PLAN_GRADIENTS[plan.id] || "from-gray-400 to-gray-500";
  const isPro = plan.id === "fundraising";

  return (
    <Card
      className={cn(
        "relative flex flex-col h-full transition-all duration-300",
        isPro && "border-[#ff6a1a] border-2 shadow-lg shadow-[#ff6a1a]/10",
        isCurrentPlan && "ring-2 ring-green-500/50",
        !isCurrentPlan && !isUpgrade && "opacity-60"
      )}
    >
      {isPro && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
          <Badge className="bg-[#ff6a1a] text-white shadow-lg">
            Most Popular
          </Badge>
        </div>
      )}

      {isCurrentPlan && (
        <div className="absolute -top-3 right-4 z-10">
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            Current Plan
          </Badge>
        </div>
      )}

      <CardHeader className="pb-4">
        <div
          className={cn(
            "w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center mb-4 shadow-lg",
            gradient
          )}
        >
          <Icon className="h-6 w-6 text-white" />
        </div>
        <CardTitle className="text-xl">{plan.name}</CardTitle>
        <CardDescription>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-bold text-gray-900 dark:text-white">
              ${plan.price}
            </span>
            <span className="text-gray-500">/month</span>
          </div>
        </CardDescription>
      </CardHeader>

      <CardContent className="flex-1">
        <Separator className="mb-4" />
        <ul className="space-y-2">
          {plan.features.map((feature, index) => (
            <li key={index} className="flex items-start gap-2 text-sm">
              <div className="mt-0.5 p-0.5 rounded-full bg-[#ff6a1a]/20 flex-shrink-0">
                <CheckIcon className="h-3 w-3 text-[#ff6a1a]" />
              </div>
              <span className="text-gray-600 dark:text-gray-400">{feature}</span>
            </li>
          ))}
        </ul>
      </CardContent>

      <CardFooter className="pt-4">
        {error && (
          <div className="w-full mb-3 p-2 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2">
            <ExclamationTriangleIcon className="h-4 w-4 text-red-500 flex-shrink-0" />
            <span className="text-xs text-red-600 dark:text-red-400">{error}</span>
          </div>
        )}
        <Button
          onClick={() => plan.priceId && onSelect(plan.priceId)}
          disabled={isCurrentPlan || !isUpgrade || isLoading || !plan.priceId}
          className={cn(
            "w-full",
            isPro && isUpgrade
              ? "bg-[#ff6a1a] hover:bg-[#ea580c] text-white shadow-lg shadow-[#ff6a1a]/25"
              : ""
          )}
          variant={isPro && isUpgrade ? "default" : "outline"}
        >
          {isLoading ? (
            <>
              <ReloadIcon className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : isCurrentPlan ? (
            "Current Plan"
          ) : !plan.priceId ? (
            "Free Forever"
          ) : isUpgrade ? (
            "Upgrade Now"
          ) : (
            "Downgrade"
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}

export function UpgradeTier({
  currentTier,
  isSubscriptionActive = false,
  onUpgradeSuccess,
}: UpgradeTierProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const currentPlanId = currentTier === UserTier.FREE
    ? "free"
    : currentTier === UserTier.PRO
    ? "fundraising"
    : "venture_studio";

  const handleSelectPlan = useCallback(async (priceId: string) => {
    try {
      setLoadingPlan(priceId);
      setError(null);
      await redirectToCheckout(priceId);
      onUpgradeSuccess?.();
    } catch (err) {
      console.error("Checkout error:", err);
      if (err instanceof Error) {
        if (err.message.includes("not configured")) {
          setError("Payment processing is temporarily unavailable. Please try again later.");
        } else {
          setError(err.message);
        }
      } else {
        setError("Failed to start checkout. Please try again.");
      }
    } finally {
      setLoadingPlan(null);
    }
  }, [onUpgradeSuccess]);

  const handleManageSubscription = useCallback(async () => {
    try {
      setLoadingPlan("portal");
      setError(null);
      await redirectToPortal();
    } catch (err) {
      console.error("Portal error:", err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to open subscription portal. Please try again.");
      }
    } finally {
      setLoadingPlan(null);
    }
  }, []);

  const plans = [PLANS.FREE, PLANS.FUNDRAISING, PLANS.VENTURE_STUDIO];
  const nextTier = getUpgradeTier(currentTier);
  const nextPlan = nextTier !== null
    ? (nextTier === UserTier.PRO ? PLANS.FUNDRAISING : PLANS.VENTURE_STUDIO)
    : null;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="default"
          size="sm"
          className="bg-[#ff6a1a] hover:bg-[#ea580c] text-white shadow-lg shadow-[#ff6a1a]/25"
        >
          <RocketIcon className="mr-2 h-4 w-4" />
          {nextPlan ? `Upgrade to ${nextPlan.name}` : "Manage Plan"}
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            {nextPlan ? "Upgrade Your Plan" : "Manage Subscription"}
          </DialogTitle>
          <DialogDescription>
            {nextPlan
              ? "Unlock more features and accelerate your founder journey."
              : "You're on the highest tier! Manage your subscription below."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          {plans.map((plan) => {
            const tierForPlan =
              plan.id === "free"
                ? UserTier.FREE
                : plan.id === "fundraising"
                ? UserTier.PRO
                : UserTier.STUDIO;
            const isCurrentPlan = currentPlanId === plan.id;
            const isUpgrade = tierForPlan > currentTier;

            return (
              <PlanCard
                key={plan.id}
                plan={plan}
                isCurrentPlan={isCurrentPlan}
                isUpgrade={isUpgrade}
                isLoading={loadingPlan === plan.priceId}
                onSelect={handleSelectPlan}
                error={loadingPlan === plan.priceId ? error : null}
              />
            );
          })}
        </div>

        {isSubscriptionActive && (
          <div className="mt-6 pt-6 border-t">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white">
                  Manage Subscription
                </h4>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Update payment method, view invoices, or cancel your subscription.
                </p>
              </div>
              <Button
                variant="outline"
                onClick={handleManageSubscription}
                disabled={loadingPlan === "portal"}
              >
                {loadingPlan === "portal" ? (
                  <>
                    <ReloadIcon className="mr-2 h-4 w-4 animate-spin" />
                    Opening...
                  </>
                ) : (
                  "Manage Billing"
                )}
              </Button>
            </div>
            {loadingPlan === "portal" && error && (
              <div className="mt-3 p-2 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2">
                <ExclamationTriangleIcon className="h-4 w-4 text-red-500 flex-shrink-0" />
                <span className="text-sm text-red-600 dark:text-red-400">{error}</span>
              </div>
            )}
          </div>
        )}

        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            All plans include a 14-day free trial. Cancel anytime.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Compact upgrade banner for sidebar
export function UpgradeBanner({
  currentTier,
  className,
}: {
  currentTier: UserTier;
  className?: string;
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nextTier = getUpgradeTier(currentTier);
  const nextPlan = nextTier !== null
    ? (nextTier === UserTier.PRO ? PLANS.FUNDRAISING : PLANS.VENTURE_STUDIO)
    : null;

  if (!nextPlan) return null;

  const handleUpgrade = async () => {
    if (!nextPlan.priceId) return;

    try {
      setIsLoading(true);
      setError(null);
      await redirectToCheckout(nextPlan.priceId);
    } catch (err) {
      console.error("Checkout error:", err);
      if (err instanceof Error) {
        if (err.message.includes("not configured")) {
          setError("Payments unavailable");
        } else {
          setError("Checkout failed");
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className={cn(
        "p-4 bg-gradient-to-br from-[#ff6a1a]/10 to-orange-400/10 rounded-xl border border-[#ff6a1a]/20",
        className
      )}
    >
      <p className="font-semibold text-sm text-gray-900 dark:text-white mb-1">
        Upgrade to {nextPlan.name}
      </p>
      <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
        Unlock all features and AI agents
      </p>
      {error && (
        <p className="text-xs text-red-500 mb-2">{error}</p>
      )}
      <Button
        size="sm"
        onClick={handleUpgrade}
        disabled={isLoading}
        className="w-full bg-[#ff6a1a] hover:bg-[#ea580c] text-white shadow-lg shadow-[#ff6a1a]/25"
      >
        {isLoading ? (
          <>
            <ReloadIcon className="mr-2 h-3 w-3 animate-spin" />
            Loading...
          </>
        ) : (
          <>
            <RocketIcon className="mr-2 h-3 w-3" />
            Upgrade Now
          </>
        )}
      </Button>
    </div>
  );
}

// Feature gate component for locked features
export function FeatureGate({
  requiredTier,
  currentTier,
  featureName,
  children,
}: {
  requiredTier: UserTier;
  currentTier: UserTier;
  featureName: string;
  children: React.ReactNode;
}) {
  if (currentTier >= requiredTier) {
    return <>{children}</>;
  }

  return (
    <div className="relative">
      <div className="absolute inset-0 bg-gray-100/80 dark:bg-gray-900/80 backdrop-blur-sm rounded-lg z-10 flex items-center justify-center">
        <div className="text-center p-6 max-w-sm">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-[#ff6a1a]/10 flex items-center justify-center">
            <RocketIcon className="h-6 w-6 text-[#ff6a1a]" />
          </div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
            {featureName} is a {TIER_NAMES[requiredTier]} Feature
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Upgrade to {TIER_NAMES[requiredTier]} to unlock this feature and many more.
          </p>
          <UpgradeTier currentTier={currentTier} />
        </div>
      </div>
      <div className="opacity-30 pointer-events-none">{children}</div>
    </div>
  );
}
