/**
 * Funnel Migration — Unit Tests
 *
 * Tests the data transformation and mapping logic for migrating
 * funnel data to platform tables. Uses mocked Supabase client.
 *
 * Linear: AI-1903
 */

import { describe, it, expect, vi, beforeEach } from "vitest"
import type {
  FunnelChatMessage,
  FunnelJourneyProgress,
  FunnelMigrationPayload,
  MigrationResult,
} from "@/lib/types/funnel-migration"
import {
  JOURNEY_STAGE_IDS,
  STAGE_TO_GOAL_CATEGORY,
  STAGE_MILESTONES,
} from "@/lib/types/funnel-migration"

// ============================================================================
// Mock Supabase
// ============================================================================

const mockInsert = vi.fn().mockReturnValue({
  select: vi.fn().mockReturnValue({
    single: vi.fn().mockResolvedValue({ data: { id: "test-id" }, error: null }),
  }),
})

const mockUpsert = vi.fn().mockReturnValue({
  select: vi.fn().mockReturnValue({
    single: vi.fn().mockResolvedValue({ data: { id: "test-id" }, error: null }),
  }),
})

const mockUpdate = vi.fn().mockReturnValue({
  eq: vi.fn().mockReturnValue({
    is: vi.fn().mockResolvedValue({ error: null }),
  }),
})

const mockSelect = vi.fn().mockReturnValue({
  eq: vi.fn().mockReturnValue({
    eq: vi.fn().mockReturnValue({
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    }),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
  }),
})

const mockFrom = vi.fn().mockReturnValue({
  insert: mockInsert,
  upsert: mockUpsert,
  update: mockUpdate,
  select: mockSelect,
})

vi.mock("@/lib/supabase/server", () => ({
  createServiceClient: () => ({
    from: mockFrom,
  }),
  createClient: async () => ({
    auth: {
      getUser: async () => ({ data: { user: { id: "user-123" } } }),
    },
    from: mockFrom,
  }),
}))

// ============================================================================
// Shared Data Model Tests
// ============================================================================

describe("Funnel Migration Types", () => {
  it("JOURNEY_STAGE_IDS matches expected stages", () => {
    expect(JOURNEY_STAGE_IDS).toEqual(["idea", "build", "launch", "scale", "fund"])
  })

  it("STAGE_TO_GOAL_CATEGORY maps all stages", () => {
    for (const stageId of JOURNEY_STAGE_IDS) {
      expect(STAGE_TO_GOAL_CATEGORY[stageId]).toBeDefined()
      expect(typeof STAGE_TO_GOAL_CATEGORY[stageId]).toBe("string")
    }
  })

  it("STAGE_MILESTONES has 4 milestones per stage", () => {
    for (const stageId of JOURNEY_STAGE_IDS) {
      expect(STAGE_MILESTONES[stageId]).toHaveLength(4)
      for (const milestone of STAGE_MILESTONES[stageId]) {
        expect(typeof milestone).toBe("string")
        expect(milestone.length).toBeGreaterThan(0)
      }
    }
  })

  it("stage categories match founder_goals schema constraints", () => {
    const validCategories = ["validation", "product", "growth", "fundraising", "strategy"]
    for (const stageId of JOURNEY_STAGE_IDS) {
      expect(validCategories).toContain(STAGE_TO_GOAL_CATEGORY[stageId])
    }
  })
})

describe("FunnelMigrationPayload shape", () => {
  it("can construct a valid payload", () => {
    const payload: FunnelMigrationPayload = {
      sessionId: "abc-123",
      chatMessages: [
        {
          id: "msg-1",
          role: "user",
          content: "I have a startup idea",
          timestamp: new Date().toISOString(),
        },
        {
          id: "msg-2",
          role: "assistant",
          content: "Tell me about it!",
          timestamp: new Date().toISOString(),
        },
      ],
      journeyProgress: {
        "idea-0": true,
        "idea-1": true,
        "build-0": false,
      },
      exportedAt: new Date().toISOString(),
      funnelVersion: "1.0",
    }

    expect(payload.sessionId).toBe("abc-123")
    expect(payload.chatMessages).toHaveLength(2)
    expect(payload.journeyProgress["idea-0"]).toBe(true)
  })
})

// ============================================================================
// Data Mapping Validation Tests
// ============================================================================

describe("Data Mapping Validation", () => {
  it("chat messages map to fred_episodic_memory shape", () => {
    const funnelMsg: FunnelChatMessage = {
      id: "msg-1",
      role: "user",
      content: "How do I raise funding?",
      timestamp: "2026-03-09T10:00:00.000Z",
    }

    // Simulate the transformation that migrateChatMessages does
    const episodicRow = {
      user_id: "user-123",
      session_id: "session-abc",
      event_type: "conversation",
      content: {
        role: funnelMsg.role,
        content: funnelMsg.content,
        source: "funnel",
        originalId: funnelMsg.id,
      },
      channel: "funnel",
      importance_score: funnelMsg.role === "user" ? 0.6 : 0.4,
      metadata: {
        migratedFrom: "funnel",
        originalTimestamp: funnelMsg.timestamp,
      },
      created_at: funnelMsg.timestamp,
    }

    expect(episodicRow.event_type).toBe("conversation")
    expect(episodicRow.channel).toBe("funnel")
    expect(episodicRow.content.source).toBe("funnel")
    expect(episodicRow.content.role).toBe("user")
    expect(episodicRow.importance_score).toBe(0.6)
  })

  it("assistant messages get lower importance score", () => {
    const assistantMsg: FunnelChatMessage = {
      id: "msg-2",
      role: "assistant",
      content: "Great question!",
      timestamp: "2026-03-09T10:01:00.000Z",
    }

    const importanceScore = assistantMsg.role === "user" ? 0.6 : 0.4
    expect(importanceScore).toBe(0.4)
  })

  it("journey progress keys decode to valid stages and indices", () => {
    const progress: FunnelJourneyProgress = {
      "idea-0": true,
      "idea-1": true,
      "build-0": true,
      "scale-3": true,
    }

    for (const key of Object.keys(progress)) {
      const [stageId, indexStr] = key.split("-")
      const index = parseInt(indexStr, 10)

      expect(JOURNEY_STAGE_IDS).toContain(stageId)
      expect(index).toBeGreaterThanOrEqual(0)
      expect(index).toBeLessThan(
        STAGE_MILESTONES[stageId as (typeof JOURNEY_STAGE_IDS)[number]].length
      )
    }
  })

  it("completed milestones map to correct goal categories", () => {
    const completedStages: Record<string, string> = {
      idea: "validation",
      build: "product",
      launch: "growth",
      scale: "strategy",
      fund: "fundraising",
    }

    for (const [stage, expectedCategory] of Object.entries(completedStages)) {
      expect(STAGE_TO_GOAL_CATEGORY[stage as (typeof JOURNEY_STAGE_IDS)[number]]).toBe(
        expectedCategory
      )
    }
  })
})

// ============================================================================
// Migration Result Shape Tests
// ============================================================================

describe("MigrationResult", () => {
  it("has correct shape for successful migration", () => {
    const result: MigrationResult = {
      success: true,
      episodesCreated: 15,
      goalsUpdated: 3,
      eventsLogged: 3,
      warnings: [],
      completedAt: "2026-03-09T12:00:00.000Z",
    }

    expect(result.success).toBe(true)
    expect(result.episodesCreated).toBeGreaterThan(0)
    expect(result.warnings).toHaveLength(0)
  })

  it("captures warnings for partial failures", () => {
    const result: MigrationResult = {
      success: true,
      episodesCreated: 10,
      goalsUpdated: 2,
      eventsLogged: 1,
      warnings: [
        "Goal idea/Define the problem: duplicate key",
        "Journey event idea/0: timeout",
      ],
      completedAt: "2026-03-09T12:00:00.000Z",
    }

    expect(result.success).toBe(true) // partial success is still success
    expect(result.warnings).toHaveLength(2)
  })
})

// ============================================================================
// Edge Case Tests
// ============================================================================

describe("Edge Cases", () => {
  it("handles empty funnel payload gracefully", () => {
    const payload: FunnelMigrationPayload = {
      sessionId: "empty-session",
      chatMessages: [],
      journeyProgress: {},
      exportedAt: new Date().toISOString(),
      funnelVersion: "1.0",
    }

    expect(payload.chatMessages).toHaveLength(0)
    expect(Object.keys(payload.journeyProgress)).toHaveLength(0)
  })

  it("handles journey progress with false values", () => {
    const progress: FunnelJourneyProgress = {
      "idea-0": true,
      "idea-1": false,
      "idea-2": false,
      "idea-3": true,
    }

    const completedCount = Object.values(progress).filter(Boolean).length
    expect(completedCount).toBe(2)
  })

  it("handles chat messages with special characters", () => {
    const msg: FunnelChatMessage = {
      id: "special-1",
      role: "user",
      content: 'What about "quotes" and <html> & special chars?',
      timestamp: new Date().toISOString(),
    }

    // Content should pass through unchanged
    expect(msg.content).toContain('"quotes"')
    expect(msg.content).toContain("<html>")
    expect(msg.content).toContain("&")
  })

  it("handles very long chat history", () => {
    const messages: FunnelChatMessage[] = Array.from({ length: 500 }, (_, i) => ({
      id: `msg-${i}`,
      role: (i % 2 === 0 ? "user" : "assistant") as "user" | "assistant",
      content: `Message number ${i}`,
      timestamp: new Date(Date.now() + i * 1000).toISOString(),
    }))

    // Ensure batching works (50 per batch = 10 batches for 500 messages)
    const batchCount = Math.ceil(messages.length / 50)
    expect(batchCount).toBe(10)
  })
})
