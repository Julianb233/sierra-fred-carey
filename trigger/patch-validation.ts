/**
 * Scheduled task: Patch Validation Daily Check
 *
 * Phase 76 REQ-R5: Runs daily to check deployed patches whose
 * 2-week validation window has expired and finalize their tracking.
 *
 * For patches with improvement > 0, marks source insight as 'resolved'.
 * For patches with no improvement, logs for admin review.
 */
import { schedules, logger } from "@trigger.dev/sdk/v3"

interface ValidationResult {
  patchesChecked: number
  patchesFinalized: number
  patchesImproved: number
  errors: string[]
}

export const patchValidationJob = schedules.task({
  id: "patch-validation-daily",
  cron: "0 7 * * *", // 7 AM UTC daily (1 hour after clustering)
  maxDuration: 120, // 2 minutes
  retry: {
    maxAttempts: 2,
    minTimeoutInMs: 5000,
    maxTimeoutInMs: 15000,
    factor: 2,
  },
  run: async (payload) => {
    logger.log("Patch validation job started", {
      timestamp: payload.timestamp,
    })

    const result: ValidationResult = {
      patchesChecked: 0,
      patchesFinalized: 0,
      patchesImproved: 0,
      errors: [],
    }

    try {
      const { processExpiredTracking } =
        await import("@/lib/feedback/patch-validation")

      // processExpiredTracking already handles:
      // 1. Finding patches with expired tracking windows
      // 2. Computing improvement for each
      // 3. Storing final metrics
      // 4. Marking insights resolved on positive improvement
      const validationResults = await processExpiredTracking()

      result.patchesChecked = validationResults.length
      result.patchesFinalized = validationResults.length
      result.patchesImproved = validationResults.filter((r) => r.improved).length

      if (validationResults.length === 0) {
        logger.log("No patches with expired tracking windows")
      } else {
        for (const r of validationResults) {
          logger.log(`Patch ${r.patchId} (${r.topic}): ${r.improved ? 'IMPROVED' : 'no improvement'}`, {
            patchId: r.patchId,
            topic: r.topic,
            thumbsBefore: r.thumbsBefore,
            thumbsAfter: r.thumbsAfter,
            improvement: r.improvement,
            sampleSize: r.sampleSize,
          })
        }
      }

      logger.log("Patch validation job complete", result as unknown as Record<string, unknown>)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      logger.error(`Patch validation job failed: ${msg}`)
      result.errors.push(msg)
    }

    return result
  },
})
