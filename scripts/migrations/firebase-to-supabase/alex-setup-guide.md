# Vite App Migration Guide (for Alex)

One-pager for swapping Firebase Auth + Firestore out of your Vite app and pointing at the Supabase stack Julian already has running.

## 1. Install the Supabase client

```bash
npm install @supabase/supabase-js
```

## 2. Env vars (add to your Vite `.env.local`)

```
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

Julian will send you these. Do **not** use the service role key in the Vite app -- it's server-only.

## 3. Client factory (drop-in)

Create `src/lib/supabase.ts`:

```ts
import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);
```

## 4. Auth replacements

| Firebase | Supabase |
|---|---|
| `signInWithEmailAndPassword(auth, email, pw)` | `supabase.auth.signInWithPassword({ email, password })` |
| `createUserWithEmailAndPassword(...)` | `supabase.auth.signUp({ email, password })` |
| `signInWithPopup(auth, googleProvider)` | `supabase.auth.signInWithOAuth({ provider: "google" })` |
| `onAuthStateChanged(auth, cb)` | `supabase.auth.onAuthStateChange(cb)` |
| `signOut(auth)` | `supabase.auth.signOut()` |
| `sendPasswordResetEmail(auth, email)` | `supabase.auth.resetPasswordForEmail(email)` |
| `auth.currentUser` | `(await supabase.auth.getUser()).data.user` |

## 5. Firestore -> Postgres query replacements

| Firestore | Supabase |
|---|---|
| `getDoc(doc(db, "profiles", uid))` | `supabase.from("profiles").select("*").eq("id", uid).single()` |
| `setDoc(doc(db, "profiles", uid), data)` | `supabase.from("profiles").upsert({ id: uid, ...data })` |
| `updateDoc(ref, patch)` | `supabase.from("profiles").update(patch).eq("id", uid)` |
| `query(collection(db, "x"), where(...))` | `supabase.from("x").select("*").eq(...)` |
| `onSnapshot(query, cb)` | `supabase.channel("x").on("postgres_changes", { ... }, cb).subscribe()` |

## 6. First-login password reset flow

Because Firebase scrypt hashes can't migrate into Supabase bcrypt, **every imported user will have no valid password** after the initial import. Julian's script auto-generates a `recovery` link for each imported user on migration day.

UX-wise, your Vite app needs to handle the reset landing:
- Supabase sends the user an email with a link like `https://yourdomain/auth/reset?code=xxx`.
- Your reset page calls `supabase.auth.exchangeCodeForSession(code)` and prompts for a new password via `supabase.auth.updateUser({ password })`.
- After success, call `signInWithPassword` to land them in the app.

We'll dry-run this against staging before the cutover.

## 7. What to deliver back to Julian (by EOD Wed, Apr 22)

1. `firebase auth:export users.json --project <your-project-id>` -- the raw export file
2. Your Firebase service account JSON (Project Settings > Service accounts > Generate new key)
3. A short schema dump of your Firestore collections. `firebase firestore:export` gives binary; the simpler path is a quick doc:

   ```
   onboarding (collection):
     docId = uid
     fields: stage (string), challenges (array<string>), coFounder (string|null), companyName (string|null), createdAt (timestamp)
   profile (collection):
     ...
   progress (collection):
     ...
   ```

   Rough + informal is fine. Julian needs field names + types to write the mapper.

4. GitHub collaborator access on your Vite repo so a `firebase-to-supabase` branch + PR can land.

## 8. Staging Supabase project

Julian will spin up a second Supabase project mirroring prod schema so we can dry-run the user import without touching real users. Staging URL + anon key will be sent when it's live.

---

**Questions / issues / pairing:** email julian@aiacrobatics.com or drop into the existing Sahara channel.
