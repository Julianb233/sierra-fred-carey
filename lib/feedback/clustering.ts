/**
 * Feedback Clustering Engine
 *
 * Phase 74: AI-powered feedback pattern detection. Clusters feedback signals
 * by theme using LLM structured output, computes severity rankings with
 * tier-weighted scoring, and provides deduplication via hash-based matching.
 *
 * Used by the Trigger.dev daily intelligence job.
 */

import { createHash } from "crypto"
import { generateObject } from "ai"
import { z } from "zod"
import { getModel } from "@/lib/ai/providers"
import { getModelForTier } from "@/lib/ai/tier-routing"
import { TIER_WEIGHTS } from "@/lib/feedback/constants"
import type { FeedbackSignal, FeedbackCluster } from "@/lib/feedback/types"

// ============================================================================
// Constants
// ============================================================================

const SEVERITY_ORDER: Record<string, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
}

const MIN_SIGNALS_FOR_CLUSTERING = 3

// ============================================================================
// LLM Clustering
// ============================================================================

const clusterSchema = z.object({
  clusters: z.array(z.object({
    theme: z.string().describe("Short theme title, e.g. 'Responses too generic'"),
    description: z.string().describe("1-2 sentence summary of the pattern"),
    category: z.string().nullable().describe("Most common feedback category in this cluster"),
    severity: z.enum(["low", "medium", "high", "critical"]).describe(
      "Based on frequency, user tier weight, and sentiment intensity"
    ),
    signal_indices: z.array(z.number()).describe(
      "0-based indices of signals belonging to this cluster"
    ),
  })),
})

/**
 * Cluster feedback signals by theme using LLM structured output.
 * Filters to actionable signals (negative rating, negative sentiment, or has comment).
 * Returns empty array if fewer than 3 actionable signals.
 */
export async function clusterFeedbackSignals(
  signals: FeedbackSignal[]
): Promise<FeedbackCluster[]> {
  // Filter to actionable signals
  const actionable = signals.filter((s) => {
    const isNegativeRating = s.rating === -1
    const isNegativeSentiment =
      s.signal_type === "sentiment" &&
      s.sentiment_score !== null &&
      s.sentiment_score < 0
    const hasComment = !!s.comment && s.comment.trim().length > 0
    return isNegativeRating || isNegativeSentiment || hasComment
  })

  if (actionable.length < MIN_SIGNALS_FOR_CLUSTERING) {
    return []
  }

  try {
    // Build signal summaries for LLM
    const summaries = actionable.map((s, i) => ({
      index: i,
      category: s.category || "none",
      comment: s.comment?.slice(0, 200) || "",
      sentiment: s.sentiment_score !== null
        ? s.sentiment_score > 0 ? "positive" : s.sentiment_score < -0.5 ? "frustrated" : "negative"
        : "unknown",
      tier: s.user_tier,
      created_at: s.created_at,
    }))

    const providerKey = getModelForTier("free", "structured")
    const model = getModel(providerKey)

    const result = await generateObject({
      model,
      schema: clusterSchema,
      prompt: `Analyze these ${actionable.length} feedback signals from a startup coaching AI and cluster them by theme.

Feedback signals:
${JSON.stringify(summaries, null, 2)}

Group related feedback into clusters. Each signal should belong to exactly one cluster.
Assign severity based on: signal count, user tier weight (studio > pro > free), and sentiment intensity.
If a cluster has coaching_discomfort category signals, note that separately — these may be "working as designed".`,
    })

    // Map LLM output back to signal IDs and compute weighted counts
    return result.object.clusters.map((cluster) => {
      const clusterSignals = cluster.signal_indices
        .filter((idx) => idx >= 0 && idx < actionable.length)
        .map((idx) => actionable[idx])

      const signalIds = clusterSignals.map((s) => s.id)
      const weightedCount = clusterSignals.reduce(
        (sum, s) => sum + (TIER_WEIGHTS[s.user_tier] || 1),
        0
      )
      const hash = computeClusterHash(cluster.theme, cluster.category)

      return {
        theme: cluster.theme,
        description: cluster.description,
        category: cluster.category,
        severity: cluster.severity,
        signalIds,
        signalCount: signalIds.length,
        weightedCount,
        hash,
      }
    })
  } catch (err) {
    console.error("[clustering] LLM clustering failed, using category fallback:", err)
    return clusterByCategory(actionable)
  }
}

// ============================================================================
// Heuristic Fallback (category-based grouping)
// ============================================================================

function clusterByCategory(signals: FeedbackSignal[]): FeedbackCluster[] {
  const groups = new Map<string, FeedbackSignal[]>()

  for (const signal of signals) {
    const key = signal.category || "uncategorized"
    const group = groups.get(key) || []
    group.push(signal)
    groups.set(key, group)
  }

  return Array.from(groups.entries())
    .filter(([, sigs]) => sigs.length >= 2)
    .map(([category, sigs]) => {
      const weightedCount = sigs.reduce(
        (sum, s) => sum + (TIER_WEIGHTS[s.user_tier] || 1),
        0
      )
      const theme = `Recurring ${category.replace(/_/g, " ")} feedback`
      return {
        theme,
        description: `${sigs.length} signals in the "${category}" category`,
        category,
        severity: computeSeverity(sigs.length, weightedCount, sigs),
        signalIds: sigs.map((s) => s.id),
        signalCount: sigs.length,
        weightedCount,
        hash: computeClusterHash(theme, category),
      }
    })
}

function computeSeverity(
  count: number,
  weightedCount: number,
  signals: FeedbackSignal[]
): "low" | "medium" | "high" | "critical" {
  const hasStudio = signals.some((s) => s.user_tier === "studio")
  if (count >= 10 || hasStudio) return "critical"
  if (count >= 5 || weightedCount >= 15) return "high"
  if (count >= 3) return "medium"
  return "low"
}

// ============================================================================
// Hash & Deduplication
// ============================================================================

/**
 * Generate a deterministic hash for cluster deduplication.
 * Normalizes theme + category to lowercase, strips punctuation,
 * then returns the first 16 hex chars of a SHA-256 hash.
 */
export function computeClusterHash(
  theme: string,
  category: string | null
): string {
  const normalized = `${theme.toLowerCase().trim().replace(/[^\w\s]/g, "")}|${(category || "none").toLowerCase().trim()}`
  return createHash("sha256").update(normalized).digest("hex").slice(0, 16)
}

/**
 * Check if a cluster with the same hash exists within the dedup window.
 * Uses the findInsightByHash DB helper.
 */
export async function isDuplicateCluster(
  hash: string,
  windowHours = 4
): Promise<boolean> {
  // Dynamic import to avoid bundling Supabase in test context
  const { findInsightByHash } = await import("@/lib/db/feedback")
  const existing = await findInsightByHash(hash, windowHours)
  return existing !== null
}

// ============================================================================
// Ranking
// ============================================================================

/**
 * Sort clusters by severity (critical > high > medium > low),
 * then by weighted signal count within the same severity level.
 */
export function rankClustersBySeverity(
  clusters: FeedbackCluster[]
): FeedbackCluster[] {
  return [...clusters].sort((a, b) => {
    const severityDiff =
      (SEVERITY_ORDER[b.severity] || 0) - (SEVERITY_ORDER[a.severity] || 0)
    if (severityDiff !== 0) return severityDiff
    return b.weightedCount - a.weightedCount
  })
}

// ============================================================================
// Orchestrator — Full Pipeline (Phase 74-01)
// ============================================================================

export interface ClusteringResult {
  clustersCreated: number
  clustersDeduped: number
  signalsProcessed: number
  errors: string[]
}

/**
 * Full clustering pipeline: fetch signals → cluster → dedup → write insights.
 * Called by the Trigger.dev daily job.
 *
 * Steps:
 * 1. Fetch negative signals from the past window via getRecentNegativeSignals
 * 2. Cluster signals by theme using LLM (with category fallback)
 * 3. For each cluster, check for existing duplicate insight (hash-based, 4h window)
 * 4. If duplicate: merge signal_ids into existing insight
 * 5. If new: insert as feedback_insight with computed severity
 * 6. Return summary counts
 */
/**
 * Compute severity from tier-weighted impact (Phase 74-01 plan spec).
 * Uses TIER_WEIGHTS: free=1, pro=3, studio=5.
 */
export function computeClusterSeverity(
  signals: FeedbackSignal[]
): "low" | "medium" | "high" | "critical" {
  const weightedImpact = signals.reduce(
    (sum, s) => sum + (TIER_WEIGHTS[s.user_tier as keyof typeof TIER_WEIGHTS] ?? 1),
    0
  )
  const count = signals.length
  if (weightedImpact >= 15 || count >= 10) return "critical"
  if (weightedImpact >= 8 || count >= 5) return "high"
  if (weightedImpact >= 3 || count >= 3) return "medium"
  return "low"
}

/**
 * Find a duplicate open insight via two-pass dedup:
 * 1. Category + 4-hour time window
 * 2. Title word-overlap (Jaccard > 0.5) within 24 hours
 */
export function findDuplicateInsight(
  clusterTheme: string,
  clusterCategory: string | null,
  openInsights: Array<{ title: string; category: string | null; created_at: string }>
): (typeof openInsights)[number] | null {
  const now = Date.now()
  const FOUR_HOURS_MS = 4 * 60 * 60 * 1000
  const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000

  // Pass 1: Category + 4-hour time window
  if (clusterCategory) {
    for (const insight of openInsights) {
      if (
        insight.category === clusterCategory &&
        now - new Date(insight.created_at).getTime() < FOUR_HOURS_MS
      ) {
        return insight
      }
    }
  }

  // Pass 2: Title word-overlap (Jaccard > 0.5) within 24 hours
  for (const insight of openInsights) {
    if (now - new Date(insight.created_at).getTime() < TWENTY_FOUR_HOURS_MS) {
      const similarity = jaccardSimilarity(clusterTheme, insight.title)
      if (similarity > 0.5) {
        return insight
      }
    }
  }

  return null
}

function jaccardSimilarity(a: string, b: string): number {
  const setA = new Set(a.toLowerCase().split(/\W+/).filter(Boolean))
  const setB = new Set(b.toLowerCase().split(/\W+/).filter(Boolean))
  const intersection = new Set([...setA].filter((x) => setB.has(x)))
  const union = new Set([...setA, ...setB])
  return union.size > 0 ? intersection.size / union.size : 0
}

export async function runClusteringPipeline(
  since: string
): Promise<ClusteringResult> {
  // Dynamic imports to keep Trigger.dev bundle clean
  const {
    getRecentNegativeSignals,
    findInsightByHash,
    upsertInsightWithSignals,
  } = await import("@/lib/db/feedback")

  const result: ClusteringResult = {
    clustersCreated: 0,
    clustersDeduped: 0,
    signalsProcessed: 0,
    errors: [],
  }

  // Step 1: Fetch recent negative signals
  const signals = await getRecentNegativeSignals(since)
  result.signalsProcessed = signals.length

  if (signals.length === 0) {
    return result
  }

  // Step 2: Cluster by theme
  const clusters = await clusterFeedbackSignals(signals as FeedbackSignal[])

  if (clusters.length === 0) {
    return result
  }

  // Step 3-5: Process each cluster
  const now = new Date().toISOString()

  for (const cluster of clusters) {
    try {
      // Check for duplicate via hash-based matching (4h window)
      const existing = await findInsightByHash(cluster.hash, 4)

      if (existing) {
        // Merge signal_ids into existing insight
        const mergedIds = [
          ...new Set([...existing.signal_ids, ...cluster.signalIds]),
        ]
        const { updateInsightSignals } = await import("@/lib/db/feedback")
        await updateInsightSignals(existing.id, mergedIds, mergedIds.length)
        result.clustersDeduped++
      } else {
        // Insert new insight
        await upsertInsightWithSignals({
          insight_type: "cluster",
          title: cluster.theme,
          description: cluster.description,
          category: cluster.category,
          severity: cluster.severity,
          signal_count: cluster.signalCount,
          signal_ids: cluster.signalIds,
          status: "new",
          linear_issue_id: null,
          actioned_at: null,
          resolved_at: null,
          metadata: {
            source: "daily-clustering",
            run_at: now,
            weighted_count: cluster.weightedCount,
          },
          cluster_embedding_hash: cluster.hash,
          source_window_start: since,
          source_window_end: now,
        })
        result.clustersCreated++
      }
    } catch (err) {
      const msg = `Failed to process cluster "${cluster.theme}": ${err}`
      console.error("[clustering]", msg)
      result.errors.push(msg)
    }
  }

  return result
}
