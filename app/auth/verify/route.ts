/**
 * /auth/verify
 *
 * Server-side one-click verify handler for password-recovery links sent
 * via Resend / Google Workspace (outside Supabase's built-in email SMTP).
 *
 * Email contains:  https://www.joinsahara.com/auth/verify?token_hash=...&type=recovery&next=/reset-password
 *
 * We exchange the hashed_token for a Supabase session using verifyOtp, set
 * the cookies, and redirect to the password-reset form. No supabase.co URL
 * is visible to the user.
 *
 * Supports all OTP types: recovery, email, signup, email_change, invite.
 * Falls through to /login with a useful query string on error.
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

const ALLOWED_TYPES = new Set([
  "recovery",
  "email",
  "signup",
  "email_change",
  "invite",
  "magiclink",
]);

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const token_hash = searchParams.get("token_hash") ?? searchParams.get("token");
  const rawType = searchParams.get("type") ?? "recovery";
  const type = ALLOWED_TYPES.has(rawType) ? rawType : "recovery";
  const next = searchParams.get("next") ?? "/reset-password";

  if (!token_hash) {
    return NextResponse.redirect(
      new URL(`/login?error=missing_token`, origin),
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.redirect(
      new URL(`/login?error=config_missing`, origin),
    );
  }

  const response = NextResponse.redirect(new URL(next, origin));

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const { error } = await supabase.auth.verifyOtp({
    token_hash,
    type: type as
      | "recovery"
      | "email"
      | "signup"
      | "email_change"
      | "invite"
      | "magiclink",
  });

  if (error) {
    const reason = encodeURIComponent(error.message.slice(0, 120));
    return NextResponse.redirect(
      new URL(`/login?error=verify_failed&reason=${reason}`, origin),
    );
  }

  return response;
}
