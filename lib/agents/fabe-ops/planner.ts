/**
 * Fabe Ops planning primitives.
 *
 * These helpers intentionally produce drafts and operating plans only. They do
 * not send emails, create calendar events, write spreadsheets, buy anything, or
 * trigger outreach.
 */

export const FABE_OPS_MODE = "draft_only" as const;

export const FABE_OPS_GUARDRAILS = [
  "No email, text, calendar, CRM, purchase, or outreach action is executed.",
  "Every external-facing item is returned as a draft for human review.",
  "Calendar recommendations are proposed time blocks, not confirmed meetings.",
  "Purchases, errands, and personal services are converted into review checklists.",
] as const;

type Priority = "critical" | "high" | "medium" | "low";

export interface InboxMessageInput {
  from: string;
  subject: string;
  body?: string;
  receivedAt?: string;
}

export interface CommitmentInput {
  item: string;
  owner?: string;
  dueDate?: string;
  source?: string;
}

export interface WorkstreamInput {
  name: string;
  owner?: string;
  outcome?: string;
}

export interface CalendarEventInput {
  title: string;
  eventType: "deep_work" | "meeting" | "follow_up" | "admin" | "personal";
  durationMinutes?: number;
  preferredWindow?: string;
}

export interface OutreachTargetInput {
  name: string;
  relationship?: string;
  goal: string;
  context?: string;
}

export function triageInbox(messages: InboxMessageInput[]) {
  return {
    mode: FABE_OPS_MODE,
    guardrails: FABE_OPS_GUARDRAILS,
    summary: `${messages.length} message${messages.length === 1 ? "" : "s"} triaged for review.`,
    items: messages.map((message) => {
      const text = `${message.subject} ${message.body ?? ""}`.toLowerCase();
      const priority: Priority =
        /urgent|asap|today|deadline|investor|contract|legal|payment/.test(text)
          ? "high"
          : /follow|reply|respond|question|confirm/.test(text)
            ? "medium"
            : "low";

      const category =
        priority === "high"
          ? "review_today"
          : /calendar|meeting|schedule|time/.test(text)
            ? "calendar_review"
            : /invoice|payment|contract|legal/.test(text)
              ? "ops_review"
              : "batch_later";

      return {
        from: message.from,
        subject: message.subject,
        receivedAt: message.receivedAt ?? null,
        priority,
        category,
        draftNextAction: buildDraftNextAction(category),
        requiresHumanReview: true,
      };
    }),
  };
}

export function buildFollowUpPlan(commitments: CommitmentInput[]) {
  return {
    mode: FABE_OPS_MODE,
    guardrails: FABE_OPS_GUARDRAILS,
    followUps: commitments.map((commitment, index) => ({
      id: `follow-up-${index + 1}`,
      item: commitment.item,
      owner: commitment.owner ?? "Fred/Fabe",
      dueDate: commitment.dueDate ?? "confirm",
      source: commitment.source ?? "manual entry",
      status: "draft",
      nextStep: "Prepare a concise follow-up draft and confirm owner/timing before sending.",
      requiresHumanReview: true,
    })),
  };
}

export function buildTrackerTemplate(workstreams: WorkstreamInput[]) {
  return {
    mode: FABE_OPS_MODE,
    guardrails: FABE_OPS_GUARDRAILS,
    columns: [
      "Workstream",
      "Owner",
      "Outcome",
      "Next Step",
      "Due Date",
      "Priority",
      "Status",
      "Last Touched",
      "Review Notes",
    ],
    rows: workstreams.map((stream) => ({
      workstream: stream.name,
      owner: stream.owner ?? "unassigned",
      outcome: stream.outcome ?? "define outcome",
      nextStep: "confirm next concrete action",
      dueDate: "confirm",
      priority: "medium" as Priority,
      status: "draft",
      lastTouched: null,
      reviewNotes: "Ready to copy into Sheets after human review.",
    })),
  };
}

export function buildCalendarBlocks(events: CalendarEventInput[]) {
  return {
    mode: FABE_OPS_MODE,
    guardrails: FABE_OPS_GUARDRAILS,
    blocks: events.map((event) => ({
      title: event.title,
      eventType: event.eventType,
      durationMinutes: event.durationMinutes ?? defaultDuration(event.eventType),
      preferredWindow: event.preferredWindow ?? defaultWindow(event.eventType),
      status: "proposed",
      calendarAction: "review_then_create",
      requiresHumanApproval: true,
    })),
  };
}

export function buildOutreachPlan(targets: OutreachTargetInput[]) {
  return {
    mode: FABE_OPS_MODE,
    guardrails: FABE_OPS_GUARDRAILS,
    targets: targets.map((target) => ({
      name: target.name,
      relationship: target.relationship ?? "unknown",
      goal: target.goal,
      context: target.context ?? "",
      sequence: [
        "Draft a short personal opener.",
        "Draft the direct ask or next step.",
        "Prepare one value-add follow-up.",
        "Queue for human approval before any send.",
      ],
      status: "draft",
      requiresHumanReview: true,
    })),
  };
}

export function buildPersonalSupportChecklist(request: string) {
  return {
    mode: FABE_OPS_MODE,
    guardrails: FABE_OPS_GUARDRAILS,
    request,
    checklist: [
      "Clarify whether this is a real errand or shorthand for overload.",
      "List options without booking, buying, or submitting payment.",
      "Confirm budget, timing, and recipient before any external action.",
      "Hand off the final action to a human.",
    ],
    status: "human_review_required",
  };
}

function buildDraftNextAction(category: string) {
  switch (category) {
    case "review_today":
      return "Draft reply today and flag for Fred/Fabe approval.";
    case "calendar_review":
      return "Propose time blocks; do not schedule until approved.";
    case "ops_review":
      return "Extract obligation, amount/date if present, and route for human review.";
    default:
      return "Batch into the next inbox review with a suggested response.";
  }
}

function defaultDuration(eventType: CalendarEventInput["eventType"]) {
  if (eventType === "deep_work") return 90;
  if (eventType === "meeting") return 45;
  if (eventType === "follow_up") return 30;
  return 20;
}

function defaultWindow(eventType: CalendarEventInput["eventType"]) {
  if (eventType === "deep_work") return "morning focus block";
  if (eventType === "follow_up") return "end-of-day follow-up block";
  if (eventType === "personal") return "human-confirmed personal window";
  return "next available reviewed slot";
}
