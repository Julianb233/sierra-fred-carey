/**
 * Milestone Reminder Cron Endpoint
 * AI-7368: Twilio SMS + in-app notifications for milestone reminders
 *
 * Triggered by Vercel Cron on Friday mornings.
 * Sends every founder with active (overdue / due-soon) milestones an in-app
 * notification, and additionally texts paid-plan founders with a verified phone.
 *
 * GET /api/cron/milestone-reminders
 * Authorization: Bearer {CRON_SECRET}
 */

import { NextRequest, NextResponse } from "next/server";
import { sendMilestoneReminders } from "@/lib/milestone-reminders/service";
import { logger } from "@/lib/logger";
import { timingSafeEqual, createHmac } from "crypto";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  logger.log("[Cron: Milestone Reminders] Starting scheduled dispatch");

  try {
    // Auth first — never leak config state to unauthenticated callers.
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || !authHeader) {
      if (!cronSecret) {
        console.error("[Cron: Milestone Reminders] CRON_SECRET not configured");
      }
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const expectedToken = `Bearer ${cronSecret}`;
    const hmac1 = createHmac("sha256", "cron-auth").update(authHeader).digest();
    const hmac2 = createHmac("sha256", "cron-auth")
      .update(expectedToken)
      .digest();
    if (!timingSafeEqual(hmac1, hmac2)) {
      console.warn("[Cron: Milestone Reminders] Invalid authorization");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Twilio is optional here: when it's not configured we still deliver
    // in-app notifications (the cheaper fallback channel) and just skip SMS.
    const twilioConfigured = Boolean(
      process.env.TWILIO_ACCOUNT_SID &&
        process.env.TWILIO_AUTH_TOKEN &&
        process.env.TWILIO_MESSAGING_SERVICE_SID
    );

    if (!twilioConfigured) {
      logger.log(
        "[Cron: Milestone Reminders] Twilio not configured — in-app notifications only"
      );
    }

    const result = await sendMilestoneReminders({ twilioConfigured });
    const duration = Date.now() - startTime;

    logger.log(
      `[Cron: Milestone Reminders] Completed in ${duration}ms:`,
      JSON.stringify(result)
    );

    if (result.errors.length > 0) {
      console.error(
        "[Cron: Milestone Reminders] Errors:",
        JSON.stringify(result.errors)
      );
    }

    return NextResponse.json({
      success: true,
      twilioConfigured,
      ...result,
      duration: `${duration}ms`,
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(
      `[Cron: Milestone Reminders] Fatal error after ${duration}ms:`,
      errorMsg
    );

    return NextResponse.json(
      { error: "Milestone reminder dispatch failed", duration: `${duration}ms` },
      { status: 500 }
    );
  }
}
