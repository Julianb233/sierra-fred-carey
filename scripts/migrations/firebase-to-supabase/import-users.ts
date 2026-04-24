/**
 * Firebase Auth -> Supabase Auth user importer.
 *
 * Input: JSON array from `firebase auth:export users.json --project <id>`
 *   [{ localId, email, displayName, passwordHash?, salt?, providerUserInfo, ... }]
 *
 * Output: Users created in Supabase Auth via admin API + row in `profiles` table.
 *
 * Usage:
 *   npx tsx scripts/migrations/firebase-to-supabase/import-users.ts \
 *     --input ./firebase-users.json \
 *     [--dry-run] [--limit 10]
 *
 * Env required (reads from .env.local):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY   <- server-only, never leak
 *
 * Idempotency: Skips users whose email already exists in Supabase Auth.
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { readFile } from "node:fs/promises";
import { parseArgs } from "node:util";
import { config } from "dotenv";
import { resolve } from "node:path";

config({ path: resolve(process.cwd(), ".env.local") });

type FirebaseProviderInfo = {
  providerId: string;
  rawId?: string;
  email?: string;
  displayName?: string;
  photoUrl?: string;
};

type FirebaseUser = {
  localId: string;
  email?: string;
  emailVerified?: boolean;
  displayName?: string;
  photoUrl?: string;
  disabled?: boolean;
  createdAt?: string;
  lastSignedInAt?: string;
  passwordHash?: string;
  salt?: string;
  providerUserInfo?: FirebaseProviderInfo[];
  customAttributes?: string;
};

type Args = { input: string; dryRun: boolean; limit: number | undefined };

function parseCliArgs(): Args {
  const { values } = parseArgs({
    options: {
      input: { type: "string" },
      "dry-run": { type: "boolean", default: false },
      limit: { type: "string" },
    },
  });
  if (!values.input) {
    console.error("Missing --input <path-to-firebase-export.json>");
    process.exit(1);
  }
  return {
    input: values.input,
    dryRun: values["dry-run"] ?? false,
    limit: values.limit ? Number(values.limit) : undefined,
  };
}

function mustEnv(key: string): string {
  const v = process.env[key];
  if (!v) {
    console.error(`Missing env var: ${key}`);
    process.exit(1);
  }
  return v;
}

function makeClient(): SupabaseClient {
  return createClient(
    mustEnv("NEXT_PUBLIC_SUPABASE_URL"),
    mustEnv("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

async function loadFirebaseExport(path: string): Promise<FirebaseUser[]> {
  const raw = await readFile(path, "utf-8");
  const parsed = JSON.parse(raw);
  if (Array.isArray(parsed)) return parsed;
  if (Array.isArray(parsed.users)) return parsed.users;
  throw new Error(`Unexpected export shape in ${path}`);
}

// Build-once-per-run cache so we don't re-paginate listUsers for every check.
let existingEmailsCache: Set<string> | null = null;
async function ensureEmailCache(db: SupabaseClient): Promise<Set<string>> {
  if (existingEmailsCache) return existingEmailsCache;
  const set = new Set<string>();
  let page = 1;
  while (true) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    for (const u of data.users) {
      if (u.email) set.add(u.email.toLowerCase());
    }
    if (data.users.length < 1000) break;
    page += 1;
  }
  existingEmailsCache = set;
  return set;
}

async function emailExists(db: SupabaseClient, email: string): Promise<boolean> {
  const cache = await ensureEmailCache(db);
  return cache.has(email.toLowerCase());
}

/**
 * Firebase password hashes (scrypt) are NOT directly importable into
 * Supabase bcrypt storage. Two strategies:
 *   1. Preferred: generate a one-time password reset link for each user,
 *      delivered via email. Users set a new password on first login.
 *   2. Alternative: if Firebase used Google/OAuth providers, import them
 *      as identity rows and skip password entirely.
 *
 * This stub uses strategy 1 (reset link). Override `strategy` per-user
 * if the providerUserInfo shows OAuth only.
 */
async function importUser(
  db: SupabaseClient,
  fbUser: FirebaseUser,
  dryRun: boolean
): Promise<{ status: "created" | "skipped" | "error"; reason?: string }> {
  if (!fbUser.email) {
    return { status: "skipped", reason: "no email" };
  }

  if (dryRun) {
    console.log(`[DRY] would create: ${fbUser.email} (${fbUser.localId})`);
    return { status: "created" };
  }

  if (await emailExists(db, fbUser.email)) {
    return { status: "skipped", reason: "email exists" };
  }

  const { data, error } = await db.auth.admin.createUser({
    email: fbUser.email,
    email_confirm: fbUser.emailVerified ?? true,
    user_metadata: {
      firebase_uid: fbUser.localId,
      display_name: fbUser.displayName ?? null,
      photo_url: fbUser.photoUrl ?? null,
      imported_from: "firebase",
      imported_at: new Date().toISOString(),
    },
  });

  if (error || !data.user) {
    return { status: "error", reason: error?.message ?? "no user returned" };
  }

  const { error: profileErr } = await db.from("profiles").upsert(
    {
      id: data.user.id,
      email: fbUser.email,
      name: fbUser.displayName ?? null,
      created_at: fbUser.createdAt
        ? new Date(Number(fbUser.createdAt)).toISOString()
        : new Date().toISOString(),
    },
    { onConflict: "id" }
  );

  if (profileErr) {
    return { status: "error", reason: `profile upsert: ${profileErr.message}` };
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.joinsahara.com";
  const { error: linkErr } = await db.auth.admin.generateLink({
    type: "recovery",
    email: fbUser.email,
    options: {
      redirectTo: `${siteUrl}/api/auth/callback?next=/reset-password`,
    },
  });
  if (linkErr) {
    console.warn(`  reset link failed for ${fbUser.email}: ${linkErr.message}`);
  }

  return { status: "created" };
}

async function main() {
  const args = parseCliArgs();
  const db = makeClient();
  const users = await loadFirebaseExport(args.input);
  const slice = args.limit ? users.slice(0, args.limit) : users;

  console.log(
    `Importing ${slice.length} users ${args.dryRun ? "(DRY RUN)" : ""}`
  );

  const counts = { created: 0, skipped: 0, error: 0 };
  for (const u of slice) {
    try {
      const r = await importUser(db, u, args.dryRun);
      counts[r.status] += 1;
      if (r.status !== "created") {
        console.log(`  ${r.status}: ${u.email ?? u.localId} -- ${r.reason}`);
      }
    } catch (e: unknown) {
      counts.error += 1;
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`  error: ${u.email ?? u.localId} -- ${msg}`);
    }
  }

  console.log(
    `\nDone. created=${counts.created} skipped=${counts.skipped} error=${counts.error}`
  );
  process.exit(counts.error > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
