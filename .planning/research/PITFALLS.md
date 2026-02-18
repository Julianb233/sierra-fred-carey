# Domain Pitfalls: Sahara v6.0

**Domain:** AI-Powered Founder OS -- Content Library, Service Marketplace, Boardy Integration, Infrastructure Hardening
**Researched:** 2026-02-18
**Overall confidence:** HIGH (verified against codebase state, official docs, and audit reports)

---

## Executive Summary

Sahara v6.0 adds seven distinct capability areas to a mature platform (210 pages, 774/778 tests passing). Each area carries domain-specific pitfalls that compound when integrated simultaneously. The highest-risk areas are:

1. **Sentry activation** -- The code is already wired (`withSentryConfig`, `sentry.client.config.ts`, `sentry.server.config.ts`, `lib/sentry.ts`) but the DSN is not set. Turning it on seems simple but has hidden build-time and runtime traps.
2. **Twilio A2P 10DLC** -- 4-week registration timeline that must start before SMS code is written. Registration rejections are common and require specific website/privacy-policy preparation.
3. **LiveKit voice hardening** -- Three audits (API, UI, Worker) found 2 CRITICAL, 5 HIGH, and 10 MEDIUM issues. The voice feature is structurally correct but not production-ready.
4. **Stripe Connect for marketplace** -- Adding two-sided payments to an existing Stripe subscription setup requires careful account architecture to avoid breaking current billing.
5. **Content library video hosting** -- Video hosting choice (Mux vs Cloudflare Stream vs YouTube embeds) has major cost and DX implications that are hard to reverse.

---

## Critical Pitfalls

Mistakes that cause rewrites, major delays, or production failures.

---

### Pitfall 1: Sentry DSN Activation Breaks Production Build

**What goes wrong:** The Sentry integration code exists but is currently inert (DSN not set). Setting the DSN without also providing `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, and `SENTRY_PROJECT` in the CI environment causes the production build to fail or produce builds with unresolvable source maps. The `withSentryConfig` wrapper in `next.config.mjs` (line 71) runs during `npm run build` and attempts to upload source maps. Without the auth token, the build either fails silently (source maps not uploaded, errors appear minified) or fails loudly (blocking deployment).

**Why it happens:** The existing code has a conditional guard (`process.env.NEXT_PUBLIC_SENTRY_DSN ? withSentryConfig(...) : nextConfig`) that makes it seem safe to "just add the DSN." But the build-time source map upload requires _additional_ env vars (`SENTRY_AUTH_TOKEN`) that are not runtime vars -- they must exist in the CI/CD build environment, not just Vercel runtime.

**Warning signs:**
- Sentry dashboard shows errors with minified stack traces (no source maps)
- Build takes significantly longer after adding DSN (source map upload happening)
- Vercel build logs show Sentry upload warnings/errors
- `SENTRY_AUTH_TOKEN` added to `.env.local` but not to GitHub Secrets or Vercel Build Environment

**Consequences:**
- Minified error reports that are useless for debugging (defeats the purpose)
- Build failures if auth token is wrong or expired
- Source maps accidentally shipped to browser if `hideSourceMaps: true` is not working
- Build time increases by 30-60 seconds per deployment

**Prevention:**
1. Set ALL four Sentry env vars simultaneously: `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN`
2. Add `SENTRY_AUTH_TOKEN` to both Vercel Build Environment AND GitHub Actions secrets
3. Verify source maps upload by checking Sentry dashboard "Source Maps" section after first build
4. Test that `hideSourceMaps: true` in `next.config.mjs` (line 76) actually removes `.map` files from the production bundle
5. Verify the `tunnelRoute: "/monitoring-tunnel"` (line 78) works -- it proxies Sentry events through your domain to avoid ad blockers, but must be tested

**Detection:** After enabling, trigger a test error. If the stack trace is minified in Sentry, source maps failed. If events never arrive, the DSN or tunnel route is wrong.

**Severity:** CRITICAL -- Defeats the entire purpose of adding monitoring if stack traces are unreadable.

**Phase to address:** Infrastructure Hardening (first phase of v6.0)

**Confidence:** HIGH -- Verified against existing codebase (`next.config.mjs`, `sentry.client.config.ts`, `sentry.server.config.ts`), [Sentry Next.js Manual Setup docs](https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/), and [source map troubleshooting](https://docs.sentry.io/platforms/javascript/guides/nextjs/sourcemaps/troubleshooting_js/).

---

### Pitfall 2: Twilio A2P 10DLC Registration Blocks SMS Launch by 4+ Weeks

**What goes wrong:** Teams build the SMS check-in feature, set the Twilio env vars (`TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_MESSAGING_SERVICE_SID`), and discover they cannot send messages at scale because A2P 10DLC registration has not been completed. Unregistered traffic faces carrier filtering, per-message surcharges, and eventual blocking.

**Why it happens:** SMS appears simple -- "just call the Twilio API." But US carriers require brand registration and campaign registration for Application-to-Person (A2P) traffic. This process takes 2-4 weeks minimum, with common rejections adding another 1-2 weeks.

**Warning signs:**
- SMS features planned without mentioning 10DLC in timeline
- No privacy policy language about mobile information sharing
- Website has placeholder content or is under construction
- No documented opt-in/opt-out flow for SMS
- Testing with personal phone numbers only (bypasses carrier filtering)

**Consequences:**
- 4-6 week delay to SMS feature launch
- Messages blocked or filtered by carriers (users think feature is broken)
- Carrier surcharges of $0.003-0.005 per unregistered message
- Registration rejection requiring re-submission with corrected information
- If rejected, Twilio may require a "secondary vetting" which adds $40 fee and more time

**Prevention:**
1. Start A2P 10DLC registration IMMEDIATELY -- before writing a single line of SMS code
2. Register the brand first (requires: business name, EIN/Tax ID, business address, website URL)
3. Ensure the website has:
   - Active content (not "coming soon")
   - Privacy policy explicitly stating "mobile information will never be shared or sold to third parties"
   - Terms of service
   - Clear description of SMS messaging purpose
4. Prepare campaign registration with:
   - Use case: "Accountability check-ins for startup founders" (be specific)
   - Sample messages (2-3 examples of actual check-in texts)
   - Opt-in flow description (how users consent to receive texts)
   - Opt-out keywords (STOP, CANCEL, UNSUBSCRIBE)
5. Budget 4 weeks for approval in the v6.0 timeline
6. Build SMS features in parallel with registration, using test phone numbers

**Detection:** Check Twilio Console > Messaging > Regulatory Compliance. If brand status is not "Approved" and campaign status is not "Active," SMS will be filtered.

**Severity:** CRITICAL -- Timeline blocker that cannot be accelerated. Must start immediately.

**Phase to address:** Start registration in the first week of v6.0; build SMS features in parallel.

**Confidence:** HIGH -- Verified via [Twilio A2P 10DLC Campaign Approval Requirements](https://help.twilio.com/articles/11847054539547-A2P-10DLC-Campaign-Approval-Requirements), [Twilio A2P Rejection Reasons](https://help.twilio.com/articles/15778026827291-Why-Was-My-A2P-10DLC-Campaign-Registration-Rejected-), and [Improving Approval Chances](https://www.twilio.com/en-us/blog/insights/best-practices/improving-your-chances-of-a2p10dlc-registration-approval).

---

### Pitfall 3: LiveKit Voice Call -- Users Hear Nothing (CRITICAL Audio Playback Bug)

**What goes wrong:** The CallFredModal component (`components/dashboard/call-fred-modal.tsx`) connects to LiveKit, enables the local microphone, but has NO code to handle the remote participant's (Fred agent's) audio track. The component does not listen for `RoomEvent.TrackSubscribed`, does not create `<audio>` elements, and does not handle browser autoplay policy. Users connect to calls and hear complete silence from Fred.

**Why it happens:** The modal uses the raw `livekit-client` SDK instead of the higher-level `@livekit/components-react` (which handles audio automatically). Manual Room management requires explicit audio track handling that was not implemented.

**Warning signs:**
- Call connects (UI shows "in-call") but no audio from Fred
- Mobile browsers particularly affected (stricter autoplay policies)
- Agent greeting from `session.say()` never heard
- Transcript entries appear but no audio accompanies them

**Consequences:**
- Voice call feature is **non-functional** for all users in many browsers
- Users pay for Pro tier feature that does not work
- Trust collapse -- "I tried to call Fred and nothing happened"
- Support tickets flood in

**Prevention:**
1. Add `RoomEvent.TrackSubscribed` handler that attaches remote audio tracks:
   ```typescript
   room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
     if (track.kind === Track.Kind.Audio) {
       const audioElement = track.attach();
       document.body.appendChild(audioElement);
     }
   });
   ```
2. Add `RoomEvent.TrackUnsubscribed` handler to clean up detached elements
3. Handle `RoomEvent.AudioPlaybackStatusChanged` for autoplay policy
4. Add `RoomEvent.Disconnected` handler (currently missing -- Finding #4 from UI audit)
5. Add agent join timeout (no verification agent actually joined -- Finding #2)
6. **Or better:** Refactor to use `@livekit/components-react` with `<LiveKitRoom>` which handles all of this automatically

**Detection:** Test a voice call in Chrome, Safari, and Mobile Safari. If Fred's voice is not heard, this bug is present.

**Severity:** CRITICAL -- Feature-breaking bug already documented in VOICE-UI-AUDIT.md Finding #1.

**Phase to address:** Voice Call Hardening (must be first phase of voice work).

**Confidence:** HIGH -- Verified against `components/dashboard/call-fred-modal.tsx` source code and LiveKit SDK documentation. Documented as CRITICAL in `.planning/VOICE-UI-AUDIT.md`.

---

### Pitfall 4: Voice Agent Worker Docker Container Cannot Start

**What goes wrong:** The voice agent Dockerfile (`workers/voice-agent/Dockerfile`) runs `npm ci --omit=dev` which skips dev dependencies, but the CMD uses `npx tsx` which is a dev dependency. The container crashes immediately on startup.

**Why it happens:** `tsx` is listed under `devDependencies` in `package.json`. The `--omit=dev` flag is correct for production builds of the Next.js app but breaks the voice agent worker which relies on `tsx` for TypeScript execution.

**Warning signs:**
- Voice agent container exits immediately with non-zero code
- No voice agent available to join call rooms
- LiveKit dispatch returns success but agent never connects
- Users sit in empty rooms waiting for Fred

**Consequences:**
- Voice call feature entirely non-functional in Docker/Railway deployment
- Cascading failure: call room created, user connected, but agent never joins
- No audio, no transcript, no summary -- complete feature failure

**Prevention:**
1. Either move `tsx` to `dependencies` in `package.json`, or
2. Pre-compile TypeScript in the Dockerfile and run with `node`:
   ```dockerfile
   RUN npx tsc -p workers/voice-agent/tsconfig.json
   CMD ["node", "workers/voice-agent/dist/index.js", "start"]
   ```
3. Also fix tsconfig.json `include` array (references `lib/voice-agent.ts` and `lib/agents/fred-agent-voice.ts` which are not copied into the Docker image)
4. Test Docker build and runtime in CI before deploying

**Detection:** Run `docker build -t fred-voice . && docker run fred-voice` -- container will crash on startup if `tsx` is not available.

**Severity:** CRITICAL -- Deployment blocker for voice agent. Documented as H-3 in `.planning/VOICE-WORKER-AUDIT.md`.

**Phase to address:** Voice Call Hardening (immediate fix before any voice deployment).

**Confidence:** HIGH -- Verified against `workers/voice-agent/Dockerfile`, `package.json` devDependencies, and Dockerfile CMD.

---

### Pitfall 5: Room Name Format Breaks All Voice Call Tracking

**What goes wrong:** The `fred/call` route creates room names as `fred-call_${userId}_${Date.now()}` (prefix first), but the LiveKit webhook handler's `extractUserIdFromRoom()` expects `${userId}_...` (userId first). The function splits on the first underscore and gets `fred-call` instead of the userId. Result: `host_user_id` is always `null`, coaching sessions are never created, call duration tracking is broken.

**Why it happens:** Two different developers wrote the call route and the webhook handler, and the room name format convention was not documented.

**Warning signs:**
- `video_rooms.host_user_id` column is always NULL for voice call rooms
- `coaching_sessions` table has no voice call entries
- Users have no record of their voice coaching sessions
- Dashboard "recent calls" section is empty

**Consequences:**
- Complete loss of call history for all users
- No coaching session records for billing/analytics
- Impossible to generate post-call summaries tied to user accounts
- Silent data loss -- no error thrown, just null values

**Prevention:**
1. Change room name format to `${userId}_fred-call_${Date.now()}` so userId comes first
2. Add integration test that verifies webhook correctly extracts userId from room name
3. Document room name format convention in a shared constants file

**Detection:** After any voice call, query `SELECT host_user_id FROM video_rooms WHERE room_name LIKE '%fred-call%'`. If all values are NULL, this bug is present.

**Severity:** CRITICAL -- Silent data loss. Documented as HIGH in `.planning/VOICE-API-AUDIT.md` Findings #1 and #2.

**Phase to address:** Voice Call Hardening.

**Confidence:** HIGH -- Verified against `app/api/fred/call/route.ts` line 84 and `app/api/livekit/webhook/route.ts` lines 53-54, 283-289.

---

## Major Pitfalls

Mistakes that cause significant delays or architectural problems.

---

### Pitfall 6: Stripe Connect Conflicts with Existing Stripe Subscription Setup

**What goes wrong:** Adding Stripe Connect for marketplace payments to an existing Stripe subscription integration introduces account architecture complexity. The existing setup uses direct charges for subscriptions. Stripe Connect requires choosing between Standard, Express, or Custom connected accounts, and the choice affects the entire payment flow. Teams add Connect without understanding that it changes webhook payloads, introduces new event types, and requires additional KYC flows for service providers.

**Why it happens:** Stripe Connect is treated as "just another Stripe feature" when it is actually a fundamentally different payment architecture. The existing webhook handler at `app/api/stripe/webhook/route.ts` handles 6 event types -- Connect adds 20+ new event types.

**Warning signs:**
- "We'll just add Stripe Connect to the existing webhook" mentality
- No separate webhook endpoint for Connect events
- Marketplace payments mixed with subscription payments in the same Stripe account
- No plan for provider onboarding flow (KYC, bank account setup)
- Expired onboarding links not handled (they expire after 7 days)

**Consequences:**
- Webhook handler becomes a 500+ line monolith trying to handle both subscriptions and marketplace
- Connected account verification failures not caught (accounts can be "onboarded" but `charges_enabled: false`)
- Tax reporting complexity (1099 forms for connected accounts)
- Refund flow becomes complex (who gets refunded -- platform or provider?)
- Existing subscription billing potentially disrupted during Connect integration

**Prevention:**
1. Create a SEPARATE webhook endpoint for Connect events (`/api/stripe/connect/webhook`)
2. Use Express accounts for service providers (simplest onboarding, Stripe handles most compliance)
3. Always check `charges_enabled` AND `payouts_enabled` after onboarding -- redirect completion does not guarantee approval
4. Handle expired onboarding links (re-generate and re-send)
5. Plan the fee structure upfront: platform fee percentage, payout timing, refund responsibility
6. Keep existing subscription webhook handler unchanged -- add Connect logic in new files
7. Test Connect in Stripe Test Mode thoroughly before going live

**Detection:** After marketplace provider onboarding, check `stripe.accounts.retrieve(accountId)` for `charges_enabled: true`. If false, the provider cannot receive payments.

**Severity:** MAJOR -- Architectural decision that is hard to reverse. Wrong account type choice requires rewriting marketplace payment flow.

**Phase to address:** Service Marketplace (must decide Connect architecture before building marketplace features).

**Confidence:** MEDIUM -- Verified against [Stripe Connect docs](https://docs.stripe.com/connect) and [marketplace building guide](https://docs.stripe.com/connect/end-to-end-marketplace). Specific integration with existing Sahara Stripe setup needs phase-specific research.

---

### Pitfall 7: Video Hosting Choice Locks In Cost Structure and DX

**What goes wrong:** Teams choose a video hosting provider (Mux, Cloudflare Stream, YouTube embeds) based on initial feature comparison, then discover the cost structure or DX limitations only at scale. YouTube embeds are free but destroy the premium feel and cannot track per-user progress. Cloudflare Stream is cheap but has limited analytics. Mux is developer-friendly but costs scale with minutes watched.

**Why it happens:** Video hosting is evaluated by feature checklist, not by cost modeling at projected scale. A content library with 50 videos watched by 1,000 users has fundamentally different economics than 500 videos watched by 50,000 users.

**Warning signs:**
- No cost projection based on expected usage
- Choosing YouTube embeds "to save money" without considering branding/tracking loss
- No consideration of DRM requirements (can users download/share course videos?)
- Player customization not evaluated (branded player vs generic)
- No progress tracking architecture (resume where you left off)

**Consequences:**
- YouTube embeds: No per-user progress tracking, no DRM, ads on videos, users can share links publicly
- Cloudflare Stream: Limited analytics, no built-in transcription or chapter generation
- Mux: Higher per-minute costs at scale, but best developer experience and analytics
- Switching providers mid-flight requires re-encoding all videos and rewriting player integration

**Prevention:**
1. Model costs for Year 1: estimate number of videos, average length, expected views per month
2. For a founder-focused platform with <10K users initially, Mux is recommended:
   - Per-title AI encoding (optimal quality at lowest bitrate)
   - Built-in transcript generation (useful for FRED content understanding)
   - Detailed viewer analytics (who watched what, where they dropped off)
   - Simple API, ready in 5 seconds
3. If cost is the primary constraint, Cloudflare Stream is the budget option:
   - $1/1000 minutes stored, $1/1000 minutes delivered
   - No per-title encoding optimization
   - Basic analytics only
4. Do NOT use YouTube embeds for premium content -- it signals "not serious"
5. Abstract the video player behind a component interface so switching providers later requires changing one component, not every page

**Detection:** Calculate monthly video hosting cost = (total video minutes) x (average views per video) x (per-minute-delivered price). If this exceeds 10% of content-related revenue, the choice may not be sustainable.

**Severity:** MAJOR -- Hard to reverse after content is uploaded and URLs are embedded.

**Phase to address:** Content Library planning (decide before building video infrastructure).

**Confidence:** MEDIUM -- Based on [Mux vs Cloudflare Stream comparison](https://www.mux.com/compare/cloudflare-stream), [Mux pricing](https://www.mux.com/pricing), and [Cloudflare Stream pricing](https://developers.cloudflare.com/stream/). Exact cost projections need Sahara-specific usage estimates.

---

### Pitfall 8: Two-Sided Marketplace Cold Start -- No Providers, No Value

**What goes wrong:** The service marketplace launches with no service providers, creating a chicken-and-egg problem. Founders visit the marketplace, find nothing available, and never return. Service providers see no users and don't bother listing. The feature becomes a ghost town that actively damages platform perception.

**Why it happens:** Teams build the marketplace infrastructure (listings, search, payments) before solving supply acquisition. The marketplace code is "ready" but the marketplace is empty.

**Warning signs:**
- Marketplace development proceeds without a provider recruitment plan
- No curated initial catalog of services
- Launch plan assumes providers will "come organically"
- No clear value proposition for providers (why list here vs their own website?)
- No minimum viable catalog defined (how many providers make the marketplace feel "alive"?)

**Consequences:**
- Empty marketplace visible to all users (damages brand)
- Founders lose trust: "Sahara promised expert connections but there's nothing here"
- Wasted development effort on a feature nobody uses
- Difficult to attract providers after users have already judged the marketplace as empty

**Prevention:**
1. Define minimum viable catalog: at least 5-10 curated service providers BEFORE marketplace launch
2. Consider a "concierge marketplace" first: users request services, Sahara team matches manually
3. Seed with Fred Cary's network (mentors, advisors, legal/accounting professionals)
4. Start with a waitlist for providers, onboard them 1:1 ("We'll build your first listing for you")
5. Soft launch to Pro/Studio tier only (smaller audience, higher quality signal)
6. Gate marketplace visibility until minimum catalog threshold is met

**Detection:** If marketplace has fewer than 5 active providers at launch, do NOT make it visible to all users.

**Severity:** MAJOR -- Reputational risk. Empty marketplaces actively harm platform perception.

**Phase to address:** Service Marketplace planning (supply-side acquisition must start weeks before code is written).

**Confidence:** MEDIUM -- Based on [Reforge marketplace cold start guide](https://www.reforge.com/guides/beat-the-cold-start-problem-in-a-marketplace) and marketplace pattern analysis. Specific Sahara provider network size unknown.

---

### Pitfall 9: Boardy API Integration -- External Dependency with Unknown Reliability

**What goes wrong:** The Boardy API integration for investor matching creates a hard dependency on an external startup's API. Boardy is a relatively new company (raised $8M seed). If their API goes down, changes, rate-limits, or the company pivots, the investor matching feature breaks with no fallback.

**Why it happens:** External API integrations are treated as "just another HTTP call." Teams don't plan for the API being unavailable, changing without notice, or having different rate limits than expected.

**Warning signs:**
- No mock/fallback when Boardy API is unavailable
- API key exists in `.env.example` (`BOARDY_API_KEY`) but no documentation on API contract
- No circuit breaker or retry logic
- Investor matching feature shows blank page when Boardy is down
- No SLA or uptime guarantee from Boardy

**Consequences:**
- Studio tier feature (Boardy Investor/Advisor Matching) becomes unreliable
- Users paying $249/month for a feature that depends on an external startup's uptime
- No graceful degradation -- feature either works or fails
- API changes require emergency code updates
- Boardy rate limits could block high-usage periods

**Prevention:**
1. Build the integration with a mock client that returns realistic data when `BOARDY_API_KEY` is not set (the `.env.example` already notes "uses AI mock client when absent" -- verify this works)
2. Implement circuit breaker pattern: after 3 consecutive failures, switch to mock/cached data for 5 minutes
3. Cache Boardy responses (investor profiles don't change every minute)
4. Display graceful degradation: "Investor matching is temporarily unavailable. Here are your previously saved matches."
5. Log all Boardy API calls and responses for debugging
6. Define the API contract in a TypeScript interface and validate responses (don't trust external data shapes)
7. Set up Sentry alerts for Boardy API error rate spikes

**Detection:** Monitor Boardy API response time and error rate. If P95 latency exceeds 5 seconds or error rate exceeds 5%, the circuit breaker should be tripping.

**Severity:** MAJOR -- Revenue-impacting if Studio tier's marquee feature is unreliable.

**Phase to address:** Boardy API Integration phase.

**Confidence:** MEDIUM -- Based on [Boardy AI company profile](https://www.boardy.ai/), `.env.example` configuration, and SaaS integration best practices. No direct access to Boardy API documentation to verify reliability.

---

### Pitfall 10: CI/CD Pipeline -- Every Step Uses `|| true` (Failures Are Invisible)

**What goes wrong:** The current GitHub Actions pipeline (`.github/workflows/deploy.yml`) uses `|| true` on lint (line 29), type check (line 32), test (line 35), security audit (line 54), and Trivy scan (`continue-on-error: true`, line 61). This means the pipeline NEVER fails on code quality issues. Adding new features in v6.0 with this pipeline means regressions, type errors, and test failures go completely undetected.

**Why it happens:** During rapid initial development, `|| true` was added to keep builds passing while the codebase was unstable. It was never removed after stabilization.

**Warning signs:**
- "Build passed" badge on PRs that have type errors
- Tests failing locally but CI shows green
- Lint errors accumulating without anyone noticing
- Security vulnerabilities not caught until production

**Consequences:**
- v6.0 development introduces regressions that are not caught until users report them
- Type errors in new Stripe Connect/Boardy/LiveKit code go undetected
- Test coverage becomes meaningless (tests can fail and nothing happens)
- Security vulnerabilities in new dependencies are not flagged
- False confidence from "all green" CI

**Prevention:**
1. Remove `|| true` from critical steps in phases:
   - Phase 1: Remove from `npm run test` (774/778 passing, fix the 4 failures)
   - Phase 2: Remove from `npx tsc --noEmit` (fix remaining type errors)
   - Phase 3: Remove from `npm run lint` (fix lint issues incrementally)
2. Add test matrix for new features (LiveKit tests, Stripe Connect tests, Boardy mock tests)
3. Add a "voice agent Docker build" check to CI
4. Add Sentry release tracking to the deploy step
5. Keep security scan as `continue-on-error` for now but add Slack notification on security findings

**Detection:** Run `npm run lint && npx tsc --noEmit && npm run test` locally. If any of these fail, the CI pipeline is hiding failures.

**Severity:** MAJOR -- Invisible regressions during the largest feature expansion yet.

**Phase to address:** Infrastructure Hardening (CI/CD expansion) -- should be first phase of v6.0.

**Confidence:** HIGH -- Verified against `.github/workflows/deploy.yml` lines 29, 32, 35, 54, 61.

---

## Moderate Pitfalls

Mistakes that cause delays or technical debt.

---

### Pitfall 11: Content Library Progress Tracking Architecture Mismatch

**What goes wrong:** Teams build a content library (courses, videos, articles) without designing the progress tracking data model upfront. They add a `completed` boolean per content piece, then discover they need: resume position for videos, quiz scores, completion percentage, time spent, certificates, and prerequisite enforcement. Retrofitting this requires database migrations and UI rewrites.

**Warning signs:**
- Content model has only `id`, `title`, `url`, `type` fields
- No `user_content_progress` junction table
- Video progress stored client-side (lost on device switch)
- No concept of "lesson" vs "module" vs "course" hierarchy
- Completion tracking is a simple boolean

**Prevention:**
1. Design the content hierarchy upfront: Course > Module > Lesson > Content Piece (video, article, quiz)
2. Create `user_content_progress` table with: `user_id`, `content_id`, `progress_percent`, `video_position_seconds`, `completed_at`, `started_at`, `time_spent_seconds`
3. Store video playback position server-side (synced on pause/close) for cross-device resume
4. Design RLS policies for progress data from the start
5. Plan for content gating by tier (which courses are Free vs Pro vs Studio)
6. Consider whether content is authored in-house (CMS needed) or curated from external sources

**Detection:** If the database schema has no junction table between users and content pieces with progress fields, the architecture is insufficient.

**Severity:** MODERATE -- Fixable with migrations, but painful if content is already in production.

**Phase to address:** Content Library.

**Confidence:** MEDIUM -- Based on LMS architecture patterns and [DRM/progress tracking patterns](https://doverunner.com/blogs/integrating-drm-into-your-edtech-lms-a-guide-to-secure-online-learning/).

---

### Pitfall 12: Voice Agent Greeting Races with Audio Track Initialization

**What goes wrong:** In `workers/voice-agent/agent.ts` (line 114-116), `session.say()` is called immediately after `session.start()`. The TTS audio for the greeting may be generated before the WebRTC audio output track is fully negotiated, causing the greeting to be silently dropped. The first thing Fred says is never heard.

**Warning signs:**
- Users report "Fred was silent at first, then started talking mid-sentence"
- First transcript entry is the greeting, but users say they didn't hear it
- Intermittent -- works sometimes, fails on slow connections

**Prevention:**
1. Add a short delay (500-1000ms) after `session.start()` before calling `session.say()`
2. Or listen for `AgentSessionEventTypes.AgentStateChanged` to detect transition from `initializing` to `listening`
3. Add a shutdown callback: `ctx.addShutdownCallback(async () => { await session.close(); })` (currently missing -- H-1)
4. Wrap `ctx.connect()` and `ctx.waitForParticipant()` in try/catch with timeout (currently no error handling -- M-2)

**Detection:** Test voice calls on different network conditions. On slow connections, the greeting is more likely to be dropped.

**Severity:** MODERATE -- Bad first impression but not feature-breaking (subsequent audio works).

**Phase to address:** Voice Call Hardening.

**Confidence:** HIGH -- Verified against `workers/voice-agent/agent.ts` and documented as H-2 in `.planning/VOICE-WORKER-AUDIT.md`.

---

### Pitfall 13: Sentry Noise Flood on Activation

**What goes wrong:** The existing `sentry.client.config.ts` (line 9) sets `tracesSampleRate: 0.1` (10% of transactions) and `replaysOnErrorSampleRate: 1.0` (100% of error sessions). For a 210-page app with known issues (4 failing tests, 90+ console.log statements), activating Sentry will immediately generate a flood of events that exhaust the Sentry quota and create alert fatigue.

**Warning signs:**
- Sentry event quota exceeded within hours of activation
- Hundreds of `ResizeObserver loop` errors (partially filtered, line 13)
- Network timeout errors from AI providers flooding error tracking
- No ability to distinguish real bugs from known noise
- Team ignores Sentry alerts because "it's always firing"

**Prevention:**
1. Start with very conservative sample rates: `tracesSampleRate: 0.01` (1%) for the first week
2. Review and expand the `beforeSend` filter (line 12-15) -- currently only filters ResizeObserver, AbortError, and network timeout. Add filters for:
   - Known flaky API errors that are non-critical
   - Development-only errors that leak to production
   - Third-party script errors (Stripe, PostHog)
3. Set up Sentry issue grouping and alert rules BEFORE activation
4. Create separate Sentry environments for staging vs production
5. Configure Sentry rate limits on the project level
6. Set up weekly Sentry triage process -- do not let issues accumulate unreviewed

**Detection:** Check Sentry quota usage dashboard within 24 hours of activation. If usage exceeds 50% of monthly quota in one day, sample rates are too high.

**Severity:** MODERATE -- Alert fatigue kills the value of monitoring.

**Phase to address:** Infrastructure Hardening -- configure BEFORE enabling in production.

**Confidence:** HIGH -- Verified against `sentry.client.config.ts` and `sentry.server.config.ts` configuration.

---

### Pitfall 14: LiveKit Webhook Missing Structured Logging

**What goes wrong:** The LiveKit webhook handler (`app/api/livekit/webhook/route.ts`) is the only voice-related route that does NOT use the `withLogging()` wrapper. When voice call issues occur in production, there is no correlation ID, no structured request/response logging, and no duration tracking for webhook processing. Debugging voice call issues becomes guesswork.

**Warning signs:**
- "We can't figure out what happened during that call" in support tickets
- No way to trace a call from initiation through webhook to completion
- Duplicate webhook events creating phantom records
- Participant records have wrong user IDs (AI agent identity detection is fragile, line 300)

**Prevention:**
1. Add `withLogging()` wrapper to the LiveKit webhook handler
2. Add `withLogging()` to the LiveKit token route (also missing)
3. Add idempotency key to `participant_joined` handler (currently inserts without upsert -- can create duplicates on retry)
4. Fix AI agent identity detection (line 300): use specific pattern matching instead of `identity.startsWith('fred')` which could match real users named Fred
5. Integrate all voice call logging with Sentry (once activated) for unified debugging

**Detection:** After a voice call, attempt to reconstruct the full call lifecycle from logs. If you cannot, logging is insufficient.

**Severity:** MODERATE -- Makes production debugging of voice calls extremely difficult.

**Phase to address:** Voice Call Hardening.

**Confidence:** HIGH -- Verified in `.planning/VOICE-API-AUDIT.md` Finding #5.

---

### Pitfall 15: Content Security Policy Blocks New Integrations

**What goes wrong:** The `next.config.mjs` has a strict Content-Security-Policy (lines 6-17) that allowlists specific domains. Adding Mux video player, Boardy API, or new external services will cause CSP violations that silently break features in the browser. Videos won't load, API calls fail, embedded content is blocked.

**Warning signs:**
- Browser console shows CSP violation errors
- Video player renders but shows no content
- Boardy API calls fail in browser but work in API routes (server-side bypasses CSP)
- New third-party widgets don't load

**Prevention:**
1. When adding Mux: add `https://stream.mux.com` and `https://*.mux.com` to `connect-src` and `media-src`
2. When adding Cloudflare Stream: add `https://customer-*.cloudflarestream.com` to `connect-src`, `frame-src`, and `media-src`
3. When adding Boardy: add Boardy's API domain to `connect-src`
4. Add `media-src` directive (currently absent) for video/audio content
5. Test every new integration in production CSP mode (not just development, which is more permissive)
6. Consider adding a `report-uri` directive to catch CSP violations before users do

**Detection:** Open browser DevTools > Console before testing any new feature. CSP violations appear as red error messages.

**Severity:** MODERATE -- Silently breaks features without clear error messages to users.

**Phase to address:** Each phase that adds external services.

**Confidence:** HIGH -- Verified against `next.config.mjs` lines 6-17.

---

## Minor Pitfalls

Mistakes that cause annoyance but are fixable without major effort.

---

### Pitfall 16: Marketplace Provider Onboarding Creates Two Auth Flows

**What goes wrong:** The current auth system (Supabase Auth) handles founder accounts. Adding service providers to the marketplace creates a second user type that needs different onboarding, different permissions, and potentially different dashboard views. Teams bolt provider accounts onto the existing auth system without designing for two user types.

**Prevention:**
1. Design provider accounts as a role/flag on existing user accounts (not a separate auth system)
2. Add a `user_roles` table or `role` column to handle founder vs provider distinction
3. A user can be BOTH a founder and a provider (some founders provide services too)
4. Provider-specific RLS policies for marketplace listings and transactions

**Severity:** MINOR -- Fixable with schema additions, but messy if not planned.

**Phase to address:** Service Marketplace.

---

### Pitfall 17: Voice Call Summary Route Has No Transcript Size Limit

**What goes wrong:** The `fred/call/summary` route (line 27-33) has no `.max()` constraint on the transcript array in its Zod schema. A malicious or buggy client could send thousands of transcript entries, causing an expensive LLM call that could exceed token limits or cost significant API credits.

**Prevention:**
1. Add `.max(500)` to the transcript array Zod schema
2. Truncate transcript before sending to LLM if it exceeds token budget
3. Track LLM cost per summary call in Sentry/analytics

**Severity:** MINOR -- Unlikely in normal usage, but an abuse vector.

**Phase to address:** Voice Call Hardening.

**Confidence:** HIGH -- Verified in `.planning/VOICE-API-AUDIT.md` Finding #4.

---

### Pitfall 18: In-Memory Rate Limiter and Session Store

**What goes wrong:** The notification rate limiter (`lib/notifications/index.ts`, lines 93-96) and voice agent session store (`lib/voice-agent.ts`, line 66-67) use in-memory Maps. This data is lost on server restart and ineffective in multi-instance deployments (Vercel serverless).

**Prevention:**
1. Migrate to `@upstash/ratelimit` for rate limiting (Redis already configured in `.env.example`)
2. Move voice agent sessions to Supabase table or Redis
3. The `.env.example` already includes `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` -- use them

**Severity:** MINOR -- In-memory works for low traffic but breaks at scale.

**Phase to address:** Infrastructure Hardening.

**Confidence:** HIGH -- Documented in `.planning/codebase/CONCERNS.md`.

---

### Pitfall 19: Founder Tool Space -- Fundraising Bias Alienates Non-Fundraising Users

**What goes wrong:** Startup tools disproportionately focus on fundraising (pitch decks, investor readiness, fundraising playbooks) because it is the most visible startup activity. But most founders are bootstrapping, and a platform that feels "only for fundraisers" loses the majority of its addressable market. The current tier naming ("Fundraising & Strategy" at $99) reinforces this bias.

**Warning signs:**
- Content library is 80%+ fundraising content
- Marketplace providers are all fundraising-adjacent (pitch coaches, deck designers)
- Non-fundraising founders feel the platform "isn't for them"
- Engagement drops for bootstrapped founders after initial onboarding

**Prevention:**
1. Ensure content library has balanced categories: Operations, Growth, Product, Fundraising, Leadership, Finance
2. Marketplace should include non-fundraising services: product development, marketing, operations, HR
3. Dashboard messaging should adapt to founder type (bootstrapped vs fundraising)
4. FRED's conversation flow already adapts to founder stage -- extend this to content recommendations
5. Consider renaming "Fundraising & Strategy" tier to something more inclusive

**Severity:** MINOR -- Addressable through content curation and messaging, not code changes.

**Phase to address:** Content Library and Service Marketplace content strategy.

**Confidence:** MEDIUM -- Based on [founder tool analysis](https://innovationlabs.harvard.edu/how-to/founder-mistakes) and startup ecosystem research.

---

## Phase-Specific Warning Matrix

| Phase | Critical Pitfalls | Major Pitfalls | Action Required |
|-------|-------------------|----------------|-----------------|
| **Infrastructure Hardening** | #1 Sentry build failure, #10 CI/CD invisible failures | #13 Sentry noise flood | Fix CI/CD first, then activate Sentry with conservative settings |
| **Voice Call Hardening** | #3 No audio playback, #4 Docker crash, #5 Room name tracking | #12 Greeting race, #14 Missing logging, #17 Transcript limit | Fix all 3 CRITICAL bugs before any voice testing |
| **Twilio SMS** | #2 A2P registration delay | -- | Start registration immediately, build code in parallel |
| **Content Library** | -- | #7 Video hosting lock-in, #11 Progress tracking schema | Decide video host and design schema before building |
| **Service Marketplace** | -- | #6 Stripe Connect architecture, #8 Cold start, #16 Two user types | Solve supply-side before building infrastructure |
| **Boardy Integration** | -- | #9 External API dependency | Build with circuit breaker and mock client from day one |
| **CSP Updates** | -- | #15 CSP blocks new integrations | Update CSP as each integration is added |

---

## Pre-Flight Checklist for v6.0

Before starting v6.0 development, verify:

**Immediate (Week 1):**
- [ ] A2P 10DLC registration submitted to Twilio
- [ ] Sentry account created with project DSN
- [ ] `SENTRY_AUTH_TOKEN` added to Vercel Build Environment AND GitHub Secrets
- [ ] Video hosting provider decision made (Mux recommended)
- [ ] Service marketplace provider recruitment started

**Before Voice Work:**
- [ ] Voice agent Docker build tested locally
- [ ] Room name format fixed (`${userId}_fred-call_${timestamp}`)
- [ ] Remote audio track handling added to CallFredModal
- [ ] Agent join timeout added
- [ ] Disconnected event handler added

**Before Marketplace Work:**
- [ ] Stripe Connect account type decided (Express recommended)
- [ ] Separate Connect webhook endpoint planned
- [ ] Minimum viable catalog of 5-10 providers identified
- [ ] Provider onboarding flow designed

**Before Content Library:**
- [ ] Content hierarchy schema designed (Course > Module > Lesson)
- [ ] `user_content_progress` table schema designed
- [ ] CSP updated for video hosting provider
- [ ] Content curation plan covers non-fundraising topics

**Before CI/CD Changes:**
- [ ] 4 failing tests fixed
- [ ] `|| true` removal plan phased (tests first, then types, then lint)
- [ ] Voice agent Docker build check added to CI

---

## Confidence Assessment

| Pitfall Category | Confidence | Reason |
|------------------|------------|--------|
| Sentry activation (#1, #13) | HIGH | Verified against existing code and Sentry docs |
| Twilio A2P (#2) | HIGH | Verified via official Twilio documentation |
| LiveKit voice bugs (#3, #4, #5, #12, #14, #17) | HIGH | Verified by three audit reports against source code |
| Stripe Connect (#6) | MEDIUM | Stripe docs verified; specific Sahara integration needs deeper research |
| Video hosting (#7) | MEDIUM | Comparison verified; cost projections need Sahara-specific usage data |
| Marketplace cold start (#8) | MEDIUM | Pattern well-documented; Sahara provider network unknown |
| Boardy API (#9) | MEDIUM | External dependency with limited public documentation |
| CI/CD (#10) | HIGH | Verified against `.github/workflows/deploy.yml` |
| Content progress (#11) | MEDIUM | LMS patterns well-documented; specific Sahara needs TBD |
| CSP (#15) | HIGH | Verified against `next.config.mjs` |
| Founder tool bias (#19) | MEDIUM | Industry pattern; specific Sahara user data needed to validate |

---

## Sources

### Official Documentation
- [Sentry Next.js Manual Setup](https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/)
- [Sentry Source Maps Troubleshooting](https://docs.sentry.io/platforms/javascript/guides/nextjs/sourcemaps/troubleshooting_js/)
- [Twilio A2P 10DLC Campaign Approval Requirements](https://help.twilio.com/articles/11847054539547-A2P-10DLC-Campaign-Approval-Requirements)
- [Twilio A2P 10DLC Registration Rejection Reasons](https://help.twilio.com/articles/15778026827291-Why-Was-My-A2P-10DLC-Campaign-Registration-Rejected-)
- [Twilio Improving A2P Approval Chances](https://www.twilio.com/en-us/blog/insights/best-practices/improving-your-chances-of-a2p10dlc-registration-approval)
- [Stripe Connect Documentation](https://docs.stripe.com/connect)
- [Stripe Connect End-to-End Marketplace](https://docs.stripe.com/connect/end-to-end-marketplace)
- [Mux vs Cloudflare Stream Comparison](https://www.mux.com/compare/cloudflare-stream)

### Codebase Audits
- `.planning/VOICE-API-AUDIT.md` -- 13 findings across 4 voice API routes
- `.planning/VOICE-UI-AUDIT.md` -- 9 findings in CallFredModal component
- `.planning/VOICE-WORKER-AUDIT.md` -- 10 findings in voice agent worker
- `.planning/codebase/CONCERNS.md` -- Known tech debt and security issues

### Industry Research
- [Hamming AI: Debug WebRTC Voice Agents](https://hamming.ai/resources/debug-webrtc-voice-agents-troubleshooting-guide)
- [Hamming AI: Testing LiveKit Voice Agents](https://hamming.ai/resources/testing-livekit-voice-agents-complete-guide)
- [Reforge: Beat the Cold Start Problem](https://www.reforge.com/guides/beat-the-cold-start-problem-in-a-marketplace)
- [A2P 10DLC Registration Complete Guide](https://www.notificationapi.com/blog/a2p-10dlc-registration-the-complete-developer-s-guide-2025)
- [DRM Integration in EdTech LMS](https://doverunner.com/blogs/integrating-drm-into-your-edtech-lms-a-guide-to-secure-online-learning/)
- [Harvard Innovation Labs: Founder Mistakes](https://innovationlabs.harvard.edu/how-to/founder-mistakes)
- [CI/CD Pipeline Architecture Guide](https://logiciel.io/blog/cicd-pipeline-architecture-guide)

---

*Research completed: 2026-02-18*
*19 pitfalls identified: 5 CRITICAL, 5 MAJOR, 5 MODERATE, 4 MINOR*
*Primary sources: Codebase audits (VOICE-API-AUDIT, VOICE-UI-AUDIT, VOICE-WORKER-AUDIT), official documentation (Sentry, Twilio, Stripe, LiveKit), web research*
