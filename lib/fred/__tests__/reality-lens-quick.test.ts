/**
 * Unit tests for Quick Reality Lens -- mapScoreToStage
 *
 * Phase 81: Reality Lens First Interaction
 *
 * Tests the stage mapping logic with string-based customerValidation
 * and prototypeStage params (matching QuickAnswers field values).
 */

import { describe, it, expect } from "vitest"
import { mapScoreToStage, QUICK_QUESTIONS } from "../reality-lens-quick"

describe("mapScoreToStage", () => {
  // -----------------------------------------------------------------------
  // Clarity stage
  // -----------------------------------------------------------------------
  describe("clarity stage", () => {
    it("returns clarity for low score, no customers, idea-only", () => {
      expect(mapScoreToStage(15, "none", "idea-only")).toBe("clarity")
    })

    it("returns clarity for score 0", () => {
      expect(mapScoreToStage(0, "none", "idea-only")).toBe("clarity")
    })

    it("returns clarity for score 29 (boundary)", () => {
      expect(mapScoreToStage(29, "informal", "mockups")).toBe("clarity")
    })

    it("returns clarity for high score but no validation AND idea-only", () => {
      // score 90, none, idea-only -> clarity (validation override)
      expect(mapScoreToStage(90, "none", "idea-only")).toBe("clarity")
    })
  })

  // -----------------------------------------------------------------------
  // Validation stage
  // -----------------------------------------------------------------------
  describe("validation stage", () => {
    it("returns validation for score 45, informal, mockups", () => {
      expect(mapScoreToStage(45, "informal", "mockups")).toBe("validation")
    })

    it("returns validation for score 30 (lower boundary)", () => {
      expect(mapScoreToStage(30, "none", "mockups")).toBe("validation")
    })

    it("returns validation for score 59 (upper boundary)", () => {
      expect(mapScoreToStage(59, "interviews-10plus", "mvp")).toBe(
        "validation"
      )
    })

    it("returns validation for score 50, paying-customers, idea-only", () => {
      // Score range 30-59 wins regardless of validation level
      expect(mapScoreToStage(50, "paying-customers", "idea-only")).toBe(
        "validation"
      )
    })
  })

  // -----------------------------------------------------------------------
  // Build stage
  // -----------------------------------------------------------------------
  describe("build stage", () => {
    it("returns build for score 70, interviews, mvp", () => {
      expect(mapScoreToStage(70, "interviews-10plus", "mvp")).toBe("build")
    })

    it("returns build for score 60 with mvp", () => {
      expect(mapScoreToStage(60, "informal", "mvp")).toBe("build")
    })

    it("returns build for score 79 with launched", () => {
      expect(mapScoreToStage(79, "informal", "launched")).toBe("build")
    })

    it("returns build for score 80+ with mvp but not paying customers", () => {
      expect(mapScoreToStage(85, "interviews-10plus", "mvp")).toBe("build")
    })
  })

  // -----------------------------------------------------------------------
  // Launch stage
  // -----------------------------------------------------------------------
  describe("launch stage", () => {
    it("returns launch for score 85, paying-customers, launched", () => {
      expect(mapScoreToStage(85, "paying-customers", "launched")).toBe(
        "launch"
      )
    })

    it("returns launch for score 80 (boundary) with paying customers", () => {
      expect(mapScoreToStage(80, "paying-customers", "mvp")).toBe("launch")
    })

    it("returns launch for score 100 with paying customers", () => {
      expect(mapScoreToStage(100, "paying-customers", "launched")).toBe(
        "launch"
      )
    })
  })

  // -----------------------------------------------------------------------
  // Edge cases
  // -----------------------------------------------------------------------
  describe("edge cases", () => {
    it("never returns grow", () => {
      // Even the highest possible signals should not return grow
      expect(mapScoreToStage(100, "paying-customers", "launched")).not.toBe(
        "grow"
      )
    })

    it("score 60 with informal and no prototype returns validation", () => {
      expect(mapScoreToStage(60, "informal", "mockups")).toBe("validation")
    })

    it("score 65 with interviews-10plus and no prototype returns validation", () => {
      expect(mapScoreToStage(65, "interviews-10plus", "mockups")).toBe(
        "validation"
      )
    })
  })
})

describe("QUICK_QUESTIONS", () => {
  it("has exactly 6 questions", () => {
    expect(QUICK_QUESTIONS).toHaveLength(6)
  })

  it("has 3 text questions and 3 select questions", () => {
    const textQs = QUICK_QUESTIONS.filter((q) => q.type === "text")
    const selectQs = QUICK_QUESTIONS.filter((q) => q.type === "select")
    expect(textQs).toHaveLength(3)
    expect(selectQs).toHaveLength(3)
  })

  it("all select questions have options", () => {
    const selectQs = QUICK_QUESTIONS.filter((q) => q.type === "select")
    for (const q of selectQs) {
      expect(q.options).toBeDefined()
      expect(q.options!.length).toBeGreaterThan(0)
    }
  })
})
