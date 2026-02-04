import { NextRequest, NextResponse } from "next/server";
import { getUserSubscription } from "@/lib/db/subscriptions";
import { getPlanByPriceId, PLANS } from "@/lib/stripe/config";
import { requireAuth } from "@/lib/auth";

/**
 * GET /api/user/subscription
 * Get user's subscription status and plan
 *
 * SECURITY: Requires authentication - userId from server-side session
 */
export async function GET(request: NextRequest) {
  try {
    // SECURITY: Get userId from server-side session
    const userId = await requireAuth();

    const subscription = await getUserSubscription(userId);

    if (!subscription) {
      return NextResponse.json({
        plan: PLANS.FREE,
        subscription: null,
        isActive: false,
      });
    }

    const plan = getPlanByPriceId(subscription.stripePriceId) || PLANS.FREE;
    const isActive = ["active", "trialing"].includes(subscription.status);

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
    console.error("Subscription fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch subscription" },
      { status: 500 }
    );
  }
}
