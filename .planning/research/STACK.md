# Technology Stack: Sahara v6.0

**Project:** Sahara -- AI-powered Founder OS
**Researched:** 2026-02-18
**Researcher:** Claude Opus 4.6 (automated research agent)
**Overall Confidence:** HIGH (existing stack is mature; new additions are well-documented)

---

## Current Stack (Unchanged)

These are already in production and working well. No changes recommended.

| Technology | Current Version | Purpose |
|---|---|---|
| Next.js | 16.1.1 | Full-stack framework (App Router, RSC, Turbopack) |
| React | 19.1.1 | UI library |
| TypeScript | 5.9.2 | Type safety |
| Supabase | 2.89.0 (JS) / 0.8.0 (SSR) | Auth, Postgres, pgvector, RLS, Edge Functions |
| Stripe | 20.1.0 (server) / 8.6.0 (client) | Subscriptions, checkout, webhooks |
| Vercel AI SDK | 6.0.72 | LLM streaming, structured outputs, tool calling |
| XState | 5.26.0 | FRED cognitive state machine |
| PostHog | 1.342.1 (JS) / 5.24.11 (Node) | Product analytics |
| Resend | 6.9.1 | Transactional email |
| Pino | 10.3.0 | Structured logging |
| Vercel Blob | 2.0.0 | File storage (pitch decks) |
| Recharts | 3.6.0 | Dashboard visualizations |
| Framer Motion | 12.23.13 | Animations |
| Zod | 4.3.6 | Schema validation |
| Tailwind CSS | 4.1.13 | Styling |
| Radix UI | various | Accessible component primitives |

---

## New Stack Additions for v6.0

### 1. Content Library & Video Hosting: Mux

**Recommendation:** Mux Video + Mux Player + Mux Uploader
**Confidence:** HIGH

| Package | Version | Purpose |
|---|---|---|
| `@mux/mux-node` | ^12.8.0 | Server-side API: create assets, signed URLs, webhooks |
| `@mux/mux-player-react` | ^3.11.4 | React video player with adaptive streaming |
| `@mux/mux-uploader-react` | ^1.3.0 | Drag-and-drop upload component for admin |

**Why Mux:**
- First-class Next.js + Vercel integration (available on Vercel Marketplace, one-click setup)
- Minute-based pricing is predictable. Free tier: 100K delivery minutes/month -- sufficient for early usage
- Automatic adaptive bitrate, HLS, DASH transcoding with zero config
- Signed URLs + DRM (GA since October 2025) protect paid course content behind tier gates
- Mux Data (analytics) included free when hosted on Mux -- track completion rates, rebuffering, engagement
- Content protection: signed JWTs (generated server-side with `jose`, already in the stack) gate playback by user tier

**Pricing impact:**
- Encoding: ~$0.024/min after free tier
- Storage: ~$0.005/min/month (60% discount for cold storage on older courses)
- Delivery: ~$0.003-$0.012/min depending on resolution
- For a library of ~50 lessons (avg 10 min each) with ~500 views/month: **under $30/month**

**Integration with existing stack:**
- Supabase stores course metadata, progress tracking, lesson ordering (Postgres tables with RLS)
- Mux signed URLs generated via `jose` (already a dependency) server-side in API routes
- Stripe tier check gates access: Free = previews only, Pro = core courses, Studio = all + playbooks
- PostHog tracks lesson starts, completions, drop-off points

**What NOT to use:**
- `next-video` / `@mux/next-video` -- Last published 2+ years ago (v0.5.0). Use `@mux/mux-player-react` directly instead. `next-video` was a convenience wrapper that hasn't kept pace with Next.js 16.
- Cloudflare Stream -- Cheaper per-GB, but Mux's Vercel integration, signed URL DRM, and built-in analytics win for a SaaS course platform. Cloudflare would require more custom work.
- Bunny Stream -- Cheapest option, but no React components, no built-in analytics, no DRM. Wrong tradeoff for a premium product.
- Vercel Blob for video -- 4.5MB serverless function body limit makes server-side uploads painful. Mux handles transcoding/CDN natively.
- YouTube/Vimeo embeds -- No access control, no analytics integration, branding conflicts.

**CSP update required:** Add `https://*.mux.com https://stream.mux.com` to `connect-src` and `https://stream.mux.com` to `media-src` in `next.config.mjs`.

---

### 2. Service Marketplace Payments: Stripe Connect

**Recommendation:** Stripe Connect (Express accounts) with existing Stripe SDK
**Confidence:** HIGH

| Package | Version | Purpose |
|---|---|---|
| `stripe` | ^20.1.0 (already installed) | Server SDK -- Connect API, transfers, payouts |
| `@stripe/stripe-js` | ^8.6.0 (already installed) | Client SDK -- onboarding redirects |

**No new packages needed.** Stripe Connect is part of the core Stripe SDK already in the project.

**Why Stripe Connect Express:**
- Already using Stripe for subscriptions -- Connect is an extension, not a new vendor
- Express accounts minimize compliance burden: Stripe handles provider KYC/identity verification
- Platform fee collection via `application_fee_amount` on PaymentIntents
- Providers get a Stripe-hosted dashboard for earnings/payouts (no custom payout UI needed in v6.0)
- Destination charges: customer sees "Sahara" on their statement, Stripe splits to provider automatically

**Implementation architecture:**
- New Supabase tables: `service_providers`, `services`, `bookings`, `reviews`
- Provider onboarding: Create Express account via API, redirect to Stripe-hosted onboarding, store `stripe_account_id` in Supabase
- Booking flow: Create PaymentIntent with `application_fee_amount` (e.g., 15% platform fee) and `transfer_data.destination` set to provider's Connect account
- Webhooks: Extend existing `/api/stripe/webhook` route to handle `account.updated`, `payment_intent.succeeded` for Connect events

**Revenue model:**
- Platform takes 15% of each transaction via `application_fee_amount`
- Standard Stripe fees (2.9% + $0.30) apply, paid by customer
- Monthly Stripe fee for Connect: $0 (no additional cost beyond standard processing)

**What NOT to use:**
- Custom accounts -- Overkill. Requires building full dashboard, payout UI, and handling compliance. Express handles this.
- Standard accounts -- Providers manage their own Stripe; less control over the experience.
- PayPal Commerce Platform -- Adding a second payment processor adds complexity. Stripe Connect handles everything.
- Manual payouts via bank transfer -- Compliance nightmare. Let Stripe handle it.

---

### 3. Booking & Scheduling

**Recommendation:** Custom Supabase-native booking system (not Cal.com)
**Confidence:** MEDIUM

**Why custom over Cal.com:**
- Cal.com embed adds external dependency, styling conflicts, and another vendor
- Sahara's booking needs are simple: provider sets availability windows, founder picks a slot
- Supabase handles this natively with a `provider_availability` table + RLS
- Keeps UX consistent -- no iframe/embed styling mismatches
- Avoids Cal.com pricing ($15/user/month for providers = cost multiplier)

**Implementation pattern:**
```
Tables:
- provider_availability (provider_id, day_of_week, start_time, end_time)
- bookings (id, service_id, founder_id, provider_id, start_at, end_at, status, stripe_payment_intent_id)
- booking_messages (id, booking_id, sender_id, content, created_at)
```

**When to reconsider:** If v6.0 scope demands Google Calendar sync, timezone-aware rescheduling, or video call auto-creation, then Cal.com Platform ($99/mo) becomes worth it. For MVP marketplace, custom is cleaner.

---

### 4. Sentry Error Tracking (Production Monitoring)

**Recommendation:** Upgrade existing `@sentry/nextjs` setup to production-ready
**Confidence:** HIGH

| Package | Version | Purpose |
|---|---|---|
| `@sentry/nextjs` | ^10.38.0 (already installed) | Error tracking, performance, session replay |

**Current state:** Sentry is already configured with:
- `sentry.client.config.ts` -- Session replay on error (1.0 rate), 0.1 traces sample rate
- `sentry.server.config.ts` -- 0.1 traces sample rate
- `next.config.mjs` -- `withSentryConfig` wrapping, source maps with `hideSourceMaps: true`, tunnel route at `/monitoring-tunnel`

**What needs to happen for production:**
1. **Create Sentry project** at sentry.io and set `NEXT_PUBLIC_SENTRY_DSN` in Vercel env vars
2. **Set `SENTRY_AUTH_TOKEN`** in CI for source map uploads (auto-uploads with Turbopack in Next.js 16)
3. **Create `sentry.edge.config.ts`** -- Currently missing. Edge runtime routes (middleware, edge API routes) won't report errors without it
4. **Vercel integration** -- Install from Vercel Marketplace for automatic release tracking
5. **Alert rules** -- Configure Slack alerts for P0 errors (500s, auth failures)
6. **Tune sampling** -- Production: `tracesSampleRate: 0.05` (5%) to manage costs, `replaysOnErrorSampleRate: 1.0` (keep -- invaluable for debugging)

**Pricing:**
- Team plan: $29/month (50K errors, 100K transactions included)
- Sufficient for Sahara's current scale. Overages: $0.000290/error
- Session Replay: included in Team plan

**What NOT to change:**
- The `beforeSend` filter for ResizeObserver/AbortError noise is correct -- keep it
- The `/monitoring-tunnel` route bypasses ad blockers -- keep it
- `hideSourceMaps: true` prevents leaking source to browser -- keep it

**New env vars:**
```
NEXT_PUBLIC_SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
SENTRY_AUTH_TOKEN=sntrys_xxx
SENTRY_ORG=sahara
SENTRY_PROJECT=sahara-web
```

---

### 5. LiveKit Voice Agent Hardening

**Recommendation:** Upgrade to latest LiveKit agents SDK, add recording and production reliability
**Confidence:** HIGH

| Package | Version | Purpose |
|---|---|---|
| `@livekit/agents` | ^1.0.43 (already installed) | Agent framework -- defineAgent, cli |
| `@livekit/agents-plugin-openai` | ^1.0.43 (already installed) | STT (Whisper), LLM (GPT-4o), TTS |
| `livekit-client` | ^2.16.1 (already installed) | Browser client SDK |
| `livekit-server-sdk` | ^2.15.0 (already installed) | Token generation, room management |
| `@livekit/components-react` | ^2.9.17 (already installed) | React UI components (AudioVisualizer, etc.) |

**No new packages needed.** All LiveKit packages are already installed and functional.

**What needs hardening:**
1. **LiveKit Cloud production project** -- Separate project from dev (different API keys). Recommended: "Ship" plan ($50/mo, 5K agent minutes)
2. **Egress (recording)** -- Use LiveKit's Egress API (part of `livekit-server-sdk`) to record calls as audio files. Store in Vercel Blob or Supabase Storage. No new packages needed.
3. **Graceful reconnection** -- The current agent handles shutdown (`addShutdownCallback`) but needs client-side reconnection logic for network drops. LiveKit client SDK has built-in `reconnecting`/`reconnected` events.
4. **Call duration limits** -- Add server-side room timeout (30 min default for Studio tier) via LiveKit Cloud room settings or agent-side timer
5. **Transcript persistence** -- Current agent publishes transcripts via data channel but doesn't persist. Add Supabase insert in the `publishTranscript` function.
6. **Monitoring** -- LiveKit Cloud provides built-in analytics dashboard. Also forward errors to Sentry.

**Deployment:**
- Current: Docker + Railway (Dockerfile exists, `railway.json` configured)
- Recommended: Continue with Railway for agent worker. LiveKit agents use WebSocket (outbound only) -- no public ports needed
- Alternative: LiveKit Cloud's managed agent hosting (deploy via `lkcloud` CLI) -- simpler but less control

**Pricing:**
- LiveKit Cloud "Ship": $50/month (5,000 agent minutes)
- Additional minutes: $0.01/min
- Estimated cost for ~100 Studio users with 2 calls/month (15 min avg): 3,000 min = within Ship plan

---

### 6. Twilio SMS Production Activation

**Recommendation:** Activate existing Twilio setup with A2P 10DLC registration
**Confidence:** HIGH

| Package | Version | Purpose |
|---|---|---|
| `twilio` | ^5.12.1 (already installed) | SMS API client |

**No new packages needed.** Twilio client is installed and configured.

**What needs to happen:**
1. **Upgrade Twilio account** from trial to paid (trial accounts cannot register for A2P 10DLC)
2. **A2P 10DLC registration** (MANDATORY for US SMS in 2026):
   - Register brand (Sahara / company entity) -- Standard brand type
   - Register campaign (type: "Account Notification" for check-in reminders)
   - Campaign review takes 10-15 business days
   - Required: opt-in/opt-out language on signup, HELP/STOP keyword support
3. **Buy phone number** -- One 10DLC number for weekly check-ins
4. **Business Registration Number (BRN)** -- Required as of January 2026 for toll-free verification

**Pricing:**
- Phone number: $1.15/month
- Outbound SMS: $0.0079/segment
- A2P 10DLC registration: one-time $4 brand + $15 campaign
- For 200 Studio users, 4 SMS/month each: ~800 msgs/month = ~$6.32/month

**Compliance requirements:**
- Opt-in checkbox during onboarding
- "Reply STOP to unsubscribe" in every message
- "Reply HELP for help" support
- Terms of Service mentioning SMS communication

---

### 7. Boardy API Integration

**Recommendation:** Direct REST API integration (no SDK available)
**Confidence:** LOW

**Current state of Boardy API:**
- Boardy (boardy.ai) is a voice-AI networking platform connecting founders with investors
- They have a partner page (`/partners`) but NO public API documentation
- Internal API endpoint discovered: `https://api.boardy.ai/user/upsert-and-call-public`
- No npm SDK, no webhook docs, no developer portal

**What this means:**
- Integration requires a partnership agreement with Boardy directly
- Likely a custom API integration negotiated between Sahara and Boardy teams
- Cannot implement without access to partner API docs and credentials

**Recommended approach:**
1. Contact Boardy partnership team to negotiate API access
2. Until API access is confirmed, maintain current mock client
3. Design the integration layer with an abstraction so the mock can swap for real API cleanly
4. Expect: webhook-based intro notifications, REST API for profile submission

**Risk:** This is the highest-risk integration in v6.0. If Boardy partnership doesn't materialize, the mock client + manual process fallback is needed.

---

### 8. CI/CD & Testing Expansion

**Recommendation:** Expand existing Playwright + GitHub Actions setup
**Confidence:** HIGH

| Package | Version | Purpose |
|---|---|---|
| `@playwright/test` | ^1.58.2 (already installed) | E2E + visual regression testing |

**No new testing packages needed.** Playwright supports visual regression natively.

**Current state:**
- `playwright.config.ts` -- 3 browser projects (Chromium, Firefox, WebKit), HTML reporter
- `.github/workflows/deploy.yml` -- Build + security + deploy pipeline exists
- Missing: E2E tests in CI, visual regression baselines, staging environment

**Recommended CI/CD improvements:**

**A. Add Playwright to CI pipeline:**
```yaml
# New job in deploy.yml
e2e:
  runs-on: ubuntu-latest
  needs: build
  container:
    image: mcr.microsoft.com/playwright:v1.58.2-noble
  steps:
    - uses: actions/checkout@v4
    - run: npm ci
    - run: npx playwright test
    - uses: actions/upload-artifact@v4
      if: failure()
      with:
        name: playwright-report
        path: playwright-report/
```

**B. Visual regression testing:**
- Use Playwright's built-in `toHaveScreenshot()` -- no external service needed
- Generate baselines in CI (Linux), never locally (cross-platform diffs)
- Set `animations: 'disabled'` in screenshots
- Store baselines in git alongside tests
- Mask dynamic content (timestamps, avatars) with `mask` option

**C. Staging environment:**
- Vercel Preview Deployments already exist for PRs
- Add explicit `staging` branch with Vercel environment variables
- Current deploy.yml already handles `staging` branch -- just needs Vercel staging env vars configured

**D. Upgrade Node.js in CI:**
- Current: `NODE_VERSION: '20'`
- Recommend: `NODE_VERSION: '22'` to match Docker base image (`node:22-slim` in voice worker) and get LTS support through 2027

**What NOT to add:**
- Chromatic/Percy/Applitools for visual regression -- Playwright's built-in visual comparison is sufficient for a team this size. External services add cost ($149+/month) without proportional value until the team scales.
- Cypress -- Playwright is already set up and covers the same ground. No reason to switch.
- Jest -- Vitest is already configured and working. Don't duplicate test runners.

---

### 9. Dashboard Analytics Enhancement

**Recommendation:** Expand PostHog + Recharts (both already installed)
**Confidence:** HIGH

| Package | Version | Purpose |
|---|---|---|
| `posthog-js` | ^1.342.1 (already installed) | Client analytics |
| `posthog-node` | ^5.24.11 (already installed) | Server analytics |
| `recharts` | ^3.6.0 (already installed) | Chart components |

**No new packages needed.**

**Enhancements:**
- **PostHog HogQL** -- Query engagement metrics (session duration, feature usage, retention) via PostHog's SQL dialect, surface in dashboard
- **PostHog API** -- Fetch trend/funnel data server-side and render with Recharts for custom dashboards
- **Custom events** -- Track founder milestones (pitch deck uploaded, first check-in, investor match requested) as PostHog events for engagement scoring
- **Cohort analysis** -- Free vs Pro vs Studio user behavior comparison using PostHog groups

**What NOT to add:**
- Mixpanel/Amplitude -- PostHog already does this. Adding another analytics vendor fragments data.
- Custom analytics backend -- PostHog's warehouse + HogQL is sufficient for the analytics v6.0 needs.

---

### 10. Mobile/UX Polish: PWA + Accessibility

**Recommendation:** next-pwa + existing tooling
**Confidence:** MEDIUM

| Package | Version | Purpose |
|---|---|---|
| `@serwist/next` | ^9.0.0 | Service worker + PWA support for Next.js (successor to next-pwa) |
| `serwist` | ^9.0.0 | Workbox-based service worker toolkit |

**Why @serwist/next over next-pwa:**
- `next-pwa` is unmaintained (last release 2023)
- `@serwist/next` is the actively maintained fork, built for Next.js 14+/15+/16+ and App Router
- Handles service worker generation, caching strategies, offline support
- Compatible with Turbopack builds

**PWA essentials:**
- `manifest.json` -- App name, icons, theme color, display: standalone
- Service worker -- Cache static assets, API responses for offline dashboard
- `web-push` ^3.6.7 (already installed) -- Push notifications for check-in reminders

**Accessibility (no new packages):**
- Radix UI components (already used extensively) are WCAG 2.1 AA compliant by default
- Add Playwright accessibility testing with `@axe-core/playwright` for automated WCAG checks in CI

| Package | Version | Purpose |
|---|---|---|
| `@axe-core/playwright` | ^4.10.0 | Automated accessibility testing in E2E |

---

### 11. FRED Intelligence Upgrade

**Recommendation:** Leverage existing Vercel AI SDK + XState (no new packages)
**Confidence:** HIGH

| Package | Version | Purpose |
|---|---|---|
| `ai` | ^6.0.72 (already installed) | Vercel AI SDK -- streaming, tools, structured output |
| `xstate` | ^5.26.0 (already installed) | FRED cognitive state machine |
| `@xstate/react` | ^6.0.0 (already installed) | React hooks for XState |

**Enhancements (zero new dependencies):**
- **Mode switching** -- XState already manages FRED modes. Add new states for "teaching" (course recommendations), "matching" (marketplace suggestions), "coaching" (voice call prep)
- **Memory** -- Use Supabase `pgvector` (already configured) for long-term conversation memory. Store embeddings of past conversations, retrieve relevant context via similarity search
- **Tool calling** -- Vercel AI SDK v6 supports tool calling natively. Add tools for: `lookup_course`, `find_provider`, `check_calendar`, `schedule_booking`
- **Structured outputs** -- Use `generateObject()` with Zod schemas for structured FRED responses (action items, recommendations)

---

## Full Installation Command (New Packages Only)

```bash
# Production dependencies
npm install @mux/mux-node@^12.8.0 @mux/mux-player-react@^3.11.4 @mux/mux-uploader-react@^1.3.0 @serwist/next@^9.0.0 serwist@^9.0.0

# Dev dependencies
npm install -D @axe-core/playwright@^4.10.0
```

**Total new packages: 6** (3 Mux, 2 Serwist/PWA, 1 a11y testing)
Everything else is already in the project.

---

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|---|---|---|---|
| Video hosting | Mux | Cloudflare Stream | No React components, no DRM, no built-in analytics, weaker Vercel integration |
| Video hosting | Mux | Bunny Stream | Cheapest but no DRM, no React player, no analytics. Wrong for premium SaaS. |
| Video hosting | Mux | Vercel Blob + custom player | 4.5MB upload limit, no transcoding, no adaptive streaming, no DRM |
| Marketplace payments | Stripe Connect Express | PayPal Commerce | Second payment processor = fragmented revenue, more code, more compliance |
| Marketplace payments | Stripe Connect Express | Stripe Connect Custom | Requires building full payout dashboard. Overkill for v6.0 MVP. |
| Booking | Custom Supabase | Cal.com embed | External dependency, $15/user/month, styling conflicts, overkill for simple availability slots |
| Booking | Custom Supabase | Calendly embed | No API control, branding conflicts, can't gate by tier |
| Error monitoring | Sentry | Datadog | Sentry is already configured. Datadog costs 3-5x more for equivalent features. |
| Error monitoring | Sentry | LogRocket | Sentry already has session replay. LogRocket duplicates it at higher cost. |
| Visual regression | Playwright built-in | Chromatic | $149+/month for a small team. Playwright's `toHaveScreenshot()` is free and sufficient. |
| Visual regression | Playwright built-in | Percy (BrowserStack) | Same cost concern. Overkill until team scales. |
| PWA | @serwist/next | next-pwa | next-pwa unmaintained since 2023. Serwist is the maintained fork. |
| Analytics | PostHog (existing) | Mixpanel | Already have PostHog. Adding Mixpanel fragments analytics data. |
| Boardy integration | REST API (when available) | Build custom matching | Boardy's network effect is the value. Custom matching can't replicate their investor network. |

---

## Service Cost Summary (Monthly Estimates)

| Service | Plan | Est. Monthly Cost | Notes |
|---|---|---|---|
| Mux Video | Pay-as-you-go | $0-30 | Free tier covers 100K delivery min. Scales with content library size. |
| Sentry | Team | $29 | 50K errors, unlimited users, session replay |
| LiveKit Cloud | Ship | $50 | 5K agent minutes for voice calls |
| Twilio | Pay-as-you-go | $8 | Phone number + SMS volume for ~200 users |
| Stripe Connect | Standard processing | 0 (% of transactions) | 2.9% + $0.30 per transaction, no monthly fee |
| PostHog | Free tier | $0 | 1M events/month free. Upgrade to Scale ($0/mo + usage) when needed. |
| Vercel | Pro | (already paying) | No additional cost for staging environment |

**Estimated v6.0 infrastructure addition: ~$87-117/month** on top of existing costs.

---

## Environment Variables (New)

```bash
# Mux Video
MUX_TOKEN_ID=xxx
MUX_TOKEN_SECRET=xxx
MUX_SIGNING_KEY_ID=xxx           # For signed playback URLs
MUX_SIGNING_KEY_PRIVATE=xxx      # Base64-encoded private key
MUX_WEBHOOK_SECRET=xxx

# Sentry (activate existing config)
NEXT_PUBLIC_SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
SENTRY_AUTH_TOKEN=sntrys_xxx
SENTRY_ORG=sahara
SENTRY_PROJECT=sahara-web

# Stripe Connect (extend existing Stripe)
# No new env vars -- uses existing STRIPE_SECRET_KEY
# Connect onboarding returns stripe_account_id stored in Supabase

# Twilio (activate existing config)
TWILIO_ACCOUNT_SID=xxx           # May already exist
TWILIO_AUTH_TOKEN=xxx             # May already exist
TWILIO_PHONE_NUMBER=+1xxx        # 10DLC registered number

# Boardy (when available)
BOARDY_API_KEY=xxx               # Pending partnership
BOARDY_WEBHOOK_SECRET=xxx        # Pending partnership

# LiveKit (separate production keys)
LIVEKIT_URL=wss://sahara-prod.livekit.cloud
LIVEKIT_API_KEY=xxx              # Production project key
LIVEKIT_API_SECRET=xxx           # Production project secret
```

---

## CSP (Content Security Policy) Updates

The existing CSP in `next.config.mjs` needs these additions:

```javascript
// connect-src additions:
"https://api.mux.com",
"https://*.mux.com",
"https://api.boardy.ai",  // when Boardy integration is live

// media-src (new directive):
"media-src 'self' https://stream.mux.com https://*.mux.com blob:",

// frame-src additions:
"https://connect.stripe.com",  // For Connect onboarding
```

---

## Database Schema Additions (Supabase)

New tables needed for v6.0 capabilities:

```sql
-- Content Library
courses, lessons, lesson_progress, learning_paths, learning_path_items

-- Service Marketplace
service_providers, service_categories, services, provider_availability,
bookings, reviews, provider_stripe_accounts

-- Voice Agent Persistence
voice_sessions, voice_transcripts

-- Boardy Integration (when available)
boardy_profiles, boardy_intros
```

All tables should use RLS policies gated on `auth.uid()` matching the user's row or admin role.

---

## Confidence Assessment

| Area | Confidence | Reasoning |
|---|---|---|
| Mux Video | HIGH | Verified via npm, official docs, Vercel Marketplace. Pricing and DRM confirmed. |
| Stripe Connect | HIGH | Already using Stripe. Connect is core API surface, extensively documented. |
| Sentry | HIGH | Already installed and configured. Just needs activation (env vars + edge config). |
| LiveKit hardening | HIGH | Already functional. Hardening is incremental (recording, reconnection, persistence). |
| Twilio SMS | HIGH | Package installed. A2P 10DLC requirements verified via official Twilio docs. |
| CI/CD expansion | HIGH | Playwright already configured. GitHub Actions workflow exists. Incremental additions. |
| PWA (@serwist/next) | MEDIUM | Serwist is the maintained next-pwa successor, but verify Next.js 16 compatibility before adopting. |
| Boardy API | LOW | No public API documentation found. Integration depends entirely on partnership negotiation. |
| Custom booking system | MEDIUM | Architecture is sound, but complexity may be underestimated. Cal.com is the fallback. |

---

## Sources

**Mux:**
- [Mux Next.js Integration](https://www.mux.com/docs/integrations/next-js)
- [Mux Pricing](https://www.mux.com/pricing)
- [Mux DRM (GA)](https://www.mux.com/blog/protect-your-video-content-with-drm-now-ga)
- [Mux Signed URLs](https://www.mux.com/articles/securing-video-playback-with-signed-urls)
- [@mux/mux-player-react npm](https://www.npmjs.com/package/@mux/mux-player-react) -- v3.11.4
- [@mux/mux-node npm](https://www.npmjs.com/package/@mux/mux-node) -- v12.8.0

**Stripe Connect:**
- [Stripe Connect Marketplace Guide](https://docs.stripe.com/connect/marketplace)
- [Stripe Connect Pricing](https://stripe.com/connect)

**Sentry:**
- [Sentry Next.js Guide](https://docs.sentry.io/platforms/javascript/guides/nextjs/)
- [Sentry Source Maps with Turbopack](https://docs.sentry.io/platforms/javascript/guides/nextjs/sourcemaps/)
- [Sentry Pricing](https://sentry.io/pricing/) -- Team plan $29/mo
- [@sentry/nextjs npm](https://www.npmjs.com/package/@sentry/nextjs) -- v10.38.0+

**LiveKit:**
- [LiveKit Agents JS](https://github.com/livekit/agents-js)
- [LiveKit Cloud Pricing](https://livekit.io/pricing) -- Ship $50/mo
- [LiveKit Production Deployment](https://docs.livekit.io/agents/ops/deployment/)
- [@livekit/agents npm](https://www.npmjs.com/package/@livekit/agents) -- v1.0.32+

**Twilio:**
- [A2P 10DLC Registration](https://www.twilio.com/docs/messaging/compliance/a2p-10dlc)
- [10DLC Quickstart](https://www.twilio.com/docs/messaging/compliance/a2p-10dlc/quickstart)

**Playwright:**
- [Playwright Visual Comparisons](https://playwright.dev/docs/test-snapshots)
- [Playwright CI Setup](https://playwright.dev/docs/ci-intro)
- [Playwright Best Practices 2026](https://www.browserstack.com/guide/playwright-best-practices)

**Boardy:**
- [Boardy.ai](https://www.boardy.ai/) -- No public API docs found as of 2026-02-18

---

*Stack research completed 2026-02-18. Total new npm packages: 6. Estimated monthly infrastructure cost increase: ~$87-117.*
