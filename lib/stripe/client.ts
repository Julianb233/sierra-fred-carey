import { loadStripe, Stripe } from "@stripe/stripe-js";

let stripePromise: Promise<Stripe | null> | null = null;

export function getStripe(): Promise<Stripe | null> {
  if (!stripePromise) {
    stripePromise = loadStripe(
      process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
    );
  }
  return stripePromise;
}

export async function redirectToCheckout(priceId: string) {
  const response = await fetch("/api/stripe/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ priceId }),
  });

  const data = await response.json();

  if (data.error) {
    throw new Error(data.error);
  }

  // Redirect to the checkout URL
  if (data.url) {
    window.location.href = data.url;
    return;
  }

  throw new Error("No checkout URL returned");
}

export async function redirectToPortal() {
  const response = await fetch("/api/stripe/portal", {
    method: "POST",
  });

  const { url, error } = await response.json();

  if (error) {
    throw new Error(error);
  }

  window.location.href = url;
}
