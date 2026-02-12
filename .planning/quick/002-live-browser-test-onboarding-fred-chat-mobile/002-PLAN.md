---
phase: quick
plan: 002
type: execute
wave: 1
depends_on: []
files_modified:
  - e2e-mobile-ux-audit.mjs
  - .planning/quick/002-live-browser-test-onboarding-fred-chat-mobile/002-TEST-REPORT.md
autonomous: true

must_haves:
  truths:
    - "All 20 UX fixes from the audit are visually confirmed at 375px mobile viewport"
    - "Landing page, get-started, login, onboarding, and chat flows load and render correctly on mobile"
    - "Screenshots captured at each step of the user journey for visual evidence"
    - "Pass/fail report generated with per-fix verification status"
  artifacts:
    - path: "e2e-mobile-ux-audit.mjs"
      provides: "Stagehand browser test script for mobile UX verification"
    - path: ".planning/quick/002-live-browser-test-onboarding-fred-chat-mobile/002-TEST-REPORT.md"
      provides: "Pass/fail report with screenshot evidence and per-fix results"
  key_links:
    - from: "e2e-mobile-ux-audit.mjs"
      to: "https://www.joinsahara.com"
      via: "Browserbase remote browser session"
      pattern: "Stagehand.*BROWSERBASE"
---

<objective>
Run a live mobile browser test of the Sahara app at https://www.joinsahara.com using Browserbase/Stagehand. Walk through the full user journey (landing page -> get-started -> login -> onboarding -> FRED chat) at a 375px mobile viewport. Verify all 20 UX audit fixes are working visually. Capture screenshots at each step. Produce a pass/fail report.

Purpose: The full-stack UX audit completed 36 fixes but browser testing was blocked by a paused Vercel deployment. The custom domain www.joinsahara.com is now responding (HTTP 200). This task performs the live visual verification that was previously impossible.

Output: Test script + comprehensive pass/fail report with screenshot evidence.
</objective>

<execution_context>
@~/.claude/get-shit-done/workflows/execute-plan.md
@~/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/FIXES-LOG.md
@.planning/UX-EXPLORER-REPORT.md
@.planning/VERIFICATION.md
@e2e-stagehand-audit.mjs (existing Stagehand pattern -- adapt for Browserbase remote mode)

Key reference files for what to verify:
@components/chat/chat-input.tsx (Fix 5: iOS zoom prevention, 44px touch targets, ARIA)
@components/chat/chat-interface.tsx (Fix 10: safe-area padding, role="log", aria-live)
@components/chat/chat-message.tsx (Fix 17: max-w-[85%] mobile bubble width)
@components/chat/typing-indicator.tsx (Fix 4: brand-aligned colors)
@components/onboarding/fred-intro-step.tsx (Fix 9: ARIA + touch targets)
@app/chat/page.tsx (Fix 18: dvh + responsive height)
@app/get-started/page.tsx (Fix 14: role="alert" on error)
@app/login/page.tsx (Fix 13: iOS zoom + role="alert")
@app/get-started/error.tsx (Fix 16: error boundary)
@app/onboarding/error.tsx (Fix 16: error boundary)
@app/dashboard/layout.tsx (Fix 1: nav items, Fix 20: 44px touch targets)
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create and run Stagehand mobile UX verification script</name>
  <files>e2e-mobile-ux-audit.mjs</files>
  <action>
Create a Stagehand v3 test script that runs against https://www.joinsahara.com using BROWSERBASE env mode (not LOCAL). The script must:

1. **Initialize Stagehand with Browserbase** using `env: "BROWSERBASE"` (API key and project ID are in environment variables BROWSERBASE_API_KEY and BROWSERBASE_PROJECT_ID). Set viewport to 375x812 (iPhone 13/14 size). Use modelName "gpt-4o" for AI actions.

2. **Test the following flows at 375px viewport**, capturing a screenshot (via `page.screenshot()`) at each major step. Save screenshots to `.planning/quick/002-live-browser-test-onboarding-fred-chat-mobile/screenshots/` directory:

   **Flow A: Landing Page (guest)**
   - Navigate to https://www.joinsahara.com
   - Screenshot the hero section
   - Verify viewport meta tag includes `maximum-scale=1` (iOS zoom prevention)
   - Check for responsive Tailwind classes (sm:, md:, lg:)
   - Verify mobile hamburger menu is visible (lg:hidden pattern)
   - Check footer renders with expected links
   - Screenshot the full page

   **Flow B: Get Started / Signup**
   - Navigate to /get-started
   - Screenshot the form
   - Verify stage selection cards render in 2-column grid
   - Check touch targets are >= 44px (evaluate min-height on interactive elements)
   - Verify error element has role="alert" (Fix 14)
   - Check that error boundary exists by verifying /get-started/error route is defined (just verify HTML loads)

   **Flow C: Login Page**
   - Navigate to /login
   - Screenshot the form
   - Verify inputs have `text-base` class (Fix 13 - prevents iOS zoom on 16px+ font)
   - Verify error display has role="alert" (Fix 13)
   - Check for "Forgot password?" link (Fix 25 from UX report)

   **Flow D: Chat Page (unauthenticated view)**
   - Navigate to /chat
   - Screenshot whatever renders (may redirect to login -- that is expected and is a PASS)
   - If chat UI renders, verify:
     - Chat container has `role="log"` and `aria-live="polite"` (Fix 10)
     - Chat input has `text-base` class and `min-h-[44px]` (Fix 5)
     - Safe-area padding present: `safe-area-inset-bottom` in styles (Fix 10)
     - Send button has min-h/w of 44px (Fix 5)
     - Chat bubbles have max-w-[85%] on mobile (Fix 17)
     - "Enter/Shift+Enter" keyboard hint is hidden on mobile viewport (Fix 19)
     - Typing indicator uses brand orange colors (Fix 4)
     - Chat height uses dvh units (Fix 18)
     - Chat input has aria-label (Fix 5)

   **Flow E: Dashboard (unauthenticated -- verify redirect or gate)**
   - Navigate to /dashboard
   - Screenshot the result (should redirect to login)
   - If dashboard renders, check:
     - Sidebar nav items have min-h-[44px] touch targets (Fix 20)
     - All 9 missing nav items are present (Fix 1): Wellbeing, Inbox, Notifications, Investor Targeting, Snapshot, Video, Memory, Sharing, Invitations

   **Flow F: Desktop comparison (1440px)**
   - Resize viewport to 1440x900
   - Navigate to homepage
   - Screenshot for comparison
   - Verify desktop nav is visible (not hamburger)
   - Navigate to /get-started, screenshot
   - Resize back to 375x812

3. **For each check, record** pass/fail with detail string. Use the same `record()` pattern from the existing `e2e-stagehand-audit.mjs`.

4. **At the end**, print a JSON summary and a human-readable summary table.

**Important implementation notes:**
- Use `env: "BROWSERBASE"` -- the BROWSERBASE_API_KEY and BROWSERBASE_PROJECT_ID env vars are already set.
- For screenshots, use `await page.screenshot({ path: "...", fullPage: true })` where possible.
- Create the screenshots directory before running.
- Use `page.evaluate()` to inspect DOM attributes, computed styles, and class lists.
- For checking min-height/touch targets, use `getComputedStyle(el).minHeight` or `el.getBoundingClientRect().height`.
- Handle auth redirects gracefully -- if /chat or /dashboard redirects to /login, that is expected behavior, record as PASS for "auth gate works".
- Set a reasonable timeout (120s total, 15s per navigation).
- The script should be runnable with `node e2e-mobile-ux-audit.mjs`.
  </action>
  <verify>
Run: `node e2e-mobile-ux-audit.mjs`
Script completes without fatal errors. All screenshots are saved. JSON results are printed.
  </verify>
  <done>
Script runs against live www.joinsahara.com, screenshots are captured for each flow, and pass/fail results are recorded for all 20 UX fix verifications.
  </done>
</task>

<task type="auto">
  <name>Task 2: Generate test report from results</name>
  <files>.planning/quick/002-live-browser-test-onboarding-fred-chat-mobile/002-TEST-REPORT.md</files>
  <action>
After running the test script from Task 1, parse the JSON results output and generate a comprehensive test report at the specified path. The report must include:

1. **Header**: Date, target URL, viewport sizes tested, Browserbase session ID

2. **Executive Summary**: Total pass/fail/skip counts, overall verdict

3. **Per-Fix Verification Table** mapping each of the 20 original UX audit fixes to its test result:

| Fix # | Description | Test Result | Evidence |
|-------|-------------|-------------|----------|
| 1 | Missing dashboard nav items (9 pages) | PASS/FAIL/SKIP | What was observed |
| 4 | Chat typing indicator colors | PASS/FAIL/SKIP | ... |
| 5 | Chat input iOS zoom + touch targets + ARIA | PASS/FAIL/SKIP | ... |
| 9 | Onboarding fred-intro ARIA + touch targets | PASS/FAIL/SKIP | ... |
| 10 | Chat safe-area-inset-bottom + ARIA | PASS/FAIL/SKIP | ... |
| 13 | Login iOS zoom + role=alert | PASS/FAIL/SKIP | ... |
| 14 | Get-started role=alert on error | PASS/FAIL/SKIP | ... |
| 16 | Error boundaries on onboarding/get-started | PASS/FAIL/SKIP | ... |
| 17 | Chat bubble max-width on mobile | PASS/FAIL/SKIP | ... |
| 18 | Chat height dvh + responsive | PASS/FAIL/SKIP | ... |
| 19 | Chat keyboard hint hidden on mobile | PASS/FAIL/SKIP | ... |
| 20 | Sidebar nav 44px touch targets | PASS/FAIL/SKIP | ... |

(Include all 20 fixes from FIXES-LOG.md -- some like security/backend fixes 2,3,6,7,8,11,12,15 are backend-only and should be marked N/A-BACKEND with note "Not testable via browser")

4. **UX Report Issue Re-test** -- re-test the 10 issues from UX-EXPLORER-REPORT.md:

| Issue # | Description | Original Status | Re-test Result |
|---------|-------------|-----------------|----------------|
| 1 | Chat crashes during AI response | CRITICAL | FIXED/STILL-BROKEN/SKIP |
| 2 | Session lost after chat crash | CRITICAL | ... |
| 3 | /dashboard/ai-insights 404 | MAJOR | ... |
| 4 | Risk alerts error message | MAJOR | ... |
| 5 | /admin silent redirect | MAJOR | ... |
| ... | ... | ... | ... |

5. **Screenshot Index**: List of all screenshots with descriptions

6. **Mobile Optimization Checklist**:
- [ ] Viewport meta prevents iOS zoom (maximum-scale=1)
- [ ] All interactive elements >= 44px touch targets
- [ ] Safe-area-inset-bottom handled on chat
- [ ] dvh units used for mobile viewport height
- [ ] Text inputs use text-base (16px) to prevent iOS zoom
- [ ] Keyboard hints hidden on mobile
- [ ] Chat bubbles wide enough on mobile (85%)
- [ ] ARIA attributes present on forms and chat

7. **Remaining Issues**: Any new issues found during testing

If the test script could not test certain items (e.g., auth-gated pages), clearly mark them as SKIP with explanation "requires authenticated session" and note that a future test with test credentials would be needed.
  </action>
  <verify>
File exists at `.planning/quick/002-live-browser-test-onboarding-fred-chat-mobile/002-TEST-REPORT.md` with all sections populated.
All 20 fixes from FIXES-LOG.md are accounted for (PASS, FAIL, SKIP, or N/A-BACKEND).
All 10 UX-EXPLORER-REPORT issues are re-tested or marked SKIP with reason.
  </verify>
  <done>
Comprehensive test report exists with per-fix verification, screenshot index, mobile optimization checklist, and clear pass/fail status for every item. Any items that could not be tested are marked SKIP with clear reason.
  </done>
</task>

</tasks>

<verification>
1. `node e2e-mobile-ux-audit.mjs` runs to completion against www.joinsahara.com
2. Screenshots exist in `.planning/quick/002-live-browser-test-onboarding-fred-chat-mobile/screenshots/`
3. Test report covers all 20 FIXES-LOG fixes and all 10 UX-EXPLORER-REPORT issues
4. No FAIL results on fixes that were code-verified as complete
5. Report clearly separates what was testable (public pages) from what was not (auth-gated)
</verification>

<success_criteria>
- Stagehand connects to Browserbase and opens www.joinsahara.com at 375px viewport
- All public page flows tested: landing, get-started, login, pricing, about
- Auth-gated flows attempted with graceful handling of redirects
- Screenshots captured at minimum 6 key points in the user journey
- Per-fix pass/fail table covers all 20 fixes with evidence
- UX-EXPLORER-REPORT 10 issues re-tested where possible
- Mobile optimization checklist completed
- Final report written to 002-TEST-REPORT.md
</success_criteria>

<output>
After completion, create `.planning/quick/002-live-browser-test-onboarding-fred-chat-mobile/002-SUMMARY.md` with:
- Overall pass/fail counts
- Key findings
- Any new issues discovered
- Recommendation on whether the UX audit fixes are production-ready
</output>
