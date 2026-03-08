/**
 * Scheduled task: Feedback Intelligence Daily Job
 *
 * Phase 74: Runs daily at 6 AM UTC to:
 * 1. Fetch unprocessed feedback signals
 * 2. Cluster them by theme using AI
 * 3. Deduplicate against existing insights (4-hour window)
 * 4. Write new insights to feedback_insights table
 * 5. Mark processed signals
 *
 * Uses the same Trigger.dev v3 pattern as sahara-whatsapp-monitor.ts.
 */
import { schedules, logger } from "@trigger.dev/sdk/v3";

// ── Types ───────────────────────────────────────────────────────
interface IntelligenceResult {
  signalsProcessed: number;
  clustersFound: number;
  newInsights: number;
  mergedInsights: number;
  errors: string[];
}

// ── Main Cron Task ──────────────────────────────────────────────
export const feedbackIntelligenceJob = schedules.task({
  id: "feedback-intelligence-daily",
  cron: "0 6 * * *", // 6 AM UTC daily
  maxDuration: 300, // 5 minutes
  retry: {
    maxAttempts: 2,
    minTimeoutInMs: 5000,
    maxTimeoutInMs: 30000,
    factor: 2,
  },
  run: async (payload) => {
    logger.log("Feedback intelligence job started", {
      timestamp: payload.timestamp,
    });

    const result: IntelligenceResult = {
      signalsProcessed: 0,
      clustersFound: 0,
      newInsights: 0,
      mergedInsights: 0,
      errors: [],
    };

    try {
      // Dynamic imports — avoid bundling Supabase/AI SDK at module level
      const { getUnprocessedSignals, markSignalsProcessed, upsertInsightWithSignals } =
        await import("@/lib/db/feedback");
      const { clusterFeedbackSignals, rankClustersBySeverity } =
        await import("@/lib/feedback/clustering");

      // Step 1: Fetch unprocessed signals
      const signals = await getUnprocessedSignals(500);
      logger.log(`Fetched ${signals.length} unprocessed signals`);

      if (signals.length < 3) {
        logger.log("Insufficient signals for clustering (< 3), exiting early");
        return result;
      }

      // Step 2: Cluster signals by theme
      const clusters = await clusterFeedbackSignals(signals);
      result.clustersFound = clusters.length;
      logger.log(`Found ${clusters.length} clusters`);

      if (clusters.length === 0) {
        // Still mark signals as processed to avoid re-processing
        const allIds = signals.map((s) => s.id);
        await markSignalsProcessed(allIds);
        result.signalsProcessed = allIds.length;
        return result;
      }

      // Step 3: Rank clusters by severity
      const ranked = rankClustersBySeverity(clusters);

      // Step 4: Write insights for each cluster
      const processedSignalIds = new Set<string>();

      for (const cluster of ranked) {
        try {
          // Compute source window from signal timestamps
          const clusterSignalTimestamps = signals
            .filter((s) => cluster.signalIds.includes(s.id))
            .map((s) => new Date(s.created_at).getTime());

          const sourceWindowStart = clusterSignalTimestamps.length > 0
            ? new Date(Math.min(...clusterSignalTimestamps)).toISOString()
            : new Date().toISOString();
          const sourceWindowEnd = clusterSignalTimestamps.length > 0
            ? new Date(Math.max(...clusterSignalTimestamps)).toISOString()
            : new Date().toISOString();

          const { merged } = await upsertInsightWithSignals({
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
              clusteredAt: new Date().toISOString(),
              weightedCount: cluster.weightedCount,
              model: "free-structured",
            },
            cluster_embedding_hash: cluster.hash,
            source_window_start: sourceWindowStart,
            source_window_end: sourceWindowEnd,
          });

          if (merged) {
            result.mergedInsights++;
          } else {
            result.newInsights++;
          }

          // Track which signals were included in clusters
          for (const id of cluster.signalIds) {
            processedSignalIds.add(id);
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          logger.error(`Failed to write insight for cluster "${cluster.theme}": ${msg}`);
          result.errors.push(`Cluster "${cluster.theme}": ${msg}`);
        }
      }

      // Step 5: Mark all fetched signals as processed (even those not in clusters)
      const allIds = signals.map((s) => s.id);
      await markSignalsProcessed(allIds);
      result.signalsProcessed = allIds.length;

      logger.log("Feedback intelligence job complete", result as unknown as Record<string, unknown>);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error(`Feedback intelligence job failed: ${msg}`);
      result.errors.push(msg);
    }

    return result;
  },
});
