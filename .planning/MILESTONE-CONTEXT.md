# Milestone Context

**Generated:** 2026-02-18
**Status:** Ready for /gsd:new-milestone

<features>
## Features to Build

### New Features
- **Content Library & Courses**: Educational content hub with video lessons, founder playbooks, and curated learning paths. Was deferred from v5.0+ scope. Should integrate with FRED — e.g., FRED recommends relevant content based on founder's stage and challenges.
- **Service Marketplace**: Connect founders with vetted service providers (lawyers, designers, developers, accountants). Discovery, reviews, and booking flow. Revenue opportunity via referral fees or listing charges.
- **Real Boardy API Integration**: Replace the current mock Boardy client (`lib/services/boardy-client.ts`) with live API integration for real investor matching, warm intros, and outreach sequencing.

### Improvements to Existing
- **FRED Intelligence Upgrade**: Better response quality, faster processing, smarter mode switching with less latency, improved memory retrieval and context window usage, better handling of long conversations.
- **Mobile / UX Polish**: PWA refinements (offline capability, install prompts), animation smoothness, responsive edge cases found during audits, onboarding flow improvements, accessibility gaps.
- **Dashboard & Analytics**: Richer data visualizations for founder metrics, engagement tracking dashboards, historical trends for Readiness scores, activity heatmaps, export capabilities.

### Infrastructure & Ops
- **Sentry + Monitoring**: Wire up Sentry error tracking (DSN needed), alerting rules, source maps, performance monitoring, production observability dashboards.
- **Twilio SMS Activation**: Configure real Twilio credentials (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_MESSAGING_SERVICE_SID), activate weekly check-in scheduling, test end-to-end SMS delivery.
- **Voice Agent Hardening**: Production-ready voice calls via LiveKit workers (`workers/voice-agent/`), call quality monitoring, graceful failure handling, call recording/transcription reliability.
- **CI/CD & Testing**: Expand Playwright E2E coverage beyond critical paths, add visual regression testing, staging environment setup, automated post-deploy verification, test coverage reporting.

</features>

<scope>
## Scope

**Suggested name:** v6.0 Full Platform Maturity
**Estimated phases:** ~12 (Phases 59-70)
**Focus:** Make Sahara production-solid (infra), smarter (FRED), and feature-complete (content, marketplace, Boardy) — the full platform maturity push.

### Suggested Phase Grouping

**Wave 1 — Infrastructure Foundation (parallel, no dependencies):**
- Phase 59: Sentry + Production Monitoring
- Phase 60: CI/CD & Testing Expansion
- Phase 61: Twilio SMS Activation

**Wave 2 — Core Improvements (parallel, no dependencies):**
- Phase 62: FRED Intelligence Upgrade
- Phase 63: Mobile / UX Polish
- Phase 64: Dashboard & Analytics Enhancement

**Wave 3 — Voice (depends on infra):**
- Phase 65: Voice Agent Production Hardening

**Wave 4 — New Features (parallel):**
- Phase 66: Content Library — Schema & Backend
- Phase 67: Content Library — Frontend & FRED Integration
- Phase 68: Service Marketplace — Schema & Backend
- Phase 69: Service Marketplace — Frontend & Discovery

**Wave 5 — Integration (depends on marketplace):**
- Phase 70: Real Boardy API Integration

</scope>

<constraints>
## Constraints

- Keep existing tech stack (Next.js 16, Supabase, Stripe, Vercel)
- Boardy API integration depends on Boardy providing API access/docs
- Sentry requires NEXT_PUBLIC_SENTRY_DSN and SENTRY_AUTH_TOKEN env vars
- Twilio requires TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_MESSAGING_SERVICE_SID env vars
- Content library video hosting TBD (could use Mux, Cloudflare Stream, or YouTube embeds)
- Marketplace payment flow may need additional Stripe Connect setup

</constraints>

<notes>
## Additional Context

- v5.0 shipped clean: 28/30 pages pass UX audit, 15/15 deploy verification
- 774/778 tests pass (4 pre-existing env var failures)
- Full stack audit completed with 5-agent team — comprehensive baseline
- Test account available: test-verify-voice@thewizzardof.ai / TestVerify123!
- Production URL: https://www.joinsahara.com
- Phase numbering continues from 58 (last v5.0 phase)

</notes>

---

*This file is temporary. It will be deleted after /gsd:new-milestone creates the milestone.*
