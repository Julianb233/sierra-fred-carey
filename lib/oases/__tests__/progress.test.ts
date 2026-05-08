import { describe, expect, it } from "vitest"
import { computeJourneyPercentage, resolveJourneyPercentage } from "../progress"

describe("Oases progress calculation", () => {
  it("calculates checklist completion from completed and total steps", () => {
    expect(computeJourneyPercentage(19, 19)).toBe(100)
    expect(computeJourneyPercentage(0, 0)).toBe(0)
  })

  it("does not let detailed journey progress under-report a completed checklist", () => {
    expect(resolveJourneyPercentage(100, 75)).toBe(100)
  })

  it("keeps a higher granular journey score when it is ahead of the checklist", () => {
    expect(resolveJourneyPercentage(80, 95)).toBe(95)
  })
})
