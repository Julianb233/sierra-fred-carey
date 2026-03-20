/**
 * Phase 83: Intervention engine unit tests
 *
 * Tests the contextual intervention prompt generation for the
 * Founder Mindset Monitor. Verifies that interventions are natural
 * and never reveal the monitoring system to the founder.
 */

import { describe, it, expect } from "vitest"
import { generateIntervention, buildInterventionBlock } from "../intervention-engine"
import type { StressSignal } from "../stress-detector"

function makeSignal(overrides: Partial<StressSignal> = {}): StressSignal {
  return {
    level: "high",
    score: 0.6,
    trend: "worsening",
    dominantEmotion: "frustrated",
    topics: [],
    ...overrides,
  }
}

describe("generateIntervention", () => {
  it("mentions wellbeing check-in and /dashboard/wellbeing for critical level", () => {
    const result = generateIntervention(
      makeSignal({ level: "critical", score: 0.85 }),
      "Alex"
    )
    expect(result).toContain("wellbeing check-in")
    expect(result).toContain("/dashboard/wellbeing")
  })

  it("mentions stepping back for high level", () => {
    const result = generateIntervention(
      makeSignal({ level: "high", score: 0.55 }),
      "Alex"
    )
    expect(result).toContain("stepping away")
  })

  it("includes founder name for critical level", () => {
    const result = generateIntervention(
      makeSignal({ level: "critical" }),
      "Sarah"
    )
    expect(result).toContain("Sarah")
  })

  it("includes founder name for high level", () => {
    const result = generateIntervention(
      makeSignal({ level: "high" }),
      "Marcus"
    )
    expect(result).toContain("Marcus")
  })

  it("includes topic string when topics are present", () => {
    const result = generateIntervention(
      makeSignal({ level: "high", topics: ["fundraising", "burnout"] }),
      "Alex"
    )
    expect(result).toContain("fundraising")
    expect(result).toContain("burnout")
  })

  it("uses fallback topic when no topics provided", () => {
    const result = generateIntervention(
      makeSignal({ level: "high", topics: [] }),
      "Alex"
    )
    expect(result).toContain("their startup journey")
  })

  it("includes naturalness guard instructing LLM not to reveal monitoring", () => {
    const critical = generateIntervention(makeSignal({ level: "critical" }), "Test")
    const high = generateIntervention(makeSignal({ level: "high" }), "Test")
    // The guard tells the LLM not to say "stress level" or "monitoring system"
    expect(critical).toContain("Do NOT say")
    expect(critical).toContain("Be natural, warm, and human")
    expect(high).toContain("Do NOT say")
    expect(high).toContain("Be natural, warm, and human")
  })

  it("uses 'the founder' when no name is provided", () => {
    const result = generateIntervention(makeSignal({ level: "critical" }), "")
    expect(result).toContain("the founder")
  })
})

describe("buildInterventionBlock", () => {
  it("wraps text in [FOUNDER WELLBEING CONTEXT] tags", () => {
    const result = buildInterventionBlock("Test intervention text")
    expect(result).toContain("[FOUNDER WELLBEING CONTEXT]")
    expect(result).toContain("[/FOUNDER WELLBEING CONTEXT]")
    expect(result).toContain("Test intervention text")
  })

  it("starts with newlines for prompt spacing", () => {
    const result = buildInterventionBlock("Test")
    expect(result.startsWith("\n\n")).toBe(true)
  })
})
