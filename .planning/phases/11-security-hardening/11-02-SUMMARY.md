---
phase: 11-security-hardening
plan: 02
subsystem: next-config, security-headers
tags: [security, headers, csp, hsts, x-frame-options, permissions-policy]

# Dependency graph
requires:
  - phase: 10-production-hardening
    provides: Stable next.config.mjs with redirects and build config
provides:
  - Security headers on all responses (CSP, HSTS, X-Frame-Options, etc.)
affects:
  - All client-side code must comply with CSP directives
  - Stripe iframe loads require frame-src allowlist
  - AI provider connections require connect-src allowlist

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Security headers via Next.js async headers() config function"
    - "CSP as joined array for readability and maintainability"

key-files:
  created: []
  modified:
    - next.config.mjs

key-decisions:
  - "CSP built as array.join('; ') for readability over single-line string"
  - "Permissive CSP for MVP: unsafe-inline and unsafe-eval allowed for script-src"
  - "connect-src includes wss://*.supabase.co for Supabase realtime subscriptions"
  - "Source pattern /:path* to match all routes including root"

patterns-established:
  - "Security headers via Next.js config headers() function (not middleware)"

# Metrics
duration: 3min
completed: 2026-02-07
---

# Phase 11 Plan 02: Security Headers Summary

**7 security headers added to all responses via Next.js config headers() function: CSP, HSTS, X-Frame-Options, nosniff, Referrer-Policy, DNS-Prefetch, Permissions-Policy**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-07T05:30:00Z
- **Completed:** 2026-02-07T05:33:00Z
- **Tasks:** 2 (add headers, verify functionality)
- **Files modified:** 1

## Accomplishments

- All responses now include 7 security headers via Next.js async headers() config
- Content-Security-Policy allows Stripe (js.stripe.com, hooks.stripe.com), Supabase (*.supabase.co, wss), AI providers (Anthropic, OpenAI), and LiveKit (wss)
- CSP defined as a joined array for maintainability (not a single long string)
- HSTS enforces HTTPS for 1 year with includeSubDomains
- Permissions-Policy denies camera, microphone, and geolocation access
- Config validated via Node.js import -- all 7 headers return correctly

## Task Commits

Each task was committed atomically:

1. **Task 1: Add security headers to next.config.mjs** - `5f14959` (feat)
2. **Task 1 refinement: CSP as array, wss supabase** - `27c8227` (feat)
3. **Task 2: Verify and finalize** - `2bb8591` (fix)

## Files Created/Modified

- `next.config.mjs` - Added async headers() function with 7 security headers and ContentSecurityPolicy array constant

## Headers Implemented

| Header | Value | Protection |
|--------|-------|------------|
| X-Frame-Options | SAMEORIGIN | Clickjacking prevention |
| X-Content-Type-Options | nosniff | MIME type sniffing prevention |
| Referrer-Policy | strict-origin-when-cross-origin | Referrer leakage control |
| X-DNS-Prefetch-Control | on | DNS prefetch for performance |
| Strict-Transport-Security | max-age=31536000; includeSubDomains | Force HTTPS (1 year) |
| Permissions-Policy | camera=(), microphone=(), geolocation=() | Browser feature restriction |
| Content-Security-Policy | See CSP details below | XSS and injection prevention |

## CSP Directives

- `default-src 'self'` - Default to same-origin only
- `script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com` - Stripe JS + Next.js needs
- `style-src 'self' 'unsafe-inline'` - Inline styles for CSS-in-JS
- `img-src 'self' data: blob: https:` - Images from any HTTPS source
- `font-src 'self' data:` - Self-hosted fonts
- `connect-src 'self' https://*.supabase.co https://api.stripe.com wss://*.supabase.co wss://*.livekit.cloud https://*.anthropic.com https://*.openai.com` - API connections
- `frame-src 'self' https://js.stripe.com https://hooks.stripe.com` - Stripe iframes
- `object-src 'none'` - Block plugins
- `base-uri 'self'` - Prevent base tag hijacking
- `form-action 'self'` - Forms submit to same origin only

## Decisions Made

- Used Next.js config headers() approach (not middleware) for reliability and simplicity
- CSP built as array joined by semicolons for readability
- Permissive unsafe-inline/unsafe-eval for MVP (Next.js inline scripts need these)
- Added wss://*.supabase.co for Supabase Realtime WebSocket subscriptions

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - headers are applied automatically by Next.js to all responses.

## Next Phase Readiness

- All security headers active on every response
- CSP can be tightened in future by removing unsafe-inline/unsafe-eval and adding nonces
- Consider adding report-uri or report-to CSP directive for violation monitoring

---
*Phase: 11-security-hardening*
*Completed: 2026-02-07*
