import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { isProtectedRoute } from "@/lib/auth/middleware-utils";
import { corsHeaders, isWebhookPath } from "@/lib/api/cors";
import * as Sentry from "@sentry/nextjs";

export async function middleware(request: NextRequest) {
  // Phase 59-02: Track request duration for slow request detection
  const start = Date.now();

  const { pathname } = request.nextUrl;
  const origin = request.headers.get("origin");

  // Phase 25-02: Correlation ID for structured logging
  const requestId = request.headers.get("x-request-id") || crypto.randomUUID();

  // Handle CORS preflight (OPTIONS) for API routes
  if (request.method === "OPTIONS" && pathname.startsWith("/api/")) {
    const preflightResponse = new NextResponse(null, { status: 204 });
    const headers = corsHeaders(origin);
    for (const [key, value] of Object.entries(headers)) {
      preflightResponse.headers.set(key, value);
    }
    preflightResponse.headers.set("X-Request-ID", requestId);
    return preflightResponse;
  }

  try {
    // Refresh auth session on every request
    const { response, user } = await updateSession(request);

    // Apply CORS headers to API responses (skip webhooks -- they use signature verification)
    if (pathname.startsWith("/api/") && !isWebhookPath(pathname)) {
      const headers = corsHeaders(origin);
      for (const [key, value] of Object.entries(headers)) {
        response.headers.set(key, value);
      }
    }

    // Check if this route requires authentication
    if (isProtectedRoute(pathname) && !user) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      const redirectResponse = NextResponse.redirect(loginUrl);
      redirectResponse.headers.set("X-Request-ID", requestId);
      return redirectResponse;
    }

    // Propagate correlation ID and pathname on every response
    response.headers.set("X-Request-ID", requestId);
    response.headers.set("x-pathname", pathname);

    // Phase 59-02: Log slow middleware requests as Sentry breadcrumbs
    const duration = Date.now() - start;
    if (process.env.NEXT_PUBLIC_SENTRY_DSN && duration > 2000) {
      Sentry.addBreadcrumb({
        message: `Slow middleware: ${pathname} (${duration}ms)`,
        category: "performance",
        level: "warning",
        data: { pathname, duration },
      });
    }

    return response;
  } catch (err) {
    console.error("[middleware] Auth check failed:", err);
    // For protected routes, redirect to login rather than allowing unauthenticated access
    if (isProtectedRoute(pathname)) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      const redirectResponse = NextResponse.redirect(loginUrl);
      redirectResponse.headers.set("X-Request-ID", requestId);
      return redirectResponse;
    }
    // For non-protected routes, allow through
    const fallback = NextResponse.next();
    fallback.headers.set("X-Request-ID", requestId);
    return fallback;
  }
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - Static assets (svg, png, jpg, jpeg, gif, webp, ico)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
