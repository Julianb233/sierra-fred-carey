/**
 * Funnel → Platform Data Migration
 *
 * Migrates data collected in the funnel (u.joinsahara.com) into the full
 * Sahara platform tables when a user signs up.
 *
 * Migration flow:
 * 1. Funnel POSTs payload to /api/funnel/sync (persists to funnel_leads)
 * 2. On sign-up, link funnel_leads.user_id to the new auth user
 * 3. Run migrateFunnelData() to move data into platform tables
 * 4. Mark funnel_leads.migrated = true
 *
 * Linear: AI-1903
 */

import { createServiceClient } from "@/lib/supabase/server"
import type {
  FunnelChatMessage,
  FunnelJourneyProgress,
  FunnelLead,
  MigrationResult,
  JourneyStageId,
} from "@/lib/types/funnel-migration"
import {
  JOURNEY_STAGE_IDS,
  STAGE_TO_GOAL_CATEGORY,
  STAGE_MILESTONES,
} from "@/lib/types/funnel-migration"

const LOG_PREFIX = "[funnel-migration]"

// ============================================================================
// Funnel Lead CRUD
// ============================================================================

/**
 * Persist funnel data server-side. Called from /api/funnel/sync.
 * Upserts on session_id so repeated syncs don't create duplicates.
 */
export async function upsertFunnelLead(payload: {
  sessionId: string
  chatMessages: FunnelChatMessage[]
  journeyProgress: FunnelJourneyProgress
  funnelVersion?: string
}): Promise<{ id: string }> {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from("funnel_leads")
    .upsert(
      {
        session_id: payload.sessionId,
        chat_messages: payload.chatMessages,
        journey_progress: payload.journeyProgress,
        funnel_version: payload.funnelVersion ?? "1.0",
      },
      { onConflict: "session_id" }
    )
    .select("id")
    .single()

  if (error) {
    console.error(`${LOG_PREFIX} Error upserting funnel lead:`, error)
    throw error
  }

  return { id: data.id }
}

/**
 * Link a funnel session to a newly-created user account.
 */
export async function linkFunnelLeadToUser(
  sessionId: string,
  userId: string
): Promise<void> {
  const supabase = createServiceClient()

  const { error } = await supabase
    .from("funnel_leads")
    .update({ user_id: userId })
    .eq("session_id", sessionId)
    .is("user_id", null)

  if (error) {
    console.error(`${LOG_PREFIX} Error linking funnel lead to user:`, error)
    throw error
  }
}

/**
 * Get un-migrated funnel leads for a user.
 */
export async function getUnmigratedLeads(
  userId: string
): Promise<FunnelLead[]> {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from("funnel_leads")
    .select("*")
    .eq("user_id", userId)
    .eq("migrated", false)
    .order("created_at", { ascending: true })

  if (error) {
    console.error(`${LOG_PREFIX} Error fetching unmigrated leads:`, error)
    throw error
  }

  return (data || []).map(transformFunnelLeadRow)
}

// ============================================================================
// Core Migration
// ============================================================================

/**
 * Migrate all un-migrated funnel data for a user into platform tables.
 *
 * This is idempotent — running it twice won't create duplicate data
 * because each funnel_lead is marked migrated after processing.
 */
export async function migrateFunnelData(
  userId: string
): Promise<MigrationResult> {
  const result: MigrationResult = {
    success: false,
    episodesCreated: 0,
    goalsUpdated: 0,
    eventsLogged: 0,
    warnings: [],
    completedAt: "",
  }

  try {
    const leads = await getUnmigratedLeads(userId)

    if (leads.length === 0) {
      result.success = true
      result.completedAt = new Date().toISOString()
      return result
    }

    for (const lead of leads) {
      // 1. Migrate chat messages → fred_episodic_memory
      const chatResult = await migrateChatMessages(
        userId,
        lead.sessionId,
        lead.chatMessages
      )
      result.episodesCreated += chatResult.count
      result.warnings.push(...chatResult.warnings)

      // 2. Migrate journey progress → founder_goals + journey_events
      const journeyResult = await migrateJourneyProgress(
        userId,
        lead.journeyProgress
      )
      result.goalsUpdated += journeyResult.goalsCount
      result.eventsLogged += journeyResult.eventsCount
      result.warnings.push(...journeyResult.warnings)

      // 3. Store funnel session reference in profile enrichment_data
      await storeFunnelSessionRef(userId, lead.sessionId)

      // 4. Mark lead as migrated
      await markLeadMigrated(lead.id)
    }

    result.success = true
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`${LOG_PREFIX} Migration failed for user ${userId}:`, msg)
    result.warnings.push(`Fatal error: ${msg}`)
  }

  result.completedAt = new Date().toISOString()
  return result
}

// ============================================================================
// Chat Message Migration
// ============================================================================

async function migrateChatMessages(
  userId: string,
  sessionId: string,
  messages: FunnelChatMessage[]
): Promise<{ count: number; warnings: string[] }> {
  const warnings: string[] = []
  const supabase = createServiceClient()

  if (!messages || messages.length === 0) {
    return { count: 0, warnings }
  }

  // Build episodic memory rows from chat messages
  const rows = messages.map((msg) => ({
    user_id: userId,
    session_id: sessionId,
    event_type: "conversation" as const,
    content: {
      role: msg.role,
      content: msg.content,
      source: "funnel",
      originalId: msg.id,
    },
    channel: "funnel",
    importance_score: msg.role === "user" ? 0.6 : 0.4,
    metadata: {
      migratedFrom: "funnel",
      originalTimestamp: msg.timestamp,
    },
    created_at: msg.timestamp || new Date().toISOString(),
  }))

  // Insert in batches of 50
  let count = 0
  for (let i = 0; i < rows.length; i += 50) {
    const batch = rows.slice(i, i + 50)
    const { data, error } = await supabase
      .from("fred_episodic_memory")
      .insert(batch)
      .select("id")

    if (error) {
      warnings.push(
        `Chat batch ${i}-${i + batch.length}: ${error.message}`
      )
    } else {
      count += data?.length ?? 0
    }
  }

  return { count, warnings }
}

// ============================================================================
// Journey Progress Migration
// ============================================================================

async function migrateJourneyProgress(
  userId: string,
  progress: FunnelJourneyProgress
): Promise<{ goalsCount: number; eventsCount: number; warnings: string[] }> {
  const warnings: string[] = []
  const supabase = createServiceClient()

  if (!progress || Object.keys(progress).length === 0) {
    return { goalsCount: 0, eventsCount: 0, warnings }
  }

  let goalsCount = 0
  let eventsCount = 0

  for (const stageId of JOURNEY_STAGE_IDS) {
    const milestones = STAGE_MILESTONES[stageId]
    const category = STAGE_TO_GOAL_CATEGORY[stageId]

    for (let i = 0; i < milestones.length; i++) {
      const key = `${stageId}-${i}`
      const isCompleted = !!progress[key]

      if (!isCompleted) continue

      // Create/update founder_goal
      const { error: goalError } = await supabase
        .from("founder_goals")
        .upsert(
          {
            user_id: userId,
            stage: stageId,
            title: milestones[i],
            description: `Milestone from funnel journey: ${milestones[i]}`,
            category,
            sort_order: i,
            completed: true,
            completed_at: new Date().toISOString(),
          },
          { onConflict: "user_id,stage,title", ignoreDuplicates: true }
        )

      if (goalError) {
        // The upsert might fail if there's no unique constraint on (user_id, stage, title).
        // In that case, try a plain insert. If it's a true duplicate, it will be caught.
        const { error: insertError } = await supabase
          .from("founder_goals")
          .insert({
            user_id: userId,
            stage: stageId,
            title: milestones[i],
            description: `Milestone from funnel journey: ${milestones[i]}`,
            category,
            sort_order: i,
            completed: true,
            completed_at: new Date().toISOString(),
          })

        if (insertError) {
          warnings.push(
            `Goal ${stageId}/${milestones[i]}: ${insertError.message}`
          )
          continue
        }
      }
      goalsCount++

      // Log journey event for the milestone completion
      const { error: eventError } = await supabase
        .from("journey_events")
        .insert({
          user_id: userId,
          event_type: "milestone_achieved",
          event_data: {
            stage: stageId,
            milestone: milestones[i],
            milestoneIndex: i,
            source: "funnel_migration",
          },
        })

      if (eventError) {
        warnings.push(
          `Journey event ${stageId}/${i}: ${eventError.message}`
        )
      } else {
        eventsCount++
      }
    }
  }

  return { goalsCount, eventsCount, warnings }
}

// ============================================================================
// Profile Enrichment
// ============================================================================

async function storeFunnelSessionRef(
  userId: string,
  sessionId: string
): Promise<void> {
  const supabase = createServiceClient()

  // Read current enrichment_data, merge funnel session
  const { data: profile } = await supabase
    .from("profiles")
    .select("enrichment_data")
    .eq("id", userId)
    .single()

  const enrichment =
    (profile?.enrichment_data as Record<string, unknown>) ?? {}

  const funnelSessions = (enrichment.funnel_sessions as string[]) ?? []
  if (!funnelSessions.includes(sessionId)) {
    funnelSessions.push(sessionId)
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      enrichment_data: {
        ...enrichment,
        funnel_sessions: funnelSessions,
        funnel_migrated_at: new Date().toISOString(),
      },
    })
    .eq("id", userId)

  if (error) {
    console.warn(
      `${LOG_PREFIX} Could not update profile enrichment_data:`,
      error.message
    )
  }
}

// ============================================================================
// Mark Migrated
// ============================================================================

async function markLeadMigrated(leadId: string): Promise<void> {
  const supabase = createServiceClient()

  const { error } = await supabase
    .from("funnel_leads")
    .update({ migrated: true, migrated_at: new Date().toISOString() })
    .eq("id", leadId)

  if (error) {
    console.error(`${LOG_PREFIX} Error marking lead ${leadId} as migrated:`, error)
    throw error
  }
}

// ============================================================================
// Transform
// ============================================================================

function transformFunnelLeadRow(row: Record<string, unknown>): FunnelLead {
  return {
    id: row.id as string,
    sessionId: row.session_id as string,
    userId: (row.user_id as string) ?? null,
    chatMessages: (row.chat_messages ?? []) as FunnelChatMessage[],
    journeyProgress: (row.journey_progress ?? {}) as FunnelJourneyProgress,
    migrated: row.migrated as boolean,
    migratedAt: (row.migrated_at as string) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }
}
