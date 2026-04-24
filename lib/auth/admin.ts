/**
 * Centralized Admin Authentication
 *
 * Single source of truth for admin auth across all routes.
 * Supports two mechanisms:
 *   1. Supabase session + profile.role === 'admin' (browser/layouts/server components)
 *   2. x-admin-key header + timing-safe compare against ADMIN_SECRET_KEY (CLI/API)
 *
 * A logged-in user without the 'admin' role resolves to false.
 */

import { timingSafeEqual, createHmac } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerSupabase } from "@/lib/supabase/server";

function safeCompare(a: string, b: string): boolean {
  try {
    const hmac1 = createHmac("sha256", "admin-comparison-key").update(a).digest();
    const hmac2 = createHmac("sha256", "admin-comparison-key").update(b).digest();
    return timingSafeEqual(hmac1, hmac2);
  } catch {
    return false;
  }
}

async function isAdminProfile(): Promise<boolean> {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    return profile?.role === "admin";
  } catch (err) {
    console.error("[auth/admin] isAdminProfile failed:", err);
    return false;
  }
}

/**
 * Check admin auth for API routes. Accepts either a valid x-admin-key header
 * or a Supabase session whose profile.role === 'admin'.
 */
export async function isAdminRequest(request: NextRequest): Promise<boolean> {
  const headerKey = request.headers.get("x-admin-key");
  const secret = process.env.ADMIN_SECRET_KEY;
  if (headerKey && secret && safeCompare(headerKey, secret)) return true;
  return isAdminProfile();
}

/**
 * Check admin auth for Server Components / layouts.
 */
export async function isAdminSession(): Promise<boolean> {
  return isAdminProfile();
}

/**
 * Check admin auth via either header OR Supabase session.
 */
export async function isAdminAny(request: NextRequest): Promise<boolean> {
  return isAdminRequest(request);
}

/**
 * Guard for API routes - returns 401 response if not admin.
 * Usage: const denied = await requireAdminRequest(request); if (denied) return denied;
 */
export async function requireAdminRequest(request: NextRequest): Promise<NextResponse | null> {
  if (!(await isAdminRequest(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}
