/**
 * Few-Shot Example Store
 *
 * Phase 76 (REQ-R1): CRUD operations for few-shot examples with tier-weighted
 * retrieval. Thumbs-up responses become positive examples; thumbs-down become
 * negative examples in the prompt library.
 */

import { sql } from "@/lib/db/supabase-sql"
import { TIER_WEIGHTS } from "@/lib/feedback/constants"
import type { FewShotExample, FewShotExampleInsert, ExampleType } from "@/lib/rlhf/types"
import { logger } from "@/lib/logger"

// ============================================================================
// DB Row → Type Mapping
// ============================================================================

function mapRow(row: Record<string, unknown>): FewShotExample {
  return {
    id: String(row.id),
    signalId: String(row.signal_id),
    userId: String(row.user_id),
    topic: String(row.topic),
    exampleType: String(row.example_type) as ExampleType,
    userMessage: String(row.user_message),
    assistantResponse: String(row.assistant_response),
    category: row.category ? String(row.category) : null,
    comment: row.comment ? String(row.comment) : null,
    userTier: String(row.user_tier) as 'free' | 'pro' | 'studio',
    weight: Number(row.weight),
    metadata: (row.metadata as Record<string, unknown>) || {},
    createdAt: String(row.created_at),
    expiresAt: row.expires_at ? String(row.expires_at) : null,
  }
}

// ============================================================================
// Store Operations
// ============================================================================

/**
 * Insert a new few-shot example.
 * Auto-sets weight from TIER_WEIGHTS based on userTier.
 */
export async function storeFewShotExample(
  insert: FewShotExampleInsert
): Promise<FewShotExample> {
  const weight = TIER_WEIGHTS[insert.userTier] ?? 1.0

  const rows = await sql`
    INSERT INTO fewshot_examples (
      signal_id, user_id, topic, example_type,
      user_message, assistant_response, category, comment,
      user_tier, weight, metadata, expires_at
    ) VALUES (
      ${insert.signalId}, ${insert.userId}, ${insert.topic}, ${insert.exampleType},
      ${insert.userMessage}, ${insert.assistantResponse}, ${insert.category}, ${insert.comment},
      ${insert.userTier}, ${weight}, ${JSON.stringify(insert.metadata)}, ${insert.expiresAt}
    )
    RETURNING *
  `

  logger.log(`[few-shot-store] Stored ${insert.exampleType} example for topic "${insert.topic}" (weight=${weight})`)
  return mapRow(rows[0] as Record<string, unknown>)
}

/**
 * Convenience wrapper that builds a FewShotExampleInsert and calls storeFewShotExample.
 * Deduplicates by signal_id — returns existing row if found.
 */
export async function createFewShotFromSignal(params: {
  signalId: string
  userId: string
  topic: string
  exampleType: ExampleType
  userMessage: string
  assistantResponse: string
  category?: string
  comment?: string
  userTier: 'free' | 'pro' | 'studio'
  expiresAt?: string
}): Promise<FewShotExample> {
  if (!params.topic.trim()) {
    throw new Error("Topic is required for few-shot examples")
  }

  // Check for existing example with same signal_id
  const existing = await sql`
    SELECT * FROM fewshot_examples WHERE signal_id = ${params.signalId} LIMIT 1
  `
  if (existing.length > 0) {
    logger.log(`[few-shot-store] Deduplicated: signal ${params.signalId} already has example`)
    return mapRow(existing[0] as Record<string, unknown>)
  }

  return storeFewShotExample({
    signalId: params.signalId,
    userId: params.userId,
    topic: params.topic,
    exampleType: params.exampleType,
    userMessage: params.userMessage,
    assistantResponse: params.assistantResponse,
    category: params.category ?? null,
    comment: params.comment ?? null,
    userTier: params.userTier,
    weight: TIER_WEIGHTS[params.userTier] ?? 1.0,
    metadata: {},
    expiresAt: params.expiresAt ?? null,
  })
}

// ============================================================================
// Retrieval
// ============================================================================

/**
 * Get few-shot examples for a topic, filtered by type, ordered by weight.
 * Filters out expired examples.
 */
export async function getFewShotExamplesForTopic(
  topic: string,
  exampleType: ExampleType,
  limit = 10
): Promise<FewShotExample[]> {
  const rows = await sql`
    SELECT * FROM fewshot_examples
    WHERE topic = ${topic}
      AND example_type = ${exampleType}
      AND (expires_at IS NULL OR expires_at > NOW())
    ORDER BY weight DESC, created_at DESC
    LIMIT ${limit}
  `

  return rows.map((r) => mapRow(r as Record<string, unknown>))
}

/**
 * Get top positive and negative examples for a topic.
 * Used as context for the LLM prompt patch generator.
 */
export async function getTopFewShotExamples(
  topic: string,
  options?: { positiveLimit?: number; negativeLimit?: number }
): Promise<{ positive: FewShotExample[]; negative: FewShotExample[] }> {
  const positiveLimit = options?.positiveLimit ?? 5
  const negativeLimit = options?.negativeLimit ?? 3

  const [positive, negative] = await Promise.all([
    getFewShotExamplesForTopic(topic, "positive", positiveLimit),
    getFewShotExamplesForTopic(topic, "negative", negativeLimit),
  ])

  return { positive, negative }
}

// ============================================================================
// Maintenance
// ============================================================================

/**
 * Delete expired few-shot examples (GDPR compliance).
 * Called by daily cleanup job.
 */
export async function pruneStaleFewShots(): Promise<number> {
  const result = await sql`
    DELETE FROM fewshot_examples
    WHERE expires_at IS NOT NULL AND expires_at < NOW()
    RETURNING id
  `

  const count = result.length
  if (count > 0) {
    logger.log(`[few-shot-store] Pruned ${count} expired few-shot examples`)
  }
  return count
}
