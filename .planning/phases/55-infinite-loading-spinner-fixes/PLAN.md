# Phase 55: Infinite Loading Spinner Fixes

## Goal

Fix 4 pages stuck on permanent loading spinners by ensuring API routes handle errors gracefully, pages show error/empty states instead of infinite spinners, and mock data is replaced with real API integration.

## Root Cause Analysis

| Page | Root Cause | Fix |
|------|-----------|-----|
| `/dashboard` (home) | If `supabase.auth.getUser()` or `/api/dashboard/command-center` hangs, loading skeleton shows forever. The `finally` block should fire, but network timeouts can take 30+ seconds. | Add fetch timeout (5s), show empty state on failure |
| `/dashboard/strategy` | Only checks `response.status === 403`, not 401. If auth fails, falls through to `data.success` check which sets error correctly — but no explicit 401 redirect. | Add 401 handling before 403 check |
| `/documents` | Server-side redirect to `/dashboard/strategy` — chained failure from strategy page. | Leave as-is (fixed when strategy is fixed) |
| `/check-ins` | **Uses hardcoded mock data** (dated Dec 2024). Never calls `/api/check-ins`. Page always renders but shows stale fake data. | Replace mock data with real API fetch |

## Tasks

### Task 1: Add fetch timeout to dashboard home

**File:** `app/dashboard/page.tsx` (lines 36-74)

Current code silently drops API errors — if `res.ok` is false, `data` stays null and the page shows empty state (good), but if the fetch *hangs*, loading shows forever.

Fix:
- Wrap `fetch("/api/dashboard/command-center")` in an AbortController with 8-second timeout
- On timeout or error, `setLoading(false)` fires via `finally` — page shows empty state with "Talk to FRED" CTA (already implemented at line 127-157)
- Also handle `!res.ok` explicitly with a console.warn for debugging

```typescript
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 8000);
try {
  const res = await fetch("/api/dashboard/command-center", { signal: controller.signal });
  // ...
} finally {
  clearTimeout(timeoutId);
}
```

### Task 2: Add 401 handling to strategy page

**File:** `app/dashboard/strategy/page.tsx` (lines 95-118)

Current code only checks `response.status === 403` for tier gating. If the API returns 401 (auth failure), it falls through to `data.success` check which shows a generic error.

Fix:
- Add `response.status === 401` check before the 403 check
- On 401, redirect to `/login`
- Add fetch timeout (8s) via AbortController
- The existing error state rendering (error + documents.length === 0 → error UI) is correct

```typescript
if (response.status === 401) {
  window.location.href = "/login";
  return;
}
if (response.status === 403) {
  setError("Pro tier required for Strategy Documents");
  return;
}
```

### Task 3: Replace mock data with real API fetch in check-ins page

**File:** `app/check-ins/page.tsx`

Current state: Page renders hardcoded `mockCheckIns` array (4 items dated Dec 2024). The API endpoint `/api/check-ins` exists and returns real data.

Fix:
- Add `useState` for `checkIns`, `loading`, `error`
- Add `useEffect` that fetches from `/api/check-ins`
- Handle 401 (redirect to login), errors (show empty state), and empty data (show "Start your first check-in" CTA)
- Remove `mockCheckIns` array
- Keep existing UI components (`CheckInCard`, `StreakCounter`) but wire to real data
- Add fetch timeout (8s)

Empty state should show:
- Calendar icon
- "No check-ins yet"
- "Start your weekly check-in with FRED to track momentum"
- CTA button linking to `/dashboard/chat`

### Task 4: Add error boundary for strategy page

**File:** Create `app/dashboard/strategy/error.tsx`

Ensure the strategy page has its own error boundary that shows a retry button and doesn't cascade to the dashboard-level error boundary.

## Files Changed

| File | Action |
|------|--------|
| `app/dashboard/page.tsx` | EDIT — add AbortController timeout to fetch |
| `app/dashboard/strategy/page.tsx` | EDIT — add 401 handling, add fetch timeout |
| `app/check-ins/page.tsx` | EDIT — replace mock data with real API fetch |
| `app/dashboard/strategy/error.tsx` | CREATE — per-page error boundary |

## Verification

1. `/dashboard` — renders Command Center within 8s (empty state if no data, not spinner)
2. `/dashboard/strategy` — renders Strategy page (error state if API fails, redirect on 401)
3. `/documents` — redirects to strategy (verified by strategy fix)
4. `/check-ins` — renders real check-in data from API (empty state with CTA if none)
5. No page shows infinite spinner for more than 8 seconds

## Success Criteria

- [ ] `/dashboard` renders Founder Command Center (even if empty)
- [ ] `/dashboard/strategy` renders Strategy page (empty state if no strategies)
- [ ] `/documents` renders Document list (via redirect to strategy)
- [ ] `/check-ins` renders real check-ins (empty state if no check-ins)
- [ ] No page shows an infinite spinner for longer than 8 seconds
- [ ] Each page shows a clear CTA for new users
- [ ] Mock data removed from check-ins page
