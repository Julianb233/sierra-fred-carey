# Phase 12: Data Fixes & Production Hardening - Research

**Researched:** 2026-02-07
**Domain:** Data consistency, Next.js production infrastructure, edge middleware, rate limiting
**Confidence:** HIGH

## Summary

This phase addresses two distinct problem areas: (1) inconsistent data displayed across the marketing site, AI prompts, and feature labels, and (2) missing production infrastructure for a Vercel-deployed Next.js 16 application.

The data issues are all pinpointed to specific files with specific incorrect values. The authoritative source of truth is `lib/fred-brain.ts` which defines Fred's stats. Every other location that displays these stats must match. The production infrastructure issues involve standard Next.js patterns -- edge middleware, robots.txt, sitemap generation, CORS headers, Redis-based rate limiting, and env var validation -- all well-documented with established libraries.

**Primary recommendation:** Fix data consistency first (pure find-and-replace across known files), then layer production infrastructure using standard Next.js/Vercel patterns with Upstash for rate limiting.

---

## Standard Stack

### Core (Already In Project)
| Library | Version | Purpose | Status |
|---------|---------|---------|--------|
| next | ^16.1.1 | App Router, middleware, sitemap API | Already installed |
| @supabase/ssr | ^0.8.0 | Auth session management | Already installed |
| jose | ^6.1.3 | JWT operations (edge-compatible) | Already installed |
| zod | ^4.3.6 | Env var validation | Already installed |

### New Dependencies Needed
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @upstash/ratelimit | ^2.0.8 | Serverless rate limiting | HTTP-based, edge-compatible, designed for Vercel |
| @upstash/redis | ^1.34.0 | Redis client for Upstash | Required by @upstash/ratelimit, connectionless |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @upstash/ratelimit | In-memory Map | Current approach; doesn't work across Vercel instances |
| Upstash Redis | Self-hosted Redis | Requires persistent connection, not edge-compatible |

**Installation:**
```bash
npm install @upstash/ratelimit @upstash/redis
```

**New env vars needed:**
```
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

---

## Architecture Patterns

### Pattern 1: Root Middleware for Auth Protection
**What:** Single `middleware.ts` at project root using Supabase session refresh + route protection
**When to use:** All routes needing edge-level auth

The project already has `lib/supabase/middleware.ts` with `updateSession()` which creates a Supabase client and calls `getUser()`. There is also `lib/auth/middleware-utils.ts` with route matching utilities. However, there is **no root `middleware.ts`** file to wire these together.

**Key finding:** The middleware-utils already define the protected routes:
```typescript
// lib/auth/middleware-utils.ts line 33-36
export const DEFAULT_PROTECTED_ROUTES: ProtectedRouteConfig = {
  paths: ['/dashboard', '/agents', '/documents', '/settings', '/profile'],
  patterns: [/^\/api\/protected\//],
};
```

But this needs to be extended to also include `/chat` as specified in the requirements.

**Root middleware.ts pattern:**
```typescript
// middleware.ts (project root)
import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const PROTECTED_PREFIXES = ['/dashboard', '/settings', '/agents', '/chat'];

export async function middleware(request: NextRequest) {
  const { response, user } = await updateSession(request);
  const { pathname } = request.nextUrl;

  // Check if route is protected
  const isProtected = PROTECTED_PREFIXES.some(
    prefix => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  if (isProtected && !user) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
```

### Pattern 2: Next.js App Router Sitemap
**What:** Dynamic sitemap via `app/sitemap.ts` using the MetadataRoute API
**When to use:** Standard for all production Next.js apps

```typescript
// app/sitemap.ts
import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://joinsahara.com';
  return [
    { url: baseUrl, lastModified: new Date(), changeFrequency: 'weekly', priority: 1 },
    { url: `${baseUrl}/about`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
    // ... all public routes
  ];
}
```

### Pattern 3: Centralized Data Constants
**What:** All Fred Cary stats imported from `lib/fred-brain.ts` -- no hardcoded values in components
**When to use:** Every component that displays Fred's stats

### Anti-Patterns to Avoid
- **Hardcoded stats in components:** Every "$50M+" or "30+" scattered across components is a data inconsistency waiting to happen. Import from fred-brain.ts.
- **In-memory rate limiting on Vercel:** The `Map`-based rate limiter resets with each cold start and doesn't share state across instances.
- **robots.txt in /public/ as static file:** This works but `app/robots.ts` is preferred in App Router for dynamic generation.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Rate limiting | In-memory sliding window (current) | @upstash/ratelimit | Serverless-compatible, edge-ready, multi-instance |
| Sitemap generation | Manual XML file | app/sitemap.ts (Next.js built-in) | Type-safe, auto-served, framework-native |
| robots.txt | Static file in /public/ | app/robots.ts (Next.js built-in) | Programmatic, type-safe, framework-native |
| CORS handling | Per-route OPTIONS handler (current) | Centralized CORS utility | DRY, consistent across all API routes |
| Env validation | Manual checks | Zod schema (already exists in lib/env.ts) | Type-safe, fail-fast |

---

## Data Inconsistency Inventory

### DATA-01: Capital Raised -- "$50M" vs "$100M+"

**Authoritative value (fred-brain.ts):** Not explicitly stated as a single "capital raised" number. The `summaryStats` object has `ideaprosRevenue: "$30M+"`. However, `about/page.tsx` shows `$100M+` as "Capital Raised."

**Current inconsistencies found:**

| File | Line | Current Value | Notes |
|------|------|---------------|-------|
| `components/hero.tsx` | 177 | "$50M+ Raised" | Trust indicator |
| `components/footer.tsx` | 58 | "$50M+ raised" | Footer tagline |
| `components/testimonials.tsx` | 256 | "$50M+ raised by users" | Social proof stat |
| `app/about/page.tsx` | 20 | "$100M+" Capital Raised | About page stat |
| `README.md` | 11 | "$50M+ raised" | README badge |

**Decision needed:** The about page says "$100M+" while hero/footer/testimonials say "$50M+". fred-brain.ts does not have a single "capital raised" constant. A new constant should be added to fred-brain.ts and all locations should import it.

**Confidence:** HIGH -- all instances found via grep.

### DATA-02: Years of Experience -- "30+" vs "40+" vs "50+"

**Authoritative value (fred-brain.ts):** `yearsExperience: 50` and `"50+"` in summaryStats.

**Current inconsistencies found:**

| File | Line | Current Value | Correct Value |
|------|------|---------------|---------------|
| `lib/fred/pitch/analyzers/index.ts` | 129 | "30+ years of experience" | "50+ years of experience" |
| `lib/fred/strategy/generator.ts` | 150 | "40+ years of experience" | "50+ years of experience" |
| `app/about/page.tsx` | 19 | "20+" Years Experience (stats array) | "50+" |
| `app/about/page.tsx` | 70 | "20+ years of founder patterns" (values section) | "50+ years" |
| `app/about/page.tsx` | 119 | "over two decades" (hero text) | Correct could be "over five decades" |
| `lib/ai/prompts.ts` | 18 | "50 years" | Correct |
| `components/onboarding/welcome-step.tsx` | 70 | "50 years" | Correct |

**Confidence:** HIGH -- all instances found via grep. The about page is the worst offender with "20+" which is deeply wrong.

### DATA-03: SMS Check-Ins Tier Placement

**Current inconsistencies found:**

| File | Line | Tier Shown | Notes |
|------|------|------------|-------|
| `lib/constants.ts` | 82 | **PRO** (UserTier.PRO features) | "Automated Weekly SMS Check-Ins" |
| `lib/constants.ts` | 90 | **STUDIO** (UserTier.STUDIO features) | "Weekly SMS Accountability Check-ins" |
| `lib/constants.ts` | 148 | **STUDIO** (nav item) | `tier: UserTier.STUDIO` |
| `lib/stripe/config.ts` | 36 | **STUDIO** (VENTURE_STUDIO plan) | "Weekly SMS Accountability Check-ins" |
| `components/pricing.tsx` | 66 | **PRO** (Fundraising plan features) | "Automated Weekly SMS Check-Ins" |
| `app/pricing/page.tsx` | 55 | **PRO** (Fundraising plan) | "Weekly SMS Check-Ins" included: true |
| `app/pricing/page.tsx` | 99 | **PRO** (comparison: fundraising: true) | SMS Check-ins in fundraising column |
| `app/features/page.tsx` | 69 | **PRO** ($99/month section) | "Weekly SMS Check-Ins" |
| `app/product/page.tsx` | 452 | Neutral (no tier shown) | Just describes the feature |
| `lib/sms/scheduler.ts` | 5 | **STUDIO** | "Studio users" in comment |

**Analysis:** SMS Check-Ins appears in BOTH Pro and Studio tier feature lists. The navigation (`DASHBOARD_NAV`) restricts it to Studio tier. The SMS scheduler comments say "Studio users". The Stripe config puts it under VENTURE_STUDIO. But multiple pricing pages list it under the $99 Pro/Fundraising tier.

**Decision needed:** Settle on ONE tier. If it's Pro ($99), remove from Studio feature list and update nav. If it's Studio ($249), remove from Pro feature list and pricing pages. Based on the code in `lib/constants.ts` line 148 (`tier: UserTier.STUDIO`) and `lib/sms/scheduler.ts`, the backend treats it as STUDIO. The marketing pages incorrectly show it as Pro.

**Confidence:** HIGH -- comprehensive search across all files.

### DATA-04: Studio Features "Coming Soon" Labels

**Current state in `app/features/page.tsx`:**
| Feature | comingSoon? | Notes |
|---------|-------------|-------|
| Boardy Integration | NOT marked | Listed as available |
| Investor Targeting Guidance | `comingSoon: true` | |
| Outreach Sequencing | `comingSoon: true` | |
| Founder Ops Agent | NOT marked | Listed as available |
| Fundraise Ops Agent | NOT marked | Listed as available |
| Growth Ops Agent | NOT marked | Listed as available |
| Inbox Ops Agent | `comingSoon: true` | |

**Current state in `app/pricing/page.tsx`:**
| Feature | comingSoon? |
|---------|-------------|
| Boardy Integration | `comingSoon: true` |
| Investor Matching & Warm Intros | `comingSoon: true` |
| Investor Targeting Guidance | `comingSoon: true` |
| Outreach Sequencing | `comingSoon: true` |
| Founder Ops Agent | `comingSoon: true` |
| Fundraise Ops Agent | `comingSoon: true` |
| Growth Ops Agent | `comingSoon: true` |
| Inbox Ops Agent | `comingSoon: true` |

**Inconsistency:** Features page shows Boardy and 3 agents as available (no comingSoon), while pricing page marks ALL studio features as comingSoon. The pricing page is likely correct since these are v2.0 features.

**Confidence:** HIGH -- direct file comparison.

### DATA-05: Interactive Page Stats vs Homepage Stats

**Homepage (`components/hero.tsx`):**
- 10,000+ Founders Coached
- $50M+ Raised
- By Fred Cary

**About page (`app/about/page.tsx`):**
- 10,000+ Founders Coached
- 20+ Years Experience (WRONG - should be 50+)
- $100M+ Capital Raised
- 500+ Startups Launched

**Interactive page (`app/interactive/page.tsx`):**
- 2400+ Startups Analyzed
- 32h Saved Per Week
- 87% Close Rate
- 3.2x Faster Fundraising

**Analysis:** The interactive page stats are product metrics (platform usage stats), not Fred's personal stats. These are inherently different from homepage/about stats. The question is whether they should be clearly differentiated or reconciled. They appear to be aspirational product metrics rather than real data.

**Confidence:** HIGH -- all values verified.

### DATA-06: About Page Timeline vs fred-brain.ts

**fred-brain.ts says:**
- Started at age 17 (musician, then taco restaurant at 22)
- JD from Thomas Jefferson School of Law (1984)
- Bar admission 1988
- Founded 40+ companies
- IdeaPros has launched 300+ companies

**About page timeline says:**
- 2004: "Started coaching founders after selling first startup" -- Not in fred-brain.ts
- 2010: "Developed systematic approach after 1,000+ founders" -- Not in fred-brain.ts
- 2018: "Began researching AI" -- Not in fred-brain.ts
- 2024: "Decision OS Launch" -- Plausible

**About page story section says:**
- "Started first company in 1999, fresh out of college" -- WRONG. Fred started at 17 and got his JD in 1984. He was not "fresh out of college" in 1999.

**The about page is written for a generic founder persona, not Fred Cary specifically.** The story mentions "20 years of coaching" which doesn't match Fred's 50+ years. The timeline, story, and values sections need to be rewritten to match fred-brain.ts.

**Confidence:** HIGH -- direct comparison between files.

---

## Production Infrastructure Inventory

### PROD-01: Root middleware.ts

**Current state:** NO root middleware.ts exists. Only `lib/supabase/middleware.ts` (helper) and `lib/auth/middleware-utils.ts` (route matching utilities).

**What exists:**
- `lib/supabase/middleware.ts`: `updateSession()` function that creates Supabase client, refreshes auth tokens, returns `{ response, user }`
- `lib/auth/middleware-utils.ts`: Route matching with `isProtectedRoute()`, `isPublicRoute()`, `requiresAuthentication()` -- supports exact paths and regex patterns
- Protected routes already defined: `/dashboard`, `/agents`, `/documents`, `/settings`, `/profile`
- Missing from protected routes: `/chat` (requirement says it should be protected)

**Implementation approach:**
1. Create root `middleware.ts` that calls `updateSession()` from `lib/supabase/middleware.ts`
2. Check if the route is protected using the existing middleware-utils
3. Redirect unauthenticated users to `/login?redirect=<path>`
4. Use Next.js matcher config to exclude static assets

**Confidence:** HIGH -- existing utilities verified, just need the root file.

### PROD-02: robots.txt

**Current state:** No robots.txt in `/public/`. There is one in `fred-cary-db/website/public/robots.txt` but that's a different project.

**Implementation:** Use `app/robots.ts` (Next.js App Router convention) for type-safe, programmatic generation:
```typescript
import type { MetadataRoute } from 'next';
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/dashboard/', '/api/', '/admin/', '/settings/'] },
    sitemap: 'https://joinsahara.com/sitemap.xml',
  };
}
```

**Confidence:** HIGH -- standard Next.js pattern.

### PROD-03: Dynamic Sitemap

**Current state:** No `app/sitemap.ts`. There is a `fred-cary-db/website/public/sitemap.xml` but that's a different project.

**Public routes to include:**
- `/` (homepage)
- `/about`
- `/pricing`
- `/features`
- `/product`
- `/interactive`
- `/blog`
- `/contact`
- `/support`
- `/waitlist`
- `/links`
- `/login`
- `/signup`
- `/get-started`
- `/privacy`
- `/terms`
- `/demo/reality-lens`
- `/demo/investor-lens`
- `/demo/virtual-team`
- `/demo/pitch-deck`
- `/demo/boardy`
- `/tools/investor-readiness`
- `/video`

**Routes to EXCLUDE:** `/dashboard/*`, `/settings/*`, `/agents/*`, `/chat/*`, `/admin/*`, `/onboarding/*`, `/check-ins/*`, `/documents/*`

**Confidence:** HIGH -- full route inventory from `find` command.

### PROD-04: Image Optimization

**Current state:** grep for `<img` tags returned NO matches in source files (*.ts, *.tsx). The project appears to already use `next/image` consistently. The footer already imports `Image from "next/image"`.

**Finding:** This requirement may already be satisfied. No `<img>` tags were found in any TypeScript/React source files.

**Confidence:** HIGH -- comprehensive grep search with no matches.

### PROD-05: Redis/Upstash Rate Limiting

**Current state:** Two in-memory rate limiting implementations exist:
1. `lib/rate-limit.ts` -- Simple `RateLimiter` class with `Map` store
2. `lib/api/rate-limit.ts` -- More sophisticated with `checkRateLimit()`, tier-based configs, middleware factory

Both use `new Map<string, ...>()` as the store, which:
- Resets on every cold start
- Is not shared across Vercel function instances
- Works fine for dev but NOT for production

**Files that import rate limiting:**
- 25 files reference rate limiting across the codebase
- Primary consumers: API routes in `app/api/fred/*`, `app/api/onboard/*`, `app/api/diagnostic/*`

**Implementation approach:**
1. Install `@upstash/ratelimit` and `@upstash/redis`
2. Create new `lib/rate-limit-redis.ts` that wraps `@upstash/ratelimit`
3. Keep the same `RateLimitConfig` and `RATE_LIMIT_TIERS` interface from `lib/api/rate-limit.ts`
4. Update imports in all API routes
5. Add `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` to env validation

**Key code pattern:**
```typescript
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Reuse existing tier config structure
const rateLimiters = {
  free: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(20, "60 s") }),
  pro: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(100, "60 s") }),
  studio: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(500, "60 s") }),
};
```

**Confidence:** HIGH -- @upstash/ratelimit is the standard for Vercel deployments.

### PROD-06: CORS Configuration

**Current state:** Only 2 files have CORS headers:
- `app/api/pitch-deck/upload/route.ts` (line 117-127) -- OPTIONS handler with Access-Control headers
- `app/api/pitch-deck/parse/route.ts` (line 214) -- Similar OPTIONS handler

All other API routes have NO CORS configuration.

**Implementation approach:**
1. Create centralized `lib/api/cors.ts` utility
2. Apply CORS headers via the root middleware OR via a shared utility called in each API route
3. For Next.js with same-origin frontend, CORS is only needed for external API consumers

**Note:** Since this is a Next.js app where the frontend and API are on the same domain, CORS is primarily needed for:
- Webhook endpoints (Stripe, Twilio, Boardy)
- Any publicly-consumable API endpoints
- Development (localhost with different ports)

**Recommended pattern:**
```typescript
// lib/api/cors.ts
export function corsHeaders(origin?: string): HeadersInit {
  const allowedOrigin = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  return {
    'Access-Control-Allow-Origin': origin === allowedOrigin ? origin : allowedOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  };
}
```

**Confidence:** HIGH.

### PROD-07: Startup Env Var Validation

**Current state:** Partial validation exists:
- `lib/env.ts` validates 4 required vars via Zod: `SUPABASE_SERVICE_ROLE_KEY`, `JWT_SECRET`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `lib/env.ts` `validateEnv()` warns about 12 optional vars but does NOT fail
- `instrumentation.ts` calls `validateEnv()` on startup
- `.env.example` documents all vars with [REQUIRED] / [OPTIONAL] labels

**Complete env var inventory (from codebase grep):**

**Required (app will break without):**
| Var | Used In | Current Validation |
|-----|---------|-------------------|
| `NEXT_PUBLIC_SUPABASE_URL` | lib/env.ts, lib/supabase/* | Zod validated |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | lib/env.ts, lib/supabase/* | Zod validated |
| `SUPABASE_SERVICE_ROLE_KEY` | lib/env.ts, lib/db/* | Zod validated |
| `JWT_SECRET` | lib/env.ts, lib/auth/token.ts | Zod validated |

**Required for features (should hard-fail if feature enabled):**
| Var | Used In | Current Validation |
|-----|---------|-------------------|
| `STRIPE_SECRET_KEY` | lib/stripe/server.ts | Runtime check only |
| `STRIPE_WEBHOOK_SECRET` | lib/stripe/server.ts | Runtime check only |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | lib/stripe/client.ts | Runtime check only |
| `NEXT_PUBLIC_STRIPE_FUNDRAISING_PRICE_ID` | lib/stripe/config.ts | None |
| `NEXT_PUBLIC_STRIPE_VENTURE_STUDIO_PRICE_ID` | lib/stripe/config.ts | None |
| `OPENAI_API_KEY` or `ANTHROPIC_API_KEY` or `GOOGLE_API_KEY` | lib/env.ts, lib/documents/* | Warning only |

**Required for production (new for this phase):**
| Var | Used In | Current Validation |
|-----|---------|-------------------|
| `UPSTASH_REDIS_REST_URL` | NEW: rate limiting | None (new) |
| `UPSTASH_REDIS_REST_TOKEN` | NEW: rate limiting | None (new) |
| `NEXT_PUBLIC_APP_URL` | CORS, webhooks, emails | Default fallback only |

**Optional:**
| Var | Feature |
|-----|---------|
| `ADMIN_SECRET_KEY` | Admin panel auth |
| `CRON_SECRET` | Cron job auth |
| `TWILIO_ACCOUNT_SID` | SMS |
| `TWILIO_AUTH_TOKEN` | SMS |
| `TWILIO_MESSAGING_SERVICE_SID` | SMS |
| `LIVEKIT_API_KEY` | Voice/Video |
| `LIVEKIT_API_SECRET` | Voice/Video |
| `LIVEKIT_URL` | Voice/Video |
| `NEXT_PUBLIC_LIVEKIT_URL` | Voice/Video |
| `RESEND_API_KEY` | Email |
| `SLACK_WEBHOOK_URL` | Alerts |

**Implementation:** Expand `lib/env.ts` serverEnvSchema to include Stripe and Upstash vars as required. Create a standalone `scripts/validate-env.ts` that can be run before deploy.

**Confidence:** HIGH -- comprehensive grep analysis of all process.env references.

---

## Common Pitfalls

### Pitfall 1: Inconsistent Data Whack-a-Mole
**What goes wrong:** Fixing data in one file but missing other instances
**Why it happens:** Stats are hardcoded in multiple places instead of imported from a central source
**How to avoid:** After fixing, create importable constants in fred-brain.ts and grep to verify zero remaining hardcoded instances
**Warning signs:** Any `"$50M"`, `"30+"`, `"40+"`, `"20+"` string literals in component files

### Pitfall 2: Middleware Matcher Too Broad
**What goes wrong:** Middleware runs on static assets, causing performance issues or auth redirects on images/CSS
**Why it happens:** Default matcher matches everything
**How to avoid:** Use the standard Next.js exclusion pattern: `'/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'`
**Warning signs:** Page load slowness, static asset 302 redirects

### Pitfall 3: Upstash Redis Cold Start
**What goes wrong:** Rate limiter creates new Redis connections on every request
**Why it happens:** Instantiating inside the handler instead of at module level
**How to avoid:** Declare `Ratelimit` instance at module scope so it persists across warm invocations
**Warning signs:** High Redis connection count, slow API response times

### Pitfall 4: CORS Blocking Webhooks
**What goes wrong:** Stripe/Twilio webhooks fail because CORS rejects their origin
**Why it happens:** CORS middleware applied to webhook endpoints
**How to avoid:** Exclude webhook routes from CORS checks, or use permissive CORS for known webhook paths
**Warning signs:** Stripe webhook failures in dashboard

### Pitfall 5: About Page Complete Rewrite Required
**What goes wrong:** Attempting to patch individual values on the about page when the entire narrative is wrong
**Why it happens:** The about page was written for a generic persona, not Fred Cary specifically
**How to avoid:** Plan a full rewrite of the about page story/timeline/values sections to match fred-brain.ts
**Warning signs:** Timeline mentions "1999" first company, "two decades" of coaching

---

## Code Examples

### Centralized Marketing Stats (fred-brain.ts addition)
```typescript
// Add to lib/fred-brain.ts
export const MARKETING_STATS = {
  capitalRaised: "$100M+",  // Or "$50M+" -- needs decision
  foundersCoached: "10,000+",
  yearsExperience: "50+",
  companiesFounded: "40+",
  startupsLaunched: "300+",  // via IdeaPros
  ipos: "3",
  acquisitions: "2",
} as const;
```

### Root Middleware (middleware.ts)
```typescript
import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const PROTECTED_PREFIXES = ['/dashboard', '/settings', '/agents', '/chat'];

export async function middleware(request: NextRequest) {
  const { response, user } = await updateSession(request);
  const { pathname } = request.nextUrl;

  const isProtected = PROTECTED_PREFIXES.some(
    prefix => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  if (isProtected && !user) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
```

### Upstash Rate Limiter
```typescript
// lib/rate-limit-redis.ts
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { NextRequest, NextResponse } from "next/server";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export const rateLimiters = {
  free: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(20, "60 s"), prefix: "rl:free" }),
  pro: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(100, "60 s"), prefix: "rl:pro" }),
  studio: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(500, "60 s"), prefix: "rl:studio" }),
};

export async function checkRateLimit(
  identifier: string,
  tier: keyof typeof rateLimiters = "free"
) {
  const limiter = rateLimiters[tier];
  const { success, limit, remaining, reset } = await limiter.limit(identifier);
  return { success, limit, remaining, reset: Math.ceil((reset - Date.now()) / 1000) };
}
```

### robots.ts
```typescript
// app/robots.ts
import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://joinsahara.com';
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/dashboard/', '/api/', '/admin/', '/settings/', '/agents/', '/chat/', '/onboarding/', '/check-ins/', '/documents/'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
```

### CORS Utility
```typescript
// lib/api/cors.ts
import { NextResponse } from "next/server";

const ALLOWED_ORIGINS = [
  process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
];

export function withCorsHeaders(response: NextResponse, origin?: string | null): NextResponse {
  const allowedOrigin = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  response.headers.set("Access-Control-Allow-Origin", allowedOrigin);
  response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  response.headers.set("Access-Control-Max-Age", "86400");
  return response;
}

export function handleCorsOptions(origin?: string | null): NextResponse {
  const response = new NextResponse(null, { status: 204 });
  return withCorsHeaders(response, origin);
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Static robots.txt in /public/ | app/robots.ts (MetadataRoute API) | Next.js 14+ | Programmatic, type-safe |
| Static sitemap.xml | app/sitemap.ts (MetadataRoute API) | Next.js 14+ | Dynamic, type-safe |
| @supabase/auth-helpers | @supabase/ssr | 2024 | Already using correct package |
| In-memory rate limiting | @upstash/ratelimit | Standard for Vercel | Multi-instance, persistent |

---

## Open Questions

1. **Capital Raised Number**
   - What we know: About page says "$100M+", hero/footer/testimonials say "$50M+"
   - What's unclear: Which is the correct number? fred-brain.ts doesn't have a single "capital raised" constant
   - Recommendation: Default to "$100M+" (higher and from the About page which is more detailed) unless user specifies otherwise. Add to fred-brain.ts as canonical value.

2. **SMS Check-Ins Tier**
   - What we know: Backend code (nav, scheduler) treats it as Studio. Marketing pages (pricing, features) show it as Pro.
   - What's unclear: Which tier should it actually be in?
   - Recommendation: Match the backend -- Studio ($249). Remove from Pro tier feature lists.

3. **Interactive Page Stats**
   - What we know: These are product metrics (2400+ startups analyzed, 32h saved) vs biographical stats (50+ years, 40+ companies)
   - What's unclear: Are these real metrics or aspirational?
   - Recommendation: These are product stats and should be clearly differentiated from Fred's personal stats. May need a disclaimer or different framing.

4. **About Page Rewrite Scope**
   - What we know: Timeline, story, and values sections are for a generic founder persona, not Fred Cary
   - What's unclear: How much rewriting is acceptable in this phase?
   - Recommendation: Rewrite stats, timeline years, and key story facts to match fred-brain.ts. The general structure can stay.

---

## Sources

### Primary (HIGH confidence)
- `lib/fred-brain.ts` -- Authoritative data source, verified directly
- `lib/constants.ts` -- Tier definitions and feature lists, verified directly
- `lib/stripe/config.ts` -- Stripe plan definitions, verified directly
- `lib/env.ts` -- Current env validation, verified directly
- `lib/supabase/middleware.ts` -- Existing auth helper, verified directly
- `lib/auth/middleware-utils.ts` -- Route protection utilities, verified directly
- `lib/rate-limit.ts` and `lib/api/rate-limit.ts` -- Current in-memory rate limiters, verified directly
- `.env.example` -- Full env var documentation, verified directly
- Full codebase grep for all data inconsistencies

### Secondary (MEDIUM confidence)
- [@upstash/ratelimit documentation](https://upstash.com/docs/redis/sdks/ratelimit-ts/overview) -- via WebSearch
- [Supabase Next.js auth middleware](https://supabase.com/docs/guides/auth/server-side/nextjs) -- via WebSearch
- [Next.js MetadataRoute API](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/robots) -- from training data

### Tertiary (LOW confidence)
- None -- all findings directly verified from codebase

---

## Metadata

**Confidence breakdown:**
- Data inconsistencies: HIGH -- all values found via comprehensive grep, files read and verified
- Production infrastructure: HIGH -- current state verified, standard patterns documented
- Standard stack: HIGH -- @upstash/ratelimit is the established choice for Vercel
- Architecture patterns: HIGH -- using existing project patterns (Supabase SSR, middleware-utils)
- Pitfalls: HIGH -- based on verified current state

**Research date:** 2026-02-07
**Valid until:** 2026-03-07 (stable domain, unlikely to change)
