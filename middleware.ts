import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Routes that require Supabase authentication (checked in API routes themselves)
 */
const protectedPatterns = [
  /^\/dashboard/,
  /^\/agents/,
  /^\/documents/,
  /^\/settings/,
  /^\/profile/,
  /^\/api\/protected/,
];

/**
 * Middleware - Supabase auth is handled in API routes directly
 * This middleware just handles any global request processing
 */
export function middleware(request: NextRequest) {
  // Let all requests through - Supabase auth is handled in individual routes
  // Protected route checks are done in the API handlers via requireAuth()
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Skip Next.js internals and all static files
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
  ],
};
