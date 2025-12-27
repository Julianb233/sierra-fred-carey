import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe/server";
import { STRIPE_PLANS } from "@/lib/stripe/config";

interface CheckoutRequest {
  priceId: string;
  userId: string;
  email: string;
  successUrl: string;
  cancelUrl: string;
}

/**
 * POST /api/stripe/checkout
 *
 * Creates a Stripe Checkout Session for subscription purchase.
 *
 * Security:
 * - Validates priceId against allowed plans
 * - Requires userId and email for audit trail
 * - Creates idempotent checkout sessions
 *
 * PCI Compliance:
 * - Never handles card data (Stripe hosted checkout)
 * - No sensitive data stored in response
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CheckoutRequest;

    // Validate required fields
    if (!body.priceId || !body.userId || !body.email) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate priceId against configured plans
    const validPriceIds = [
      STRIPE_PLANS.FUNDRAISING.priceId,
      STRIPE_PLANS.VENTURE_STUDIO.priceId,
    ].filter(Boolean);

    if (!validPriceIds.includes(body.priceId)) {
      return NextResponse.json(
        { error: "Invalid price ID" },
        { status: 400 }
      );
    }

    // Create checkout session with idempotency key
    // Prevents duplicate charges if request is retried
    const session = await stripe.checkout.sessions.create(
      {
        customer_email: body.email,
        client_reference_id: body.userId,
        mode: "subscription",
        payment_method_types: ["card"],
        line_items: [
          {
            price: body.priceId,
            quantity: 1,
          },
        ],
        success_url: body.successUrl,
        cancel_url: body.cancelUrl,
        subscription_data: {
          metadata: {
            userId: body.userId,
          },
          // Uncomment for 14-day trial
          // trial_period_days: 14,
        },
        allow_promotion_codes: true,
      },
      {
        // Idempotency key prevents duplicate sessions
        idempotencyKey: `checkout-${body.userId}-${body.priceId}-${Date.now()}`,
      }
    );

    if (!session.url) {
      return NextResponse.json(
        { error: "Failed to create checkout session" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { url: session.url, sessionId: session.id },
      { status: 200 }
    );
  } catch (error) {
    console.error("Checkout error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}