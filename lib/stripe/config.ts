export const PLANS = {
  FREE: {
    id: "free",
    name: "Free",
    price: 0,
    priceId: null,
    features: [
      "Founder Decision Engine",
      "Feasibility + market reality checks",
      "Red flag detection",
      "Founder well-being + mental clarity support",
      "Initial founder snapshot",
    ],
  },
  BUILDER: {
    id: "builder",
    name: "Builder",
    price: 39,
    priceId: process.env.NEXT_PUBLIC_STRIPE_BUILDER_PRICE_ID,
    features: [
      "Everything in Free",
      "Saved founder profile + memory",
      "Limited Investor Readiness insights",
      "Strategy outputs (lean plans, early roadmap)",
      "Early-stage scoring + guidance",
      "Priority responses",
    ],
  },
  FUNDRAISING: {
    id: "fundraising",
    name: "Pro",
    price: 99,
    priceId: process.env.NEXT_PUBLIC_STRIPE_FUNDRAISING_PRICE_ID,
    features: [
      "Everything in Builder",
      "Full Investor Lens (Pre-seed → Series A)",
      "Investor Readiness Score",
      "Pitch deck teardown + scoring",
      "Executive summaries + 30/60/90 plans",
      "Deep founder memory + evolving context",
    ],
  },
  VENTURE_STUDIO: {
    id: "venture_studio",
    name: "Studio",
    price: 249,
    priceId: process.env.NEXT_PUBLIC_STRIPE_VENTURE_STUDIO_PRICE_ID,
    features: [
      "Everything in Pro",
      "Investor targeting + outreach sequencing",
      "Boardy integration (investor matching)",
      "Weekly accountability check-ins (SMS)",
      "AI Operator Team: Founder Ops, Fundraise Ops, Growth Ops, Inbox Ops",
      "Priority compute + deeper memory",
    ],
  },
} as const;

export type PlanId = keyof typeof PLANS;

export function getPlanByPriceId(priceId: string): (typeof PLANS)[PlanId] | null {
  return (
    Object.values(PLANS).find((plan) => plan.priceId === priceId) || null
  );
}

export function getPlanById(id: string): (typeof PLANS)[PlanId] | null {
  const key = Object.keys(PLANS).find(
    (k) => PLANS[k as PlanId].id === id
  ) as PlanId | undefined;
  return key ? PLANS[key] : null;
}

/** Trial configuration */
export const TRIAL_DAYS = 14;

/** Whether trial mode is enabled (controlled by env var, defaults to false) */
export function isTrialEnabled(): boolean {
  return process.env.STRIPE_TRIALS_ENABLED === "true";
}
