import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { testNotificationConfig } from "@/lib/notifications";
import { logger } from "@/lib/logger";

/**
 * POST /api/notifications/test
 * Test a notification configuration by sending a test message
 *
 * SECURITY: Requires authentication - userId from server-side session
 */
export async function POST(request: NextRequest) {
  try {
    const userId = await requireAuth();
    const body = await request.json();
    const { configId } = body;

    if (!configId) {
      return NextResponse.json(
        { success: false, error: "Config ID is required" },
        { status: 400 }
      );
    }

    logger.log(`[Notifications Test] Testing config ${configId} for user ${userId}`);

    const result = await testNotificationConfig(configId, userId);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || "Failed to send test notification",
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Test notification sent successfully",
      data: {
        channel: result.channel,
        messageId: result.messageId,
        timestamp: result.timestamp,
      },
    });
  } catch (error: any) {
    // Return auth errors directly
    if (error instanceof Response) return error;

    console.error("[POST /api/notifications/test]", error);

    return NextResponse.json(
      { success: false, error: "Failed to test notification config" },
      { status: 500 }
    );
  }
}
