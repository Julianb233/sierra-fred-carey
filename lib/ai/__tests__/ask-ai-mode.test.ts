import { describe, expect, it } from "vitest";
import { buildAskAiDirectAnswerBlock } from "../ask-ai-mode";

describe("buildAskAiDirectAnswerBlock", () => {
  it("keeps full mentoring mode unchanged", () => {
    expect(buildAskAiDirectAnswerBlock("mentor")).toBe("");
  });

  it("requires a direct answer without onboarding or follow-up questions", () => {
    const block = buildAskAiDirectAnswerBlock("ask-ai");

    expect(block).toContain("Answer only the question");
    expect(block).toContain("Do not introduce yourself or restart onboarding");
    expect(block).toContain("Do not turn the answer into a mentor interview");
    expect(block).toContain("End after the answer");
  });
});
