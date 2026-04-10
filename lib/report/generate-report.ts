/**
 * Report Generation Orchestrator
 *
 * Orchestrates the full report pipeline:
 *   1. Aggregate founder answers from journey progress
 *   2. Synthesize via AI into structured ReportData
 *   3. Build step snapshot for version diffing
 *   4. Create DB record (pending status)
 *   5. Trigger background PDF generation via Trigger.dev
 *
 * Returns immediately with reportId so client can poll for status.
 */

import { aggregateReportData } from "@/lib/report/aggregator"
import { synthesizeReport } from "@/lib/report/synthesizer"
import {
  createReport,
  getNextVersion,
  updateReportStatus,
} from "@/lib/db/founder-reports"
import { generateFounderReportPdf } from "@/trigger/generate-founder-report-pdf"

// ============================================================================
// Types
// ============================================================================

export interface GenerateReportResult {
  reportId: string
  version: number
  status: "pending"
}

// ============================================================================
// Main orchestrator
// ============================================================================

/**
 * Generate a Founder Journey Report for the given user.
 *
 * Aggregates journey answers, synthesizes via AI, creates a DB record,
 * then triggers background PDF generation. Returns immediately with
 * the reportId so the client can poll for completion.
 */
export async function generateReport(
  userId: string
): Promise<GenerateReportResult> {
  // Step 1: Aggregate founder answers from oases_progress + profile
  const aggregated = await aggregateReportData(userId)

  if (aggregated.totalAnswered === 0) {
    throw new Error("No journey data found for report generation")
  }

  // Step 2: Synthesize via AI into structured ReportData
  const synthesis = await synthesizeReport(aggregated)

  // Step 3: Build step snapshot for version diffing
  // Maps each report step ID to its answer text at generation time
  const stepSnapshot: Record<string, string> = {}
  for (const section of aggregated.sections) {
    for (const step of section.steps) {
      if (step.answer) {
        stepSnapshot[step.stepId] = step.answer
      }
    }
  }

  // Step 4: Get next version number (1 for first report, increments)
  const version = await getNextVersion(userId)

  // Step 5: Create DB record with pending status
  const report = await createReport({
    userId,
    version,
    reportData: synthesis.reportData,
    stepSnapshot,
    status: "pending",
  })

  // Step 6: Trigger background PDF generation via Trigger.dev
  try {
    await generateFounderReportPdf.trigger({
      reportId: report.id,
      userId,
      version,
      reportData: synthesis.reportData,
    })
  } catch (triggerError) {
    // If trigger fails after DB creation, mark report as failed and re-throw
    console.error("[generateReport] Trigger failed:", triggerError)
    try {
      await updateReportStatus(report.id, { status: "failed" })
    } catch (statusError) {
      console.error("[generateReport] Failed to mark report as failed:", statusError)
    }
    throw triggerError
  }

  return {
    reportId: report.id,
    version,
    status: "pending",
  }
}
