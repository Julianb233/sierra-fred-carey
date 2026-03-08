/**
 * Prompt Patch Lifecycle Manager
 *
 * Phase 76 (REQ-R3, REQ-R4): Manages the full lifecycle of prompt patches:
 * draft → approved → active/testing → archived
 *
 * No patch is ever auto-deployed. Admin approval is always required.
 */

import { sql } from "@/lib/db/supabase-sql"
import type { PromptPatch, PatchStatus } from "@/lib/rlhf/types"
import { logger } from "@/lib/logger"

// ============================================================================
// DB Row Mapping
// ============================================================================

function mapPatchRow(row: Record<string, unknown>): PromptPatch {
  return {
    id: String(row.id),
    title: String(row.title),
    content: String(row.content),
    topic: row.topic ? String(row.topic) : null,
    source: String(row.source) as PromptPatch["source"],
    sourceId: row.source_id ? String(row.source_id) : null,
    sourceSignalIds: (row.source_signal_ids as string[]) || [],
    status: String(row.status) as PromptPatch["status"],
    version: Number(row.version),
    parentPatchId: row.parent_patch_id ? String(row.parent_patch_id) : null,
    experimentId: row.experiment_id ? String(row.experiment_id) : null,
    approvedBy: row.approved_by ? String(row.approved_by) : null,
    approvedAt: row.approved_at ? String(row.approved_at) : null,
    activatedAt: row.activated_at ? String(row.activated_at) : null,
    deactivatedAt: row.deactivated_at ? String(row.deactivated_at) : null,
    performanceMetrics: (row.performance_metrics as PromptPatch["performanceMetrics"]) || {},
    metadata: (row.metadata as Record<string, unknown>) || {},
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  }
}

// ============================================================================
// Query Operations
// ============================================================================

/**
 * Get a single patch by ID.
 */
export async function getPatchById(id: string): Promise<PromptPatch | null> {
  const rows = await sql`
    SELECT * FROM prompt_patches WHERE id = ${id}
  `
  if (rows.length === 0) return null
  return mapPatchRow(rows[0] as Record<string, unknown>)
}

/**
 * Get patches filtered by status(es).
 */
export async function getPatchesByStatus(
  status: PatchStatus | PatchStatus[]
): Promise<PromptPatch[]> {
  const statuses = Array.isArray(status) ? status : [status]
  const rows = await sql`
    SELECT * FROM prompt_patches
    WHERE status = ANY(${statuses as unknown as string})
    ORDER BY created_at DESC
  `
  return rows.map((r) => mapPatchRow(r as Record<string, unknown>))
}

// ============================================================================
// Lifecycle Transitions
// ============================================================================

/**
 * Approve a draft patch. REQ-R4: human-in-the-loop gate.
 */
export async function approvePatch(
  patchId: string,
  approvedBy: string
): Promise<PromptPatch> {
  const patch = await getPatchById(patchId)
  if (!patch) throw new Error(`Patch ${patchId} not found`)
  if (patch.status !== "draft") {
    throw new Error(`Cannot approve patch with status '${patch.status}' (must be 'draft')`)
  }

  const rows = await sql`
    UPDATE prompt_patches
    SET status = 'approved',
        approved_by = ${approvedBy},
        approved_at = NOW(),
        updated_at = NOW()
    WHERE id = ${patchId}
    RETURNING *
  `

  logger.log(`[patch-manager] Approved patch "${patch.title}" by ${approvedBy}`)
  return mapPatchRow(rows[0] as Record<string, unknown>)
}

/**
 * Reject a draft or approved patch.
 */
export async function rejectPatch(
  patchId: string,
  reason?: string
): Promise<PromptPatch> {
  const patch = await getPatchById(patchId)
  if (!patch) throw new Error(`Patch ${patchId} not found`)
  if (patch.status !== "draft" && patch.status !== "approved") {
    throw new Error(`Cannot reject patch with status '${patch.status}' (must be 'draft' or 'approved')`)
  }

  const metadata = { ...patch.metadata, rejectionReason: reason || null }

  const rows = await sql`
    UPDATE prompt_patches
    SET status = 'rejected',
        metadata = ${JSON.stringify(metadata)},
        updated_at = NOW()
    WHERE id = ${patchId}
    RETURNING *
  `

  logger.log(`[patch-manager] Rejected patch "${patch.title}" (reason: ${reason || "none"})`)
  return mapPatchRow(rows[0] as Record<string, unknown>)
}

/**
 * Activate an approved patch (makes it available in buildPromptWithSupplements).
 */
export async function activatePatch(patchId: string): Promise<PromptPatch> {
  const patch = await getPatchById(patchId)
  if (!patch) throw new Error(`Patch ${patchId} not found`)
  if (patch.status !== "approved") {
    throw new Error(`Cannot activate patch with status '${patch.status}' (must be 'approved')`)
  }

  const rows = await sql`
    UPDATE prompt_patches
    SET status = 'active',
        activated_at = NOW(),
        updated_at = NOW()
    WHERE id = ${patchId}
    RETURNING *
  `

  // Invalidate cache
  activePatchesCache = null

  logger.log(`[patch-manager] Activated patch "${patch.title}"`)
  return mapPatchRow(rows[0] as Record<string, unknown>)
}

/**
 * Deactivate an active patch (archive it).
 */
export async function deactivatePatch(patchId: string): Promise<PromptPatch> {
  const patch = await getPatchById(patchId)
  if (!patch) throw new Error(`Patch ${patchId} not found`)
  if (patch.status !== "active") {
    throw new Error(`Cannot deactivate patch with status '${patch.status}' (must be 'active')`)
  }

  const rows = await sql`
    UPDATE prompt_patches
    SET status = 'archived',
        deactivated_at = NOW(),
        updated_at = NOW()
    WHERE id = ${patchId}
    RETURNING *
  `

  // Invalidate cache
  activePatchesCache = null

  logger.log(`[patch-manager] Deactivated patch "${patch.title}"`)
  return mapPatchRow(rows[0] as Record<string, unknown>)
}

/**
 * Launch an approved patch as an A/B test experiment. REQ-R4 + REQ-R5.
 */
export async function launchPatchAsTest(
  patchId: string,
  experimentConfig: {
    name: string
    description?: string
    trafficPercentage?: number
  }
): Promise<{ patch: PromptPatch; experimentId: string }> {
  const patch = await getPatchById(patchId)
  if (!patch) throw new Error(`Patch ${patchId} not found`)
  if (patch.status !== "approved") {
    throw new Error(`Cannot launch test for patch with status '${patch.status}' (must be 'approved')`)
  }

  const treatmentTraffic = experimentConfig.trafficPercentage ?? 50
  const controlTraffic = 100 - treatmentTraffic

  // Create the experiment
  const experimentRows = await sql`
    INSERT INTO ab_experiments (name, description, is_active)
    VALUES (
      ${experimentConfig.name},
      ${experimentConfig.description || `A/B test for prompt patch: ${patch.title}`},
      true
    )
    RETURNING id
  `
  const experimentId = String((experimentRows[0] as Record<string, unknown>).id)

  // Create control variant (no patch)
  await sql`
    INSERT INTO ab_variants (experiment_id, variant_name, traffic_percentage, config_overrides)
    VALUES (${experimentId}, 'control', ${controlTraffic}, '{}')
  `

  // Create treatment variant (with patch)
  await sql`
    INSERT INTO ab_variants (experiment_id, variant_name, traffic_percentage, config_overrides)
    VALUES (${experimentId}, 'treatment', ${treatmentTraffic}, ${JSON.stringify({ patchId: patch.id, patchContent: patch.content })})
  `

  // Update patch status
  const patchRows = await sql`
    UPDATE prompt_patches
    SET status = 'testing',
        experiment_id = ${experimentId},
        updated_at = NOW()
    WHERE id = ${patchId}
    RETURNING *
  `

  logger.log(`[patch-manager] Launched patch "${patch.title}" as A/B test "${experimentConfig.name}" (experiment ${experimentId})`)

  return {
    patch: mapPatchRow(patchRows[0] as Record<string, unknown>),
    experimentId,
  }
}

// ============================================================================
// Active Patches Cache (for runtime prompt assembly)
// ============================================================================

let activePatchesCache: { patches: PromptPatch[]; expiry: number } | null = null
const CACHE_TTL = 60_000 // 60 seconds

/**
 * Get all active patches from DB with caching.
 * Used by buildPromptWithSupplementsAsync for runtime patch loading.
 */
export async function getActiveDBPatches(
  topic?: string
): Promise<PromptPatch[]> {
  // Check cache
  if (activePatchesCache && activePatchesCache.expiry > Date.now()) {
    const cached = activePatchesCache.patches
    if (topic) {
      return cached.filter((p) => p.topic === topic || p.topic === null)
    }
    return cached
  }

  const rows = await sql`
    SELECT * FROM prompt_patches
    WHERE status = 'active'
    ORDER BY created_at DESC
  `
  const patches = rows.map((r) => mapPatchRow(r as Record<string, unknown>))

  // Update cache
  activePatchesCache = { patches, expiry: Date.now() + CACHE_TTL }

  if (topic) {
    return patches.filter((p) => p.topic === topic || p.topic === null)
  }
  return patches
}
