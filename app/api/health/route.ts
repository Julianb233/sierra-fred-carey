import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/health
 * Public health check endpoint for client-side FRED online status.
 * No authentication required — returns minimal status only.
 */
export async function GET() {
  return NextResponse.json({ status: "ok" });
}
