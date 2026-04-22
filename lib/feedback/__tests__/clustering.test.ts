/**
 * @vitest-environment node
 */
import { describe, it, expect, vi, beforeEach } from "vitest"
import {
  computeClusterHash,
  rankClustersBySeverity,
} from "../clustering"
import type { FeedbackCluster } from "../types"

// ============================================================================
// computeClusterHash
// ============================================================================

describe("computeClusterHash", () => {
  it("produces same hash for same theme + category", () => {
    const h1 = computeClusterHash("Responses too generic", "too_vague")
    const h2 = computeClusterHash("Responses too generic", "too_vague")
    expect(h1).toBe(h2)
  })

  it("produces different hashes for different themes", () => {
    const h1 = computeClusterHash("Responses too generic", "too_vague")
    const h2 = computeClusterHash("Wrong tone in advice", "wrong_tone")
    expect(h1).not.toBe(h2)
  })

  it("handles null category", () => {
    const h1 = computeClusterHash("Some theme", null)
    const h2 = computeClusterHash("Some theme", null)
    expect(h1).toBe(h2)
  })

  it("is case-insensitive", () => {
    const h1 = computeClusterHash("Responses Too Generic", "TOO_VAGUE")
    const h2 = computeClusterHash("responses too generic", "too_vague")
    expect(h1).toBe(h2)
  })

  it("strips punctuation", () => {
    const h1 = computeClusterHash("Responses too generic!", "too_vague")
    const h2 = computeClusterHash("Responses too generic", "too_vague")
    expect(h1).toBe(h2)
  })

  it("returns a 16-char hex string", () => {
    const hash = computeClusterHash("test", "test")
    expect(hash).toHaveLength(16)
    expect(hash).toMatch(/^[0-9a-f]{16}$/)
  })
})

// ============================================================================
// rankClustersBySeverity
// ============================================================================

describe("rankClustersBySeverity", () => {
  const makeCluster = (
    severity: FeedbackCluster["severity"],
    weightedCount: number
  ): FeedbackCluster => ({
    theme: `theme-${severity}-${weightedCount}`,
    description: "test",
    category: null,
    severity,
    signalIds: [],
    signalCount: 1,
    weightedCount,
    hash: "abc123",
  })

  it("sorts critical before high before medium before low", () => {
    const clusters = [
      makeCluster("low", 1),
      makeCluster("critical", 1),
      makeCluster("medium", 1),
      makeCluster("high", 1),
    ]
    const ranked = rankClustersBySeverity(clusters)
    expect(ranked.map((c) => c.severity)).toEqual([
      "critical",
      "high",
      "medium",
      "low",
    ])
  })

  it("sorts by weighted count within same severity", () => {
    const clusters = [
      makeCluster("high", 5),
      makeCluster("high", 15),
      makeCluster("high", 10),
    ]
    const ranked = rankClustersBySeverity(clusters)
    expect(ranked.map((c) => c.weightedCount)).toEqual([15, 10, 5])
  })

  it("returns empty array for empty input", () => {
    expect(rankClustersBySeverity([])).toEqual([])
  })

  it("does not mutate the original array", () => {
    const clusters = [
      makeCluster("low", 1),
      makeCluster("critical", 1),
    ]
    const original = [...clusters]
    rankClustersBySeverity(clusters)
    expect(clusters[0].severity).toBe(original[0].severity)
  })
})

// ============================================================================
// clusterFeedbackSignals (with mocked LLM)
// ============================================================================

vi.mock("ai", () => ({
  generateObject: vi.fn(),
}))

vi.mock("@/lib/ai/providers", () => ({
  getModel: vi.fn(() => "mock-model"),
}))

vi.mock("@/lib/ai/tier-routing", () => ({
  getModelForTier: vi.fn(() => "fast"),
}))

describe("clusterFeedbackSignals", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns empty array for fewer than 3 actionable signals", async () => {
    const { clusterFeedbackSignals } = await import("../clustering")
    const signals = [
      makeFakeSignal({ rating: -1 }),
      makeFakeSignal({ rating: 1 }),
    ]
    const result = await clusterFeedbackSignals(signals)
    expect(result).toEqual([])
  })

  it("clusters actionable signals using LLM output", async () => {
    const { generateObject } = await import("ai")
    const mockedGenerate = vi.mocked(generateObject)
    mockedGenerate.mockResolvedValueOnce({
      object: {
        clusters: [
          {
            theme: "Responses too generic",
            description: "Users complain responses lack specificity",
            category: "too_vague",
            severity: "high",
            signal_indices: [0, 1, 2],
          },
        ],
      },
    } as any)

    const { clusterFeedbackSignals } = await import("../clustering")
    const signals = [
      makeFakeSignal({ id: "s1", rating: -1, category: "too_vague", comment: "Too generic" }),
      makeFakeSignal({ id: "s2", rating: -1, category: "too_vague", comment: "Not specific enough" }),
      makeFakeSignal({ id: "s3", rating: -1, category: "too_vague", comment: "Vague advice" }),
    ]

    const result = await clusterFeedbackSignals(signals)
    expect(result).toHaveLength(1)
    expect(result[0].theme).toBe("Responses too generic")
    expect(result[0].signalIds).toEqual(["s1", "s2", "s3"])
    expect(result[0].signalCount).toBe(3)
    expect(result[0].hash).toHaveLength(16)
  })

  it("falls back to category grouping when LLM fails", async () => {
    const { generateObject } = await import("ai")
    const mockedGenerate = vi.mocked(generateObject)
    mockedGenerate.mockRejectedValueOnce(new Error("LLM unavailable"))

    const { clusterFeedbackSignals } = await import("../clustering")
    const signals = [
      makeFakeSignal({ id: "s1", rating: -1, category: "too_vague", comment: "Vague" }),
      makeFakeSignal({ id: "s2", rating: -1, category: "too_vague", comment: "Vague too" }),
      makeFakeSignal({ id: "s3", rating: -1, category: "wrong_tone", comment: "Harsh" }),
    ]

    const result = await clusterFeedbackSignals(signals)
    // Should fall back to category-based clustering
    // Only "too_vague" has >= 2 signals
    expect(result.length).toBeGreaterThanOrEqual(1)
    const vaguecluster = result.find((c) => c.category === "too_vague")
    expect(vaguecluster).toBeDefined()
    expect(vaguecluster?.signalCount).toBe(2)
  })
})

// ============================================================================
// Helpers
// ============================================================================

function makeFakeSignal(overrides: Partial<any> = {}): any {
  return {
    id: overrides.id || `signal-${Math.random().toString(36).slice(2, 8)}`,
    user_id: "user-1",
    session_id: null,
    message_id: null,
    channel: "chat",
    signal_type: "thumbs_down",
    rating: -1,
    category: null,
    comment: null,
    sentiment_score: null,
    sentiment_confidence: null,
    user_tier: "free",
    weight: 1,
    consent_given: true,
    expires_at: null,
    metadata: {},
    created_at: new Date().toISOString(),
    ...overrides,
  }
}
