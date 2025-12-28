import { NextRequest, NextResponse } from "next/server";
import { createCheckoutSession } from "@/lib/stripe/server";
import { getUserSubscription } from "@/lib/db/subscriptions";
import { requireAuth } from "@/lib/auth";

/**
 * POST /api/stripe/checkout
 * Create Stripe checkout session
 *
 * SECURITY: Requires authentication - userId from server-side session
 */
export async function POST(request: NextRequest) {
  try {
    // SECURITY: Get userId from server-side session
    const userId = await requireAuth();

    const { priceId } = await request.json();

    if (!priceId) {
      return NextResponse.json(
        { error: "Price ID is required" },
        { status: 400 }
      );
    }

    // Check if user already has a subscription
    const existingSubscription = await getUserSubscription(userId);
    const customerId = existingSubscription?.stripeCustomerId;

    const baseUrl = request.headers.get("origin") || process.env.NEXT_PUBLIC_APP_URL;

    const session = await createCheckoutSession({
      priceId,
      customerId: customerId || undefined,
      userId,
      successUrl: `${baseUrl}/dashboard?success=true`,
      cancelUrl: `${baseUrl}/pricing?canceled=true`,
    });

    return NextResponse.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    console.error("Checkout error:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
