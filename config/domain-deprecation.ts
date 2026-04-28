/**
 * Domain Deprecation Plan
 * ======================
 *
 * Old domain: you.joinsahara.com (Firebase-backed Vite funnel app)
 * New domain: www.joinsahara.com (Next.js platform)
 *
 * Status: PHASE 2 - Redirects Active
 *
 * ## Phase 1: Parallel Running (COMPLETE)
 * - Both domains serve content
 * - New platform feature-complete for all funnel paths
 * - User accounts migrated from Firebase to Supabase
 *
 * ## Phase 2: Redirect Active (CURRENT)
 * - middleware.ts 308-redirects you.joinsahara.com -> www.joinsahara.com
 * - Path remapping: /signup, / -> /get-started; /login preserved with ?migrated=1
 * - ?from=funnel-migration flag triggers welcome-back-banner.tsx (one-time display)
 * - All deep links preserved with query string forwarding
 *
 * ## Phase 3: DNS Cutover (NEXT - requires Fred approval)
 * Steps:
 * 1. Point you.joinsahara.com DNS to this Vercel project (same as www)
 * 2. Add you.joinsahara.com as a domain alias in Vercel project settings
 * 3. Verify 308 redirects work end-to-end with real traffic
 * 4. Monitor for 404s in Sentry/Vercel analytics for 2 weeks
 * 5. Update any hardcoded references in emails, SMS templates, social links
 *
 * ## Phase 4: Sunset (target: 60 days after Phase 3)
 * Steps:
 * 1. Remove you.joinsahara.com from Vercel project
 * 2. Remove DNS records for you.joinsahara.com
 * 3. Clean up middleware redirect block
 * 4. Archive old Firebase project
 * 5. Remove welcome-back-banner component
 *
 * ## Route Mapping Reference
 */

export const LEGACY_ROUTE_MAP: Record<string, string> = {
  "/": "/get-started",
  "/signup": "/get-started",
  "/login": "/login",
  "/profile": "/dashboard",
  "/dashboard": "/dashboard",
  "/chat": "/chat",
  "/settings": "/dashboard/settings",
};

/**
 * Legacy domain configuration.
 * Used by middleware.ts for redirect logic.
 */
export const LEGACY_DOMAINS = [
  "you.joinsahara.com",
] as const;

export const PRIMARY_DOMAIN = "www.joinsahara.com";

/**
 * Check if a host header matches a legacy domain.
 */
export function isLegacyDomain(host: string): boolean {
  const normalized = host.toLowerCase().split(":")[0];
  return LEGACY_DOMAINS.some((d) => normalized === d);
}

/**
 * Get the redirect URL for a legacy domain request.
 */
export function getLegacyRedirectUrl(pathname: string, searchParams: URLSearchParams): URL {
  const mappedPath = LEGACY_ROUTE_MAP[pathname] || pathname;
  const target = new URL(mappedPath, `https://${PRIMARY_DOMAIN}`);

  searchParams.forEach((v, k) => target.searchParams.set(k, v));

  if (!target.searchParams.has("from")) {
    target.searchParams.set("from", "funnel-migration");
  }

  return target;
}
