/**
 * JWT Token Utilities
 *
 * Edge-compatible utilities for signing, verifying, and managing JWT tokens.
 * Uses jose library for JOSE compliance and Edge Runtime compatibility.
 */

import { jwtVerify, SignJWT } from 'jose';
import type { JWTPayload } from '@/types/auth';

/**
 * Convert secret string to Uint8Array for jose
 */
export function secretToUint8Array(secret: string): Uint8Array {
  return new TextEncoder().encode(secret);
}

/**
 * Get JWT secret from environment or throw error
 */
export function getJWTSecret(): string {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'JWT_SECRET environment variable is required in production'
      );
    }
    console.warn(
      'JWT_SECRET not set, using development default. ' +
      'Set JWT_SECRET environment variable for production.'
    );
    return 'sahara-dev-secret-change-in-production';
  }

  return secret;
}

/**
 * Sign a JWT token
 *
 * @param payload - Data to include in token
 * @param options - Signing options
 * @returns Signed JWT token
 */
export async function signJWT(
  payload: Record<string, any>,
  options?: {
    expiresIn?: string | number;
    secret?: string;
  }
): Promise<string> {
  const secret = options?.secret || getJWTSecret();
  const secretBuffer = secretToUint8Array(secret);

  const jwt = new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt();

  // Set expiration
  if (options?.expiresIn) {
    jwt.setExpirationTime(options.expiresIn);
  } else {
    // Default to 7 days
    jwt.setExpirationTime('7d');
  }

  return jwt.sign(secretBuffer);
}

/**
 * Verify and decode a JWT token
 *
 * @param token - JWT token to verify
 * @param secret - Secret to verify with (optional, uses env var)
 * @returns Decoded payload or null if invalid
 */
export async function verifyTokenSafely(
  token: string,
  secret?: string
): Promise<JWTPayload | null> {
  try {
    const secretKey = secret || getJWTSecret();
    const secretBuffer = secretToUint8Array(secretKey);

    const verified = await jwtVerify(token, secretBuffer);
    return verified.payload as JWTPayload;
  } catch (error) {
    if (error instanceof Error) {
      console.error('Token verification failed:', error.message);
    }
    return null;
  }
}

/**
 * Verify token or throw error
 *
 * @param token - JWT token to verify
 * @param secret - Secret to verify with (optional, uses env var)
 * @throws Error if token is invalid
 * @returns Decoded payload
 */
export async function verifyToken(
  token: string,
  secret?: string
): Promise<JWTPayload> {
  const secretKey = secret || getJWTSecret();
  const secretBuffer = secretToUint8Array(secretKey);

  try {
    const verified = await jwtVerify(token, secretBuffer);
    return verified.payload as JWTPayload;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Token verification failed: ${error.message}`);
    }
    throw new Error('Token verification failed');
  }
}

/**
 * Check if token is expired
 */
export function isTokenExpired(payload: JWTPayload): boolean {
  if (!payload.exp) {
    return false; // No expiration claim
  }

  const currentTime = Math.floor(Date.now() / 1000);
  return payload.exp < currentTime;
}

/**
 * Get remaining time before token expires (in seconds)
 */
export function getTokenExpiresIn(payload: JWTPayload): number | null {
  if (!payload.exp) {
    return null;
  }

  const currentTime = Math.floor(Date.now() / 1000);
  const remaining = payload.exp - currentTime;

  return remaining > 0 ? remaining : 0;
}

/**
 * Extract token from Authorization header
 *
 * @param authHeader - Authorization header value (e.g., "Bearer token...")
 * @returns Token or null if not found
 */
export function extractTokenFromHeader(authHeader?: string): string | null {
  if (!authHeader) {
    return null;
  }

  const parts = authHeader.split(' ');

  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
    return null;
  }

  return parts[1];
}

/**
 * Extract token from cookies (checks multiple names)
 */
export function extractTokenFromCookies(
  cookieHeader?: string,
  cookieNames: string[] = ['token', 'auth-token', 'sahara_auth']
): string | null {
  if (!cookieHeader) {
    return null;
  }

  const cookies = parseCookies(cookieHeader);

  for (const name of cookieNames) {
    if (cookies[name]) {
      return cookies[name];
    }
  }

  return null;
}

/**
 * Parse cookie header into object
 */
function parseCookies(cookieHeader: string): Record<string, string> {
  const cookies: Record<string, string> = {};

  cookieHeader.split(';').forEach(cookie => {
    const [key, value] = cookie.trim().split('=');
    if (key && value) {
      cookies[key] = decodeURIComponent(value);
    }
  });

  return cookies;
}

/**
 * Create token expiration date
 *
 * @param expiresIn - Seconds or time string like "7d"
 * @returns Expiration timestamp (seconds since epoch)
 */
export function calculateExpiration(expiresIn: string | number = '7d'): number {
  let seconds = 0;

  if (typeof expiresIn === 'number') {
    seconds = expiresIn;
  } else if (typeof expiresIn === 'string') {
    const match = expiresIn.match(/^(\d+)([a-z])$/);
    if (!match) {
      throw new Error(`Invalid expiresIn format: ${expiresIn}`);
    }

    const [, amount, unit] = match;
    const value = parseInt(amount, 10);

    switch (unit) {
      case 's':
        seconds = value;
        break;
      case 'm':
        seconds = value * 60;
        break;
      case 'h':
        seconds = value * 60 * 60;
        break;
      case 'd':
        seconds = value * 24 * 60 * 60;
        break;
      case 'w':
        seconds = value * 7 * 24 * 60 * 60;
        break;
      default:
        throw new Error(`Unknown unit: ${unit}`);
    }
  }

  return Math.floor(Date.now() / 1000) + seconds;
}
