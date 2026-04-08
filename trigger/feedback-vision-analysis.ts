/**
 * Scheduled task: Feedback Vision Analysis
 *
 * AI-4115: Processes feedback signals that have media attachments.
 * Runs every 15 minutes to analyze pending images/screenshots via
 * vision-capable LLMs, then stores the analysis back on the signal.
 *
 * The analysis text is later included in the daily clustering job
 * to surface visual feedback patterns alongside text feedback.
 */
import { schedules, logger } from "@trigger.dev/sdk/v3";

// ── Types ───────────────────────────────────────────────────────
interface VisionProcessingResult {
  signalsProcessed: number;
  signalsAnalyzed: number;
  signalsFailed: number;
  errors: string[];
}

// ── Main Cron Task ──────────────────────────────────────────────
export const feedbackVisionAnalysisJob = schedules.task({
  id: "feedback-vision-analysis",
  cron: "*/15 * * * *", // Every 15 minutes
  maxDuration: 180, // 3 minutes
  retry: {
    maxAttempts: 2,
    minTimeoutInMs: 5000,
    maxTimeoutInMs: 30000,
    factor: 2,
  },
  run: async (payload) => {
    logger.log("Feedback vision analysis job started", {
      timestamp: payload.timestamp,
    });

    const result: VisionProcessingResult = {
      signalsProcessed: 0,
      signalsAnalyzed: 0,
      signalsFailed: 0,
      errors: [],
    };

    try {
      const { getUnprocessedMediaSignals, updateMediaProcessingStatus } =
        await import("@/lib/db/feedback");
      const { analyzeMediaFeedback } =
        await import("@/lib/feedback/vision-processor");

      // Fetch signals with pending media
      const signals = await getUnprocessedMediaSignals(50);
      logger.log(`Found ${signals.length} signals with pending media`);

      if (signals.length === 0) {
        return result;
      }

      for (const signal of signals) {
        result.signalsProcessed++;

        try {
          // Mark as processing
          await updateMediaProcessingStatus(signal.id, "processing");

          // Run vision analysis
          const analysis = await analyzeMediaFeedback(
            signal.media_urls || [],
            signal.media_types || [],
            { comment: signal.comment, category: signal.category }
          );

          if (analysis) {
            await updateMediaProcessingStatus(
              signal.id,
              "completed",
              analysis as unknown as Record<string, unknown>
            );
            result.signalsAnalyzed++;
            logger.log(`Analyzed signal ${signal.id}: ${analysis.summary.slice(0, 100)}`);
          } else {
            // No analyzable images (e.g., all video/audio)
            await updateMediaProcessingStatus(signal.id, "completed", null);
            result.signalsAnalyzed++;
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          logger.error(`Failed to analyze signal ${signal.id}: ${msg}`);
          result.errors.push(`Signal ${signal.id}: ${msg}`);
          result.signalsFailed++;

          try {
            await updateMediaProcessingStatus(signal.id, "failed");
          } catch {
            // Swallow — the signal will be retried next run
          }
        }
      }

      logger.log("Feedback vision analysis job complete", result as unknown as Record<string, unknown>);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error(`Vision analysis job failed: ${msg}`);
      result.errors.push(msg);
    }

    return result;
  },
});
