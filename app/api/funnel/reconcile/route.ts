import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import {
  getCheckoutSession,
  updateSubscriptionMetadata,
} from "@/lib/stripe/server";
import { createOrUpdateSubscription } from "@/lib/db/subscriptions";
import { getPlanByPriceId } from "@/lib/stripe/config";
import { getTierFromString } from "@/lib/constants";
import Stripe from "stripe";

/**
 * POST /api/funnel/reconcile
 *
 * After a funnel user completes Stripe Checkout and then signs up on the
 * main app, the frontend calls this endpoint with the Stripe session_id.
 * We link the subscription to the now-authenticated user.
 *
 * Requires authentication (user must have completed signup first).
 */
export async function POST(request: NextRequest) {
  let userId: string;
  try {
    userId = await requireAuth();
  } catch (response) {
    return response as NextResponse;
  }

  try {
    const body = await request.json();
    const { sessionId } = body;

    if (!sessionId || typeof sessionId !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid sessionId" },
        { status: 400 }
      );
    }

    // Retrieve the checkout session from Stripe
    const session = await getCheckoutSession(sessionId);

    // Verify the session was created by the funnel (client_reference_id = "funnel-pending")
    if (session.client_reference_id !== "funnel-pending") {
      return NextResponse.json(
        { error: "Session is not a funnel checkout" },
        { status: 400 }
      );
    }

    // Get subscription details
    const subscription = session.subscription as Stripe.Subscription | null;
    if (!subscription) {
      return NextResponse.json(
        { error: "No subscription found for this session" },
        { status: 400 }
      );
    }

    // Update Stripe subscription metadata with the real userId
    await updateSubscriptionMetadata(subscription.id, { userId });

    // Determine the plan/tier from the price
    const priceId = subscription.items.data[0]?.price.id || "";
    const plan = getPlanByPriceId(priceId);
    const tier = plan ? getTierFromString(plan.id) : "free";

    // Get period info
    const sub = subscription as unknown as Record<string, unknown>;
    const periodStart = (sub.current_period_start ?? sub.currentPeriodStart) as number;
    const periodEnd = (sub.current_period_end ?? sub.currentPeriodEnd) as number;
    const trialStartVal = (sub.trial_start ?? sub.trialStart) as number | null;
    const trialEndVal = (sub.trial_end ?? sub.trialEnd) as number | null;

    // Create the subscription record in our DB, linked to the real user
    await createOrUpdateSubscription({
      userId,
      stripeCustomerId: subscription.customer as string,
      stripeSubscriptionId: subscription.id,
      stripePriceId: priceId,
      status: subscription.status as "active" | "trialing",
      currentPeriodStart: new Date(periodStart * 1000),
      currentPeriodEnd: new Date(periodEnd * 1000),
      trialStart: trialStartVal ? new Date(trialStartVal * 1000) : null,
      trialEnd: trialEndVal ? new Date(trialEndVal * 1000) : null,
    });

    return NextResponse.json({
      success: true,
      tier,
      subscriptionId: subscription.id,
    });
  } catch (error) {
    console.error("[Funnel Reconcile] Error:", error);
    return NextResponse.json(
      { error: "Failed to reconcile subscription" },
      { status: 500 }
    );
  }
}
