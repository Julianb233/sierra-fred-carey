/**
 * Scheduled task: Feedback Clustering & Pattern Detection
 *
 * Runs daily at 6 AM UTC to:
 * 1. Fetch negative feedback signals from the past 24 hours
 * 2. Use AI to cluster signals by theme
 * 3. Deduplicate against existing open insights
 * 4. Write new clusters to feedback_insights table
 *
 * Feeds into: admin "Top Issues This Week" dashboard, Linear auto-triage (74-02)
 */
import { schedules, logger } from "@trigger.dev/sdk/v3";

export const feedbackClusteringJob = schedules.task({
  id: "feedback-clustering-daily",
  // Daily at 6 AM UTC (11 PM PT previous day)
  cron: "0 6 * * *",
  maxDuration: 300, // 5 minutes
  retry: {
    maxAttempts: 2,
    minTimeoutInMs: 5000,
    maxTimeoutInMs: 30000,
    factor: 2,
  },
  run: async (payload) => {
    logger.log("Feedback clustering job started", {
      timestamp: payload.timestamp,
    });

    try {
      // Dynamic import to avoid bundling issues in Trigger.dev
      const { runClusteringPipeline } = await import(
        "@/lib/feedback/clustering"
      );

      // Process signals from the last 24 hours
      const since = new Date();
      since.setHours(since.getHours() - 24);

      const result = await runClusteringPipeline(since.toISOString());

      logger.log("Feedback clustering job completed", {
        clustersCreated: result.clustersCreated,
        clustersDeduped: result.clustersDeduped,
        signalsProcessed: result.signalsProcessed,
        errors: result.errors,
      });

      if (result.errors.length > 0) {
        logger.warn("Clustering completed with errors", {
          errorCount: result.errors.length,
          errors: result.errors,
        });
      }

      return result;
    } catch (err) {
      const msg = `Feedback clustering job failed: ${err}`;
      logger.error(msg);
      throw err; // Let Trigger.dev handle retries
    }
  },
});
