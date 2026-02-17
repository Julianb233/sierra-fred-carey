import { NextRequest, NextResponse } from "next/server";
import { getUserSubscription } from "@/lib/db/subscriptions";
import { getPlanByPriceId, PLANS } from "@/lib/stripe/config";
import { getOptionalUserId } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";

/**
 * GET /api/user/subscription
 * Get user's subscription status and plan
 *
 * Returns FREE tier for unauthenticated users (200) so that public pages
 * (e.g. /demo/*) using TierProvider never receive a 401 error response.
 * Authenticated users still receive their actual subscription data.
 *
 * Fallback: when no Stripe subscription exists, checks profiles.tier
 * for admin-managed tier assignments.
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

    if (subscription) {
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
    }

    // Fallback: check profiles.tier for admin-managed tier assignments
    const profileTier = await getProfileTier(userId);
    if (profileTier !== null && profileTier > 0) {
      const plan = profileTier >= 2 ? PLANS.VENTURE_STUDIO : PLANS.FUNDRAISING;
      return NextResponse.json({
        plan,
        subscription: { status: "active", currentPeriodEnd: null, cancelAtPeriodEnd: false },
        isActive: true,
      });
    }

    return NextResponse.json({
      plan: PLANS.FREE,
      subscription: null,
      isActive: false,
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

async function getProfileTier(userId: string): Promise<number | null> {
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("tier")
      .eq("id", userId)
      .single();
    if (error || !data) return null;
    return data.tier ?? null;
  } catch {
    return null;
  }
}
