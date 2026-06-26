/**
 * Founder Progress Report PDF unit tests (AI-7369)
 *
 * Verifies the downloadable-PDF builder produces a valid PDF buffer from the
 * same structured data persisted on founder_progress_reports, and that the
 * download filename is filesystem-safe. No network/LLM/DB.
 */

import { describe, it, expect } from "vitest";
import {
  renderProgressReportPdf,
  progressReportFilename,
} from "./pdf";
import type {
  FounderProgressSnapshot,
  ProgressReportPayload,
} from "./types";

function makeSnapshot(
  overrides: Partial<FounderProgressSnapshot> = {}
): FounderProgressSnapshot {
  return {
    founderName: "Ada Lovelace",
    companyName: "Analytical Engines",
    currentStage: "validation" as FounderProgressSnapshot["currentStage"],
    currentStageName: "Validation",
    overallPercentage: 47,
    stepsCompleted: 9,
    stepsTotal: 19,
    stages: [
      { id: "clarity" as never, name: "Clarity", status: "completed", stepsCompleted: 4, stepsTotal: 4 },
      { id: "validation" as never, name: "Validation", status: "current", stepsCompleted: 3, stepsTotal: 5 },
      { id: "traction" as never, name: "Traction", status: "locked", stepsCompleted: 0, stepsTotal: 5 },
    ],
    programSteps: [],
    startupProcess: null,
    milestones: { completed: 9, inProgress: 1, pending: 9, total: 19, recent: [] },
    latestScore: 72,
    priorScore: 58,
    recentEvents: [],
    activeDays: 5,
    periodStart: "2026-06-01T00:00:00.000Z",
    periodEnd: "2026-06-25T00:00:00.000Z",
    ...overrides,
  };
}

function makePayload(
  overrides: Partial<ProgressReportPayload> = {}
): ProgressReportPayload {
  return {
    overallPercentage: 47,
    headline: "Strong momentum through Validation.",
    subline: "9 of 19 program steps complete — 3 new this week.",
    executiveSummary:
      "You've moved fast this period.\n\nThe core problem is now well validated and you're closing in on a repeatable wedge.",
    sections: [
      { title: "Clarity", body: "Problem framing is tight.", status: "ahead" },
      { title: "Validation", body: "Interviews are landing.\n\nKeep pushing on pricing.", status: "on_track" },
    ],
    nextActions: ["Run 5 more interviews", "Draft a pricing page"],
    recommendedTier: "validate",
    upgradePitch: "Sahara Validate gets you a structured validation sprint.",
    ...overrides,
  };
}

describe("renderProgressReportPdf", () => {
  it("produces a non-empty PDF buffer with a valid PDF header", async () => {
    const buf = await renderProgressReportPdf(makeSnapshot(), makePayload(), {
      generatedAt: new Date("2026-06-25T12:00:00.000Z"),
    });
    expect(Buffer.isBuffer(buf)).toBe(true);
    expect(buf.length).toBeGreaterThan(1000);
    // Every PDF starts with the "%PDF-" magic bytes.
    expect(buf.subarray(0, 5).toString("latin1")).toBe("%PDF-");
  });

  it("handles empty sections and no next actions without throwing", async () => {
    const buf = await renderProgressReportPdf(
      makeSnapshot({ companyName: null }),
      makePayload({ sections: [], nextActions: [] }),
      { generatedAt: new Date("2026-06-25T12:00:00.000Z") }
    );
    expect(buf.subarray(0, 5).toString("latin1")).toBe("%PDF-");
  });

  it("clamps an out-of-range percentage without crashing", async () => {
    const buf = await renderProgressReportPdf(
      makeSnapshot(),
      makePayload({ overallPercentage: 250 }),
      { generatedAt: new Date("2026-06-25T12:00:00.000Z") }
    );
    expect(buf.subarray(0, 5).toString("latin1")).toBe("%PDF-");
  });
});

describe("progressReportFilename", () => {
  it("slugifies the founder name and stamps the date", () => {
    const name = progressReportFilename(
      { founderName: "Ada Lovelace!!" },
      new Date("2026-06-25T12:00:00.000Z")
    );
    expect(name).toBe("sahara-progress-report-ada-lovelace-2026-06-25.pdf");
  });

  it("falls back to 'founder' when the name is empty", () => {
    const name = progressReportFilename(
      { founderName: "" },
      new Date("2026-06-25T12:00:00.000Z")
    );
    expect(name).toBe("sahara-progress-report-founder-2026-06-25.pdf");
  });
});
