# Codebase Structure

**Analysis Date:** 2026-01-19

## Directory Layout

```
sierra-fred-carey/
├── app/                    # Next.js App Router pages and API routes
│   ├── api/               # Backend API route handlers
│   ├── dashboard/         # Protected dashboard pages
│   ├── admin/             # Admin panel pages
│   ├── demo/              # Public demo pages
│   └── [feature]/         # Public feature pages (login, signup, etc.)
├── components/            # React components organized by feature
│   ├── ui/               # Reusable UI primitives (shadcn/ui style)
│   ├── chat/             # Chat interface components
│   ├── monitoring/       # A/B test monitoring components
│   ├── investor-lens/    # Investor evaluation components
│   └── [feature]/        # Feature-specific components
├── lib/                   # Shared business logic and utilities
│   ├── ai/               # AI client, frameworks, prompts
│   ├── auth/             # Auth utilities (deprecated, use lib/auth.ts)
│   ├── db/               # Database access layer
│   ├── supabase/         # Supabase client configuration
│   ├── stripe/           # Stripe integration
│   ├── monitoring/       # A/B test metrics and alerting
│   ├── notifications/    # Multi-channel notification service
│   └── [module]/         # Other shared modules
├── types/                 # Global TypeScript type definitions
├── hooks/                 # Custom React hooks
├── public/                # Static assets
├── tests/                 # Test files
├── docs/                  # Documentation
├── scripts/               # Utility scripts
└── supabase-migrations/   # Database migration files
```

## Directory Purposes

**`app/`:**
- Purpose: Next.js App Router pages and API routes
- Contains: `page.tsx`, `layout.tsx`, `route.ts`, `loading.tsx`, `error.tsx`
- Key files: `app/layout.tsx` (root layout), `app/page.tsx` (landing page), `app/providers.tsx` (theme provider)

**`app/api/`:**
- Purpose: Backend API endpoints organized by domain
- Contains: `route.ts` files for GET/POST/PUT/DELETE handlers
- Key subdirs: `auth/`, `chat/`, `stripe/`, `admin/`, `diagnostic/`, `investor-lens/`

**`app/dashboard/`:**
- Purpose: Protected authenticated user pages
- Contains: Feature pages for logged-in users
- Key files: `app/dashboard/layout.tsx` (sidebar navigation), `app/dashboard/page.tsx` (overview)

**`app/admin/`:**
- Purpose: Admin-only management pages
- Contains: A/B tests, prompts, voice agent config
- Key files: `app/admin/layout.tsx`, `app/admin/page.tsx`

**`components/`:**
- Purpose: React UI components organized by feature
- Contains: TSX files, barrel exports (`index.ts`)
- Key subdirs: `ui/` (primitives), `chat/`, `monitoring/`, `investor-lens/`, `journey/`

**`components/ui/`:**
- Purpose: Reusable UI primitives (shadcn/ui pattern)
- Contains: `button.tsx`, `card.tsx`, `dialog.tsx`, `input.tsx`, etc.
- Key files: All Radix-based UI components with consistent styling

**`lib/`:**
- Purpose: Shared business logic, utilities, and integrations
- Contains: TypeScript modules with domain logic
- Key files: `lib/auth.ts`, `lib/constants.ts`, `lib/utils.ts`

**`lib/ai/`:**
- Purpose: AI provider abstraction and frameworks
- Contains: Client, prompts, diagnostic engine, framework modules
- Key files: `lib/ai/client.ts`, `lib/ai/diagnostic-engine.ts`, `lib/ai/prompts.ts`

**`lib/ai/frameworks/`:**
- Purpose: AI coaching frameworks (positioning, investor lens, etc.)
- Contains: Framework definitions with signal detection and prompt generation
- Key files: `lib/ai/frameworks/investor-lens.ts`, `lib/ai/frameworks/positioning.ts`

**`lib/supabase/`:**
- Purpose: Supabase client configuration for auth and database
- Contains: Server/client factories, auth helpers, middleware
- Key files: `lib/supabase/server.ts`, `lib/supabase/middleware.ts`, `lib/supabase/auth-helpers.ts`

**`lib/notifications/`:**
- Purpose: Multi-channel notification system
- Contains: Service class, channel implementations, validators
- Key files: `lib/notifications/service.ts`, `lib/notifications/slack.ts`, `lib/notifications/pagerduty.ts`

**`types/`:**
- Purpose: Global TypeScript type definitions
- Contains: Type files for various domains
- Key files: `types/auth.ts`, `types/monitoring.ts`, `types/promotion.ts`

## Key File Locations

**Entry Points:**
- `app/layout.tsx`: Root layout with providers and global styles
- `app/page.tsx`: Landing page
- `middleware.ts`: Request middleware for auth and session refresh
- `app/providers.tsx`: Client-side providers (theme)

**Configuration:**
- `package.json`: Dependencies and scripts
- `tsconfig.json`: TypeScript configuration
- `next.config.mjs`: Next.js configuration
- `vitest.config.ts`: Test configuration
- `.env` / `.env.example`: Environment variables

**Core Logic:**
- `lib/ai/client.ts`: Multi-provider AI client with tracking
- `lib/ai/diagnostic-engine.ts`: Conversation analysis for framework selection
- `lib/auth.ts`: Authentication facade
- `lib/db/supabase-sql.ts`: Database query helper (uses Supabase despite name)
- `lib/constants.ts`: App-wide constants (tiers, colors, features)

**Testing:**
- `lib/**/__tests__/*.test.ts`: Unit tests colocated with modules
- `tests/`: Additional test files
- `app/api/pitch-deck/upload/__tests__/route.test.ts`: API route tests

## Naming Conventions

**Files:**
- Pages: `page.tsx`
- Layouts: `layout.tsx`
- API routes: `route.ts`
- Components: `PascalCase.tsx` (e.g., `AgentCard.tsx`)
- Utilities: `kebab-case.ts` (e.g., `config-loader.ts`)
- Tests: `*.test.ts`

**Directories:**
- Feature folders: `kebab-case` (e.g., `investor-lens/`, `check-ins/`)
- Dynamic routes: `[param]` (e.g., `[id]/`, `[slug]/`)
- Catch-all: `[...param]` (not currently used)

**Exports:**
- Barrel exports: `index.ts` in component directories
- Named exports preferred over default exports
- Types exported from same file or dedicated type files

## Where to Add New Code

**New API Endpoint:**
- Location: `app/api/[domain]/route.ts`
- Pattern: Create folder for domain, add `route.ts` with exported handlers
- Example: New analytics endpoint -> `app/api/analytics/route.ts`

**New Dashboard Feature:**
- Page: `app/dashboard/[feature]/page.tsx`
- Components: `components/[feature]/`
- Business logic: `lib/[feature]/` if significant
- Types: `types/[feature].ts` or inline

**New Public Page:**
- Location: `app/[page-name]/page.tsx`
- Example: New pricing page -> `app/pricing/page.tsx`

**New UI Component:**
- Primitive: `components/ui/[component].tsx`
- Feature-specific: `components/[feature]/[Component].tsx`

**New Service/Integration:**
- Location: `lib/[service-name]/`
- Pattern: `index.ts` for exports, separate files per concern
- Example: New payment provider -> `lib/payments/`

**Utilities:**
- Shared helpers: `lib/utils.ts` or new file in `lib/utils/`
- Constants: `lib/constants.ts`

**New Test:**
- Unit tests: `lib/[module]/__tests__/[module].test.ts`
- API tests: `app/api/[domain]/__tests__/route.test.ts`
- Integration tests: `tests/`

## Special Directories

**`.planning/`:**
- Purpose: GSD planning system documents
- Generated: By planning tools
- Committed: Yes

**`supabase-migrations/`:**
- Purpose: Database schema migrations
- Generated: Manually created
- Committed: Yes

**`docs/`:**
- Purpose: API documentation and guides
- Generated: No
- Committed: Yes

**`scripts/`:**
- Purpose: Utility scripts (testing, deployment)
- Generated: No
- Committed: Yes
- Key files: `scripts/test-slack-webhook.ts`

**`public/`:**
- Purpose: Static assets served at root
- Contains: Icons, images, previews
- Committed: Yes

**`.github/workflows/`:**
- Purpose: GitHub Actions CI/CD
- Generated: No
- Committed: Yes

---

*Structure analysis: 2026-01-19*
