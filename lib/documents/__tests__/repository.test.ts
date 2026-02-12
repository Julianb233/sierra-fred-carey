/**
 * Document Repository Service Tests
 * Phase 44: Document Repository
 *
 * Tests for the suggestFolder auto-categorization logic.
 *
 * @vitest-environment node
 */

import { describe, it, expect } from "vitest";
import { suggestFolder } from "@/lib/documents/repository";

describe("suggestFolder", () => {
  it('should detect pitch deck files as "decks"', () => {
    expect(suggestFolder("Pitch Deck v2.pdf")).toBe("decks");
    expect(suggestFolder("investor-deck-final.pptx")).toBe("decks");
    expect(suggestFolder("my_pitch_deck.pdf")).toBe("decks");
    expect(suggestFolder("Presentation.pptx")).toBe("decks");
    expect(suggestFolder("slide_deck.key")).toBe("decks");
  });

  it('should detect strategy files as "strategy"', () => {
    expect(suggestFolder("GTM Strategy.docx")).toBe("strategy");
    expect(suggestFolder("go-to-market-plan.pdf")).toBe("strategy");
    expect(suggestFolder("competitive analysis Q1.pdf")).toBe("strategy");
    expect(suggestFolder("market analysis.docx")).toBe("strategy");
    expect(suggestFolder("Business Plan 2026.pdf")).toBe("strategy");
  });

  it('should detect report files as "reports"', () => {
    expect(suggestFolder("Q1 Financial Report.pdf")).toBe("reports");
    expect(suggestFolder("financial model v3.xlsx")).toBe("reports");
    expect(suggestFolder("Investor Memo.docx")).toBe("reports");
    expect(suggestFolder("metrics summary.pdf")).toBe("reports");
    expect(suggestFolder("analytics report.pdf")).toBe("reports");
  });

  it('should fall back to "uploads" for unrecognized files', () => {
    expect(suggestFolder("photo.png")).toBe("uploads");
    expect(suggestFolder("notes.txt")).toBe("uploads");
    expect(suggestFolder("random-file.csv")).toBe("uploads");
    expect(suggestFolder("contract.pdf")).toBe("uploads");
  });

  it("should consider file type in detection", () => {
    expect(
      suggestFolder(
        "slides.pptx",
        "application/vnd.openxmlformats-officedocument.presentationml.presentation"
      )
    ).toBe("decks");
  });
});
