import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getNotificationLogs } from "@/lib/notifications";

/**
 * GET /api/notifications/logs
 * Get notification delivery logs for the authenticated user
 *
 * SECURITY: Requires authentication - userId from server-side session
 * Query params:
 *   - limit: Number of logs to return (default: 50, max: 200)
 */
export async function GET(request: NextRequest) {
  try {
    const userId = await requireAuth();
    const { searchParams } = new URL(request.url);
    const limit = Math.min(
      parseInt(searchParams.get("limit") || "50", 10),
      200
    );

    const logs = await getNotificationLogs(userId, { limit });

    return NextResponse.json({
      success: true,
      data: logs,
      meta: {
        count: logs.length,
        limit,
      },
    });
  } catch (error: any) {
    if (error instanceof Response || (error && typeof error.status === 'number' && typeof error.json === 'function')) {
      return error;
    }
    console.error("[GET /api/notifications/logs]", error);

    // Handle missing table gracefully
    if (error?.code === "42P01" || error?.message?.includes("does not exist") || error?.message?.includes("relation")) {
      return NextResponse.json({
        success: true,
        data: [],
        meta: { count: 0, limit: 50 },
      });
    }

    return NextResponse.json(
      { success: false, error: "Failed to fetch notification logs" },
      { status: 500 }
    );
  }
}
