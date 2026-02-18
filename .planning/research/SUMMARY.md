# Research Summary: Sahara v6.0

**Project:** Sahara — AI-Powered Founder OS
**Synthesized:** 2026-02-18
**Overall Confidence:** HIGH (existing stack is mature; new additions well-documented)

---

## Executive Summary

Sahara v6.0 adds three new product domains (content library, service marketplace, Boardy API) and hardens production infrastructure (Sentry, Twilio SMS, LiveKit voice, CI/CD) on a mature platform (210 pages, 774 tests passing, 93% UX audit pass rate).

The critical insight: **most of the stack is already in place.** Only 6 new packages are needed (3 Mux for video, 2 Serwist for PWA, 1 axe-core for a11y testing). Stripe Connect for marketplace payments uses the existing Stripe SDK. Sentry, Twilio, LiveKit, PostHog, Recharts — all already installed. This is an extension milestone, not a rebuild.

The highest risks are external dependencies and timeline blockers:
1. **Twilio A2P 10DLC** — 4-week registration timeline that MUST start before SMS code is written
2. **LiveKit voice** — 3 CRITICAL bugs found (no remote audio playback, Docker container won't start, room name format breaks tracking)
3. **Boardy API** — No public documentation; requires partnership agreement; LOW confidence
4. **Stripe Connect** — Must be isolated from existing subscription webhooks to avoid breaking billing
5. **CI/CD pipeline** — Every quality gate uses `|| true`, hiding failures from all v6.0 work

---

## Key Findings

### From STACK.md

| New Addition | Tool | Status | New Packages? |
|---|---|---|---|
| Video hosting | Mux (player + uploader + node) | 3 new packages | Yes |
| Marketplace payments | Stripe Connect Express | Already installed | No |
| Booking/scheduling | Custom Supabase tables | No external tool | No |
| Error monitoring | Sentry | Already installed | No |
| Voice hardening | LiveKit | Already installed | No |
| SMS activation | Twilio | Already installed | No |
| Boardy API | Direct REST (no SDK) | No package available | No |
| CI/CD expansion | Playwright | Already installed | No |
| Dashboard analytics | PostHog + Recharts | Already installed | No |
| PWA refinement | Serwist (next-pwa successor) | 2 new packages | Yes |
| Accessibility testing | axe-core/playwright | 1 new dev package | Yes |
| FRED intelligence | Vercel AI SDK + XState | Already installed | No |

**Total new packages: 6** — Everything else extends existing infrastructure.

### From FEATURES.md

**Content Library:**
- Table stakes: Curated catalog, stage filtering, video+text, progress tracking, search, mobile-friendly, bookmarks
- Differentiators: FRED-recommended content, content-to-action bridge, adaptive curriculum, "Ask FRED about this"
- Anti-features: Full LMS, user-generated content, gamification, live cohorts, AI-generated courses, certificates

**Service Marketplace:**
- Table stakes: Provider directory, profiles, search/filter, reviews, contact mechanism, vetting badge
- Differentiators: FRED-triggered recommendations, context-aware matching, task-to-provider pipeline, starter packages
- Anti-features: Full escrow, in-platform project management, automated matching algorithm, provider dashboard, real-time chat

**Investor Matching (Boardy):**
- Table stakes: Investor profiles, stage/sector filtering, match scoring, warm intro paths, pipeline CRM, outreach drafts
- Differentiators: Readiness-gated matching (unique to Sahara), voice-first Boardy matching, investor prep coaching, post-meeting intelligence
- Anti-features: Building own investor database, automated email sending, intro brokering, real-time activity feeds

### From ARCHITECTURE.md

**Data models designed** for:
- Content library: 5 tables (courses, modules, lessons, progress, recommendations)
- Service marketplace: 4 tables (providers, listings, bookings, reviews)
- Boardy integration: Uses existing strategy pattern (`RealBoardyClient` swaps in for `MockBoardyClient`)

**Key integration points:**
- FRED recommends content via new AI tool: `recommend_content(course_id, reason)`
- FRED triggers provider recommendations via conversation need detection
- Content-to-action bridge links course completion to FRED conversation modes
- Marketplace bookings extend existing Stripe webhook handler with Connect events

### From PITFALLS.md

| # | Pitfall | Severity | Phase | Key Prevention |
|---|---------|----------|-------|----------------|
| 1 | Sentry DSN activation breaks build (missing SENTRY_AUTH_TOKEN in CI) | CRITICAL | Infra | Set ALL 4 env vars simultaneously |
| 2 | Twilio A2P 10DLC blocks SMS by 4+ weeks | CRITICAL | Infra | Start registration IMMEDIATELY |
| 3 | LiveKit: users hear nothing (no remote audio track handling) | CRITICAL | Voice | Add TrackSubscribed handler or refactor to components-react |
| 4 | Voice agent Docker container won't start (tsx in devDeps) | CRITICAL | Voice | Pre-compile TypeScript or move tsx to deps |
| 5 | Room name format breaks all voice call tracking | CRITICAL | Voice | Fix userId extraction in webhook |
| 6 | Stripe Connect conflicts with subscription webhooks | MAJOR | Marketplace | Separate webhook endpoint for Connect |
| 7 | Video hosting choice locks in cost structure | MAJOR | Content | Use Mux, abstract behind component interface |
| 8 | Marketplace cold start — no providers, no value | MAJOR | Marketplace | Curate 5-10 providers BEFORE launch |
| 9 | Boardy API — external dependency with unknown reliability | MAJOR | Boardy | Circuit breaker, mock fallback, cache responses |
| 10 | CI/CD `|| true` hides all failures | MAJOR | Infra | Remove `|| true` from test/typecheck/lint steps |

---

## Implications for Roadmap

### Suggested Phase Structure

**Wave 1 — Infrastructure Foundation (parallel, no dependencies):**

1. **Phase 59: Sentry + Production Monitoring**
   - Addresses: Pitfall #1 (build-breaking DSN), Pitfall #10 (invisible CI failures)
   - Uses: Existing @sentry/nextjs, add edge config
   - Deliverables: Error tracking live, source maps uploading, alert rules configured, CI `|| true` removed
   - Action item: Start Twilio 10DLC registration in parallel (4-week lead time)

2. **Phase 60: CI/CD & Testing Expansion**
   - Addresses: Pitfall #10 (invisible failures), Feature: visual regression, staging
   - Uses: Existing Playwright, axe-core (new)
   - Deliverables: Playwright in CI, visual regression baselines, staging branch, Node 22, a11y tests

3. **Phase 61: Twilio SMS Activation**
   - Addresses: Pitfall #2 (10DLC timeline blocker)
   - Uses: Existing Twilio SDK
   - Deliverables: A2P 10DLC registered, real SMS delivery, opt-in/opt-out compliance
   - Note: Registration started in Phase 59, code built in Phase 61

**Wave 2 — Voice Hardening (depends on Sentry for monitoring):**

4. **Phase 62: Voice Agent Production Hardening**
   - Addresses: Pitfalls #3, #4, #5 (all CRITICAL voice bugs)
   - Uses: Existing LiveKit packages
   - Deliverables: Remote audio working, Docker container starts, room name tracking fixed, reconnection logic, call recording

**Wave 3 — Core Improvements (parallel, depends on infra):**

5. **Phase 63: FRED Intelligence Upgrade**
   - Addresses: Feature: better responses, memory, mode switching
   - Uses: Existing Vercel AI SDK + XState
   - Deliverables: New FRED tools (lookup_course, find_provider), improved memory retrieval, conversation summarization

6. **Phase 64: Dashboard & Analytics Enhancement**
   - Addresses: Feature: richer visualizations, engagement tracking
   - Uses: Existing PostHog + Recharts
   - Deliverables: Founder metrics dashboard, historical trends, engagement scoring, export

7. **Phase 65: Mobile / UX Polish**
   - Addresses: Feature: PWA, animations, accessibility
   - Uses: Serwist (new), axe-core (new), existing Framer Motion
   - Deliverables: Offline content caching, push notification improvements, WCAG audit pass

**Wave 4 — New Features (parallel, depends on FRED upgrade for integration):**

8. **Phase 66: Content Library — Schema & Backend**
   - Addresses: Feature: educational content hub
   - Uses: Mux (new), existing Supabase
   - Deliverables: 5 tables, Mux integration, API routes, admin content management, tier gating
   - Avoids: Pitfall #7 (use Mux, abstract player)

9. **Phase 67: Content Library — Frontend & FRED Integration**
   - Addresses: Feature: course catalog, FRED recommendations
   - Uses: Mux Player React (new), existing FRED tools
   - Deliverables: Course catalog, video player, progress tracking, FRED content recommendations, "Ask FRED" button

10. **Phase 68: Service Marketplace — Schema & Backend**
    - Addresses: Feature: vetted provider marketplace
    - Uses: Stripe Connect (existing SDK), existing Supabase
    - Deliverables: 4 tables, Stripe Connect webhook, provider onboarding, booking flow
    - Avoids: Pitfall #6 (separate Connect webhook), Pitfall #8 (curate providers first)

11. **Phase 69: Service Marketplace — Frontend & Discovery**
    - Addresses: Feature: provider directory, FRED integration
    - Uses: Existing UI components
    - Deliverables: Provider directory, profiles, search/filter, reviews, FRED-triggered recommendations

**Wave 5 — External Integration (depends on partnership):**

12. **Phase 70: Real Boardy API Integration**
    - Addresses: Feature: live investor matching
    - Uses: Direct REST API (no SDK)
    - Deliverables: RealBoardyClient implementation, circuit breaker, cached fallback
    - Avoids: Pitfall #9 (external dependency risk)
    - Risk: LOW confidence — requires Boardy partnership. If unavailable, enhance mock with curated data.

### Phase Ordering Rationale

| Grouping | Rationale |
|----------|-----------|
| Infrastructure first | Sentry catches bugs in all subsequent phases. CI prevents regressions. 10DLC has 4-week lead time. |
| Voice before features | 3 CRITICAL bugs make voice non-functional. Fix before adding more features on top. |
| FRED upgrade before content/marketplace | FRED tools (lookup_course, find_provider) must exist before content/marketplace integrate with FRED. |
| Content before marketplace | Content creates "learn" experience; marketplace creates "do" experience. Natural progression. |
| Boardy last | Highest external risk. If partnership doesn't materialize, everything else still ships. |

### Research Flags for Phases

| Phase | Research Need | Reason |
|-------|-------------|--------|
| 59-61 | SKIP | Well-documented: Sentry docs, Twilio 10DLC docs, Playwright docs |
| 62 | SKIP | Voice audit reports already exist (.planning/VOICE-*-AUDIT.md) with specific fixes |
| 63 | `/gsd:research-phase` | FRED intelligence improvements benefit from reviewing latest AI SDK patterns |
| 64-65 | SKIP | Standard PostHog/Recharts/PWA patterns |
| 66-67 | SKIP | Mux has Next.js starter kit; data models designed in ARCHITECTURE.md |
| 68-69 | SKIP | Stripe Connect well-documented; data models designed |
| 70 | `/gsd:research-phase` | Boardy API docs needed from partnership; integration approach TBD |

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Only 6 new packages. Everything else extends existing. |
| Features | MEDIUM-HIGH | Table stakes clear. FRED integration patterns designed but need validation during build. |
| Architecture | HIGH | Data models designed. Integration points mapped. Existing patterns preserved. |
| Pitfalls | HIGH | 5 CRITICAL + 5 MAJOR pitfalls identified with specific prevention strategies. |

### Gaps to Address

1. **Boardy API documentation** — Cannot implement without partner API access. Contact Boardy team.
2. **Mux pricing at scale** — Model costs for Year 1 before committing to video hosting.
3. **Marketplace cold start** — Provider recruitment plan needed before marketplace launch.
4. **Twilio 10DLC registration** — Must start immediately (4-week timeline).
5. **Voice agent audit fixes** — 3 detailed audit reports exist; fixes are documented but unimplemented.

---

## Ready for Roadmap

This research provides clear guidance for roadmap construction:

1. **Stack validated** — 6 new packages, everything else extends existing infrastructure
2. **Phase order is risk-driven** — Infrastructure first (catches bugs), voice fixes (CRITICAL), then features
3. **Critical risks identified** — 10DLC timeline, voice bugs, Boardy dependency, Stripe Connect isolation
4. **Feature scope clear** — Table stakes, differentiators, and anti-features defined for all 3 new domains
5. **Data models designed** — Content library (5 tables), marketplace (4 tables), Boardy (strategy pattern swap)

**Recommended immediate actions:**
- Start A2P 10DLC registration (4-week blocker)
- Create Sentry project and obtain DSN + auth token
- Contact Boardy team for API partnership
- Curate initial 5-10 service providers for marketplace launch

---

*Synthesized from: STACK.md, FEATURES.md, ARCHITECTURE.md, PITFALLS.md*
*Research date: 2026-02-18*
