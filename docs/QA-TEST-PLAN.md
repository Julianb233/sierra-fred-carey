# Sahara QA Test Plan

**Version:** 1.0
**Date:** 2026-04-07
**Purpose:** Structured QA test cases for pre-launch validation before onboarding 10-100 testers (Kickstarter April 14)
**Platform:** joinsahara.com (Next.js 16 + Supabase + Stripe)
**Linear:** AI-5336

---

## 1. Critical Flows (Must Pass Before Launch)

### 1.1 New User Signup (journey-001)

| # | Scenario | Steps | Expected Result | Edge Case |
|---|----------|-------|-----------------|-----------|
| S-01 | Happy path signup | /get-started → Select stage → Select challenge → Enter email + password → Submit | Redirects to /dashboard with welcome modal. Profile created in Supabase. | — |
| S-02 | Duplicate email | Same as S-01 with existing email | Error: "Account already exists" or redirect to login | No duplicate profile created |
| S-03 | Invalid email format | Enter "notanemail" in email field | Client-side validation error | Form should not submit |
| S-04 | Weak password | Enter password < 6 chars | Validation error about password requirements | Supabase enforces minimum |
| S-05 | Back navigation | Complete step 1, click back on step 2 | Returns to step 1 with selection preserved | State persistence |
| S-06 | Page refresh mid-flow | Refresh browser on step 2 | Returns to step 1 or preserves state | Should not error |
| S-07 | Signup while logged in | Visit /get-started while authenticated | Redirect to /dashboard | No new account created |
| S-08 | Special chars in password | Use `!@#$%^&*` in password | Signup succeeds, login works | Encoding edge case |

### 1.2 Returning User Login (journey-002)

| # | Scenario | Steps | Expected Result | Edge Case |
|---|----------|-------|-----------------|-----------|
| L-01 | Happy path login | /login → Valid credentials → Submit | Redirects to /dashboard | — |
| L-02 | Wrong password | Valid email + wrong password | Error: "Invalid login credentials" | Don't reveal if email exists |
| L-03 | Non-existent email | Unregistered email | Same generic error as L-02 | Email enumeration protection |
| L-04 | Forgot password | Click "Forgot password" → Enter email → Submit | Reset email sent, confirmation shown | — |
| L-05 | Password reset token expiry | Click expired reset link (>24h) | Error: "Link expired", prompt to request new one | — |
| L-06 | Session persistence | Login → Close browser → Reopen /dashboard | Still authenticated | JWT validity |
| L-07 | Rapid login attempts | 10 rapid failed logins | Rate limiting kicks in (429) | Upstash rate limiter |

### 1.3 FRED Chat / AI Interaction (journey-006)

| # | Scenario | Steps | Expected Result | Edge Case |
|---|----------|-------|-----------------|-----------|
| F-01 | Initial greeting | Navigate to /chat | FRED greeting displayed with Fred Cary persona | — |
| F-02 | Basic question | Ask "What should I focus on this week?" | Contextual response referencing user's stage/challenge | See AI Edge Case Matrix |
| F-03 | Startup advice | Ask "Help me write my elevator pitch" | Actionable advice, references user's startup details | — |
| F-04 | Multi-turn context | Send 5+ messages in sequence | Coherent conversation, context maintained | Memory/context limits |
| F-05 | Empty message | Press Enter with empty textarea | Nothing sent, no error | — |
| F-06 | Very long message | Paste 5000+ chars | Processed or clear limit shown | API token limit |
| F-07 | Special characters | Send emoji, HTML tags, markdown | Rendered correctly, no XSS | Sanitization |
| F-08 | Rapid-fire messages | 10 messages in <5 seconds | Rate limiting, graceful handling | — |
| F-09 | Network disconnect mid-stream | Kill network during AI response | Error state shown, retry available | Stream cancellation |
| F-10 | Chat history | Navigate away → Return to /chat | Previous messages visible | — |

### 1.4 Reality Lens Analysis (journey-003)

| # | Scenario | Steps | Expected Result | Edge Case |
|---|----------|-------|-----------------|-----------|
| R-01 | Standard analysis | /dashboard/reality-lens → Complete flow | Score + insights generated | — |
| R-02 | Quick analysis | /dashboard/reality-lens/quick | Completes faster with subset of questions | — |
| R-03 | Partial completion | Complete 50% → Navigate away → Return | Progress saved or clear restart option | — |
| R-04 | Extreme inputs | Very high/low values, gibberish text | Validation or AI handles gracefully | No crashes |
| R-05 | Repeat analysis | Run analysis twice | New result generated, history preserved | — |

### 1.5 Tier Gating & Upgrade (journey-010)

| # | Scenario | Steps | Expected Result | Edge Case |
|---|----------|-------|-----------------|-----------|
| T-01 | Free tier access Pro feature | Click Pro-only feature on free tier | Upgrade prompt with pricing | Clear CTA |
| T-02 | Stripe checkout success | Click upgrade → `4242 4242 4242 4242` | Tier updated, Pro features unlocked | — |
| T-03 | Failed payment | Use `4000 0000 0000 0002` (declined) | Error shown, tier unchanged | — |
| T-04 | Subscription cancel | Cancel via Stripe customer portal | Downgrade at period end | Access until period ends |
| T-05 | Webhook processing | Trigger Stripe webhook | Supabase tier updated within seconds | Retry on failure |

---

## 2. High-Priority Flows

### 2.1 Onboarding → Dashboard

| # | Scenario | Expected Result |
|---|----------|-----------------|
| O-01 | First dashboard load after signup | Dashboard shows correct stage/challenge context |
| O-02 | Startup Process Wizard | /dashboard/startup-process loads with stage-appropriate steps |
| O-03 | Journey milestones | /dashboard/journey shows milestones |
| O-04 | Next steps | /dashboard/next-steps shows personalized actions |
| O-05 | Check-ins | /check-ins page loads and allows scheduling |

### 2.2 Document Management

| # | Scenario | Expected Result |
|---|----------|-----------------|
| D-01 | Upload PDF | /documents/new → Upload → Document stored and listed |
| D-02 | View document | Click document → Content rendered |
| D-03 | Pitch deck review | /dashboard/pitch-deck → Upload → AI analysis with scores |
| D-04 | Large file upload | Upload 50MB PDF | Error or successful processing with progress |
| D-05 | Invalid file type | Upload .exe | Rejected with clear error |

### 2.3 Virtual Agents

| # | Scenario | Expected Result |
|---|----------|-----------------|
| A-01 | View agents | /agents or /dashboard/agents → Agent list visible |
| A-02 | Agent interaction | Select agent → Ask question → Agent responds in character |
| A-03 | Agent switching | Switch agents mid-conversation → No cross-contamination |

### 2.4 Investor Features

| # | Scenario | Expected Result |
|---|----------|-----------------|
| I-01 | Investor readiness score | /dashboard/investor-readiness → Score generated |
| I-02 | Investor targeting | /dashboard/investor-targeting → Matches displayed |
| I-03 | Investor lens | /dashboard/investor-lens → Analysis complete |

---

## 3. Infrastructure & Non-Functional

### 3.1 Mobile Responsiveness

| # | Page | Viewport | Check |
|---|------|----------|-------|
| M-01 | Landing page | 375×812 | Sections readable, CTAs tappable |
| M-02 | Dashboard | 375×812 | Nav accessible, cards stack |
| M-03 | Chat | 375×812 | Input accessible, keyboard doesn't cover input |
| M-04 | Onboarding | 375×812 | All steps completable |
| M-05 | Pricing | 375×812 | Tier cards readable, checkout works |

### 3.2 Performance

| # | Metric | Target | Tool |
|---|--------|--------|------|
| P-01 | LCP | < 2.5s | Lighthouse |
| P-02 | FID | < 100ms | Lighthouse |
| P-03 | CLS | < 0.1 | Lighthouse |
| P-04 | Chat first-token | < 5s | Manual |
| P-05 | Dashboard load | < 3s | Lighthouse |

### 3.3 Security

| # | Test | Expected |
|---|------|----------|
| SEC-01 | Unauthenticated /dashboard | Redirect to /login |
| SEC-02 | RLS isolation | User A cannot see User B's data |
| SEC-03 | API rate limiting | 429 after threshold |
| SEC-04 | XSS in chat input | HTML/script tags sanitized |
| SEC-05 | Direct API without auth | 401 response |

---

## 4. Test Environment

- **URL:** https://joinsahara.com (production) or Vercel preview
- **Test accounts:** Create via /get-started with test emails
- **Stripe test cards:** `4242 4242 4242 4242` (success), `4000 0000 0000 0002` (decline)
- **Automation:** Playwright (`tests/e2e/`), Maestro (`maestro/`), Vitest (`tests/`)
- **Existing e2e coverage:** signup, login, fred-chat, reality-lens, pricing-checkout, tier-gating, accessibility, mobile-responsive
