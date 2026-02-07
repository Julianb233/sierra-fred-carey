/**
 * Admin Session Token Management
 *
 * In-memory session store for admin authentication.
 * Session tokens replace raw admin keys in cookies for improved security:
 * - Tokens are random UUIDs with no relation to the secret key
 * - Sessions expire after 24 hours
 * - Sessions can be individually revoked on logout
 * - Expired sessions are cleaned up automatically on each createSession call
 *
 * In-memory store is acceptable because:
 * - Admin sessions are rare (few admins, infrequent login)
 * - Session loss on cold start = admin re-authenticates (low impact)
 * - For multi-instance deployments, migrate to Redis/Vercel KV later
 */

import { randomUUID } from "crypto";

// ============================================================================
// Types
// ============================================================================

interface AdminSession {
  createdAt: number;
  expiresAt: number;
}

// ============================================================================
// Session Store
// ============================================================================

const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

const sessions = new Map<string, AdminSession>();

// ============================================================================
// Public API
// ============================================================================

/**
 * Create a new admin session token.
 * Automatically cleans expired sessions on each call.
 */
export function createAdminSession(): string {
  return createSession();
}

export function createSession(): string {
  cleanExpiredSessions();

  const token = randomUUID();
  const now = Date.now();

  sessions.set(token, {
    createdAt: now,
    expiresAt: now + SESSION_TTL_MS,
  });

  return token;
}

/**
 * Validate an admin session token.
 * Returns true if the token exists and has not expired.
 */
export const verifyAdminSession = validateSession;

export function validateSession(token: string): boolean {
  const session = sessions.get(token);
  if (!session) return false;

  if (Date.now() > session.expiresAt) {
    // Lazily remove expired session on access
    sessions.delete(token);
    return false;
  }

  return true;
}

/**
 * Revoke an admin session token (e.g., on logout).
 */
export const revokeAdminSession = revokeSession;

export function revokeSession(token: string): void {
  sessions.delete(token);
}

/**
 * Remove all expired sessions from the store.
 */
export function cleanExpiredSessions(): void {
  const now = Date.now();
  for (const [token, session] of sessions.entries()) {
    if (now > session.expiresAt) {
      sessions.delete(token);
    }
  }
}
