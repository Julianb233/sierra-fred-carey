import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe/server";

interface PortalRequest {
  customerId: string;
  returnUrl: string;
}

/**
 * POST /api/stripe/portal
 *
 * Creates a Stripe Customer Portal session for subscription management.
 * Allows customers to update payment method, view invoices, cancel subscription.
 *
 * Security:
 * - Requires customerId (should be verified against user)
 * - Portal is hosted by Stripe (no sensitive data)
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as PortalRequest;

    if (!body.customerId || !body.returnUrl) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Create customer portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: body.customerId,
      return_url: body.returnUrl,
    });

    return NextResponse.json(
      { url: session.url },
      { status: 200 }
    );
  } catch (error) {
    console.error("Portal error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}