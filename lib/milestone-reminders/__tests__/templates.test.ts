/**
 * Tests for milestone reminder message templates (AI-7368)
 */
import { describe, it, expect } from "vitest";
import {
  prioritizeMilestones,
  buildMilestoneSMS,
  buildMilestoneInApp,
  MILESTONE_LINK,
} from "../templates";
import type { ReminderMilestone } from "../types";

const mk = (
  id: string,
  title: string,
  urgency: ReminderMilestone["urgency"],
  targetDate: string | null
): ReminderMilestone => ({
  id,
  userId: "u1",
  title,
  category: "product",
  status: "in_progress",
  targetDate,
  urgency,
});

describe("prioritizeMilestones", () => {
  it("puts overdue before due_soon", () => {
    const list = [
      mk("1", "Soon", "due_soon", "2026-07-25"),
      mk("2", "Late", "overdue", "2026-07-10"),
    ];
    const out = prioritizeMilestones(list);
    expect(out[0].id).toBe("2");
    expect(out[1].id).toBe("1");
  });

  it("orders by soonest target date within the same urgency", () => {
    const list = [
      mk("1", "Later", "due_soon", "2026-07-28"),
      mk("2", "Sooner", "due_soon", "2026-07-23"),
    ];
    const out = prioritizeMilestones(list);
    expect(out.map((m) => m.id)).toEqual(["2", "1"]);
  });

  it("caps the result at max (default 3)", () => {
    const list = Array.from({ length: 6 }, (_, i) =>
      mk(String(i), `M${i}`, "due_soon", "2026-07-25")
    );
    expect(prioritizeMilestones(list)).toHaveLength(3);
    expect(prioritizeMilestones(list, 2)).toHaveLength(2);
  });

  it("does not mutate the input array", () => {
    const list = [
      mk("1", "Soon", "due_soon", "2026-07-25"),
      mk("2", "Late", "overdue", "2026-07-10"),
    ];
    const before = list.map((m) => m.id);
    prioritizeMilestones(list);
    expect(list.map((m) => m.id)).toEqual(before);
  });
});

describe("buildMilestoneSMS", () => {
  it("leads with overdue count when there are overdue milestones", () => {
    const sms = buildMilestoneSMS("Jane Doe", [
      mk("1", "Ship MVP", "overdue", "2026-07-10"),
      mk("2", "Hire PM", "due_soon", "2026-07-25"),
    ]);
    expect(sms).toContain("Jane"); // first name only
    expect(sms).not.toContain("Jane Doe");
    expect(sms).toContain("1 milestone overdue");
    expect(sms).toContain("• Ship MVP");
    expect(sms).toContain(MILESTONE_LINK);
    expect(sms).toContain("STOP");
  });

  it("uses a coming-up lead when nothing is overdue", () => {
    const sms = buildMilestoneSMS("Sam", [
      mk("2", "Hire PM", "due_soon", "2026-07-25"),
    ]);
    expect(sms).toContain("1 milestone coming up");
  });

  it("falls back to 'Founder' when name is empty", () => {
    const sms = buildMilestoneSMS("", [mk("2", "X", "due_soon", "2026-07-25")]);
    expect(sms).toContain("Founder");
  });
});

describe("buildMilestoneInApp", () => {
  it("titles by overdue count when present", () => {
    const { title, body } = buildMilestoneInApp("Alex", [
      mk("1", "Ship", "overdue", "2026-07-10"),
      mk("2", "Hire", "overdue", "2026-07-09"),
      mk("3", "Raise", "due_soon", "2026-07-25"),
    ]);
    expect(title).toBe("2 milestones need attention");
    expect(body).toContain("2 overdue");
    expect(body).toContain("1 due soon");
    expect(body).toContain("Alex");
  });

  it("uses the weekly title when nothing is overdue", () => {
    const { title } = buildMilestoneInApp("Alex", [
      mk("3", "Raise", "due_soon", "2026-07-25"),
    ]);
    expect(title).toBe("Weekly milestone check-in");
  });
});
