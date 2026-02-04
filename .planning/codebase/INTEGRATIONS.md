# External Integrations

**Analysis Date:** 2026-01-19

## APIs & External Services

**AI Providers (with automatic fallback):**
- OpenAI - Primary AI provider for chat and analysis
  - SDK/Client: `openai` package
  - Auth: `OPENAI_API_KEY`
  - Models: `gpt-4-turbo-preview` (default)
  - Implementation: `lib/ai/client.ts`

- Anthropic - Fallback AI provider
  - SDK/Client: `@anthropic-ai/sdk`
  - Auth: `ANTHROPIC_API_KEY`
  - Models: `claude-3-5-sonnet-20241022`
  - Implementation: `lib/ai/client.ts`

- Google Gemini - Secondary fallback
  - SDK/Client: `@google/generative-ai`
  - Auth: `GOOGLE_API_KEY`
  - Models: `gemini-1.5-flash`
  - Implementation: `lib/ai/client.ts`

**Payments:**
- Stripe - Subscription billing and payments
  - SDK/Client: `stripe` (server), `@stripe/stripe-js` (client)
  - Auth: `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
  - Server implementation: `lib/stripe/server.ts`
  - Client implementation: `lib/stripe/client.ts`
  - Config: `lib/stripe/config.ts`
  - Webhook handler: `app/api/stripe/webhook/route.ts`

**Video/Real-time:**
- LiveKit - Video conferencing and real-time communication
  - SDK/Client: `livekit-server-sdk`, `livekit-client`, `@livekit/components-react`
  - Auth: `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`
  - URL: `LIVEKIT_URL`, `NEXT_PUBLIC_LIVEKIT_URL`
  - Token endpoint: `app/api/livekit/token/route.ts`
  - Implementation: `lib/livekit/index.ts`

## Data Storage

**Primary Database:**
- Supabase (PostgreSQL)
  - Client: `@supabase/ssr`, `@supabase/supabase-js`
  - Connection: `NEXT_PUBLIC_SUPABASE_URL`
  - Auth Keys: `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
  - Browser client: `lib/supabase/client.ts`
  - Server client: `lib/supabase/server.ts`
  - Middleware: `lib/supabase/middleware.ts`
  - Auth helpers: `lib/supabase/auth-helpers.ts`
  - SQL wrapper: `lib/db/neon.ts` (Supabase compatibility layer)
  - Migrations: `supabase-migrations/`

**File Storage:**
- Vercel Blob - File uploads (pitch decks)
  - SDK/Client: `@vercel/blob`
  - Auth: Automatic via Vercel deployment
  - Implementation: `lib/storage/upload.ts`
  - Supported types: PDF, PPTX
  - Max size: 20MB

**Caching:**
- None (no dedicated caching layer)
- In-memory caching for AI clients (lazy-loaded singletons)

## Authentication & Identity

**Primary Auth Provider:**
- Supabase Auth
  - Implementation: `lib/supabase/middleware.ts`
  - Session management via cookies
  - Middleware: `middleware.ts`

**Secondary Auth (Custom JWT):**
- Custom JWT tokens for API authentication
  - Library: `jose`
  - Implementation: `lib/auth/token.ts`
  - Utilities: `lib/auth/middleware-utils.ts`
  - Auth: `JWT_SECRET`
  - Default expiration: 7 days

**Legacy/Alternative:**
- Clerk (configured but may not be active)
  - Keys: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`
  - Configured in `.env.example`

## Notification Services

**Slack:**
- Purpose: Alert notifications for A/B test monitoring
- Integration: Incoming webhooks
- Auth: `SLACK_WEBHOOK_URL`
- Implementation: `lib/notifications/slack.ts`
- API endpoint: `app/api/notifications/slack/route.ts`
- Features: Rich message formatting, action buttons, batch summaries

**Email (Resend):**
- Purpose: Email notifications for alerts
- Auth: `RESEND_API_KEY`
- Config: `RESEND_FROM_EMAIL`, `RESEND_FROM_NAME`
- Implementation: `lib/notifications/email.ts`
- Features: HTML templates, metric formatting

**PagerDuty:**
- Purpose: Critical incident alerting
- Integration: Events API v2
- Auth: `PAGERDUTY_ROUTING_KEY`
- Implementation: `lib/notifications/pagerduty.ts`
- API endpoint: `app/api/notifications/pagerduty/route.ts`
- Features: Incident creation, resolution, deduplication

**Notification Service:**
- Unified interface: `lib/notifications/service.ts`
- Type definitions: `lib/notifications/types.ts`
- Validators: `lib/notifications/validators.ts`

## Monitoring & Observability

**Error Tracking:**
- None (no Sentry, Bugsnag, etc.)

**Logs:**
- Console logging with prefixed messages (e.g., `[AI Client]`, `[Slack]`)
- AI request/response logging to database (`ai_requests`, `ai_responses` tables)

**Application Monitoring:**
- Custom monitoring dashboard: `app/dashboard/monitoring/page.tsx`
- Health endpoint: `app/api/monitoring/health/route.ts`
- Alert system: `lib/monitoring/alerts.ts`
- A/B test metrics: `lib/monitoring/ab-test-metrics.ts`

## CI/CD & Deployment

**Hosting:**
- Vercel (primary)
- GitHub Actions (CI)

**CI Pipeline:**
- Config: `.github/workflows/deploy.yml`
- Triggers: Push to `main` or `staging`, pull requests
- Steps: Install, lint, type check, test, build, security scan
- Security: Trivy vulnerability scanning, npm audit
- Deployment: Vercel CLI

**Cron Jobs:**
- Vercel Cron: `vercel-cron.json`
- Auto-promotion check: `/api/monitoring/auto-promotion/check` (hourly)

## Environment Configuration

**Required env vars (minimum):**
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
JWT_SECRET
```

**Required for AI features:**
```
# At least one of:
OPENAI_API_KEY
ANTHROPIC_API_KEY
GOOGLE_API_KEY
```

**Required for payments:**
```
STRIPE_SECRET_KEY
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
STRIPE_WEBHOOK_SECRET
NEXT_PUBLIC_STRIPE_FUNDRAISING_PRICE_ID
NEXT_PUBLIC_STRIPE_VENTURE_STUDIO_PRICE_ID
```

**Optional integrations:**
```
# LiveKit (video)
LIVEKIT_URL
NEXT_PUBLIC_LIVEKIT_URL
LIVEKIT_API_KEY
LIVEKIT_API_SECRET

# Notifications
SLACK_WEBHOOK_URL
RESEND_API_KEY
RESEND_FROM_EMAIL
RESEND_FROM_NAME
PAGERDUTY_ROUTING_KEY

# App config
NEXT_PUBLIC_APP_URL
NODE_ENV
```

**Secrets location:**
- Development: `.env` (gitignored)
- Production: Vercel environment variables
- Template: `.env.example`

## Webhooks & Callbacks

**Incoming:**
- Stripe webhook: `app/api/stripe/webhook/route.ts`
  - Events: `checkout.session.completed`, `customer.subscription.*`, `invoice.payment_failed`
  - Signature verification with `STRIPE_WEBHOOK_SECRET`
  - Idempotency handling (event deduplication)

**Outgoing:**
- Slack webhooks (notifications)
- PagerDuty Events API v2 (incidents)
- Resend API (emails)

## API Route Summary

**Authentication:**
- `app/api/auth/login/route.ts` - User login
- `app/api/auth/signup/route.ts` - User registration
- `app/api/auth/logout/route.ts` - User logout
- `app/api/auth/me/route.ts` - Get current user

**AI/Chat:**
- `app/api/chat/route.ts` - AI chat endpoint
- `app/api/ai/rating/route.ts` - AI response rating
- `app/api/diagnostic/*` - Diagnostic analysis endpoints
- `app/api/investor-lens/*` - Investor analysis
- `app/api/positioning/*` - Market positioning
- `app/api/reality-lens/route.ts` - Reality check analysis

**Payments:**
- `app/api/stripe/checkout/route.ts` - Create checkout session
- `app/api/stripe/portal/route.ts` - Customer portal
- `app/api/stripe/webhook/route.ts` - Stripe webhooks
- `app/api/user/subscription/route.ts` - Subscription status

**Monitoring:**
- `app/api/monitoring/dashboard/route.ts` - Dashboard data
- `app/api/monitoring/health/route.ts` - Health check
- `app/api/monitoring/alerts/*` - Alert management
- `app/api/monitoring/experiments/*` - A/B test data
- `app/api/monitoring/auto-promotion/check/route.ts` - Cron job

**Admin:**
- `app/api/admin/ab-tests/*` - A/B test management
- `app/api/admin/prompts/*` - Prompt management
- `app/api/admin/voice-agent/*` - Voice agent config
- `app/api/admin/training/*` - Training data management

**Notifications:**
- `app/api/notifications/send/route.ts` - Send notifications
- `app/api/notifications/slack/route.ts` - Slack integration
- `app/api/notifications/pagerduty/route.ts` - PagerDuty integration
- `app/api/notifications/test/route.ts` - Test notifications
- `app/api/notifications/config/route.ts` - Notification config

---

*Integration audit: 2026-01-19*
