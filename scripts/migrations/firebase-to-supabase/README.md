# Firebase -> Supabase Migration

End-to-end migration script set for moving the Vite + Firebase Sahara app onto the Next.js + Supabase stack. Built Apr 20, 2026 to execute the plan agreed with Alex LaTorre.

## What's here

| File | Purpose |
|---|---|
| `import-users.ts` | Imports Firebase Auth users into Supabase Auth. Runnable today against sample data. |
| `import-firestore.ts` | Imports Firestore collections into Supabase tables. **Scaffold only** -- mappers wait on Alex's schema dump. |
| `sample-firebase-export.json` | Minimal fixture to dry-run `import-users.ts`. |

## Env required

Before running, ensure `.env.local` in the repo root has:

```
NEXT_PUBLIC_SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...     # server-only; never commit
```

The service role key is needed because we use `auth.admin.createUser` and bypass RLS for the import.

## Staging first

Point `NEXT_PUBLIC_SUPABASE_URL` at a **staging Supabase project**, not production. After validating, swap envs and rerun.

## Steps

```bash
# 0. Dry-run the users import against the sample fixture
npx tsx scripts/migrations/firebase-to-supabase/import-users.ts \
  --input scripts/migrations/firebase-to-supabase/sample-firebase-export.json \
  --dry-run

# 1. Real users export from Alex (once delivered)
firebase auth:export users.json --project <alex-project-id>

# 2. Dry-run against real export
npx tsx scripts/migrations/firebase-to-supabase/import-users.ts \
  --input ./users.json --dry-run --limit 10

# 3. Full run (staging)
npx tsx scripts/migrations/firebase-to-supabase/import-users.ts \
  --input ./users.json

# 4. Firestore collections (once mappers are filled in)
npx tsx scripts/migrations/firebase-to-supabase/import-firestore.ts \
  --input ./firestore-export --dry-run
```

## Password handling

Firebase uses scrypt password hashes; Supabase uses bcrypt. Direct hash re-use isn't possible. Strategy:

- Every imported user gets a **password recovery link** auto-generated via `auth.admin.generateLink({ type: "recovery" })`.
- Users set a new password on first login.
- Firebase UID is preserved in `user_metadata.firebase_uid` for audit/debug.

Alternative (not yet implemented): if a user's `providerUserInfo` shows OAuth only (Google/Apple), skip password and create the identity row directly.

## What Alex still owes

1. Firebase Auth export (`users.json`)
2. Firestore schema dump -- field names + types per collection (onboarding, profile, progress)
3. Supabase admin access (his project or Julian's `ggfzpyqmahvasfvwiqli`)

Once (2) lands, fill in the `transform` functions in `import-firestore.ts` and ship.
