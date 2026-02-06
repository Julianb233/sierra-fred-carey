# Dependency & Configuration Audit Results

**Date:** 2026-02-06
**Project:** sierra-fred-carey (Sahara - AI-Powered Founder Operating System)
**Next.js Version:** 16.1.1 | **React:** 19.1.1 | **Node Types:** 24.5.0

---

## 1. npm audit -- Known Vulnerabilities

**4 vulnerabilities found (2 moderate, 2 high)**

| Package | Severity | Issue | Fix Available |
|---------|----------|-------|---------------|
| `next` 15.6.0-canary.0 - 16.1.4 | HIGH | DoS via Image Optimizer remotePatterns (GHSA-9g9p-9gw9-jx7f) | Yes |
| `next` 15.6.0-canary.0 - 16.1.4 | HIGH | HTTP request deserialization DoS via insecure RSC (GHSA-h25m-26qc-wcjf) | Yes |
| `next` 15.6.0-canary.0 - 16.1.4 | HIGH | Unbounded memory via PPR Resume Endpoint (GHSA-5f7q-jpqc-wp7h) | Yes |
| `@isaacs/brace-expansion` 5.0.0 | HIGH | Uncontrolled Resource Consumption (GHSA-7h2j-956f-4vf2) | Yes |
| `undici` < 6.23.0 | MODERATE | Unbounded decompression chain DoS (GHSA-g9mf-h72j-4rw9) | Yes |
| `@vercel/blob` 0.0.3 - 2.0.0 | MODERATE | Depends on vulnerable undici | Yes |

**Status: FIXED** -- Ran `npm audit fix`. All vulnerabilities resolved. Now shows 0 vulnerabilities.

---

## 2. package.json -- Dependency Issues

### CRITICAL: eslint-config-next version mismatch
- `next`: ^16.1.1 (installed 16.1.1)
- `eslint-config-next`: 15.5.3 (pinned to Next.js 15)

**Status: FIXED** -- Updated eslint-config-next to ^16.1.1 to match Next.js 16.

### Unused Dependencies (not imported in any source file)
| Package | Evidence |
|---------|----------|
| `@browserbasehq/stagehand` ^3.0.8 | Zero imports in any .ts/.tsx file. Only in package.json. |
| `@paper-design/shaders-react` ^0.0.68 | Zero imports in any .ts/.tsx file. |
| `@react-email/components` ^1.0.2 | Zero imports (only `@react-email/render` might be used via `react-email`). |
| `@react-email/render` ^2.0.0 | Zero imports in any .ts/.tsx file. |

**Action:** Remove unused dependencies to reduce bundle size and attack surface.

### Potentially Redundant Dependencies
| Package | Reason |
|---------|--------|
| `@google/generative-ai` ^0.24.1 | Only used in `lib/ai/client.ts`. Consider using `@ai-sdk/google` exclusively since Vercel AI SDK already wraps Google. |
| `@anthropic-ai/sdk` ^0.71.2 | Same consideration -- `@ai-sdk/anthropic` already included. Check if raw SDK is needed. |
| `pg` ^8.18.0 (devDep) | Project uses `postgres` (postgres.js) for SQL. `pg` may be leftover from migration. |

### Dependency with `--legacy-peer-deps`
The `vercel.json` specifies `"installCommand": "npm install --legacy-peer-deps"`, which suppresses peer dependency conflicts. This masks real issues and should be investigated. Current `npm ls --depth=0` shows no errors, so this flag may be removable.

---

## 3. Duplicate / Version Conflict Analysis

No duplicate top-level dependencies or version conflicts detected in `npm ls --depth=0`. The `--legacy-peer-deps` flag in vercel.json may be masking peer dependency issues that need monitoring when upgrading packages.

---

## 4. vercel.json -- Configuration Audit

### Cron Jobs
- **`/api/cron/weekly-checkin`** at `0 14 * * 1` (Monday 2pm UTC) -- **VALID**
  - Route exists at `app/api/cron/weekly-checkin/route.ts`
  - Has proper `CRON_SECRET` authorization check
  - Has graceful error handling for missing Twilio credentials

### Security Headers -- GOOD
All standard security headers are present:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`

### Content-Security-Policy -- ISSUES FOUND

**ISSUE 1 (HIGH): Permissions-Policy blocks microphone but LiveKit needs it**
```
Permissions-Policy: camera=(), microphone=(), geolocation=()
```
The app has LiveKit voice agent integration (`@livekit/components-react`, voice agent admin pages). Blocking `microphone=()` entirely will prevent voice calls. Should be:
```
camera=(), microphone=(self), geolocation=()
```

**ISSUE 2 (MEDIUM): CSP missing LiveKit WebSocket connections**
The `connect-src 'self' https:` allows all HTTPS connections but LiveKit uses `wss://` protocol. Current CSP allows `https:` wildcard which implicitly covers `wss:` in most browsers, but explicit `wss:` is safer:
```
connect-src 'self' https: wss:;
```

**ISSUE 3 (LOW): `unsafe-eval` in script-src**
`script-src` includes `'unsafe-eval'` which weakens CSP significantly. Review if this is truly needed (sometimes required by certain libraries).

---

## 5. next.config.mjs -- CRITICAL ISSUES

### BUILD FAILURE: Turbopack + proxy.ts conflict
**Status: BUILDS FAIL on both Turbopack and Webpack**

With Turbopack (default in Next.js 16):
```
Error: ENOENT: no such file or directory, open '.../.next/static/.../_buildManifest.js.tmp...'
```

With Webpack (`--webpack` flag):
```
Error: Both middleware file "./middleware.ts" and proxy file "./proxy.ts" are detected.
Please use "./proxy.ts" only.
```

**Root Cause:** Next.js 16 introduced `proxy.ts` as the replacement for `middleware.ts`. The project has `proxy.ts` at root. The Turbopack build fails with a manifest file I/O error, and the webpack build detects a conflict (possibly from a stale `.next` cache that generated `middleware.js`).

**The config itself is minimal:**
```js
const nextConfig = {
  turbopack: { root: __dirname },
};
```

**Action Items:**
1. Delete `.next` completely before each build attempt
2. The Turbopack `_buildManifest.js.tmp` ENOENT error may be a Next.js 16.1.1 bug -- check for patches
3. `proxy.ts` exists and properly handles route protection (auth redirects for /dashboard, /onboarding, etc.)

### Missing Configuration
The `next.config.mjs` is extremely minimal. Consider adding:
- `images.remotePatterns` (if using external images)
- `serverExternalPackages` for `pdf-parse` (Node.js native module)

---

## 6. Environment Variables -- Missing Variables

### Variables referenced in code but MISSING from all .env files

| Variable | Used In | Risk |
|----------|---------|------|
| `ADMIN_SECRET_KEY` | 16 admin route files + admin layout | **CRITICAL** -- Admin panel non-functional without it |
| `CRON_SECRET` | `app/api/cron/weekly-checkin/route.ts`, `app/api/monitoring/alerts/check/route.ts` | HIGH -- Cron endpoints unprotected |
| `JWT_SECRET` | `lib/auth/token.ts` (all JWT ops) | **CRITICAL** -- Auth completely broken in production |
| `TWILIO_ACCOUNT_SID` | `lib/sms/client.ts`, cron weekly-checkin | HIGH -- SMS features fail |
| `TWILIO_AUTH_TOKEN` | `lib/sms/client.ts`, SMS webhook | HIGH -- SMS features fail |
| `TWILIO_MESSAGING_SERVICE_SID` | `lib/sms/client.ts` | HIGH -- SMS sending fails |
| `LIVEKIT_HOST` | `lib/voice-agent.ts` | MEDIUM -- Voice agent fails |
| `AUTO_PROMOTION_CRON_SECRET` | `app/api/monitoring/auto-promotion/check/route.ts` | MEDIUM -- Auto-promotion unprotected |

### Variables in .env.example but NOT in .env.local (deployment env)
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_STRIPE_FUNDRAISING_PRICE_ID`
- `NEXT_PUBLIC_STRIPE_VENTURE_STUDIO_PRICE_ID`
- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`
- `GOOGLE_API_KEY`
- `SLACK_WEBHOOK_URL`
- `RESEND_API_KEY`
- `PAGERDUTY_ROUTING_KEY`

Note: Some of these may be set in Vercel dashboard environment variables. But `JWT_SECRET` and `ADMIN_SECRET_KEY` being absent from ALL local env files is critical.

### SECURITY: Credentials committed to .env files
The `.env`, `.env.local`, and `.env.production` files contain **real credentials** (Supabase keys, Neon DB passwords, LiveKit secrets, Stack Auth keys). These files should NOT be committed to git. Verify `.gitignore` includes them.

---

## 7. proxy.ts (Route Protection Middleware)

**File:** `/opt/agency-workspace/sierra-fred-carey/proxy.ts`

**Protected Routes:**
- `/dashboard/*`
- `/onboarding/*`
- `/chat/*`
- `/agents/*`
- `/documents/*`
- `/settings/*`
- `/profile/*`
- `/api/protected/*`

**Route Matcher (excludes):**
- `_next/static`, `_next/image`, `favicon.ico`, `sitemap.xml`, `robots.txt`
- Static assets (svg, png, jpg, etc.)
- `/api/*` routes (handle their own auth)

**Issues Found:**

1. **MEDIUM: Admin routes not in proxy protection** -- `/admin/*` is NOT in the protected routes list. Admin protection relies solely on cookie-based checks in each route/layout. This is defense-in-depth concern -- the admin layout does check cookies, but a proxy-level check would be stronger.

2. **GOOD: API routes excluded from proxy** -- API routes handle their own auth, which is correct for this architecture (mix of cookie auth for admin, Supabase session for users, header-based for admin API).

---

## 8. manifest.ts -- PWA Configuration

**File:** `/opt/agency-workspace/sierra-fred-carey/app/manifest.ts`

**Status: MOSTLY GOOD with one issue**

| Field | Value | Status |
|-------|-------|--------|
| name | "Sahara -- AI-Powered Founder Operating System" | OK |
| short_name | "Sahara" | OK |
| start_url | "/dashboard" | OK (protected route, will redirect to login) |
| display | "standalone" | OK |
| theme_color | "#FF5625" | OK |
| orientation | "portrait-primary" | OK |
| categories | ["business", "productivity"] | OK |

**Icon Files:**

| Referenced Icon | File Exists |
|-----------------|-------------|
| `/icon.svg` | **MISSING** |
| `/icon-192.png` | Yes |
| `/icon-512.png` | Yes |
| `/icon-maskable-512.png` | Yes |

**Status: FIXED** -- Created `/public/icon.svg` with Sahara branding (chat bubble icon on #FF5625 background).

---

## 9. Circular Dependencies

No circular dependency issues detected through static analysis. The codebase uses a clean layered architecture:
- `lib/` modules import from each other in a DAG (no cycles observed)
- `app/api/` routes import from `lib/` (one direction)
- `components/` import from `lib/` (one direction)

---

## 10. lib/parsers/pdf-parser.ts -- Analysis

**File:** `/opt/agency-workspace/sierra-fred-carey/lib/parsers/pdf-parser.ts`

**Issues Found:**

The file has been updated to use the pdf-parse v2 class-based API (`new PDFParse()`). Current implementation is clean:

1. **GOOD: Single parse with per-page text** -- Uses `parser.getText()` which returns per-page text directly. No double-parsing.
2. **GOOD: Proper resource cleanup** -- Uses `finally` block to call `parser.destroy()`.
3. **GOOD: Error handling** -- Proper error wrapping with `PDFParseError`, handles password-protected PDFs, invalid files, timeouts for URL fetching, and buffer validation.
4. **GOOD: Security** -- `parsePDFFromUrl` validates URL protocol, checks content type, validates PDF header bytes, and has a 30-second timeout.
5. **GOOD: getPDFInfo** -- Lightweight info-only function that also properly cleans up parser.

**Status: No issues found. The v2 migration is correctly implemented.**

---

## Summary of Critical Issues

### FIXED in this audit

| # | Issue | Severity | Fix Applied |
|---|-------|----------|-------------|
| 1 | **npm audit: 4 vulnerabilities** (2 high, 2 moderate) | HIGH | Ran `npm audit fix` -- 0 vulnerabilities now |
| 2 | **eslint-config-next@15** vs next@16 mismatch | HIGH | Updated to eslint-config-next@^16.1.1 |
| 3 | **Permissions-Policy blocks microphone** for LiveKit | HIGH | Changed to `microphone=(self)` in vercel.json |
| 4 | **CSP missing wss: for LiveKit** | LOW | Added `wss:` to connect-src in vercel.json |
| 5 | **Missing icon.svg** referenced in PWA manifest | MEDIUM | Created `/public/icon.svg` |
| 6 | **Missing env vars in .env.example** | MEDIUM | Added ADMIN_SECRET_KEY, CRON_SECRET, TWILIO_* to .env.example |

### Remaining Issues (require project owner action)

| # | Issue | Severity | Location |
|---|-------|----------|----------|
| 1 | **Build fails** -- Turbopack _buildManifest.js.tmp ENOENT | CRITICAL | next.config.mjs / Next.js 16.1.1 bug |
| 2 | **Missing ADMIN_SECRET_KEY** in .env.local (must be set per-environment) | CRITICAL | .env.local / Vercel Dashboard |
| 3 | **Missing JWT_SECRET** in .env.local (must be set per-environment) | CRITICAL | .env.local / Vercel Dashboard |
| 4 | **Real credentials committed** in .env, .env.local, .env.production | HIGH | Must rotate after adding to .gitignore |
| 5 | **Unused deps** bloating bundle (@browserbasehq/stagehand, @paper-design/shaders-react, @react-email/components, @react-email/render) | MEDIUM | package.json |
| 6 | **sql.unsafe** usage in notification PATCH routes | MEDIUM | app/api/notifications/config, settings |
| 7 | **6 TypeScript type errors** in admin dashboard route | LOW | app/api/admin/dashboard/route.ts |

### Tests Status
- **All 445 tests pass** (23 test files) -- verified before and after fixes
- **TypeScript check:** 6 type errors in `app/api/admin/dashboard/route.ts` (sql result typing)

---

## Recommended Next Steps (for project owner)

1. **Set ADMIN_SECRET_KEY and JWT_SECRET** in .env.local and Vercel Dashboard (use `openssl rand -base64 32`)
2. **Rotate all credentials** in .env, .env.local, .env.production since they are committed to git
3. **Add .env, .env.local, .env.production to .gitignore** (keep only .env.example)
4. **Investigate Turbopack build failure** -- may require Next.js 16.1.2+ patch or removing turbopack config
5. **Remove unused dependencies**: `npm uninstall @browserbasehq/stagehand @paper-design/shaders-react @react-email/components @react-email/render`
6. **Fix TypeScript errors** in `app/api/admin/dashboard/route.ts` (add proper types for sql results)
7. **Set Twilio credentials** in Vercel Dashboard for SMS features
8. **Review sql.unsafe usage** in notification routes -- consider COALESCE pattern instead
