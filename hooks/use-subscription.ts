import { useEffect, useState } from "react";

export interface SubscriptionStatus {
  plan: "free" | "fundraising" | "venture_studio";
  status: "active" | "canceled" | "past_due" | "trialing" | "unpaid" | null;
  isLoading: boolean;
  error: string | null;
  currentPeriodEnd: Date | null;
  canceledAt: Date | null;
}

/**
 * Hook to check user subscription status.
 *
 * IMPLEMENTATION NOTES:
 * 1. Call from authenticated context only
 * 2. Should fetch from /api/user/subscription (implement this endpoint)
 * 3. Cache result to avoid excessive API calls
 * 4. Handle authentication redirects
 *
 * Usage:
 * const { plan, status, isLoading } = useSubscription();
 */
export function useSubscription(): SubscriptionStatus {
  const [subscription, setSubscription] = useState<SubscriptionStatus>({
    plan: "free",
    status: null,
    isLoading: true,
    error: null,
    currentPeriodEnd: null,
    canceledAt: null,
  });

  useEffect(() => {
    async function fetchSubscription() {
      try {
        // TODO: Implement /api/user/subscription endpoint
        // that returns subscription status for authenticated user
        const response = await fetch("/api/user/subscription");

        if (!response.ok) {
          if (response.status === 401) {
            throw new Error("Not authenticated");
          }
          throw new Error("Failed to fetch subscription");
        }

        const data = (await response.json()) as {
          plan: string;
          status: string;
          currentPeriodEnd: string | null;
          canceledAt: string | null;
        };

        setSubscription({
          plan: (data.plan || "free") as any,
          status: (data.status || null) as any,
          isLoading: false,
          error: null,
          currentPeriodEnd: data.currentPeriodEnd
            ? new Date(data.currentPeriodEnd)
            : null,
          canceledAt: data.canceledAt ? new Date(data.canceledAt) : null,
        });
      } catch (error) {
        console.error("Error fetching subscription:", error);
        setSubscription((prev) => ({
          ...prev,
          isLoading: false,
          error:
            error instanceof Error ? error.message : "Unknown error occurred",
        }));
      }
    }

    fetchSubscription();
  }, []);

  return subscription;
}

/**
 * Helper hook to check if user has access to a feature
 */
export function useHasFeature(requiredPlan: string): boolean {
  const { plan } = useSubscription();

  const planHierarchy = {
    free: 0,
    fundraising: 1,
    venture_studio: 2,
  };

  return (
    planHierarchy[plan as keyof typeof planHierarchy] >>
    planHierarchy[requiredPlan as keyof typeof planHierarchy]
  );
}