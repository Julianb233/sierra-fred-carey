import { NextRequest, NextResponse } from "next/server";
import { getUserSubscription } from "@/lib/db/subscriptions";
import { getPlanByPriceId, PLANS } from "@/lib/stripe/config";
import { getOptionalUserId } from "@/lib/auth";

/**
 * GET /api/user/subscription
 * Get user's subscription status and plan
 *
 * Returns FREE tier for unauthenticated users (200) so that public pages
 * (e.g. /demo/*) using TierProvider never receive a 401 error response.
 * Authenticated users still receive their actual subscription data.
 */
export async function GET(_request: NextRequest) {
  try {
    const userId = await getOptionalUserId();

    // Unauthenticated users get FREE tier (no 401)
    if (!userId) {
      return NextResponse.json({
        plan: PLANS.FREE,
        subscription: null,
        isActive: false,
      });
    }

    const subscription = await getUserSubscription(userId);

    if (!subscription) {
      return NextResponse.json({
        plan: PLANS.FREE,
        subscription: null,
        isActive: false,
      });
    }

    const plan = getPlanByPriceId(subscription.stripePriceId) || PLANS.FREE;
    // Include past_due in active check: Stripe retries payment for ~30 days
    // This must match lib/api/tier-middleware.ts and lib/context/tier-context.tsx
    const isActive = ["active", "trialing", "past_due"].includes(subscription.status);

    return NextResponse.json({
      plan,
      subscription: {
        status: subscription.status,
        currentPeriodEnd: subscription.currentPeriodEnd,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      },
      isActive,
    });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("Subscription fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch subscription" },
      { status: 500 }
    );
  }
}
