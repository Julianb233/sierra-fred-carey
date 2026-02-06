"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import {
  UserTier,
  TIER_FEATURES,
  TIER_NAMES,
  canAccessFeature,
  getTierFromString,
} from "@/lib/constants";

// ============================================================================
// Types
// ============================================================================

interface TierContextValue {
  /** Current user tier */
  tier: UserTier;
  /** Tier display name */
  tierName: string;
  /** Whether tier is loading */
  isLoading: boolean;
  /** Whether user has an active subscription */
  isSubscriptionActive: boolean;
  /** Features available to this tier */
  features: readonly string[];
  /** Check if user can access a feature */
  canAccess: (requiredTier: UserTier) => boolean;
  /** Check if a feature string is available */
  hasFeature: (featureName: string) => boolean;
  /** Refresh tier from API */
  refresh: () => Promise<void>;
}

// ============================================================================
// Context
// ============================================================================

const TierContext = createContext<TierContextValue | null>(null);

// ============================================================================
// Provider
// ============================================================================

interface TierProviderProps {
  children: ReactNode;
  /** Initial tier (for SSR) */
  initialTier?: UserTier;
}

export function TierProvider({ children, initialTier }: TierProviderProps) {
  const [tier, setTier] = useState<UserTier>(initialTier ?? UserTier.FREE);
  const [isLoading, setIsLoading] = useState(initialTier === undefined);
  const [isSubscriptionActive, setIsSubscriptionActive] = useState(false);

  const fetchTier = useCallback(async () => {
    try {
      setIsLoading(true);

      const response = await fetch("/api/user/subscription");

      if (!response.ok) {
        // User not authenticated or error - default to FREE
        setTier(UserTier.FREE);
        setIsSubscriptionActive(false);
        return;
      }

      const data = await response.json();

      // API returns: { plan: { id, name, ... }, subscription: { status, ... } | null, isActive: boolean }
      if (data.isActive && ["active", "trialing", "past_due"].includes(data.subscription?.status)) {
        setIsSubscriptionActive(true);
        setTier(getTierFromString(data.plan?.id || "free"));
      } else {
        setTier(UserTier.FREE);
        setIsSubscriptionActive(false);
      }
    } catch (error) {
      console.error("[TierContext] Error fetching tier:", error);
      setTier(UserTier.FREE);
      setIsSubscriptionActive(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch tier on mount
  useEffect(() => {
    if (initialTier === undefined) {
      fetchTier();
    }
  }, [initialTier, fetchTier]);

  const canAccess = useCallback(
    (requiredTier: UserTier) => canAccessFeature(tier, requiredTier),
    [tier]
  );

  const hasFeature = useCallback(
    (featureName: string) => {
      // Check all features for this tier and below
      const normalizedName = featureName.toLowerCase();
      for (let t = tier; t >= 0; t--) {
        const tierFeatures = TIER_FEATURES[t as UserTier] || [];
        if (
          tierFeatures.some((f) => f.toLowerCase().includes(normalizedName))
        ) {
          return true;
        }
      }
      return false;
    },
    [tier]
  );

  const value: TierContextValue = {
    tier,
    tierName: TIER_NAMES[tier],
    isLoading,
    isSubscriptionActive,
    features: TIER_FEATURES[tier],
    canAccess,
    hasFeature,
    refresh: fetchTier,
  };

  return <TierContext.Provider value={value}>{children}</TierContext.Provider>;
}

// ============================================================================
// Hook
// ============================================================================

export function useTier(): TierContextValue {
  const context = useContext(TierContext);

  if (!context) {
    throw new Error("useTier must be used within a TierProvider");
  }

  return context;
}

// ============================================================================
// Standalone Hook (no provider required)
// ============================================================================

export function useUserTier() {
  const [tier, setTier] = useState<UserTier>(UserTier.FREE);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubscriptionActive, setIsSubscriptionActive] = useState(false);

  useEffect(() => {
    const fetchTier = async () => {
      try {
        const response = await fetch("/api/user/subscription");

        if (!response.ok) {
          setTier(UserTier.FREE);
          setIsSubscriptionActive(false);
          return;
        }

        const data = await response.json();

        // API returns: { plan: { id, name, ... }, subscription: { status, ... } | null, isActive: boolean }
        if (data.isActive && ["active", "trialing", "past_due"].includes(data.subscription?.status)) {
          setIsSubscriptionActive(true);
          setTier(getTierFromString(data.plan?.id || "free"));
        } else {
          setTier(UserTier.FREE);
          setIsSubscriptionActive(false);
        }
      } catch (error) {
        console.error("[useUserTier] Error:", error);
        setTier(UserTier.FREE);
        setIsSubscriptionActive(false);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTier();
  }, []);

  const canAccess = useCallback(
    (requiredTier: UserTier) => canAccessFeature(tier, requiredTier),
    [tier]
  );

  return {
    tier,
    tierName: TIER_NAMES[tier],
    isLoading,
    isSubscriptionActive,
    features: TIER_FEATURES[tier],
    canAccess,
  };
}
