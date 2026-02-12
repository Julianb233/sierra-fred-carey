/**
 * Active Mode API — Phase 45
 *
 * GET /api/fred/mode — Returns the current diagnostic mode for the authenticated user.
 * Lightweight endpoint consumed by the Chat UI top bar.
 */

import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getActiveMode } from "@/lib/db/conversation-state";

export async function GET() {
  try {
    const userId = await requireAuth();
    const { activeMode } = await getActiveMode(userId);

    return NextResponse.json({ success: true, data: { activeMode } });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("[Mode API] GET error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch active mode" },
      { status: 500 }
    );
  }
}
