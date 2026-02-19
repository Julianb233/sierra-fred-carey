import { NextRequest, NextResponse } from "next/server";
import { constructWebhookEvent, getSubscription } from "@/lib/stripe/server";
import {
  createOrUpdateSubscription,
  getSubscriptionByCustomerId,
  recordStripeEvent,
  getStripeEventById,
  markEventAsProcessed,
  markEventAsFailed,
} from "@/lib/db/subscriptions";
import { getPlanByPriceId } from "@/lib/stripe/config";
import { getTierFromString, UserTier } from "@/lib/constants";
import Stripe from "stripe";
import { serverTrack } from "@/lib/analytics/server";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { captureError, captureMessage } from "@/lib/sentry";

// Helper to get period timestamps from subscription
function getSubscriptionPeriod(subscription: Stripe.Subscription) {
  // Handle both snake_case and camelCase depending on Stripe SDK version
  const sub = subscription as unknown as Record<string, unknown>;
  const periodStart = sub.current_period_start ?? sub.currentPeriodStart;
  const periodEnd = sub.current_period_end ?? sub.currentPeriodEnd;
  const cancelAtEnd = sub.cancel_at_period_end ?? sub.cancelAtPeriodEnd;
  const trialStartVal = sub.trial_start ?? sub.trialStart;
  const trialEndVal = sub.trial_end ?? sub.trialEnd;

  return {
    currentPeriodStart: new Date((periodStart as number) * 1000),
    currentPeriodEnd: new Date((periodEnd as number) * 1000),
    cancelAtPeriodEnd: Boolean(cancelAtEnd),
    trialStart: trialStartVal ? new Date((trialStartVal as number) * 1000) : null,
    trialEnd: trialEndVal ? new Date((trialEndVal as number) * 1000) : null,
  };
}

// Helper to get user tier from subscription
function getUserTierFromSubscription(subscription: Stripe.Subscription): UserTier {
  const priceId = subscription.items.data[0]?.price.id;
  if (!priceId) return UserTier.FREE;

  const plan = getPlanByPriceId(priceId);
  if (!plan) return UserTier.FREE;

  return getTierFromString(plan.id);
}

export async function POST(request: NextRequest) {
  // Check if Stripe is configured
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
    console.error("Stripe webhook: Missing STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET");
    return NextResponse.json(
      {
        error: "Stripe not configured",
        message: "Webhook processing is not available.",
        code: "STRIPE_NOT_CONFIGURED"
      },
      { status: 503 }
    );
  }

  const payload = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = await constructWebhookEvent(payload, signature);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    captureMessage("Stripe webhook signature verification failed", "warning");

    // Check if this is a configuration error
    if (err instanceof Error && err.message.includes("STRIPE_WEBHOOK_SECRET")) {
      return NextResponse.json(
        {
          error: "Stripe not configured",
          message: "Webhook secret is not set.",
          code: "STRIPE_NOT_CONFIGURED"
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: "Invalid signature" },
      { status: 400 }
    );
  }

  // Atomic idempotency: INSERT ... ON CONFLICT DO NOTHING
  // If another handler already claimed this event, recordStripeEvent returns null
  const stripeEvent = await recordStripeEvent({
    stripeEventId: event.id,
    type: event.type,
    stripeCustomerId:
      (event.data.object as { customer?: string }).customer || null,
    status: "pending",
    payload: event.data.object as unknown as Record<string, unknown>,
  });

  if (!stripeEvent) {
    // Event already claimed by another handler — safe to skip
    return NextResponse.json({ received: true, status: "already_claimed" });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode === "subscription" && session.subscription) {
          const subscription = await getSubscription(
            session.subscription as string
          );
          let userId = session.client_reference_id;
          if (!userId) {
            // Fallback: try to resolve userId from subscription metadata or customer ID
            userId = await resolveUserIdFromSubscription(subscription);
          }
          if (!userId) {
            console.error(`[Webhook] checkout.session.completed: No userId found. Session: ${session.id}, Subscription: ${subscription.id}`);
            await markEventAsFailed(stripeEvent.id, `No userId found for checkout session ${session.id}`);
            break;
          }
          await handleSubscriptionUpdate(subscription, userId);
          serverTrack(userId, ANALYTICS_EVENTS.SUBSCRIPTION.CHECKOUT_COMPLETED, { priceId: subscription.items.data[0]?.price.id });
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = await resolveUserIdFromSubscription(subscription);
        if (userId) {
          const newTier = getUserTierFromSubscription(subscription);
          serverTrack(userId, ANALYTICS_EVENTS.SUBSCRIPTION.TIER_CHANGED, { toTier: newTier, priceId: subscription.items.data[0]?.price.id });
          await handleSubscriptionUpdate(subscription, userId);
        } else {
          console.error(`[Webhook] No userId found for subscription ${subscription.id}`);
          await markEventAsFailed(stripeEvent.id, `No userId found for subscription ${subscription.id}`);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = await resolveUserIdFromSubscription(subscription);
        if (userId) {
          const period = getSubscriptionPeriod(subscription);
          await createOrUpdateSubscription({
            userId,
            stripeCustomerId: subscription.customer as string,
            stripeSubscriptionId: subscription.id,
            stripePriceId: subscription.items.data[0]?.price.id || "",
            status: "canceled",
            currentPeriodStart: period.currentPeriodStart,
            currentPeriodEnd: period.currentPeriodEnd,
            canceledAt: new Date(),
          });
        } else {
          console.error(`[Webhook] No userId found for deleted subscription ${subscription.id}`);
          await markEventAsFailed(stripeEvent.id, `No userId found for deleted subscription ${subscription.id}`);
        }
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        const invoiceData = invoice as unknown as Record<string, unknown>;
        const subscriptionId = invoiceData.subscription;
        if (!subscriptionId) {
          console.error(`[Webhook] invoice.payment_succeeded: No subscriptionId on invoice ${invoice.id}`);
          break;
        }
        const subscription = await getSubscription(subscriptionId as string);
        const userId = await resolveUserIdFromSubscription(subscription);
        if (!userId) {
          console.error(`[Webhook] invoice.payment_succeeded: No userId found. Invoice: ${invoice.id}, Subscription: ${subscription.id}`);
          await markEventAsFailed(stripeEvent.id, `No userId found for invoice ${invoice.id}`);
          break;
        }
        await handleSubscriptionUpdate(subscription, userId);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const invoiceData = invoice as unknown as Record<string, unknown>;
        const subscriptionId = invoiceData.subscription;
        if (subscriptionId) {
          const subscription = await getSubscription(subscriptionId as string);
          const userId = await resolveUserIdFromSubscription(subscription);
          if (userId) {
            await createOrUpdateSubscription({
              userId,
              status: "past_due",
            });
          }
        }
        break;
      }
    }

    await markEventAsProcessed(stripeEvent.id);
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook processing error:", error);
    captureError(error instanceof Error ? error : new Error(String(error)), { route: "POST /api/stripe/webhook", eventType: event.type });
    // Track the failure for debugging and retry analysis
    try {
      await markEventAsFailed(
        stripeEvent.id,
        error instanceof Error ? error.message : "Unknown processing error"
      );
    } catch (trackErr) {
      console.error("Failed to mark event as failed:", trackErr);
    }
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}

/**
 * Resolve userId from subscription metadata, falling back to customer-based DB lookup.
 * Fixes the critical issue where metadata.userId may be missing on subscription events.
 */
async function resolveUserIdFromSubscription(
  subscription: Stripe.Subscription
): Promise<string | null> {
  // Try metadata first
  const metadataUserId = subscription.metadata?.userId;
  if (metadataUserId) return metadataUserId;

  // Fallback: look up by Stripe customer ID in our DB
  const customerId = subscription.customer as string;
  if (customerId) {
    const existingSub = await getSubscriptionByCustomerId(customerId);
    if (existingSub?.userId) return existingSub.userId;
  }

  return null;
}

async function handleSubscriptionUpdate(
  subscription: Stripe.Subscription,
  userId: string
) {
  const status = subscription.status as
    | "active"
    | "canceled"
    | "past_due"
    | "trialing"
    | "unpaid";

  const period = getSubscriptionPeriod(subscription);

  await createOrUpdateSubscription({
    userId,
    stripeCustomerId: subscription.customer as string,
    stripeSubscriptionId: subscription.id,
    stripePriceId: subscription.items.data[0]?.price.id || "",
    status,
    currentPeriodStart: period.currentPeriodStart,
    currentPeriodEnd: period.currentPeriodEnd,
    cancelAtPeriodEnd: period.cancelAtPeriodEnd,
    trialStart: period.trialStart,
    trialEnd: period.trialEnd,
  });
}
