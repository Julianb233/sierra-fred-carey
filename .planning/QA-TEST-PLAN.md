# QA Verification Test Plan

**Date:** 2026-02-11
**QA Verifier:** QA Verifier Agent
**Status:** Proactive baseline established; awaiting Code Fixer fixes

---

## Baseline Status (Pre-Fix)

### Build
- **npm run build:** PASSES (all routes compile)
- **TypeScript (tsc --noEmit):** Errors only in `workers/voice-agent/agent.ts` (isolated, not part of main build)

### Lint
- **npm run lint:** 722 problems (402 errors, 320 warnings)
- Primary issues: `@typescript-eslint/no-explicit-any`, unused variables
- 3 auto-fixable errors

### Unit Tests
- **35 of 36 suites pass, 617 tests pass**
- 1 failure: `tests/auth/profile-creation.test.ts` imports `@jest/globals` instead of vitest
- All other suites green

### Deployed Site
- **https://sahara.vercel.app** — PAUSED ("This deployment is temporarily paused")
- Browser-based E2E verification NOT possible
- All routes (/, /dashboard, /admin, /chat, /api/health) return paused page

---

## Test Plan Per Feature Area

### 1. Authentication & Authorization
| Test | Method | Status |
|------|--------|--------|
| Login page renders | Browser / Build | Pending |
| Signup flow works | Browser | Blocked (site paused) |
| Password validation | Browser | Blocked |
| Session persistence | Browser | Blocked |
| Middleware route protection | Source review | Pending |
| Admin route guard | Browser / Source | Pending |
| RLS policies prevent cross-user data access | Source review | Pending |

### 2. Dashboard Pages
| Page | Route | Test Status |
|------|-------|-------------|
| Main dashboard | /dashboard | Blocked |
| Chat with FRED | /dashboard/chat or /chat | Blocked |
| Reality Lens | /dashboard/reality-lens | Blocked |
| Investor Readiness | /dashboard/investor-readiness | Blocked |
| Pitch Deck Review | /dashboard/pitch-deck | Blocked |
| Strategy Docs | /dashboard/strategy | Blocked |
| Virtual Team Agents | /dashboard/agents | Blocked |
| SMS Check-ins | /dashboard/sms | Blocked |
| Wellbeing | /dashboard/wellbeing | Blocked |
| Settings | /dashboard/settings | Blocked |
| Memory Browser | /dashboard/memory | Blocked |
| Journey | /dashboard/journey | Blocked |
| Notifications | /dashboard/notifications | Blocked |
| Sharing | /dashboard/sharing | Blocked |
| Invitations | /dashboard/invitations | Blocked |
| Monitoring | /dashboard/monitoring | Blocked |
| Positioning | /dashboard/positioning | Blocked |
| Startup Process | /dashboard/startup-process | Blocked |
| Investor Targeting | /dashboard/investor-targeting | Blocked |
| Profile Snapshot | /dashboard/profile/snapshot | Blocked |
| Strategy Reframing | /dashboard/strategy/reframing | Blocked |

### 3. Public Pages
| Page | Route | Test Status |
|------|-------|-------------|
| Homepage | / | Blocked |
| Pricing | /pricing | Blocked |
| Features | /features | Blocked |
| Product | /product | Blocked |
| Login | /login | Blocked |
| Signup | /signup | Blocked |
| Get Started | /get-started | Blocked |
| Privacy | /privacy | Blocked |
| Terms | /terms | Blocked |
| Support | /support | Blocked |
| Install (PWA) | /install | Blocked |

### 4. API Endpoints
| Endpoint | Method | Test Status |
|----------|--------|-------------|
| Health check | GET /api/health | Blocked |
| Chat | POST /api/chat | Blocked |
| Auth endpoints | Various | Blocked |

### 5. Code Quality Verification
| Check | Status | Result |
|-------|--------|--------|
| npm run build | Done | PASS |
| npm test (vitest) | Done | 35/36 pass (1 import issue) |
| npm run lint | Done | 402 errors, 320 warnings |
| tsc --noEmit | Done | Only voice-agent errors |

---

## Verification Process (for each fix from Code Fixer)

1. **Read the fix:** Review changed files, understand the intent
2. **Build check:** Run `npm run build` to confirm no regressions
3. **Test check:** Run `npm test` to confirm no test regressions
4. **Source review:** Verify the fix addresses the reported issue correctly
5. **Browser check:** If site becomes available, verify in browser
6. **Regression check:** Ensure fix doesn't break adjacent functionality
7. **Update FIXES-LOG.md:** Mark PASS/FAIL with details

---

## Notes

- The Vercel deployment being paused is a P0 blocker for browser-based verification
- Local verification (build, tests, source review) can still validate code correctness
- TypeScript compilation via `next build` is the strongest local validator since it type-checks and compiles all routes

*Updated: 2026-02-11*
