import { jwtVerify } from 'jose';
import { NextRequest, NextResponse } from 'next/server';

/**
 * JWT payload interface with standard IANA claims + custom claims
 */
interface JWTPayload {
  /** Subject - typically user ID */
  sub?: string;
  /** Issued At - timestamp */
  iat?: number;
  /** Expiration Time - timestamp */
  exp?: number;
  /** Custom claims */
  userId?: string;
  email?: string;
  role?: string;
  permissions?: string[];
  [key: string]: any;
}

/**
 * Decoded JWT response
 */
interface DecodedToken {
  payload: JWTPayload;
  isValid: boolean;
}

/**
 * Protected route configurations
 */
const PROTECTED_ROUTES = {
  paths: ['/dashboard', '/agents', '/documents', '/settings', '/profile'],
  patterns: [/^\/api\/protected\//],
};

/**
 * Public routes that bypass authentication
 */
const PUBLIC_ROUTES = new Set([
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/favicon.ico',
  '/robots.txt',
]);

/**
 * Public route patterns (regex-based)
 */
const PUBLIC_PATTERNS = [
  /^\/api\/auth\//,
  /^\/_next\//,
  /^\/public\//,
  /\.json$|\.xml$|\.txt$/,
];

/**
 * Cookie names to check for JWT token
 */
const COOKIE_NAMES = ['token', 'auth-token', 'sahara_auth'];

/**
 * Get JWT secret from environment or use default (NOT FOR PRODUCTION)
 */
function getJWTSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    // Log warning but allow fallback for development
    if (process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET environment variable must be set in production');
    }
    console.warn(
      '[middleware] JWT_SECRET not set, using development default. ' +
      'Set JWT_SECRET environment variable for production.'
    );
    return new TextEncoder().encode('sahara-default-secret-change-in-production');
  }

  return new TextEncoder().encode(secret);
}

/**
 * Check if a pathname is a protected route
 */
function isProtectedRoute(pathname: string): boolean {
  // Check exact path matches
  const isExactMatch = PROTECTED_ROUTES.paths.some(path =>
    pathname === path || pathname.startsWith(`${path}/`)
  );

  if (isExactMatch) {
    return true;
  }

  // Check pattern matches
  return PROTECTED_ROUTES.patterns.some(pattern => pattern.test(pathname));
}

/**
 * Check if a pathname is a public route
 */
function isPublicRoute(pathname: string): boolean {
  // Exact match check
  if (PUBLIC_ROUTES.has(pathname)) {
    return true;
  }

  // Pattern match check
  return PUBLIC_PATTERNS.some(pattern => pattern.test(pathname));
}

/**
 * Extract JWT token from request cookies
 * Checks multiple cookie names for flexibility
 */
function extractTokenFromCookies(request: NextRequest): string | null {
  for (const cookieName of COOKIE_NAMES) {
    const token = request.cookies.get(cookieName)?.value;
    if (token) {
      return token;
    }
  }
  return null;
}

/**
 * Verify JWT token signature and expiration
 * Returns decoded payload if valid, null otherwise
 */
async function verifyJWT(token: string): Promise<DecodedToken> {
  try {
    const secret = getJWTSecret();
    const verified = await jwtVerify(token, secret);
    const payload = verified.payload as JWTPayload;

    // Additional expiration check (jose does this by default, but explicit is safer)
    if (payload.exp) {
      const currentTime = Math.floor(Date.now() / 1000);
      if (payload.exp < currentTime) {
        console.warn('[middleware] Token expired');
        return { payload: {}, isValid: false };
      }
    }

    return { payload, isValid: true };
  } catch (error) {
    if (error instanceof Error) {
      console.error('[middleware] Token verification failed:', error.message);
    }
    return { payload: {}, isValid: false };
  }
}

/**
 * Build login redirect URL with return path
 */
function buildLoginRedirectUrl(
  baseUrl: string,
  returnPath: string
): URL {
  const loginUrl = new URL('/login', baseUrl);
  loginUrl.searchParams.set('redirect', returnPath);
  return loginUrl;
}

/**
 * Clear auth cookies from response
 */
function clearAuthCookies(response: NextResponse): void {
  for (const cookieName of COOKIE_NAMES) {
    response.cookies.delete(cookieName);
  }
}

/**
 * Main middleware function - runs on every request
 */
export async function middleware(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;

  // Always allow public routes
  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  // If route is not protected, allow access
  if (!isProtectedRoute(pathname)) {
    return NextResponse.next();
  }

  // Protected route - require authentication
  const token = extractTokenFromCookies(request);

  if (!token) {
    // No token found - redirect to login
    const loginUrl = buildLoginRedirectUrl(request.url, pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Verify token
  const { payload, isValid } = await verifyJWT(token);

  if (!isValid) {
    // Invalid or expired token - redirect to login
    const loginUrl = buildLoginRedirectUrl(request.url, pathname);
    const response = NextResponse.redirect(loginUrl);
    clearAuthCookies(response);
    return response;
  }

  // Token is valid - allow request to proceed
  // Attach user info to headers for downstream middleware/handlers
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-user-id', payload.sub || payload.userId || '');
  requestHeaders.set('x-user-email', payload.email || '');
  requestHeaders.set('x-user-role', payload.role || '');

  // Optional: Attach full payload (be careful with sensitive data)
  if (payload.sub || payload.userId) {
    requestHeaders.set('x-user-authenticated', 'true');
  }

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

/**
 * Configure which routes this middleware applies to
 *
 * The matcher ensures middleware only runs on necessary routes,
 * improving performance by skipping static assets and _next internals
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - Static files: _next/static, _next/image
     * - Public assets: favicon.ico, robots.txt, public/*
     * - API internal: _rpc
     */
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|public).*)',
  ],
};
