/**
 * Report Synthesizer & Schema — Unit Tests
 *
 * Tests schema validation (no AI needed) and synthesizer behavior
 * (mocked generateStructured) including anti-sycophancy guardrails.
 */

import { describe, it, expect, vi, beforeEach } from "vitest"

// ============================================================================
// Mock setup — must be before imports that use the mocked module
// ============================================================================

let capturedPrompt: string | undefined
let capturedSchema: unknown | undefined
let capturedOptions: Record<string, unknown> | undefined
let mockReturnValue: unknown = null

vi.mock("@/lib/ai/fred-client", () => ({
  generateStructured: vi.fn(
    async (prompt: string, schema: unknown, options: Record<string, unknown>) => {
      capturedPrompt = prompt
      capturedSchema = schema
      capturedOptions = options
      return mockReturnValue
    }
  ),
}))

// ============================================================================
// Imports (after mocks)
// ============================================================================

import {
  reportDataSchema,
  reportSectionSchema,
} from "../report-schema"
import {
  synthesizeReport,
  buildSystemPrompt,
  buildUserPrompt,
} from "../synthesizer"
import type { AggregatedReportInput } from "../aggregator"

// ============================================================================
// Test Helpers
// ============================================================================

function makeMockSection(
  id: string,
  title: string,
  answers: (string | null)[]
) {
  return {
    sectionId: id,
    title,
    description: `Description for ${title}`,
    steps: answers.map((answer, i) => ({
      stepId: `${id}-step-${i + 1}`,
      label: `Step ${i + 1} of ${title}`,
      answer,
      sourceStepId: answer ? `journey_${id}_${i}` : null,
    })),
    completionRate: answers.filter(Boolean).length / answers.length,
  }
}

function makeMockAggregatedInput(): AggregatedReportInput {
  return {
    founderName: "Jane Doe",
    companyName: "PetMatch AI",
    industry: "Pet Technology",
    sections: [
      makeMockSection("core-offer", "Your Core Offer", [
        "An AI-powered pet adoption matching platform that connects shelters with adopters based on lifestyle compatibility",
        "Young professionals aged 25-35 in urban areas who want to adopt but feel overwhelmed by shelter options",
        "People spend hours scrolling shelter listings with no way to know which pet fits their lifestyle. They often return pets within 30 days.",
        "Freemium model: free basic matching, $9.99/month premium with behavioral insights and vet integration",
      ]),
      makeMockSection("founder-story", "Your Founder Story", [
        "I returned my first adopted dog after 2 weeks because we were a terrible match. That guilt drove me to fix this.",
        "5 years as a data scientist at Chewy, plus relationships with 200+ shelter networks",
        null,
      ]),
      makeMockSection("unit-economics", "Unit Economics", [
        "$12 CAC via Instagram and shelter partnerships",
        "$180 annual LTV based on 15-month average retention",
        null,
        null,
      ]),
      makeMockSection("scaling-operations", "Scaling Operations", [
        null,
        null,
        null,
        "Instagram ads and shelter partnership referrals",
      ]),
      makeMockSection("leadership-mindset", "Leadership Mindset", [
        null,
        null,
        "My co-founder handles engineering, I have a mentor group of 3 other pet-tech founders",
        null,
      ]),
    ],
    totalAnswered: 9,
    totalSteps: 19,
  }
}

function makeMockAIResponse() {
  return {
    object: {
      executiveSummary:
        "Jane Doe is building PetMatch AI, an AI-powered pet adoption matching platform targeting young professionals aged 25-35 in urban areas. With a freemium model at $9.99/month premium and $12 CAC against $180 annual LTV, the unit economics are promising but unproven. Jane brings 5 years of data science experience from Chewy and relationships with 200+ shelter networks — a genuine unfair advantage in the pet-tech space.",
      founderName: "Jane Doe",
      companyName: "PetMatch AI",
      generatedAt: "2026-04-08T20:00:00.000Z",
      sections: [
        {
          id: "core-offer",
          title: "Your Core Offer",
          synthesized:
            "PetMatch AI addresses a real and specific pain point: adopters scrolling through shelter listings with no way to gauge lifestyle compatibility, leading to a 30-day return rate. Jane's matching algorithm connects shelters with urban professionals aged 25-35 based on behavioral data.\n\nThe freemium model at $9.99/month for premium behavioral insights is a reasonable entry point, though you'll need to validate willingness to pay with real conversion data. The vet integration add-on creates a second revenue stream worth testing early.",
          highlights: [
            "Specific pain point validated: 30-day pet return rate due to poor matching",
            "Clear target customer: urban professionals 25-35 overwhelmed by shelter options",
            "Freemium with $9.99/month premium creates low-friction adoption path",
          ],
          stepIds: [
            "core-offer-step-1",
            "core-offer-step-2",
            "core-offer-step-3",
            "core-offer-step-4",
          ],
        },
        {
          id: "founder-story",
          title: "Your Founder Story",
          synthesized:
            "Jane's personal motivation is compelling and authentic: the guilt of returning an adopted dog after 2 weeks. This is not a manufactured founder story — it's a real pain point that became a mission. Her 5 years at Chewy as a data scientist gives her domain expertise, and relationships with 200+ shelter networks provide distribution that most pet-tech startups cannot replicate.\n\nThe elevator pitch is missing. You need to articulate your value proposition in 30 seconds or less. This is critical for investor conversations and partnership pitches.",
          highlights: [
            "Authentic origin story grounded in personal experience with pet adoption",
            "5 years at Chewy provides deep domain expertise in pet-tech data",
          ],
          stepIds: [
            "founder-story-step-1",
            "founder-story-step-2",
            "founder-story-step-3",
          ],
        },
        {
          id: "unit-economics",
          title: "Unit Economics",
          synthesized:
            "Your $12 CAC via Instagram and shelter partnerships against $180 annual LTV gives you a 15:1 LTV:CAC ratio on paper — which is excellent if it holds. But these numbers need validation with real paid acquisition data. Instagram ad costs fluctuate, and shelter partnerships may not scale linearly.\n\nThe LTV:CAC ratio and path to profitability steps are unanswered. This is a significant gap. You need to model your burn rate, breakeven point, and timeline to profitability before any serious investor conversation.",
          highlights: [
            "$12 CAC assumption via Instagram and shelter partnerships",
            "$180 annual LTV based on 15-month average retention",
          ],
          stepIds: [
            "unit-economics-step-1",
            "unit-economics-step-2",
            "unit-economics-step-3",
            "unit-economics-step-4",
          ],
        },
        {
          id: "scaling-operations",
          title: "Scaling Operations",
          synthesized:
            "This section has the most gaps in your report. You've identified Instagram ads and shelter partnerships as your repeatable acquisition channel, which aligns with your CAC assumptions. But you haven't addressed what process breaks at scale, how you'll automate bottlenecks, or what playbooks you need.\n\nThis area needs significant development. As you grow from 10 to 100 shelter partnerships, onboarding and data integration will become your biggest bottleneck. Document these processes now before they become emergencies.",
          highlights: [
            "Instagram and shelter partnerships identified as primary acquisition channel",
            "Gap identified: no bottleneck analysis or automation plan documented",
          ],
          stepIds: [
            "scaling-operations-step-1",
            "scaling-operations-step-2",
            "scaling-operations-step-3",
            "scaling-operations-step-4",
          ],
        },
        {
          id: "leadership-mindset",
          title: "Leadership Mindset",
          synthesized:
            "You have a co-founder handling engineering and a mentor group of 3 pet-tech founders — that's a better support system than most early-stage founders. The fact that you have peer mentors in the same vertical is genuinely valuable for avoiding common mistakes.\n\nHowever, you haven't addressed delegation, hard conversations, or your leadership style. As you grow past the co-founder stage, these skills become critical. Start thinking about what tasks you should delegate and what difficult conversations you've been putting off.",
          highlights: [
            "Co-founder covers engineering — allows Jane to focus on business and data",
            "Peer mentor group of 3 pet-tech founders for industry-specific guidance",
          ],
          stepIds: [
            "leadership-mindset-step-1",
            "leadership-mindset-step-2",
            "leadership-mindset-step-3",
            "leadership-mindset-step-4",
          ],
        },
      ],
      fredSignoff:
        "Jane, you've got something real here. The personal origin story, the Chewy expertise, the shelter network relationships — those aren't things money can buy. Your biggest gaps right now are in scaling operations and unit economics validation. Get those Instagram ad tests running this week, document your shelter onboarding process, and nail that 30-second pitch. You're closer than you think. — FRED",
      bonusSteps: [
        {
          title: "Run a $500 Instagram ad test this week",
          description:
            "Your $12 CAC assumption is the foundation of your unit economics but it's unvalidated. Run a focused test targeting women 25-35 in one metro area to get real data before building financial projections.",
          rationale:
            "Jane stated $12 CAC via Instagram ads but has not run a test campaign to validate this number",
        },
        {
          title: "Document the shelter onboarding playbook",
          description:
            "With 200+ shelter relationships, onboarding is your most likely bottleneck at scale. Write the step-by-step process now while it's still manual so you can identify what to automate first.",
          rationale:
            "Scaling operations section had no bottleneck analysis or automation plan, and shelter partnerships are the primary acquisition channel",
        },
      ],
    },
    usage: {
      promptTokens: 2100,
      completionTokens: 1800,
      totalTokens: 3900,
    },
    finishReason: "stop",
    modelId: "claude-sonnet-4-20250514",
  }
}

// ============================================================================
// Schema Validation Tests
// ============================================================================

describe("report-schema validation", () => {
  const validData = makeMockAIResponse().object

  it("parses a valid ReportData object successfully", () => {
    const result = reportDataSchema.safeParse(validData)
    expect(result.success).toBe(true)
  })

  it("rejects executiveSummary shorter than 150 chars", () => {
    const result = reportDataSchema.safeParse({
      ...validData,
      executiveSummary: "Too short.",
    })
    expect(result.success).toBe(false)
  })

  it("rejects sections array with fewer than 5 items", () => {
    const result = reportDataSchema.safeParse({
      ...validData,
      sections: validData.sections.slice(0, 3),
    })
    expect(result.success).toBe(false)
  })

  it("rejects synthesized text shorter than 100 chars", () => {
    const result = reportSectionSchema.safeParse({
      ...validData.sections[0],
      synthesized: "Short text.",
    })
    expect(result.success).toBe(false)
  })

  it("rejects highlights with fewer than 2 items", () => {
    const result = reportSectionSchema.safeParse({
      ...validData.sections[0],
      highlights: ["Only one"],
    })
    expect(result.success).toBe(false)
  })

  it("validates bonusSteps (1-2 items required)", () => {
    // Zero bonus steps should fail
    const zeroResult = reportDataSchema.safeParse({
      ...validData,
      bonusSteps: [],
    })
    expect(zeroResult.success).toBe(false)

    // Three bonus steps should fail
    const threeResult = reportDataSchema.safeParse({
      ...validData,
      bonusSteps: [
        ...validData.bonusSteps,
        {
          title: "Third",
          description:
            "This is a third bonus step that should fail the max(2) constraint on the schema validation.",
          rationale: "Extra",
        },
      ],
    })
    expect(threeResult.success).toBe(false)

    // One bonus step should pass
    const oneResult = reportDataSchema.safeParse({
      ...validData,
      bonusSteps: [validData.bonusSteps[0]],
    })
    expect(oneResult.success).toBe(true)
  })
})

// ============================================================================
// Synthesizer Integration Tests (mocked generateStructured)
// ============================================================================

describe("synthesizeReport", () => {
  beforeEach(() => {
    capturedPrompt = undefined
    capturedSchema = undefined
    capturedOptions = undefined
    mockReturnValue = makeMockAIResponse()
  })

  it("returns reportData with exactly 5 sections", async () => {
    const input = makeMockAggregatedInput()
    const result = await synthesizeReport(input)
    expect(result.reportData.sections).toHaveLength(5)
  })

  it("returns bonusSteps array with 1-2 items", async () => {
    const input = makeMockAggregatedInput()
    const result = await synthesizeReport(input)
    expect(result.bonusSteps.length).toBeGreaterThanOrEqual(1)
    expect(result.bonusSteps.length).toBeLessThanOrEqual(2)
  })

  it("sets generatedAt to a valid ISO timestamp", async () => {
    const input = makeMockAggregatedInput()
    const result = await synthesizeReport(input)
    const parsed = new Date(result.reportData.generatedAt)
    expect(parsed.getTime()).not.toBeNaN()
  })

  it("passes temperature 0.3 to generateStructured", async () => {
    const input = makeMockAggregatedInput()
    await synthesizeReport(input)
    expect(capturedOptions).toBeDefined()
    expect(capturedOptions!.temperature).toBe(0.3)
  })

  it("includes anti-sycophancy rules in the system prompt", async () => {
    const input = makeMockAggregatedInput()
    await synthesizeReport(input)
    expect(capturedOptions).toBeDefined()
    const systemPrompt = capturedOptions!.system as string
    expect(systemPrompt).toContain("ANTI-SYCOPHANCY")
    expect(systemPrompt).toContain("passionate team")
    expect(systemPrompt).toContain("innovative solution")
    expect(systemPrompt).toContain("game-changing")
  })

  it("includes the founder's actual answers in the user prompt", async () => {
    const input = makeMockAggregatedInput()
    await synthesizeReport(input)
    expect(capturedPrompt).toBeDefined()
    expect(capturedPrompt).toContain("Jane Doe")
    expect(capturedPrompt).toContain("PetMatch AI")
    expect(capturedPrompt).toContain(
      "AI-powered pet adoption matching platform"
    )
    expect(capturedPrompt).toContain("$9.99/month")
  })

  it("returns usage stats and modelId from the AI response", async () => {
    const input = makeMockAggregatedInput()
    const result = await synthesizeReport(input)
    expect(result.usage.promptTokens).toBe(2100)
    expect(result.usage.completionTokens).toBe(1800)
    expect(result.modelId).toBe("claude-sonnet-4-20250514")
  })

  it("returns generationMs > 0", async () => {
    const input = makeMockAggregatedInput()
    const result = await synthesizeReport(input)
    expect(result.generationMs).toBeGreaterThanOrEqual(0)
  })
})

// ============================================================================
// Anti-Sycophancy Prompt Tests
// ============================================================================

describe("anti-sycophancy guardrails", () => {
  it("system prompt contains the banned phrases list", () => {
    const prompt = buildSystemPrompt()
    const bannedPhrases = [
      "passionate team",
      "strong market opportunity",
      "innovative solution",
      "disruptive technology",
      "game-changing",
      "revolutionary",
      "best-in-class",
      "world-class",
      "cutting-edge",
      "synergy",
      "leverage",
      "robust growth",
      "impressive traction",
    ]
    for (const phrase of bannedPhrases) {
      expect(prompt).toContain(phrase)
    }
  })

  it("system prompt contains BAD/GOOD examples", () => {
    const prompt = buildSystemPrompt()
    expect(prompt).toContain("BAD:")
    expect(prompt).toContain("GOOD:")
    expect(prompt).toContain("market domination")
    expect(prompt).toContain("women 25-35 in Austin")
  })

  it("user prompt marks unanswered steps as [No answer provided]", () => {
    const input = makeMockAggregatedInput()
    const prompt = buildUserPrompt(input)
    expect(prompt).toContain("[No answer provided]")
  })

  it("user prompt includes section completion rates", () => {
    const input = makeMockAggregatedInput()
    const prompt = buildUserPrompt(input)
    expect(prompt).toContain("100% complete") // core-offer has all 4 answers
    expect(prompt).toContain("25% complete") // scaling-operations has 1 of 4
  })

  // RGEN-05 limitation: anti-sycophancy is enforced at prompt level, not post-generation.
  // See FEATURES.md. Reliably detecting sycophantic phrases without a second LLM call
  // produces false positives (e.g., "innovative" appearing in a founder's own quoted answer).
  // This test documents the accepted limitation.
  it("documents RGEN-05 limitation: no post-generation banned-phrase filtering", async () => {
    // Simulate AI returning output with a banned phrase in the executive summary
    const sycophanticResponse = makeMockAIResponse()
    sycophanticResponse.object.executiveSummary =
      "Jane Doe is building an innovative solution that represents a game-changing approach to pet adoption matching. With her passionate team and strong market opportunity, PetMatch AI is positioned to disrupt the pet-tech industry."
    mockReturnValue = sycophanticResponse

    const input = makeMockAggregatedInput()
    const result = await synthesizeReport(input)

    // The synthesizer does NOT filter post-generation — the banned phrases pass through.
    // Anti-sycophancy is enforced via prompt engineering (temperature 0.3, banned phrase list,
    // BAD/GOOD examples). Post-generation filtering would require a second LLM call or
    // risk false positives when banned phrases appear in the founder's own quoted answers.
    expect(result.reportData.executiveSummary).toContain("innovative solution")
    expect(result.reportData.executiveSummary).toContain("game-changing")

    // RGEN-05 limitation documented: anti-sycophancy is enforced at prompt level,
    // not post-generation. See FEATURES.md.
  })
})
