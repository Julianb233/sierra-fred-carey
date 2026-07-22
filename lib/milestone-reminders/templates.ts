/**
 * Milestone Reminder Message Templates
 * AI-7368
 *
 * Pure functions — no I/O — so they're trivially unit-testable.
 */

import type { ReminderMilestone } from "./types";

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
  "https://app.sahar.ai";

/** Deep link into the Journey dashboard where milestones live. */
export const MILESTONE_LINK = "/dashboard/journey";

function firstName(name: string): string {
  const n = (name || "").trim();
  if (!n) return "Founder";
  return n.split(/\s+/)[0];
}

/**
 * Order milestones so the most urgent (overdue, then soonest target date)
 * come first, and return at most `max`.
 */
export function prioritizeMilestones(
  milestones: ReminderMilestone[],
  max = 3
): ReminderMilestone[] {
  return [...milestones]
    .sort((a, b) => {
      if (a.urgency !== b.urgency) return a.urgency === "overdue" ? -1 : 1;
      const ad = a.targetDate ? Date.parse(a.targetDate) : Number.MAX_SAFE_INTEGER;
      const bd = b.targetDate ? Date.parse(b.targetDate) : Number.MAX_SAFE_INTEGER;
      return ad - bd;
    })
    .slice(0, max);
}

function summarize(milestones: ReminderMilestone[]): {
  overdue: number;
  dueSoon: number;
  top: ReminderMilestone[];
} {
  const overdue = milestones.filter((m) => m.urgency === "overdue").length;
  const dueSoon = milestones.filter((m) => m.urgency === "due_soon").length;
  return { overdue, dueSoon, top: prioritizeMilestones(milestones) };
}

/**
 * Build the SMS body. SMS is deliberately short (paid founders, cost-aware).
 */
export function buildMilestoneSMS(
  name: string,
  milestones: ReminderMilestone[]
): string {
  const { overdue, top } = summarize(milestones);
  const titles = top.map((m) => `• ${m.title}`).join("\n");
  const total = milestones.length;
  const lead =
    overdue > 0
      ? `${overdue} milestone${overdue === 1 ? "" : "s"} overdue`
      : `${total} milestone${total === 1 ? "" : "s"} coming up`;

  return (
    `Hey ${firstName(name)} 👋 Friday milestone check-in from Sahara.\n` +
    `${lead}:\n${titles}\n` +
    `Keep the momentum — review your journey: ${APP_URL}${MILESTONE_LINK}\n` +
    `Reply STOP to opt out.`
  );
}

/** Build the in-app notification title + body (the cheaper fallback channel). */
export function buildMilestoneInApp(
  name: string,
  milestones: ReminderMilestone[]
): { title: string; body: string } {
  const { overdue, dueSoon, top } = summarize(milestones);

  const title =
    overdue > 0
      ? `${overdue} milestone${overdue === 1 ? "" : "s"} need attention`
      : `Weekly milestone check-in`;

  const parts: string[] = [];
  if (overdue > 0) parts.push(`${overdue} overdue`);
  if (dueSoon > 0) parts.push(`${dueSoon} due soon`);
  const counts = parts.join(", ");

  const titles = top.map((m) => m.title).join(", ");
  const body =
    `${firstName(name)}, here's your Friday progress nudge` +
    (counts ? ` — ${counts}` : "") +
    `. Focus milestones: ${titles}.`;

  return { title, body };
}
