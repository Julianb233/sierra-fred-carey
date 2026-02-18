# Ralph Wiggum Testing Log

## Run: 2026-02-18 — Dashboard + FRED Chat

### Summary
| Metric | Count |
|--------|-------|
| Total Cases | 10 |
| Passed | 7 |
| Failed | 2 |
| Partial Pass | 1 |
| Regressions | 0 |

### Failed Cases (Needs Fix)
| Case ID | Title | Failure | Priority | Status |
|---------|-------|---------|----------|--------|
| RW-004 | Floating Widget vs Full Chat Confusion | Widget and /chat are separate conversations with no shared state | P2 | Open |
| RW-007 | Unicode, Long Inputs, and Empty States | /dashboard/community returns 404 but exists in sidebar nav | P2 | Fixed (fff47c6) |

### Partial Pass
| Case ID | Title | Issue | Priority | Status |
|---------|-------|-------|----------|--------|
| RW-005 | Rapid-Fire Submit and Garbage Input | Messages 2+3 silently dropped during rapid-fire. Both messages got "Unable to process request." No crash. | P2 | Open |

### Passed Cases
| Case ID | Title | Notes |
|---------|-------|-------|
| RW-001 | Dashboard to FRED Conversation | Happy path works. First message transient error, retry succeeded. Full LLM response with Next 3 Actions. |
| RW-002 | Chat Export and Side Panel | Side panel has Snapshot/Steps/Docs tabs. Steps persists Next Actions. Export works (JSON/MD/CSV). |
| RW-003 | Wrong Fields and Abandoned Flows | Email validation catches invalid input. Weak password blocked. Wizard resets on abandon (P3 - no state recovery). |
| RW-006 | Browser Back Button During Streaming | Back during stream returns to dashboard cleanly. Chat fully recovers on return. No orphaned state. |
| RW-008 | Keyboard-Only Chat Navigation | Source review: aria-labels on all interactive elements, onKeyDown handlers, Enter to submit, Shift+Enter newline. |
| RW-009 | Error State and Session Expiry | API returns 401 JSON (not 500) for unauthenticated. Middleware 307 redirects to /login with redirect param. Toast error handling in components. |
| RW-010 | Tier Gate Boundary Testing | Coaching properly locked for Pro (requires Studio). Lock icon + "Available on Studio tier" message. Upgrade CTA opens pricing modal with correct tiers. |

### Bugs Found
| # | Bug | Severity | Test Case | Linear |
|---|-----|----------|-----------|--------|
| 1 | Widget and /chat are completely separate conversations — no shared state | P2 | RW-004 | AI-357 |
| 2 | /dashboard/community returns 404 but listed in sidebar nav | P2 | RW-007 | Fixed (fff47c6) |
| 3 | Rapid-fire messages 2+3 silently dropped with no user feedback | P2 | RW-005 | AI-358 |
| 4 | "Unable to process request." error — terse, no retry guidance | P3 | RW-005 | AI-358 |
| 5 | Transient FRED error on first message in new session | P3 | RW-001 | AI-354 |
| 6 | Onboarding wizard doesn't resume after abandon (resets to step 1) | P3 | RW-003 | AI-356 |

### Test Cases
| Case ID | Title | Category | Persona | Result |
|---------|-------|----------|---------|--------|
| RW-001 | Dashboard to FRED Conversation | Happy Path | First-time founder (Free) | PASS |
| RW-002 | Chat Export and Side Panel | Happy Path | Returning Pro founder | PASS |
| RW-003 | Wrong Fields and Abandoned Flows | Confused User | Enters data in wrong fields | PASS |
| RW-004 | Floating Widget vs Full Chat Confusion | Confused User | Two chat UIs confusion | FAIL |
| RW-005 | Rapid-Fire Submit and Garbage Input | Chaos Agent | Rapid-fire clicker | PARTIAL |
| RW-006 | Browser Back Button During Streaming | Chaos Agent | Abandons mid-flow | PASS |
| RW-007 | Unicode, Long Inputs, and Empty States | Edge Case | Wrong locale/charset | FAIL |
| RW-008 | Keyboard-Only Chat Navigation | Accessibility | Keyboard-only user | PASS |
| RW-009 | Error State and Session Expiry | Recovery | Pushes through errors | PASS |
| RW-010 | Tier Gate Boundary Testing | Edge Case | Free tier boundary explorer | PASS |

### Regression Watch
Cases that previously passed but failed this run:
| Case ID | Title | Last Passed | Broke In |
|---------|-------|-------------|----------|
| (first run — no regression baseline) | | | |

### BrowserBase Session IDs (Proof)
| Test Cases | Session ID |
|------------|-----------|
| RW-001, RW-002 | 6c9c4f82-c95f-4fca-9fa8-3303bf7aa455 |
| RW-003 | 726593c0-b90b-4fe3-9f78-b148fdc2a1d6 |
| RW-004 | ad2faba1-8b6c-4d4d-8dfd-928b534ff264 |
| RW-005 | b03edc85-bda4-47dd-90a4-63c04b259e10 |
| RW-006 | 13585586-cbef-4a4d-916c-11255e8d1eeb |
| RW-007 | c3bc35ab-54db-4fdd-a324-ab06848b9338 |
| RW-010 | 7e54929e-bfb4-4aff-a635-b3a2e806c557 |

---
*Report finalized: 2026-02-18*
*Tester: Claude Code Agent (Ralph Wiggum QA Suite)*
