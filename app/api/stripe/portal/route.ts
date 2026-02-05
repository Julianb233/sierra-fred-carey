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
    // SECURITY: Check auth first (don't reveal server config to unauthenticated users)
    const userId = await requireAuth();

    // Check if Stripe is configured
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        {
          error: "Stripe not configured",
          message: "Subscription management is not available. Please contact support.",
          code: "STRIPE_NOT_CONFIGURED"
        },
        { status: 503 }
      );
    }

    const subscription = await getUserSubscription(userId);

    if (!subscription?.stripeCustomerId) {
      return NextResponse.json(
        {
          error: "No subscription found",
          message: "You don't have an active subscription to manage."
        },
        { status: 404 }
      );
    }

    const baseUrl = request.headers.get("origin") || process.env.NEXT_PUBLIC_APP_URL;

    const session = await createCustomerPortalSession({
      customerId: subscription.stripeCustomerId,
      returnUrl: `${baseUrl}/dashboard/settings`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Portal error:", error);

    // Handle specific Stripe errors
    if (error instanceof Error) {
      if (error.message.includes("STRIPE_SECRET_KEY")) {
        return NextResponse.json(
          {
            error: "Stripe not configured",
            message: "Subscription management is not available. Please contact support.",
            code: "STRIPE_NOT_CONFIGURED"
          },
          { status: 503 }
        );
      }
    }

    // Return auth errors directly
    if (error instanceof Response) return error;

    return NextResponse.json(
      { error: "Failed to create portal session" },
      { status: 500 }
    );
  }
}
