/**
 * Prompt Regression Tests — Phase 34-03
 *
 * Validates the system prompt against the Operating Bible, builder
 * functions, coaching overlays, and step guidance.
 */

import { describe, it, expect } from "vitest";
import {
  FRED_CAREY_SYSTEM_PROMPT,
  COACHING_PROMPTS,
  buildSystemPrompt,
  getPromptForTopic,
  getFredGreeting,
  buildTopicPrompt,
  buildStepGuidanceBlock,
} from "@/lib/ai/prompts";
import type { StartupStep } from "@/lib/ai/frameworks/startup-process";

// ============================================================================
// Group 1: Operating Bible Principles (Section 20 — all 11)
// ============================================================================

describe("FRED_CAREY_SYSTEM_PROMPT — Operating Bible Principles", () => {
  it("contains Principle 1: Reframe before prescribe", () => {
    expect(FRED_CAREY_SYSTEM_PROMPT).toContain("Reframe before prescribe");
    expect(FRED_CAREY_SYSTEM_PROMPT).toContain("Never answer the surface question");
  });

  it("contains Principle 2: Startup Reality Lens (all 5 dimensions)", () => {
    expect(FRED_CAREY_SYSTEM_PROMPT).toContain("Feasibility");
    expect(FRED_CAREY_SYSTEM_PROMPT).toContain("Economics");
    expect(FRED_CAREY_SYSTEM_PROMPT).toContain("Demand");
    expect(FRED_CAREY_SYSTEM_PROMPT).toContain("Distribution");
    expect(FRED_CAREY_SYSTEM_PROMPT).toContain("Timing");
  });

  it("contains Principle 3: Decision Sequencing Rule", () => {
    expect(FRED_CAREY_SYSTEM_PROMPT).toContain("Never optimize downstream artifacts");
  });

  it("contains Principle 4: Evidence > Narrative", () => {
    expect(FRED_CAREY_SYSTEM_PROMPT).toContain("Narrative is earned by proof");
  });

  it("contains Principle 5: Capital is a tool", () => {
    expect(FRED_CAREY_SYSTEM_PROMPT).toContain("Do not encourage fundraising by default");
  });

  it("contains Principle 6: Encourage without flattery", () => {
    expect(FRED_CAREY_SYSTEM_PROMPT).toMatch(/[Nn]o.*"great idea" language/);
  });

  it("contains Principle 7: Diagnose silently", () => {
    expect(FRED_CAREY_SYSTEM_PROMPT.toLowerCase()).toContain("diagnose silently");
  });

  it("contains Principle 8: Intake before scoring", () => {
    expect(FRED_CAREY_SYSTEM_PROMPT).toContain("Never score");
    expect(FRED_CAREY_SYSTEM_PROMPT).toContain("gathering sufficient data");
  });

  it("contains Principle 9: Decks are optional", () => {
    expect(FRED_CAREY_SYSTEM_PROMPT).toContain("Do not ask for a pitch deck by default");
  });

  it("contains Principle 10: Weekly check-ins", () => {
    expect(FRED_CAREY_SYSTEM_PROMPT).toContain("Invite weekly check-ins only when");
  });

  it("contains Principle 11: Founder wellbeing", () => {
    expect(FRED_CAREY_SYSTEM_PROMPT).toContain("normalize");
    expect(FRED_CAREY_SYSTEM_PROMPT).toContain("practical");
  });

  it("contains the 'Not an agent' declaration", () => {
    expect(FRED_CAREY_SYSTEM_PROMPT).toMatch(/NOT an agent/i);
  });
});

// ============================================================================
// Group 2: Regression Triggers (Operating Bible Section 17.3)
// ============================================================================

describe("FRED_CAREY_SYSTEM_PROMPT — Regression Triggers", () => {
  it("never asks founders to choose diagnostics", () => {
    expect(FRED_CAREY_SYSTEM_PROMPT.toLowerCase()).toContain("diagnose silently");
    expect(FRED_CAREY_SYSTEM_PROMPT).toContain("Founders do not choose diagnostics");
  });

  it("never scores without intake", () => {
    expect(FRED_CAREY_SYSTEM_PROMPT).toContain("Never score");
  });

  it("never encourages fundraising by default", () => {
    expect(FRED_CAREY_SYSTEM_PROMPT).toContain("Do not encourage fundraising by default");
  });

  it("never jumps to downstream artifacts", () => {
    expect(FRED_CAREY_SYSTEM_PROMPT).toContain("Never optimize downstream artifacts");
  });
});

// ============================================================================
// Group 3: Universal Entry Flow (Operating Bible Section 5)
// ============================================================================

describe("FRED_CAREY_SYSTEM_PROMPT — Universal Entry Flow", () => {
  it("contains 'What are you building?'", () => {
    expect(FRED_CAREY_SYSTEM_PROMPT).toContain("What are you building?");
  });

  it("contains 'Who is it for?'", () => {
    expect(FRED_CAREY_SYSTEM_PROMPT).toContain("Who is it for?");
  });

  it("contains 'What are you trying to accomplish right now?'", () => {
    expect(FRED_CAREY_SYSTEM_PROMPT).toContain("What are you trying to accomplish right now?");
  });

  it("contains 'Do NOT mention' instruction", () => {
    expect(FRED_CAREY_SYSTEM_PROMPT).toContain("Do NOT mention");
  });

  it("contains Silent Diagnosis section", () => {
    expect(FRED_CAREY_SYSTEM_PROMPT).toContain("Silent Diagnosis");
  });
});

// ============================================================================
// Group 4: buildSystemPrompt function
// ============================================================================

describe("buildSystemPrompt", () => {
  it("removes the {{FOUNDER_CONTEXT}} placeholder when context is empty", () => {
    const result = buildSystemPrompt("");
    expect(result).not.toContain("{{FOUNDER_CONTEXT}}");
  });

  it("does not leave the literal placeholder string in the output", () => {
    const result = buildSystemPrompt("");
    expect(result).not.toContain("{{");
    expect(result).not.toContain("}}");
  });

  it("replaces placeholder with actual context", () => {
    const context = "## FOUNDER SNAPSHOT\n**Stage:** Seed";
    const result = buildSystemPrompt(context);
    expect(result).toContain("**Stage:** Seed");
  });

  it("includes the context exactly as provided", () => {
    const context = "## FOUNDER SNAPSHOT\n**Stage:** Seed\n**Industry:** SaaS";
    const result = buildSystemPrompt(context);
    expect(result).toContain(context);
    expect(result).not.toContain("{{FOUNDER_CONTEXT}}");
  });
});

// ============================================================================
// Group 5: getPromptForTopic function
// ============================================================================

describe("getPromptForTopic", () => {
  it("fundraising topic contains Investor Lens", () => {
    expect(getPromptForTopic("fundraising")).toContain("Investor Lens");
  });

  it("positioning topic contains Positioning Readiness", () => {
    expect(getPromptForTopic("positioning")).toContain("Positioning Readiness");
  });

  it("strategy topic contains 9-Step Startup Process", () => {
    expect(getPromptForTopic("strategy")).toContain("9-Step Startup Process");
  });

  it("no topic prompt contains literal {{FOUNDER_CONTEXT}}", () => {
    const topics = Object.keys(COACHING_PROMPTS) as Array<keyof typeof COACHING_PROMPTS>;
    for (const topic of topics) {
      const prompt = getPromptForTopic(topic);
      expect(prompt).not.toContain("{{FOUNDER_CONTEXT}}");
    }
  });
});

// ============================================================================
// Group 6: getFredGreeting function
// ============================================================================

describe("getFredGreeting", () => {
  it("returns a non-empty string", () => {
    const greeting = getFredGreeting();
    expect(typeof greeting).toBe("string");
    expect(greeting.length).toBeGreaterThan(0);
  });

  it("includes at least one canonical greeting phrase", () => {
    const greeting = getFredGreeting();
    const hasCanonical =
      greeting.includes("What are you building") ||
      greeting.includes("what's the real bottleneck") ||
      greeting.includes("If we fixed one thing");
    expect(hasCanonical).toBe(true);
  });

  it("includes startup name when context is provided", () => {
    const greeting = getFredGreeting({ name: "TestCo", stage: "seed" });
    expect(greeting).toContain("TestCo");
  });
});

// ============================================================================
// Group 7: buildTopicPrompt function
// ============================================================================

describe("buildTopicPrompt", () => {
  it("works with empty context and does not contain placeholder", () => {
    const result = buildTopicPrompt("fundraising", "");
    expect(result).not.toContain("{{FOUNDER_CONTEXT}}");
    expect(result).toContain("Investor Lens");
  });

  it("includes both overlay and context when both provided", () => {
    const result = buildTopicPrompt("mindset", "## SNAPSHOT\nStage: Idea");
    expect(result).toContain("Mindset");
    expect(result).toContain("Stage: Idea");
  });
});

// ============================================================================
// Group 8: Coaching overlays completeness
// ============================================================================

describe("COACHING_PROMPTS — overlay completeness", () => {
  it("has all required topic keys", () => {
    const requiredKeys = ["fundraising", "pitchReview", "strategy", "positioning", "mindset"];
    for (const key of requiredKeys) {
      expect(COACHING_PROMPTS).toHaveProperty(key);
    }
  });

  it("each overlay contains its framework reference or 'Next 3'", () => {
    const frameworkNames: Record<string, string> = {
      fundraising: "Investor Lens",
      pitchReview: "Deck Review Protocol",
      strategy: "9-Step Startup Process",
      positioning: "Positioning Readiness",
      mindset: "Mindset",
    };

    for (const [key, name] of Object.entries(frameworkNames)) {
      const overlay = COACHING_PROMPTS[key as keyof typeof COACHING_PROMPTS];
      const hasRef = overlay.includes(name) || overlay.includes("Next 3");
      expect(hasRef).toBe(true);
    }
  });
});

// ============================================================================
// Group 9: buildStepGuidanceBlock function
// ============================================================================

describe("buildStepGuidanceBlock", () => {
  const emptyStatuses = {
    problem: "not_started",
    buyer: "not_started",
    "founder-edge": "not_started",
    solution: "not_started",
    validation: "not_started",
    gtm: "not_started",
    execution: "not_started",
    pilot: "not_started",
    "scale-decision": "not_started",
  } as Record<StartupStep, string>;

  it("returns empty string for an invalid step", () => {
    const result = buildStepGuidanceBlock(
      "nonexistent-step" as StartupStep,
      emptyStatuses,
      []
    );
    expect(result).toBe("");
  });

  it("returns CURRENT PROCESS POSITION for a valid step", () => {
    const result = buildStepGuidanceBlock("problem", emptyStatuses, []);
    expect(result).toContain("CURRENT PROCESS POSITION");
  });

  it("includes 'Do NOT advance' for a valid step", () => {
    const result = buildStepGuidanceBlock("problem", emptyStatuses, []);
    expect(result).toContain("Do NOT advance");
  });

  it("includes validated steps when provided", () => {
    const statuses = {
      ...emptyStatuses,
      problem: "validated",
      buyer: "validated",
    };
    const result = buildStepGuidanceBlock("founder-edge", statuses, []);
    expect(result).toContain("Steps already validated");
    expect(result).toContain("problem");
    expect(result).toContain("buyer");
  });

  it("includes active blockers when provided", () => {
    const result = buildStepGuidanceBlock("problem", emptyStatuses, [
      "No customer interviews completed",
    ]);
    expect(result).toContain("Active blockers");
    expect(result).toContain("No customer interviews completed");
  });
});
