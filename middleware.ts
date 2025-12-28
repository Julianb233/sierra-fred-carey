import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  // Protected routes - will integrate with auth provider later
  const protectedPaths = ["/dashboard", "/agents", "/documents"];
  const isProtected = protectedPaths.some((path) =>
    request.nextUrl.pathname.startsWith(path)
  );

  // For now, allow all - auth integration pending
  // When auth is added, check session here and redirect to /login if not authenticated
  if (isProtected) {
    // Future: Check for valid session/token
    // const session = await getSession(request);
    // if (!session) {
    //   return NextResponse.redirect(new URL("/login", request.url));
    // }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/agents/:path*",
    "/documents/:path*",
  ],
};
