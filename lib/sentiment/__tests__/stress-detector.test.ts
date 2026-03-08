/**
 * Phase 83: Stress detector unit tests
 *
 * Tests the rolling window stress pattern detection and intervention gating.
 * Mocks the DB layer to isolate the pure computation logic.
 */

import { describe, it, expect, vi, beforeEach } from "vitest"
import type { SentimentResult } from "@/lib/feedback/sentiment"

// Mock the DB layer
vi.mock("@/lib/db/sentiment-log", () => ({
  getRecentSentimentSignals: vi.fn().mockResolvedValue([]),
  wasInterventionTriggeredRecently: vi.fn().mockResolvedValue(false),
}))

import { detectStressPattern, shouldIntervene, extractTopicsFromMessage } from "../stress-detector"
import { getRecentSentimentSignals, wasInterventionTriggeredRecently } from "@/lib/db/sentiment-log"
import type { SentimentSignalRow } from "@/lib/db/sentiment-log"

const mockGetRecent = vi.mocked(getRecentSentimentSignals)
const mockWasIntervention = vi.mocked(wasInterventionTriggeredRecently)

function makeSignal(
  label: "positive" | "neutral" | "negative" | "frustrated",
  minutesAgo: number = 0
): SentimentSignalRow {
  return {
    id: crypto.randomUUID(),
    user_id: "user-1",
    message_id: null,
    label,
    confidence: 0.8,
    stress_level: 0,
    topics: null,
    intervention_triggered: false,
    created_at: new Date(Date.now() - minutesAgo * 60000).toISOString(),
  }
}

describe("detectStressPattern", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetRecent.mockResolvedValue([])
  })

  it("returns low stress for a single positive message with no history", async () => {
    const sentiment: SentimentResult = { label: "positive", confidence: 0.9, isCoachingDiscomfort: false }
    const result = await detectStressPattern("user-1", sentiment)
    expect(result.level).toBe("low")
    expect(result.score).toBeLessThan(0.2)
  })

  it("returns low stress for a single neutral message with no history", async () => {
    const sentiment: SentimentResult = { label: "neutral", confidence: 0.7, isCoachingDiscomfort: false }
    const result = await detectStressPattern("user-1", sentiment)
    expect(result.level).toBe("low")
  })

  it("returns moderate stress with mixed negative history", async () => {
    mockGetRecent.mockResolvedValue([
      makeSignal("negative", 1),
      makeSignal("neutral", 2),
      makeSignal("negative", 3),
      makeSignal("neutral", 4),
      makeSignal("positive", 5),
    ])
    const sentiment: SentimentResult = { label: "negative", confidence: 0.8, isCoachingDiscomfort: false }
    const result = await detectStressPattern("user-1", sentiment)
    expect(["moderate", "high"]).toContain(result.level)
    expect(result.score).toBeGreaterThan(0.15)
  })

  it("returns high/critical stress for sustained frustration", async () => {
    mockGetRecent.mockResolvedValue([
      makeSignal("frustrated", 1),
      makeSignal("frustrated", 2),
      makeSignal("frustrated", 3),
      makeSignal("negative", 4),
      makeSignal("frustrated", 5),
    ])
    const sentiment: SentimentResult = { label: "frustrated", confidence: 0.9, isCoachingDiscomfort: false }
    const result = await detectStressPattern("user-1", sentiment)
    expect(["high", "critical"]).toContain(result.level)
    expect(result.score).toBeGreaterThanOrEqual(0.7)
  })

  it("detects worsening trend when current window is worse than previous", async () => {
    // 10 signals: first 5 (most recent) are frustrated, next 5 (older) are positive
    mockGetRecent.mockResolvedValue([
      makeSignal("frustrated", 1),
      makeSignal("frustrated", 2),
      makeSignal("negative", 3),
      makeSignal("negative", 4),
      makeSignal("neutral", 5),
      makeSignal("positive", 6),
      makeSignal("positive", 7),
      makeSignal("positive", 8),
      makeSignal("positive", 9),
      makeSignal("positive", 10),
    ])
    const sentiment: SentimentResult = { label: "frustrated", confidence: 0.9, isCoachingDiscomfort: false }
    const result = await detectStressPattern("user-1", sentiment)
    expect(result.trend).toBe("worsening")
  })

  it("detects improving trend when current window is better than previous", async () => {
    // 10 signals: first 5 (most recent) are positive, next 5 (older) are frustrated
    mockGetRecent.mockResolvedValue([
      makeSignal("positive", 1),
      makeSignal("positive", 2),
      makeSignal("neutral", 3),
      makeSignal("positive", 4),
      makeSignal("neutral", 5),
      makeSignal("frustrated", 6),
      makeSignal("frustrated", 7),
      makeSignal("frustrated", 8),
      makeSignal("negative", 9),
      makeSignal("frustrated", 10),
    ])
    const sentiment: SentimentResult = { label: "positive", confidence: 0.9, isCoachingDiscomfort: false }
    const result = await detectStressPattern("user-1", sentiment)
    expect(result.trend).toBe("improving")
  })

  it("returns dominant emotion from window", async () => {
    mockGetRecent.mockResolvedValue([
      makeSignal("frustrated", 1),
      makeSignal("frustrated", 2),
      makeSignal("neutral", 3),
    ])
    const sentiment: SentimentResult = { label: "frustrated", confidence: 0.9, isCoachingDiscomfort: false }
    const result = await detectStressPattern("user-1", sentiment)
    expect(result.dominantEmotion).toBe("frustrated")
  })
})

describe("shouldIntervene", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockWasIntervention.mockResolvedValue(false)
  })

  it("returns false for low stress", async () => {
    const result = await shouldIntervene({ level: "low", score: 0.1, trend: "stable", dominantEmotion: "neutral", topics: [] }, "user-1")
    expect(result).toBe(false)
  })

  it("returns false for moderate stress", async () => {
    const result = await shouldIntervene({ level: "moderate", score: 0.35, trend: "worsening", dominantEmotion: "negative", topics: [] }, "user-1")
    expect(result).toBe(false)
  })

  it("returns true for high stress with worsening trend", async () => {
    const result = await shouldIntervene({ level: "high", score: 0.6, trend: "worsening", dominantEmotion: "frustrated", topics: [] }, "user-1")
    expect(result).toBe(true)
  })

  it("returns true for high stress with stable trend", async () => {
    const result = await shouldIntervene({ level: "high", score: 0.55, trend: "stable", dominantEmotion: "negative", topics: [] }, "user-1")
    expect(result).toBe(true)
  })

  it("returns false for high stress with improving trend", async () => {
    const result = await shouldIntervene({ level: "high", score: 0.55, trend: "improving", dominantEmotion: "negative", topics: [] }, "user-1")
    expect(result).toBe(false)
  })

  it("returns true for critical stress regardless of trend", async () => {
    const result = await shouldIntervene({ level: "critical", score: 0.8, trend: "improving", dominantEmotion: "frustrated", topics: [] }, "user-1")
    expect(result).toBe(true)
  })

  it("returns false when intervention was triggered recently (cooldown)", async () => {
    mockWasIntervention.mockResolvedValue(true)
    const result = await shouldIntervene({ level: "critical", score: 0.9, trend: "worsening", dominantEmotion: "frustrated", topics: [] }, "user-1")
    expect(result).toBe(false)
  })
})

describe("extractTopicsFromMessage", () => {
  it("extracts fundraising topic", () => {
    expect(extractTopicsFromMessage("I need to pitch to investors")).toContain("fundraising")
  })

  it("extracts burnout topic", () => {
    expect(extractTopicsFromMessage("I'm so exhausted and stressed")).toContain("burnout")
  })

  it("extracts multiple topics", () => {
    const topics = extractTopicsFromMessage("I need to hire a team and pitch to investors")
    expect(topics).toContain("team")
    expect(topics).toContain("fundraising")
  })

  it("returns empty for generic messages", () => {
    expect(extractTopicsFromMessage("hello")).toEqual([])
  })
})
