/**
 * Firestore -> Supabase collection importer (STUB).
 *
 * Waiting on Alex's Firestore schema dump to finalize the column mappings.
 * This file is the scaffold; fill in the MAPPERS block once we have the
 * actual collection shapes.
 *
 * Input: JSON dump per collection, e.g.:
 *   firestore-export/
 *     users.json            -> profiles
 *     onboarding.json       -> onboarding_answers
 *     profile.json          -> profiles (merge)
 *     progress.json         -> oases_progress
 *
 * Usage:
 *   npx tsx scripts/migrations/firebase-to-supabase/import-firestore.ts \
 *     --input ./firestore-export \
 *     [--dry-run] [--collection onboarding]
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { readFile, readdir } from "node:fs/promises";
import { parseArgs } from "node:util";
import { config } from "dotenv";
import { resolve, join } from "node:path";

config({ path: resolve(process.cwd(), ".env.local") });

type FirestoreDoc = Record<string, unknown> & { id?: string };

type Mapper = {
  table: string;
  uniqueOn: string;
  transform: (doc: FirestoreDoc) => Record<string, unknown> | null;
};

/**
 * MAPPERS -- fill in once Alex delivers the Firestore schema dump.
 *
 * Expected collections (per Julian's original email to Alex):
 *   - onboarding answers
 *   - profile
 *   - progress
 *
 * Map each to a Supabase table. Return null from `transform` to skip.
 */
const MAPPERS: Record<string, Mapper> = {
  onboarding: {
    table: "onboarding_answers",
    uniqueOn: "user_id",
    transform: (_doc) => {
      // TODO(alex): map onboarding doc fields once schema dump lands.
      // Example:
      // return {
      //   user_id: doc.uid,
      //   stage: doc.stage,
      //   challenges: doc.challenges ?? [],
      //   co_founder: doc.coFounder ?? null,
      //   company_name: doc.companyName ?? null,
      //   created_at: doc.createdAt,
      // };
      return null;
    },
  },
  profile: {
    table: "profiles",
    uniqueOn: "id",
    transform: (_doc) => {
      // TODO(alex): merge fields into profiles row (already upserted by
      // import-users.ts). Return only the *additional* fields from Firestore.
      return null;
    },
  },
  progress: {
    table: "oases_progress",
    uniqueOn: "user_id",
    transform: (_doc) => {
      // TODO(alex): map progress.stage, progress.completedAt, progress.currentStep
      return null;
    },
  },
};

type Args = {
  input: string;
  dryRun: boolean;
  collection: string | undefined;
};

function parseCliArgs(): Args {
  const { values } = parseArgs({
    options: {
      input: { type: "string" },
      "dry-run": { type: "boolean", default: false },
      collection: { type: "string" },
    },
  });
  if (!values.input) {
    console.error(
      "Missing --input <path-to-firestore-export-dir> (a dir containing <collection>.json files)"
    );
    process.exit(1);
  }
  return {
    input: values.input,
    dryRun: values["dry-run"] ?? false,
    collection: values.collection,
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

async function loadCollection(dir: string, name: string): Promise<FirestoreDoc[]> {
  const raw = await readFile(join(dir, `${name}.json`), "utf-8");
  const parsed = JSON.parse(raw);
  if (Array.isArray(parsed)) return parsed;
  if (parsed && typeof parsed === "object") {
    return Object.entries(parsed).map(([id, v]) => ({
      id,
      ...(v as object),
    }));
  }
  throw new Error(`Unexpected shape in ${name}.json`);
}

async function importCollection(
  db: SupabaseClient,
  name: string,
  mapper: Mapper,
  docs: FirestoreDoc[],
  dryRun: boolean
) {
  const rows = docs.map((d) => mapper.transform(d)).filter((r) => r !== null) as Record<
    string,
    unknown
  >[];

  if (rows.length === 0) {
    console.log(`  ${name}: mapper returned 0 rows (transform not implemented?)`);
    return;
  }

  if (dryRun) {
    console.log(`  [DRY] ${name} -> ${mapper.table}: ${rows.length} rows`);
    console.log("    sample:", JSON.stringify(rows[0], null, 2).slice(0, 400));
    return;
  }

  const { error } = await db
    .from(mapper.table)
    .upsert(rows, { onConflict: mapper.uniqueOn });

  if (error) {
    console.error(`  ${name} upsert failed: ${error.message}`);
    return;
  }
  console.log(`  ${name} -> ${mapper.table}: ${rows.length} rows upserted`);
}

async function main() {
  const args = parseCliArgs();
  const db = makeClient();

  const available = await readdir(args.input);
  const collections = Object.keys(MAPPERS).filter(
    (k) =>
      available.includes(`${k}.json`) &&
      (!args.collection || args.collection === k)
  );

  console.log(
    `Importing ${collections.length} collections ${args.dryRun ? "(DRY RUN)" : ""}`
  );

  for (const name of collections) {
    const docs = await loadCollection(args.input, name);
    await importCollection(db, name, MAPPERS[name], docs, args.dryRun);
  }

  console.log("\nDone.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
