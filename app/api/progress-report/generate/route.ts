/**
 * POST /api/progress-report/generate  (AI-7489)
 *
 * Generates an automated founder progress report for the authenticated user
 * from their journey/program data. Returns the reportId. Email is best-effort.
 *
 * Auth: required (Supabase session via requireAuth).
 */

import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { generateProgressReport } from "@/lib/progress-report/generate-progress-report";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST() {
  try {
    const userId = await requireAuth();
    const result = await generateProgressReport(userId, { trigger: "manual" });

    if (!result.success) {
      return NextResponse.json(result, { status: 500 });
    }
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    if (error instanceof Response) return error;

    console.error("[ProgressReport Generate API] Error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to generate progress report";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
