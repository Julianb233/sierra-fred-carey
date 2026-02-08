/**
 * Middleware Utilities for Authentication
 *
 * Helper functions for the Next.js middleware to manage routes,
 * permissions, and authentication state.
 */

import type { JWTPayload, AuthContext, UserRole } from '@/types/auth';

/**
 * Configuration for protected routes
 */
export interface ProtectedRouteConfig {
  /** Exact paths to protect */
  paths: string[];
  /** Regex patterns to protect */
  patterns: RegExp[];
}

/**
 * Configuration for public routes
 */
export interface PublicRouteConfig {
  /** Exact paths that are public */
  routes: Set<string>;
  /** Regex patterns for public routes */
  patterns: RegExp[];
}

/**
 * Default protected routes
 */
export const DEFAULT_PROTECTED_ROUTES: ProtectedRouteConfig = {
  paths: ['/dashboard', '/agents', '/documents', '/settings', '/profile', '/chat'],
  patterns: [/^\/api\/protected\//],
};

/**
 * Default public routes
 */
export const DEFAULT_PUBLIC_ROUTES: PublicRouteConfig = {
  routes: new Set([
    '/login',
    '/register',
    '/forgot-password',
    '/reset-password',
    '/favicon.ico',
    '/robots.txt',
  ]),
  patterns: [
    /^\/api\/auth\//,
    /^\/_next\//,
    /^\/public\//,
    /\.json$|\.xml$|\.txt$/,
    /^\/api\/share\/[a-f0-9]+$/,  // Phase 33-01: public shareable links
  ],
};

/**
 * Cookie names to check for JWT tokens
 */
export const COOKIE_NAMES = ['token', 'auth-token', 'sahara_auth'];

/**
 * Check if pathname is a protected route
 */
export function isProtectedRoute(
  pathname: string,
  config: ProtectedRouteConfig = DEFAULT_PROTECTED_ROUTES
): boolean {
  // Check exact path matches (including subpaths)
  const isExactMatch = config.paths.some(
    path =>
      pathname === path || pathname.startsWith(`${path}/`)
  );

  if (isExactMatch) {
    return true;
  }

  // Check pattern matches
  return config.patterns.some(pattern => pattern.test(pathname));
}

/**
 * Check if pathname is a public route
 */
export function isPublicRoute(
  pathname: string,
  config: PublicRouteConfig = DEFAULT_PUBLIC_ROUTES
): boolean {
  // Exact match check
  if (config.routes.has(pathname)) {
    return true;
  }

  // Pattern match check
  return config.patterns.some(pattern => pattern.test(pathname));
}

/**
 * Check if route requires authentication
 */
export function requiresAuthentication(
  pathname: string,
  publicConfig: PublicRouteConfig = DEFAULT_PUBLIC_ROUTES,
  protectedConfig: ProtectedRouteConfig = DEFAULT_PROTECTED_ROUTES
): boolean {
  // Public routes don't require auth
  if (isPublicRoute(pathname, publicConfig)) {
    return false;
  }

  // Protected routes require auth
  if (isProtectedRoute(pathname, protectedConfig)) {
    return true;
  }

  // By default, unspecified routes don't require auth
  // (set protectedConfig to make specific routes require auth)
  return false;
}

/**
 * Create auth context from JWT payload
 */
export function createAuthContext(
  payload: JWTPayload | null | undefined
): AuthContext {
  if (!payload) {
    return {
      isAuthenticated: false,
      permissions: [],
    };
  }

  return {
    isAuthenticated: true,
    payload,
    userId: payload.sub || payload.userId,
    email: payload.email,
    role: payload.role as UserRole | undefined,
    permissions: payload.permissions || [],
    token: undefined, // Token is not passed in context for security
  };
}

/**
 * Check if user has permission
 */
export function hasPermission(
  context: AuthContext,
  permission: string
): boolean {
  if (!context.isAuthenticated) {
    return false;
  }
  return context.permissions.includes(permission);
}

/**
 * Check if user has role
 */
export function hasRole(
  context: AuthContext,
  roles: UserRole | UserRole[]
): boolean {
  if (!context.role) {
    return false;
  }

  if (Array.isArray(roles)) {
    return roles.includes(context.role);
  }

  return context.role === roles;
}

/**
 * Check if user is admin
 */
export function isAdmin(context: AuthContext): boolean {
  return context.role === 'admin';
}

/**
 * Rate limiting key generator
 */
export function generateRateLimitKey(
  identifier: string,
  endpoint: string
): string {
  return `rate-limit:${identifier}:${endpoint}`;
}

/**
 * Build login redirect URL
 */
export function buildLoginRedirectUrl(
  baseUrl: string,
  returnPath: string
): URL {
  const url = new URL('/login', baseUrl);
  url.searchParams.set('redirect', returnPath);
  return url;
}

/**
 * Check if path is API route
 */
export function isApiRoute(pathname: string): boolean {
  return pathname.startsWith('/api/');
}

/**
 * Check if path is dynamic route (contains [...])
 */
export function isDynamicRoute(pathname: string): boolean {
  return /\[.*\]/.test(pathname);
}

/**
 * Extract user identifier for logging
 */
export function getUserIdentifier(context: AuthContext): string {
  return context.userId || context.email || 'anonymous';
}

/**
 * Normalize pathname (remove trailing slashes)
 */
export function normalizePath(pathname: string): string {
  return pathname.replace(/\/$/, '') || '/';
}

/**
 * Check if request is from a bot
 */
export function isBotRequest(userAgent?: string): boolean {
  if (!userAgent) {
    return false;
  }

  const botPatterns = [
    /bot/i,
    /crawler/i,
    /spider/i,
    /scraper/i,
    /curl/i,
    /wget/i,
    /python/i,
    /java(?!script)/i,
  ];

  return botPatterns.some(pattern => pattern.test(userAgent));
}

/**
 * Create rate limit headers for response
 */
export interface RateLimitHeaders {
  'X-RateLimit-Limit': string;
  'X-RateLimit-Remaining': string;
  'X-RateLimit-Reset': string;
}

export function createRateLimitHeaders(
  limit: number,
  remaining: number,
  resetAt: number
): RateLimitHeaders {
  return {
    'X-RateLimit-Limit': limit.toString(),
    'X-RateLimit-Remaining': remaining.toString(),
    'X-RateLimit-Reset': resetAt.toString(),
  };
}

/**
 * Sanitize user input to prevent XSS
 *
 * - HTML-entity-encodes dangerous characters: < > & " '
 * - Strips javascript: and data: URI schemes (with whitespace bypass protection)
 * - Strips inline event handler patterns (on*=)
 * - Trims whitespace and limits length to 1000 characters
 */
export function sanitizeInput(input: string): string {
  let sanitized = input
    // HTML-entity-encode dangerous characters (& first to avoid double-encoding)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    // Strip javascript: and data: URI schemes (case-insensitive, allowing whitespace tricks)
    .replace(/javascript\s*:/gi, '')
    .replace(/data\s*:/gi, '')
    // Strip inline event handler patterns (on*=)
    .replace(/\bon\w+\s*=/gi, '');

  return sanitized
    .trim()
    .slice(0, 1000); // Limit length
}

/**
 * Validate email format (simple check)
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate token format (JWT structure check)
 */
export function isValidTokenFormat(token: string): boolean {
  const parts = token.split('.');
  return parts.length === 3 && parts.every(part => part.length > 0);
}
