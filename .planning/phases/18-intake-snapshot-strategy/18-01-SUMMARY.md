# 18-01 Summary: Enriched Onboarding and Founder Profile Snapshot

## Status: COMPLETE

## What was done

### Task 1: Enriched onboarding and database

1. **Migration 037** (`lib/db/migrations/037_enriched_profiles.sql`) — Already existed with the correct schema. Adds `industry`, `revenue_range`, `team_size`, `funding_history`, `enriched_at`, and `enrichment_source` columns to the `profiles` table.

2. **Extended StartupInfo** (`lib/hooks/use-onboarding.ts`) — Already had the extended fields: `industry`, `revenueRange`, `teamSize`, `fundingHistory` as optional fields on the `StartupInfo` interface.

3. **Enriched onboarding form** (`components/onboarding/startup-info-step.tsx`) — Added a new "details" sub-step after the existing "challenge" step. This sub-step includes:
   - **Industry** — Radix Select dropdown with 11 options (SaaS, E-commerce, FinTech, etc.)
   - **Monthly Revenue** — Radix Select dropdown with 6 revenue ranges (Pre-revenue through $500K+/mo)
   - **Team Size** — Number input (min 1, max 500)
   - **Funding History** — Radix Select dropdown with 6 options (Bootstrapped through Revenue-funded)
   - All fields are optional and do not block onboarding completion.

4. **Onboard API persistence** (`app/api/onboard/route.ts`) — Already destructured the enriched fields from the request body and persists them to the profiles table with `enriched_at` timestamp and `enrichment_source = 'onboarding'` tracking.

### Task 2: Snapshot page and API

1. **Snapshot API** (`app/api/dashboard/profile/snapshot/route.ts`) — GET endpoint that:
   - Authenticates via `requireAuth()`
   - Queries the profiles table for all enrichment columns
   - Returns camelCase-mapped JSON with `{ success: true, data: ProfileSnapshot }`
   - Returns 401 for unauthenticated users, 404 if no profile found

2. **Snapshot page** (`app/dashboard/profile/snapshot/page.tsx`) — Client-side page at `/dashboard/profile/snapshot` that:
   - Fetches profile data from the snapshot API on mount
   - Displays data in a responsive card grid:
     - **Startup Info** card: Name, stage, industry
     - **Financials** card: Revenue range, funding history
     - **Team** card: Team size
     - **Challenges** card: Challenge tags
     - **Enrichment Status** card: Source, enrichment date, profile creation date
   - Empty fields show "Not yet captured" in muted italic text
   - Edit Profile link to `/settings`
   - FRED context note explaining how the profile enriches advice
   - Loading skeleton and error states with onboarding CTA

## Files modified
- `components/onboarding/startup-info-step.tsx` — Added "details" sub-step with 4 enrichment fields
- `lib/hooks/use-onboarding.ts` — No changes needed (already had extended fields)
- `app/api/onboard/route.ts` — No changes needed (already persisted enriched fields)
- `lib/db/migrations/037_enriched_profiles.sql` — No changes needed (already existed)

## Files created
- `app/api/dashboard/profile/snapshot/route.ts` — Snapshot GET API
- `app/dashboard/profile/snapshot/page.tsx` — Snapshot display page

## Verification
- [x] Migration 037 exists with correct schema
- [x] `use-onboarding.ts` has `industry`, `revenueRange`, `teamSize`, `fundingHistory`
- [x] `startup-info-step.tsx` has industry, revenue, team size, funding dropdowns
- [x] `onboard/route.ts` persists `industry`, `revenue_range`, `team_size`
- [x] Snapshot API and page files exist
- [x] `npx tsc --noEmit` passes with 0 errors
