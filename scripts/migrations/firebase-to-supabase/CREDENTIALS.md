# Firebase migration — credentials reference

The migration scripts in this directory need a Firebase Admin SDK service
account to read `sahara-6800a`. The JSON key **must not** be committed to this
repo — it grants full admin rights to every user record, Firestore collection,
and Cloud Storage bucket on the Firebase project. Anything committed to a git
repo is permanently recoverable from history, even after deletion, and secret
scanners pick up committed Google service accounts within minutes.

## Where the key lives

**Primary: 1Password**

- Vault: `agency credentials`
- Item name: `Sahara Firebase Admin SDK (sahara-6800a)`
- Attached file: the `.json` key

If the 1Password item does not exist, generate a fresh key:

1. Open Firebase Console -> Project settings -> Service accounts
2. Click "Generate new private key"
3. Save the JSON into 1Password with the item name above
4. Revoke the previous key (same page, under "Manage service account permissions")

## How to load it locally

```bash
# 1. Pull from 1Password into the gitignored _data directory
op document get "Sahara Firebase Admin SDK (sahara-6800a)" \
  --vault "agency credentials" \
  --out-file scripts/migrations/firebase-to-supabase/_data/firebase-service-account.json

# 2. chmod tight (readable by your user only)
chmod 600 scripts/migrations/firebase-to-supabase/_data/firebase-service-account.json

# 3. Run the exporter
npx tsx scripts/migrations/firebase-to-supabase/export-firebase.ts \
  --service-account scripts/migrations/firebase-to-supabase/_data/firebase-service-account.json \
  --output scripts/migrations/firebase-to-supabase/_data
```

The `_data/` directory is gitignored via `scripts/migrations/firebase-to-supabase/.gitignore`
(see parent `.gitignore` entries for `_data/firebase-service-account.json` and
`_data/`). If you see that file show up in `git status`, stop and fix the
ignore before committing anything.

## How it is loaded in production scripts

`export-firebase.ts` reads the path from the `--service-account` CLI arg. No
environment variable is set; no CI pipeline uses this key directly. The
migration is run manually.

## Rollback

If this key is ever accidentally committed:

1. Revoke it in Firebase Console -> Project settings -> Service accounts ->
   "Manage service account permissions" -> delete the key
2. Generate a new key and update 1Password
3. Run `git filter-repo --invert-paths --path <leaked-path>` to remove from
   history (requires all collaborators to force-pull)
4. Rotate any other secrets that shared the same commit
