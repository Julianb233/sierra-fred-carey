# Migration 048: Fix Profile Trigger

## Problem

The backend user system was creating incomplete profiles due to a disconnect between:

1. **Database trigger** (migration 032): Only inserted 3 fields (id, email, name)
2. **Profiles table schema** (migrations 032 + 037): Has 15+ columns
3. **auth-helpers.ts**: Only upserted 6 fields (id, email, name, stage, challenges, updated_at)

This caused 500 errors, missing profile data, and authentication issues.

## Solution

This migration updates the database trigger to insert ALL profile columns with proper defaults.

Additionally, `lib/supabase/auth-helpers.ts` has been updated to:
- Include all profile columns in `createOrUpdateProfile()`
- Throw errors instead of silently catching them
- Clean up orphaned auth users if profile creation fails

## How to Apply

### Option 1: Run via Supabase Dashboard (Recommended)

1. Go to Supabase Dashboard → SQL Editor
2. Copy and paste the contents of `048_fix_profile_trigger.sql`
3. Click "Run"

### Option 2: Run via migration script

If you have a migration runner set up:

```bash
# Apply the migration
psql $DATABASE_URL -f lib/db/migrations/048_fix_profile_trigger.sql
```

## Verification

After applying the migration:

1. **Test signup flow:**
   ```bash
   curl -X POST http://localhost:3000/api/onboard \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"Test1234","name":"Test User","stage":"mvp"}'
   ```

2. **Check profile was created with all columns:**
   ```sql
   SELECT id, email, name, stage, challenges, teammate_emails, tier, onboarding_completed
   FROM profiles
   WHERE email = 'test@example.com';
   ```

   Should return a complete profile with:
   - `tier = 0` (FREE)
   - `onboarding_completed = false`
   - `teammate_emails = []`
   - All other fields properly populated

3. **Test auth flow:**
   ```bash
   # Login
   curl -X POST http://localhost:3000/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"Test1234"}'

   # Get user
   curl http://localhost:3000/api/auth/me \
     -H "Cookie: [session-cookie-from-login]"
   ```

   Should return user profile without 500 errors.

## Files Changed

- `lib/supabase/auth-helpers.ts` - Updated profile creation to include all columns
- `lib/db/migrations/048_fix_profile_trigger.sql` - New migration fixing trigger
- `supabase-migrations/001_profiles.sql` - Updated trigger function for consistency

## Rollback

If you need to rollback to the old trigger (NOT recommended):

```sql
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Restore old trigger (incomplete - will break signup)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data ->> 'name', ''));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

## Notes

- This migration is idempotent (safe to run multiple times)
- Existing profiles are NOT modified (only affects new signups)
- If you have existing incomplete profiles, you may need to backfill them manually
- The onboard API route (`app/api/onboard/route.ts`) was already correct and included all columns
