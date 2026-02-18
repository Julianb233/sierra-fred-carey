# Phase 54: Dashboard Routing Fix

## Goal

Fix 3 dashboard sub-routes (`/dashboard/communities`, `/dashboard/documents`, `/dashboard/coaching`) that render the Settings page instead of their intended content.

## Investigation Summary

Code-level investigation found:
- All 3 page files exist and export correctly
- No catch-all routes, no redirects to Settings in layout or config
- `data-testid` attributes added in commit `3420e11`
- Dashboard layout renders `{children}` without fallback logic
- No middleware rewrites affecting these routes

**Root cause hypothesis:** The issue is likely a **client-side rendering failure** where:
1. The page JS chunk fails to load (network/build issue), leaving the layout shell visible
2. The layout sidebar highlights Settings as the default, giving the appearance the page "renders Settings"
3. OR: the `useUserTier()` hook in coaching/documents pages throws, and without per-page error boundaries, the dashboard-level `error.tsx` fires — but this shows "Dashboard Error", not Settings

Since this was observed in production QA (Stagehand on joinsahara.com), the fix must be verified on the deployed site.

## Tasks

### Task 1: Add per-page error boundaries

**Files:** Create `app/dashboard/communities/error.tsx`, `app/dashboard/documents/error.tsx`, `app/dashboard/coaching/error.tsx`

Each error boundary should:
- Show the page name and a retry button
- NOT fall back to Settings or redirect
- Include `data-testid` for Stagehand verification

Pattern:
```tsx
"use client";
export default function CommunitiesError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div data-testid="communities-error" className="p-8 text-center">
      <h2>Communities Error</h2>
      <p>{error.message}</p>
      <button onClick={reset}>Retry</button>
    </div>
  );
}
```

### Task 2: Add timeout protection to tier-dependent pages

**Files:** `app/dashboard/documents/page.tsx`, `app/dashboard/coaching/page.tsx`

Both pages call `useUserTier()` which fetches `/api/user/subscription`. If this hangs:
- Documents page stays in loading state forever
- Coaching page shows `LoadingFallback` forever

Fix: Add a 5-second timeout that defaults to Free tier if `useUserTier()` doesn't resolve, so the page renders (with FeatureLock showing upgrade prompt if needed).

### Task 3: Add loading timeout to communities page

**File:** `app/dashboard/communities/page.tsx`

The communities page fetches from `/api/communities`. Add:
- Error state UI (already has `error` state, verify it renders properly)
- Loading timeout (5s → show empty state with CTA)

### Task 4: Verify build includes all routes

Run `next build --webpack` and verify the build output includes:
- `app/dashboard/communities/page`
- `app/dashboard/documents/page`
- `app/dashboard/coaching/page`

If any route is missing from the build manifest, investigate why.

## Verification

After deployment:
1. Navigate to `/dashboard/communities` — should show Communities list (or empty state)
2. Navigate to `/dashboard/documents` — should show Document Repository (or FeatureLock)
3. Navigate to `/dashboard/coaching` — should show Coaching Sessions (or FeatureLock)
4. None should show Settings content
5. Check `data-testid` attributes: `communities-page`, `documents-page`, `coaching-page`

## Files Changed

| File | Action |
|------|--------|
| `app/dashboard/communities/error.tsx` | CREATE — error boundary |
| `app/dashboard/documents/error.tsx` | CREATE — error boundary |
| `app/dashboard/coaching/error.tsx` | CREATE — error boundary |
| `app/dashboard/documents/page.tsx` | EDIT — add tier loading timeout |
| `app/dashboard/coaching/page.tsx` | EDIT — add tier loading timeout |
| `app/dashboard/communities/page.tsx` | EDIT — add loading timeout |

## Success Criteria

- [ ] `/dashboard/communities` renders Communities page (not Settings)
- [ ] `/dashboard/documents` renders Document Repository (not Settings)
- [ ] `/dashboard/coaching` renders Coaching Sessions (not Settings)
- [ ] Each page has its own error boundary
- [ ] No page shows infinite loading — 5s timeout shows fallback
- [ ] Build includes all 3 routes
