/**
 * GET /api/reports/list
 *
 * Returns all founder reports for the current user (newest first).
 * Used by the dashboard to render history.
 */

import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const userId = await requireAuth();
    const supabase = createServiceClient();

    const { data, error } = await supabase
      .from("founder_reports")
      .select(
        "id, score, verdict_headline, verdict_subline, recommended_tier, created_at, emailed_at, generation_status"
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, reports: data ?? [] });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json(
      { success: false, error: "Failed to load reports" },
      { status: 500 }
    );
  }
}
