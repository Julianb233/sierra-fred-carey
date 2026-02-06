/**
 * Centralized Admin Authentication
 *
 * Single source of truth for admin auth across all routes.
 * Supports both cookie-based auth (for layouts/server components)
 * and header-based auth (for API routes).
 *
 * Uses timing-safe comparison to prevent timing attacks.
 */

import { timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

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
 * Check admin auth via x-admin-key header (for API routes).
 */
export function isAdminRequest(request: NextRequest): boolean {
  const secret = process.env.ADMIN_SECRET_KEY;
  if (!secret) return false;
  const adminKey = request.headers.get("x-admin-key");
  if (!adminKey) return false;
  return safeCompare(adminKey, secret);
}

/**
 * Check admin auth via cookie (for layouts/server components).
 */
export async function isAdminSession(): Promise<boolean> {
  const secret = process.env.ADMIN_SECRET_KEY;
  if (!secret) return false;
  const cookieStore = await cookies();
  const adminKey = cookieStore.get("adminKey")?.value;
  if (!adminKey) return false;
  return safeCompare(adminKey, secret);
}

/**
 * Check admin auth via either cookie OR header.
 * Use this when a route needs to support both mechanisms.
 */
export async function isAdminAny(request: NextRequest): Promise<boolean> {
  // Check header first (API calls)
  if (isAdminRequest(request)) return true;
  // Fall back to cookie (browser requests)
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
