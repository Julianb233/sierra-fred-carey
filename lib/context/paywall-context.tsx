"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { UserTier, TIER_NAMES } from "@/lib/constants";
import { PLANS } from "@/lib/stripe/config";

// ============================================================================
// Types
// ============================================================================

export type PaywallTrigger = "tier-gate" | "rate-limit" | "feature-click";

export interface PaywallConfig {
  /** Why the paywall was triggered */
  trigger: PaywallTrigger;
  /** Feature name the user tried to access */
  featureName?: string;
  /** The tier required to access the feature */
  requiredTier?: UserTier;
  /** The user's current tier (auto-filled from TierContext if not provided) */
  currentTier?: UserTier;
  /** Seconds until rate limit resets (for rate-limit trigger) */
  retryAfter?: number;
}

interface PaywallContextValue {
  /** Whether the paywall modal is currently open */
  isOpen: boolean;
  /** Current paywall configuration */
  config: PaywallConfig | null;
  /** Open the paywall modal with a specific trigger */
  triggerPaywall: (config: PaywallConfig) => void;
  /** Close the paywall modal */
  dismiss: () => void;
}

// ============================================================================
// Context
// ============================================================================

const PaywallContext = createContext<PaywallContextValue | null>(null);

// ============================================================================
// Provider
// ============================================================================

export function PaywallProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [config, setConfig] = useState<PaywallConfig | null>(null);

  const triggerPaywall = useCallback((cfg: PaywallConfig) => {
    setConfig(cfg);
    setIsOpen(true);
  }, []);

  const dismiss = useCallback(() => {
    setIsOpen(false);
    // Delay clearing config so closing animation completes with content
    setTimeout(() => setConfig(null), 300);
  }, []);

  return (
    <PaywallContext.Provider value={{ isOpen, config, triggerPaywall, dismiss }}>
      {children}
    </PaywallContext.Provider>
  );
}

// ============================================================================
// Hook
// ============================================================================

/** No-op fallback used when a component renders outside a PaywallProvider
 * (e.g. unit tests that mount a page directly, or sub-trees rendered by
 * error boundaries before providers mount). Keeps callsites safe without
 * every test having to wrap in a provider. */
const NULL_PAYWALL: PaywallContextValue = {
  isOpen: false,
  config: null,
  triggerPaywall: () => {},
  dismiss: () => {},
};

export function usePaywall(): PaywallContextValue {
  const context = useContext(PaywallContext);
  return context ?? NULL_PAYWALL;
}

// ============================================================================
// Helpers
// ============================================================================

/** Get the headline for the paywall modal based on trigger type */
export function getPaywallHeadline(config: PaywallConfig): string {
  switch (config.trigger) {
    case "rate-limit":
      return "You've reached your usage limit";
    case "tier-gate":
      return config.featureName
        ? `Unlock ${config.featureName}`
        : "Unlock this feature";
    case "feature-click":
      return config.featureName
        ? `${config.featureName} is a premium feature`
        : "This is a premium feature";
  }
}

/** Get the description for the paywall modal based on trigger type */
export function getPaywallDescription(config: PaywallConfig): string {
  const tierName = config.requiredTier !== undefined
    ? TIER_NAMES[config.requiredTier]
    : "a higher plan";

  switch (config.trigger) {
    case "rate-limit":
      return config.retryAfter
        ? `You've used all your messages for this period. Upgrade for higher limits, or wait ${config.retryAfter} seconds.`
        : "You've used all your messages for this period. Upgrade for higher limits.";
    case "tier-gate":
      return `This feature is available on the ${tierName} plan and above. Upgrade to unlock it and accelerate your founder journey.`;
    case "feature-click":
      return `Get access to ${config.featureName || "this feature"} and everything else in the ${tierName} plan.`;
  }
}

/** Get the target plan for checkout based on required tier */
export function getTargetPlan(requiredTier?: UserTier) {
  if (requiredTier === undefined) return PLANS.FUNDRAISING;
  switch (requiredTier) {
    case UserTier.BUILDER:
      return PLANS.BUILDER;
    case UserTier.PRO:
      return PLANS.FUNDRAISING;
    case UserTier.STUDIO:
      return PLANS.VENTURE_STUDIO;
    default:
      return PLANS.FUNDRAISING;
  }
}
