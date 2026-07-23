import { describe, expect, it } from "vitest";
import {
  buildCalendarBlocks,
  buildFollowUpPlan,
  buildOutreachPlan,
  buildPersonalSupportChecklist,
  triageInbox,
} from "../fabe-ops/planner";

describe("Fabe Ops draft-only planning", () => {
  it("triages inbox messages without executing email actions", () => {
    const result = triageInbox([
      {
        from: "Fred",
        subject: "Urgent investor follow-up today",
        body: "Need a response before the committee call.",
      },
    ]);

    expect(result.mode).toBe("draft_only");
    expect(result.items[0]).toMatchObject({
      priority: "high",
      category: "review_today",
      requiresHumanReview: true,
    });
    expect(JSON.stringify(result).toLowerCase()).not.toContain("sent");
  });

  it("marks calendar blocks as proposed and approval-gated", () => {
    const result = buildCalendarBlocks([
      { title: "Investor follow-up block", eventType: "follow_up" },
    ]);

    expect(result.blocks[0]).toMatchObject({
      status: "proposed",
      calendarAction: "review_then_create",
      requiresHumanApproval: true,
    });
  });

  it("creates follow-up and outreach drafts that require human review", () => {
    const followUps = buildFollowUpPlan([{ item: "Send deck to VC", owner: "Fred" }]);
    const outreach = buildOutreachPlan([
      { name: "Target investor", goal: "Secure intro call" },
    ]);

    expect(followUps.followUps[0].status).toBe("draft");
    expect(followUps.followUps[0].requiresHumanReview).toBe(true);
    expect(outreach.targets[0].sequence.at(-1)).toContain("human approval");
  });

  it("converts personal support requests into a human-only checklist", () => {
    const result = buildPersonalSupportChecklist("coffee and mani-pedis");

    expect(result.status).toBe("human_review_required");
    expect(result.checklist.join(" ")).toContain("without booking, buying, or submitting payment");
  });
});
