/**
 * Authentication Module - Supabase Auth Implementation
 *
 * This module provides authentication functions using Supabase Auth.
 * Migrated from custom JWT + Neon PostgreSQL implementation.
 */

// Re-export all auth functions from Supabase helpers for backward compatibility
export {
  type User,
  type AuthResult,
  getCurrentUser,
  getUserId,
  isAuthenticated,
  requireAuth,
  updateProfile,
  getSession,
  refreshSession,
} from "./supabase/auth-helpers";

// Import the actual implementations
import {
  supabaseSignUp,
  supabaseSignIn,
  supabaseSignOut,
  getCurrentUser as getUser,
} from "./supabase/auth-helpers";

/**
 * Sign up a new user
 * Wrapper for Supabase signUp for backward compatibility
 */
export async function signUp(
  email: string,
  password: string,
  name?: string,
  stage?: string,
  challenges?: string[]
) {
  return supabaseSignUp(email, password, { name, stage, challenges });
}

/**
 * Sign in an existing user
 * Wrapper for Supabase signIn for backward compatibility
 */
export async function signIn(email: string, password: string) {
  return supabaseSignIn(email, password);
}

/**
 * Sign out the current user
 */
export async function signOut(): Promise<void> {
  return supabaseSignOut();
}

/**
 * Optional auth - returns user ID or null without throwing
 */
export async function getOptionalUserId(): Promise<string | null> {
  const user = await getUser();
  return user?.id || null;
}

// Legacy exports for compatibility with old code
// These are no longer needed with Supabase but kept for any code that might import them

/**
 * @deprecated Supabase handles cookie management automatically
 */
export async function setAuthCookie(_token: string) {
  console.warn("[auth] setAuthCookie is deprecated - Supabase manages cookies automatically");
}

/**
 * @deprecated Supabase handles cookie management automatically
 */
export async function getAuthCookie(): Promise<string | null> {
  console.warn("[auth] getAuthCookie is deprecated - use getSession() instead");
  return null;
}

/**
 * @deprecated Supabase handles cookie management automatically
 */
export async function clearAuthCookie() {
  console.warn("[auth] clearAuthCookie is deprecated - use signOut() instead");
}

/**
 * @deprecated Supabase handles password hashing
 */
export async function hashPassword(_password: string): Promise<string> {
  throw new Error("hashPassword is deprecated - Supabase handles password hashing");
}

/**
 * @deprecated Supabase handles password verification
 */
export async function verifyPassword(_password: string, _hash: string): Promise<boolean> {
  throw new Error("verifyPassword is deprecated - Supabase handles password verification");
}

/**
 * @deprecated Supabase handles token creation
 */
export async function createToken(_userId: number, _email: string): Promise<string> {
  throw new Error("createToken is deprecated - Supabase handles token management");
}

/**
 * @deprecated Supabase handles token verification
 */
export async function verifyToken(_token: string): Promise<{ userId: number; email: string } | null> {
  throw new Error("verifyToken is deprecated - use getSession() instead");
}
