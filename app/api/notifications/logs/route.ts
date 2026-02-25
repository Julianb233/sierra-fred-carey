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
  } catch (error: unknown) {
    if (error instanceof Response) return error;
    const errObj = error as Record<string, unknown>;
    if (errObj && typeof errObj.status === 'number' && typeof errObj.json === 'function') {
      return errObj as unknown as NextResponse;
    }
    console.error("[GET /api/notifications/logs]", error);

    // Handle missing table gracefully
    const dbErr = error as { code?: string; message?: string };
    if (dbErr?.code === "42P01" || dbErr?.message?.includes("does not exist") || dbErr?.message?.includes("relation")) {
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
