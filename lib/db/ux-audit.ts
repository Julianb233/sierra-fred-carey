/**
 * UX Test Audit DB helpers
 *
 * Provides typed functions for storing and querying UX test results.
 * Used by Stagehand QA agents to log every test step to Supabase.
 */
import { createServiceClient } from "@/lib/supabase/server"

// ============================================================================
// Types
// ============================================================================

export interface UxTestRun {
  id: string
  run_name: string
  run_type: string
  started_at: string
  completed_at: string | null
  status: "running" | "passed" | "failed" | "partial"
  total_tests: number
  passed: number
  failed: number
  skipped: number
  environment: string
  base_url: string
  git_sha: string | null
  milestone: string | null
  phase: string | null
  metadata: Record<string, unknown>
}

export interface UxTestResult {
  id: string
  run_id: string
  feature: string
  scenario: string
  step_number: number
  step_description: string
  status: "pass" | "fail" | "skip" | "error"
  expected: string | null
  actual: string | null
  error_message: string | null
  screenshot_url: string | null
  page_url: string | null
  load_time_ms: number | null
  user_input: string | null
  fred_response: string | null
  response_quality: "excellent" | "good" | "acceptable" | "poor" | "terrible" | null
  response_relevance: "highly_relevant" | "relevant" | "somewhat_relevant" | "irrelevant" | null
  response_tone: "encouraging" | "neutral" | "too_harsh" | "too_vague" | "patronizing" | null
  severity: "critical" | "high" | "medium" | "low" | null
  category: string | null
  notes: string | null
  created_at: string
  metadata: Record<string, unknown>
}

export type UxTestRunInsert = Omit<UxTestRun, "id" | "started_at" | "completed_at"> & {
  started_at?: string
}

export type UxTestResultInsert = Omit<UxTestResult, "id" | "created_at">

// ============================================================================
// Test Runs
// ============================================================================

export async function createTestRun(run: UxTestRunInsert): Promise<UxTestRun> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from("ux_test_runs")
    .insert(run)
    .select()
    .single()
  if (error) throw error
  return data as UxTestRun
}

export async function completeTestRun(
  runId: string,
  status: UxTestRun["status"],
  counts: { total: number; passed: number; failed: number; skipped: number }
) {
  const supabase = createServiceClient()
  const { error } = await supabase
    .from("ux_test_runs")
    .update({
      status,
      completed_at: new Date().toISOString(),
      total_tests: counts.total,
      passed: counts.passed,
      failed: counts.failed,
      skipped: counts.skipped,
    })
    .eq("id", runId)
  if (error) throw error
}

export async function getTestRuns(opts?: {
  milestone?: string
  status?: string
  limit?: number
}): Promise<UxTestRun[]> {
  const supabase = createServiceClient()
  let query = supabase
    .from("ux_test_runs")
    .select("*")
    .order("started_at", { ascending: false })
    .limit(opts?.limit ?? 20)

  if (opts?.milestone) query = query.eq("milestone", opts.milestone)
  if (opts?.status) query = query.eq("status", opts.status)

  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as UxTestRun[]
}

// ============================================================================
// Test Results
// ============================================================================

export async function insertTestResult(result: UxTestResultInsert): Promise<UxTestResult> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from("ux_test_results")
    .insert(result)
    .select()
    .single()
  if (error) throw error
  return data as UxTestResult
}

export async function insertTestResults(results: UxTestResultInsert[]): Promise<UxTestResult[]> {
  if (results.length === 0) return []
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from("ux_test_results")
    .insert(results)
    .select()
  if (error) throw error
  return (data ?? []) as UxTestResult[]
}

export async function getTestResultsByRun(runId: string): Promise<UxTestResult[]> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from("ux_test_results")
    .select("*")
    .eq("run_id", runId)
    .order("step_number", { ascending: true })
  if (error) throw error
  return (data ?? []) as UxTestResult[]
}

export async function getFailedResults(opts?: {
  feature?: string
  severity?: string
  limit?: number
}): Promise<UxTestResult[]> {
  const supabase = createServiceClient()
  let query = supabase
    .from("ux_test_results")
    .select("*")
    .eq("status", "fail")
    .order("created_at", { ascending: false })
    .limit(opts?.limit ?? 50)

  if (opts?.feature) query = query.eq("feature", opts.feature)
  if (opts?.severity) query = query.eq("severity", opts.severity)

  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as UxTestResult[]
}

export async function getResponseQualityStats(runId?: string) {
  const supabase = createServiceClient()
  let query = supabase
    .from("ux_test_results")
    .select("response_quality, response_relevance, response_tone, feature, scenario")
    .not("response_quality", "is", null)

  if (runId) query = query.eq("run_id", runId)

  const { data, error } = await query
  if (error) throw error
  return data ?? []
}
