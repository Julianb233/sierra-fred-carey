---
phase: 05-auth-onboarding-fix
plan: 01
status: complete
started: 2026-02-05T17:30:00Z
completed: 2026-02-05T18:00:00Z
---

## What Was Built

### Task 1: Root middleware + profiles migration SQL + onboarding auth gate

**Files modified:**
- `proxy.ts` — Updated existing Next.js 16 proxy (not middleware.ts) to protect `/chat` routes and add redirect query params for auth
- `lib/db/migrations/032_profiles_table_trigger.sql` — SQL migration for profiles table with RLS policies and auth trigger
- `app/onboarding/page.tsx` — Added auth gate to redirect unauthenticated users to `/get-started`

**Commit:** c613e23

### Task 2: Run profiles migration SQL (checkpoint)

**Status:** Completed manually
- Profiles table created in Neon database via Node pg client
- Table has columns: id, email, name, stage, challenges, teammate_emails, tier, onboarding_completed, created_at, updated_at
- Index created on email column

## Deviations

1. **proxy.ts instead of middleware.ts**: Next.js 16.1.1 uses `proxy.ts` instead of `middleware.ts`. The existing proxy already had session refresh logic via `updateSession()`. Updated to also protect `/chat` routes. [Rule 3 - Blocking fix]

2. **Neon database instead of Supabase**: The Supabase URL and keys in `.env` are placeholders (`xxx.supabase.co`, `eyJ...`). The actual database is Neon. Profiles table was created in Neon directly. The auth trigger on `auth.users` cannot be created because there is no Supabase auth schema.

## Blockers Discovered

- **Supabase credentials are placeholders**: `NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co` and keys are truncated `eyJ...`. All Supabase auth SDK calls (`signUp`, `signIn`, `getUser`) will fail until real credentials are configured. This is a pre-existing infrastructure issue, not caused by this plan.

## Deliverables

- [x] Root proxy updated with auth protection
- [x] Migration SQL file created
- [x] Profiles table created in Neon database
- [x] Onboarding page has auth gate
- [ ] Supabase auth trigger — blocked by placeholder credentials
