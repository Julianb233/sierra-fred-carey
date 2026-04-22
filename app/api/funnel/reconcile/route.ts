import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import {
  getCheckoutSession,
  updateSubscriptionMetadata,
} from "@/lib/stripe/server";
import { createOrUpdateSubscription } from "@/lib/db/subscriptions";
import { getPlanByPriceId } from "@/lib/stripe/config";
import Stripe from "stripe";

/**
 * POST /api/funnel/reconcile
 *
 * Links a funnel Stripe checkout session to an authenticated user.
 *
 * Flow:
 * 1. User pays on funnel (you.joinsahara.com) → Stripe checkout with userId "funnel-pending"
 * 2. User is redirected to main app onboarding with session_id in URL
 * 3. User creates account / logs in on main app
 * 4. Frontend calls this endpoint with the session_id to link the subscription
 *
 * Security: Requires authentication — userId comes from server-side session, not client.
 */
export async function POST(request: NextRequest) {
  try {
    const userId = await requireAuth();

    const { sessionId } = await request.json();

    if (!sessionId || typeof sessionId !== "string") {
      return NextResponse.json(
        { error: "sessionId is required" },
        { status: 400 }
      );
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { error: "Stripe not configured", code: "STRIPE_NOT_CONFIGURED" },
        { status: 503 }
      );
    }

    // Retrieve the checkout session from Stripe
    const session = await getCheckoutSession(sessionId);

    if (!session) {
      return NextResponse.json(
        { error: "Checkout session not found" },
        { status: 404 }
      );
    }

    // Verify this is a funnel checkout (client_reference_id = "funnel-pending")
    if (session.client_reference_id !== "funnel-pending") {
      // Already reconciled or not a funnel session
      return NextResponse.json(
        { error: "Session already reconciled or not a funnel checkout" },
        { status: 400 }
      );
    }

    if (session.status !== "complete") {
      return NextResponse.json(
        { error: "Checkout session is not complete" },
        { status: 400 }
      );
    }

    const subscription = session.subscription as Stripe.Subscription | null;
    if (!subscription) {
      return NextResponse.json(
        { error: "No subscription found for this session" },
        { status: 400 }
      );
    }

    const subscriptionId =
      typeof subscription === "string" ? subscription : subscription.id;
    const customerId = session.customer as string;

    // Update Stripe subscription metadata with the real userId
    await updateSubscriptionMetadata(subscriptionId, { userId });

    // Resolve price ID from the subscription
    const sub =
      typeof subscription === "string"
        ? null
        : subscription;
    const priceId = sub?.items?.data?.[0]?.price?.id || "";
    const plan = priceId ? getPlanByPriceId(priceId) : null;

    // Resolve subscription period
    const subData = sub as unknown as Record<string, unknown> | null;
    const periodStart = subData?.current_period_start ?? subData?.currentPeriodStart;
    const periodEnd = subData?.current_period_end ?? subData?.currentPeriodEnd;

    // Create or update the subscription in our DB linked to the real user
    await createOrUpdateSubscription({
      userId,
      stripeCustomerId: typeof customerId === "string" ? customerId : "",
      stripeSubscriptionId: subscriptionId,
      stripePriceId: priceId,
      status: (sub?.status as "active" | "trialing") || "active",
      currentPeriodStart: periodStart
        ? new Date((periodStart as number) * 1000)
        : new Date(),
      currentPeriodEnd: periodEnd
        ? new Date((periodEnd as number) * 1000)
        : new Date(),
    });

    console.log(
      `[Funnel Reconcile] Linked session ${sessionId} → user ${userId}, subscription ${subscriptionId}`
    );

    return NextResponse.json({
      success: true,
      plan: plan
        ? { id: plan.id, name: plan.name, price: plan.price }
        : null,
      subscriptionId,
    });
  } catch (error) {
    console.error("[Funnel Reconcile] Error:", error);

    // Return auth errors directly
    if (error instanceof Response) return error;

    return NextResponse.json(
      { error: "Failed to reconcile funnel checkout" },
      { status: 500 }
    );
  }
}
