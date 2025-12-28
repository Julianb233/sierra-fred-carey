import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * SECURITY: Middleware enforces authentication on protected routes
 *
 * Protected routes require valid Supabase session.
 * Unauthenticated requests are redirected to /login.
 */
export async function middleware(request: NextRequest) {
  const protectedPaths = ["/dashboard", "/agents", "/documents"];
  const isProtected = protectedPaths.some((path) =>
    request.nextUrl.pathname.startsWith(path)
  );

  // Allow public routes
  if (!isProtected) {
    return NextResponse.next();
  }

  // Check authentication for protected routes
  try {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      // Not authenticated - redirect to login
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", request.nextUrl.pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Authenticated - allow request
    return NextResponse.next();
  } catch (error) {
    console.error("[middleware] Auth check failed:", error);
    // On error, redirect to login for security
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/agents/:path*",
    "/documents/:path*",
  ],
};
