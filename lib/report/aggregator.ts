/**
 * Report Data Aggregator
 *
 * Pulls founder answers from oases_progress and profiles, then structures
 * them into the 19-step / 5-section format expected by the AI synthesizer.
 *
 * Uses the sql tagged template from lib/db/supabase-sql (service-role client)
 * since this runs server-side during report generation.
 */

import { sql } from "@/lib/db/supabase-sql"
import {
  REPORT_SECTIONS,
  REPORT_STEPS,
  type ReportStepDef,
} from "./step-mapping"

// ============================================================================
// Types
// ============================================================================

export interface AggregatedStep {
  /** Report step ID (e.g. "core-offer-product") */
  stepId: string
  /** Display label */
  label: string
  /** Founder's answer text (distilled preferred). Null if not yet answered. */
  answer: string | null
  /** Which journey step ID provided the answer, or null */
  sourceStepId: string | null
}

export interface AggregatedSection {
  sectionId: string
  title: string
  description: string
  steps: AggregatedStep[]
  /** 0-1, fraction of steps that have answers */
  completionRate: number
}

export interface AggregatedReportInput {
  founderName: string
  companyName: string
  industry: string
  sections: AggregatedSection[]
  totalAnswered: number
  /** Always 19 */
  totalSteps: number
}

// ============================================================================
// Internal types
// ============================================================================

interface ProgressRow {
  step_id: string
  metadata: {
    answer?: string
    distilled?: string
  } | null
}

interface ProfileRow {
  full_name: string | null
  name: string | null
  company_name: string | null
  venture_name: string | null
  industry: string | null
}

// ============================================================================
// Main aggregator
// ============================================================================

/**
 * Aggregate all founder answers for the report.
 *
 * 1. Pulls ALL oases_progress rows for the user (single query)
 * 2. Pulls profile fields for context
 * 3. Maps each of the 19 report steps to the best available answer
 */
export async function aggregateReportData(
  userId: string
): Promise<AggregatedReportInput> {
  // Fetch progress and profile in parallel
  const [progressRows, profileRows] = await Promise.all([
    fetchProgress(userId),
    fetchProfile(userId),
  ])

  // Build lookup: journeyStepId -> { answer, distilled }
  const answerMap = buildAnswerMap(progressRows)

  // Extract profile fields with defaults
  const profile = profileRows[0] as ProfileRow | undefined
  const founderName =
    profile?.full_name || profile?.name || "Founder"
  const companyName =
    profile?.company_name || profile?.venture_name || "Your Venture"
  const industry = profile?.industry || "General"

  // Build sections
  let totalAnswered = 0
  const sections: AggregatedSection[] = REPORT_SECTIONS.map((section) => {
    const steps: AggregatedStep[] = section.steps.map((stepDef) => {
      const resolved = resolveAnswer(stepDef, answerMap)
      if (resolved.answer) totalAnswered++
      return resolved
    })

    const answeredInSection = steps.filter((s) => s.answer !== null).length
    const completionRate =
      steps.length > 0 ? answeredInSection / steps.length : 0

    return {
      sectionId: section.id,
      title: section.title,
      description: section.description,
      steps,
      completionRate,
    }
  })

  return {
    founderName,
    companyName,
    industry,
    sections,
    totalAnswered,
    totalSteps: REPORT_STEPS.length,
  }
}

// ============================================================================
// Helpers
// ============================================================================

async function fetchProgress(
  userId: string
): Promise<ProgressRow[]> {
  try {
    const rows = await sql`
      SELECT step_id, metadata FROM oases_progress WHERE user_id = ${userId}
    `
    return rows as unknown as ProgressRow[]
  } catch (error) {
    console.error("[aggregator] Failed to fetch progress:", error)
    return []
  }
}

async function fetchProfile(
  userId: string
): Promise<ProfileRow[]> {
  try {
    const rows = await sql`
      SELECT full_name, name, company_name, venture_name, industry FROM profiles WHERE id = ${userId} LIMIT 1
    `
    return rows as unknown as ProfileRow[]
  } catch (error) {
    console.error("[aggregator] Failed to fetch profile:", error)
    return []
  }
}

/**
 * Build a lookup map from journey step ID to answer text.
 * Prefers metadata.distilled over metadata.answer.
 */
function buildAnswerMap(
  rows: ProgressRow[]
): Map<string, string> {
  const map = new Map<string, string>()

  for (const row of rows) {
    if (!row.metadata) continue

    const text = row.metadata.distilled || row.metadata.answer
    if (text && typeof text === "string" && text.trim().length > 0) {
      map.set(row.step_id, text.trim())
    }
  }

  return map
}

/**
 * Resolve the best available answer for a report step by trying
 * primary and fallback journey step IDs in order.
 */
function resolveAnswer(
  stepDef: ReportStepDef,
  answerMap: Map<string, string>
): AggregatedStep {
  for (const journeyStepId of stepDef.journeyStepIds) {
    const answer = answerMap.get(journeyStepId)
    if (answer) {
      return {
        stepId: stepDef.id,
        label: stepDef.label,
        answer,
        sourceStepId: journeyStepId,
      }
    }
  }

  return {
    stepId: stepDef.id,
    label: stepDef.label,
    answer: null,
    sourceStepId: null,
  }
}
