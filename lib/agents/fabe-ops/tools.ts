import { tool } from "ai";
import { z } from "zod";
import {
  buildCalendarBlocks,
  buildFollowUpPlan,
  buildOutreachPlan,
  buildPersonalSupportChecklist,
  buildTrackerTemplate,
  triageInbox,
} from "./planner";

const inboxMessageSchema = z.object({
  from: z.string(),
  subject: z.string(),
  body: z.string().optional(),
  receivedAt: z.string().optional(),
});

const commitmentSchema = z.object({
  item: z.string(),
  owner: z.string().optional(),
  dueDate: z.string().optional(),
  source: z.string().optional(),
});

const workstreamSchema = z.object({
  name: z.string(),
  owner: z.string().optional(),
  outcome: z.string().optional(),
});

const calendarEventSchema = z.object({
  title: z.string(),
  eventType: z.enum(["deep_work", "meeting", "follow_up", "admin", "personal"]),
  durationMinutes: z.number().optional(),
  preferredWindow: z.string().optional(),
});

const outreachTargetSchema = z.object({
  name: z.string(),
  relationship: z.string().optional(),
  goal: z.string(),
  context: z.string().optional(),
});

const triageInboxTool = tool({
  description: "Draft-only email triage for Fabe. Categorizes messages and proposes next actions without sending anything.",
  inputSchema: z.object({ messages: z.array(inboxMessageSchema) }),
  execute: async ({ messages }) => triageInbox(messages),
});

const planFollowUpsTool = tool({
  description: "Draft-only follow-up tracker for commitments Fred or Fabe need to close.",
  inputSchema: z.object({ commitments: z.array(commitmentSchema) }),
  execute: async ({ commitments }) => buildFollowUpPlan(commitments),
});

const buildTrackerTool = tool({
  description: "Creates a spreadsheet-ready tracking template for workstreams, next steps, and reminders.",
  inputSchema: z.object({ workstreams: z.array(workstreamSchema) }),
  execute: async ({ workstreams }) => buildTrackerTemplate(workstreams),
});

const organizeCalendarTool = tool({
  description: "Draft-only calendar block recommendations. Does not create or confirm events.",
  inputSchema: z.object({ events: z.array(calendarEventSchema) }),
  execute: async ({ events }) => buildCalendarBlocks(events),
});

const draftOutreachTool = tool({
  description: "Draft-only outreach sequence planning for targets. Does not contact anyone.",
  inputSchema: z.object({ targets: z.array(outreachTargetSchema) }),
  execute: async ({ targets }) => buildOutreachPlan(targets),
});

const personalSupportTool = tool({
  description: "Turns personal-support or errand requests into a human-review checklist without booking or buying anything.",
  inputSchema: z.object({ request: z.string() }),
  execute: async ({ request }) => buildPersonalSupportChecklist(request),
});

export const fabeOpsTools = {
  triageInbox: triageInboxTool,
  planFollowUps: planFollowUpsTool,
  buildTracker: buildTrackerTool,
  organizeCalendar: organizeCalendarTool,
  draftOutreach: draftOutreachTool,
  personalSupport: personalSupportTool,
};
