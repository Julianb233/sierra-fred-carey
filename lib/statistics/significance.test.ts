import { describe, it, expect } from "vitest"
import {
  chiSquaredTest,
  welchTTest,
  isSignificant,
  meetsMinimumSampleSize,
} from "./significance"

describe("chiSquaredTest", () => {
  it("detects significant difference in thumbs ratio", () => {
    // Variant A: 100 up, 50 down (67% up)
    // Variant B: 80 up, 70 down (53% up)
    const result = chiSquaredTest([100, 50], [80, 70])
    expect(result.chiSquared).toBeGreaterThan(0)
    expect(result.degreesOfFreedom).toBe(1)
    expect(result.pValue).toBeLessThan(0.1)
    expect(result.alpha).toBe(0.05)
  })

  it("returns non-significant for identical distributions", () => {
    const result = chiSquaredTest([100, 100], [100, 100])
    expect(result.significant).toBe(false)
    expect(result.pValue).toBeGreaterThan(0.05)
  })

  it("returns significant for extreme difference", () => {
    const result = chiSquaredTest([200, 10], [50, 160])
    expect(result.significant).toBe(true)
    expect(result.pValue).toBeLessThan(0.001)
  })

  it("handles zero counts gracefully", () => {
    const result = chiSquaredTest([0, 0], [0, 0])
    expect(result.pValue).toBe(1)
    expect(result.significant).toBe(false)
  })

  it("handles single observation", () => {
    const result = chiSquaredTest([1, 0], [0, 1])
    expect(result.pValue).toBeGreaterThan(0)
    expect(result.chiSquared).toBeGreaterThanOrEqual(0)
  })
})

describe("welchTTest", () => {
  it("detects significant difference in sentiment scores", () => {
    const result = welchTTest(
      { mean: 0.5, variance: 0.1, n: 1000 },
      { mean: 0.3, variance: 0.12, n: 1000 }
    )
    expect(result.tStatistic).toBeGreaterThan(0)
    expect(result.pValue).toBeLessThan(0.05)
    expect(result.significant).toBe(true)
    expect(result.meanDifference).toBeCloseTo(0.2, 5)
    expect(result.confidenceInterval[0]).toBeLessThan(0.2)
    expect(result.confidenceInterval[1]).toBeGreaterThan(0.2)
  })

  it("returns non-significant for identical distributions", () => {
    const result = welchTTest(
      { mean: 0.5, variance: 0.1, n: 100 },
      { mean: 0.5, variance: 0.1, n: 100 }
    )
    expect(result.significant).toBe(false)
    expect(result.pValue).toBeGreaterThan(0.05)
    expect(result.meanDifference).toBeCloseTo(0, 5)
  })

  it("handles small sample sizes", () => {
    const result = welchTTest(
      { mean: 0.5, variance: 0.1, n: 1 },
      { mean: 0.3, variance: 0.1, n: 1 }
    )
    expect(result.pValue).toBe(1)
    expect(result.significant).toBe(false)
  })

  it("handles zero variance", () => {
    const result = welchTTest(
      { mean: 0.5, variance: 0, n: 100 },
      { mean: 0.3, variance: 0, n: 100 }
    )
    expect(result.pValue).toBe(1)
    expect(result.significant).toBe(false)
  })

  it("produces correct confidence interval direction", () => {
    const result = welchTTest(
      { mean: 0.8, variance: 0.05, n: 500 },
      { mean: 0.4, variance: 0.06, n: 500 }
    )
    expect(result.confidenceInterval[0]).toBeGreaterThan(0)
    expect(result.confidenceInterval[1]).toBeGreaterThan(result.confidenceInterval[0])
  })
})

describe("isSignificant", () => {
  it("returns true for p < alpha", () => {
    expect(isSignificant(0.01)).toBe(true)
    expect(isSignificant(0.04)).toBe(true)
  })

  it("returns false for p >= alpha", () => {
    expect(isSignificant(0.05)).toBe(false)
    expect(isSignificant(0.5)).toBe(false)
  })

  it("respects custom alpha", () => {
    expect(isSignificant(0.08, 0.1)).toBe(true)
    expect(isSignificant(0.12, 0.1)).toBe(false)
  })
})

describe("meetsMinimumSampleSize", () => {
  it("returns true when both groups meet minimum", () => {
    expect(meetsMinimumSampleSize(500, 500)).toBe(true)
    expect(meetsMinimumSampleSize(1000, 600)).toBe(true)
  })

  it("returns false when either group is below minimum", () => {
    expect(meetsMinimumSampleSize(499, 500)).toBe(false)
    expect(meetsMinimumSampleSize(500, 499)).toBe(false)
    expect(meetsMinimumSampleSize(100, 100)).toBe(false)
  })

  it("respects custom minimum", () => {
    expect(meetsMinimumSampleSize(100, 100, 100)).toBe(true)
    expect(meetsMinimumSampleSize(99, 100, 100)).toBe(false)
  })
})
