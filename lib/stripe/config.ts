export const PLANS = {
  FREE: {
    id: "free",
    name: "Free",
    price: 0,
    priceId: null,
    features: [
      "Basic check-in tracking",
      "Community access",
      "Limited AI chat",
    ],
  },
  FUNDRAISING: {
    id: "fundraising",
    name: "Fundraising & Strategy",
    price: 99,
    priceId: process.env.NEXT_PUBLIC_STRIPE_FUNDRAISING_PRICE_ID,
    features: [
      "Everything in Free",
      "Unlimited AI coaching sessions",
      "Weekly strategy check-ins",
      "Fundraising playbooks",
      "Investor intro templates",
    ],
  },
  VENTURE_STUDIO: {
    id: "venture_studio",
    name: "Venture Studio",
    price: 249,
    priceId: process.env.NEXT_PUBLIC_STRIPE_VENTURE_STUDIO_PRICE_ID,
    features: [
      "Everything in Fundraising & Strategy",
      "Virtual Team: Founder Ops Agent",
      "Virtual Team: Fundraising Agent",
      "Virtual Team: Growth Agent",
      "Weekly SMS Accountability Check-ins",
      "Boardy Investor/Advisor Matching",
      "Priority AI compute & deeper memory",
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
