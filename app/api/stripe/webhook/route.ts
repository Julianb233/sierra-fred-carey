import { NextRequest, NextResponse } from "next/server";
import { constructWebhookEvent, getSubscription } from "@/lib/stripe/server";
import {
  createOrUpdateSubscription,
  recordStripeEvent,
  getStripeEventById,
  markEventAsProcessed,
} from "@/lib/db/subscriptions";
import Stripe from "stripe";

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

export async function POST(request: NextRequest) {
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
    return NextResponse.json(
      { error: "Invalid signature" },
      { status: 400 }
    );
  }

  // Idempotency check
  const existingEvent = await getStripeEventById(event.id);
  if (existingEvent?.status === "processed") {
    return NextResponse.json({ received: true, status: "already_processed" });
  }

  // Record the event
  const stripeEvent = await recordStripeEvent({
    stripeEventId: event.id,
    type: event.type,
    stripeCustomerId:
      (event.data.object as { customer?: string }).customer || null,
    status: "pending",
    payload: JSON.parse(JSON.stringify(event.data.object)) as Record<string, unknown>,
  });

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode === "subscription" && session.subscription) {
          const subscription = await getSubscription(
            session.subscription as string
          );
          await handleSubscriptionUpdate(subscription, session.client_reference_id!);
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata.userId;
        if (userId) {
          await handleSubscriptionUpdate(subscription, userId);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata.userId;
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
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const invoiceData = invoice as unknown as Record<string, unknown>;
        const subscriptionId = invoiceData.subscription;
        if (subscriptionId) {
          const subscription = await getSubscription(subscriptionId as string);
          const userId = subscription.metadata.userId;
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
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
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
