import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { isProtectedRoute } from "@/lib/auth/middleware-utils";
import { corsHeaders, isWebhookPath } from "@/lib/api/cors";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const origin = request.headers.get("origin");

  // Handle CORS preflight (OPTIONS) for API routes
  if (request.method === "OPTIONS" && pathname.startsWith("/api/")) {
    const preflightResponse = new NextResponse(null, { status: 204 });
    const headers = corsHeaders(origin);
    for (const [key, value] of Object.entries(headers)) {
      preflightResponse.headers.set(key, value);
    }
    return preflightResponse;
  }

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
    return NextResponse.redirect(loginUrl);
  }

  return response;
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
