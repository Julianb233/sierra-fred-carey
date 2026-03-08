/**
 * Oases Stage Configuration
 *
 * Defines the 5-stage venture journey with steps, feature gates, and route gating.
 * Total: 14 steps across 5 stages (3+3+3+3+2).
 */

import type { OasesStage, StageConfig } from "@/types/oases"

export const STAGE_CONFIG: StageConfig[] = [
  {
    id: "clarity",
    name: "Clarity",
    tagline: "Find your true north",
    description:
      "Lay the groundwork. Complete your profile, assess your idea, and have your first mentoring session.",
    icon: "Compass",
    color: "text-amber-500",
    steps: [
      {
        id: "profile_basics",
        label: "Complete your founder profile",
        description:
          "Fill out your name, venture name, industry, and bio so FRED can personalize guidance.",
        completionCheck: "profile_complete",
      },
      {
        id: "reality_lens",
        label: "Complete your Reality Lens assessment",
        description:
          "Get an honest evaluation of your idea from multiple perspectives.",
        completionCheck: "reality_lens_done",
      },
      {
        id: "first_chat",
        label: "Have your first conversation with FRED",
        description:
          "Start a coaching session to explore your venture with FRED.",
        completionCheck: "chat_sessions",
        threshold: 1,
      },
    ],
    unlockedFeatures: ["chat", "reality-lens", "dashboard", "wellbeing", "settings"],
    gatedRoutes: [],
  },
  {
    id: "validation",
    name: "Validation",
    tagline: "Test your assumptions",
    description:
      "Validate your idea with deep coaching conversations and market positioning analysis.",
    icon: "Search",
    color: "text-blue-500",
    steps: [
      {
        id: "deep_conversations",
        label: "Complete 5 coaching conversations",
        description:
          "Have at least 5 substantive conversations with FRED to deepen your understanding.",
        completionCheck: "chat_sessions",
        threshold: 5,
      },
      {
        id: "positioning_defined",
        label: "Define your market positioning",
        description:
          "Work with FRED to clarify your unique value proposition and target market.",
        completionCheck: "manual",
      },
      {
        id: "competitor_awareness",
        label: "Review competitive landscape",
        description:
          "Identify and analyze key competitors in your space.",
        completionCheck: "manual",
      },
    ],
    unlockedFeatures: ["positioning", "insights", "coaching", "next-steps"],
    gatedRoutes: ["/dashboard/positioning", "/dashboard/insights", "/dashboard/coaching", "/dashboard/next-steps"],
  },
  {
    id: "build",
    name: "Build",
    tagline: "Create your foundation",
    description:
      "Build your strategy documents, pitch deck, and investor readiness baseline.",
    icon: "Hammer",
    color: "text-green-500",
    steps: [
      {
        id: "strategy_doc",
        label: "Create a strategy document",
        description:
          "Draft a comprehensive strategy document outlining your venture plan.",
        completionCheck: "document_created",
      },
      {
        id: "pitch_deck_started",
        label: "Upload or create a pitch deck",
        description:
          "Start building your investor pitch deck with FRED's guidance.",
        completionCheck: "pitch_deck_uploaded",
      },
      {
        id: "readiness_baseline",
        label: "Complete investor readiness assessment",
        description:
          "Get your first investor readiness score to establish a baseline.",
        completionCheck: "investor_readiness_scored",
      },
    ],
    unlockedFeatures: ["strategy", "documents", "pitch-deck", "readiness"],
    gatedRoutes: [
      "/dashboard/strategy",
      "/dashboard/documents",
      "/dashboard/pitch-deck",
      "/dashboard/readiness",
    ],
  },
  {
    id: "launch",
    name: "Launch",
    tagline: "Go to market",
    description:
      "Refine your pitch, target investors, and prepare for fundraising conversations.",
    icon: "Rocket",
    color: "text-purple-500",
    steps: [
      {
        id: "investor_ready",
        label: "Achieve investor readiness score >= 70",
        description:
          "Improve your investor readiness score to at least 70 out of 100.",
        completionCheck: "investor_readiness_scored",
        threshold: 70,
      },
      {
        id: "pitch_refined",
        label: "Refine pitch deck (score >= 60)",
        description:
          "Polish your pitch deck until it scores at least 60.",
        completionCheck: "pitch_deck_uploaded",
        threshold: 60,
      },
      {
        id: "investor_targets",
        label: "Identify target investors",
        description:
          "Research and compile a list of investors aligned with your venture.",
        completionCheck: "manual",
      },
    ],
    unlockedFeatures: ["investor-lens", "investor-targeting", "investor-readiness", "investor-evaluation"],
    gatedRoutes: ["/dashboard/investor-lens", "/dashboard/investor-targeting", "/dashboard/investor-readiness", "/dashboard/investor-evaluation"],
  },
  {
    id: "grow",
    name: "Grow",
    tagline: "Scale your venture",
    description:
      "Access fund matching, virtual team agents, and advanced growth tools.",
    icon: "TrendingUp",
    color: "text-emerald-500",
    steps: [
      {
        id: "journey_complete",
        label: "Complete all prior stages",
        description:
          "Finish every step in Clarity, Validation, Build, and Launch.",
        completionCheck: "manual",
      },
      {
        id: "fund_matching_ready",
        label: "Prepare for fund matching",
        description:
          "Get matched with potential investors through our network.",
        completionCheck: "boardy_ready",
      },
    ],
    unlockedFeatures: ["boardy", "agents", "communities", "marketplace"],
    gatedRoutes: ["/dashboard/boardy", "/dashboard/agents", "/dashboard/communities", "/dashboard/marketplace"],
  },
]

/** Ordered list of stages */
export const STAGE_ORDER: OasesStage[] = [
  "clarity",
  "validation",
  "build",
  "launch",
  "grow",
]

/** Get the full config for a given stage */
export function getStageConfig(stage: OasesStage): StageConfig {
  const config = STAGE_CONFIG.find((s) => s.id === stage)
  if (!config) throw new Error(`Unknown Oases stage: ${stage}`)
  return config
}

/** Get the zero-based index of a stage in the journey */
export function getStageIndex(stage: OasesStage): number {
  const idx = STAGE_ORDER.indexOf(stage)
  if (idx === -1) throw new Error(`Unknown Oases stage: ${stage}`)
  return idx
}

/** Get the steps defined for a given stage */
export function getStageSteps(stage: OasesStage) {
  return getStageConfig(stage).steps
}

/**
 * Returns which stage unlocks a given route, or null if the route is
 * always accessible (not gated).
 */
export function getStageFeatureGates(route: string): OasesStage | null {
  for (const stage of STAGE_CONFIG) {
    if (stage.gatedRoutes.some((r) => route.startsWith(r))) {
      return stage.id
    }
  }
  return null
}

/**
 * Returns true if the route requires a later stage than the user's
 * current stage. A route gated to the user's current or earlier stage
 * is accessible.
 */
export function isRouteGated(
  route: string,
  currentStage: OasesStage
): boolean {
  const requiredStage = getStageFeatureGates(route)
  if (!requiredStage) return false
  return getStageIndex(requiredStage) > getStageIndex(currentStage)
}
