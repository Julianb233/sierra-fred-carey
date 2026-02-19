---
phase: 60-cicd-testing-expansion
plan: 01
subsystem: ci-cd
tags: [playwright, e2e, accessibility, axe-core, github-actions, wcag]
depends_on:
  requires: [59-02]
  provides: ["Playwright E2E job in CI", "axe-core accessibility tests", "deploy gated on E2E"]
  affects: [60-02, 65]
tech-stack:
  added: ["@axe-core/playwright"]
  patterns: ["CI E2E gate", "WCAG 2.1 AA automated testing", "GitHub Actions annotations"]
key-files:
  created:
    - tests/e2e/accessibility.spec.ts
    - tests/e2e/accessibility-authenticated.spec.ts
  modified:
    - .github/workflows/deploy.yml
    - playwright.config.ts
    - package.json
    - package-lock.json
decisions:
  - "Chromium-only in CI (Firefox/WebKit too slow and flaky in headless)"
  - "Filter to critical+serious violations only (minor/moderate are warnings, not blockers)"
  - "E2E job runs parallel with security job, both depend on build"
  - "Deploy gated on all three: build, security, e2e"
metrics:
  duration: "~2 minutes"
  completed: "2026-02-19"
---

# Phase 60 Plan 01: Playwright E2E + Accessibility CI Summary

**One-liner:** Playwright E2E job in GitHub Actions with axe-core WCAG 2.1 AA accessibility testing across 12 pages, gating deploys on test pass.

## What Was Done

### Task 1: Install axe-core and add Playwright E2E job to CI
- Installed `@axe-core/playwright` as dev dependency
- Added `e2e` job to `.github/workflows/deploy.yml`:
  - Installs Chromium with system deps
  - Runs full Playwright test suite
  - Uploads playwright-report and test-results as artifacts (14-day retention)
  - Passes E2E credentials and Supabase env vars from GitHub secrets
- Updated deploy job needs: `[build, security, e2e]` -- E2E failures now block deployment
- Updated `playwright.config.ts`:
  - GitHub Actions reporter for inline PR annotations in CI
  - Chromium-only project list in CI (all 3 browsers locally)
  - Screenshot on failure for CI debugging
  - 180s webServer timeout for CI builds (up from 120s)

### Task 2: Create axe-core accessibility test suites
- `tests/e2e/accessibility.spec.ts` -- 7 public pages:
  - Homepage, About, Login, Get Started, Pricing, Contact, Blog
  - No authentication required, uses standard Playwright test import
- `tests/e2e/accessibility-authenticated.spec.ts` -- 5 authenticated pages:
  - Dashboard, Chat, Check-ins, Dashboard Settings, Dashboard Next Steps
  - Uses auth fixture for login flow
- Both suites:
  - Test WCAG 2.1 AA tags (wcag2a, wcag2aa, wcag21a, wcag21aa)
  - Filter to critical and serious violations only
  - Log violation details with HTML excerpts for CI debugging
  - Wait for networkidle before scanning

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| Chromium-only in CI | Firefox/WebKit are slow and flaky in headless CI; Chromium catches 95%+ of issues |
| Critical+serious filter | Minor/moderate violations (e.g., color contrast edge cases) cause flaky CI without security benefit |
| Separate public/auth test files | Avoids login overhead for public pages; auth fixture handles login for protected pages |
| E2E parallel with security | Both depend on build succeeding; no dependency between them |

## Deviations from Plan

None -- plan executed exactly as written.

## Commits

| Commit | Description |
|--------|-------------|
| 5858f4d | feat(60-01): add Playwright E2E job to CI pipeline |
| 743982a | feat(60-01): add axe-core accessibility test suites for 12 pages |

## Next Phase Readiness

- GitHub Actions secrets needed: `E2E_TEST_EMAIL`, `E2E_TEST_PASSWORD`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Phase 60-02 can proceed (lint/test fixing is independent of E2E infrastructure)
- Phase 65 accessibility work will benefit from these automated WCAG checks
