/**
 * CRUD operations for the founder_reports table
 *
 * Follows the pattern from lib/db/subscriptions.ts:
 * - Uses sql tagged template from lib/db/supabase-sql
 * - Snake_case SQL columns → camelCase TypeScript
 * - Service client for writes (bypasses RLS)
 * - User-scoped reads rely on RLS via the sql client
 */

import { sql } from "./supabase-sql"
import type { FounderReport, ReportData } from "@/types/report"

/** Raw row shape from founder_reports table */
interface FounderReportRow {
  id: string
  user_id: string
  version: number
  status: string
  report_data: ReportData
  step_snapshot: Record<string, string>
  pdf_blob_url: string | null
  pdf_size_bytes: number | null
  email_sent_at: string | null
  email_status: string | null
  model_used: string | null
  generation_ms: number | null
  generated_at: string
}

/**
 * Get the latest (highest version) report for a user.
 * Uses RLS — only returns reports owned by the authenticated user.
 */
export async function getLatestReport(userId: string): Promise<FounderReport | null> {
  try {
    const result = await sql`
      SELECT * FROM founder_reports WHERE user_id = ${userId} ORDER BY version DESC LIMIT 1
    `

    if (!result || result.length === 0) return null

    const data = result[0] as unknown as FounderReportRow
    return transformRow(data)
  } catch (error) {
    console.error("[getLatestReport] Error:", error)
    return null
  }
}

/**
 * Get a single report by its ID.
 * Uses RLS — only returns the report if owned by the authenticated user.
 */
export async function getReportById(reportId: string): Promise<FounderReport | null> {
  try {
    const result = await sql`
      SELECT * FROM founder_reports WHERE id = ${reportId} LIMIT 1
    `

    if (!result || result.length === 0) return null

    const data = result[0] as unknown as FounderReportRow
    return transformRow(data)
  } catch (error) {
    console.error("[getReportById] Error:", error)
    return null
  }
}

/**
 * Create a new founder report.
 * Uses service client (via sql) to bypass RLS for server-side writes.
 */
export async function createReport(params: {
  userId: string
  version: number
  reportData: ReportData
  stepSnapshot: Record<string, string>
  status?: string
}): Promise<FounderReport> {
  const result = await sql`
    INSERT INTO founder_reports (
      user_id,
      version,
      status,
      report_data,
      step_snapshot
    ) VALUES (
      ${params.userId},
      ${params.version},
      ${params.status || "pending"},
      ${JSON.stringify(params.reportData)},
      ${JSON.stringify(params.stepSnapshot)}
    )
  `

  const data = result[0] as unknown as FounderReportRow
  return transformRow(data)
}

/**
 * Update a report's status and optional metadata fields.
 * Uses service client for server-side writes.
 */
export async function updateReportStatus(
  reportId: string,
  updates: {
    status: string
    pdfBlobUrl?: string
    pdfSizeBytes?: number
    emailSentAt?: Date
    emailStatus?: string
    modelUsed?: string
    generationMs?: number
  }
): Promise<void> {
  try {
    await sql`
      UPDATE founder_reports
      SET status = ${updates.status},
          pdf_blob_url = COALESCE(${updates.pdfBlobUrl ?? null}, pdf_blob_url),
          pdf_size_bytes = COALESCE(${updates.pdfSizeBytes ?? null}, pdf_size_bytes),
          email_sent_at = COALESCE(${updates.emailSentAt?.toISOString() ?? null}, email_sent_at),
          email_status = COALESCE(${updates.emailStatus ?? null}, email_status),
          model_used = COALESCE(${updates.modelUsed ?? null}, model_used),
          generation_ms = COALESCE(${updates.generationMs ?? null}, generation_ms)
      WHERE id = ${reportId}
    `
  } catch (error) {
    console.error("[updateReportStatus] Error:", error)
    throw error
  }
}

/**
 * Get the next version number for a user's reports.
 * Returns 1 if no reports exist, otherwise MAX(version) + 1.
 */
export async function getNextVersion(userId: string): Promise<number> {
  try {
    const result = await sql`
      SELECT version FROM founder_reports WHERE user_id = ${userId} ORDER BY version DESC LIMIT 1
    `

    if (!result || result.length === 0) return 1

    const row = result[0] as unknown as { version: number }
    return row.version + 1
  } catch (error) {
    console.error("[getNextVersion] Error:", error)
    return 1
  }
}

/** Transform a snake_case DB row to camelCase TypeScript */
function transformRow(data: FounderReportRow): FounderReport {
  return {
    id: data.id,
    userId: data.user_id,
    version: data.version,
    status: data.status as FounderReport["status"],
    reportData: data.report_data,
    stepSnapshot: data.step_snapshot,
    pdfBlobUrl: data.pdf_blob_url,
    pdfSizeBytes: data.pdf_size_bytes,
    emailSentAt: data.email_sent_at,
    emailStatus: data.email_status,
    modelUsed: data.model_used,
    generationMs: data.generation_ms,
    generatedAt: data.generated_at,
  }
}
