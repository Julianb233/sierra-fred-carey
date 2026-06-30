import { NextRequest, NextResponse } from "next/server";
import { requireAdminRequest } from "@/lib/auth/admin";
import { getAICostBreakdown } from "@/lib/ai/cost-monitor";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/admin/ai-costs  (AI-7363)
 *
 * Admin-only AI platform cost monitor. Aggregates the `ai_requests` /
 * `ai_responses` telemetry by platform (Claude vs Gemini vs ...), provider, and
 * analyzer over a trailing window. Read-only.
 *
 * Query:
 *   ?days=N   -> trailing window in days (default 30, min 1, max 365)
 */
export async function GET(request: NextRequest) {
  const unauthorized = await requireAdminRequest(request);
  if (unauthorized) return unauthorized;

  const url = new URL(request.url);
  const days = Math.min(
    365,
    Math.max(1, Number(url.searchParams.get("days")) || 30)
  );

  try {
    const breakdown = await getAICostBreakdown({ days });
    return NextResponse.json(breakdown);
  } catch (e) {
    return NextResponse.json(
      {
        error: "Failed to load AI cost telemetry",
        detail: e instanceof Error ? e.message : String(e),
      },
      { status: 500 }
    );
  }
}
