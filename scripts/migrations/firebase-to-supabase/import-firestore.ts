/**
 * Firestore -> Supabase collection importer.
 *
 * Discovered on 2026-04-21 after running export-firebase.ts against the live
 * sahara-6800a project: the Firebase app has ONE root collection, `users`,
 * keyed by firebase_uid, with onboarding + profile fields stored flat on the
 * doc. Chat messages live in a **subcollection** `users/{uid}/chat/{docId}` —
 * they are NOT in the root export JSON; import them with
 * `import-firestore-chat-to-supabase.ts`. There are no separate root
 * `onboarding` / `profile` / `progress` collections (which the original scaffold
 * assumed). There is no progress data at all -- `oases_progress` will be left
 * untouched for the migration.
 *
 * Mapping (Firebase users doc -> Supabase profiles row):
 *   name              -> name
 *   email             -> email
 *   stage             -> stage  (raw free-text; may be '')
 *   stageCategory     -> oases_stage  (bucketed into clarity|validation|build|launch|grow)
 *                                      AND stage_category (raw, since 2026-04-24)
 *   weakSpotCategory  -> weak_spot_category (since 2026-04-24)
 *                        AND challenges[0].category (jsonb, legacy)
 *   weakSpot          -> weak_spot (since 2026-04-24)
 *                        AND challenges[0].description (jsonb, legacy)
 *   ideaName          -> company_name
 *   ideaPitch         -> product_positioning (live since 2026-04-24 migration)
 *   hasPartners       -> has_partners (bool, since 2026-04-24)
 *                        AND co_founder='Yes - details pending onboarding'|'No' (legacy text)
 *   targetMarket      -> target_market (since 2026-04-24)
 *   location          -> location (since 2026-04-24)
 *   phone             -> phone (since 2026-04-24)
 *   ideaStatus        -> idea_status (since 2026-04-24)
 *   passions          -> passions (since 2026-04-24)
 *   createdAt         -> created_at (only when ISO-parseable)
 *   <every raw field> -> enrichment_data.firebase_raw.<field>  (lossless archive)
 *
 * onboarding_completed is set true when the user provided their idea and
 * target market (ideaName + ideaPitch + targetMarket all present).
 *
 * Usage:
 *   npx tsx scripts/migrations/firebase-to-supabase/import-firestore.ts \
 *     --input ./scripts/migrations/firebase-to-supabase/_data/firestore-export \
 *     [--dry-run] [--collection users] [--limit 10]
 *
 * After root Firestore JSON exists, run import-firestore-subcollections.ts to
 * pull users/{uid}/{roadmap,mentor,discovery,scores} into profiles, then
 * bridge-roadmap-to-startup-process.ts (or bridge-all-firebase-to-supabase.ts).
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
  // May return one row, many rows, or null. null means "skip this doc".
  transform: (
    doc: FirestoreDoc,
    ctx: MapperContext
  ) => Record<string, unknown> | Record<string, unknown>[] | null;
};

type MapperContext = {
  resolveUserId: (firebaseUid: string) => string | undefined;
};

function nonEmpty(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

function bucketOasesStage(stageCategory: unknown): string {
  if (!nonEmpty(stageCategory)) return "clarity";
  const s = stageCategory.toLowerCase();
  if (s.startsWith("pre-ide") || s.startsWith("ide") || s === "idea") return "clarity";
  if (s.startsWith("pre-seed")) return "validation";
  if (s === "seed") return "build";
  if (s.includes("series") || s === "startup") return "launch";
  if (s.includes("growth") || s.includes("scale")) return "grow";
  return "clarity";
}

function parseFirestoreDate(v: unknown): string | null {
  if (!v) return null;
  if (typeof v === "string") {
    const d = new Date(v);
    if (!Number.isNaN(d.getTime())) return d.toISOString();
  }
  return null;
}

/**
 * MAPPERS -- one entry per root Firestore collection we care about.
 *
 * Only `users` exists in this project. The onboarding/profile/progress
 * collections from the original scaffold were never created in Firebase.
 */
const MAPPERS: Record<string, Mapper> = {
  users: {
    table: "profiles",
    uniqueOn: "id",
    transform: (doc, ctx) => {
      const firebaseUid = (doc.id as string) ?? null;
      if (!firebaseUid) return null;

      const supabaseId = ctx.resolveUserId(firebaseUid);
      if (!supabaseId) {
        // No Supabase auth.users row exists for this firebase_uid yet -- likely
        // import-users.ts hasn't been run, or this user failed to import (no
        // email). Skip rather than create an orphan.
        return null;
      }

      const weakSpotCategory = nonEmpty(doc.weakSpotCategory)
        ? String(doc.weakSpotCategory)
        : null;
      const weakSpot = nonEmpty(doc.weakSpot) ? String(doc.weakSpot) : null;

      // profiles.challenges is jsonb of array. Pack weakSpot as one entry.
      const challenges =
        weakSpotCategory || weakSpot
          ? [
              {
                category: weakSpotCategory,
                description: weakSpot,
                source: "firebase",
              },
            ]
          : [];

      const hasPartners =
        doc.hasPartners === true
          ? true
          : doc.hasPartners === false
            ? false
            : null;

      const coFounder =
        hasPartners === true
          ? "Yes - details pending onboarding"
          : hasPartners === false
            ? "No"
            : null;

      const onboardingCompleted =
        nonEmpty(doc.ideaName) &&
        nonEmpty(doc.ideaPitch) &&
        nonEmpty(doc.targetMarket);

      const enrichmentData: Record<string, unknown> = {
        stage_category: doc.stageCategory ?? null,
        target_market: doc.targetMarket ?? null,
        location: doc.location ?? null,
        phone: doc.phone ?? null,
        idea_status: doc.ideaStatus ?? null,
        idea_pitch: doc.ideaPitch ?? null,
        passions: doc.passions ?? null,
        firebase_uid: firebaseUid,
        firebase_raw: doc,
        imported_at: new Date().toISOString(),
      };

      const created = parseFirestoreDate(doc.createdAt);

      const row: Record<string, unknown> = {
        id: supabaseId,
        email: nonEmpty(doc.email) ? String(doc.email) : undefined,
        name: nonEmpty(doc.name) ? String(doc.name) : undefined,
        stage: nonEmpty(doc.stage) ? String(doc.stage) : null,
        oases_stage: bucketOasesStage(doc.stageCategory),
        stage_category: nonEmpty(doc.stageCategory) ? String(doc.stageCategory) : null,
        weak_spot: nonEmpty(doc.weakSpot) ? String(doc.weakSpot) : null,
        weak_spot_category: nonEmpty(doc.weakSpotCategory) ? String(doc.weakSpotCategory) : null,
        challenges,
        company_name: nonEmpty(doc.ideaName) ? String(doc.ideaName) : null,
        product_positioning: nonEmpty(doc.ideaPitch) ? String(doc.ideaPitch) : null,
        target_market: nonEmpty(doc.targetMarket) ? String(doc.targetMarket) : null,
        location: nonEmpty(doc.location) ? String(doc.location) : null,
        phone: nonEmpty(doc.phone) ? String(doc.phone) : null,
        idea_status: nonEmpty(doc.ideaStatus) ? String(doc.ideaStatus) : null,
        passions: nonEmpty(doc.passions) ? String(doc.passions) : null,
        has_partners: hasPartners,
        co_founder: coFounder,
        enrichment_data: enrichmentData,
        enrichment_source: "firebase_migration_2026_04_21",
        enriched_at: new Date().toISOString(),
        onboarding_completed: onboardingCompleted,
        updated_at: new Date().toISOString(),
      };
      if (created) row.created_at = created;
      // Strip undefined so upsert doesn't null-out columns set by import-users.
      for (const k of Object.keys(row)) {
        if (row[k] === undefined) delete row[k];
      }
      return row;
    },
  },
};

type Args = {
  input: string;
  dryRun: boolean;
  collection: string | undefined;
  limit: number | undefined;
};

function parseCliArgs(): Args {
  const { values } = parseArgs({
    options: {
      input: { type: "string" },
      "dry-run": { type: "boolean", default: false },
      collection: { type: "string" },
      limit: { type: "string" },
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

/**
 * Build an index of firebase_uid -> Supabase auth.users.id by paging through
 * auth.admin.listUsers() and reading raw_user_meta_data.firebase_uid.
 */
async function buildFirebaseUidIndex(
  db: SupabaseClient
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  let page = 1;
  // Supabase admin API caps perPage at 1000; default 50. Ask for max.
  while (true) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    for (const u of data.users) {
      const meta = (u.user_metadata ?? {}) as Record<string, unknown>;
      const fbuid = meta.firebase_uid;
      if (typeof fbuid === "string" && fbuid.length > 0) {
        map.set(fbuid, u.id);
      }
    }
    if (data.users.length < 1000) break;
    page += 1;
  }
  return map;
}

async function importCollection(
  db: SupabaseClient,
  name: string,
  mapper: Mapper,
  docs: FirestoreDoc[],
  ctx: MapperContext,
  dryRun: boolean,
  limit?: number
) {
  const slice = limit ? docs.slice(0, limit) : docs;
  const rows: Record<string, unknown>[] = [];
  let skippedNoUid = 0;
  let skippedNullTransform = 0;

  for (const d of slice) {
    const out = mapper.transform(d, ctx);
    if (out === null) {
      if (d.id && !ctx.resolveUserId(d.id as string)) {
        skippedNoUid += 1;
      } else {
        skippedNullTransform += 1;
      }
      continue;
    }
    if (Array.isArray(out)) rows.push(...out);
    else rows.push(out);
  }

  console.log(
    `  ${name}: ${slice.length} docs -> ${rows.length} ${mapper.table} rows ` +
      `(skipped: ${skippedNoUid} no supabase user, ${skippedNullTransform} null transform)`
  );

  if (rows.length === 0) return { rows: 0, errors: 0 };

  if (dryRun) {
    console.log(`  [DRY] would upsert into ${mapper.table}. Sample row:`);
    console.log(JSON.stringify(rows[0], null, 2));
    return { rows: rows.length, errors: 0 };
  }

  // Upsert in chunks of 100 to stay under request size limits.
  const CHUNK = 100;
  let errors = 0;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    const { error } = await db
      .from(mapper.table)
      .upsert(chunk, { onConflict: mapper.uniqueOn });
    if (error) {
      console.error(`  ${name} upsert chunk ${i}-${i + chunk.length} failed: ${error.message}`);
      errors += chunk.length;
    }
  }
  console.log(`  ${name} -> ${mapper.table}: ${rows.length - errors} rows upserted, ${errors} errors`);
  return { rows: rows.length, errors };
}

async function main() {
  const args = parseCliArgs();
  const db = makeClient();

  console.log("Building firebase_uid -> supabase_id index from auth.users...");
  const uidIndex = await buildFirebaseUidIndex(db);
  console.log(`  indexed ${uidIndex.size} users with firebase_uid metadata\n`);

  const ctx: MapperContext = {
    resolveUserId: (fbuid) => uidIndex.get(fbuid),
  };

  const available = await readdir(args.input);
  const collections = Object.keys(MAPPERS).filter(
    (k) =>
      available.includes(`${k}.json`) &&
      (!args.collection || args.collection === k)
  );

  console.log(
    `Importing ${collections.length} collections ${args.dryRun ? "(DRY RUN)" : ""}`
  );

  let totalErrors = 0;
  for (const name of collections) {
    const docs = await loadCollection(args.input, name);
    const { errors } = await importCollection(
      db,
      name,
      MAPPERS[name],
      docs,
      ctx,
      args.dryRun,
      args.limit
    );
    totalErrors += errors;
  }

  console.log(`\nDone. errors=${totalErrors}`);
  process.exit(totalErrors > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
