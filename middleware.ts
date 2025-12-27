import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/pricing",
  "/about",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/stripe/webhook",
]);

// Make middleware conditional based on Clerk configuration
const hasClerkKey = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

// Fallback middleware when Clerk is not configured
function noAuthMiddleware(request: NextRequest) {
  return NextResponse.next();
}

export default hasClerkKey
  ? clerkMiddleware(async (auth, request) => {
      if (!isPublicRoute(request)) {
        await auth.protect();
      }
    })
  : noAuthMiddleware;

export const config = {
  matcher: [
    // Skip Next.js internals and all static files
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
