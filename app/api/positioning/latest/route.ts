/**
 * Latest Positioning Assessment API
 * Phase 43: Next Steps Hub & Readiness Tab
 *
 * GET /api/positioning/latest
 * Returns the most recent positioning assessment for the authenticated user.
 */

import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { sql } from "@/lib/db/supabase-sql";

export async function GET() {
  try {
    const userId = await requireAuth();

    const rows = await sql`
      SELECT
        id,
        positioning_grade as positioningGrade,
        narrative_tightness_score as narrativeTightnessScore,
        clarity_score as clarityScore,
        clarity_grade as clarityGrade,
        clarity_feedback as clarityFeedback,
        differentiation_score as differentiationScore,
        differentiation_grade as differentiationGrade,
        differentiation_feedback as differentiationFeedback,
        market_understanding_score as marketUnderstandingScore,
        market_understanding_grade as marketUnderstandingGrade,
        market_understanding_feedback as marketUnderstandingFeedback,
        narrative_strength_score as narrativeStrengthScore,
        narrative_strength_grade as narrativeStrengthGrade,
        narrative_strength_feedback as narrativeStrengthFeedback,
        gaps,
        next_actions as nextActions,
        created_at as createdAt
      FROM positioning_assessments
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
      LIMIT 1
    `;

    if (!rows || rows.length === 0) {
      return NextResponse.json({
        success: true,
        data: null,
      });
    }

    const row = rows[0];

    return NextResponse.json({
      success: true,
      data: {
        grade: row.positioningGrade,
        narrativeTightnessScore: row.narrativeTightnessScore,
        categoryScores: {
          clarity: {
            name: "Clarity",
            score: row.clarityScore,
            grade: row.clarityGrade,
            feedback: row.clarityFeedback,
          },
          differentiation: {
            name: "Differentiation",
            score: row.differentiationScore,
            grade: row.differentiationGrade,
            feedback: row.differentiationFeedback,
          },
          marketUnderstanding: {
            name: "Market Understanding",
            score: row.marketUnderstandingScore,
            grade: row.marketUnderstandingGrade,
            feedback: row.marketUnderstandingFeedback,
          },
          narrativeStrength: {
            name: "Narrative Strength",
            score: row.narrativeStrengthScore,
            grade: row.narrativeStrengthGrade,
            feedback: row.narrativeStrengthFeedback,
          },
        },
        gaps: row.gaps || [],
        nextActions: row.nextActions || [],
        createdAt: row.createdAt,
      },
    });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("[Positioning Latest] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch latest positioning assessment" },
      { status: 500 }
    );
  }
}
