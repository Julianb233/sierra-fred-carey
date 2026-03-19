/**
 * Founder Archetype Detection & Tier-Based Stage Ceiling
 *
 * AI-3581: Enforce structured founder journey with 4 archetypes
 * and tier-gated stage progression.
 *
 * Archetypes map to Oases stages:
 *   discovery  -> clarity
 *   ideation   -> validation
 *   pre_seed   -> build
 *   seed       -> launch/grow
 *
 * Tier ceilings:
 *   FREE   -> max stage: validation (Discovery + initial Ideation only)
 *   PRO    -> max stage: launch
 *   STUDIO -> max stage: grow (no ceiling)
 */

import type { FounderArchetype, OasesStage } from "@/types/oases"
import { UserTier } from "@/lib/constants"
import { getStageIndex, STAGE_ORDER } from "./stage-config"

/** Maps archetype to the Oases stage they start in */
export const ARCHETYPE_START_STAGE: Record<FounderArchetype, OasesStage> = {
  discovery: "clarity",
  ideation: "validation",
  pre_seed: "build",
  seed: "launch",
}

/** Human-readable archetype labels */
export const ARCHETYPE_LABELS: Record<FounderArchetype, string> = {
  discovery: "Discovery",
  ideation: "Ideation",
  pre_seed: "Pre-Seed",
  seed: "Seed",
}

/** Archetype descriptions for prompt injection */
export const ARCHETYPE_DESCRIPTIONS: Record<FounderArchetype, string> = {
  discovery:
    "Pre-idea founder exploring possibilities. Needs help finding a viable idea, understanding their strengths, and identifying market gaps.",
  ideation:
    "Has an idea but needs validation. Needs help testing assumptions, defining target market, and building a value proposition.",
  pre_seed:
    "Building their venture, may be seeking initial funding. Needs help with strategy docs, pitch deck, investor readiness, and team building.",
  seed:
    "Has traction and is actively fundraising. Needs help refining pitch, targeting investors, negotiating terms, and scaling operations.",
}

/**
 * Maximum Oases stage allowed per tier.
 * Free users cannot progress past validation.
 * Pro users can reach launch but not grow.
 * Studio users have no ceiling.
 */
export const TIER_STAGE_CEILING: Record<UserTier, OasesStage> = {
  [UserTier.FREE]: "validation",
  [UserTier.PRO]: "launch",
  [UserTier.STUDIO]: "grow",
}

/**
 * Check if a tier allows progression to a given stage.
 */
export function isStageTierGated(
  targetStage: OasesStage,
  userTier: UserTier
): boolean {
  const ceiling = TIER_STAGE_CEILING[userTier]
  const ceilingIndex = getStageIndex(ceiling)
  const targetIndex = getStageIndex(targetStage)
  return targetIndex > ceilingIndex
}

/**
 * Get the tier ceiling stage name for display purposes.
 */
export function getTierCeilingLabel(userTier: UserTier): string {
  const ceiling = TIER_STAGE_CEILING[userTier]
  const stage = STAGE_ORDER[getStageIndex(ceiling)]
  return stage.charAt(0).toUpperCase() + stage.slice(1)
}

/**
 * Detect founder archetype from profile/intake data.
 *
 * Uses keyword signals from:
 * - venture stage self-report
 * - industry/idea description
 * - revenue/traction indicators
 * - funding history
 *
 * Returns the best-fit archetype based on available signals.
 */
export function detectArchetype(profile: {
  stage?: string | null
  company_name?: string | null
  industry?: string | null
  revenue_range?: string | null
  funding_history?: string | null
  team_size?: string | null
  challenges?: string[] | null
  enrichment_data?: Record<string, unknown> | null
}): FounderArchetype {
  const stage = (profile.stage ?? "").toLowerCase()
  const revenue = (profile.revenue_range ?? "").toLowerCase()
  const funding = (profile.funding_history ?? "").toLowerCase()
  const team = (profile.team_size ?? "").toLowerCase()
  const hasCompany = !!profile.company_name?.trim()

  // Pre-seed signals: building, has team, MVP
  // MUST check before seed — "pre-seed" contains "seed"
  if (
    stage.includes("pre-seed") ||
    stage.includes("pre_seed") ||
    stage.includes("build") ||
    stage.includes("mvp") ||
    stage.includes("prototype") ||
    (hasCompany && (team.includes("2") || team.includes("3") || team.includes("team")))
  ) {
    return "pre_seed"
  }

  // Seed signals: has revenue, funding, team
  if (
    funding.includes("seed") ||
    funding.includes("angel") ||
    funding.includes("series") ||
    revenue.includes("$") ||
    revenue.includes("revenue") ||
    stage.includes("seed") ||
    stage.includes("fundrais") ||
    stage.includes("series")
  ) {
    return "seed"
  }

  // Ideation signals: has an idea, exploring market
  if (
    hasCompany ||
    stage.includes("idea") ||
    stage.includes("concept") ||
    stage.includes("validat") ||
    stage.includes("market") ||
    !!profile.industry?.trim()
  ) {
    return "ideation"
  }

  // Default: discovery
  return "discovery"
}

/**
 * Build a prompt block describing the founder's archetype for FRED.
 * Injected alongside stage-gate prompts.
 */
export function buildArchetypePromptBlock(
  archetype: FounderArchetype,
  userTier: UserTier
): string {
  const label = ARCHETYPE_LABELS[archetype]
  const desc = ARCHETYPE_DESCRIPTIONS[archetype]
  const ceiling = TIER_STAGE_CEILING[userTier]
  const ceilingLabel = getTierCeilingLabel(userTier)

  const lines: string[] = []
  lines.push(`## FOUNDER ARCHETYPE: ${label}`)
  lines.push(``)
  lines.push(`**Profile:** ${desc}`)
  lines.push(``)
  lines.push(`### Coaching Approach for ${label} Founders`)

  switch (archetype) {
    case "discovery":
      lines.push(`- Help them explore, NOT commit. Multiple ideas are fine at this stage.`)
      lines.push(`- Ask about their skills, passions, and market observations.`)
      lines.push(`- Use Reality Lens to pressure-test ideas without crushing enthusiasm.`)
      lines.push(`- Goal: Narrow to 1-2 viable ideas with clear problem/customer fit.`)
      break
    case "ideation":
      lines.push(`- They have an idea — your job is to validate or invalidate it quickly.`)
      lines.push(`- Push for customer conversations and market evidence over assumptions.`)
      lines.push(`- Challenge their TAM/SAM/SOM and competitive positioning.`)
      lines.push(`- Goal: Validated idea with clear ICP, positioning, and business model.`)
      break
    case "pre_seed":
      lines.push(`- They're building — focus on execution speed and investor readiness.`)
      lines.push(`- Help with strategy docs, pitch deck structure, and financial models.`)
      lines.push(`- Challenge unit economics and go-to-market assumptions.`)
      lines.push(`- Goal: Investor-ready materials and a clear path to first revenue.`)
      break
    case "seed":
      lines.push(`- They're fundraising — every conversation should move them closer to closing.`)
      lines.push(`- Refine pitch narrative, handle objections, target right investors.`)
      lines.push(`- Help with term sheet analysis, cap table, and negotiation strategy.`)
      lines.push(`- Goal: Funded round with favorable terms and clear use-of-funds plan.`)
      break
  }

  // AI-3581: Structured 3-month plan framing
  lines.push(``)
  lines.push(`### Structured Journey Plan`)
  lines.push(`After initial assessment (first 2-3 exchanges with a new founder), lay out their structured plan:`)
  lines.push(`- Frame the journey as a **~3-month process** with **10 key milestones** across their stages`)
  lines.push(`- Break milestones into **bite-sized daily and weekly tasks** they can act on immediately`)
  lines.push(`- Reference the current stage's step agenda above as their immediate focus`)
  lines.push(`- Make it feel manageable: "We're going to take this one step at a time"`)
  lines.push(`- Revisit the plan periodically: "Let's check where you are against our roadmap"`)

  if (userTier === UserTier.FREE) {
    lines.push(``)
    lines.push(`### Tier Limitation (Free Plan)`)
    lines.push(`This founder is on the **Free** plan. Their journey is limited to **${ceilingLabel}** stage.`)
    lines.push(`When they reach the ${ceilingLabel} stage ceiling, mention that upgrading unlocks deeper coaching in Build, Launch, and Grow stages.`)
    lines.push(`Frame it as: "You've built a solid foundation. To take the next step — strategy docs, pitch deck, and investor readiness — the Pro plan unlocks those tools."`)
  }

  return lines.join("\n")
}
