/**
 * /reset
 *
 * Short-link / fallback for password-reset emails (AI-8906).
 *
 * Some legacy reset emails sent before the 2026-04 platform consolidation
 * pointed at /reset (or hash-based URLs) that returned 404 on the new
 * platform. This route catches them and redirects to /reset-password
 * with any token query/hash forwarded so the SDK can still consume them.
 *
 * Also accepts ?email= so we can deep-link directly into the
 * forgot-password form when a user lands here without a token.
 */

import { NextRequest, NextResponse } from "next/server";

export function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const tokenHash =
    searchParams.get("token_hash") || searchParams.get("token");
  const code = searchParams.get("code");
  const email = searchParams.get("email");
  const type = searchParams.get("type") ?? "recovery";

  // PKCE flow ?code= -> /api/auth/callback exchanges, then -> /reset-password
  if (code) {
    const target = new URL("/api/auth/callback", origin);
    target.searchParams.set("code", code);
    target.searchParams.set("next", "/reset-password");
    return NextResponse.redirect(target, 308);
  }

  // OTP/token_hash flow -> /auth/verify
  if (tokenHash) {
    const target = new URL("/auth/verify", origin);
    target.searchParams.set("token_hash", tokenHash);
    target.searchParams.set("type", type);
    target.searchParams.set("next", "/reset-password");
    return NextResponse.redirect(target, 308);
  }

  // No token. Either the user clicked an expired link or just typed /reset.
  // Send them to forgot-password with the email pre-filled if known.
  const target = new URL("/forgot-password", origin);
  if (email) target.searchParams.set("email", email);
  return NextResponse.redirect(target, 308);
}
