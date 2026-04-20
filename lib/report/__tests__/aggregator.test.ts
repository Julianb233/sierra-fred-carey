/**
 * Report Aggregator & Step Mapping — Unit Tests
 *
 * Tests step mapping correctness (5 sections, 19 steps, [4,3,4,4,4])
 * and aggregator behavior with mocked Supabase queries.
 */

import { describe, it, expect, vi, beforeEach } from "vitest"

// ============================================================================
// Mock setup — must be before imports that use the mocked module
// ============================================================================

let mockSqlCallCount = 0

vi.mock("@/lib/db/supabase-sql", () => {
  const sqlFn = async () => {
    mockSqlCallCount++
    // First call = oases_progress, second call = profiles
    if (mockSqlCallCount % 2 === 1) {
      return mockProgressData
    }
    return mockProfileData
  }
  sqlFn.unsafe = (v: string) => ({ __unsafeRaw: v })
  sqlFn.execute = async () => []
  return { sql: sqlFn, getDb: () => sqlFn }
})

// Mutable data stores that tests can configure
let mockProgressData: unknown[] = []
let mockProfileData: unknown[] = []

// ============================================================================
// Imports (after mocks)
// ============================================================================

import {
  REPORT_SECTIONS,
  REPORT_STEPS,
  getStepsBySection,
} from "../step-mapping"

import {
  aggregateReportData,
  type AggregatedReportInput,
} from "../aggregator"

// ============================================================================
// Step Mapping Tests
// ============================================================================

describe("Step Mapping", () => {
  it("has exactly 5 sections", () => {
    expect(REPORT_SECTIONS).toHaveLength(5)
  })

  it("has exactly 19 steps", () => {
    expect(REPORT_STEPS).toHaveLength(19)
  })

  it("has section step counts of [4, 3, 4, 4, 4]", () => {
    const counts = REPORT_SECTIONS.map((s) => s.steps.length)
    expect(counts).toEqual([4, 3, 4, 4, 4])
  })

  it("has all unique step IDs", () => {
    const ids = REPORT_STEPS.map((s) => s.id)
    const uniqueIds = new Set(ids)
    expect(uniqueIds.size).toBe(ids.length)
  })

  it("has the expected section IDs", () => {
    const sectionIds = REPORT_SECTIONS.map((s) => s.id)
    expect(sectionIds).toEqual([
      "core-offer",
      "founder-story",
      "unit-economics",
      "scaling-operations",
      "leadership-mindset",
    ])
  })

  it("getStepsBySection returns 4 steps for core-offer", () => {
    const steps = getStepsBySection("core-offer")
    expect(steps).toHaveLength(4)
  })

  it("getStepsBySection returns empty array for unknown section", () => {
    const steps = getStepsBySection("nonexistent")
    expect(steps).toHaveLength(0)
  })

  it("all non-empty journeyStepIds are valid strings", () => {
    for (const step of REPORT_STEPS) {
      for (const jsId of step.journeyStepIds) {
        expect(typeof jsId).toBe("string")
        expect(jsId.trim().length).toBeGreaterThan(0)
      }
    }
  })

  it("every step has sectionId matching its parent section", () => {
    for (const section of REPORT_SECTIONS) {
      for (const step of section.steps) {
        expect(step.sectionId).toBe(section.id)
      }
    }
  })
})

// ============================================================================
// Aggregator Tests
// ============================================================================

describe("Aggregator", () => {
  beforeEach(() => {
    mockProgressData = []
    mockProfileData = []
    mockSqlCallCount = 0
  })

  it("returns all null answers when user has zero progress", async () => {
    mockProgressData = []
    mockProfileData = [
      { full_name: "Test User", name: null, company_name: "TestCo", venture_name: null, industry: "Tech" },
    ]

    const result = await aggregateReportData("user-1")

    expect(result.totalSteps).toBe(19)
    expect(result.totalAnswered).toBe(0)
    expect(result.sections).toHaveLength(5)

    for (const section of result.sections) {
      expect(section.completionRate).toBe(0)
      for (const step of section.steps) {
        expect(step.answer).toBeNull()
        expect(step.sourceStepId).toBeNull()
      }
    }
  })

  it("populates answers from matching progress rows", async () => {
    mockProgressData = [
      { step_id: "c_one_sentence", metadata: { answer: "We build X", distilled: "X builder" } },
      { step_id: "c_define_why", metadata: { answer: "I care about founders" } },
    ]
    mockProfileData = [
      { full_name: "Jane", name: null, company_name: "JaneCo", venture_name: null, industry: "SaaS" },
    ]

    const result = await aggregateReportData("user-2")

    // core-offer-product maps to c_one_sentence (primary)
    const productStep = findStep(result, "core-offer-product")
    expect(productStep.answer).toBe("X builder") // distilled preferred
    expect(productStep.sourceStepId).toBe("c_one_sentence")

    // founder-story-why maps to c_define_why
    const whyStep = findStep(result, "founder-story-why")
    expect(whyStep.answer).toBe("I care about founders")
    expect(whyStep.sourceStepId).toBe("c_define_why")

    expect(result.totalAnswered).toBeGreaterThan(0)
  })

  it("prefers metadata.distilled over metadata.answer", async () => {
    mockProgressData = [
      { step_id: "c_one_sentence", metadata: { answer: "raw answer", distilled: "polished answer" } },
    ]
    mockProfileData = [
      { full_name: "Bob", name: null, company_name: null, venture_name: null, industry: null },
    ]

    const result = await aggregateReportData("user-3")
    const step = findStep(result, "core-offer-product")
    expect(step.answer).toBe("polished answer")
  })

  it("falls back to metadata.answer when distilled is missing", async () => {
    mockProgressData = [
      { step_id: "c_one_sentence", metadata: { answer: "raw only" } },
    ]
    mockProfileData = [
      { full_name: "Bob", name: null, company_name: null, venture_name: null, industry: null },
    ]

    const result = await aggregateReportData("user-4")
    const step = findStep(result, "core-offer-product")
    expect(step.answer).toBe("raw only")
  })

  it("handles null metadata gracefully", async () => {
    mockProgressData = [
      { step_id: "c_one_sentence", metadata: null },
    ]
    mockProfileData = [
      { full_name: "Test", name: null, company_name: null, venture_name: null, industry: null },
    ]

    const result = await aggregateReportData("user-5")
    const step = findStep(result, "core-offer-product")
    expect(step.answer).toBeNull()
  })

  it("returns founder name and company from profiles", async () => {
    mockProgressData = []
    mockProfileData = [
      { full_name: "Fred Cary", name: null, company_name: "IdeaPros", venture_name: null, industry: "EdTech" },
    ]

    const result = await aggregateReportData("user-6")
    expect(result.founderName).toBe("Fred Cary")
    expect(result.companyName).toBe("IdeaPros")
    expect(result.industry).toBe("EdTech")
  })

  it("uses defaults when profile fields are null", async () => {
    mockProgressData = []
    mockProfileData = [
      { full_name: null, name: null, company_name: null, venture_name: null, industry: null },
    ]

    const result = await aggregateReportData("user-7")
    expect(result.founderName).toBe("Founder")
    expect(result.companyName).toBe("Your Venture")
    expect(result.industry).toBe("General")
  })

  it("uses defaults when profile query returns empty", async () => {
    mockProgressData = []
    mockProfileData = []

    const result = await aggregateReportData("user-8")
    expect(result.founderName).toBe("Founder")
    expect(result.companyName).toBe("Your Venture")
    expect(result.industry).toBe("General")
  })

  it("falls back to name when full_name is null", async () => {
    mockProgressData = []
    mockProfileData = [
      { full_name: null, name: "Nickname", company_name: null, venture_name: "CoolApp", industry: null },
    ]

    const result = await aggregateReportData("user-9")
    expect(result.founderName).toBe("Nickname")
    expect(result.companyName).toBe("CoolApp")
  })

  it("computes correct completionRate per section", async () => {
    // Provide answers for 2 out of 4 core-offer steps
    mockProgressData = [
      { step_id: "c_one_sentence", metadata: { answer: "answer1" } },
      { step_id: "v_icp_defined", metadata: { answer: "answer2" } },
    ]
    mockProfileData = [
      { full_name: "Test", name: null, company_name: null, venture_name: null, industry: null },
    ]

    const result = await aggregateReportData("user-10")
    const coreOffer = result.sections.find((s) => s.sectionId === "core-offer")!
    // c_one_sentence -> core-offer-product, v_icp_defined -> core-offer-customer = 2/4
    expect(coreOffer.completionRate).toBe(0.5)
  })

  it("uses fallback journey step when primary is not found", async () => {
    // core-offer-problem: primary = c_problem_statement, fallback = c_who_has_problem
    mockProgressData = [
      { step_id: "c_who_has_problem", metadata: { answer: "small business owners" } },
    ]
    mockProfileData = [
      { full_name: "Test", name: null, company_name: null, venture_name: null, industry: null },
    ]

    const result = await aggregateReportData("user-11")
    const problemStep = findStep(result, "core-offer-problem")
    expect(problemStep.answer).toBe("small business owners")
    expect(problemStep.sourceStepId).toBe("c_who_has_problem")
  })

  it("totalSteps is always 19", async () => {
    mockProgressData = []
    mockProfileData = []

    const result = await aggregateReportData("user-12")
    expect(result.totalSteps).toBe(19)
  })
})

// ============================================================================
// Helpers
// ============================================================================

function findStep(result: AggregatedReportInput, stepId: string) {
  for (const section of result.sections) {
    const step = section.steps.find((s) => s.stepId === stepId)
    if (step) return step
  }
  throw new Error(`Step ${stepId} not found in aggregated result`)
}
