# Tools & Dependencies

> Project: sierra-fred-carey
> Stack: Next.js 16, React 19, TypeScript, Tailwind, Supabase PostgreSQL

---

## Required Tools

### Development
| Tool | Version | Purpose | Install |
|------|---------|---------|---------|
| Node.js | 20+ | Runtime | `brew install node` |
| pnpm | 8+ | Package manager | `npm i -g pnpm` |
| TypeScript | 5.9.2 | Type safety | (in package.json) |

### Build & Deploy
| Tool | Version | Purpose | Install |
|------|---------|---------|---------|
| Next.js | 16.1.1 | Framework | (in package.json) |
| Vercel CLI | latest | Deployment | `npm i -g vercel` |
| Turbopack | built-in | Build tool | (in Next.js) |

### Testing
| Tool | Version | Purpose | Install |
|------|---------|---------|---------|
| Jest | (TBD) | Unit tests | `pnpm add -D jest` |
| Playwright | (TBD) | E2E tests | `pnpm add -D playwright` |

---

## Environment Setup

### Prerequisites
```bash
# Install Node 20+
brew install node

# Install pnpm
npm i -g pnpm

# Clone repo
cd "/Users/julianbradley/CODEING /sierra-fred-carey"

# Install deps
pnpm install
```

### Quick Setup
```bash
cd "/Users/julianbradley/CODEING /sierra-fred-carey"
pnpm install
cp .env.example .env
# Edit .env with your values
pnpm run dev
```

---

## Environment Variables

| Variable | Purpose | Required | Default |
|----------|---------|----------|---------|
| DATABASE_URL | Supabase PostgreSQL | Yes | - |
| OPENAI_API_KEY | AI features | Yes | - |
| CLERK_SECRET_KEY | Auth | Yes | - |
| NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY | Auth | Yes | - |
| SLACK_WEBHOOK_URL | Notifications | No | - |
| PAGERDUTY_ROUTING_KEY | Alerts | No | - |

### .env Template
```bash
# Database
DATABASE_URL=postgresql://...

# AI
OPENAI_API_KEY=sk-...

# Auth (Clerk)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...

# Notifications (optional)
SLACK_WEBHOOK_URL=https://hooks.slack.com/...
PAGERDUTY_ROUTING_KEY=...
```

---

## MCP Servers Available

| Server | Purpose | Status |
|--------|---------|--------|
| claude-flow | Agent orchestration, memory | Active |
| notion | CRM, credentials, notes | Active |
| github | Repo operations | Active |

---

## Build Commands

```bash
# Development
pnpm run dev

# Production Build
pnpm run build

# Start Production
pnpm run start

# Type Check
pnpm run typecheck # or: npx tsc --noEmit

# Lint
pnpm run lint
```

---

## Key Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| next | 16.1.1 | Framework |
| react | 19.1.1 | UI library |
| typescript | 5.9.2 | Type safety |
| tailwindcss | 4.1.13 | Styling |
| recharts | 3.6.0 | Charts |
| gsap | 3.14.2 | Animations |
| framer-motion | 12.23.13 | Animations |
| @clerk/nextjs | latest | Auth |
| @supabase/supabase-js | latest | Database |

---

## Troubleshooting

### Common Issues

**GSAP Draggable casing error:**
```
Type error: File name 'Draggable.d.ts' differs from 'draggable.d.ts' only in casing
```
**Fix:** Check import casing or reinstall GSAP

**Build fails with TypeScript errors:**
```bash
npx tsc --noEmit
```
Fix errors shown, then rebuild.

### Quick Fixes

```bash
# Clear Next.js cache
rm -rf .next

# Reinstall dependencies
rm -rf node_modules pnpm-lock.yaml
pnpm install

# Check TypeScript
npx tsc --noEmit
```

---

*Maintained by Bubba-Orchestrator*
