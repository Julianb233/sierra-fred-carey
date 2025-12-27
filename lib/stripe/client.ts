import { loadStripe } from "@stripe/stripe-js";

let stripePromise: ReturnType<typeof loadStripe>;

export const getStripe = async () => {
  if (!stripePromise) {
    stripePromise = loadStripe(
      process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
    );
  }
  return stripePromise;
};

export type { Stripe, StripeElements } from "@stripe/stripe-js";