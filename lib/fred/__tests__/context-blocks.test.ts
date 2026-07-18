import { describe, expect, it } from "vitest";
import { compactFredContextBlocks } from "../context-blocks";

describe("Fred context compaction", () => {
  it("keeps wellbeing and loop-breaker guardrails when large context must be dropped", () => {
    const result = compactFredContextBlocks([
      { name: "loopBreakerBlock", value: "WRAP UP MODE: give concrete action items.", priority: 100 },
      { name: "stageRedirectBlock", value: "STAGE REDIRECT: return to validated foundation.", priority: 95 },
      { name: "wellbeingBlock", value: "WELLBEING INTERVENTION: encourage professional support for serious risk signals.", priority: 90 },
      { name: "founderContext", value: "founder profile ".repeat(4_000), priority: 80 },
      { name: "pageContextBlock", value: "page navigation hint ".repeat(4_000), priority: 30 },
    ], 80);

    expect(result.context).toContain("WRAP UP MODE");
    expect(result.context).toContain("WELLBEING INTERVENTION");
    expect(result.context).toContain("STAGE REDIRECT");
    expect(result.context).not.toContain("page navigation hint");
    expect(result.droppedBlocks).toContain("pageContextBlock");
  });

  it("preserves the original reading order for retained blocks", () => {
    const result = compactFredContextBlocks([
      { name: "loopBreakerBlock", value: "first", priority: 100 },
      { name: "wellbeingBlock", value: "second", priority: 90 },
      { name: "stageAwareBlock", value: "third", priority: 85 },
    ]);

    expect(result.context).toBe("first\n\nsecond\n\nthird");
    expect(result.droppedBlocks).toEqual([]);
  });
});
