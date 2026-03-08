import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/db/supabase-sql", () => ({
  sql: Object.assign(vi.fn(), { execute: vi.fn() }),
}))

vi.mock("@/lib/logger", () => ({
  logger: { log: vi.fn(), error: vi.fn() },
}))

vi.mock("@/lib/rlhf/improvement-tracker", () => ({
  getImprovementsForUser: vi.fn(),
  markAsNotified: vi.fn(),
}))

vi.mock("resend", () => ({
  Resend: vi.fn().mockImplementation(() => ({
    emails: {
      send: vi.fn().mockResolvedValue({ data: { id: "email-1" } }),
    },
  })),
}))

import { sql } from "@/lib/db/supabase-sql"
import { getImprovementsForUser, markAsNotified } from "@/lib/rlhf/improvement-tracker"
import {
  getEligibleUsers,
  buildDigestContent,
  sendFeedbackDigest,
} from "./close-the-loop-digest"

const mockSql = sql as unknown as ReturnType<typeof vi.fn>
const mockGetImprovements = getImprovementsForUser as unknown as ReturnType<typeof vi.fn>
const mockMarkNotified = markAsNotified as unknown as ReturnType<typeof vi.fn>

describe("close-the-loop-digest", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.RESEND_API_KEY = "test-key"
    process.env.NEXT_PUBLIC_APP_URL = "https://test.joinsahara.com"
  })

  describe("getEligibleUsers", () => {
    it("returns opted-in users with feedback history", async () => {
      mockSql.mockResolvedValueOnce([
        {
          user_id: "user-1",
          email: "founder@example.com",
          first_name: "Jane",
        },
      ])

      const users = await getEligibleUsers()

      expect(users).toHaveLength(1)
      expect(users[0].email).toBe("founder@example.com")
      expect(users[0].firstName).toBe("Jane")
    })

    it("returns empty when no eligible users", async () => {
      mockSql.mockResolvedValueOnce([])

      const users = await getEligibleUsers()

      expect(users).toHaveLength(0)
    })
  })

  describe("buildDigestContent", () => {
    it("filters to unnotified improvements", async () => {
      mockGetImprovements.mockResolvedValueOnce([
        {
          id: "imp-1",
          title: "Better responses",
          notifiedAt: null,
          improvementType: "prompt_patch",
        },
        {
          id: "imp-2",
          title: "Already notified",
          notifiedAt: "2026-03-01",
          improvementType: "bug_fix",
        },
      ])

      const result = await buildDigestContent("user-1")

      expect(result.improvements).toHaveLength(1)
      expect(result.shouldSend).toBe(true)
    })

    it("returns shouldSend=false when no improvements", async () => {
      mockGetImprovements.mockResolvedValueOnce([])

      const result = await buildDigestContent("user-1")

      expect(result.shouldSend).toBe(false)
    })

    it("returns shouldSend=false when all already notified", async () => {
      mockGetImprovements.mockResolvedValueOnce([
        {
          id: "imp-1",
          title: "Already sent",
          notifiedAt: "2026-03-01",
          improvementType: "prompt_patch",
        },
      ])

      const result = await buildDigestContent("user-1")

      expect(result.shouldSend).toBe(false)
    })
  })

  describe("sendFeedbackDigest", () => {
    it("skips users with no improvements", async () => {
      // getEligibleUsers
      mockSql.mockResolvedValueOnce([
        { user_id: "user-1", email: "test@example.com", first_name: "Test" },
      ])
      // buildDigestContent → getImprovementsForUser returns empty
      mockGetImprovements.mockResolvedValueOnce([])

      const result = await sendFeedbackDigest()

      expect(result.sent).toBe(0)
      expect(result.skipped).toBe(1)
    })

    it("returns zero counts when no eligible users", async () => {
      mockSql.mockResolvedValueOnce([])

      const result = await sendFeedbackDigest()

      expect(result.sent).toBe(0)
      expect(result.skipped).toBe(0)
      expect(result.errors).toBe(0)
    })
  })
})
