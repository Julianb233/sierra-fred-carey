/**
 * Daily Agenda Engine
 * Phase 84: Daily Mentor Guidance
 *
 * Generates personalized daily agendas for founders based on their
 * Oases stage, recent chat history, and current challenges.
 * Agendas are cached per user per day -- only generated once.
 */

import { generateObject } from "ai"
import { z } from "zod"
import { createServiceClient } from "@/lib/supabase/server"
import { getModel } from "@/lib/ai/providers"
import { getModelForTier } from "@/lib/ai/tier-routing"
import { getUserTier } from "@/lib/api/tier-middleware"
import { retrieveRecentEpisodes } from "@/lib/db/fred-memory"
import { logJourneyEventAsync } from "@/lib/db/journey-events"
import type { DailyAgenda, DailyTask } from "./types"

// ============================================================================
// Constants
// ============================================================================

const LOG_PREFIX = "[Daily Agenda]"

// ============================================================================
// Zod schema for AI-generated tasks
// ============================================================================

const dailyTaskSchema = z.object({
  title: z.string().describe("Short, specific, actionable task title. Tell them what to do, not what to consider."),
  description: z.string().describe("1-2 sentences on why this matters and a concrete first step."),
  priority: z.enum(["must-do", "should-do", "stretch"]).describe("must-do = critical for today, should-do = important but deferrable, stretch = bonus if time permits"),
  estimatedMinutes: z.number().min(5).max(120).describe("Realistic estimate in minutes"),
  category: z.enum(["research", "build", "connect", "reflect", "document"]).describe("Primary category of this task"),
})

const dailyAgendaSchema = z.object({
  tasks: z.array(dailyTaskSchema).length(3).describe("Exactly 3 tasks for today, ordered by priority"),
})

// ============================================================================
// Core Engine
// ============================================================================

/**
 * Generate or retrieve today's daily agenda for a founder.
 * Returns cached agenda if already generated today.
 */
export async function generateDailyAgenda(userId: string): Promise<DailyAgenda> {
  const supabase = createServiceClient()
  const today = new Date().toISOString().split("T")[0]

  // Check for cached agenda
  const { data: existing } = await supabase
    .from("daily_agendas")
    .select("*")
    .eq("user_id", userId)
    .eq("date", today)
    .single()

  if (existing) {
    return transformToAgenda(existing)
  }

  // Load founder context
  const [profile, recentEpisodes, tier] = await Promise.all([
    loadFounderProfile(userId),
    loadRecentChatContext(userId),
    getUserTier(userId),
  ])

  const providerKey = getModelForTier(tier, "structured")
  const model = getModel(providerKey)

  const founderName = profile.name || "Founder"
  const stage = profile.oases_stage || profile.stage || "clarity"
  const stageLabel = stage.replace(/-/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())

  // Build context for AI
  const contextParts: string[] = []
  contextParts.push(`Founder: ${founderName}`)
  contextParts.push(`Current Oases Stage: ${stageLabel}`)

  if (profile.industry) contextParts.push(`Industry: ${profile.industry}`)
  if (profile.challenges && profile.challenges.length > 0) {
    contextParts.push(`Current Challenges: ${profile.challenges.join(", ")}`)
  }
  if (profile.funding_history) contextParts.push(`Funding: ${profile.funding_history}`)
  if (profile.revenue_range) contextParts.push(`Revenue: ${profile.revenue_range}`)
  if (profile.team_size) contextParts.push(`Team Size: ${profile.team_size}`)

  if (recentEpisodes.length > 0) {
    contextParts.push("\nRecent conversation topics:")
    for (const ep of recentEpisodes) {
      const content = ep.content as Record<string, unknown>
      if (typeof content.content === "string") {
        const snippet = content.content.slice(0, 200)
        contextParts.push(`- ${snippet}`)
      }
    }
  }

  const systemPrompt = `You are Fred Cary, an experienced serial entrepreneur and mentor generating today's 3 most impactful tasks for a startup founder.

RULES:
- Tasks must be specific, actionable, and completable TODAY (not multi-day projects)
- Use the mentor voice -- tell them what to do, don't ask
- Base tasks on their current stage, challenges, and recent conversation topics
- First task should always be "must-do" priority
- Include a mix of categories when possible
- If they're in early stages (Clarity, Blueprint), focus on validation and research
- If they're in later stages (Build, Launch, Scale), focus on execution and metrics
- Be prescriptive: "Interview 2 potential customers about X" not "Think about customer validation"
- Each task description should explain WHY it matters for their specific situation`

  try {
    const result = await generateObject({
      model,
      schema: dailyAgendaSchema,
      system: systemPrompt,
      prompt: `Generate today's 3 tasks for this founder:\n\n${contextParts.join("\n")}`,
      temperature: 0.7,
    })

    const tasks: DailyTask[] = result.object.tasks.map((t, i) => ({
      id: crypto.randomUUID(),
      title: t.title,
      description: t.description,
      priority: t.priority,
      estimatedMinutes: t.estimatedMinutes,
      category: t.category,
      completed: false,
    }))

    // Store in database
    const { data: stored, error: storeError } = await supabase
      .from("daily_agendas")
      .upsert({
        user_id: userId,
        date: today,
        tasks: JSON.parse(JSON.stringify(tasks)),
        completed_tasks: [],
        oases_stage: stage,
      }, { onConflict: "user_id,date" })
      .select()
      .single()

    if (storeError) {
      console.error(`${LOG_PREFIX} Failed to store agenda:`, storeError)
    }

    const greeting = buildGreeting(founderName, stageLabel)

    return {
      date: today,
      tasks,
      stage: stageLabel,
      greeting,
      completedCount: 0,
    }
  } catch (error) {
    console.error(`${LOG_PREFIX} AI generation failed:`, error)

    // Return fallback agenda
    return buildFallbackAgenda(today, founderName, stageLabel, stage)
  }
}

/**
 * Log a task completion for today's agenda.
 */
export async function logTaskCompletion(userId: string, taskId: string): Promise<void> {
  const supabase = createServiceClient()
  const today = new Date().toISOString().split("T")[0]

  // Get current agenda
  const { data: agenda, error: fetchError } = await supabase
    .from("daily_agendas")
    .select("*")
    .eq("user_id", userId)
    .eq("date", today)
    .single()

  if (fetchError || !agenda) {
    console.warn(`${LOG_PREFIX} No agenda found for today`)
    return
  }

  // Update completed_tasks array
  const completedTasks: string[] = agenda.completed_tasks || []
  if (!completedTasks.includes(taskId)) {
    completedTasks.push(taskId)
  }

  // Update tasks JSON to mark as completed
  const tasks = (agenda.tasks as DailyTask[]).map((t) =>
    t.id === taskId ? { ...t, completed: true } : t
  )

  const { error: updateError } = await supabase
    .from("daily_agendas")
    .update({
      completed_tasks: completedTasks,
      tasks: JSON.parse(JSON.stringify(tasks)),
    })
    .eq("user_id", userId)
    .eq("date", today)

  if (updateError) {
    console.error(`${LOG_PREFIX} Failed to update completion:`, updateError)
  }

  // Fire-and-forget: log journey event
  logJourneyEventAsync({
    userId,
    eventType: "daily_task_completed",
    eventData: {
      taskId,
      date: today,
      completedCount: completedTasks.length,
      totalTasks: tasks.length,
    },
  })
}

// ============================================================================
// Helpers
// ============================================================================

async function loadFounderProfile(userId: string) {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from("profiles")
    .select("name, stage, industry, challenges, funding_history, revenue_range, team_size, oases_stage")
    .eq("id", userId)
    .single()

  if (error || !data) {
    return {
      name: null,
      stage: null,
      industry: null,
      challenges: [] as string[],
      funding_history: null,
      revenue_range: null,
      team_size: null,
      oases_stage: null,
    }
  }

  return {
    ...data,
    challenges: Array.isArray(data.challenges) ? data.challenges : [],
  }
}

async function loadRecentChatContext(userId: string) {
  try {
    return await retrieveRecentEpisodes(userId, {
      limit: 5,
      eventType: "conversation",
    })
  } catch {
    return []
  }
}

function buildGreeting(name: string, stage: string): string {
  const hour = new Date().getHours()
  let timeOfDay = "Good morning"
  if (hour >= 12 && hour < 17) timeOfDay = "Good afternoon"
  if (hour >= 17) timeOfDay = "Good evening"

  return `${timeOfDay}, ${name}. You're in the ${stage} stage. Here's your focus for today.`
}

function transformToAgenda(row: Record<string, unknown>): DailyAgenda {
  const tasks = (row.tasks as DailyTask[]) || []
  const completedTasks = (row.completed_tasks as string[]) || []
  const stage = (row.oases_stage as string) || "clarity"
  const stageLabel = stage.replace(/-/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())

  // Merge completion state
  const mergedTasks = tasks.map((t) => ({
    ...t,
    completed: completedTasks.includes(t.id) || t.completed,
  }))

  return {
    date: row.date as string,
    tasks: mergedTasks,
    stage: stageLabel,
    greeting: buildGreeting("Founder", stageLabel),
    completedCount: completedTasks.length,
  }
}

function buildFallbackAgenda(date: string, name: string, stageLabel: string, stage: string): DailyAgenda {
  const fallbackTasks: DailyTask[] = [
    {
      id: crypto.randomUUID(),
      title: "Spend 15 minutes reviewing your startup's biggest risk",
      description: "Every founder has a make-or-break risk. Identify yours and write down one action to mitigate it.",
      priority: "must-do",
      estimatedMinutes: 15,
      category: "reflect",
      completed: false,
    },
    {
      id: crypto.randomUUID(),
      title: "Reach out to one potential customer or partner",
      description: "Growth comes from conversations. Send one outreach message today -- cold email, LinkedIn, or a follow-up.",
      priority: "should-do",
      estimatedMinutes: 20,
      category: "connect",
      completed: false,
    },
    {
      id: crypto.randomUUID(),
      title: "Document one key learning from this week",
      description: "What did you learn that changes how you think about your business? Write it down before you forget.",
      priority: "stretch",
      estimatedMinutes: 10,
      category: "document",
      completed: false,
    },
  ]

  return {
    date,
    tasks: fallbackTasks,
    stage: stageLabel,
    greeting: buildGreeting(name, stageLabel),
    completedCount: 0,
  }
}
