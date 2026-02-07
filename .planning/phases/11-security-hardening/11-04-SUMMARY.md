# Phase 11 Plan 04: Remove Logout GET Handler & Sanitization Fix Summary

**One-liner:** Removed CSRF-vulnerable GET logout handler, hardened admin logout with session revocation, upgraded sanitizeInput with sequential entity encoding and whitespace-aware URI/handler stripping

---

## Completed Tasks

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Remove Logout GET Handler | fef204c (+ 56968c1) | app/api/auth/logout/route.ts |
| 1b | Harden Admin Logout Session Revocation | 259b908 | app/api/admin/logout/route.ts |
| 2 | Strengthen Input Sanitization | fef204c, 317bd92 | lib/auth/middleware-utils.ts |

---

## What Was Done

### Task 1: Remove Logout GET Handler

Removed the `GET` export from `app/api/auth/logout/route.ts`. The GET handler allowed logout via simple link navigation or prefetch, which meant an attacker could embed `<img src="/api/auth/logout">` to silently log users out. Only the `POST` handler remains.

Also verified:
- No `<a href="...logout">` or `window.location = "...logout"` patterns exist in the codebase
- Admin logout button (`app/admin/components/LogoutButton.tsx`) correctly uses `fetch(..., { method: "POST" })`

### Task 1b: Harden Admin Logout Session Revocation

[Rule 2 - Missing Critical] The admin logout route (`app/api/admin/logout/route.ts`) was only deleting the cookie but not revoking the session token server-side, allowing tokens to remain valid in the in-memory session store. Upgraded to:
- Import `revokeSession` from `@/lib/auth/admin-sessions`
- Read the `admin_session` cookie token before deleting
- Call `revokeSession(token)` to invalidate the token in the server-side session store
- Switch cookie name from legacy `adminKey` to `admin_session` to match the session token system from 11-02

### Task 2: Strengthen Input Sanitization

Replaced the basic `sanitizeInput` function in `lib/auth/middleware-utils.ts` that only stripped `<>` characters with a comprehensive version that:

1. **Sequential HTML entity encoding** (`&` first to avoid double-encoding): `&` -> `&amp;`, `<` -> `&lt;`, `>` -> `&gt;`, `"` -> `&quot;`, `'` -> `&#x27;`
2. **Strips `javascript:` protocol** (case-insensitive, with `\s*` to catch whitespace evasion like `javascript  :`)
3. **Strips `data:` protocol** (case-insensitive, with `\s*` whitespace evasion protection)
4. **Strips inline event handlers** matching `\bon\w+\s*=` pattern with word boundary to avoid false positives (e.g., catches `onerror=` but not `donation=`)
5. **Trims whitespace** and **limits to 1000 characters**

Verified no callers of `sanitizeInput` exist in the codebase beyond its definition, so the encoding behavior change is safe.

This is defense-in-depth since React's JSX already escapes output, but sanitizing at input boundaries is best practice.

---

## Verification Results

- [x] `/api/auth/logout` has no GET export (only POST)
- [x] POST logout handler works correctly with error handling
- [x] No UI elements use GET for logout (searched for href/window.location patterns)
- [x] Admin logout POST-only with proper session revocation (verified)
- [x] `sanitizeInput` encodes `<script>`, `javascript:`, `onerror=`, quotes, and ampersands
- [x] `sanitizeInput` has no existing callers (safe to change output format)
- [x] `npx tsc --noEmit` passes (pre-existing errors in investor-readiness/strategy are unrelated)

---

## Deviations from Plan

### Auto-added Issues

**1. [Rule 2 - Missing Critical] Admin logout session revocation**
- **Found during:** Task 1 (checking admin logout route)
- **Issue:** Admin logout only deleted the cookie but did not revoke the session token server-side
- **Fix:** Added `revokeSession()` call before cookie deletion, switched to `admin_session` cookie name
- **Files modified:** `app/api/admin/logout/route.ts`
- **Commit:** 259b908

**2. [Rule 1 - Bug] Improved entity encoding beyond plan specification**
- **Found during:** Task 2 (reviewing committed callback-based version)
- **Issue:** Callback-based `[<>'"&]` regex lacked whitespace-aware URI patterns and word-boundary event handler detection
- **Fix:** Sequential individual replaces (& first), `\s*` in URI patterns, `\b` on event handler pattern
- **Files modified:** `lib/auth/middleware-utils.ts`
- **Commit:** 317bd92

---

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| HTML entity encoding over character stripping | Encoding preserves semantic meaning while neutralizing XSS; stripping can break legitimate input |
| Process `&` first in encoding chain | Prevents double-encoding of already-encoded entities |
| Case-insensitive protocol stripping | Attackers use `jAvAsCrIpT:` to bypass case-sensitive filters |
| Whitespace-aware protocol regex (`\s*`) | Attackers insert spaces like `javascript :` to bypass exact-match filters |
| Word boundary on event handler regex (`\b`) | Prevents false positives where `on` appears mid-word (e.g., `donation=`) |
| Revoke admin session token on logout | Cookie deletion alone leaves token valid server-side; must invalidate in session store |

---

## Files Modified

| File | Change |
|------|--------|
| `app/api/auth/logout/route.ts` | Removed GET export, kept POST only |
| `app/api/admin/logout/route.ts` | Added session revocation, switched to admin_session cookie |
| `lib/auth/middleware-utils.ts` | Upgraded sanitizeInput with sequential entity encoding, whitespace-aware URI stripping, word-boundary event handlers |

---

*Summary created: 2026-02-07*
