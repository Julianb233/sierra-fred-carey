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
    title: "Validate your idea",
    description:
      "Talk to at least 10 potential customers. Identify the core problem you solve and confirm people actually experience it. Document their exact words.",
    order: 1,
    category: "validation",
  },
  {
    title: "Build your MVP",
    description:
      "Create the simplest version of your product that solves the core problem. Focus on one use case, not a feature list. Ship something people can use.",
    order: 2,
    category: "product",
  },
  {
    title: "Get your first customers",
    description:
      "Acquire your first 5-10 paying customers (or committed users for free products). Prove that someone other than friends and family will use what you built.",
    order: 3,
    category: "growth",
  },
  {
    title: "Become fundable",
    description:
      "Build a compelling narrative: problem, solution, traction, team. Have a pitch deck ready, understand your unit economics, and know your ask.",
    order: 4,
    category: "fundraising",
  },
];

const PRE_SEED_GOALS: GoalDefinition[] = [
  {
    title: "Analyze where you really are",
    description:
      "Honest assessment of product-market fit signals, burn rate, team gaps, and competitive position. Use FRED's Reality Lens to get an unvarnished view.",
    order: 1,
    category: "strategy",
  },
  {
    title: "Identify what needs to change to be fundable",
    description:
      "Compare your metrics to stage benchmarks. Identify the 2-3 things investors will ask about that you can't answer yet. Build a plan to close those gaps.",
    order: 2,
    category: "fundraising",
  },
  {
    title: "Analyze your existing pitch deck",
    description:
      "Upload your deck to FRED for a thorough review. Get specific feedback on narrative flow, data presentation, and investor objection points.",
    order: 3,
    category: "fundraising",
  },
  {
    title: "Create a new pitch deck",
    description:
      "Build a pitch deck that tells your story with data. Include problem, solution, market size, business model, traction, team, and ask. FRED can help structure it.",
    order: 4,
    category: "fundraising",
  },
  {
    title: "Get introduced to investors via Boardy",
    description:
      "Use the Boardy network to get warm introductions to investors who match your stage, sector, and geography. Quality over quantity.",
    order: 5,
    category: "fundraising",
  },
];

const SEED_GOALS: GoalDefinition[] = [
  {
    title: "Validate unit economics",
    description:
      "Know your CAC, LTV, payback period, and gross margins. Prove that each customer is worth more than what it costs to acquire them.",
    order: 1,
    category: "strategy",
  },
  {
    title: "Complete market sizing and competitive analysis",
    description:
      "Build a defensible TAM/SAM/SOM analysis. Map your competitive landscape and articulate your unfair advantage clearly.",
    order: 2,
    category: "strategy",
  },
  {
    title: "Achieve investor readiness",
    description:
      "Score 80+ on the Investor Readiness Score. Have clean financials, a data room ready, and answers to the top 20 investor questions.",
    order: 3,
    category: "fundraising",
  },
  {
    title: "Refine your pitch",
    description:
      "Iterate on your pitch until it's crisp. Practice with FRED's pitch review, get timing right, and nail the Q&A. Every slide should earn its place.",
    order: 4,
    category: "fundraising",
  },
];

const SERIES_A_GOALS: GoalDefinition[] = [
  {
    title: "Demonstrate repeatable growth",
    description:
      "Show consistent month-over-month growth in key metrics. Prove that your growth engine works and can scale with more capital.",
    order: 1,
    category: "growth",
  },
  {
    title: "Optimize unit economics for scale",
    description:
      "Drive down CAC and increase LTV. Show a clear path to profitability at scale with improving margins as you grow.",
    order: 2,
    category: "strategy",
  },
  {
    title: "Build the Series A narrative",
    description:
      "Articulate why now is the right time to pour fuel on the fire. Show product-market fit, team readiness, and a clear use of funds.",
    order: 3,
    category: "fundraising",
  },
  {
    title: "Strengthen your leadership team",
    description:
      "Identify and plan for key hires. Investors want to see that you can build the team needed to execute at the next level.",
    order: 4,
    category: "strategy",
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
    label: "Friends & Family / Pre-Seed",
    goals: PRE_SEED_GOALS,
  },
  seed: {
    stage: "seed",
    label: "Seed",
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
