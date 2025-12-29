import { loadStripe, Stripe } from "@stripe/stripe-js";

let stripePromise: Promise<Stripe | null> | null = null;

export function getStripe(): Promise<Stripe | null> {
  if (!stripePromise) {
    const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    if (!key) {
      console.warn("Stripe publishable key not configured");
      return Promise.resolve(null);
    }
    stripePromise = loadStripe(key);
  }
  return stripePromise;
}

export interface CheckoutResponse {
  sessionId?: string;
  url?: string;
  plan?: {
    id: string;
    name: string;
    price: number;
  };
  error?: string;
  message?: string;
  code?: string;
  portalUrl?: string;
}

export class StripeNotConfiguredError extends Error {
  constructor(message: string = "Stripe is not configured") {
    super(message);
    this.name = "StripeNotConfiguredError";
  }
}

export class CheckoutError extends Error {
  code?: string;
  portalUrl?: string;

  constructor(message: string, code?: string, portalUrl?: string) {
    super(message);
    this.name = "CheckoutError";
    this.code = code;
    this.portalUrl = portalUrl;
  }
}

export async function redirectToCheckout(priceId: string): Promise<void> {
  const response = await fetch("/api/stripe/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ priceId }),
  });

  const data: CheckoutResponse = await response.json();

  if (data.error) {
    if (data.code === "STRIPE_NOT_CONFIGURED") {
      throw new StripeNotConfiguredError(data.message || data.error);
    }
    throw new CheckoutError(
      data.message || data.error,
      data.code,
      data.portalUrl
    );
  }

  // Redirect to the checkout URL
  if (data.url) {
    window.location.href = data.url;
    return;
  }

  throw new CheckoutError("No checkout URL returned");
}

export async function redirectToCheckoutByTier(tier: string): Promise<void> {
  const response = await fetch("/api/stripe/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tier }),
  });

  const data: CheckoutResponse = await response.json();

  if (data.error) {
    if (data.code === "STRIPE_NOT_CONFIGURED") {
      throw new StripeNotConfiguredError(data.message || data.error);
    }
    throw new CheckoutError(
      data.message || data.error,
      data.code,
      data.portalUrl
    );
  }

  if (data.url) {
    window.location.href = data.url;
    return;
  }

  throw new CheckoutError("No checkout URL returned");
}

export interface PortalResponse {
  url?: string;
  error?: string;
  message?: string;
  code?: string;
}

export async function redirectToPortal(): Promise<void> {
  const response = await fetch("/api/stripe/portal", {
    method: "POST",
  });

  const data: PortalResponse = await response.json();

  if (data.error) {
    if (data.code === "STRIPE_NOT_CONFIGURED") {
      throw new StripeNotConfiguredError(data.message || data.error);
    }
    throw new Error(data.message || data.error);
  }

  if (data.url) {
    window.location.href = data.url;
    return;
  }

  throw new Error("No portal URL returned");
}

// Helper to check if Stripe is configured on the client side
export function isStripeConfigured(): boolean {
  return !!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
}
