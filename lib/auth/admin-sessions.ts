/**
 * Admin Session Token Management
 *
 * Uses signed JWTs for admin sessions. Stateless — works across
 * Vercel serverless Lambda invocations with no server-side store.
 *
 * The session token IS the JWT, signed with ADMIN_SECRET_KEY.
 * No in-memory Map, no Redis, no database needed.
 */

import { SignJWT, jwtVerify } from "jose"

// ============================================================================
// Config
// ============================================================================

const SESSION_TTL = "24h"
const ISSUER = "sahara-admin"
const AUDIENCE = "sahara-admin-panel"

function getSigningKey(): Uint8Array {
  const key = process.env.ADMIN_SECRET_KEY
  if (!key) throw new Error("ADMIN_SECRET_KEY not configured")
  return new TextEncoder().encode(key)
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Create a new admin session token (signed JWT).
 */
export async function createAdminSession(): Promise<string> {
  return createSession()
}

export async function createSession(): Promise<string> {
  const token = await new SignJWT({ role: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setExpirationTime(SESSION_TTL)
    .sign(getSigningKey())

  return token
}

/**
 * Validate an admin session token.
 * Returns true if the JWT is valid and not expired.
 */
export const verifyAdminSession = validateSession

export async function validateSession(token: string): Promise<boolean> {
  try {
    await jwtVerify(token, getSigningKey(), {
      issuer: ISSUER,
      audience: AUDIENCE,
    })
    return true
  } catch {
    return false
  }
}

/**
 * Revoke an admin session token.
 * With stateless JWTs, revocation is a no-op — the token simply expires.
 * The caller should clear the cookie.
 */
export const revokeAdminSession = revokeSession

export function revokeSession(_token: string): void {
  // Stateless JWT — revocation handled by clearing the cookie on the client
}

/**
 * No-op for backwards compatibility.
 */
export function cleanExpiredSessions(): void {
  // Stateless JWTs expire on their own
}
