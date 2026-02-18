# User Creation Report

## Summary
Successfully created a new test user via Supabase Auth Admin API and verified the profile exists.

## User Details
- **Auth User ID**: `507c3364-1700-4f32-bc5c-1dd3edf05874`
- **Email**: `test-dev@joinsahara.com`
- **Password**: `TestPassword123!`
- **Email Confirmed**: Yes (set via `email_confirm: true` on admin create)
- **Profile Created**: Yes, verified via Supabase API

## Profile Row (verified via Supabase JS client)
```json
{
  "id": "507c3364-1700-4f32-bc5c-1dd3edf05874",
  "email": "test-dev@joinsahara.com",
  "name": "Test Dev User",
  "stage": "idea",
  "challenges": ["fundraising"],
  "teammate_emails": [],
  "onboarding_completed": false,
  "tier": 0,
  "created_at": "2026-02-18T20:06:29.946696+00:00",
  "updated_at": "2026-02-18T20:06:30.032+00:00"
}
```

## Important Finding: Database Discrepancy
- The `DATABASE_URL` in `.env.local` points to **Neon PostgreSQL** which has **0 rows** in the `profiles` table.
- The Supabase JS client writes to **Supabase's hosted Postgres**, which is where the profile actually lives.
- This means `DATABASE_URL` (Neon) and Supabase's DB are **different databases**.
- Any code using `DATABASE_URL` directly (e.g., migrations, raw SQL) will NOT see the profiles created via Supabase client.

## Errors Encountered
None. User creation and profile upsert both succeeded on first attempt.

## Script Location
`/opt/agency-workspace/sierra-fred-carey/scripts/create-test-user.ts`

## Login Credentials
- **Email**: `test-dev@joinsahara.com`
- **Password**: `TestPassword123!`
