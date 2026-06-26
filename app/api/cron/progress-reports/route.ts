/**
 * Founder Progress Report Cron (AI-7489)
 *
 * Triggered weekly by Vercel Cron. Generates and emails an automated progress
 * report to every onboarded founder who has opted into email, closing the
 * feedback loop and driving monetization with a tailored upgrade pitch.
 *
 * GET /api/cron/progress-reports
 * Authorization: Bearer {CRON_SECRET}
 */

import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual, createHmac } from "crypto";
import { createServiceClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { shouldSendEmail } from "@/lib/email/preferences";
import { generateProgressReport } from "@/lib/progress-report/generate-progress-report";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  logger.info("[Cron: Progress Reports] Starting scheduled dispatch");

  // 1) Auth via CRON_SECRET (constant-time compare; auth before any disclosure)
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || !authHeader) {
    if (!cronSecret) {
      logger.error("[Cron: Progress Reports] CRON_SECRET not configured");
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const expectedToken = `Bearer ${cronSecret}`;
  const hmac1 = createHmac("sha256", "cron-auth").update(authHeader).digest();
  const hmac2 = createHmac("sha256", "cron-auth").update(expectedToken).digest();
  if (hmac1.length !== hmac2.length || !timingSafeEqual(hmac1, hmac2)) {
    logger.warn("[Cron: Progress Reports] Invalid authorization");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2) Required services (safe to disclose after auth)
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "AI service not configured", code: "AI_NOT_CONFIGURED" },
      { status: 503 }
    );
  }

  // 3) Eligible founders
  const supabase = createServiceClient();
  const { data: users, error: usersError } = await supabase
    .from("profiles")
    .select("id, email")
    .eq("onboarding_completed", true)
    .not("email", "is", null);

  if (usersError) {
    logger.error("[Cron: Progress Reports] Failed to query users", {
      error: usersError,
    });
    return NextResponse.json({ error: "Failed to query users" }, { status: 500 });
  }

  if (!users || users.length === 0) {
    return NextResponse.json({
      success: true,
      generated: 0,
      skipped: 0,
      failed: 0,
      duration: `${Date.now() - startTime}ms`,
    });
  }

  let generated = 0;
  let skipped = 0;
  let failed = 0;

  for (const user of users) {
    const userId = (user as { id: string }).id;
    const email = (user as { email: string | null }).email;
    try {
      const optedIn = await shouldSendEmail(userId, "weekly_digest");
      if (!optedIn) {
        skipped += 1;
        continue;
      }
      const result = await generateProgressReport(userId, {
        trigger: "scheduled",
        email,
      });
      if (result.success) generated += 1;
      else failed += 1;
    } catch (err) {
      failed += 1;
      logger.error("[Cron: Progress Reports] User failed", {
        userId,
        error: err instanceof Error ? err.message : "unknown",
      });
    }
  }

  const duration = `${Date.now() - startTime}ms`;
  logger.info("[Cron: Progress Reports] Done", {
    generated,
    skipped,
    failed,
    duration,
  });
  return NextResponse.json({
    success: true,
    generated,
    skipped,
    failed,
    total: users.length,
    duration,
  });
}
