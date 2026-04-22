/**
 * Twilio SMS Health Check
 * AI-2651: Complete Twilio integration for launch
 *
 * GET /api/sms/health - Validates Twilio configuration is complete
 *
 * Protected by CRON_SECRET to prevent public probing of infrastructure.
 * Returns status of each required Twilio env var and a connectivity test.
 */

import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";

export const dynamic = "force-dynamic";

function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

export async function GET(request: NextRequest) {
  // Authorize via CRON_SECRET or admin Bearer token
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || !authHeader) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = authHeader.replace("Bearer ", "");
  if (!safeCompare(token, cronSecret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const checks: Record<string, { set: boolean; hint?: string }> = {
    TWILIO_ACCOUNT_SID: {
      set: !!process.env.TWILIO_ACCOUNT_SID,
      hint: process.env.TWILIO_ACCOUNT_SID
        ? `AC...${process.env.TWILIO_ACCOUNT_SID.slice(-4)}`
        : undefined,
    },
    TWILIO_AUTH_TOKEN: {
      set: !!process.env.TWILIO_AUTH_TOKEN,
    },
    TWILIO_MESSAGING_SERVICE_SID: {
      set: !!process.env.TWILIO_MESSAGING_SERVICE_SID,
      hint: process.env.TWILIO_MESSAGING_SERVICE_SID
        ? `MG...${process.env.TWILIO_MESSAGING_SERVICE_SID.slice(-4)}`
        : undefined,
    },
    NEXT_PUBLIC_APP_URL: {
      set: !!process.env.NEXT_PUBLIC_APP_URL,
      hint: process.env.NEXT_PUBLIC_APP_URL,
    },
    CRON_SECRET: {
      set: !!process.env.CRON_SECRET,
    },
  };

  const allSet = Object.values(checks).every((c) => c.set);

  // If all env vars are set, try a basic Twilio API call
  let connectivityOk = false;
  let connectivityError: string | undefined;

  if (allSet) {
    try {
      const Twilio = (await import("twilio")).default;
      const client = Twilio(
        process.env.TWILIO_ACCOUNT_SID!,
        process.env.TWILIO_AUTH_TOKEN!
      );
      // Fetch account info to verify credentials work
      const account = await client.api.accounts(process.env.TWILIO_ACCOUNT_SID!).fetch();
      connectivityOk = account.status === "active";
      if (!connectivityOk) {
        connectivityError = `Account status: ${account.status}`;
      }
    } catch (err) {
      connectivityError = err instanceof Error ? err.message : String(err);
    }
  }

  const webhookUrls = process.env.NEXT_PUBLIC_APP_URL
    ? {
        inbound: `${process.env.NEXT_PUBLIC_APP_URL}/api/sms/webhook`,
        statusCallback: `${process.env.NEXT_PUBLIC_APP_URL}/api/sms/status`,
      }
    : null;

  return NextResponse.json({
    status: allSet && connectivityOk ? "healthy" : "incomplete",
    envVars: checks,
    connectivity: allSet
      ? { ok: connectivityOk, error: connectivityError }
      : { ok: false, error: "Missing env vars" },
    webhookUrls,
    cronJobs: {
      weeklyCheckin: "0 14 * * 1 (Mondays 2pm UTC / 7am PT)",
      dailyGuidance: "0 15 * * * (Daily 3pm UTC / 8am PT)",
    },
  });
}
