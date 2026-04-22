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
    "connect-src 'self' https://*.supabase.co https://api.stripe.com wss://*.supabase.co https://*.livekit.cloud wss://*.livekit.cloud https://*.anthropic.com https://*.openai.com https://*.ingest.sentry.io https://*.ingest.us.sentry.io https://*.msgsndr.com https://*.posthog.com",
    "worker-src 'self'",
    "media-src 'self' blob:",
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

  // ---------------------------------------------------------------------
  // you.joinsahara.com deprecation (2026-04-22). The legacy Firebase-backed
  // funnel subdomain (hosted on a separate Vercel project serving the
  // Vite funnel app) is consolidated onto the permanent platform. Any
  // request arriving with the legacy host header is 308-redirected to the
  // equivalent path on www.joinsahara.com, with a ?from=funnel-migration
  // flag so the landing page can show a one-time "welcome back" banner
  // (see components/welcome-back-banner.tsx).
  //
  // NOTE: this middleware only fires once you.joinsahara.com is pointed at
  // THIS Vercel project. Until the domain is moved (or DNS is flipped)
  // this block is defensive / a no-op.
  // ---------------------------------------------------------------------
  const host = (request.headers.get("host") || "").toLowerCase();
  if (
    host === "you.joinsahara.com" ||
    host.startsWith("you.joinsahara.com:") ||
    // keep the old (unused) subdomain supported too in case it ever gets
    // DNS; costs nothing and covers both references in the old changelog.
    host === "u.joinsahara.com" ||
    host.startsWith("u.joinsahara.com:")
  ) {
    const target = new URL(pathname, "https://www.joinsahara.com");
    // Preserve the original query string.
    request.nextUrl.searchParams.forEach((v, k) => target.searchParams.set(k, v));

    // Path-level remapping for routes that changed names on the new app.
    if (pathname === "/signup" || pathname === "/") {
      target.pathname = "/get-started";
    } else if (pathname === "/login") {
      target.searchParams.set("migrated", "1");
    }

    // Always stamp the migration flag so the banner renders once.
    if (!target.searchParams.has("from")) {
      target.searchParams.set("from", "funnel-migration");
    }

    return NextResponse.redirect(target, 308);
  }

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

    // Phase 77-02: Welcome flow enforcement
    // Redirect authenticated users who haven't completed intake to /welcome
    const welcomeExemptPaths = ['/welcome', '/api/', '/login', '/signup', '/get-started', '/onboarding', '/_next/', '/favicon']
    const needsWelcomeCheck = user && !welcomeExemptPaths.some(p => pathname.startsWith(p)) && isProtectedRoute(pathname)

    if (needsWelcomeCheck) {
      // Use Edge-compatible Supabase client (avoid importing server-only createClient)
      const { createServerClient: createEdgeClient } = await import("@supabase/ssr")
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      if (supabaseUrl && supabaseAnonKey) {
        const supabase = createEdgeClient(supabaseUrl, supabaseAnonKey, {
          cookies: {
            getAll() { return request.cookies.getAll() },
            setAll() { /* read-only check, no need to set cookies */ },
          },
        })
        const { data: profile } = await supabase
          .from("profiles")
          .select("journey_welcomed, reality_lens_complete")
          .eq("id", user.id)
          .single()

        if (profile && profile.journey_welcomed === false) {
          const welcomeUrl = new URL("/welcome", request.url)
          const redirectResponse = NextResponse.redirect(welcomeUrl)
          redirectResponse.headers.set("X-Request-ID", requestId)
          return redirectResponse
        }

        // Phase 81: Reality Lens enforcement
        // Users who completed onboarding but not the reality check get redirected
        // Exempt /dashboard/reality-lens routes to avoid infinite loops
        if (
          profile &&
          profile.journey_welcomed === true &&
          profile.reality_lens_complete === false &&
          pathname.startsWith("/dashboard") &&
          !pathname.startsWith("/dashboard/reality-lens")
        ) {
          const realityLensUrl = new URL("/dashboard/reality-lens/quick?first=true", request.url)
          const redirectResponse = NextResponse.redirect(realityLensUrl)
          redirectResponse.headers.set("X-Request-ID", requestId)
          return redirectResponse
        }
      }
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
