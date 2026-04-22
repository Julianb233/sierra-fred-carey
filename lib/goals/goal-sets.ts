/**
 * Goal Sets by Funding Stage
 *
 * Structured goal roadmaps personalized to each founder's stage.
 * Generated after onboarding conversation with FRED, displayed on dashboard.
 *
 * Linear: AI-1283
 */

// ============================================================================
// Types
// ============================================================================

export type FundingStage = "idea" | "pre-seed" | "seed" | "series-a";

export interface GoalDefinition {
  /** Short title displayed in the roadmap */
  title: string;
  /** Detailed description of what this goal means */
  description: string;
  /** Ordered position within the stage (1-based) */
  order: number;
  /** Category tag for grouping/filtering */
  category: "validation" | "product" | "growth" | "fundraising" | "strategy";
}

export interface GoalSetDefinition {
  stage: FundingStage;
  label: string;
  goals: GoalDefinition[];
}

// ============================================================================
// Goal Set Definitions
// ============================================================================

const IDEA_STAGE_GOALS: GoalDefinition[] = [
  {
    title: "Validate your problem",
    description:
      "Talk to 10 potential customers. Identify the core problem you solve and confirm people actually experience it. Document their exact words — evidence beats intuition.",
    order: 1,
    category: "validation",
  },
  {
    title: "Define your customer",
    description:
      "Create an Ideal Customer Profile. Get specific: who exactly has this problem, how do they solve it today, and what would make them switch? No 'everyone' answers.",
    order: 2,
    category: "validation",
  },
  {
    title: "Test your solution",
    description:
      "Build a concierge MVP or landing page. Ship the simplest version that proves your solution works for real people. Focus on one use case, not a feature list.",
    order: 3,
    category: "product",
  },
  {
    title: "Find product-market fit signals",
    description:
      "Get 3 paying customers or strong intent signals. Prove that someone other than friends and family will use — and ideally pay for — what you built.",
    order: 4,
    category: "growth",
  },
];

const PRE_SEED_GOALS: GoalDefinition[] = [
  {
    title: "Assess investor readiness",
    description:
      "Complete your Investor Readiness Score. Get an honest assessment of where you stand across team, market, product, traction, financials, and pitch readiness.",
    order: 1,
    category: "fundraising",
  },
  {
    title: "Build your pitch deck",
    description:
      "Upload and review your pitch deck with Mentor. Get specific feedback on narrative flow, data presentation, and the investor objections you need to prepare for.",
    order: 2,
    category: "fundraising",
  },
  {
    title: "Identify what to change",
    description:
      "Address gaps in your fundability profile. Compare your metrics to stage benchmarks and build a plan to close the 2-3 things investors will ask about.",
    order: 3,
    category: "strategy",
  },
  {
    title: "Network with investors",
    description:
      "Connect through Boardy to get warm introductions to investors who match your stage, sector, and geography. Quality over quantity — prepared intros convert.",
    order: 4,
    category: "fundraising",
  },
];

const SEED_GOALS: GoalDefinition[] = [
  {
    title: "Refine your pitch",
    description:
      "Polish deck based on investor feedback. Iterate until it's crisp — practice with FRED's pitch review, get timing right, and nail the Q&A. Every slide earns its place.",
    order: 1,
    category: "fundraising",
  },
  {
    title: "Show traction metrics",
    description:
      "Document MRR, growth rate, and retention. Know your CAC, LTV, payback period, and gross margins. Prove each customer is worth more than what it costs to acquire them.",
    order: 2,
    category: "strategy",
  },
  {
    title: "Build investor pipeline",
    description:
      "Target 50+ relevant investors. Map your investor landscape by stage, sector, and check size. Use Boardy for warm intros and track your pipeline systematically.",
    order: 3,
    category: "fundraising",
  },
  {
    title: "Prepare for due diligence",
    description:
      "Get financials and legal in order. Have clean books, a data room ready, cap table organized, and answers to the top 20 investor questions prepared.",
    order: 4,
    category: "strategy",
  },
];

const SERIES_A_GOALS: GoalDefinition[] = [
  {
    title: "Strategic advisory",
    description:
      "Get personalized growth strategy from Mentor. Focus on growth bottlenecks, team scaling, GTM repeatability, and experienced operator perspective.",
    order: 1,
    category: "strategy",
  },
  {
    title: "Scale operations",
    description:
      "Optimize unit economics and team structure. Drive down CAC, increase LTV, and show a clear path to profitability at scale with improving margins.",
    order: 2,
    category: "strategy",
  },
  {
    title: "Expand market",
    description:
      "Identify adjacent markets and expansion opportunities. Articulate why now is the right time to pour fuel on the fire with clear use of funds.",
    order: 3,
    category: "growth",
  },
];

// ============================================================================
// Registry
// ============================================================================

export const GOAL_SETS: Record<FundingStage, GoalSetDefinition> = {
  idea: {
    stage: "idea",
    label: "Idea Stage",
    goals: IDEA_STAGE_GOALS,
  },
  "pre-seed": {
    stage: "pre-seed",
    label: "Pre-Seed Stage",
    goals: PRE_SEED_GOALS,
  },
  seed: {
    stage: "seed",
    label: "Seed Stage",
    goals: SEED_GOALS,
  },
  "series-a": {
    stage: "series-a",
    label: "Series A+",
    goals: SERIES_A_GOALS,
  },
};

/**
 * Get the goal set definition for a given funding stage.
 * Falls back to idea stage if stage is unknown.
 */
export function getGoalSetForStage(stage: string | null): GoalSetDefinition {
  if (!stage) return GOAL_SETS["idea"];
  const normalized = stage.toLowerCase().trim() as FundingStage;
  return GOAL_SETS[normalized] ?? GOAL_SETS["idea"];
}
