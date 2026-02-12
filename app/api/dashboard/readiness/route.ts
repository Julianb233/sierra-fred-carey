/**
 * Readiness Dashboard API
 * Phase 43: Next Steps Hub & Readiness Tab
 *
 * GET /api/dashboard/readiness
 * Combined endpoint returning investor readiness + positioning readiness data.
 */

import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { sql } from "@/lib/db/supabase-sql";
import {
  IRS_CATEGORIES,
  CATEGORY_LABELS,
  STAGE_BENCHMARKS,
  type IRSCategory,
  type CategoryScore,
  type StartupStage,
} from "@/lib/fred/irs/types";

// ============================================================================
// Types
// ============================================================================

interface InvestorReadinessData {
  score: number | null;
  zone: "red" | "yellow" | "green" | null;
  categories: { name: string; score: number; benchmark: number }[];
  strengths: string[];
  weaknesses: string[];
  trend: { score: number; date: string }[];
}

interface PositioningReadinessData {
  grade: string | null;
  narrativeTightness: number | null;
  categories: { name: string; grade: string; score: number }[];
  gaps: string[];
  nextActions: string[];
}

interface ReadinessResponse {
  investorReadiness: InvestorReadinessData | null;
  positioningReadiness: PositioningReadinessData | null;
  hasIRS: boolean;
  hasPositioning: boolean;
}

// ============================================================================
// Helpers
// ============================================================================

function scoreToZone(score: number): "red" | "yellow" | "green" {
  if (score >= 70) return "green";
  if (score >= 40) return "yellow";
  return "red";
}

function detectStage(startupContext: Record<string, unknown> | null): StartupStage {
  if (!startupContext) return "seed";
  const stage = (startupContext.stage as string)?.toLowerCase();
  if (!stage) return "seed";
  if (stage.includes("idea")) return "idea";
  if (stage.includes("pre-seed") || stage.includes("preseed")) return "pre-seed";
  if (stage.includes("series-a") || stage.includes("series a")) return "series-a";
  if (stage.includes("series-b") || stage.includes("series b") || stage.includes("growth")) return "series-b+";
  return "seed";
}

// ============================================================================
// Route Handler
// ============================================================================

export async function GET() {
  try {
    const userId = await requireAuth();
    const supabase = await createClient();

    // Fetch IRS and Positioning data in parallel
    const [irsResult, positioningResult, irsHistoryResult, profileResult] = await Promise.all([
      // Latest IRS
      supabase
        .from("investor_readiness_scores")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      // Latest Positioning
      sql`
        SELECT
          id,
          positioning_grade as positioningGrade,
          narrative_tightness_score as narrativeTightnessScore,
          clarity_score as clarityScore,
          clarity_grade as clarityGrade,
          differentiation_score as differentiationScore,
          differentiation_grade as differentiationGrade,
          market_understanding_score as marketUnderstandingScore,
          market_understanding_grade as marketUnderstandingGrade,
          narrative_strength_score as narrativeStrengthScore,
          narrative_strength_grade as narrativeStrengthGrade,
          gaps,
          next_actions as nextActions,
          created_at as createdAt
        FROM positioning_assessments
        WHERE user_id = ${userId}
        ORDER BY created_at DESC
        LIMIT 1
      `,
      // IRS trend (last 5)
      supabase
        .from("investor_readiness_scores")
        .select("overall_score, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(5),
      // User profile for stage-based benchmarks
      supabase
        .from("profiles")
        .select("stage")
        .eq("id", userId)
        .maybeSingle(),
    ]);

    // Build investor readiness data
    let investorReadiness: InvestorReadinessData | null = null;
    const hasIRS = !!(irsResult.data);

    if (irsResult.data) {
      const irs = irsResult.data;
      const overallScore = Number(irs.overall_score);
      const categoryScores = irs.category_scores as Record<IRSCategory, CategoryScore> | null;
      const startupContext = irs.startup_context as Record<string, unknown> | null;

      // Determine stage for benchmarks
      const userStage = (profileResult.data?.stage as string) || null;
      const stage = detectStage(startupContext || (userStage ? { stage: userStage } : null));
      const benchmarks = STAGE_BENCHMARKS[stage];

      const categories = IRS_CATEGORIES.map((cat) => ({
        name: CATEGORY_LABELS[cat],
        score: categoryScores?.[cat]?.score ?? 0,
        benchmark: benchmarks[cat],
      }));

      // Build trend from history
      const trend = (irsHistoryResult.data || [])
        .map((row: { overall_score: number; created_at: string }) => ({
          score: Number(row.overall_score),
          date: row.created_at,
        }))
        .reverse(); // chronological order

      investorReadiness = {
        score: overallScore,
        zone: scoreToZone(overallScore),
        categories,
        strengths: (irs.strengths as string[]) || [],
        weaknesses: (irs.weaknesses as string[]) || [],
        trend,
      };
    }

    // Build positioning readiness data
    let positioningReadiness: PositioningReadinessData | null = null;
    const posRow = positioningResult?.[0];
    const hasPositioning = !!posRow;

    if (posRow) {
      const categories = [
        { name: "Clarity", grade: posRow.clarityGrade, score: posRow.clarityScore },
        { name: "Differentiation", grade: posRow.differentiationGrade, score: posRow.differentiationScore },
        { name: "Market Understanding", grade: posRow.marketUnderstandingGrade, score: posRow.marketUnderstandingScore },
        { name: "Narrative Strength", grade: posRow.narrativeStrengthGrade, score: posRow.narrativeStrengthScore },
      ];

      const gaps = ((posRow.gaps || []) as Array<{ gap?: string; category?: string }>)
        .map((g) => g.gap || "")
        .filter(Boolean);

      const nextActions = ((posRow.nextActions || []) as Array<{ action?: string }>)
        .map((a) => a.action || "")
        .filter(Boolean);

      positioningReadiness = {
        grade: posRow.positioningGrade,
        narrativeTightness: posRow.narrativeTightnessScore,
        categories,
        gaps,
        nextActions,
      };
    }

    const response: ReadinessResponse = {
      investorReadiness,
      positioningReadiness,
      hasIRS,
      hasPositioning,
    };

    return NextResponse.json({
      success: true,
      data: response,
    });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("[Readiness API] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch readiness data" },
      { status: 500 }
    );
  }
}
