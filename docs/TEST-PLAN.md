# Sahara Product Stabilization — Comprehensive Test Plan

> Created: 2026-04-07 | Linear: AI-5353
> Context: Ira Hayes requested a formal test plan before onboarding 10-100 beta testers.
> Goal: Validate Sahara works 99.8% of the time for core use cases.

## 1. Core User Journeys

### J1: Onboarding (Get Started Wizard)

| Step | Action | Pass Criteria |
|------|--------|---------------|
| 1.1 | Visit `/get-started` | Wizard loads, step 1 (stage selection) visible |
| 1.2 | Select startup stage (e.g., "Pre-seed") | Step advances to 2 (challenge selection) |
| 1.3 | Select challenge (e.g., "Fundraising") | Step advances to 3 (account creation) |
| 1.4 | Enter email + password | Validation: 8+ chars, 1 uppercase, 1 number |
| 1.5 | Submit account creation | Supabase user created, step advances to 4 |
| 1.6 | Fill business fundamentals | Business name, industry, positioning required |
| 1.7 | Complete wizard | Confetti animation, redirect to `/dashboard` |
| 1.8 | Revisit `/get-started` while logged in | Redirect to `/dashboard` (no re-onboarding) |

**Edge cases:**
- Duplicate email registration
- Weak password rejection
- Browser refresh mid-wizard (localStorage persistence)
- Mobile viewport layout

### J2: Authentication

| Step | Action | Pass Criteria |
|------|--------|---------------|
| 2.1 | Visit `/login` | Login form renders with email + password fields |
| 2.2 | Submit valid credentials | Redirect to `/dashboard`, session cookie set |
| 2.3 | Submit invalid credentials | Error message shown, no redirect |
| 2.4 | Submit empty fields | Validation errors shown |
| 2.5 | Visit `/forgot-password` | Email input form renders |
| 2.6 | Submit forgot password email | Success message, email sent via Supabase |
| 2.7 | Click reset link in email | `/reset-password` page loads |
| 2.8 | Submit new password | Password updated, redirect to `/login` |
| 2.9 | Login with new password | Success |
| 2.10 | Visit `/signup` | Redirect to `/get-started` |

**Edge cases:**
- Expired reset token
- Login from `/get-started` (inline auth at step 3)
- Session timeout (JWT 30-day maxAge)

### J3: FRED AI Chat

| Step | Action | Pass Criteria |
|------|--------|---------------|
| 3.1 | Navigate to `/chat` | Chat interface loads, greeting from FRED appears |
| 3.2 | Type message and send | Message appears in chat, streaming indicator shows |
| 3.3 | FRED responds | Response streams in, formatted markdown |
| 3.4 | Send follow-up message | Context maintained from previous messages |
| 3.5 | Use voice input | Whisper transcription captured, sent as text |
| 3.6 | Export chat history | Download as JSON/Markdown/CSV |
| 3.7 | Open "Call Fred" modal | LiveKit voice connection initiates (Pro+ only) |

**Edge cases:**
- Rate limiting (check Upstash response)
- Empty message submission
- Very long message (token limits)
- Network disconnect mid-stream
- Tier gating on voice features

### J4: Dashboard — Investor Readiness Score

| Step | Action | Pass Criteria |
|------|--------|---------------|
| 4.1 | Navigate to `/dashboard/investor-readiness` | Score dashboard loads |
| 4.2 | View current score breakdown | All scoring dimensions shown |
| 4.3 | Navigate to `/dashboard/investor-lens` | Investor evaluation tool loads |
| 4.4 | Navigate to `/dashboard/investor-targeting` | Investor matching interface loads (Studio only) |
| 4.5 | View investor matches | Matched investors listed with relevance scores |

**Edge cases:**
- Free tier user hitting Studio-gated feature (FeatureLock shown)
- No profile data yet (empty state)

### J5: Dashboard — Pitch Deck Review

| Step | Action | Pass Criteria |
|------|--------|---------------|
| 5.1 | Navigate to `/dashboard/pitch-deck` | Upload interface loads |
| 5.2 | Upload PDF pitch deck | File accepted, processing indicator shown |
| 5.3 | AI analysis completes | Slide-by-slide feedback rendered |
| 5.4 | View scoring | Overall and per-section scores shown |

**Edge cases:**
- Non-PDF file upload
- Very large PDF (>50 pages)
- Corrupt PDF
- Upload while not authenticated

### J6: Dashboard — Core Pages

| Step | Action | Pass Criteria |
|------|--------|---------------|
| 6.1 | `/dashboard` home | Command center loads with summary cards |
| 6.2 | `/dashboard/next-steps` | Personalized action items render |
| 6.3 | `/dashboard/coaching` | Coaching interface loads |
| 6.4 | `/dashboard/journey` | Journey progress visualization renders |
| 6.5 | `/dashboard/documents` | Document list loads |
| 6.6 | `/dashboard/settings` | Settings form renders, editable |
| 6.7 | `/dashboard/profile` | Profile data renders, editable |
| 6.8 | `/dashboard/analytics` | Analytics charts render |
| 6.9 | `/dashboard/content` | Course catalog loads |
| 6.10 | `/dashboard/wellbeing` | Wellbeing check-in interface loads |

### J7: Pricing & Payments

| Step | Action | Pass Criteria |
|------|--------|---------------|
| 7.1 | Visit `/pricing` | All 4 tier cards render with correct prices |
| 7.2 | Click "Get Started" CTA | Redirect to `/get-started` |
| 7.3 | Trigger upgrade from dashboard | Stripe checkout session created |
| 7.4 | Complete Stripe payment | Tier updated, features unlocked |
| 7.5 | Visit billing portal | Stripe portal loads |
| 7.6 | Cancel subscription | Tier downgraded, features locked |

**Edge cases:**
- Stripe webhook delivery failure
- Double-click on payment button
- Free trial expiration

### J8: Virtual Team Agents

| Step | Action | Pass Criteria |
|------|--------|---------------|
| 8.1 | Visit `/agents` (public) | Agent showcase grid renders |
| 8.2 | Click agent card | Agent detail page loads with description |
| 8.3 | Visit `/dashboard/agents` (auth) | Studio-gated agent dashboard loads |
| 8.4 | Dispatch task to agent | Task created, agent processes it |
| 8.5 | View task history | Previous agent tasks listed |

### J9: Community & Marketplace

| Step | Action | Pass Criteria |
|------|--------|---------------|
| 9.1 | `/dashboard/communities` | Community list renders |
| 9.2 | `/dashboard/marketplace` | Marketplace listings render |
| 9.3 | Create community | Community created successfully |
| 9.4 | Book marketplace service | Booking created |

### J10: Admin Panel

| Step | Action | Pass Criteria |
|------|--------|---------------|
| 10.1 | `/admin/login` | Admin login form renders |
| 10.2 | Login with admin credentials | Dashboard loads with stats |
| 10.3 | View feedback | `/admin/feedback` shows session feedback |
| 10.4 | View analytics | `/admin/analytics` renders charts |
| 10.5 | Manage prompts | `/admin/prompts` CRUD works |
| 10.6 | View audit log | `/admin/audit-log` entries render |

## 2. API Health Checks

| Endpoint | Method | Expected |
|----------|--------|----------|
| `/api/auth/login` | POST | 200 with session cookie |
| `/api/auth/logout` | POST | 200, cookie cleared |
| `/api/fred/chat` | POST | SSE stream |
| `/api/fred/mode` | GET | JSON with current mode |
| `/api/fred/export` | POST | File download |
| `/api/agents/tasks` | GET | JSON array |
| `/api/stripe/checkout` | POST | Stripe session URL |
| `/api/stripe/webhook` | POST | 200 on valid event |
| `/api/feedback/signal` | POST | 201 |
| `/api/admin/feedback/insights/*/linear` | POST | Linear issue created |

## 3. Cross-Cutting Concerns

### Performance
- All pages load in <3s (LCP)
- CLS < 0.1 on all pages
- Chat streaming starts within 2s of send

### Accessibility
- All pages pass WCAG 2.1 AA
- Keyboard navigation works for all interactive elements
- Screen reader labels on all form inputs

### Mobile Responsiveness
- All pages usable on 375px viewport (iPhone SE)
- Touch targets >= 44px
- No horizontal scroll

### Security
- Authenticated routes return 401 when unauthenticated
- Admin routes require admin role
- No XSS in chat messages
- Rate limiting on API endpoints
- CSRF protection on forms

## 4. Test Coverage Matrix

| Journey | Unit Tests | E2E (Playwright) | Maestro (Mobile) | Status |
|---------|-----------|-------------------|-------------------|--------|
| J1: Onboarding | tests/pages/get-started.test.tsx | e2e/signup.spec.ts, onboarding-journey-smoke.spec.ts | maestro/onboarding.yaml | Partial |
| J2: Auth | lib/auth/__tests__/token.test.ts | e2e/login.spec.ts | maestro/auth.yaml | Partial |
| J3: FRED Chat | lib/fred/__tests__/*.test.ts | e2e/fred-chat.spec.ts | maestro/fred-chat.yaml | Partial |
| J4: Investor Readiness | lib/investors/__tests__/*.test.ts | — | — | Unit only |
| J5: Pitch Deck | app/api/pitch-deck/__tests__/*.test.ts | — | — | Unit only |
| J6: Dashboard | tests/dashboard-integration.test.ts | — | — | Unit only |
| J7: Pricing | tests/pages/pricing.test.tsx | e2e/pricing-checkout.spec.ts | — | Partial |
| J8: Agents | — | e2e/agents.spec.ts | — | E2E only |
| J9: Community | — | — | — | None |
| J10: Admin | — | — | — | None |

## 5. Prioritized Test Gaps

### P0 — Must fix before beta (blocks user activation)
1. **Forgot/reset password E2E** — no coverage, critical auth flow
2. **Dashboard home E2E** — no coverage for the first thing users see after onboarding
3. **FRED chat reliability** — test rate limiting, error states, network disconnects
4. **Stripe payment E2E** — test full checkout flow with test mode cards

### P1 — Should fix before beta (breaks core experience)
5. **Investor readiness E2E** — key differentiator, no E2E coverage
6. **Pitch deck upload E2E** — core feature, no E2E coverage
7. **Mobile responsiveness** — existing spec is basic; needs journey-level coverage
8. **Admin panel basics** — no coverage at all

### P2 — Nice to have for beta
9. **Community/marketplace E2E** — secondary features
10. **Agent task dispatch E2E** — Studio-only, small user base initially
11. **Coaching session E2E** — coverage exists in unit tests

## 6. Maestro Mobile Flows

See `maestro/` directory for YAML flow definitions:
- `maestro/onboarding.yaml` — Full onboarding wizard on mobile
- `maestro/auth.yaml` — Login, forgot password, reset password
- `maestro/fred-chat.yaml` — Chat send/receive on mobile
- `maestro/dashboard-navigation.yaml` — Navigate all main dashboard pages

## 7. How to Run

```bash
# Unit tests
npm run test

# E2E tests (requires dev server running)
npm run test:e2e

# E2E with headed browser
npm run test:e2e:headed

# Maestro mobile tests (requires Maestro CLI + emulator)
maestro test maestro/
```

## 8. Success Criteria

- All P0 tests passing
- All P1 tests passing
- Overall test pass rate: >= 99.8%
- No critical/high severity bugs in core journeys
- All API health checks green
- Mobile responsiveness verified on iOS Safari + Android Chrome
