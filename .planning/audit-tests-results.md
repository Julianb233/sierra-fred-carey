# Test Suite Audit Results

**Date:** 2026-02-06
**Runner:** `npx vitest run`
**Result:** 445/445 tests passing across 23 test files (after 1 fix)

---

## Summary

| Metric | Value |
|--------|-------|
| Test Files | 23 |
| Total Tests | 445 |
| Passed | 445 |
| Failed | 0 |
| Duration | ~13s |

---

## Test Files Audited

### 1. `app/api/pitch-deck/upload/__tests__/route.test.ts` -- PASSED (all tests)
- **Tests:** 11 (file validation, user ID handling, response format)
- **Status:** All passing. Tests are lightweight unit tests that validate file types, sizes, and response shapes without hitting the actual route handler.
- **Note:** These are value-assertion tests (no actual route invocation). Adequate for basic contract validation but could be extended with actual route handler calls.

### 2. `app/api/__tests__/auth-integration.test.ts` -- PASSED (22 tests)
- **Tests:** 22 (auth enforcement on journey, subscription, pitch-deck, reality-lens, stripe routes; input validation; spoofing prevention)
- **Status:** All passing. Comprehensive auth integration tests verifying 401 responses for unauthenticated requests across all protected API routes.
- **Coverage:** Journey stats/timeline/references, user subscription, pitch-deck upload/parse, reality lens, stripe checkout/portal, input validation, user ID spoofing prevention.

### 3. `app/api/fred/__tests__/fred-api.test.ts` -- PASSED (21 tests)
- **Tests:** 21 (analyze, decide, memory CRUD, chat endpoints)
- **Status:** All passing. Tests cover FRED's core API endpoints: analyze, decide, memory GET/POST/DELETE, and chat (both streaming and non-streaming).
- **Coverage:** Input validation (missing message/decision), auth enforcement, successful responses, session ID handling, calibration tracking, fact/episode storage, search with embeddings.

### 4. `app/api/documents/__tests__/route.test.ts` -- PASSED (all tests)
- **Tests:** 12 (GET/PATCH/DELETE on documents/[id], security query isolation)
- **Status:** All passing. Tests verify CRUD operations, auth enforcement, 404 handling, input validation, and SQL query isolation by user_id.
- **Coverage:** Unauthenticated access blocked, document retrieval, update with no fields rejected, non-existent document handling, cross-user deletion prevention, user_id in all SQL queries.

### 5. `tests/pages/get-started.test.tsx` -- PASSED (13 tests)
- **Tests:** 13 (onboarding flow multi-step navigation, validation, loading states)
- **Status:** All passing. Tests cover the 3-step onboarding flow: stage selection, challenge selection, and email/password submission.
- **Coverage:** Initial render, stage options display, step navigation forward/backward, challenge options, email validation (empty and invalid format), loading state, progress dots, selected state display.

### 6. `tests/pages/pricing.test.tsx` -- PASSED (19 tests)
- **Tests:** 19 (tier display, prices, features, comparison table, layout)
- **Status:** All passing. Comprehensive UI tests for the pricing page.
- **Coverage:** All 3 tiers rendered, correct prices ($0/$99/$249), "Most Popular" badge, CTA buttons, feature comparison table, guiding principles, tier descriptions, target audiences, monthly billing, animated backgrounds, tier icons.

### 7. `tests/pages/waitlist.test.tsx` -- 1 FAILURE FIXED (15 tests)
- **Tests:** 15 (form rendering, validation, submission, success state, navigation)
- **Failure:** `should have "Back to Home" link in header`
- **Root Cause:** The test expected a "Back to Home" link to be visible in the initial page state (before form submission). However, the waitlist page (`app/waitlist/page.tsx`) was redesigned -- the "Back to Home" button now only appears in the post-submission success state (line 550-554 in the source), not as a header link on initial render.
- **Fix Applied:** Updated the test to submit the form first, then check for the "Back to Home" link in the success state. This matches the actual page behavior. The test description was also updated from "in header" to "after successful submission".
- **Verification:** Test now passes. All 15 waitlist tests green.

### 8. `tests/pages/home.test.tsx` -- PASSED (4 tests)
- **Tests:** 4 (render, Hero component, main sections, ScrollProgress)
- **Status:** All passing. Basic smoke tests for the homepage.

### 9. `tests/dashboard-integration.test.ts` -- PASSED (all tests)
- **Tests:** 8 (dashboard API response parsing, alerts API, type transformations, metrics calculation, chart data generation, real-time polling)
- **Status:** All passing. Integration tests for the monitoring dashboard.
- **Coverage:** Successful response parsing, error handling (API errors and network errors), alert filtering, experiment/alert data transformation for UI, aggregate metrics calculation, chart data structure, 30-second polling interval.

---

## Additional Test Files (not in audit list but ran and passed)

| File | Tests | Status |
|------|-------|--------|
| `lib/auth/__tests__/token.test.ts` | Multiple | PASSED |
| `lib/fred/__tests__/fred-machine.test.ts` | 16 | PASSED |
| `lib/fred/__tests__/reality-lens.test.ts` | 38 | PASSED |
| `lib/ai/__tests__/reliability.test.ts` | 36 | PASSED |
| `lib/monitoring/__tests__/auto-promotion.test.ts` | 7 | PASSED |
| Other test files | Various | PASSED |

---

## Fix Applied

### `tests/pages/waitlist.test.tsx` -- Line 280

**Before (failing):**
```typescript
it('should have "Back to Home" link in header', async () => {
  await act(async () => {
    render(<WaitlistPage />);
  });
  const backLinks = screen.getAllByText('Back to Home');
  expect(backLinks.length).toBeGreaterThan(0);
  expect(backLinks[0].closest('a') || backLinks[0].closest('button')).toBeInTheDocument();
});
```

**After (passing):**
```typescript
it('should have "Back to Home" link after successful submission', async () => {
  global.fetch = vi.fn(() =>
    Promise.resolve({
      ok: true,
      json: async () => ({ success: true }),
    })
  ) as any;

  await act(async () => {
    render(<WaitlistPage />);
  });

  const nameInput = screen.getByPlaceholderText('Your name');
  const emailInput = screen.getByPlaceholderText('Your email');
  const submitButton = screen.getByRole('button', { name: /join the waitlist/i });

  await act(async () => {
    fireEvent.change(nameInput, { target: { value: 'Test User' } });
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.click(submitButton);
  });

  await waitFor(() => {
    const backLinks = screen.getAllByText('Back to Home');
    expect(backLinks.length).toBeGreaterThan(0);
    expect(backLinks[0].closest('a')).toHaveAttribute('href', '/');
  }, { timeout: 2000 });
});
```

**Rationale:** The source code (`app/waitlist/page.tsx`) was updated to remove the header "Back to Home" link. The "Back to Home" button now only renders in the success state after form submission (conditional on `isSubmitted`). The test was outdated and needed to match the current page design. The fix is in the test, not the source, because the source code behavior is intentional -- the waitlist page uses a clean, focused design without a back link until the user has completed their action.

---

## Conclusion

The test suite is in excellent health. Only 1 of 445 tests was failing, and it was an outdated test expectation caused by a UI redesign of the waitlist page. The fix aligns the test with the actual source code behavior. All 445 tests now pass.
