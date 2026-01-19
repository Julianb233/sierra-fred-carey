# Architecture

**Analysis Date:** 2026-01-19

## Pattern Overview

**Overall:** Next.js App Router with Feature-Based Modules

**Key Characteristics:**
- Server-first architecture using Next.js 16 App Router
- API routes colocated with pages in `/app/api/`
- Shared business logic centralized in `/lib/`
- Feature-specific components organized by domain
- Multi-provider AI abstraction with fallback chain
- Supabase for auth and database with SQL template literals

## Layers

**Presentation Layer:**
- Purpose: Renders UI and handles user interactions
- Location: `app/` and `components/`
- Contains: Pages, layouts, React components
- Depends on: Hooks, lib utilities, UI components
- Used by: End users via browser

**API Layer:**
- Purpose: Handles HTTP requests, validates input, orchestrates business logic
- Location: `app/api/`
- Contains: Route handlers (route.ts files)
- Depends on: Auth module, database, AI client, external services
- Used by: Frontend via fetch, external webhooks

**Business Logic Layer:**
- Purpose: Core application logic and domain rules
- Location: `lib/`
- Contains: AI frameworks, auth helpers, monitoring, notifications
- Depends on: Database, external APIs
- Used by: API routes, server components

**Data Access Layer:**
- Purpose: Database queries and external service communication
- Location: `lib/db/`, `lib/supabase/`, `lib/stripe/`
- Contains: SQL queries, Supabase clients, Stripe SDK wrappers
- Depends on: External services (Supabase, Stripe)
- Used by: Business logic layer, API routes

**Shared/Infrastructure Layer:**
- Purpose: Cross-cutting utilities and types
- Location: `lib/utils.ts`, `lib/constants.ts`, `types/`
- Contains: Helpers, constants, TypeScript types
- Depends on: Nothing
- Used by: All layers

## Data Flow

**Chat Request Flow:**

1. User sends message via `components/chat/chat-interface.tsx`
2. Frontend calls `POST /api/chat` with message and history
3. Route handler in `app/api/chat/route.ts` validates and processes
4. `lib/ai/diagnostic-engine.ts` analyzes conversation for framework selection
5. `lib/ai/client.ts` calls AI provider (OpenAI/Anthropic/Google) with fallback
6. Response logged to database via `lib/db/neon.ts` (Supabase wrapper)
7. JSON response returned to frontend with diagnostic metadata

**Authentication Flow:**

1. User submits credentials via `/login` or `/signup` pages
2. `POST /api/auth/login` calls `lib/auth.ts` which delegates to Supabase
3. `lib/supabase/auth-helpers.ts` handles sign-in via Supabase Auth
4. Supabase sets session cookies automatically
5. `middleware.ts` validates session on protected routes via `lib/supabase/middleware.ts`
6. Protected routes redirect to `/login` if no valid session

**Subscription Flow:**

1. User clicks upgrade in dashboard
2. `POST /api/stripe/checkout` creates Stripe Checkout session
3. User completes payment on Stripe
4. Stripe sends webhook to `POST /api/stripe/webhook`
5. Webhook handler in `app/api/stripe/webhook/route.ts` processes event
6. `lib/db/subscriptions.ts` updates user subscription in database

**State Management:**
- Server state: Supabase database with SQL queries
- Auth state: Supabase session cookies, refreshed in middleware
- Client state: React useState/useEffect, no global state library
- Theme state: next-themes provider in `app/providers.tsx`

## Key Abstractions

**AI Client:**
- Purpose: Unified interface to multiple AI providers with tracking
- Examples: `lib/ai/client.ts`, `lib/ai/config-loader.ts`
- Pattern: Provider abstraction with lazy-loaded clients, automatic fallback

**Diagnostic Engine:**
- Purpose: Analyzes conversation to select appropriate AI framework
- Examples: `lib/ai/diagnostic-engine.ts`, `lib/ai/frameworks/`
- Pattern: Signal detection -> Mode selection -> Prompt enhancement

**Notification Service:**
- Purpose: Multi-channel alerting (Slack, Email, PagerDuty)
- Examples: `lib/notifications/service.ts`, `lib/notifications/slack.ts`
- Pattern: Class-based service with retry logic and channel abstraction

**Database Access:**
- Purpose: SQL query execution via Supabase
- Examples: `lib/db/neon.ts` (despite name, uses Supabase)
- Pattern: Tagged template literal `sql` function with parameter binding

**Auth Module:**
- Purpose: Authentication and session management
- Examples: `lib/auth.ts`, `lib/supabase/auth-helpers.ts`
- Pattern: Facade over Supabase Auth with backward-compatible exports

## Entry Points

**Web Application:**
- Location: `app/layout.tsx`
- Triggers: HTTP requests to any route
- Responsibilities: Root layout, providers, navbar, toaster setup

**API Routes:**
- Location: `app/api/**/route.ts`
- Triggers: HTTP requests to `/api/*` paths
- Responsibilities: Request handling, validation, response formatting

**Middleware:**
- Location: `middleware.ts`
- Triggers: All non-static requests (configured via matcher)
- Responsibilities: Session refresh, protected route enforcement

**Stripe Webhook:**
- Location: `app/api/stripe/webhook/route.ts`
- Triggers: Stripe webhook events
- Responsibilities: Subscription lifecycle management

## Error Handling

**Strategy:** Try-catch at API boundaries with structured JSON responses

**Patterns:**
- API routes wrap logic in try-catch, return `{ error: string }` with appropriate status
- AI client has provider fallback chain (OpenAI -> Anthropic -> Google)
- Notification service implements retry with exponential backoff
- Database errors logged but return fallback IDs to avoid request failures

**Example API Error Response:**
```typescript
return NextResponse.json(
  { error: "Failed to process chat message" },
  { status: 500 }
);
```

## Cross-Cutting Concerns

**Logging:**
- Console logging with `[ModuleName]` prefixes
- AI requests/responses logged to database tables `ai_requests` and `ai_responses`
- Example: `console.log("[AI Client] Logged request ${requestId}...")`

**Validation:**
- API route level using runtime checks
- Notification payloads validated via `lib/notifications/validators.ts`
- No schema validation library (like Zod) in use

**Authentication:**
- Supabase Auth with cookie-based sessions
- Middleware enforces auth on `/dashboard/*`, `/agents/*`, `/documents/*`
- API routes use `getOptionalUserId()` or `requireAuth()` from `lib/auth.ts`

**Tier-Based Access:**
- User tiers defined in `lib/constants.ts` (FREE=0, PRO=1, STUDIO=2)
- Dashboard layout shows locked features based on tier
- Tier gating middleware available at `lib/middleware/tier-gate.ts`

---

*Architecture analysis: 2026-01-19*
