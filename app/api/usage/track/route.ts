import { NextRequest, NextResponse } from "next/server";
import { getOptionalUserId } from "@/lib/auth";
import {
  recordUsage,
  recordSessionActivity,
  getCreditStatus,
  checkDailyAction,
} from "@/lib/db/usage";
import { getActionCost } from "@/lib/usage/credits";

export const dynamic = "force-dynamic";

/**
 * POST /api/usage/track  (AI-6487)
 * Record a credit-consuming action for the authenticated user and refresh
 * their credit status. Also touches the user's activity session so duration
 * metrics stay accurate.
 *
 * Body: { action: string, metadata?: object, credits?: number }
 *
 * Returns 402 (Payment Required) with the credit status when the action would
 * exceed the user's remaining balance, so the caller can surface the paywall.
 */
export async function POST(request: NextRequest) {
  const userId = await getOptionalUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { action?: string; metadata?: Record<string, unknown>; credits?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const action = body.action?.trim();
  if (!action) {
    return NextResponse.json({ error: "action is required" }, { status: 400 });
  }

  const cost =
    typeof body.credits === "number" && body.credits >= 0
      ? body.credits
      : getActionCost(action);

  // Enforce the monthly credit budget before recording.
  const before = await getCreditStatus(userId);
  if (before.remaining < cost) {
    return NextResponse.json(
      {
        error: "Insufficient credits",
        action,
        cost,
        credits: before,
      },
      { status: 402 }
    );
  }

  // Enforce the daily per-action-type throttle (free-plan limiting + upsell).
  // 429 (Too Many Requests) with the throttle status so the client can show the
  // upsell trigger and a "resets in Xh" indicator.
  const daily = await checkDailyAction(userId, before.tier, action);
  if (!daily.allowed) {
    return NextResponse.json(
      {
        error: "Daily limit reached",
        reason: "daily_limit",
        action,
        throttle: daily.status,
        resetsAt: daily.resetsAt,
        resetsInSeconds: daily.resetsInSeconds,
        upgradeUrl: "/pricing",
      },
      { status: 429, headers: { "Retry-After": String(daily.resetsInSeconds) } }
    );
  }

  const charged = await recordUsage(userId, action, {
    credits: cost,
    metadata: body.metadata,
  });
  await recordSessionActivity(userId);

  // Recompute the post-charge daily status for the action so the client can
  // refresh its usage meter / nudge the upsell without a second round-trip.
  const [credits, throttle] = await Promise.all([
    getCreditStatus(userId),
    checkDailyAction(userId, before.tier, action),
  ]);
  return NextResponse.json({
    ok: true,
    action,
    charged,
    credits,
    throttle: throttle.status,
    resetsAt: throttle.resetsAt,
  });
}
