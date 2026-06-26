import { NextResponse } from "next/server";
import { getOptionalUserId } from "@/lib/auth";
import { getDailyThrottleStatus } from "@/lib/db/usage";

export const dynamic = "force-dynamic";

/**
 * GET /api/usage/throttle  (AI-6486)
 *
 * Daily per-action-type throttle status for the authenticated user: how many of
 * each capped action they've used today, what's remaining, whether they're
 * approaching/over a limit, when it resets, and whether to surface an upsell.
 *
 * Powers the "remaining usage" indicator and the upsell-trigger UI. Unlimited
 * actions (paid tiers) are omitted from `actions`, so a Studio user simply gets
 * an empty list and `upsell: null`.
 */
export async function GET() {
  const userId = await getOptionalUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const throttle = await getDailyThrottleStatus(userId);
  return NextResponse.json({ ok: true, throttle });
}
