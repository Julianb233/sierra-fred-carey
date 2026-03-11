import { NextRequest, NextResponse } from "next/server";
import { createCheckoutSession } from "@/lib/stripe/server";
import { PLANS } from "@/lib/stripe/config";
import { corsHeaders, handleCorsOptions } from "@/lib/api/cors";

/**
 * POST /api/funnel/checkout
 * Create Stripe checkout session for the funnel (u.joinsahara.com).
 *
 * Unlike the main checkout route, this does NOT require authentication.
 * The funnel is a static Vite app where users may not have accounts yet.
 * Stripe Checkout handles collecting payment info and creating the customer.
 *
 * After checkout, the user is redirected to the main app to complete signup.
 */

// Map user-facing tier names to internal plan keys
const TIER_TO_PLAN_KEY: Record<string, keyof typeof PLANS> = {
  PRO: "FUNDRAISING",
  FUNDRAISING: "FUNDRAISING",
  STUDIO: "VENTURE_STUDIO",
  VENTURE_STUDIO: "VENTURE_STUDIO",
};

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");

  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error("[Funnel Checkout] STRIPE_SECRET_KEY not set");
      return NextResponse.json(
        {
          error: "Stripe not configured",
          message: "Payment processing is not available. Please contact support.",
          code: "STRIPE_NOT_CONFIGURED",
        },
        { status: 503, headers: corsHeaders(origin) }
      );
    }

    const body = await request.json();
    const { tier, email } = body;

    const planKey = TIER_TO_PLAN_KEY[(tier || "PRO").toUpperCase()];
    if (!planKey) {
      return NextResponse.json(
        {
          error: "Invalid tier",
          message: `Tier '${tier}' is not available. Choose 'pro' or 'studio'.`,
          code: "INVALID_TIER",
        },
        { status: 400, headers: corsHeaders(origin) }
      );
    }

    const plan = PLANS[planKey];
    const priceId = plan.priceId;

    if (!priceId) {
      console.error(`[Funnel Checkout] No priceId configured for plan: ${planKey}`);
      return NextResponse.json(
        {
          error: "Price not configured",
          message: "This plan is not yet available. Please try again later.",
          code: "PRICE_NOT_CONFIGURED",
        },
        { status: 500, headers: corsHeaders(origin) }
      );
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://joinsahara.com";
    const funnelUrl = process.env.NEXT_PUBLIC_FUNNEL_URL || "https://u.joinsahara.com";

    // After successful checkout, redirect to main app onboarding with session info.
    // After cancellation, redirect back to the funnel.
    const session = await createCheckoutSession({
      priceId,
      customerEmail: email || undefined,
      userId: "funnel-pending", // Placeholder -- reconciled after user creates account
      successUrl: `${baseUrl}/onboarding?checkout=success&tier=${plan.id}&session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${funnelUrl}/?checkout=canceled`,
    });

    console.log(`[Funnel Checkout] Session created: ${session.id}, plan: ${plan.id}, email: ${email || "not provided"}`);

    return NextResponse.json(
      {
        url: session.url,
        sessionId: session.id,
        plan: {
          id: plan.id,
          name: plan.name,
          price: plan.price,
        },
      },
      { headers: corsHeaders(origin) }
    );
  } catch (error) {
    console.error("[Funnel Checkout] Error:", error);

    if (error instanceof Error && error.message.includes("STRIPE_SECRET_KEY")) {
      return NextResponse.json(
        {
          error: "Stripe not configured",
          message: "Payment processing is not available.",
          code: "STRIPE_NOT_CONFIGURED",
        },
        { status: 503, headers: corsHeaders(origin) }
      );
    }

    return NextResponse.json(
      {
        error: "Checkout failed",
        message: "Failed to create checkout session. Please try again.",
        code: "CHECKOUT_FAILED",
      },
      { status: 500, headers: corsHeaders(origin) }
    );
  }
}

/**
 * OPTIONS /api/funnel/checkout
 * Handle CORS preflight for cross-origin requests from the funnel.
 */
export async function OPTIONS(request: NextRequest) {
  return handleCorsOptions(request);
}
