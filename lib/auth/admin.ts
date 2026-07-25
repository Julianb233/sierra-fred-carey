/**
 * Centralized Admin Authentication
 *
 * Single source of truth for admin auth across all routes.
 * Supports both session-cookie-based auth (for browser/layouts)
 * and header-based auth (for API/CLI usage).
 *
 * Auth priority for isAdminRequest():
 *   1. adminSession cookie -> validated as a signed JWT
 *   2. x-admin-key header  -> timing-safe comparison against ADMIN_SECRET_KEY
 */

import { timingSafeEqual, createHmac } from "crypto";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/auth/admin-sessions";

/**
 * Timing-safe string comparison that doesn't leak length information.
 * Uses HMAC to normalize both inputs to the same length before comparing.
 */
function safeCompare(a: string, b: string): boolean {
  try {
    const hmac1 = createHmac("sha256", "admin-comparison-key").update(a).digest();
    const hmac2 = createHmac("sha256", "admin-comparison-key").update(b).digest();
    return timingSafeEqual(hmac1, hmac2);
  } catch {
    return false;
  }
}

/**
 * Check admin auth via adminSession cookie or x-admin-key header (for API routes).
 *
 * Fails closed when ADMIN_SECRET_KEY is missing.
 */
export async function isAdminRequest(request: NextRequest): Promise<boolean> {
  const secret = process.env.ADMIN_SECRET_KEY;
  if (!secret) return false;

  const sessionToken = request.cookies.get("adminSession")?.value;
  if (sessionToken && (await verifyAdminSession(sessionToken))) {
    return true;
  }

  const providedKey = request.headers.get("x-admin-key");
  return Boolean(providedKey && safeCompare(providedKey, secret));
}

/**
 * Check admin auth via session token cookie (for layouts/server components).
 * Uses Next.js cookies() API which is available in Server Components.
 *
 * Fails closed when ADMIN_SECRET_KEY is missing.
 */
export async function isAdminSession(): Promise<boolean> {
  if (!process.env.ADMIN_SECRET_KEY) return false;
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("adminSession")?.value;
  return Boolean(sessionToken && (await verifyAdminSession(sessionToken)));
}

/**
 * Check admin auth via either cookie OR header.
 * Use this when a route needs to support both mechanisms.
 */
export async function isAdminAny(request: NextRequest): Promise<boolean> {
  // isAdminRequest already checks both cookie and header
  if (await isAdminRequest(request)) return true;
  // Also check via Next.js cookies() API for server component contexts
  return isAdminSession();
}

/**
 * Guard for API routes - returns 401 response if not admin.
 * Usage: const denied = requireAdminRequest(request); if (denied) return denied;
 */
export async function requireAdminRequest(request: NextRequest): Promise<NextResponse | null> {
  if (!(await isAdminRequest(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}
