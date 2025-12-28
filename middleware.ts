import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "sahara-default-secret-change-in-production"
);
const COOKIE_NAME = "sahara_auth";

/**
 * SECURITY: Middleware enforces authentication on protected routes
 *
 * Protected routes require valid JWT session cookie.
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
    const token = request.cookies.get(COOKIE_NAME)?.value;

    if (!token) {
      // Not authenticated - redirect to login
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", request.nextUrl.pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Verify JWT token
    try {
      await jwtVerify(token, JWT_SECRET);
      // Token is valid - allow request
      return NextResponse.next();
    } catch {
      // Invalid token - redirect to login
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", request.nextUrl.pathname);
      const response = NextResponse.redirect(loginUrl);
      // Clear invalid cookie
      response.cookies.delete(COOKIE_NAME);
      return response;
    }
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
