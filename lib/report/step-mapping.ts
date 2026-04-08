/**
 * Report Step Mapping — Authoritative 19-Step-to-5-Section Mapping
 *
 * Maps the 19 steps in the Founder Journey Report to 5 report sections.
 * Each step references journey step IDs from lib/oases/journey-steps.ts
 * to pull founder answers from oases_progress.metadata JSONB.
 *
 * Section distribution: [4, 3, 4, 4, 4] = 19 steps total
 */

// ============================================================================
// Types
// ============================================================================

export interface ReportStepDef {
  /** Unique report step ID (e.g. "core-offer-product") */
  id: string
  /** Which section this step belongs to */
  sectionId: string
  /** Display label */
  label: string
  /** Description of what this step captures */
  description: string
  /** Journey step IDs to pull answers from (primary + fallbacks). Empty = manual/new step. */
  journeyStepIds: string[]
  /** Position within the section (1-based) */
  sortOrder: number
}

export interface ReportSectionDef {
  /** Section identifier */
  id: string
  /** Display title */
  title: string
  /** Description of the section */
  description: string
  /** Steps within this section */
  steps: ReportStepDef[]
}

// ============================================================================
// Section & Step Definitions
// ============================================================================

export const REPORT_SECTIONS: ReportSectionDef[] = [
  {
    id: "core-offer",
    title: "Your Core Offer",
    description:
      "Define the product or service you are building, who it is for, the problem it solves, and how you price it.",
    steps: [
      {
        id: "core-offer-product",
        sectionId: "core-offer",
        label: "Define your product/service",
        description:
          "A clear description of what you are building and the value it delivers.",
        journeyStepIds: ["c_one_sentence", "c_problem_statement"],
        sortOrder: 1,
      },
      {
        id: "core-offer-customer",
        sectionId: "core-offer",
        label: "Identify your ideal customer",
        description:
          "Demographics, psychographics, and behaviors of your ideal customer.",
        journeyStepIds: ["v_icp_defined"],
        sortOrder: 2,
      },
      {
        id: "core-offer-problem",
        sectionId: "core-offer",
        label: "Describe the problem in their words",
        description:
          "The specific pain or frustration your customer experiences, in their language.",
        journeyStepIds: ["c_problem_statement", "c_who_has_problem"],
        sortOrder: 3,
      },
      {
        id: "core-offer-pricing",
        sectionId: "core-offer",
        label: "Set your pricing and explain why",
        description:
          "Your pricing model, price point, and the rationale behind it.",
        journeyStepIds: ["v_willingness_pay", "v_competitor_pricing"],
        sortOrder: 4,
      },
    ],
  },
  {
    id: "founder-story",
    title: "Your Founder Story",
    description:
      "Your personal motivation, unique advantages, and how you articulate the venture in 30 seconds.",
    steps: [
      {
        id: "founder-story-why",
        sectionId: "founder-story",
        label: "Your personal why",
        description:
          "The personal motivation driving you to build this venture.",
        journeyStepIds: ["c_define_why"],
        sortOrder: 1,
      },
      {
        id: "founder-story-advantage",
        sectionId: "founder-story",
        label: "Your unfair advantage",
        description:
          "Skills, connections, or knowledge that competitors cannot easily replicate.",
        journeyStepIds: ["c_unfair_advantages"],
        sortOrder: 2,
      },
      {
        id: "founder-story-pitch",
        sectionId: "founder-story",
        label: "30-second elevator pitch",
        description:
          "A concise pitch that communicates your value proposition in under 30 seconds.",
        journeyStepIds: ["v_positioning_statement", "c_one_sentence"],
        sortOrder: 3,
      },
    ],
  },
  {
    id: "unit-economics",
    title: "Unit Economics",
    description:
      "The financial building blocks of your business: acquisition cost, lifetime value, and the path to profitability.",
    steps: [
      {
        id: "unit-economics-cac",
        sectionId: "unit-economics",
        label: "Customer acquisition cost (CAC)",
        description:
          "How much it costs to acquire one customer through your primary channels.",
        journeyStepIds: ["v_unit_economics"],
        sortOrder: 1,
      },
      {
        id: "unit-economics-ltv",
        sectionId: "unit-economics",
        label: "Lifetime value (LTV)",
        description:
          "The total revenue a single customer generates over their relationship with you.",
        journeyStepIds: ["v_unit_economics"],
        sortOrder: 2,
      },
      {
        id: "unit-economics-ratio",
        sectionId: "unit-economics",
        label: "LTV:CAC ratio",
        description:
          "The ratio of lifetime value to acquisition cost, indicating unit profitability.",
        journeyStepIds: [],
        sortOrder: 3,
      },
      {
        id: "unit-economics-profitability",
        sectionId: "unit-economics",
        label: "Path to profitability",
        description:
          "Your plan for reaching profitability, including key milestones and timelines.",
        journeyStepIds: [],
        sortOrder: 4,
      },
    ],
  },
  {
    id: "scaling-operations",
    title: "Scaling Operations",
    description:
      "Processes that break at scale, automation plans, playbooks, and your repeatable acquisition channel.",
    steps: [
      {
        id: "scaling-ops-bottleneck",
        sectionId: "scaling-operations",
        label: "#1 process that breaks at scale",
        description:
          "The single process most likely to fail as you grow from 10 to 100 customers.",
        journeyStepIds: [],
        sortOrder: 1,
      },
      {
        id: "scaling-ops-automation",
        sectionId: "scaling-operations",
        label: "Bottleneck automation plan",
        description:
          "How you plan to automate or delegate the bottleneck process.",
        journeyStepIds: [],
        sortOrder: 2,
      },
      {
        id: "scaling-ops-playbooks",
        sectionId: "scaling-operations",
        label: "Core playbooks",
        description:
          "Documented, repeatable processes for your most critical operations.",
        journeyStepIds: [],
        sortOrder: 3,
      },
      {
        id: "scaling-ops-acquisition",
        sectionId: "scaling-operations",
        label: "Repeatable acquisition channel",
        description:
          "The primary channel you can reliably use to acquire new customers.",
        journeyStepIds: ["v_distribution_channels"],
        sortOrder: 4,
      },
    ],
  },
  {
    id: "leadership-mindset",
    title: "Leadership Mindset",
    description:
      "Self-awareness, difficult conversations, your support system, and your leadership style.",
    steps: [
      {
        id: "leadership-delegate",
        sectionId: "leadership-mindset",
        label: "Delegate something you love",
        description:
          "Identify one task you enjoy but should delegate to focus on higher-impact work.",
        journeyStepIds: [],
        sortOrder: 1,
      },
      {
        id: "leadership-conversation",
        sectionId: "leadership-mindset",
        label: "The hard conversation you need to have",
        description:
          "A difficult conversation you have been avoiding that would move the venture forward.",
        journeyStepIds: [],
        sortOrder: 2,
      },
      {
        id: "leadership-support",
        sectionId: "leadership-mindset",
        label: "Your support system",
        description:
          "The people, communities, and resources that keep you grounded and accountable.",
        journeyStepIds: ["c_cofounder_status"],
        sortOrder: 3,
      },
      {
        id: "leadership-style",
        sectionId: "leadership-mindset",
        label: "Your leadership style",
        description:
          "How you lead, make decisions, and motivate yourself and others.",
        journeyStepIds: ["c_mindset_check", "c_strengths"],
        sortOrder: 4,
      },
    ],
  },
]

// ============================================================================
// Derived exports
// ============================================================================

/** Flat array of all 19 report steps */
export const REPORT_STEPS: ReportStepDef[] = REPORT_SECTIONS.flatMap(
  (section) => section.steps
)

/**
 * Get steps for a given section ID.
 * Returns an empty array if the section does not exist.
 */
export function getStepsBySection(sectionId: string): ReportStepDef[] {
  const section = REPORT_SECTIONS.find((s) => s.id === sectionId)
  return section?.steps ?? []
}
