import Stripe from "stripe";
import { isTrialEnabled, TRIAL_DAYS } from "./config";

// Lazy-load Stripe client to avoid build-time errors when env var isn't set
let stripeClient: Stripe | null = null;

function getStripe(): Stripe {
  if (!stripeClient) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error("STRIPE_SECRET_KEY environment variable is not set");
    }
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2025-12-15.clover",
      typescript: true,
    });
  }
  return stripeClient;
}

export const stripe = {
  get checkout() {
    return getStripe().checkout;
  },
  get billingPortal() {
    return getStripe().billingPortal;
  },
  get webhooks() {
    return getStripe().webhooks;
  },
  get subscriptions() {
    return getStripe().subscriptions;
  },
};

export async function createCheckoutSession({
  priceId,
  customerId,
  userId,
  successUrl,
  cancelUrl,
}: {
  priceId: string;
  customerId?: string;
  userId: string;
  successUrl: string;
  cancelUrl: string;
}) {
  const subscriptionData: Stripe.Checkout.SessionCreateParams.SubscriptionData = {
    metadata: { userId },
  };

  // Add 14-day trial when trials are enabled
  if (isTrialEnabled()) {
    const trialEnd = Math.floor(Date.now() / 1000) + TRIAL_DAYS * 24 * 60 * 60;
    subscriptionData.trial_end = trialEnd;
  }

  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    client_reference_id: userId,
    metadata: { userId },
    subscription_data: subscriptionData,
  };

  // Only include customer if we have one (avoids sending undefined to Stripe)
  if (customerId) {
    sessionParams.customer = customerId;
  }

  const session = await getStripe().checkout.sessions.create(sessionParams);

  return session;
}

export async function createCustomerPortalSession({
  customerId,
  returnUrl,
}: {
  customerId: string;
  returnUrl: string;
}) {
  const session = await getStripe().billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });

  return session;
}

export async function constructWebhookEvent(
  payload: string | Buffer,
  signature: string
): Promise<Stripe.Event> {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    throw new Error("STRIPE_WEBHOOK_SECRET environment variable is not set");
  }
  return getStripe().webhooks.constructEvent(
    payload,
    signature,
    webhookSecret
  );
}

export async function getSubscription(subscriptionId: string) {
  return getStripe().subscriptions.retrieve(subscriptionId);
}

export async function cancelSubscription(subscriptionId: string) {
  return getStripe().subscriptions.update(subscriptionId, {
    cancel_at_period_end: true,
  });
}
