// Stripe pricing configuration with plan details
// Maps plan names to Stripe price IDs

export const STRIPE_PLANS = {
  FREE: {
    id: "free",
    name: "Founder Decision OS",
    priceId: null,
    price: 0,
    interval: null,
    features: [
      "Core Fred Cary Decision OS",
      "Strategy & execution reframing",
      "Startup Reality Lens (feasibility, economics, timing)",
      "Red Flag Detection",
      "Founder wellbeing support",
      "Founder Intake Snapshot",
    ],
  },
  FUNDRAISING: {
    id: "fundraising",
    name: "Fundraising & Strategy",
    priceId: process.env.NEXT_PUBLIC_STRIPE_FUNDRAISING_PRICE_ID || "",
    price: 99,
    interval: "month",
    features: [
      "Everything in Free tier",
      "Full Investor Lens (Pre-Seed / Seed / Series A)",
      "Investor Readiness Score",
      "Pitch Deck Review & Scorecard",
      "Strategy Documents (Executive Summary, 30/60/90)",
      "Automated Weekly SMS Check-Ins",
      "Persistent founder memory",
    ],
  },
  VENTURE_STUDIO: {
    id: "venture_studio",
    name: "Venture Studio",
    priceId: process.env.NEXT_PUBLIC_STRIPE_VENTURE_STUDIO_PRICE_ID || "",
    price: 249,
    interval: "month",
    features: [
      "Everything in Fundraising tier",
      "Boardy integration (investor matching)",
      "Investor targeting & outreach sequencing",
      "Virtual Team: Founder Ops Agent",
      "Virtual Team: Fundraise Ops Agent",
      "Virtual Team: Growth Ops Agent",
      "Virtual Team: Inbox Ops Agent",
      "Priority compute & deeper memory",
    ],
  },
};

export const STRIPE_WEBHOOK_EVENTS = {
  CHECKOUT_SESSION_COMPLETED: "checkout.session.completed",
  CUSTOMER_SUBSCRIPTION_UPDATED: "customer.subscription.updated",
  CUSTOMER_SUBSCRIPTION_DELETED: "customer.subscription.deleted",
  INVOICE_PAYMENT_SUCCEEDED: "invoice.payment_succeeded",
  INVOICE_PAYMENT_FAILED: "invoice.payment_failed",
} as const;