# Sahara Deployment Guide

## Overview

All deployments go through the Vercel CLI to catch issues before they reach production.
Direct pushes to `main` are blocked by a git hook. Every deploy runs lint, typecheck,
tests, and a local build before uploading to Vercel.

## Quick Start

```bash
# One-time setup
git config core.hooksPath .githooks
vercel link  # connect to the Sahara Vercel project

# Deploy
./scripts/deploy.sh              # preview deployment
./scripts/deploy.sh staging      # staging deployment
./scripts/deploy.sh production   # production (main branch only)
```

## Deployment Workflow

### 1. Feature Development

```
feature branch -> PR -> staging verification -> merge to main -> production deploy
```

- Work on a feature branch (`feature/ai-XXX-description`)
- Push the branch and open a pull request
- GitHub Actions runs lint, typecheck, tests, e2e, and security checks
- Review the PR, get approval

### 2. Preview Deploy (testing a branch)

```bash
./scripts/deploy.sh preview
```

- Creates a unique Vercel preview URL for your branch
- Use this to share WIP with the team or test in a real environment
- No branch restrictions

### 3. Staging Deploy

```bash
./scripts/deploy.sh staging
```

- Deploys to a staging preview URL
- Best run from `main` or `staging` branch
- Verify all critical flows before promoting

### 4. Production Deploy

```bash
./scripts/deploy.sh production
```

- Requires `main` branch
- Requires manual confirmation (type "deploy")
- Runs all quality gates before deploying
- Deploys with `vercel --prod`

## Pre-Deploy Checklist

Before running any deploy, the script automatically verifies:

- [ ] No uncommitted changes
- [ ] No untracked source files
- [ ] Lint passes (`npm run lint`)
- [ ] TypeScript compiles (`npx tsc --noEmit`)
- [ ] Tests pass (`npm run test`)
- [ ] Build succeeds (`npm run build`)

## Post-Deploy Verification

After deploying, manually verify:

- [ ] Landing page loads correctly
- [ ] Login/signup flow works
- [ ] FRED chat responds (send a test message)
- [ ] Dashboard loads with data
- [ ] Voice agent connects (if changed)
- [ ] Stripe checkout initiates (if billing changed)
- [ ] Cron jobs are registered (check Vercel dashboard)

## Branch Protection

A pre-push git hook prevents direct pushes to `main`. The intended flow:

1. Push to feature branch
2. Open PR, pass CI checks
3. Merge PR (GitHub merges to main)
4. Pull main locally
5. Run `./scripts/deploy.sh production`

Emergency bypass (use sparingly):
```bash
git push --no-verify
```

## Setup

### First-Time Setup

```bash
# 1. Install Vercel CLI (if not already installed)
npm i -g vercel

# 2. Login to Vercel
vercel login

# 3. Link the project
cd /path/to/sierra-fred-cary
vercel link

# 4. Enable git hooks
git config core.hooksPath .githooks

# 5. Make deploy script executable
chmod +x scripts/deploy.sh
```

### Team Member Setup

Each team member needs to:
1. Have Vercel CLI installed and authenticated
2. Run `git config core.hooksPath .githooks` after cloning
3. Run `vercel link` to connect their local checkout

## Environment Variables

Production environment variables are managed in the Vercel dashboard.
Do not store secrets in the repo. The CI workflow uses GitHub Secrets
for build-time variables (Sentry DSN, Supabase keys, etc).

## Rollback

If a production deploy has issues:

```bash
# List recent deployments
vercel ls

# Promote a previous deployment to production
vercel promote <deployment-url>
```

Or from the Vercel dashboard: go to Deployments, find the last good deploy, click "Promote to Production".

## Troubleshooting

**"Vercel CLI not found"**
```bash
npm i -g vercel
```

**"Not linked to a project"**
```bash
vercel link
```

**"Build failed locally but works in CI"**
- Check Node version: `node -v` (must be 20+)
- Check for missing env vars: `npx next info`
- Try clean install: `rm -rf node_modules .next && npm install --legacy-peer-deps`

**"Pre-push hook blocking my push"**
- Use `git push --no-verify` only for emergencies
- Normal flow: push to feature branch, not main
