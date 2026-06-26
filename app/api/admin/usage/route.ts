import { NextRequest, NextResponse } from "next/server";
import { requireAdminRequest } from "@/lib/auth/admin";
import {
  getUsageSummary,
  getSessionMetrics,
  currentPeriodStart,
} from "@/lib/db/usage";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/usage  (AI-6487)
 * Admin-only aggregate usage + the VC success metrics Fred outlined
 * (10+ min sessions, return-within-48h). Feeds the admin panel.
 *
 * Query:
 *   ?since=ISO8601   -> override the window (default: current billing period
 *                       for credits, trailing 30 days for session metrics)
 *   ?top=N           -> number of top users to return (default 20)
 */
export async function GET(request: NextRequest) {
  const unauthorized = await requireAdminRequest(request);
  if (unauthorized) return unauthorized;

  const url = new URL(request.url);
  const since = url.searchParams.get("since") || undefined;
  const top = Number(url.searchParams.get("top")) || 20;

  const [summary, sessions] = await Promise.all([
    getUsageSummary(since, top),
    getSessionMetrics(since),
  ]);

  return NextResponse.json({
    periodStart: since ?? currentPeriodStart(),
    usage: summary,
    metrics: sessions,
  });
}
