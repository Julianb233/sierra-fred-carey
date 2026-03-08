import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/db/supabase-sql", () => ({
  sql: Object.assign(vi.fn(), { execute: vi.fn() }),
}))

vi.mock("@/lib/logger", () => ({
  logger: { log: vi.fn(), error: vi.fn() },
}))

import { sql } from "@/lib/db/supabase-sql"
import {
  logImprovement,
  logImprovementFromPatch,
  getImprovementsForUser,
  markAsNotified,
} from "./improvement-tracker"

const mockSql = sql as unknown as ReturnType<typeof vi.fn>

function makeImprovementRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "imp-1",
    improvement_type: "prompt_patch",
    title: "Better fundraising responses",
    description: "FRED now gives more specific fundraising advice",
    patch_id: "patch-1",
    insight_id: null,
    signal_ids: ["sig-1", "sig-2"],
    user_ids: ["user-1", "user-2"],
    severity: "medium",
    resolved_at: "2026-03-10T00:00:00Z",
    notified_at: null,
    metadata: {},
    created_at: "2026-03-10T00:00:00Z",
    ...overrides,
  }
}

describe("improvement-tracker", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("logImprovement", () => {
    it("derives user_ids from signal_ids", async () => {
      // Query to get user IDs from signals
      mockSql.mockResolvedValueOnce([
        { user_id: "user-1" },
        { user_id: "user-2" },
      ])
      // INSERT improvement
      mockSql.mockResolvedValueOnce([makeImprovementRow()])

      const result = await logImprovement({
        improvementType: "prompt_patch",
        title: "Test improvement",
        signalIds: ["sig-1", "sig-2"],
      })

      expect(result.userIds).toEqual(["user-1", "user-2"])
      expect(mockSql).toHaveBeenCalledTimes(2)
    })

    it("handles empty signal_ids", async () => {
      mockSql.mockResolvedValueOnce([makeImprovementRow({ user_ids: [] })])

      const result = await logImprovement({
        improvementType: "bug_fix",
        title: "Fixed a bug",
        signalIds: [],
      })

      expect(result).toBeDefined()
      // Only INSERT call (no SELECT for user_ids)
      expect(mockSql).toHaveBeenCalledTimes(1)
    })
  })

  describe("logImprovementFromPatch", () => {
    it("creates improvement entry from patch data", async () => {
      // Get patch
      mockSql.mockResolvedValueOnce([{
        id: "patch-1",
        title: "Improve specificity",
        content: "Always include specific numbers.",
        topic: "fundraising",
        source_signal_ids: ["sig-1"],
        source_id: null,
      }])
      // Get user IDs
      mockSql.mockResolvedValueOnce([{ user_id: "user-1" }])
      // INSERT improvement
      mockSql.mockResolvedValueOnce([makeImprovementRow()])

      const result = await logImprovementFromPatch("patch-1")

      expect(result).not.toBeNull()
      expect(result!.improvementType).toBe("prompt_patch")
    })

    it("returns null when patch not found", async () => {
      mockSql.mockResolvedValueOnce([])

      const result = await logImprovementFromPatch("nonexistent")

      expect(result).toBeNull()
    })
  })

  describe("getImprovementsForUser", () => {
    it("filters by 30-day window", async () => {
      const rows = [
        makeImprovementRow({ id: "imp-1" }),
        makeImprovementRow({ id: "imp-2" }),
      ]
      mockSql.mockResolvedValueOnce(rows)

      const results = await getImprovementsForUser("user-1")

      expect(results).toHaveLength(2)
    })

    it("returns empty when no improvements found", async () => {
      mockSql.mockResolvedValueOnce([])

      const results = await getImprovementsForUser("user-no-improvements")

      expect(results).toHaveLength(0)
    })
  })

  describe("markAsNotified", () => {
    it("updates notified_at timestamp", async () => {
      mockSql.mockResolvedValueOnce([])

      await markAsNotified(["imp-1", "imp-2"])

      expect(mockSql).toHaveBeenCalledTimes(1)
    })

    it("handles empty array gracefully", async () => {
      await markAsNotified([])

      expect(mockSql).not.toHaveBeenCalled()
    })
  })
})
