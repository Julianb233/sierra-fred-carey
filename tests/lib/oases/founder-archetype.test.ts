import { describe, it, expect } from "vitest"
import { detectArchetype, isStageTierGated, buildArchetypePromptBlock, ARCHETYPE_START_STAGE, TIER_STAGE_CEILING } from "@/lib/oases/founder-archetype"
import { UserTier } from "@/lib/constants"

describe("detectArchetype", () => {
  it("returns discovery for empty profile", () => {
    expect(detectArchetype({})).toBe("discovery")
  })

  it("returns discovery for profile with no signals", () => {
    expect(detectArchetype({ stage: null, company_name: null })).toBe("discovery")
  })

  it("returns ideation when user has a company name", () => {
    expect(detectArchetype({ company_name: "My Startup" })).toBe("ideation")
  })

  it("returns ideation for idea-stage keywords", () => {
    expect(detectArchetype({ stage: "idea stage" })).toBe("ideation")
    expect(detectArchetype({ stage: "concept phase" })).toBe("ideation")
    expect(detectArchetype({ stage: "validating" })).toBe("ideation")
  })

  it("returns pre_seed for build/MVP keywords", () => {
    expect(detectArchetype({ stage: "building MVP" })).toBe("pre_seed")
    expect(detectArchetype({ stage: "pre-seed" })).toBe("pre_seed")
    expect(detectArchetype({ stage: "prototype ready" })).toBe("pre_seed")
  })

  it("returns seed for funding keywords", () => {
    expect(detectArchetype({ stage: "seed round" })).toBe("seed")
    expect(detectArchetype({ funding_history: "angel investment" })).toBe("seed")
    expect(detectArchetype({ stage: "fundraising" })).toBe("seed")
    expect(detectArchetype({ revenue_range: "$10k MRR" })).toBe("seed")
  })
})

describe("ARCHETYPE_START_STAGE", () => {
  it("maps archetypes to correct starting stages", () => {
    expect(ARCHETYPE_START_STAGE.discovery).toBe("clarity")
    expect(ARCHETYPE_START_STAGE.ideation).toBe("validation")
    expect(ARCHETYPE_START_STAGE.pre_seed).toBe("build")
    expect(ARCHETYPE_START_STAGE.seed).toBe("launch")
  })
})

describe("isStageTierGated", () => {
  it("FREE tier: allows clarity and validation", () => {
    expect(isStageTierGated("clarity", UserTier.FREE)).toBe(false)
    expect(isStageTierGated("validation", UserTier.FREE)).toBe(false)
  })

  it("FREE tier: blocks build, launch, grow", () => {
    expect(isStageTierGated("build", UserTier.FREE)).toBe(true)
    expect(isStageTierGated("launch", UserTier.FREE)).toBe(true)
    expect(isStageTierGated("grow", UserTier.FREE)).toBe(true)
  })

  it("PRO tier: allows up to launch", () => {
    expect(isStageTierGated("clarity", UserTier.PRO)).toBe(false)
    expect(isStageTierGated("validation", UserTier.PRO)).toBe(false)
    expect(isStageTierGated("build", UserTier.PRO)).toBe(false)
    expect(isStageTierGated("launch", UserTier.PRO)).toBe(false)
  })

  it("PRO tier: blocks grow", () => {
    expect(isStageTierGated("grow", UserTier.PRO)).toBe(true)
  })

  it("STUDIO tier: allows all stages", () => {
    expect(isStageTierGated("clarity", UserTier.STUDIO)).toBe(false)
    expect(isStageTierGated("grow", UserTier.STUDIO)).toBe(false)
  })
})

describe("TIER_STAGE_CEILING", () => {
  it("has correct ceilings", () => {
    expect(TIER_STAGE_CEILING[UserTier.FREE]).toBe("validation")
    expect(TIER_STAGE_CEILING[UserTier.PRO]).toBe("launch")
    expect(TIER_STAGE_CEILING[UserTier.STUDIO]).toBe("grow")
  })
})

describe("buildArchetypePromptBlock", () => {
  it("includes archetype label", () => {
    const block = buildArchetypePromptBlock("discovery", UserTier.FREE)
    expect(block).toContain("FOUNDER ARCHETYPE: Discovery")
  })

  it("includes tier limitation for FREE users", () => {
    const block = buildArchetypePromptBlock("discovery", UserTier.FREE)
    expect(block).toContain("Tier Limitation (Free Plan)")
    expect(block).toContain("Free")
  })

  it("does NOT include tier limitation for STUDIO users", () => {
    const block = buildArchetypePromptBlock("seed", UserTier.STUDIO)
    expect(block).not.toContain("Tier Limitation")
  })

  it("includes structured journey plan section", () => {
    const block = buildArchetypePromptBlock("ideation", UserTier.PRO)
    expect(block).toContain("Structured Journey Plan")
    expect(block).toContain("3-month process")
  })
})
