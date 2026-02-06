import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_INVITES = 10;

// TODO: Add rate limiting for this public endpoint.
// This route is unauthenticated by design (users invite friends before signing up),
// but should be rate-limited per IP to prevent abuse (e.g., 10 requests/min).
// Consider using a middleware-level rate limiter or Vercel's built-in rate limiting.

export async function POST(request: NextRequest) {
  try {
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
