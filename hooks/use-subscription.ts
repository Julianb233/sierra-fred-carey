"use client";

import { useState, useEffect, useCallback } from "react";
import { PLANS, type PlanId } from "@/lib/stripe/config";

interface SubscriptionState {
  plan: (typeof PLANS)[PlanId];
  subscription: {
    status: string;
    currentPeriodEnd: string;
    cancelAtPeriodEnd: boolean;
  } | null;
  isActive: boolean;
  isLoading: boolean;
  error: string | null;
}

export function useSubscription() {
  const [state, setState] = useState<SubscriptionState>({
    plan: PLANS.FREE,
    subscription: null,
    isActive: false,
    isLoading: true,
    error: null,
  });

  const fetchSubscription = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      const response = await fetch("/api/user/subscription");

      if (!response.ok) {
        throw new Error("Failed to fetch subscription");
      }

      const data = await response.json();

      setState({
        plan: data.plan,
        subscription: data.subscription,
        isActive: data.isActive,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }));
    }
  }, []);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  const hasFeature = useCallback(
    (requiredPlan: PlanId): boolean => {
      if (!state.isActive) return requiredPlan === "FREE";

      const planHierarchy: PlanId[] = ["FREE", "FUNDRAISING", "VENTURE_STUDIO"];
      const currentIndex = planHierarchy.indexOf(state.plan.id.toUpperCase() as PlanId);
      const requiredIndex = planHierarchy.indexOf(requiredPlan);

      return currentIndex >= requiredIndex;
    },
    [state.plan, state.isActive]
  );

  return {
    ...state,
    refetch: fetchSubscription,
    hasFeature,
  };
}
