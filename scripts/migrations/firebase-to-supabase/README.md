# Firebase -> Supabase Migration

End-to-end migration script set for moving the Vite + Firebase Sahara app onto the Next.js + Supabase stack. Built Apr 20, 2026 to execute the plan agreed with Alex LaTorre.

## What's here

| File | Purpose |
|---|---|
| `import-users.ts` | Imports Firebase Auth users into Supabase Auth. Runnable today against sample data. |
| `import-firestore.ts` | Imports **root** Firestore collections into Supabase tables (e.g. `users` → `profiles`). |
| `import-firestore-subcollections.ts` | Imports `users/{uid}/roadmap`, `mentor`, `discovery`, `scores` into `profiles.enrichment_data.firebase_subcollections`. |
| `import-firestore-chat-to-supabase.ts` | Imports `users/{uid}/chat` → `fred_episodic_memory`. |
| `bridge-roadmap-to-startup-process.ts` | Maps subcollections + profile → `startup_processes` (founder report). |
| `bridge-all-firebase-to-supabase.ts` | Runs subcollections import + chat import + roadmap bridge in order. |
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

# 4. Firestore root collections (users → profiles)
npx tsx scripts/migrations/firebase-to-supabase/import-firestore.ts \
  --input ./firestore-export --dry-run

# 5. Full parity: subcollections + chat + startup_processes bridge
# Requires service account JSON at _data/firebase-service-account.json and env vars below.
export SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... DATABASE_URL=...
npx tsx scripts/migrations/firebase-to-supabase/bridge-all-firebase-to-supabase.ts --dry-run
npx tsx scripts/migrations/firebase-to-supabase/bridge-all-firebase-to-supabase.ts
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
