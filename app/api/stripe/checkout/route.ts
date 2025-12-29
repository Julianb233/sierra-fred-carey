import { NextRequest, NextResponse } from "next/server";
import { createCheckoutSession } from "@/lib/stripe/server";
import { getUserSubscription } from "@/lib/db/subscriptions";
import { requireAuth } from "@/lib/auth";
import { PLANS, getPlanByPriceId } from "@/lib/stripe/config";

/**
 * POST /api/stripe/checkout
 * Create Stripe checkout session
 *
 * SECURITY: Requires authentication - userId from server-side session
 */
export async function POST(request: NextRequest) {
  try {
    // Check if Stripe is configured
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        {
          error: "Stripe not configured",
          message: "Payment processing is not available. Please contact support.",
          code: "STRIPE_NOT_CONFIGURED"
        },
        { status: 503 }
      );
    }

    // SECURITY: Get userId from server-side session
    const userId = await requireAuth();

    const { priceId, tier } = await request.json();

    // Support both direct priceId and tier-based lookup
    let resolvedPriceId = priceId;
    if (!resolvedPriceId && tier) {
      const tierKey = tier.toUpperCase();
      if (tierKey in PLANS) {
        resolvedPriceId = PLANS[tierKey as keyof typeof PLANS].priceId;
      }
    }

    if (!resolvedPriceId) {
      return NextResponse.json(
        { error: "Price ID or tier is required" },
        { status: 400 }
      );
    }

    // Validate the priceId exists in our plans
    const plan = getPlanByPriceId(resolvedPriceId);
    if (!plan) {
      return NextResponse.json(
        { error: "Invalid price ID" },
        { status: 400 }
      );
    }

    // Check if user already has a subscription
    const existingSubscription = await getUserSubscription(userId);
    const customerId = existingSubscription?.stripeCustomerId;

    // Prevent downgrade/same-tier subscription via checkout
    if (existingSubscription && existingSubscription.status === "active") {
      const currentPlan = getPlanByPriceId(existingSubscription.stripePriceId);
      if (currentPlan && currentPlan.price >= plan.price) {
        return NextResponse.json(
          {
            error: "Cannot downgrade via checkout",
            message: "Please use the customer portal to manage your subscription.",
            portalUrl: "/api/stripe/portal"
          },
          { status: 400 }
        );
      }
    }

    const baseUrl = request.headers.get("origin") || process.env.NEXT_PUBLIC_APP_URL;

    const session = await createCheckoutSession({
      priceId: resolvedPriceId,
      customerId: customerId || undefined,
      userId,
      successUrl: `${baseUrl}/dashboard?success=true&tier=${plan.id}`,
      cancelUrl: `${baseUrl}/pricing?canceled=true`,
    });

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
      plan: {
        id: plan.id,
        name: plan.name,
        price: plan.price
      }
    });
  } catch (error) {
    console.error("Checkout error:", error);

    // Handle specific Stripe errors
    if (error instanceof Error) {
      if (error.message.includes("STRIPE_SECRET_KEY")) {
        return NextResponse.json(
          {
            error: "Stripe not configured",
            message: "Payment processing is not available. Please contact support.",
            code: "STRIPE_NOT_CONFIGURED"
          },
          { status: 503 }
        );
      }
    }

    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
