import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { isProtectedRoute } from "@/lib/auth/middleware-utils";
import { corsHeaders, isWebhookPath } from "@/lib/api/cors";
import * as Sentry from "@sentry/nextjs";

// ---------------------------------------------------------------------------
// CSP nonce generation + policy builder (AI-334)
// ---------------------------------------------------------------------------
function generateCsp(nonce: string): string {
  const directives = [
    "default-src 'self'",
    // 'strict-dynamic' lets nonce-trusted scripts load additional scripts
    // without explicit allowlisting. The origin allowlist is kept as a
    // fallback for browsers that don't support strict-dynamic.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://js.stripe.com https://link.msgsndr.com https://vercel.live https://va.vercel-scripts.com`,
    // style-src keeps 'unsafe-inline' -- Tailwind CSS and React inject
    // inline styles that cannot receive nonces without a full migration.
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "connect-src 'self' https://*.supabase.co https://api.stripe.com wss://*.supabase.co https://*.livekit.cloud wss://*.livekit.cloud https://*.anthropic.com https://*.openai.com https://*.ingest.sentry.io https://*.msgsndr.com",
    "frame-src 'self' https://js.stripe.com https://hooks.stripe.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ];
  return directives.join("; ");
}

export async function middleware(request: NextRequest) {
  // Phase 59-02: Track request duration for slow request detection
  const start = Date.now();

  const { pathname } = request.nextUrl;
  const origin = request.headers.get("origin");

  // Phase 25-02: Correlation ID for structured logging
  const requestId =
    request.headers.get("x-request-id") || crypto.randomUUID();

  // AI-334: Generate per-request CSP nonce and inject into request headers
  // so Server Components can read it via headers().get("x-nonce").
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  request.headers.set("x-nonce", nonce);

  // Handle CORS preflight (OPTIONS) for API routes
  if (request.method === "OPTIONS" && pathname.startsWith("/api/")) {
    const preflightResponse = new NextResponse(null, { status: 204 });
    const hdrs = corsHeaders(origin);
    for (const [key, value] of Object.entries(hdrs)) {
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
      const hdrs = corsHeaders(origin);
      for (const [key, value] of Object.entries(hdrs)) {
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

    // AI-334: Attach nonce-based CSP to page responses (skip API routes)
    if (!pathname.startsWith("/api/")) {
      response.headers.set("Content-Security-Policy", generateCsp(nonce));
      response.headers.set("x-nonce", nonce);
    }

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
    // For non-protected routes, allow through with CSP
    const fallback = NextResponse.next({
      request: { headers: request.headers },
    });
    fallback.headers.set("X-Request-ID", requestId);
    if (!pathname.startsWith("/api/")) {
      fallback.headers.set("Content-Security-Policy", generateCsp(nonce));
      fallback.headers.set("x-nonce", nonce);
    }
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
