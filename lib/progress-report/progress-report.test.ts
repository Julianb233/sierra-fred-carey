/**
 * Founder Progress Report unit tests (AI-7489)
 *
 * Covers the pure-logic layer that the live /api/progress-report routes and the
 * weekly cron depend on, with no network/LLM/DB:
 *   - parseProgressPayload: robust extraction from Claude output (fences, prose,
 *     stray text) + shape validation that protects the DB write path
 *   - renderProgressReportHtml / renderProgressReportText: deterministic
 *     rendering used by both /progress-report/[id] and the Resend email
 *   - TIER_PRICE_CENTS: pricing that drives the recommended-tier upsell
 */

import { describe, it, expect } from "vitest";
import { parseProgressPayload } from "./prompt";
import {
  renderProgressReportHtml,
  renderProgressReportText,
} from "./renderer";
import {
  TIER_PRICE_CENTS,
  type FounderProgressSnapshot,
  type ProgressReportPayload,
} from "./types";

const SNAPSHOT: FounderProgressSnapshot = {
  founderName: "Dana",
  companyName: "Acme AI",
  currentStage: "validation",
  currentStageName: "Validation",
  overallPercentage: 47,
  stepsCompleted: 7,
  stepsTotal: 14,
  stages: [
    { id: "clarity", name: "Clarity", status: "completed", stepsCompleted: 3, stepsTotal: 3 },
    { id: "validation", name: "Validation", status: "current", stepsCompleted: 1, stepsTotal: 3 },
    { id: "build", name: "Build", status: "locked", stepsCompleted: 0, stepsTotal: 3 },
    { id: "launch", name: "Launch", status: "locked", stepsCompleted: 0, stepsTotal: 3 },
    { id: "grow", name: "Grow", status: "locked", stepsCompleted: 0, stepsTotal: 2 },
  ],
  programSteps: [
    { number: 1, name: "Complete your founder profile", stage: "clarity", completed: true },
    { number: 2, name: "Complete your Reality Lens assessment", stage: "clarity", completed: true },
  ],
  startupProcess: {
    currentStep: 3,
    completedSteps: 2,
    totalSteps: 9,
    stepNames: [
      { number: 1, name: "Define the Real Problem", completed: true },
      { number: 2, name: "Identify the Buyer and Environment", completed: true },
      { number: 3, name: "Establish Founder Edge", completed: false },
    ],
  },
  milestones: {
    completed: 2,
    inProgress: 1,
    pending: 3,
    total: 6,
    recent: [
      { title: "Landing page live", category: "product", status: "completed", completedAt: "2026-06-20T00:00:00Z" },
    ],
  },
  latestScore: 64,
  priorScore: 55,
  recentEvents: [
    { eventType: "score_improved", createdAt: "2026-06-22T10:00:00Z", scoreAfter: 64 },
  ],
  activeDays: 4,
  periodStart: "2026-06-18T00:00:00Z",
  periodEnd: "2026-06-25T00:00:00Z",
};

const PAYLOAD: ProgressReportPayload = {
  overallPercentage: 47,
  headline: "Strong momentum into Validation",
  subline: "7 of 14 program steps complete — 3 new this week.",
  executiveSummary:
    "Dana, you cleared Clarity and you're moving through Validation with real activity this week.",
  sections: [
    { title: "Validation", status: "on_track", body: "You ran 5 coaching sessions.\n\nKeep pushing on positioning." },
    { title: "Clarity", status: "ahead", body: "Fully complete — strong foundation." },
  ],
  nextActions: ["Define your market positioning", "Review the competitive landscape"],
  recommendedTier: "validate",
  upgradePitch: "Sahara Validate unlocks the positioning and competitor tools you need next.",
};

describe("parseProgressPayload", () => {
  it("parses a clean JSON object", () => {
    const raw = JSON.stringify(PAYLOAD);
    const parsed = parseProgressPayload(raw);
    expect(parsed.headline).toBe(PAYLOAD.headline);
    expect(parsed.sections).toHaveLength(2);
    expect(parsed.recommendedTier).toBe("validate");
    expect(parsed.nextActions).toHaveLength(2);
  });

  it("extracts JSON wrapped in markdown fences and prose", () => {
    const raw = `Here is your report:\n\n\`\`\`json\n${JSON.stringify(PAYLOAD)}\n\`\`\`\nThanks!`;
    const parsed = parseProgressPayload(raw);
    expect(parsed.overallPercentage).toBe(47);
    expect(parsed.sections[0].title).toBe("Validation");
  });

  it("clamps an out-of-range percentage", () => {
    const parsed = parseProgressPayload(
      JSON.stringify({ ...PAYLOAD, overallPercentage: 250 })
    );
    expect(parsed.overallPercentage).toBe(100);
  });

  it("drops invalid sections and keeps valid ones", () => {
    const parsed = parseProgressPayload(
      JSON.stringify({
        ...PAYLOAD,
        sections: [
          { title: "Good", body: "Has both fields." },
          { title: "Missing body" },
          { body: "Missing title" },
        ],
      })
    );
    expect(parsed.sections).toHaveLength(1);
    expect(parsed.sections[0].title).toBe("Good");
  });

  it("falls back to 'clarity' tier on an invalid tier value", () => {
    const parsed = parseProgressPayload(
      JSON.stringify({ ...PAYLOAD, recommendedTier: "platinum" })
    );
    expect(parsed.recommendedTier).toBe("clarity");
  });

  it("throws (with rawOutput cause) when no JSON is present", () => {
    try {
      parseProgressPayload("the model said no");
      throw new Error("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(Error);
      const cause = (e as Error & { cause?: { rawOutput?: string } }).cause;
      expect(cause?.rawOutput).toBe("the model said no");
    }
  });

  it("throws when there are no valid sections", () => {
    expect(() =>
      parseProgressPayload(JSON.stringify({ ...PAYLOAD, sections: [] }))
    ).toThrow();
  });
});

describe("renderProgressReportHtml", () => {
  const html = renderProgressReportHtml(SNAPSHOT, PAYLOAD, {
    appUrl: "https://joinsahara.com",
    reportId: "rep-123",
  });

  it("produces a self-contained HTML document", () => {
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("<style>");
  });

  it("renders the headline, percentage, and progress bar", () => {
    expect(html).toContain("47%");
    expect(html).toContain("Strong momentum into Validation");
    expect(html).toContain("width:47%");
  });

  it("renders every stage card", () => {
    for (const s of SNAPSHOT.stages) {
      expect(html).toContain(s.name);
    }
  });

  it("links to the per-report page", () => {
    expect(html).toContain("https://joinsahara.com/progress-report/rep-123");
  });

  it("escapes user-provided content to prevent HTML injection", () => {
    const evil = renderProgressReportHtml(
      { ...SNAPSHOT, founderName: "<script>alert(1)</script>" },
      PAYLOAD,
      { reportId: "x" }
    );
    expect(evil).not.toContain("<script>alert(1)</script>");
    expect(evil).toContain("&lt;script&gt;");
  });
});

describe("renderProgressReportText", () => {
  const text = renderProgressReportText(SNAPSHOT, PAYLOAD);

  it("includes the headline and next moves", () => {
    expect(text).toContain("Strong momentum into Validation");
    expect(text).toContain("YOUR NEXT MOVES:");
    expect(text).toContain("Define your market positioning");
  });

  it("strips any HTML tags from section bodies", () => {
    const withTags = renderProgressReportText(SNAPSHOT, {
      ...PAYLOAD,
      sections: [{ title: "T", body: "Hello <b>world</b>" }],
    });
    expect(withTags).toContain("Hello world");
    expect(withTags).not.toContain("<b>");
  });
});

describe("TIER_PRICE_CENTS", () => {
  it("maps each tier to a positive price", () => {
    expect(TIER_PRICE_CENTS.clarity).toBeGreaterThan(0);
    expect(TIER_PRICE_CENTS.validate).toBeGreaterThan(TIER_PRICE_CENTS.clarity);
    expect(TIER_PRICE_CENTS.accelerator).toBeGreaterThan(TIER_PRICE_CENTS.validate);
  });
});
