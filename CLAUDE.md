# Claude Code Project Instructions

## Project Overview

**Sahara** -- AI-Powered Founder Operating System built by Fred Cary. Helps startup founders with investor readiness scoring, pitch deck review, virtual team agents, and AI coaching. Deployed on Vercel at joinsahara.com.

## Credential Lookup Policy

When credentials, API keys, or secrets are needed:

1. **First choice: Shared credentials file**
   - Source the shared credentials: `source /opt/agency-workspace/.shared-credentials`
   - Contains: GEMINI_API_KEY, HUME_API_KEY, HUME_SECRET_KEY, OP_SERVICE_ACCOUNT_TOKEN

2. **Second choice: Environment variables**
   - Check `.env`, `.env.local`, or system environment variables
   - Use `printenv | grep -i <service_name>` to search

3. **Third choice: 1Password CLI**
   - Use `op item list` to search for credentials
   - Use `op item get "<item_name>" --fields label=<field>` to retrieve specific values

4. **Last resort: Ask the user**

## Tech Stack

- **Framework**: Next.js 16, React 19, TypeScript
- **Styling**: Tailwind CSS 4, shadcn/ui (Radix primitives), Framer Motion, GSAP
- **Database**: Supabase (PostgreSQL) via `@supabase/ssr` + `@supabase/supabase-js`
- **Auth**: Supabase Auth (JWT via `jose`)
- **AI/LLM**: Vercel AI SDK (`ai`), Anthropic, OpenAI, Google Generative AI
- **Voice**: LiveKit (agents, components-react, rtc-node)
- **Browser Automation**: Stagehand (BrowserBase)
- **Payments**: Stripe
- **Email**: Resend + React Email
- **Monitoring**: Sentry, PostHog analytics
- **Rate Limiting**: Upstash Redis + Ratelimit
- **State Machines**: XState 5
- **PDF**: @react-pdf/renderer, pdf-parse
- **Testing**: Vitest (unit), Playwright (e2e)
- **Deployment**: Vercel

## Directory Structure

```
app/                    # Next.js App Router pages
  api/                  # API routes
  dashboard/            # Dashboard pages
  agents/               # Virtual team agent pages
  chat/                 # Chat interface
  pricing/              # Pricing page
  get-started/          # Onboarding flow
  login/ signup/        # Auth pages
  admin/                # Admin panel
components/             # Shared React components
lib/                    # Business logic, utilities
  ai/                   # AI/LLM integration
  auth/                 # Authentication helpers
  db/                   # Database queries
  agents/               # Agent definitions
  analytics/            # PostHog analytics
hooks/                  # Custom React hooks
types/                  # TypeScript type definitions
workers/                # Background workers (voice agent)
supabase/               # Supabase config and migrations
tests/                  # Test files
scripts/                # Build/deploy scripts
```

## Development Commands

```bash
# Dev server
npm run dev                    # Start Next.js dev server (port 3000)

# Testing
npm run test                   # Run Vitest unit tests
npm run test:watch             # Watch mode
npm run test:coverage          # With coverage report
npm run test:e2e               # Playwright e2e tests
npm run test:e2e:headed        # e2e in headed browser

# Linting & validation
npm run lint                   # ESLint
npm run validate-env           # Check env vars

# Build
npm run build                  # Production build (uses --webpack flag)

# Voice agent
npm run worker:voice           # Start voice agent worker (dev)
```

## Testing Configuration

- **Unit tests**: Vitest with jsdom environment, `@testing-library/react`
- **Setup file**: `vitest.setup.ts`
- **Test pattern**: `**/*.test.{ts,tsx}` and `**/__tests__/**/*.{ts,tsx}`
- **Coverage thresholds**: 70% lines/statements, 60% branches/functions
- **E2E**: Playwright config in `playwright.config.ts`
- **Test timeout**: 30 seconds

## Coding Conventions

- **Path aliases**: `@/` maps to project root (e.g., `@/components/navbar`, `@/lib/auth`)
- **Component style**: Functional components with TypeScript, default exports for pages
- **Imports**: Named exports for components, barrel exports discouraged
- **Styling**: Tailwind utility classes, `cn()` helper from `clsx` + `tailwind-merge`
- **UI components**: shadcn/ui pattern -- Radix primitives + CVA variants in `components/ui/`
- **Error handling**: `error.tsx` and `global-error.tsx` error boundaries
- **Fonts**: Geist (Google Fonts via `next/font`)
- **Notifications**: Sonner toast library
- **No semicolons in some files**: Code style varies; match the file you are editing

## Key API Integrations

- **Supabase**: Auth, database, realtime
- **Stripe**: Payments and subscriptions
- **LiveKit**: Voice AI agents and real-time communication
- **Anthropic/OpenAI/Google**: LLM providers via Vercel AI SDK
- **Resend**: Transactional email
- **PostHog**: Product analytics
- **Sentry**: Error tracking
- **Upstash**: Redis for rate limiting
- **Boardy**: External networking integration
- **Stagehand/BrowserBase**: Browser automation

## PR Workflow

1. Create a feature branch: `git checkout -b feature/<short-description>`
2. Commit with descriptive messages: `feat: add investor score calculator`
3. Prefix commits: `feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`
4. Push and open PR against `main`
5. Review checklist:
   - TypeScript compiles (`npm run build`)
   - Tests pass (`npm run test`)
   - Lint clean (`npm run lint`)
   - No secrets committed
   - Environment variables documented if new ones added

## Common Gotchas

- Build command uses `NEXT_PRIVATE_WORKER=0 next build --webpack` -- the webpack flag is intentional
- The `@/` alias points to project root, not `src/` (there is no `src/` directory)
- Supabase SSR requires both `@supabase/ssr` and `@supabase/supabase-js`
- Voice worker is a separate process (`npm run worker:voice`), not part of the Next.js server
- PWA support via Serwist -- see `app/sw.ts` and `app/manifest.ts`
- Vitest runs with `fileParallelism: false` and limited workers for stability
- Brand color is Sahara Orange `#ff6a1a`

## GitHub

- **Owner**: Julianb233
- **Repo**: sierra-fred-carey
