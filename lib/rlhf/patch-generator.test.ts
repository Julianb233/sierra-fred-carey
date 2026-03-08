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

vi.mock("ai", () => ({
  generateObject: vi.fn(),
}))

vi.mock("@/lib/ai/providers", () => ({
  getModel: vi.fn(() => "mock-model"),
}))

vi.mock("@/lib/ai/tier-routing", () => ({
  getModelForTier: vi.fn(() => "mock-provider"),
}))

vi.mock("@/lib/rlhf/few-shot-store", () => ({
  getTopFewShotExamples: vi.fn(() =>
    Promise.resolve({ positive: [], negative: [] })
  ),
}))

import { generateObject } from "ai"
import { sql } from "@/lib/db/supabase-sql"
import { getTopFewShotExamples } from "@/lib/rlhf/few-shot-store"
import {
  generatePromptPatch,
  generatePatchFromCluster,
  getActivePatches,
} from "./patch-generator"
import type { PatchGenerationRequest } from "./types"

const mockGenerateObject = generateObject as unknown as ReturnType<typeof vi.fn>
const mockSql = sql as unknown as ReturnType<typeof vi.fn>
const mockGetTopFewShot = getTopFewShotExamples as unknown as ReturnType<typeof vi.fn>

describe("patch-generator", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("generatePromptPatch", () => {
    const baseRequest: PatchGenerationRequest = {
      clusterTheme: "Responses too generic for fundraising",
      clusterDescription: "Users report FRED gives vague fundraising advice",
      category: "too_vague",
      severity: "high",
      signalComments: ["Too generic", "Not specific enough", "Needs more detail"],
      fewShotExamples: [],
      existingPatches: [],
    }

    it("returns valid PatchGenerationResult", async () => {
      mockGenerateObject.mockResolvedValueOnce({
        object: {
          title: "Improve specificity for fundraising",
          content: "When discussing fundraising, always include specific dollar amounts and timelines.",
          topic: "fundraising",
          rationale: "Users consistently report vague advice",
          expectedImprovement: "Thumbs-up ratio +15%",
          confidence: "medium",
        },
      })

      const result = await generatePromptPatch(baseRequest)

      expect(result.title).toBe("Improve specificity for fundraising")
      expect(result.content).toContain("specific dollar amounts")
      expect(result.topic).toBe("fundraising")
      expect(result.confidence).toBe("medium")
    })

    it("includes few-shot context in the prompt", async () => {
      const requestWithExamples: PatchGenerationRequest = {
        ...baseRequest,
        fewShotExamples: [
          {
            id: "fs-1",
            signalId: "sig-1",
            userId: "user-1",
            topic: "fundraising",
            exampleType: "positive",
            userMessage: "How to raise seed?",
            assistantResponse: "Focus on $500K pre-seed from angels.",
            category: null,
            comment: null,
            userTier: "pro",
            weight: 3.0,
            metadata: {},
            createdAt: "2026-03-01",
            expiresAt: null,
          },
        ],
      }

      mockGenerateObject.mockResolvedValueOnce({
        object: {
          title: "Test",
          content: "Test content",
          topic: "fundraising",
          rationale: "Test",
          expectedImprovement: "Test",
          confidence: "low",
        },
      })

      await generatePromptPatch(requestWithExamples)

      // Verify generateObject was called with a prompt containing the example
      const callArgs = mockGenerateObject.mock.calls[0][0]
      expect(callArgs.prompt).toContain("How to raise seed?")
      expect(callArgs.prompt).toContain("$500K pre-seed")
    })

    it("truncates signal comments to 200 chars", async () => {
      const longComment = "A".repeat(300)
      const requestWithLong: PatchGenerationRequest = {
        ...baseRequest,
        signalComments: [longComment],
      }

      mockGenerateObject.mockResolvedValueOnce({
        object: {
          title: "Test",
          content: "Test",
          topic: null,
          rationale: "Test",
          expectedImprovement: "Test",
          confidence: "low",
        },
      })

      await generatePromptPatch(requestWithLong)

      const callArgs = mockGenerateObject.mock.calls[0][0]
      // The prompt should have the truncated version (200 chars)
      expect(callArgs.prompt).not.toContain("A".repeat(300))
    })
  })

  describe("generatePatchFromCluster", () => {
    it("saves with status draft", async () => {
      mockGetTopFewShot.mockResolvedValueOnce({ positive: [], negative: [] })
      mockSql.mockResolvedValueOnce([]) // getActivePatches returns empty

      mockGenerateObject.mockResolvedValueOnce({
        object: {
          title: "Fix vague fundraising responses",
          content: "Always include specific metrics when discussing fundraising.",
          topic: "fundraising",
          rationale: "Users want specifics",
          expectedImprovement: "Thumbs-up +10%",
          confidence: "medium",
        },
      })

      // savePatchToDB INSERT
      const savedRow = {
        id: "patch-1",
        title: "Fix vague fundraising responses",
        content: "Always include specific metrics when discussing fundraising.",
        topic: "fundraising",
        source: "feedback",
        source_id: "Responses too generic",
        source_signal_ids: ["sig-1", "sig-2"],
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
      }
      mockSql.mockResolvedValueOnce([savedRow])

      const result = await generatePatchFromCluster({
        clusterTheme: "Responses too generic",
        clusterDescription: "Users report vague advice",
        category: "too_vague",
        severity: "high",
        signalIds: ["sig-1", "sig-2"],
        signalComments: ["Too generic", "Needs detail"],
      })

      expect(result.status).toBe("draft")
      expect(result.source).toBe("feedback")
      expect(result.title).toBe("Fix vague fundraising responses")
    })
  })

  describe("getActivePatches", () => {
    it("filters by status active", async () => {
      const rows = [
        {
          id: "patch-1",
          title: "Active patch",
          content: "Do X",
          topic: "fundraising",
          source: "feedback",
          source_id: null,
          source_signal_ids: [],
          status: "active",
          version: 1,
          parent_patch_id: null,
          experiment_id: null,
          approved_by: null,
          approved_at: null,
          activated_at: "2026-03-08",
          deactivated_at: null,
          performance_metrics: {},
          metadata: {},
          created_at: "2026-03-01",
          updated_at: "2026-03-01",
        },
      ]
      mockSql.mockResolvedValueOnce(rows)

      const patches = await getActivePatches("fundraising")

      expect(patches).toHaveLength(1)
      expect(patches[0].status).toBe("active")
    })

    it("returns empty when no active patches", async () => {
      mockSql.mockResolvedValueOnce([])

      const patches = await getActivePatches()

      expect(patches).toHaveLength(0)
    })
  })
})
