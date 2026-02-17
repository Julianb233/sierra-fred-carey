# Launch Audit: Code Quality & Build Health

**Auditor**: code-auditor
**Date**: 2026-02-13
**Codebase**: sierra-fred-carey (Sahara v4.0)
**Branch**: main (commit 6035973)

---

## Executive Summary

| Severity | Count |
|----------|-------|
| BLOCKER  | 3     |
| HIGH     | 6     |
| MEDIUM   | 8     |
| LOW      | 5     |
| **Total**| **22**|

**Build**: Next.js production build passes clean.
**TypeScript**: 8 errors, all in `workers/voice-agent/agent.ts` (known, pre-existing).
**Tests**: 2 test files failing (11 tests), 790 passing.
**ESLint**: 406 errors, 341 warnings (config works but many violations).

---

## BLOCKERS (must fix before launch)

### B1. Shared Page URL — Operator Precedence Bug
- **File**: `app/shared/[token]/page.tsx:55-59`
- **Description**: The ternary/OR expression has a JavaScript operator precedence bug. Because `||` binds tighter than `?:`, the expression `NEXT_PUBLIC_APP_URL || VERCEL_URL ? https://${VERCEL_URL} : localhost` evaluates as `(NEXT_PUBLIC_APP_URL || VERCEL_URL) ? https://${VERCEL_URL} : localhost`. When `NEXT_PUBLIC_APP_URL` is set (the normal production case), it still uses `VERCEL_URL` in the URL template — producing the wrong base URL. **Shared links will break in production.**
- **Suggested Fix**:
  ```ts
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
  ```

### B2. Documents Page Crash — `documents` is undefined
- **File**: `app/dashboard/documents/page.tsx:152`
- **Description**: `documents.filter(...)` throws `TypeError: Cannot read properties of undefined (reading 'filter')` when `documents` state is `undefined` (before the API response arrives). This crashes the entire page and causes 11 test failures.
- **Suggested Fix**: Default `documents` state to `[]` or add a guard: `(documents ?? []).filter(...)`.

### B3. Test File Uses Jest Instead of Vitest
- **File**: `tests/auth/profile-creation.test.ts:1`
- **Description**: Imports from `@jest/globals` which does not exist in this Vitest project. The file fails to even parse, meaning the auth profile-creation tests never run.
- **Suggested Fix**: Change `import { describe, it, expect, afterAll } from "@jest/globals"` to use Vitest imports, or remove `@jest/globals` import entirely (Vitest provides globals).

---

## HIGH (should fix before launch)

### H1. Admin Analytics Uses Placeholder Data
- **File**: `app/admin/analytics/page.tsx:80-100`
- **Description**: The Events tab in admin analytics uses hardcoded `placeholderEvents()` with fake user IDs like `demo-user-1`. The UI even tells users "(placeholder data -- connect PostHog for live events)" but this should not ship as the default admin experience.
- **Suggested Fix**: Hide the events tab entirely when `NEXT_PUBLIC_POSTHOG_KEY` is not set, or show a clear "Connect PostHog" CTA instead of fake data.

### H2. Dashboard Layout — Components Created During Render
- **File**: `app/dashboard/layout.tsx:287,293`
- **Description**: ESLint reports `Error: Cannot create components during render`. The `SidebarContent` component is likely defined inside the render body rather than outside. This causes re-mounting on every render, losing state and hurting performance.
- **Suggested Fix**: Move `SidebarContent` definition outside the parent component or memoize it.

### H3. FRED Chat — Hardcoded `false` for Deck Detection (x2)
- **Files**: `app/api/fred/chat/route.ts:370`, `app/api/fred/chat/route.ts:439`
- **Description**: `const hasUploadedDeck = false; // TODO: detect from attachments` appears twice. This means FRED will never detect when a user has uploaded a pitch deck, breaking the deck review flow.
- **Suggested Fix**: Wire this to actual attachment detection or at minimum check `modeContext.formalAssessments` for deck uploads.

### H4. Boardy Uses Mock Client in Production
- **File**: `lib/boardy/client.ts:59-66`
- **Description**: `getBoardyClient()` always returns `MockBoardyClient` (AI-generated fake matches) since there is no `BOARDY_API_KEY` check implemented. The mock generates fictional investor/advisor names which could mislead founders.
- **Suggested Fix**: If Boardy API is not available for launch, add a clear "AI-Generated Suggestions" badge in the UI, or gate the feature behind a flag.

### H5. Investor Matching — Location Scoring Uses `null`
- **File**: `lib/investors/matching.ts:386`
- **Description**: `scoreLocation(null, inv.location)` always passes `null` for founder location. The TODO says "add founder location to profile". This means location-based investor matching is non-functional.
- **Suggested Fix**: Pass founder profile location if available, or remove the location bonus from scoring until it works.

### H6. Multiple React Hooks Violations (setState in useEffect)
- **Files**: 12 components including:
  - `app/install/page.tsx:44`
  - `components/chat/chat-input.tsx:33`
  - `components/chat/tts-button.tsx:25`
  - `components/settings/voice-settings.tsx:60,91`
  - `components/dashboard/document-view-dialog.tsx:35`
  - `components/pwa/useInstallPrompt.ts:21`
  - `components/tools/RadarChart.tsx:35`
  - `lib/hooks/use-voice-input.ts:23`
- **Description**: Calling `setState` synchronously within `useEffect` causes cascading renders. While not a crash risk, it can cause visible flickering and performance issues in production.
- **Suggested Fix**: Batch state updates or use `useLayoutEffect` where appropriate.

---

## MEDIUM (fix soon after launch)

### M1. `mockDocuments` Exported but Never Used
- **File**: `lib/document-types.ts:242`
- **Description**: `mockDocuments` array with fake documents is exported but never imported anywhere. It previously powered the documents page before the API was wired. Dead code that adds bundle size.
- **Suggested Fix**: Remove the `mockDocuments` export.

### M2. `middleware-example.ts` — Example File with Mock Auth
- **File**: `lib/auth/middleware-example.ts`
- **Description**: Contains `exampleLoginHandler` with `// Mock user for this example` and hardcoded user data. This file is a reference example, not used in production, but ships in the bundle and could confuse developers.
- **Suggested Fix**: Move to a `/docs` or `/examples` folder outside the build path.

### M3. Command Center — Hardcoded `highStressDetected = false`
- **File**: `lib/dashboard/command-center.ts:346`
- **Description**: `const highStressDetected = false; // placeholder -- requires Phase 36 diagnostic tag extraction`. The wellbeing feature will never trigger high-stress alerts.
- **Suggested Fix**: Implement diagnostic tag extraction or remove the stress detection display until ready.

### M4. Observability `emitMetric` is a No-Op
- **File**: `lib/fred/observability.ts:187-199`
- **Description**: The `emitMetric` method constructs a metric object but does nothing with it. Comment says "In production, this would send to DataDog, CloudWatch, etc." No metrics are being collected for FRED interactions.
- **Suggested Fix**: Wire to a real metrics service or at minimum log structured metrics.

### M5. ESLint: 66 `react/no-unescaped-entities` Errors
- **Files**: 9 files across `app/` and `components/`
- **Description**: Unescaped apostrophes in JSX text across onboarding, check-ins, history, and diagnostic pages. These cause ESLint errors and could theoretically cause rendering issues.
- **Suggested Fix**: Replace `'` with `&apos;` in JSX text content.

### M6. ESLint: ~22 `require()` Style Imports
- **Files**: Multiple files in `scripts/`, `lib/`, workers
- **Description**: CJS `require()` calls flagged as `@typescript-eslint/no-require-imports`. These work but are inconsistent with the ESM codebase style.
- **Suggested Fix**: Convert to ESM `import` statements where possible.

### M7. ESLint: ~40+ Unused Variables/Imports in Production Code
- **Files**: Spread across `app/api/`, `lib/`, `components/`
- **Description**: Many unused imports and variables in production code (not just tests). Examples: `requireAuth`, `MEMORY_CONFIG`, `applyRateLimitHeaders`, `VALID_STATUSES`, etc.
- **Suggested Fix**: Clean up with `eslint --fix` or targeted removal.

### M8. ESLint: 5 "Cannot call impure function during render" Errors
- **Files**: `components/agents/AgentCard.tsx:188`, `components/check-ins/StreakCounter.tsx:112-113`, `app/install/page.tsx:333-343`
- **Description**: Calling impure functions (likely `Math.random()` or `Date.now()`) during component render. This can cause hydration mismatches in SSR.
- **Suggested Fix**: Move impure calls to `useEffect` or `useMemo` with deps.

---

## LOW (nice to have)

### L1. `ab-testing/example-usage.ts` Ships in Bundle
- **File**: `lib/ab-testing/example-usage.ts`
- **Description**: A 400+ line example/demo file that logs to console. Not referenced in production code but included in the build.
- **Suggested Fix**: Move to `/examples` or delete.

### L2. CORS Allows localhost in Production
- **File**: `lib/api/cors.ts:4-6`
- **Description**: `allowedOrigins` includes `http://localhost:3000` and `http://localhost:3001` alongside the production URL. This is fine for development but overly permissive for production.
- **Suggested Fix**: Gate localhost origins behind `NODE_ENV !== 'production'`.

### L3. Email/Notification URLs Fall Back to localhost
- **Files**: `lib/notifications/email.ts:101,612`, `lib/notifications/slack.ts:34`, `lib/email/invite.ts:41`
- **Description**: All use `process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"`. If the env var is missing, notification emails will contain localhost links.
- **Suggested Fix**: Throw an error or use a sensible default domain instead of localhost.

### L4. TypeScript Errors in Voice Agent Worker (8 errors, known)
- **File**: `workers/voice-agent/agent.ts:77-103`
- **Description**: 8 TS errors due to mismatched `AgentSessionCallbacks` types. Known and pre-existing; the worker compiles separately.
- **Suggested Fix**: Update types to match the latest `agents-js` API.

### L5. ESLint: `no-explicit-any` in Test Infra
- **Files**: `vitest.setup.ts`, various `__tests__/` files
- **Description**: ~30+ uses of `any` in test mocking code. Low risk since these are test-only files.
- **Suggested Fix**: Add proper types to mock factories over time.

---

## Summary of Test Health

| Metric | Value |
|--------|-------|
| Test Files | 47 total (45 pass, 2 fail) |
| Tests | 801 total (790 pass, 11 fail) |
| Pass Rate | 98.6% |

**Failing test files**:
1. `tests/pages/documents.test.tsx` — 11 tests fail due to B2 (documents undefined crash)
2. `tests/auth/profile-creation.test.ts` — Fails to parse due to B3 (uses `@jest/globals`)

---

## Build Status

| Check | Status |
|-------|--------|
| `npm run build` | PASS (clean) |
| `npx tsc --noEmit` | 8 errors (all in `workers/voice-agent/agent.ts`, known) |
| `npm run lint` | 406 errors, 341 warnings |
| `npm test` | 790 pass / 11 fail |
| Hardcoded secrets | None found |
| Hardcoded API keys | None found |
