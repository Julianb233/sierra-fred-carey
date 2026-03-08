/**
 * Admin Feedback Triage API
 *
 * PATCH /api/admin/feedback/triage
 * Updates the triage status of a feedback signal or insight.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdminRequest } from "@/lib/auth/admin";
import { updateTriageStatus } from "@/lib/db/feedback-admin";
import { INSIGHT_STATUSES } from "@/lib/feedback/constants";

interface TriageRequestBody {
  id: string;
  table: "feedback_signals" | "feedback_insights";
  status: string;
}

export async function PATCH(request: NextRequest) {
  const denied = await requireAdminRequest(request);
  if (denied) return denied;

  try {
    const body = (await request.json()) as TriageRequestBody;

    // Validate required fields
    if (!body.id || !body.table || !body.status) {
      return NextResponse.json(
        { error: "Missing required fields: id, table, status" },
        { status: 400 }
      );
    }

    // Validate table name
    if (body.table !== "feedback_signals" && body.table !== "feedback_insights") {
      return NextResponse.json(
        { error: "Invalid table. Must be feedback_signals or feedback_insights" },
        { status: 400 }
      );
    }

    // Validate status
    if (!INSIGHT_STATUSES.includes(body.status as (typeof INSIGHT_STATUSES)[number])) {
      return NextResponse.json(
        {
          error: `Invalid status "${body.status}". Must be one of: ${INSIGHT_STATUSES.join(", ")}`,
        },
        { status: 400 }
      );
    }

    const updated = await updateTriageStatus(body.id, body.table, body.status);

    return NextResponse.json({ success: true, data: updated });
  } catch (err) {
    console.error("[admin/feedback/triage] Error:", err);
    return NextResponse.json(
      { error: "Failed to update triage status" },
      { status: 500 }
    );
  }
}
