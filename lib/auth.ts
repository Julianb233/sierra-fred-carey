import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { sql } from "@/lib/db/neon";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "sahara-default-secret-change-in-production"
);
const COOKIE_NAME = "sahara_auth";

export interface User {
  id: number;
  email: string;
  name: string | null;
  stage: string | null;
  challenges: string[];
  created_at: Date;
}

export interface AuthResult {
  success: boolean;
  user?: User;
  error?: string;
}

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

/**
 * Compare a password with a hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Create a JWT token for a user
 */
export async function createToken(userId: number, email: string): Promise<string> {
  return new SignJWT({ userId, email })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .setIssuedAt()
    .sign(JWT_SECRET);
}

/**
 * Verify a JWT token
 */
export async function verifyToken(token: string): Promise<{ userId: number; email: string } | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as { userId: number; email: string };
  } catch {
    return null;
  }
}

/**
 * Set auth cookie
 */
export async function setAuthCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: "/",
  });
}

/**
 * Get auth cookie
 */
export async function getAuthCookie(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(COOKIE_NAME)?.value || null;
}

/**
 * Clear auth cookie
 */
export async function clearAuthCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

/**
 * Get current user from session
 */
export async function getCurrentUser(): Promise<User | null> {
  try {
    const token = await getAuthCookie();
    if (!token) return null;

    const payload = await verifyToken(token);
    if (!payload) return null;

    const result = await sql`
      SELECT id, email, name, stage, challenges, created_at
      FROM users
      WHERE id = ${payload.userId}
    `;

    if (result.length === 0) return null;

    return {
      id: result[0].id,
      email: result[0].email,
      name: result[0].name,
      stage: result[0].stage,
      challenges: result[0].challenges || [],
      created_at: result[0].created_at,
    };
  } catch (error) {
    console.error("[auth] Error getting current user:", error);
    return null;
  }
}

/**
 * Sign up a new user
 */
export async function signUp(
  email: string,
  password: string,
  name?: string,
  stage?: string,
  challenges?: string[]
): Promise<AuthResult> {
  try {
    // Check if user already exists
    const existing = await sql`SELECT id FROM users WHERE email = ${email.toLowerCase()}`;
    if (existing.length > 0) {
      return { success: false, error: "An account with this email already exists" };
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user
    const result = await sql`
      INSERT INTO users (email, password_hash, name, stage, challenges)
      VALUES (${email.toLowerCase()}, ${passwordHash}, ${name || null}, ${stage || null}, ${JSON.stringify(challenges || [])})
      RETURNING id, email, name, stage, challenges, created_at
    `;

    const user = {
      id: result[0].id,
      email: result[0].email,
      name: result[0].name,
      stage: result[0].stage,
      challenges: result[0].challenges || [],
      created_at: result[0].created_at,
    };

    // Create and set token
    const token = await createToken(user.id, user.email);
    await setAuthCookie(token);

    return { success: true, user };
  } catch (error) {
    console.error("[auth] Sign up error:", error);
    return { success: false, error: "Failed to create account" };
  }
}

/**
 * Sign in an existing user
 */
export async function signIn(email: string, password: string): Promise<AuthResult> {
  try {
    // Find user
    const result = await sql`
      SELECT id, email, password_hash, name, stage, challenges, created_at
      FROM users
      WHERE email = ${email.toLowerCase()}
    `;

    if (result.length === 0) {
      return { success: false, error: "Invalid email or password" };
    }

    const userRow = result[0];

    // Check if user has a password (might be from onboarding without password)
    if (!userRow.password_hash) {
      return { success: false, error: "Please complete your account setup first" };
    }

    // Verify password
    const valid = await verifyPassword(password, userRow.password_hash);
    if (!valid) {
      return { success: false, error: "Invalid email or password" };
    }

    const user = {
      id: userRow.id,
      email: userRow.email,
      name: userRow.name,
      stage: userRow.stage,
      challenges: userRow.challenges || [],
      created_at: userRow.created_at,
    };

    // Create and set token
    const token = await createToken(user.id, user.email);
    await setAuthCookie(token);

    return { success: true, user };
  } catch (error) {
    console.error("[auth] Sign in error:", error);
    return { success: false, error: "Failed to sign in" };
  }
}

/**
 * Sign out the current user
 */
export async function signOut(): Promise<void> {
  await clearAuthCookie();
}

/**
 * Check if user is authenticated (for middleware)
 */
export async function isAuthenticated(): Promise<boolean> {
  const user = await getCurrentUser();
  return user !== null;
}

/**
 * Get user ID from session (convenience function)
 * Returns as string for compatibility with existing code
 */
export async function getUserId(): Promise<string | null> {
  const user = await getCurrentUser();
  return user?.id ? String(user.id) : null;
}

/**
 * Optional auth - returns user ID or null without throwing
 */
export async function getOptionalUserId(): Promise<string | null> {
  return getUserId();
}

/**
 * Require authentication - throws if not authenticated
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
