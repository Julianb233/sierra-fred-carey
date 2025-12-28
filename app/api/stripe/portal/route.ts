import { NextRequest, NextResponse } from "next/server";
import { createCustomerPortalSession } from "@/lib/stripe/server";
import { getUserSubscription } from "@/lib/db/subscriptions";
import { requireAuth } from "@/lib/auth";

/**
 * POST /api/stripe/portal
 * Create Stripe customer portal session
 *
 * SECURITY: Requires authentication - userId from server-side session
 */
export async function POST(request: NextRequest) {
  try {
    // SECURITY: Get userId from server-side session
    const userId = await requireAuth();

    const subscription = await getUserSubscription(userId);

    if (!subscription?.stripeCustomerId) {
      return NextResponse.json(
        { error: "No subscription found" },
        { status: 404 }
      );
    }

    const baseUrl = request.headers.get("origin") || process.env.NEXT_PUBLIC_APP_URL;

    const session = await createCustomerPortalSession({
      customerId: subscription.stripeCustomerId,
      returnUrl: `${baseUrl}/dashboard`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Portal error:", error);
    return NextResponse.json(
      { error: "Failed to create portal session" },
      { status: 500 }
    );
  }
}
