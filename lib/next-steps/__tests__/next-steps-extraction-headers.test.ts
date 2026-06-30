/**
 * Next Steps Service — Heading-robustness tests (AI-6489)
 *
 * Fred Cary's product principle: "every session must produce two or three
 * clear next steps." FRED's main chat prompt emits "**Next 3 Actions:**", but
 * other surfaces (SMS formats outgoing as "Next Actions:") and natural LLM
 * drift produce equivalent headings. These tests lock in that the extractor
 * captures the founder's actions regardless of the exact heading wording, so a
 * session never silently fails to store its action items (which would also
 * starve cross-session memory and the overdue-reminder cron that read from
 * next_steps).
 *
 * Covers headings the original `/Next 3 Actions/` marker missed:
 *   - "Next Actions:"     (the SMS surface heading — no literal "3")
 *   - "## Next Steps"     (markdown heading)
 *   - "Next 2 Actions:"   (the "two" branch of "two or three")
 * and asserts a conversational "next steps" mid-sentence is NOT matched.
 */

import { describe, it, expect, vi, beforeEach, type Mock } from "vitest"

// Mock Supabase service client (mirrors next-steps-service.test.ts harness)
const mockFrom = vi.fn()

vi.mock("@/lib/supabase/server", () => ({
  createServiceClient: () => ({
    from: mockFrom,
  }),
}))

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
  Object.defineProperty(chain, "then", {
    get: () => (resolve: (v: unknown) => void) =>
      resolve({ data: finalData, error: finalError }),
  })
  return chain
}

import { extractAndStoreNextSteps } from "../next-steps-service"

/** Wire mockFrom: first call = existing-step dedup query, rest = insert. */
function mockExistingThenInsert(existing: unknown[], inserted: unknown[]) {
  const existingChain = buildQueryChain(existing)
  const insertChain = buildQueryChain(inserted)
  let callCount = 0
  mockFrom.mockImplementation(() => {
    callCount++
    return callCount === 1 ? existingChain : insertChain
  })
}

function row(id: string, description: string, priority: string) {
  return {
    id,
    user_id: "u1",
    description,
    priority,
    completed: false,
    dismissed: false,
    created_at: "2026-03-08",
    updated_at: "2026-03-08",
  }
}

describe("Next Steps extraction — heading robustness (AI-6489)", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("extracts from a 'Next Actions:' heading without the literal '3'", async () => {
    const responseText = `Here's the plan.

Next Actions:
1. Interview three target users this week
2. Rewrite your one-line problem statement
3. Draft a landing page to test demand`

    mockExistingThenInsert(
      [],
      [
        row("1", "Interview three target users this week", "critical"),
        row("2", "Rewrite your one-line problem statement", "important"),
        row("3", "Draft a landing page to test demand", "optional"),
      ]
    )

    const result = await extractAndStoreNextSteps("u1", responseText, null)
    expect(result).toHaveLength(3)
  })

  it("extracts from a markdown '## Next Steps' heading", async () => {
    const responseText = `## Next Steps
1. Talk to 3 potential users
2. Refine your problem statement`

    mockExistingThenInsert(
      [],
      [
        row("1", "Talk to 3 potential users", "critical"),
        row("2", "Refine your problem statement", "important"),
      ]
    )

    const result = await extractAndStoreNextSteps("u1", responseText, null)
    expect(result).toHaveLength(2)
  })

  it("extracts from a 'Your Next Steps' heading without a colon", async () => {
    const responseText = `Your Next Steps
1. Lock in your ICP
2. Ship a smoke test`

    mockExistingThenInsert(
      [],
      [row("1", "Lock in your ICP", "critical"), row("2", "Ship a smoke test", "important")]
    )

    const result = await extractAndStoreNextSteps("u1", responseText, null)
    expect(result).toHaveLength(2)
  })

  it("captures a two-action session ('two or three' per Fred's spec)", async () => {
    const responseText = `**Next 2 Actions:**
1. Call five prospects and book three discovery chats
2. Update slide 4 of the deck with the new numbers`

    mockExistingThenInsert(
      [],
      [
        row("1", "Call five prospects and book three discovery chats", "critical"),
        row("2", "Update slide 4 of the deck with the new numbers", "important"),
      ]
    )

    const result = await extractAndStoreNextSteps("u1", responseText, null)
    expect(result).toHaveLength(2)
    expect(result[0].priority).toBe("critical")
    expect(result[1].priority).toBe("important")
  })

  it("still extracts the canonical '**Next 3 Actions:**' heading (no regression)", async () => {
    const responseText = `**Next 3 Actions:**
1. Action one
2. Action two
3. Action three`

    mockExistingThenInsert(
      [],
      [
        row("1", "Action one", "critical"),
        row("2", "Action two", "important"),
        row("3", "Action three", "optional"),
      ]
    )

    const result = await extractAndStoreNextSteps("u1", responseText, null)
    expect(result).toHaveLength(3)
  })

  it("does not match a conversational 'next steps' inside a sentence", async () => {
    const responseText =
      "Let's talk about your next steps in the journey once you've validated demand."
    const result = await extractAndStoreNextSteps("u1", responseText, null)
    expect(result).toHaveLength(0)
  })

  it("does not match when there is no actions/steps heading at all", async () => {
    const responseText = "Here's some general advice about your startup and market."
    const result = await extractAndStoreNextSteps("u1", responseText, null)
    expect(result).toHaveLength(0)
  })
})
