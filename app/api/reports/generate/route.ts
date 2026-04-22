/**
 * POST /api/reports/generate
 *
 * Generates a founder readiness report from the user's startup_processes data.
 * Returns immediately with the resulting reportId. Email delivery is best-effort.
 *
 * Auth: required (uses Supabase session via requireAuth).
 */

import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { generateReport } from "@/lib/report/generate-report";

export async function POST() {
  try {
    const userId = await requireAuth();
    const result = await generateReport(userId);

    if (!result.success) {
      return NextResponse.json(result, { status: 500 });
    }
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }

    console.error("[Reports Generate API] Error:", error);

    const message =
      error instanceof Error ? error.message : "Failed to generate report";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
