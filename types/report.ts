/**
 * Types for v9.0 Founder Journey Report
 *
 * These types describe the JSONB structure stored in founder_reports.report_data
 * and the full row shape returned by CRUD queries.
 */

/** A single section within a founder report */
export interface ReportSection {
  /** Unique section identifier (e.g. "market-validation", "financials") */
  id: string
  /** Display title for this section */
  title: string
  /** AI-synthesized narrative for this section */
  synthesized: string
  /** Key highlights / bullet points */
  highlights: string[]
  /** Journey step IDs that contributed data to this section */
  stepIds: string[]
}

/** The full report payload stored as JSONB in report_data */
export interface ReportData {
  /** One-paragraph executive summary of the founder's journey */
  executiveSummary: string
  /** Founder's display name */
  founderName: string
  /** Company / startup name */
  companyName: string
  /** ISO timestamp when the report was generated */
  generatedAt: string
  /** Ordered array of report sections */
  sections: ReportSection[]
  /** FRED mentor sign-off message */
  fredSignoff: string
}

/** A personalized next-step recommendation from FRED */
export interface BonusStep {
  title: string
  description: string
  rationale: string
}

/** Full output from the synthesis pipeline (superset of ReportData) */
export interface SynthesisOutput extends ReportData {
  bonusSteps: BonusStep[]
}

/** Row shape returned from the founder_reports table */
export interface FounderReport {
  id: string
  userId: string
  version: number
  status: 'pending' | 'generating' | 'complete' | 'failed'
  reportData: ReportData
  stepSnapshot: Record<string, string>
  pdfBlobUrl: string | null
  pdfSizeBytes: number | null
  emailSentAt: string | null
  emailStatus: string | null
  modelUsed: string | null
  generationMs: number | null
  generatedAt: string
}
