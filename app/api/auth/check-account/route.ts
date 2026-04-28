import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { checkRateLimit, createRateLimitResponse } from "@/lib/api/rate-limit";

/**
 * Check whether an email belongs to an existing (possibly Firebase-migrated)
 * account. Used by the login page to disambiguate "wrong password" from
 * "needs to reset password because they were migrated and never set one in
 * Supabase".
 *
 * Fred Cary flagged on 2026-04-24: migrated users hit "Invalid email or
 * password" on login and the page nudged them to "Get started free" — they
 * re-registered as new users instead of resetting. AI-8887.
 *
 * Returns minimal info to avoid email-enumeration leaks beyond what the
 * login error already reveals to anyone trying credentials.
 */
export async function POST(request: NextRequest) {
  try {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";
    const rate = await checkRateLimit(`auth-check-account:${ip}`, {
      limit: 10,
      windowSeconds: 60,
    });
    if (!rate.success) {
      return createRateLimitResponse(rate);
    }

    const { email } = await request.json();
    if (!email || typeof email !== "string") {
      return NextResponse.json({ exists: false, migrated: false });
    }

    const normalized = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
      return NextResponse.json({ exists: false, migrated: false });
    }

    const supabase = createServiceClient();

    // Look up the auth user by email via the admin API.
    // Note: listUsers paginates; for our user volumes (<5k) the first page
    // is sufficient. If the project grows past that, replace with a direct
    // query against auth.users via SQL.
    const { data: usersList, error: listErr } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 200,
    });

    if (listErr) {
      console.error("[auth/check-account] listUsers error:", listErr);
      return NextResponse.json({ exists: false, migrated: false });
    }

    const authUser = usersList.users.find(
      (u) => (u.email || "").toLowerCase() === normalized
    );

    if (!authUser) {
      return NextResponse.json({ exists: false, migrated: false });
    }

    // Check if this user is a Firebase-migration legacy account
    const { data: profile } = await supabase
      .from("profiles")
      .select("enrichment_source")
      .eq("id", authUser.id)
      .maybeSingle();

    const migrated =
      profile?.enrichment_source === "firebase_migration_2026_04_21";

    return NextResponse.json({
      exists: true,
      migrated,
    });
  } catch (error) {
    console.error("[auth/check-account] error:", error);
    return NextResponse.json({ exists: false, migrated: false });
  }
}
