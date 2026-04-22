import { NextRequest, NextResponse } from "next/server";
import { createCheckoutSession } from "@/lib/stripe/server";
import { PLANS } from "@/lib/stripe/config";
import { corsHeaders, handleCorsOptions } from "@/lib/api/cors";

/**
 * POST /api/funnel/checkout
 * Create Stripe checkout session for the legacy funnel (you.joinsahara.com).
 *
 * Unlike the main checkout route, this does NOT require authentication.
 * The funnel is a static Vite app where users may not have accounts yet.
 * Stripe Checkout handles collecting payment info and creating the customer.
 *
 * After checkout, the user is redirected to the main app to complete signup.
 * The /api/funnel/reconcile endpoint then links the subscription to the real user.
 */
export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");

  try {
    if (!process.env.STRIPE_SECRET_KEY) {
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

    // Map tier to plan
    const TIER_TO_PLAN_KEY: Record<string, keyof typeof PLANS> = {
      PRO: "FUNDRAISING",
      FUNDRAISING: "FUNDRAISING",
      STUDIO: "VENTURE_STUDIO",
      VENTURE_STUDIO: "VENTURE_STUDIO",
    };

    const planKey = TIER_TO_PLAN_KEY[(tier || "PRO").toUpperCase()];
    if (!planKey) {
      return NextResponse.json(
        { error: "Invalid tier. Available tiers: 'pro', 'studio'." },
        { status: 400, headers: corsHeaders(origin) }
      );
    }

    const plan = PLANS[planKey];
    const priceId = plan.priceId;

    if (!priceId) {
      return NextResponse.json(
        { error: "Price ID not configured for this plan." },
        { status: 500, headers: corsHeaders(origin) }
      );
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://joinsahara.com";
    const funnelUrl = process.env.NEXT_PUBLIC_FUNNEL_URL || "https://you.joinsahara.com";

    // After successful checkout, redirect to main app onboarding with success flag.
    // After cancellation, redirect back to the funnel.
    const sessionParams: Parameters<typeof createCheckoutSession>[0] = {
      priceId,
      userId: "funnel-pending", // Placeholder -- reconcile endpoint links to real user after signup
      customerEmail: email || undefined,
      successUrl: `${baseUrl}/onboarding?checkout=success&tier=${plan.id}&source=funnel&session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${funnelUrl}/?checkout=canceled`,
    };

    const session = await createCheckoutSession(sessionParams);

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
      { error: "Failed to create checkout session" },
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
