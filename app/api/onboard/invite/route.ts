import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, createRateLimitResponse } from "@/lib/api/rate-limit";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_INVITES = 10;

export async function POST(request: NextRequest) {
  try {
    // Rate limit: 5 requests per minute per IP
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";
    const rateLimitResult = await checkRateLimit(`invite:${ip}`, { limit: 5, windowSeconds: 60 });
    if (!rateLimitResult.success) {
      return createRateLimitResponse(rateLimitResult);
    }

    const { emails, referrerEmail } = await request.json();

    if (!Array.isArray(emails) || emails.length === 0) {
      return NextResponse.json(
        { error: "At least one email is required" },
        { status: 400 }
      );
    }

    if (!referrerEmail || !emailRegex.test(referrerEmail)) {
      return NextResponse.json(
        { error: "Valid referrer email is required" },
        { status: 400 }
      );
    }

    // Normalize and validate emails, cap at MAX_INVITES
    const normalized = emails
      .slice(0, MAX_INVITES)
      .map((e: unknown) => (typeof e === "string" ? e.trim().toLowerCase() : ""))
      .filter((e) => emailRegex.test(e));

    if (normalized.length === 0) {
      return NextResponse.json(
        { error: "No valid emails provided" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Check which emails are already on the waitlist
    const { data: existing } = await supabase
      .from("contact_submissions")
      .select("email")
      .in("email", normalized)
      .in("source", ["waitlist", "waitlist-referral"]);

    const existingEmails = new Set(
      (existing || []).map((r: { email: string }) => r.email)
    );

    const newEmails = normalized.filter((e) => !existingEmails.has(e));
    const alreadyOnWaitlist = normalized.filter((e) => existingEmails.has(e));

    if (newEmails.length > 0) {
      const rows = newEmails.map((email) => ({
        name: email.split("@")[0].replace(/[._-]/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase()),
        email,
        message: JSON.stringify({ referredBy: referrerEmail.toLowerCase() }),
        source: "waitlist-referral",
      }));

      await supabase.from("contact_submissions").insert(rows);
    }

    return NextResponse.json({
      success: true,
      invited: newEmails,
      alreadyOnWaitlist,
    });
  } catch (error) {
    console.error("[onboard/invite] Error:", error);
    return NextResponse.json(
      { error: "Failed to send invites. Please try again." },
      { status: 500 }
    );
  }
}
