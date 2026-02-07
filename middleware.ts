import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  const { response, user } = await updateSession(request);
  const { pathname } = request.nextUrl;

  // Protected routes - redirect unauthenticated users to /login
  const isProtectedRoute =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/onboarding") ||
    pathname.startsWith("/chat") ||
    pathname.startsWith("/agents") ||
    pathname.startsWith("/documents") ||
    pathname.startsWith("/settings") ||
    pathname.startsWith("/profile");

  if (isProtectedRoute && !user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // If logged-in user visits login page, redirect to dashboard
  if (pathname === "/login" && user) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/onboarding/:path*",
    "/chat/:path*",
    "/agents/:path*",
    "/documents/:path*",
    "/settings/:path*",
    "/profile/:path*",
    "/login",
  ],
};
