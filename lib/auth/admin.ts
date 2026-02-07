/**
 * Centralized Admin Authentication
 *
 * Single source of truth for admin auth across all routes.
 * Supports both session-cookie-based auth (for browser/layouts)
 * and header-based auth (for API/CLI usage).
 *
 * Auth priority for isAdminRequest():
 *   1. adminSession cookie -> validated via in-memory session store
 *   2. x-admin-key header  -> timing-safe comparison against ADMIN_SECRET_KEY
 */

import { timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/auth/admin-sessions";

/**
 * Timing-safe string comparison to prevent timing attacks.
 */
function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a), Buffer.from(b));
  } catch {
    return false;
  }
}

/**
 * Check admin auth via adminSession cookie or x-admin-key header (for API routes).
 *
 * 1. First checks for `adminSession` cookie and validates via session store
 * 2. Falls back to `x-admin-key` header against ADMIN_SECRET_KEY (for API/CLI usage)
 */
export function isAdminRequest(request: NextRequest): boolean {
  // 1. Check adminSession cookie from the request
  const sessionToken = request.cookies.get("adminSession")?.value;
  if (sessionToken && verifyAdminSession(sessionToken)) {
    return true;
  }

  // 2. Fallback: check x-admin-key header against ADMIN_SECRET_KEY
  const secret = process.env.ADMIN_SECRET_KEY;
  if (!secret) return false;
  const adminKey = request.headers.get("x-admin-key");
  if (!adminKey) return false;
  return safeCompare(adminKey, secret);
}

/**
 * Check admin auth via session token cookie (for layouts/server components).
 * Uses Next.js cookies() API which is available in Server Components.
 */
export async function isAdminSession(): Promise<boolean> {
  const cookieStore = await cookies();

  // Check adminSession token
  const sessionToken = cookieStore.get("adminSession")?.value;
  if (sessionToken && verifyAdminSession(sessionToken)) return true;

  return false;
}

/**
 * Check admin auth via either cookie OR header.
 * Use this when a route needs to support both mechanisms.
 */
export async function isAdminAny(request: NextRequest): Promise<boolean> {
  // isAdminRequest already checks both cookie and header
  if (isAdminRequest(request)) return true;
  // Also check via Next.js cookies() API for server component contexts
  return isAdminSession();
}

/**
 * Guard for API routes - returns 401 response if not admin.
 * Usage: const denied = requireAdminRequest(request); if (denied) return denied;
 */
export function requireAdminRequest(request: NextRequest): NextResponse | null {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}
