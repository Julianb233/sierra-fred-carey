/**
 * Next Steps Service — Unit Tests
 *
 * Tests the extraction logic, priority assignment, and due date computation.
 * Database operations are mocked via vi.mock.
 */

import { describe, it, expect, vi, beforeEach, type Mock } from "vitest"

// Mock Supabase service client
const mockSelect = vi.fn()
const mockInsert = vi.fn()
const mockUpdate = vi.fn()
const mockFrom = vi.fn()

vi.mock("@/lib/supabase/server", () => ({
  createServiceClient: () => ({
    from: mockFrom,
  }),
}))

// Build chainable query builder mock
function buildQueryChain(finalData: unknown, finalError: unknown = null) {
  const chain: Record<string, Mock> = {}
  const handler = () => chain
  chain.select = vi.fn().mockImplementation(handler)
  chain.insert = vi.fn().mockImplementation(handler)
  chain.update = vi.fn().mockImplementation(handler)
  chain.eq = vi.fn().mockImplementation(handler)
  chain.not = vi.fn().mockImplementation(handler)
  chain.lt = vi.fn().mockImplementation(handler)
  chain.order = vi.fn().mockImplementation(handler)
  chain.limit = vi.fn().mockImplementation(handler)
  chain.single = vi.fn().mockResolvedValue({ data: finalData, error: finalError })
  // Terminal: resolve when no .single() follows
  chain.then = undefined as unknown as Mock
  Object.defineProperty(chain, "then", {
    get: () => (resolve: (v: unknown) => void) =>
      resolve({ data: finalData, error: finalError }),
  })
  return chain
}

import {
  getNextSteps,
  markComplete,
  markIncomplete,
  dismissStep,
  extractAndStoreNextSteps,
  getOverdueSteps,
} from "../next-steps-service"

describe("Next Steps Service", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ========================================================================
  // extractAndStoreNextSteps — extraction logic
  // ========================================================================

  describe("extractAndStoreNextSteps", () => {
    it("extracts 3 actions from standard FRED response format", async () => {
      const responseText = `Great question! Here's my analysis...

**Next 3 Actions:**
1. Validate your unit economics with at least 3 customer interviews
2. Update your pitch deck slide 4 with the new revenue numbers
3. Schedule a meeting with your advisor to discuss fundraising timing

Let me know if you need help with any of these!`

      // Mock: no existing steps
      const existingChain = buildQueryChain([])
      // Mock: insert returns the new steps
      const insertChain = buildQueryChain([
        { id: "1", user_id: "user-1", description: "Validate your unit economics with at least 3 customer interviews", priority: "critical", completed: false, dismissed: false, created_at: "2026-03-08T00:00:00Z", updated_at: "2026-03-08T00:00:00Z" },
        { id: "2", user_id: "user-1", description: "Update your pitch deck slide 4 with the new revenue numbers", priority: "important", completed: false, dismissed: false, created_at: "2026-03-08T00:00:00Z", updated_at: "2026-03-08T00:00:00Z" },
        { id: "3", user_id: "user-1", description: "Schedule a meeting with your advisor to discuss fundraising timing", priority: "optional", completed: false, dismissed: false, created_at: "2026-03-08T00:00:00Z", updated_at: "2026-03-08T00:00:00Z" },
      ])

      let callCount = 0
      mockFrom.mockImplementation(() => {
        callCount++
        return callCount === 1 ? existingChain : insertChain
      })

      const result = await extractAndStoreNextSteps("user-1", responseText, "2026-03-08")

      expect(result).toHaveLength(3)
      expect(result[0].priority).toBe("critical")
      expect(result[1].priority).toBe("important")
      expect(result[2].priority).toBe("optional")
    })

    it("returns empty array when no Next 3 Actions block found", async () => {
      const responseText = "Here's some general advice about your startup."
      const result = await extractAndStoreNextSteps("user-1", responseText, null)
      expect(result).toHaveLength(0)
    })

    it("handles bold markdown in action items", async () => {
      const responseText = `**Next 3 Actions:**
1. **Talk to 5 customers** this week about pricing
2. **Review your burn rate** against 18-month runway
3. **Draft an executive summary** for investor outreach`

      const existingChain = buildQueryChain([])
      const insertChain = buildQueryChain([
        { id: "1", user_id: "u1", description: "Talk to 5 customers this week about pricing", priority: "critical", completed: false, dismissed: false, created_at: "2026-03-08", updated_at: "2026-03-08" },
        { id: "2", user_id: "u1", description: "Review your burn rate against 18-month runway", priority: "important", completed: false, dismissed: false, created_at: "2026-03-08", updated_at: "2026-03-08" },
        { id: "3", user_id: "u1", description: "Draft an executive summary for investor outreach", priority: "optional", completed: false, dismissed: false, created_at: "2026-03-08", updated_at: "2026-03-08" },
      ])

      let callCount = 0
      mockFrom.mockImplementation(() => {
        callCount++
        return callCount === 1 ? existingChain : insertChain
      })

      const result = await extractAndStoreNextSteps("u1", responseText, null)
      expect(result).toHaveLength(3)
      // Bold markdown should be stripped
      expect(result[0].description).not.toContain("**")
    })

    it("deduplicates against existing active steps", async () => {
      const responseText = `**Next 3 Actions:**
1. Talk to customers about pricing
2. Update the pitch deck
3. Schedule advisor meeting`

      // Mock existing steps (one matches)
      const existingChain = buildQueryChain([
        { description: "Talk to customers about pricing" },
      ])
      // Only 2 new steps should be inserted
      const insertChain = buildQueryChain([
        { id: "2", user_id: "u1", description: "Update the pitch deck", priority: "critical", completed: false, dismissed: false, created_at: "2026-03-08", updated_at: "2026-03-08" },
        { id: "3", user_id: "u1", description: "Schedule advisor meeting", priority: "important", completed: false, dismissed: false, created_at: "2026-03-08", updated_at: "2026-03-08" },
      ])

      let callCount = 0
      mockFrom.mockImplementation(() => {
        callCount++
        return callCount === 1 ? existingChain : insertChain
      })

      const result = await extractAndStoreNextSteps("u1", responseText, null)
      expect(result).toHaveLength(2)
    })

    it("extracts why-it-matters from separator patterns", async () => {
      const responseText = `**Next 3 Actions:**
1. Validate unit economics — this determines whether VCs will take you seriously
2. Fix your CAC/LTV ratio: investors always check this metric first
3. Build a financial model`

      const existingChain = buildQueryChain([])
      const insertChain = buildQueryChain([
        { id: "1", user_id: "u1", description: "Validate unit economics", why_it_matters: "this determines whether VCs will take you seriously", priority: "critical", completed: false, dismissed: false, created_at: "2026-03-08", updated_at: "2026-03-08" },
        { id: "2", user_id: "u1", description: "Fix your CAC/LTV ratio", why_it_matters: "investors always check this metric first", priority: "important", completed: false, dismissed: false, created_at: "2026-03-08", updated_at: "2026-03-08" },
        { id: "3", user_id: "u1", description: "Build a financial model", why_it_matters: null, priority: "optional", completed: false, dismissed: false, created_at: "2026-03-08", updated_at: "2026-03-08" },
      ])

      let callCount = 0
      mockFrom.mockImplementation(() => {
        callCount++
        return callCount === 1 ? existingChain : insertChain
      })

      const result = await extractAndStoreNextSteps("u1", responseText, null)
      expect(result).toHaveLength(3)
      expect(result[0].whyItMatters).toBe("this determines whether VCs will take you seriously")
      expect(result[2].whyItMatters).toBeNull()
    })

    it("handles case-insensitive 'Next 3 actions' marker", async () => {
      const responseText = `Here's what to do:

Next 3 actions:
1. Do thing A
2. Do thing B
3. Do thing C`

      const existingChain = buildQueryChain([])
      const insertChain = buildQueryChain([
        { id: "1", user_id: "u1", description: "Do thing A", priority: "critical", completed: false, dismissed: false, created_at: "2026-03-08", updated_at: "2026-03-08" },
        { id: "2", user_id: "u1", description: "Do thing B", priority: "important", completed: false, dismissed: false, created_at: "2026-03-08", updated_at: "2026-03-08" },
        { id: "3", user_id: "u1", description: "Do thing C", priority: "optional", completed: false, dismissed: false, created_at: "2026-03-08", updated_at: "2026-03-08" },
      ])

      let callCount = 0
      mockFrom.mockImplementation(() => {
        callCount++
        return callCount === 1 ? existingChain : insertChain
      })

      const result = await extractAndStoreNextSteps("u1", responseText, null)
      expect(result).toHaveLength(3)
    })

    it("stops extracting after 3 actions", async () => {
      const responseText = `**Next 3 Actions:**
1. Action one
2. Action two
3. Action three
4. Action four (should be ignored)
5. Action five (should be ignored)`

      const existingChain = buildQueryChain([])
      const insertChain = buildQueryChain([
        { id: "1", user_id: "u1", description: "Action one", priority: "critical", completed: false, dismissed: false, created_at: "2026-03-08", updated_at: "2026-03-08" },
        { id: "2", user_id: "u1", description: "Action two", priority: "important", completed: false, dismissed: false, created_at: "2026-03-08", updated_at: "2026-03-08" },
        { id: "3", user_id: "u1", description: "Action three", priority: "optional", completed: false, dismissed: false, created_at: "2026-03-08", updated_at: "2026-03-08" },
      ])

      let callCount = 0
      mockFrom.mockImplementation(() => {
        callCount++
        return callCount === 1 ? existingChain : insertChain
      })

      const result = await extractAndStoreNextSteps("u1", responseText, null)
      expect(result).toHaveLength(3)
    })

    it("handles dash-style bullet points", async () => {
      const responseText = `**Next 3 Actions:**
- First action item
- Second action item
- Third action item`

      const existingChain = buildQueryChain([])
      const insertChain = buildQueryChain([
        { id: "1", user_id: "u1", description: "First action item", priority: "critical", completed: false, dismissed: false, created_at: "2026-03-08", updated_at: "2026-03-08" },
        { id: "2", user_id: "u1", description: "Second action item", priority: "important", completed: false, dismissed: false, created_at: "2026-03-08", updated_at: "2026-03-08" },
        { id: "3", user_id: "u1", description: "Third action item", priority: "optional", completed: false, dismissed: false, created_at: "2026-03-08", updated_at: "2026-03-08" },
      ])

      let callCount = 0
      mockFrom.mockImplementation(() => {
        callCount++
        return callCount === 1 ? existingChain : insertChain
      })

      const result = await extractAndStoreNextSteps("u1", responseText, null)
      expect(result).toHaveLength(3)
    })
  })

  // ========================================================================
  // getNextSteps — query and grouping
  // ========================================================================

  describe("getNextSteps", () => {
    it("groups steps by priority correctly", async () => {
      const chain = buildQueryChain([
        { id: "1", user_id: "u1", description: "Critical task", priority: "critical", completed: false, dismissed: false, created_at: "2026-03-08", updated_at: "2026-03-08" },
        { id: "2", user_id: "u1", description: "Important task", priority: "important", completed: false, dismissed: false, created_at: "2026-03-08", updated_at: "2026-03-08" },
        { id: "3", user_id: "u1", description: "Optional task", priority: "optional", completed: false, dismissed: false, created_at: "2026-03-08", updated_at: "2026-03-08" },
        { id: "4", user_id: "u1", description: "Another critical", priority: "critical", completed: false, dismissed: false, created_at: "2026-03-08", updated_at: "2026-03-08" },
      ])
      mockFrom.mockReturnValue(chain)

      const result = await getNextSteps("u1")

      expect(result.critical).toHaveLength(2)
      expect(result.important).toHaveLength(1)
      expect(result.optional).toHaveLength(1)
    })

    it("returns empty groups when no steps exist", async () => {
      const chain = buildQueryChain([])
      mockFrom.mockReturnValue(chain)

      const result = await getNextSteps("u1")

      expect(result.critical).toHaveLength(0)
      expect(result.important).toHaveLength(0)
      expect(result.optional).toHaveLength(0)
    })
  })

  // ========================================================================
  // markComplete / markIncomplete / dismissStep
  // ========================================================================

  describe("markComplete", () => {
    it("marks a step as completed", async () => {
      const chain = buildQueryChain({
        id: "s1",
        user_id: "u1",
        description: "Test step",
        priority: "critical",
        completed: true,
        completed_at: "2026-03-08T10:00:00Z",
        dismissed: false,
        created_at: "2026-03-08",
        updated_at: "2026-03-08",
      })
      mockFrom.mockReturnValue(chain)

      const result = await markComplete("u1", "s1")
      expect(result.completed).toBe(true)
      expect(result.completedAt).toBe("2026-03-08T10:00:00Z")
    })
  })

  describe("markIncomplete", () => {
    it("marks a step as incomplete (undo)", async () => {
      const chain = buildQueryChain({
        id: "s1",
        user_id: "u1",
        description: "Test step",
        priority: "critical",
        completed: false,
        completed_at: null,
        dismissed: false,
        created_at: "2026-03-08",
        updated_at: "2026-03-08",
      })
      mockFrom.mockReturnValue(chain)

      const result = await markIncomplete("u1", "s1")
      expect(result.completed).toBe(false)
      expect(result.completedAt).toBeNull()
    })
  })

  describe("dismissStep", () => {
    it("soft-deletes a step", async () => {
      const chain = buildQueryChain({
        id: "s1",
        user_id: "u1",
        description: "Test step",
        priority: "optional",
        completed: false,
        dismissed: true,
        created_at: "2026-03-08",
        updated_at: "2026-03-08",
      })
      mockFrom.mockReturnValue(chain)

      const result = await dismissStep("u1", "s1")
      expect(result.dismissed).toBe(true)
    })
  })

  // ========================================================================
  // getOverdueSteps
  // ========================================================================

  describe("getOverdueSteps", () => {
    it("returns overdue steps with isOverdue flag", async () => {
      const pastDate = new Date()
      pastDate.setDate(pastDate.getDate() - 2)

      const chain = buildQueryChain([
        {
          id: "s1",
          user_id: "u1",
          description: "Overdue task",
          priority: "critical",
          completed: false,
          dismissed: false,
          due_date: pastDate.toISOString(),
          created_at: "2026-03-06",
          updated_at: "2026-03-06",
        },
      ])
      mockFrom.mockReturnValue(chain)

      const result = await getOverdueSteps("u1")
      expect(result).toHaveLength(1)
      expect(result[0].isOverdue).toBe(true)
    })
  })
})
