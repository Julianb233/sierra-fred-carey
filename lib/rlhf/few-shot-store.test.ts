import { describe, it, expect, vi, beforeEach } from "vitest"

// Mock dependencies
vi.mock("@/lib/db/supabase-sql", () => ({
  sql: Object.assign(
    vi.fn(),
    { execute: vi.fn() }
  ),
}))

vi.mock("@/lib/logger", () => ({
  logger: { log: vi.fn(), error: vi.fn() },
}))

import { sql } from "@/lib/db/supabase-sql"
import {
  storeFewShotExample,
  createFewShotFromSignal,
  getFewShotExamplesForTopic,
  getTopFewShotExamples,
  pruneStaleFewShots,
} from "./few-shot-store"

const mockSql = sql as unknown as ReturnType<typeof vi.fn>

function makeFewShotRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "fs-1",
    signal_id: "sig-1",
    user_id: "user-1",
    topic: "fundraising",
    example_type: "positive",
    user_message: "How do I raise a seed round?",
    assistant_response: "Start with your TAM and prove traction.",
    category: null,
    comment: null,
    user_tier: "pro",
    weight: 3.0,
    metadata: {},
    created_at: "2026-03-01T00:00:00Z",
    expires_at: null,
    ...overrides,
  }
}

describe("few-shot-store", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("storeFewShotExample", () => {
    it("sets weight from tier (studio = 5.0)", async () => {
      const row = makeFewShotRow({ user_tier: "studio", weight: 5.0 })
      mockSql.mockResolvedValueOnce([row])

      const result = await storeFewShotExample({
        signalId: "sig-1",
        userId: "user-1",
        topic: "fundraising",
        exampleType: "positive",
        userMessage: "How do I raise?",
        assistantResponse: "Start with traction.",
        category: null,
        comment: null,
        userTier: "studio",
        weight: 5.0,
        metadata: {},
        expiresAt: null,
      })

      expect(result.weight).toBe(5.0)
      expect(result.userTier).toBe("studio")
    })

    it("sets weight from tier (free = 1.0)", async () => {
      const row = makeFewShotRow({ user_tier: "free", weight: 1.0 })
      mockSql.mockResolvedValueOnce([row])

      const result = await storeFewShotExample({
        signalId: "sig-2",
        userId: "user-2",
        topic: "strategy",
        exampleType: "negative",
        userMessage: "What should I do?",
        assistantResponse: "Can you be more specific?",
        category: "too_vague",
        comment: "Response was unhelpful",
        userTier: "free",
        weight: 1.0,
        metadata: {},
        expiresAt: null,
      })

      expect(result.weight).toBe(1.0)
    })
  })

  describe("createFewShotFromSignal", () => {
    it("deduplicates by signal_id", async () => {
      const existingRow = makeFewShotRow()
      mockSql.mockResolvedValueOnce([existingRow]) // SELECT for dedup

      const result = await createFewShotFromSignal({
        signalId: "sig-1",
        userId: "user-1",
        topic: "fundraising",
        exampleType: "positive",
        userMessage: "How do I raise?",
        assistantResponse: "Start with traction.",
        userTier: "pro",
      })

      expect(result.id).toBe("fs-1")
      // sql should have been called once (for SELECT), not twice (no INSERT)
      expect(mockSql).toHaveBeenCalledTimes(1)
    })

    it("creates new example when no duplicate exists", async () => {
      mockSql.mockResolvedValueOnce([]) // SELECT returns empty (no duplicate)
      const newRow = makeFewShotRow({ id: "fs-new" })
      mockSql.mockResolvedValueOnce([newRow]) // INSERT returns new row

      const result = await createFewShotFromSignal({
        signalId: "sig-new",
        userId: "user-1",
        topic: "strategy",
        exampleType: "negative",
        userMessage: "What do I do?",
        assistantResponse: "Generic advice.",
        category: "too_vague",
        comment: "Not helpful",
        userTier: "studio",
      })

      expect(result.id).toBe("fs-new")
      expect(mockSql).toHaveBeenCalledTimes(2)
    })

    it("throws when topic is empty", async () => {
      await expect(
        createFewShotFromSignal({
          signalId: "sig-1",
          userId: "user-1",
          topic: "  ",
          exampleType: "positive",
          userMessage: "Test",
          assistantResponse: "Test",
          userTier: "free",
        })
      ).rejects.toThrow("Topic is required")
    })
  })

  describe("getFewShotExamplesForTopic", () => {
    it("returns examples ordered by weight DESC", async () => {
      const rows = [
        makeFewShotRow({ id: "fs-1", weight: 5.0 }),
        makeFewShotRow({ id: "fs-2", weight: 3.0 }),
        makeFewShotRow({ id: "fs-3", weight: 1.0 }),
      ]
      mockSql.mockResolvedValueOnce(rows)

      const results = await getFewShotExamplesForTopic("fundraising", "positive")

      expect(results).toHaveLength(3)
      expect(results[0].weight).toBe(5.0)
      expect(results[2].weight).toBe(1.0)
    })

    it("returns empty array when no examples exist", async () => {
      mockSql.mockResolvedValueOnce([])

      const results = await getFewShotExamplesForTopic("unknown-topic", "positive")

      expect(results).toHaveLength(0)
    })
  })

  describe("getTopFewShotExamples", () => {
    it("returns both positive and negative with correct limits", async () => {
      const positiveRows = [
        makeFewShotRow({ id: "pos-1", example_type: "positive" }),
        makeFewShotRow({ id: "pos-2", example_type: "positive" }),
      ]
      const negativeRows = [
        makeFewShotRow({ id: "neg-1", example_type: "negative" }),
      ]

      mockSql.mockResolvedValueOnce(positiveRows)
      mockSql.mockResolvedValueOnce(negativeRows)

      const result = await getTopFewShotExamples("fundraising", {
        positiveLimit: 5,
        negativeLimit: 3,
      })

      expect(result.positive).toHaveLength(2)
      expect(result.negative).toHaveLength(1)
    })
  })

  describe("pruneStaleFewShots", () => {
    it("returns count of deleted rows", async () => {
      mockSql.mockResolvedValueOnce([{ id: "fs-1" }, { id: "fs-2" }])

      const count = await pruneStaleFewShots()

      expect(count).toBe(2)
    })

    it("returns 0 when nothing to prune", async () => {
      mockSql.mockResolvedValueOnce([])

      const count = await pruneStaleFewShots()

      expect(count).toBe(0)
    })
  })
})
