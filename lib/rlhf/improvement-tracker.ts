/**
 * Improvement Tracker
 *
 * Phase 76 (REQ-L1): Links feedback signals to resolved improvements.
 * Tracks which user feedback contributed to which prompt patches or bug fixes.
 */

import { sql } from "@/lib/db/supabase-sql"
import { logger } from "@/lib/logger"

// ============================================================================
// Types
// ============================================================================

export interface ImprovementEntry {
  id: string
  improvementType: 'prompt_patch' | 'bug_fix' | 'feature'
  title: string
  description: string | null
  patchId: string | null
  insightId: string | null
  signalIds: string[]
  userIds: string[]
  severity: string
  resolvedAt: string
  notifiedAt: string | null
  metadata: Record<string, unknown>
  createdAt: string
}

function mapRow(row: Record<string, unknown>): ImprovementEntry {
  return {
    id: String(row.id),
    improvementType: String(row.improvement_type) as ImprovementEntry["improvementType"],
    title: String(row.title),
    description: row.description ? String(row.description) : null,
    patchId: row.patch_id ? String(row.patch_id) : null,
    insightId: row.insight_id ? String(row.insight_id) : null,
    signalIds: (row.signal_ids as string[]) || [],
    userIds: (row.user_ids as string[]) || [],
    severity: String(row.severity),
    resolvedAt: String(row.resolved_at),
    notifiedAt: row.notified_at ? String(row.notified_at) : null,
    metadata: (row.metadata as Record<string, unknown>) || {},
    createdAt: String(row.created_at),
  }
}

// ============================================================================
// Log Improvements
// ============================================================================

/**
 * Log a resolved improvement with linked feedback signals.
 * Derives user_ids from signal_ids automatically.
 */
export async function logImprovement(params: {
  improvementType: 'prompt_patch' | 'bug_fix' | 'feature'
  title: string
  description?: string
  patchId?: string
  insightId?: string
  signalIds: string[]
  severity?: string
}): Promise<ImprovementEntry> {
  // Derive user IDs from signal IDs
  let userIds: string[] = []
  if (params.signalIds.length > 0) {
    const userRows = await sql`
      SELECT DISTINCT user_id FROM feedback_signals
      WHERE id = ANY(${params.signalIds as unknown as string})
    `
    userIds = userRows.map((r) => String((r as Record<string, unknown>).user_id))
  }

  const rows = await sql`
    INSERT INTO feedback_improvements (
      improvement_type, title, description, patch_id, insight_id,
      signal_ids, user_ids, severity
    ) VALUES (
      ${params.improvementType}, ${params.title}, ${params.description || null},
      ${params.patchId || null}, ${params.insightId || null},
      ${params.signalIds as unknown as string}, ${userIds as unknown as string},
      ${params.severity || 'medium'}
    )
    RETURNING *
  `

  logger.log(`[improvement-tracker] Logged improvement "${params.title}" (${userIds.length} users affected)`)
  return mapRow(rows[0] as Record<string, unknown>)
}

/**
 * Log an improvement from a prompt patch, using its source signals.
 */
export async function logImprovementFromPatch(
  patchId: string
): Promise<ImprovementEntry | null> {
  const patchRows = await sql`
    SELECT id, title, content, topic, source_signal_ids, source_id
    FROM prompt_patches WHERE id = ${patchId}
  `
  if (patchRows.length === 0) return null

  const patch = patchRows[0] as Record<string, unknown>

  return logImprovement({
    improvementType: "prompt_patch",
    title: String(patch.title),
    description: `FRED coaching improved: ${String(patch.content).slice(0, 200)}`,
    patchId,
    insightId: patch.source_id ? String(patch.source_id) : undefined,
    signalIds: (patch.source_signal_ids as string[]) || [],
    severity: "medium",
  })
}

// ============================================================================
// Query Improvements
// ============================================================================

/**
 * Get improvements for a specific user.
 * REQ-L3: 30-day staleness cutoff + severity >= medium.
 */
export async function getImprovementsForUser(
  userId: string,
  since?: string
): Promise<ImprovementEntry[]> {
  const sinceDate = since || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const rows = await sql`
    SELECT * FROM feedback_improvements
    WHERE ${userId} = ANY(user_ids)
      AND resolved_at > ${sinceDate}
      AND severity IN ('medium', 'high', 'critical')
    ORDER BY resolved_at DESC
  `

  return rows.map((r) => mapRow(r as Record<string, unknown>))
}

/**
 * Get recent improvements (for digest generation).
 */
export async function getRecentImprovements(
  since?: string
): Promise<ImprovementEntry[]> {
  const sinceDate = since || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const rows = await sql`
    SELECT * FROM feedback_improvements
    WHERE resolved_at > ${sinceDate}
      AND severity IN ('medium', 'high', 'critical')
    ORDER BY resolved_at DESC
  `

  return rows.map((r) => mapRow(r as Record<string, unknown>))
}

/**
 * Mark improvements as notified (prevents duplicate digest sends).
 */
export async function markAsNotified(
  improvementIds: string[]
): Promise<void> {
  if (improvementIds.length === 0) return

  await sql`
    UPDATE feedback_improvements
    SET notified_at = NOW()
    WHERE id = ANY(${improvementIds as unknown as string})
  `

  logger.log(`[improvement-tracker] Marked ${improvementIds.length} improvements as notified`)
}
