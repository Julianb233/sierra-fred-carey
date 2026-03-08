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
  getPatchById,
  getPatchesByStatus,
  approvePatch,
  rejectPatch,
  activatePatch,
  deactivatePatch,
  launchPatchAsTest,
  getActiveDBPatches,
} from "./patch-manager"

const mockSql = sql as unknown as ReturnType<typeof vi.fn>

function makePatchRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "patch-1",
    title: "Test patch",
    content: "Do something specific.",
    topic: "fundraising",
    source: "feedback",
    source_id: null,
    source_signal_ids: [],
    status: "draft",
    version: 1,
    parent_patch_id: null,
    experiment_id: null,
    approved_by: null,
    approved_at: null,
    activated_at: null,
    deactivated_at: null,
    performance_metrics: {},
    metadata: {},
    created_at: "2026-03-10T00:00:00Z",
    updated_at: "2026-03-10T00:00:00Z",
    ...overrides,
  }
}

describe("patch-manager", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("approvePatch", () => {
    it("transitions draft -> approved with timestamp", async () => {
      // getPatchById SELECT
      mockSql.mockResolvedValueOnce([makePatchRow({ status: "draft" })])
      // UPDATE
      const approvedRow = makePatchRow({
        status: "approved",
        approved_by: "admin-1",
        approved_at: "2026-03-10T12:00:00Z",
      })
      mockSql.mockResolvedValueOnce([approvedRow])

      const result = await approvePatch("patch-1", "admin-1")

      expect(result.status).toBe("approved")
      expect(result.approvedBy).toBe("admin-1")
    })

    it("throws on non-draft status", async () => {
      mockSql.mockResolvedValueOnce([makePatchRow({ status: "active" })])

      await expect(approvePatch("patch-1", "admin-1")).rejects.toThrow(
        "Cannot approve patch with status 'active'"
      )
    })

    it("throws when patch not found", async () => {
      mockSql.mockResolvedValueOnce([])

      await expect(approvePatch("nonexistent", "admin-1")).rejects.toThrow(
        "not found"
      )
    })
  })

  describe("rejectPatch", () => {
    it("stores rejection reason in metadata", async () => {
      mockSql.mockResolvedValueOnce([makePatchRow({ status: "draft" })])
      const rejectedRow = makePatchRow({
        status: "rejected",
        metadata: { rejectionReason: "Not specific enough" },
      })
      mockSql.mockResolvedValueOnce([rejectedRow])

      const result = await rejectPatch("patch-1", "Not specific enough")

      expect(result.status).toBe("rejected")
      expect(result.metadata).toHaveProperty("rejectionReason", "Not specific enough")
    })

    it("allows rejecting approved patches", async () => {
      mockSql.mockResolvedValueOnce([makePatchRow({ status: "approved" })])
      mockSql.mockResolvedValueOnce([makePatchRow({ status: "rejected" })])

      const result = await rejectPatch("patch-1")
      expect(result.status).toBe("rejected")
    })

    it("throws on active status", async () => {
      mockSql.mockResolvedValueOnce([makePatchRow({ status: "active" })])

      await expect(rejectPatch("patch-1")).rejects.toThrow(
        "Cannot reject patch with status 'active'"
      )
    })
  })

  describe("activatePatch", () => {
    it("transitions approved -> active", async () => {
      mockSql.mockResolvedValueOnce([makePatchRow({ status: "approved" })])
      mockSql.mockResolvedValueOnce([makePatchRow({ status: "active", activated_at: "2026-03-10" })])

      const result = await activatePatch("patch-1")

      expect(result.status).toBe("active")
    })

    it("throws on non-approved status", async () => {
      mockSql.mockResolvedValueOnce([makePatchRow({ status: "draft" })])

      await expect(activatePatch("patch-1")).rejects.toThrow(
        "Cannot activate patch with status 'draft'"
      )
    })
  })

  describe("deactivatePatch", () => {
    it("transitions active -> archived", async () => {
      mockSql.mockResolvedValueOnce([makePatchRow({ status: "active" })])
      mockSql.mockResolvedValueOnce([makePatchRow({ status: "archived", deactivated_at: "2026-03-10" })])

      const result = await deactivatePatch("patch-1")

      expect(result.status).toBe("archived")
    })
  })

  describe("launchPatchAsTest", () => {
    it("creates experiment with control/treatment variants", async () => {
      // getPatchById
      mockSql.mockResolvedValueOnce([makePatchRow({ status: "approved" })])
      // INSERT experiment
      mockSql.mockResolvedValueOnce([{ id: "exp-1" }])
      // INSERT control variant
      mockSql.mockResolvedValueOnce([])
      // INSERT treatment variant
      mockSql.mockResolvedValueOnce([])
      // UPDATE patch
      mockSql.mockResolvedValueOnce([makePatchRow({ status: "testing", experiment_id: "exp-1" })])

      const result = await launchPatchAsTest("patch-1", {
        name: "test-experiment",
        description: "Testing a patch",
      })

      expect(result.experimentId).toBe("exp-1")
      expect(result.patch.status).toBe("testing")
      // Verify experiment was created (second call)
      expect(mockSql).toHaveBeenCalledTimes(5)
    })
  })

  describe("getActiveDBPatches", () => {
    it("returns active patches from DB", async () => {
      const rows = [
        makePatchRow({ id: "p1", status: "active" }),
        makePatchRow({ id: "p2", status: "active", topic: null }),
      ]
      mockSql.mockResolvedValueOnce(rows)

      const patches = await getActiveDBPatches()

      expect(patches).toHaveLength(2)
    })

    it("filters by topic when provided", async () => {
      const rows = [
        makePatchRow({ id: "p1", status: "active", topic: "fundraising" }),
        makePatchRow({ id: "p2", status: "active", topic: null }),
      ]
      mockSql.mockResolvedValueOnce(rows)

      const patches = await getActiveDBPatches("fundraising")

      expect(patches).toHaveLength(2) // includes null-topic patches
    })
  })
})
