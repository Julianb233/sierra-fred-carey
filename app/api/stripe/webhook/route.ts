import { NextRequest, NextResponse } from "next/server";
import { stripe, getWebhookEvent } from "@/lib/stripe/server";
import Stripe from "stripe";

// Import your database functions here
// import { createOrUpdateSubscription, recordStripeEvent, getStripeEventById, markEventAsProcessed } from "@/lib/db/subscriptions";

/**
 * POST /api/stripe/webhook
 *
 * Handles Stripe webhook events for subscription lifecycle.
 *
 * CRITICAL SECURITY REQUIREMENTS:
 * 1. Signature Verification: ALWAYS verify webhook signature
 * 2. Idempotency: Store event IDs and check for duplicates
 * 3. Quick Response: Return 2xx immediately, before expensive operations
 * 4. Server Validation: Never trust webhook payload - fetch from Stripe API
 *
 * Events handled:
 * - checkout.session.completed: Create subscription record
 * - customer.subscription.updated: Update subscription status
 * - customer.subscription.deleted: Mark subscription as canceled
 * - invoice.payment_succeeded: Log successful payment
 * - invoice.payment_failed: Handle payment failures
 */

// Maximum webhook age in seconds (5 minutes)
const WEBHOOK_MAX_AGE = 300;

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  // Verify webhook signature
  if (!signature) {
    console.error("Missing stripe-signature header");
    return NextResponse.json(
      { error: "Invalid signature" },
      { status: 401 }
    );
  }

  let event: Stripe.Event;

  try {
    event = getWebhookEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET || ""
    );
  } catch (error) {
    console.error("Webhook verification failed:", error);
    return NextResponse.json(
      { error: "Invalid signature" },
      { status: 401 }
    );
  }

  // Verify webhook timestamp to prevent replay attacks
  if (Date.now() - event.created * 1000 > WEBHOOK_MAX_AGE * 1000) {
    console.warn("Webhook too old, ignoring:", event.id);
    return NextResponse.json({ received: true }, { status: 200 });
  }

  // IMPORTANT: Return 2xx status immediately
  // Expensive operations happen AFTER response is sent
  const responsePromise = (async () => {
    try {
      // TODO: Implement database functions from lib/db/subscriptions
      // Uncomment and implement these:
      //
      // const existingEvent = await getStripeEventById(event.id);
      // if (existingEvent) {
      //   console.log("Event already processed:", event.id);
      //   return;
      // }
      //
      // await recordStripeEvent({
      //   stripeEventId: event.id,
      //   type: event.type,
      //   status: "pending",
      //   payload: event.data,
      // });

      // Handle different event types
      switch (event.type) {
        case "checkout.session.completed":
          await handleCheckoutSessionCompleted(
            event as Stripe.Event & {
              data: { object: Stripe.Checkout.Session };
            }
          );
          break;

        case "customer.subscription.updated":
          await handleSubscriptionUpdated(
            event as Stripe.Event & {
              data: { object: Stripe.Subscription };
            }
          );
          break;

        case "customer.subscription.deleted":
          await handleSubscriptionDeleted(
            event as Stripe.Event & {
              data: { object: Stripe.Subscription };
            }
          );
          break;

        case "invoice.payment_succeeded":
          await handleInvoicePaymentSucceeded(
            event as Stripe.Event & { data: { object: Stripe.Invoice } }
          );
          break;

        case "invoice.payment_failed":
          await handleInvoicePaymentFailed(
            event as Stripe.Event & { data: { object: Stripe.Invoice } }
          );
          break;

        default:
          console.log("Unhandled event type:", event.type);
      }

      // TODO: Uncomment when DB is ready
      // await markEventAsProcessed(event.id);
    } catch (error) {
      console.error("Error processing webhook:", error);
      // TODO: Store error state in database
      // throw error; // Re-throw to trigger webhook retry
    }
  })();

  // Return 2xx immediately
  const response = NextResponse.json({ received: true }, { status: 200 });

  // Process asynchronously (don't block response)
  responsePromise.catch((error) => {
    console.error("Async webhook processing failed:", error);
  });

  return response;
}

async function handleCheckoutSessionCompleted(
  event: Stripe.Event & {
    data: { object: Stripe.Checkout.Session };
  }
) {
  const session = event.data.object;

  console.log("Checkout session completed:", session.id);
  console.log("Customer ID:", session.customer);
  console.log("Subscription ID:", session.subscription);

  if (!session.subscription || !session.customer) {
    console.error("Missing subscription or customer");
    return;
  }

  // TODO: Implement database update
  // const subscription = await stripe.subscriptions.retrieve(
  //   session.subscription as string
  // );
  //
  // await createOrUpdateSubscription({
  //   userId: session.client_reference_id,
  //   stripeCustomerId: session.customer as string,
  //   stripeSubscriptionId: session.subscription as string,
  //   stripePriceId: subscription.items.data[0]?.price.id,
  //   status: subscription.status as any,
  //   currentPeriodStart: new Date(subscription.current_period_start * 1000),
  //   currentPeriodEnd: new Date(subscription.current_period_end * 1000),
  // });
}

async function handleSubscriptionUpdated(
  event: Stripe.Event & {
    data: { object: Stripe.Subscription };
  }
) {
  const subscription = event.data.object;

  console.log("Subscription updated:", subscription.id);
  console.log("Status:", subscription.status);

  // TODO: Implement database update
  // await createOrUpdateSubscription({
  //   stripeSubscriptionId: subscription.id,
  //   status: subscription.status as any,
  //   currentPeriodStart: new Date(subscription.current_period_start * 1000),
  //   currentPeriodEnd: new Date(subscription.current_period_end * 1000),
  //   cancelAtPeriodEnd: subscription.cancel_at_period_end,
  //   trialStart: subscription.trial_start ? new Date(subscription.trial_start * 1000) : null,
  //   trialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
  // });
}

async function handleSubscriptionDeleted(
  event: Stripe.Event & {
    data: { object: Stripe.Subscription };
  }
) {
  const subscription = event.data.object;

  console.log("Subscription deleted:", subscription.id);

  // TODO: Implement database update
  // await createOrUpdateSubscription({
  //   stripeSubscriptionId: subscription.id,
  //   status: "canceled",
  //   canceledAt: new Date(),
  // });
}

async function handleInvoicePaymentSucceeded(
  event: Stripe.Event & { data: { object: Stripe.Invoice } }
) {
  const invoice = event.data.object;

  console.log("Invoice payment succeeded:", invoice.id);
  console.log("Customer:", invoice.customer);
  console.log("Amount:", invoice.amount_paid);
}

async function handleInvoicePaymentFailed(
  event: Stripe.Event & { data: { object: Stripe.Invoice } }
) {
  const invoice = event.data.object;

  console.error("Invoice payment failed:", invoice.id);
  console.error("Customer:", invoice.customer);
  console.error("Attempt count:", invoice.attempt_count);

  // TODO: Send email notification to customer
  // Implement retry logic or cancel subscription based on business rules
}