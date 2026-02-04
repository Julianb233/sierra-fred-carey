# Sierra-Fred-Carey Tech Stack

> **IMPORTANT**: All development MUST use these technologies. Do NOT suggest alternatives.

## Core Framework
- **Next.js 15+** - App Router (NOT Pages Router)
- **React 19** - Server Components by default
- **TypeScript 5+** - Strict mode enabled

## Styling
- **Tailwind CSS 4** - Utility-first CSS
- **shadcn/ui** - Component library (Radix UI primitives)
- **Radix UI Icons** - Icon set (@radix-ui/react-icons)
- **class-variance-authority (cva)** - Component variants
- **tailwind-merge** - Class merging
- **clsx** - Conditional classes

## Database
- **Neon PostgreSQL** - Serverless Postgres (NOT Supabase)
- **Drizzle ORM** - Type-safe SQL ORM
- **drizzle-kit** - Migrations

## Authentication
- **Custom JWT** - Token-based auth (lib/auth)
- **bcrypt** - Password hashing
- DO NOT use: Clerk, Auth0, NextAuth

## Payments
- **Stripe** - Payments and subscriptions
- **stripe** npm package - Server SDK
- **@stripe/stripe-js** - Client SDK

## Email
- **Resend** - Transactional emails
- **React Email** - Email templates

## AI/LLM
- **OpenAI API** - GPT models
- **AI SDK (Vercel)** - Streaming responses

## Charts/Visualization
- **Recharts** - Charts library
- DO NOT use: Chart.js, D3 directly

## State Management
- **React Context** - Global state
- **useState/useReducer** - Local state
- **SWR or React Query** - Server state (if needed)
- DO NOT use: Redux, Zustand, Jotai

## Validation
- **Zod** - Schema validation
- DO NOT use: Yup, Joi

## Notifications (External)
- **Slack Webhooks** - Team notifications
- **PagerDuty API** - Critical alerts

## File Structure
```
/app                 # Next.js App Router pages
/components          # React components
  /ui               # shadcn/ui components
  /dashboard        # Dashboard-specific
  /monitoring       # Monitoring components
/lib                # Utilities and services
  /db               # Database queries
  /stripe           # Stripe integration
  /notifications    # Notification service
/hooks              # Custom React hooks
/types              # TypeScript types
```

## Environment Variables
```
DATABASE_URL=postgresql://...
STRIPE_SECRET_KEY=sk_...
STRIPE_PUBLISHABLE_KEY=pk_...
STRIPE_WEBHOOK_SECRET=whsec_...
RESEND_API_KEY=re_...
OPENAI_API_KEY=sk-...
SLACK_WEBHOOK_URL=https://hooks.slack.com/...
```

## Commands
```bash
npm run dev          # Development server
npm run build        # Production build
npm test             # Run tests (Vitest)
npm run db:push      # Push schema to database
npm run db:generate  # Generate migrations
```

## DO NOT USE
- Prisma (use Drizzle)
- Clerk/Auth0/NextAuth (use custom JWT)
- MongoDB (use PostgreSQL)
- Express (use Next.js API routes)
- Redux/Zustand (use Context)
- Chart.js (use Recharts)
- Supabase (use Neon + custom auth)
