/**
 * Founder Ops Agent Tools
 * Phase 04: Studio Tier Features - Plan 02
 *
 * Four domain tools for the Founder Ops specialist agent:
 * 1. draftEmail - Professional email generation
 * 2. createTask - Task creation with priority and rationale
 * 3. scheduleMeeting - Meeting agenda and preparation
 * 4. weeklyPriorities - Top priorities with drop candidates
 *
 * Uses Vercel AI SDK `tool()` with Zod schemas for structured I/O.
 * AI-powered tools use `generateStructuredReliable` from fred-client.
 */

import { tool } from "ai";
import { z } from "zod";
import { generateStructuredReliable } from "@/lib/ai/fred-client";
import { FRED_AGENT_VOICE } from "@/lib/agents/fred-agent-voice";

// ============================================================================
// Parameter Schemas (extracted for explicit typing)
// ============================================================================

const draftEmailParams = z.object({
  recipient: z
    .string()
    .describe("Who the email is addressed to (name, role, or relationship)"),
  subject: z.string().describe("Brief description of the email topic"),
  context: z
    .string()
    .describe("Background context for the email (why, what outcome you want)"),
  tone: z
    .enum(["formal", "casual", "urgent"])
    .describe("Desired tone for the email"),
});

const createTaskParams = z.object({
  title: z.string().describe("Clear, actionable task title"),
  priority: z
    .enum(["low", "medium", "high", "critical"])
    .describe("Task priority level"),
  dueDate: z
    .string()
    .optional()
    .describe("Target due date (ISO 8601 format)"),
  category: z
    .string()
    .describe("Task category (e.g., fundraising, product, hiring, ops)"),
  rationale: z
    .string()
    .describe("Why this task matters and its expected business impact"),
});

const scheduleMeetingParams = z.object({
  attendees: z
    .array(z.string())
    .describe("List of attendees (names or roles)"),
  topic: z.string().describe("Main topic or purpose of the meeting"),
  duration: z.number().describe("Meeting duration in minutes"),
  keyQuestions: z
    .array(z.string())
    .describe("Key questions to address in the meeting"),
});

const weeklyPrioritiesParams = z.object({
  currentGoals: z
    .array(z.string())
    .describe("Current goals the founder is working toward"),
  blockers: z
    .array(z.string())
    .describe("Current blockers or challenges"),
  recentWins: z
    .array(z.string())
    .describe("Recent wins or achievements to build on"),
});

// ============================================================================
// Tool: Draft Email
// ============================================================================

const draftEmail = tool({
  description:
    "Draft a professional email tailored to the recipient and context. " +
    "Generates subject line, body, and optional follow-up suggestion.",
  inputSchema: draftEmailParams,
  execute: async (input: z.infer<typeof draftEmailParams>) => {
    const { recipient, subject, context, tone } = input;

    const emailSchema = z.object({
      subject: z.string().describe("Email subject line"),
      body: z.string().describe("Full email body text"),
      suggestedFollowUp: z
        .string()
        .optional()
        .describe("Suggested follow-up action or timing"),
    });

    const prompt = `Draft a ${tone} email to ${recipient} about: ${subject}.

Context: ${context}

Requirements:
- Keep it concise and actionable
- Match the ${tone} tone appropriately
- Include a clear call-to-action
- Suggest a follow-up if appropriate`;

    const result = await generateStructuredReliable(prompt, emailSchema, {
      system:
        `${FRED_AGENT_VOICE}\n\nYou are drafting an email for a founder you're mentoring. Write direct, purposeful, no corporate fluff.`,
      temperature: 0.6,
    });

    return result.object;
  },
});

// ============================================================================
// Tool: Create Task
// ============================================================================

const createTask = tool({
  description:
    "Create a prioritized task with deadline, category, and rationale. " +
    "Returns a structured task object ready for tracking.",
  inputSchema: createTaskParams,
  execute: async (input: z.infer<typeof createTaskParams>) => {
    const { title, priority, dueDate, category, rationale } = input;

    return {
      taskId: crypto.randomUUID(),
      title,
      priority,
      dueDate: dueDate || null,
      category,
      rationale,
      status: "created" as const,
    };
  },
});

// ============================================================================
// Tool: Schedule Meeting
// ============================================================================

const scheduleMeeting = tool({
  description:
    "Prepare a meeting agenda with key questions, preparation items, " +
    "and expected outcomes. Helps founders run efficient meetings.",
  inputSchema: scheduleMeetingParams,
  execute: async (input: z.infer<typeof scheduleMeetingParams>) => {
    const { attendees, topic, duration, keyQuestions } = input;

    const meetingSchema = z.object({
      agenda: z
        .array(z.string())
        .describe("Ordered agenda items with time allocations"),
      preparationItems: z
        .array(z.string())
        .describe("Items to prepare before the meeting"),
      expectedOutcomes: z
        .array(z.string())
        .describe("Clear outcomes expected from this meeting"),
    });

    const prompt = `Create a meeting agenda for a ${duration}-minute meeting.

Topic: ${topic}
Attendees: ${attendees.join(", ")}
Key questions to address:
${keyQuestions.map((q: string, i: number) => `${i + 1}. ${q}`).join("\n")}

Requirements:
- Agenda items should have realistic time allocations for ${duration} minutes
- Preparation items should be specific and actionable
- Expected outcomes should be measurable or clearly defined
- Keep the meeting focused and efficient`;

    const result = await generateStructuredReliable(prompt, meetingSchema, {
      system:
        `${FRED_AGENT_VOICE}\n\nYou are preparing a meeting agenda. Meetings should have clear agendas and measurable outcomes.`,
      temperature: 0.5,
    });

    return result.object;
  },
});

// ============================================================================
// Tool: Weekly Priorities
// ============================================================================

const weeklyPriorities = tool({
  description:
    "Analyze the founder's current situation and recommend top 3-5 weekly " +
    "priorities, things to drop, and quick wins. Based on goals, blockers, and recent wins.",
  inputSchema: weeklyPrioritiesParams,
  execute: async (input: z.infer<typeof weeklyPrioritiesParams>) => {
    const { currentGoals, blockers, recentWins } = input;

    const prioritiesSchema = z.object({
      priorities: z
        .array(
          z.object({
            title: z.string().describe("Priority title"),
            why: z.string().describe("Why this matters this week"),
            metric: z.string().describe("How to measure progress"),
          })
        )
        .describe("Top 3-5 priorities for the week"),
      dropCandidates: z
        .array(z.string())
        .describe("Things to consider dropping or deprioritizing"),
      quickWins: z
        .array(z.string())
        .describe("Quick wins that can be completed in under 30 minutes"),
    });

    const prompt = `Analyze this founder's situation and recommend weekly priorities.

Current Goals:
${currentGoals.map((g: string, i: number) => `${i + 1}. ${g}`).join("\n")}

Blockers:
${blockers.map((b: string, i: number) => `${i + 1}. ${b}`).join("\n")}

Recent Wins:
${recentWins.map((w: string, i: number) => `${i + 1}. ${w}`).join("\n")}

Requirements:
- Recommend 3-5 priorities max (ruthless prioritization)
- Each priority needs a clear "why" and measurable metric
- Identify things that should be dropped or delayed
- Suggest 2-3 quick wins to build momentum
- Frame everything in terms of business outcomes`;

    const result = await generateStructuredReliable(
      prompt,
      prioritiesSchema,
      {
        system:
          `${FRED_AGENT_VOICE}\n\nHelp founders ruthlessly prioritize. Most startups fail from doing too much, not too little.`,
        temperature: 0.6,
      }
    );

    return result.object;
  },
});

// ============================================================================
// Export
// ============================================================================

/**
 * All tools available to the Founder Ops Agent.
 * Keyed by tool name for the AI SDK tool-calling loop.
 */
export const founderOpsTools = {
  draftEmail,
  createTask,
  scheduleMeeting,
  weeklyPriorities,
};
