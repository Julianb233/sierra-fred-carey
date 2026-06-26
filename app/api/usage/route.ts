import { NextResponse } from "next/server";
import { getOptionalUserId } from "@/lib/auth";
import { getCreditStatus, getUsageHistory } from "@/lib/db/usage";
import { getTierAllowance } from "@/lib/usage/credits";
import { UserTier } from "@/lib/constants";

export const dynamic = "force-dynamic";

/**
 * GET /api/usage  (AI-6487)
 * Returns the authenticated user's credit status for the current billing
 * period + recent usage history.
 *
 * Unauthenticated callers get FREE-tier defaults (200, no 401) so public
 * surfaces can render a credit meter without an account.
 */
export async function GET(request: Request) {
  const userId = await getOptionalUserId();

  if (!userId) {
    return NextResponse.json({
      authenticated: false,
      credits: {
        tier: UserTier.FREE,
        allowance: getTierAllowance(UserTier.FREE),
        consumed: 0,
        remaining: getTierAllowance(UserTier.FREE),
      },
      history: [],
    });
  }

  const url = new URL(request.url);
  const limit = Number(url.searchParams.get("limit")) || 50;

  const [credits, history] = await Promise.all([
    getCreditStatus(userId),
    getUsageHistory(userId, limit),
  ]);

  return NextResponse.json({ authenticated: true, credits, history });
}
