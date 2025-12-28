/**
 * Authentication Utilities
 *
 * Provides secure authentication helpers using Supabase Auth.
 * All userId extraction MUST go through these functions to prevent spoofing.
 */

import { createClient } from "@/lib/supabase/server";
import { NextRequest } from "next/server";

export interface AuthUser {
  id: string;
  email: string;
  emailVerified: boolean;
  metadata?: Record<string, unknown>;
}

/**
 * Get authenticated user from server-side session
 *
 * SECURITY: This is the ONLY way to get userId in API routes.
 * Never trust client-provided headers like x-user-id.
 *
 * @returns AuthUser if authenticated, null if not
 */
export async function getAuthUser(): Promise<AuthUser | null> {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return null;
    }

    return {
      id: user.id,
      email: user.email ?? "",
      emailVerified: user.email_confirmed_at !== null,
      metadata: user.user_metadata,
    };
  } catch (error) {
    console.error("[getAuthUser] Error:", error);
    return null;
  }
}

/**
 * Get authenticated user ID (convenience function)
 *
 * @returns User ID string if authenticated, null if not
 */
export async function getUserId(): Promise<string | null> {
  const user = await getAuthUser();
  return user?.id ?? null;
}

/**
 * Require authentication - throws if not authenticated
 *
 * Use this at the start of protected API routes:
 * ```ts
 * const userId = await requireAuth();
 * // If we get here, user is authenticated
 * ```
 *
 * @throws Response with 401 status if not authenticated
 * @returns User ID string
 */
export async function requireAuth(): Promise<string> {
  const userId = await getUserId();

  if (!userId) {
    throw new Response(
      JSON.stringify({
        success: false,
        error: "Authentication required",
        code: "AUTH_REQUIRED",
      }),
      {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  return userId;
}

/**
 * Verify user owns a resource
 *
 * Use this to prevent users from accessing other users' data:
 * ```ts
 * const userId = await requireAuth();
 * await requireOwnership(userId, resource.userId);
 * ```
 *
 * @throws Response with 403 status if ownership check fails
 */
export async function requireOwnership(
  authenticatedUserId: string,
  resourceUserId: string
): Promise<void> {
  if (authenticatedUserId !== resourceUserId) {
    throw new Response(
      JSON.stringify({
        success: false,
        error: "Access denied",
        code: "FORBIDDEN",
      }),
      {
        status: 403,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

/**
 * Check if request is authenticated (middleware-safe)
 *
 * This version works in middleware where we can't use the full auth API.
 * It only checks if the session cookie exists and is valid.
 *
 * @param request NextRequest from middleware
 * @returns true if authenticated, false if not
 */
export async function isAuthenticated(request: NextRequest): Promise<boolean> {
  try {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    return session !== null;
  } catch {
    return false;
  }
}

/**
 * Optional auth - returns user ID or null without throwing
 *
 * Use this for endpoints that work with or without auth:
 * ```ts
 * const userId = await getOptionalUserId();
 * if (userId) {
 *   // Personalized response
 * } else {
 *   // Generic response
 * }
 * ```
 */
export async function getOptionalUserId(): Promise<string | null> {
  return getUserId();
}

/**
 * Sign out helper
 */
export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
}

/**
 * DEPRECATED: Do not use these patterns
 *
 * ❌ NEVER DO THIS:
 * ```ts
 * const userId = request.headers.get("x-user-id"); // SPOOFABLE!
 * const userId = request.cookies.get("userId")?.value; // SPOOFABLE!
 * const userId = "anonymous"; // INSECURE!
 * ```
 *
 * ✅ ALWAYS DO THIS:
 * ```ts
 * const userId = await requireAuth(); // SECURE!
 * ```
 */
