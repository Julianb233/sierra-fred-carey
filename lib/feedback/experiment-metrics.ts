/**
 * Feedback metrics aggregation per variant for A/B experiments.
 *
 * Provides thumbs-up ratio, sentiment scores, and session completion rates
 * per variant, with statistical significance testing via chi-squared and t-test.
 */

import { sql } from "@/lib/db/supabase-sql"
import {
  chiSquaredTest,
  welchTTest,
  meetsMinimumSampleSize,
} from "@/lib/statistics/significance"
import { logger } from "@/lib/logger"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface VariantFeedbackMetrics {
  variantId: string
  variantName: string
  experimentName: string
  // Thumbs metrics
  thumbsUpCount: number
  thumbsDownCount: number
  thumbsRatio: number // thumbsUp / (thumbsUp + thumbsDown), 0-1
  // Sentiment metrics
  avgSentimentScore: number // -1 to 1
  sentimentStdDev: number
  sentimentSampleSize: number
  // Session metrics
  totalSessions: number
  completedSessions: number
  sessionCompletionRate: number // completed / total, 0-1
  // Feedback volume
  totalFeedbackSignals: number
}

export interface ExperimentFeedbackComparison {
  experimentName: string
  variants: VariantFeedbackMetrics[]
  // Significance results
  thumbsSignificance: {
    chiSquared: number
    pValue: number
    significant: boolean
    meetsMinimumSample: boolean
  } | null
  sentimentSignificance: {
    tStatistic: number
    pValue: number
    significant: boolean
    meanDifference: number
    confidenceInterval: [number, number]
    meetsMinimumSample: boolean
  } | null
  sessionCompletionSignificance: {
    chiSquared: number
    pValue: number
    significant: boolean
    meetsMinimumSample: boolean
  } | null
  // Winner detection
  feedbackWinner: string | null
  winnerConfidence: number | null
}

// ---------------------------------------------------------------------------
// Functions
// ---------------------------------------------------------------------------

/**
 * Get feedback metrics for a single variant.
 */
export async function getVariantFeedbackMetrics(
  variantId: string
): Promise<VariantFeedbackMetrics | null> {
  try {
    const result = await sql`
      SELECT
        fs.variant_id as "variantId",
        v.variant_name as "variantName",
        e.name as "experimentName",
        COUNT(*) FILTER (WHERE fs.signal_type = 'thumbs_up') as "thumbsUpCount",
        COUNT(*) FILTER (WHERE fs.signal_type = 'thumbs_down') as "thumbsDownCount",
        COUNT(*) as "totalFeedbackSignals",
        AVG(fs.sentiment_score) FILTER (WHERE fs.sentiment_score IS NOT NULL) as "avgSentimentScore",
        STDDEV(fs.sentiment_score) FILTER (WHERE fs.sentiment_score IS NOT NULL) as "sentimentStdDev",
        COUNT(*) FILTER (WHERE fs.sentiment_score IS NOT NULL) as "sentimentSampleSize",
        COUNT(DISTINCT fs.session_id) as "totalSessions",
        COUNT(DISTINCT fs.session_id) FILTER (
          WHERE fs.session_id IN (
            SELECT id FROM feedback_sessions WHERE ended_at IS NOT NULL AND sentiment_trend != 'spike_negative'
          )
        ) as "completedSessions"
      FROM feedback_signals fs
      JOIN ab_variants v ON fs.variant_id = v.id
      JOIN ab_experiments e ON v.experiment_id = e.id
      WHERE fs.variant_id = ${variantId}
      GROUP BY fs.variant_id, v.variant_name, e.name
    `

    if (result.length === 0) return null

    const row = result[0] as Record<string, string>
    const thumbsUp = parseInt(row.thumbsUpCount, 10) || 0
    const thumbsDown = parseInt(row.thumbsDownCount, 10) || 0
    const totalSessions = parseInt(row.totalSessions, 10) || 0
    const completedSessions = parseInt(row.completedSessions, 10) || 0

    return {
      variantId: row.variantId,
      variantName: row.variantName,
      experimentName: row.experimentName,
      thumbsUpCount: thumbsUp,
      thumbsDownCount: thumbsDown,
      thumbsRatio: thumbsUp + thumbsDown > 0 ? thumbsUp / (thumbsUp + thumbsDown) : 0,
      avgSentimentScore: parseFloat(row.avgSentimentScore) || 0,
      sentimentStdDev: parseFloat(row.sentimentStdDev) || 0,
      sentimentSampleSize: parseInt(row.sentimentSampleSize, 10) || 0,
      totalSessions,
      completedSessions,
      sessionCompletionRate: totalSessions > 0 ? completedSessions / totalSessions : 0,
      totalFeedbackSignals: parseInt(row.totalFeedbackSignals, 10) || 0,
    }
  } catch (error) {
    logger.log(`[experiment-metrics] Error getting variant feedback metrics: ${error}`)
    return null
  }
}

/**
 * Batch query for feedback metrics across multiple variants.
 */
export async function getVariantFeedbackMetricsBatch(
  variantIds: string[]
): Promise<Map<string, VariantFeedbackMetrics>> {
  const result = new Map<string, VariantFeedbackMetrics>()
  if (variantIds.length === 0) return result

  try {
    const rows = await sql`
      SELECT
        fs.variant_id as "variantId",
        v.variant_name as "variantName",
        e.name as "experimentName",
        COUNT(*) FILTER (WHERE fs.signal_type = 'thumbs_up') as "thumbsUpCount",
        COUNT(*) FILTER (WHERE fs.signal_type = 'thumbs_down') as "thumbsDownCount",
        COUNT(*) as "totalFeedbackSignals",
        AVG(fs.sentiment_score) FILTER (WHERE fs.sentiment_score IS NOT NULL) as "avgSentimentScore",
        STDDEV(fs.sentiment_score) FILTER (WHERE fs.sentiment_score IS NOT NULL) as "sentimentStdDev",
        COUNT(*) FILTER (WHERE fs.sentiment_score IS NOT NULL) as "sentimentSampleSize",
        COUNT(DISTINCT fs.session_id) as "totalSessions",
        COUNT(DISTINCT fs.session_id) FILTER (
          WHERE fs.session_id IN (
            SELECT id FROM feedback_sessions WHERE ended_at IS NOT NULL AND sentiment_trend != 'spike_negative'
          )
        ) as "completedSessions"
      FROM feedback_signals fs
      JOIN ab_variants v ON fs.variant_id = v.id
      JOIN ab_experiments e ON v.experiment_id = e.id
      WHERE fs.variant_id = ANY(${variantIds})
      GROUP BY fs.variant_id, v.variant_name, e.name
    `

    for (const row of rows as Array<Record<string, string>>) {
      const thumbsUp = parseInt(row.thumbsUpCount, 10) || 0
      const thumbsDown = parseInt(row.thumbsDownCount, 10) || 0
      const totalSessions = parseInt(row.totalSessions, 10) || 0
      const completedSessions = parseInt(row.completedSessions, 10) || 0

      result.set(row.variantId, {
        variantId: row.variantId,
        variantName: row.variantName,
        experimentName: row.experimentName,
        thumbsUpCount: thumbsUp,
        thumbsDownCount: thumbsDown,
        thumbsRatio: thumbsUp + thumbsDown > 0 ? thumbsUp / (thumbsUp + thumbsDown) : 0,
        avgSentimentScore: parseFloat(row.avgSentimentScore) || 0,
        sentimentStdDev: parseFloat(row.sentimentStdDev) || 0,
        sentimentSampleSize: parseInt(row.sentimentSampleSize, 10) || 0,
        totalSessions,
        completedSessions,
        sessionCompletionRate: totalSessions > 0 ? completedSessions / totalSessions : 0,
        totalFeedbackSignals: parseInt(row.totalFeedbackSignals, 10) || 0,
      })
    }
  } catch (error) {
    logger.log(`[experiment-metrics] Error batch-querying variant feedback: ${error}`)
  }

  return result
}

/**
 * Full feedback comparison for an experiment.
 * Runs chi-squared on thumbs and session completion, t-test on sentiment.
 */
export async function getExperimentFeedbackComparison(
  experimentName: string
): Promise<ExperimentFeedbackComparison> {
  const empty: ExperimentFeedbackComparison = {
    experimentName,
    variants: [],
    thumbsSignificance: null,
    sentimentSignificance: null,
    sessionCompletionSignificance: null,
    feedbackWinner: null,
    winnerConfidence: null,
  }

  try {
    // Get all variant IDs for this experiment
    const variantsResult = await sql`
      SELECT v.id, v.variant_name as "variantName"
      FROM ab_variants v
      JOIN ab_experiments e ON v.experiment_id = e.id
      WHERE e.name = ${experimentName}
      ORDER BY v.variant_name
    `

    if (variantsResult.length < 2) return empty

    const variantIds = variantsResult.map((v) => String(v.id))
    const metricsMap = await getVariantFeedbackMetricsBatch(variantIds)
    const variants = Array.from(metricsMap.values())

    if (variants.length < 2) return { ...empty, variants }

    // Identify control and treatment
    const control = variants.find((v) => v.variantName === "control") || variants[0]
    const treatment = variants.find((v) => v.variantName !== "control") || variants[1]

    // Chi-squared test on thumbs ratio
    let thumbsSignificance: ExperimentFeedbackComparison["thumbsSignificance"] = null
    const thumbsTotalControl = control.thumbsUpCount + control.thumbsDownCount
    const thumbsTotalTreatment = treatment.thumbsUpCount + treatment.thumbsDownCount
    if (thumbsTotalControl > 0 && thumbsTotalTreatment > 0) {
      const chi2 = chiSquaredTest(
        [control.thumbsUpCount, control.thumbsDownCount],
        [treatment.thumbsUpCount, treatment.thumbsDownCount]
      )
      thumbsSignificance = {
        chiSquared: chi2.chiSquared,
        pValue: chi2.pValue,
        significant: chi2.significant,
        meetsMinimumSample: meetsMinimumSampleSize(
          control.totalSessions,
          treatment.totalSessions
        ),
      }
    }

    // Welch's t-test on sentiment scores
    let sentimentSignificance: ExperimentFeedbackComparison["sentimentSignificance"] = null
    if (control.sentimentSampleSize > 1 && treatment.sentimentSampleSize > 1) {
      const tTest = welchTTest(
        {
          mean: control.avgSentimentScore,
          variance: control.sentimentStdDev ** 2,
          n: control.sentimentSampleSize,
        },
        {
          mean: treatment.avgSentimentScore,
          variance: treatment.sentimentStdDev ** 2,
          n: treatment.sentimentSampleSize,
        }
      )
      sentimentSignificance = {
        tStatistic: tTest.tStatistic,
        pValue: tTest.pValue,
        significant: tTest.significant,
        meanDifference: tTest.meanDifference,
        confidenceInterval: tTest.confidenceInterval,
        meetsMinimumSample: meetsMinimumSampleSize(
          control.sentimentSampleSize,
          treatment.sentimentSampleSize
        ),
      }
    }

    // Chi-squared test on session completion
    let sessionCompletionSignificance: ExperimentFeedbackComparison["sessionCompletionSignificance"] = null
    if (control.totalSessions > 0 && treatment.totalSessions > 0) {
      const chi2 = chiSquaredTest(
        [control.completedSessions, control.totalSessions - control.completedSessions],
        [treatment.completedSessions, treatment.totalSessions - treatment.completedSessions]
      )
      sessionCompletionSignificance = {
        chiSquared: chi2.chiSquared,
        pValue: chi2.pValue,
        significant: chi2.significant,
        meetsMinimumSample: meetsMinimumSampleSize(
          control.totalSessions,
          treatment.totalSessions
        ),
      }
    }

    // Determine feedback winner
    let feedbackWinner: string | null = null
    let winnerConfidence: number | null = null

    const anySignificant =
      thumbsSignificance?.significant ||
      sentimentSignificance?.significant ||
      sessionCompletionSignificance?.significant

    if (anySignificant) {
      // Score: 0.4 * thumbsRatio + 0.4 * normalizedSentiment + 0.2 * sessionCompletion
      const scores = variants.map((v) => ({
        name: v.variantName,
        score:
          0.4 * v.thumbsRatio +
          0.4 * ((v.avgSentimentScore + 1) / 2) + // normalize -1..1 to 0..1
          0.2 * v.sessionCompletionRate,
      }))
      scores.sort((a, b) => b.score - a.score)
      feedbackWinner = scores[0].name

      // Best p-value across significant tests
      const pValues = [
        thumbsSignificance?.significant ? thumbsSignificance.pValue : null,
        sentimentSignificance?.significant ? sentimentSignificance.pValue : null,
        sessionCompletionSignificance?.significant ? sessionCompletionSignificance.pValue : null,
      ].filter((p): p is number => p !== null)

      winnerConfidence = pValues.length > 0 ? (1 - Math.min(...pValues)) * 100 : null
    }

    return {
      experimentName,
      variants,
      thumbsSignificance,
      sentimentSignificance,
      sessionCompletionSignificance,
      feedbackWinner,
      winnerConfidence,
    }
  } catch (error) {
    logger.log(`[experiment-metrics] Error comparing experiment ${experimentName}: ${error}`)
    return empty
  }
}
