/**
 * Trigger.dev Task: Generate Founder Report PDF
 *
 * Orchestrates the PDF generation pipeline:
 *   1. Mark report as "generating"
 *   2. Build PDF document via branded template
 *   3. Render to buffer via @react-pdf/renderer
 *   4. Upload to Vercel Blob at versioned path
 *   5. Update founder_reports row with blob URL and status
 *
 * Triggered on-demand by the report generation API route.
 * Client polls for status — this task does NOT use triggerAndWait.
 */

import { task, logger } from "@trigger.dev/sdk/v3"
import { renderToBuffer } from "@react-pdf/renderer"
import { put } from "@vercel/blob"
import { updateReportStatus } from "@/lib/db/founder-reports"
import { buildReportDocument } from "@/lib/report/pdf-template"
import type { ReportData } from "@/types/report"

export const generateFounderReportPdf = task({
  id: "generate-founder-report-pdf",
  maxDuration: 120,
  retry: {
    maxAttempts: 2,
    minTimeoutInMs: 5000,
    maxTimeoutInMs: 30000,
    factor: 2,
  },
  run: async (payload: {
    reportId: string
    userId: string
    version: number
    reportData: ReportData
  }) => {
    const { reportId, userId, version, reportData } = payload
    const startTime = Date.now()

    try {
      // Step 1: Mark report as generating
      await updateReportStatus(reportId, { status: "generating" })
      logger.log("Report marked as generating", { reportId })

      // Step 2: Build the PDF document tree
      const doc = buildReportDocument(reportData)

      // Step 3: Render to PDF buffer
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const buffer = await renderToBuffer(doc as any)
      logger.log("PDF rendered", { bytes: buffer.byteLength })

      // Step 4: Upload to Vercel Blob at versioned path
      const blobPath = `founder-reports/${userId}/v${version}-report.pdf`
      const blob = await put(blobPath, buffer, {
        access: "public",
        addRandomSuffix: false,
        contentType: "application/pdf",
      })
      logger.log("PDF uploaded to Blob", { url: blob.url, path: blobPath })

      // Step 5: Update DB with completion status
      const generationMs = Date.now() - startTime
      await updateReportStatus(reportId, {
        status: "complete",
        pdfBlobUrl: blob.url,
        pdfSizeBytes: buffer.byteLength,
        generationMs,
      })

      logger.log("PDF generation complete", {
        url: blob.url,
        sizeBytes: buffer.byteLength,
        generationMs,
      })

      return {
        pdfUrl: blob.url,
        sizeBytes: buffer.byteLength,
        generationMs,
      }
    } catch (error) {
      logger.error("PDF generation failed", {
        reportId,
        error: String(error),
      })

      // Best-effort: mark as failed so UI can show appropriate status
      try {
        await updateReportStatus(reportId, { status: "failed" })
      } catch (updateError) {
        logger.error("Failed to mark report as failed", {
          reportId,
          error: String(updateError),
        })
      }

      // Re-throw so Trigger.dev retry kicks in
      throw error
    }
  },
})
