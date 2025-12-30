import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

/**
 * Protected route configurations
 */
const PROTECTED_ROUTES = {
  paths: ["/dashboard", "/agents", "/documents", "/settings", "/profile"],
  patterns: [/^\/api\/protected\//],
};

/**
 * Public routes that bypass authentication
 */
const PUBLIC_ROUTES = new Set([
  "/login",
  "/register",
  "/signup",
  "/get-started",
  "/forgot-password",
  "/reset-password",
  "/favicon.ico",
  "/robots.txt",
  "/",
  "/about",
  "/pricing",
  "/features",
  "/contact",
  "/blog",
  "/terms",
  "/privacy",
  "/support",
  "/waitlist",
]);

/**
 * Public route patterns (regex-based)
 */
const PUBLIC_PATTERNS = [
  /^\/api\/auth\//,
  /^\/api\/onboard$/,
  /^\/api\/waitlist$/,
  /^\/_next\//,
  /^\/public\//,
  /\.json$|\.xml$|\.txt$|\.svg$|\.png$|\.jpg$|\.ico$/,
];

/**
 * Check if a pathname is a protected route
 */
function isProtectedRoute(pathname: string): boolean {
  const isExactMatch = PROTECTED_ROUTES.paths.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );

  if (isExactMatch) {
    return true;
  }

  return PROTECTED_ROUTES.patterns.some((pattern) => pattern.test(pathname));
}

/**
 * Check if a pathname is a public route
 */
function isPublicRoute(pathname: string): boolean {
  if (PUBLIC_ROUTES.has(pathname)) {
    return true;
  }

  return PUBLIC_PATTERNS.some((pattern) => pattern.test(pathname));
}

/**
 * Build login redirect URL with return path
 */
function buildLoginRedirectUrl(baseUrl: string, returnPath: string): URL {
  const loginUrl = new URL("/login", baseUrl);
  loginUrl.searchParams.set("redirect", returnPath);
  return loginUrl;
}

/**
 * Main middleware function - Supabase Auth session validation
 */
export async function middleware(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;

  // Always allow public routes
  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  // Create response to potentially modify cookies
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // Create Supabase client for middleware
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Set cookies on the request for downstream handlers
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          // Create new response with updated cookies
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          // Set cookies on the response
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session if needed (this also validates the session)
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  // If route is not protected, allow access
  if (!isProtectedRoute(pathname)) {
    return response;
  }

  // Protected route - require authentication
  if (error || !user) {
    // No valid session - redirect to login
    const loginUrl = buildLoginRedirectUrl(request.url, pathname);
    return NextResponse.redirect(loginUrl);
  }

  // User is authenticated - attach user info to headers for downstream handlers
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-user-id", user.id);
  requestHeaders.set("x-user-email", user.email || "");
  requestHeaders.set("x-user-authenticated", "true");

  // Return response with updated headers
  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

/**
 * Configure which routes this middleware applies to
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - Static files: _next/static, _next/image
     * - Public assets: favicon.ico, robots.txt, public/*
     */
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|public).*)",
  ],
};
