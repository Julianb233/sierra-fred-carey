/**
 * GET /api/progress-report/list  (AI-7489)
 *
 * Returns the authenticated user's progress reports (newest first) for the
 * dashboard history view.
 */

import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const userId = await requireAuth();
    const supabase = createServiceClient();

    const { data, error } = await supabase
      .from("founder_progress_reports")
      .select(
        "id, overall_percentage, current_stage, steps_completed, steps_total, headline, subline, recommended_tier, trigger_source, created_at, emailed_at, generation_status"
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, reports: data ?? [] });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json(
      { success: false, error: "Failed to load progress reports" },
      { status: 500 }
    );
  }
}
