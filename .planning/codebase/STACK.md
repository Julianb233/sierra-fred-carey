# Technology Stack

**Analysis Date:** 2026-01-19

## Languages

**Primary:**
- TypeScript 5.9.2 - All application code (components, API routes, utilities)

**Secondary:**
- JavaScript (ES modules) - Configuration files (`next.config.mjs`, `postcss.config.mjs`)

## Runtime

**Environment:**
- Node.js 20.x (specified in `.github/workflows/deploy.yml`)
- Next.js 16.1.1 with App Router (server components, route handlers)

**Package Manager:**
- npm (primary, used in CI/CD)
- pnpm (alternative, lockfile present)
- Lockfile: `package-lock.json` and `pnpm-lock.yaml` present

## Frameworks

**Core:**
- Next.js 16.1.1 - Full-stack React framework with App Router
- React 19.1.1 - UI library
- React DOM 19.1.1 - DOM rendering

**Testing:**
- Vitest 4.0.16 - Test runner
- @testing-library/react 16.3.1 - React component testing
- @testing-library/dom 10.4.1 - DOM testing utilities
- @testing-library/jest-dom 6.9.1 - DOM matchers
- jsdom 27.4.0 - DOM environment for tests

**Build/Dev:**
- Tailwind CSS 4.1.13 - Utility-first CSS framework
- PostCSS 8.x - CSS processing
- ESLint 8.x - Linting (with Next.js config)
- tsx 4.7.0 - TypeScript execution for scripts

## Key Dependencies

**Critical:**
- `@supabase/ssr` 0.8.0 - Supabase SSR client (authentication, database)
- `@supabase/supabase-js` 2.89.0 - Supabase JavaScript client
- `stripe` 20.1.0 - Stripe server SDK (payments, subscriptions)
- `@stripe/stripe-js` 8.6.0 - Stripe client SDK
- `jose` 6.1.3 - JWT signing/verification (Edge-compatible)

**AI Services:**
- `openai` 6.15.0 - OpenAI API client (GPT-4 Turbo)
- `@anthropic-ai/sdk` 0.71.2 - Anthropic API client (Claude)
- `@google/generative-ai` 0.24.1 - Google Gemini API client

**Real-time/Video:**
- `livekit-client` 2.16.1 - LiveKit client SDK
- `livekit-server-sdk` 2.15.0 - LiveKit server SDK (token generation)
- `@livekit/components-react` 2.9.17 - LiveKit React components

**UI Components:**
- `@radix-ui/react-*` - Comprehensive Radix UI component library
- `lucide-react` 0.544.0 - Icon library
- `framer-motion` 12.23.13 - Animation library
- `gsap` 3.12.5 - Animation library
- `recharts` 3.6.0 - Charting library
- `sonner` 2.0.7 - Toast notifications

**Email:**
- `@react-email/components` 1.0.2 - React Email components
- `@react-email/render` 2.0.0 - Email rendering
- `react-email` 5.1.0 - Email development

**Infrastructure:**
- `@vercel/blob` 2.0.0 - Vercel Blob storage (file uploads)
- `bcryptjs` 3.0.3 - Password hashing

**Utilities:**
- `date-fns` 3.6.0 - Date manipulation
- `clsx` 2.1.1 - Conditional classnames
- `class-variance-authority` 0.7.1 - Variant-based styling
- `tailwind-merge` 3.3.1 - Tailwind class merging
- `pdf-parse` 2.4.5 - PDF text extraction

## Configuration

**Environment:**
- `.env` - Local development environment variables
- `.env.example` - Environment variable template
- `.env.production` - Production environment variables (template)

**Required Environment Variables:**
```
# Supabase (required)
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY

# Stripe (optional, enables billing)
STRIPE_SECRET_KEY
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
STRIPE_WEBHOOK_SECRET
NEXT_PUBLIC_STRIPE_FUNDRAISING_PRICE_ID
NEXT_PUBLIC_STRIPE_VENTURE_STUDIO_PRICE_ID

# AI Providers (at least one required)
OPENAI_API_KEY
ANTHROPIC_API_KEY
GOOGLE_API_KEY

# JWT (required for custom auth)
JWT_SECRET

# LiveKit (optional, enables video)
LIVEKIT_URL
NEXT_PUBLIC_LIVEKIT_URL
LIVEKIT_API_KEY
LIVEKIT_API_SECRET

# Notifications (optional)
SLACK_WEBHOOK_URL
RESEND_API_KEY
RESEND_FROM_EMAIL
PAGERDUTY_ROUTING_KEY
```

**Build:**
- `tsconfig.json` - TypeScript configuration (strict mode, bundler resolution)
- `next.config.mjs` - Next.js configuration (minimal, defaults)
- `postcss.config.mjs` - PostCSS with Tailwind
- `vitest.config.ts` - Vitest configuration (jsdom environment, path aliases)
- `vercel.json` - Vercel deployment config (security headers, install command)
- `components.json` - shadcn/ui configuration

**TypeScript Paths:**
- `@/*` maps to `./*` (root-relative imports)

## Platform Requirements

**Development:**
- Node.js 20.x
- npm or pnpm
- Git

**Production:**
- Vercel (primary deployment target)
- Vercel Blob (file storage)
- Supabase (database, auth)
- Stripe (payments)

**CI/CD:**
- GitHub Actions
- Vercel CLI deployment
- Security scanning with Trivy
- Slack notifications

## Scripts

```bash
npm run dev          # Start development server with Turbopack
npm run build        # Production build
npm run start        # Start production server
npm run lint         # ESLint
npm run test         # Run tests
npm run test:watch   # Run tests in watch mode
npm run test:coverage # Run tests with coverage
npm run test:slack   # Test Slack webhook (scripts/test-slack-webhook.ts)
```

---

*Stack analysis: 2026-01-19*
