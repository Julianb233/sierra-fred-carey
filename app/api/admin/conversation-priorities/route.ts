/**
 * Admin Conversation Priorities API (AI-3517)
 *
 * GET /api/admin/conversation-priorities[?limit=50]
 *
 * Team-facing read of the persisted conversation summaries. Surfaces two
 * prioritized queues the Sahara team can act on:
 *   - attentionQueue:    founders who need attention soon (high priorityScore)
 *   - upsellCandidates:  founders recommended for a free -> paid upgrade
 *
 * This reads what the conversation-summaries cron already persisted — it does
 * NOT re-run the (expensive) AI summarization. Admin-gated.
 */

import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/auth/admin";
import { getPrioritizedQueues } from "@/lib/ai/conversation-summarizer";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!(await isAdminRequest(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limitParam = request.nextUrl.searchParams.get("limit");
  const parsed = limitParam ? Number(limitParam) : NaN;
  const limit = Number.isFinite(parsed) ? parsed : undefined;

  try {
    const queues = await getPrioritizedQueues(limit ? { limit } : undefined);
    return NextResponse.json({ success: true, data: queues });
  } catch (error) {
    console.error("[GET /api/admin/conversation-priorities]", error);
    return NextResponse.json(
      { success: false, error: "Failed to load conversation priorities" },
      { status: 500 }
    );
  }
}
