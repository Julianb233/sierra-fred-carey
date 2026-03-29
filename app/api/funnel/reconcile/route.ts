import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createOrUpdateSubscription } from "@/lib/db/subscriptions";
import { getPlanByPriceId } from "@/lib/stripe/config";
import Stripe from "stripe";

/**
 * POST /api/funnel/reconcile
 * Reconcile a funnel Stripe checkout session with an authenticated user.
 *
 * After a funnel user completes checkout, they're redirected to the main app
 * to sign up / log in. This endpoint links their Stripe subscription to
 * their newly created (or existing) user account.
 *
 * SECURITY: Requires authentication — userId comes from the server session.
 */
export async function POST(request: NextRequest) {
  try {
    const userId = await requireAuth();

    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { error: "Stripe not configured", code: "STRIPE_NOT_CONFIGURED" },
        { status: 503 }
      );
    }

    const { sessionId } = await request.json();

    if (!sessionId || typeof sessionId !== "string") {
      return NextResponse.json(
        { error: "sessionId is required" },
        { status: 400 }
      );
    }

    // Retrieve the checkout session from Stripe
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2025-12-15.clover",
    });

    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["subscription"],
    });

    if (session.payment_status !== "paid" && session.payment_status !== "no_payment_required") {
      return NextResponse.json(
        { error: "Checkout session has not been paid" },
        { status: 400 }
      );
    }

    const subscription = session.subscription as Stripe.Subscription | null;
    if (!subscription) {
      return NextResponse.json(
        { error: "No subscription found for this checkout session" },
        { status: 400 }
      );
    }

    // Update subscription metadata with the real userId
    await stripe.subscriptions.update(subscription.id, {
      metadata: { userId },
    });

    const priceId = subscription.items.data[0]?.price.id || "";
    const plan = getPlanByPriceId(priceId);

    // Get period info
    const sub = subscription as unknown as Record<string, unknown>;
    const periodStart = (sub.current_period_start ?? sub.currentPeriodStart) as number;
    const periodEnd = (sub.current_period_end ?? sub.currentPeriodEnd) as number;
    const trialStartVal = (sub.trial_start ?? sub.trialStart) as number | null;
    const trialEndVal = (sub.trial_end ?? sub.trialEnd) as number | null;

    // Link the subscription to the authenticated user
    await createOrUpdateSubscription({
      userId,
      stripeCustomerId: subscription.customer as string,
      stripeSubscriptionId: subscription.id,
      stripePriceId: priceId,
      status: subscription.status as "active" | "trialing" | "past_due" | "canceled" | "unpaid",
      currentPeriodStart: new Date(periodStart * 1000),
      currentPeriodEnd: new Date(periodEnd * 1000),
      cancelAtPeriodEnd: false,
      trialStart: trialStartVal ? new Date(trialStartVal * 1000) : null,
      trialEnd: trialEndVal ? new Date(trialEndVal * 1000) : null,
    });

    console.log(`[Funnel Reconcile] Linked subscription ${subscription.id} to user ${userId}, plan: ${plan?.id || "unknown"}`);

    return NextResponse.json({
      success: true,
      plan: plan ? { id: plan.id, name: plan.name, price: plan.price } : null,
      subscriptionId: subscription.id,
      status: subscription.status,
    });
  } catch (error) {
    console.error("[Funnel Reconcile] Error:", error);

    if (error instanceof Response) return error;

    return NextResponse.json(
      { error: "Failed to reconcile checkout session" },
      { status: 500 }
    );
  }
}
