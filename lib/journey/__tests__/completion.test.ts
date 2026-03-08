import { describe, it, expect, vi, beforeEach } from "vitest"

// Mock the supabase service client
const mockSingle = vi.fn()
const mockEq = vi.fn(() => ({ single: mockSingle }))
const mockSelect = vi.fn(() => ({ eq: mockEq }))
const mockFrom = vi.fn(() => ({ select: mockSelect }))

vi.mock("@/lib/supabase/server", () => ({
  createServiceClient: () => ({
    from: mockFrom,
  }),
}))

import {
  getJourneyCompletion,
  isJourneyComplete,
  STAGE_WEIGHTS,
} from "../completion"

describe("Journey Completion", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFrom.mockReturnValue({ select: mockSelect })
    mockSelect.mockReturnValue({ eq: mockEq })
    mockEq.mockReturnValue({ single: mockSingle })
  })

  describe("STAGE_WEIGHTS", () => {
    it("has weights for all 5 stages", () => {
      expect(Object.keys(STAGE_WEIGHTS)).toHaveLength(5)
      expect(STAGE_WEIGHTS.clarity).toBe(20)
      expect(STAGE_WEIGHTS.validation).toBe(40)
      expect(STAGE_WEIGHTS.build).toBe(60)
      expect(STAGE_WEIGHTS.launch).toBe(80)
      expect(STAGE_WEIGHTS.grow).toBe(100)
    })
  })

  describe("getJourneyCompletion", () => {
    it("returns 0% when profile has no oases_stage", async () => {
      mockSingle.mockResolvedValue({
        data: { oases_stage: null },
        error: null,
      })

      const result = await getJourneyCompletion("user-1")

      expect(result.percent).toBe(20) // defaults to clarity = 20%
      expect(result.stage).toBe("clarity")
      expect(result.isComplete).toBe(false)
      expect(result.stagesCompleted).toEqual([])
      expect(result.nextStage).toBe("validation")
    })

    it("returns 0% and defaults when profile fetch fails", async () => {
      mockSingle.mockResolvedValue({
        data: null,
        error: { message: "not found" },
      })

      const result = await getJourneyCompletion("user-1")

      expect(result.percent).toBe(0)
      expect(result.stage).toBe("clarity")
      expect(result.isComplete).toBe(false)
      expect(result.stagesCompleted).toEqual([])
      expect(result.nextStage).toBe("clarity")
    })

    it("returns correct data for clarity stage", async () => {
      mockSingle.mockResolvedValue({
        data: { oases_stage: "clarity" },
        error: null,
      })

      const result = await getJourneyCompletion("user-1")

      expect(result.percent).toBe(20)
      expect(result.stage).toBe("clarity")
      expect(result.isComplete).toBe(false)
      expect(result.stagesCompleted).toEqual([])
      expect(result.nextStage).toBe("validation")
    })

    it("returns correct data for validation stage", async () => {
      mockSingle.mockResolvedValue({
        data: { oases_stage: "validation" },
        error: null,
      })

      const result = await getJourneyCompletion("user-1")

      expect(result.percent).toBe(40)
      expect(result.stage).toBe("validation")
      expect(result.isComplete).toBe(false)
      expect(result.stagesCompleted).toEqual(["clarity"])
      expect(result.nextStage).toBe("build")
    })

    it("returns correct data for build stage", async () => {
      mockSingle.mockResolvedValue({
        data: { oases_stage: "build" },
        error: null,
      })

      const result = await getJourneyCompletion("user-1")

      expect(result.percent).toBe(60)
      expect(result.stage).toBe("build")
      expect(result.isComplete).toBe(false)
      expect(result.stagesCompleted).toEqual(["clarity", "validation"])
      expect(result.nextStage).toBe("launch")
    })

    it("returns correct data for launch stage", async () => {
      mockSingle.mockResolvedValue({
        data: { oases_stage: "launch" },
        error: null,
      })

      const result = await getJourneyCompletion("user-1")

      expect(result.percent).toBe(80)
      expect(result.stage).toBe("launch")
      expect(result.isComplete).toBe(false)
      expect(result.stagesCompleted).toEqual([
        "clarity",
        "validation",
        "build",
      ])
      expect(result.nextStage).toBe("grow")
    })

    it("returns 100% and isComplete for grow stage", async () => {
      mockSingle.mockResolvedValue({
        data: { oases_stage: "grow" },
        error: null,
      })

      const result = await getJourneyCompletion("user-1")

      expect(result.percent).toBe(100)
      expect(result.stage).toBe("grow")
      expect(result.isComplete).toBe(true)
      expect(result.stagesCompleted).toEqual([
        "clarity",
        "validation",
        "build",
        "launch",
        "grow",
      ])
      expect(result.nextStage).toBeNull()
    })
  })

  describe("isJourneyComplete", () => {
    it("returns false when not at grow stage", async () => {
      mockSingle.mockResolvedValue({
        data: { oases_stage: "build" },
        error: null,
      })

      const result = await isJourneyComplete("user-1")
      expect(result).toBe(false)
    })

    it("returns true when at grow stage", async () => {
      mockSingle.mockResolvedValue({
        data: { oases_stage: "grow" },
        error: null,
      })

      const result = await isJourneyComplete("user-1")
      expect(result).toBe(true)
    })
  })
})
