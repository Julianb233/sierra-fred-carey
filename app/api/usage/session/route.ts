import { NextRequest, NextResponse } from "next/server";
import { getOptionalUserId } from "@/lib/auth";
import { recordSessionActivity, endSession } from "@/lib/db/usage";

export const dynamic = "force-dynamic";

/**
 * POST /api/usage/session  (AI-6487)
 * Session-duration tracking for the 10+ minute engagement metric.
 *
 * Body: { event?: "heartbeat" | "end" }  (default: "heartbeat")
 *  - "heartbeat": open or extend the user's current session (call on activity
 *    / on a client interval). Returns the live duration in seconds.
 *  - "end": close the user's open session (call on logout / tab close).
 */
export async function POST(request: NextRequest) {
  const userId = await getOptionalUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let event = "heartbeat";
  try {
    const body = await request.json();
    if (body?.event === "end" || body?.event === "heartbeat") event = body.event;
  } catch {
    /* default heartbeat on empty/invalid body */
  }

  if (event === "end") {
    await endSession(userId);
    return NextResponse.json({ ok: true, event: "end" });
  }

  const session = await recordSessionActivity(userId);
  return NextResponse.json({ ok: true, event: "heartbeat", session });
}
