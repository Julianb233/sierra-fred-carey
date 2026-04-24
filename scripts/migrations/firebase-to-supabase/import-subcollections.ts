/**
 * Firestore subcollection -> Supabase importer.
 *
 * The Firebase app stored per-user data in subcollections:
 *   /users/{uid}/chat/*       (1003 docs across 57/67 users) - FRED chat history
 *   /users/{uid}/scores/progress (8 docs) - { ideaScore, investorScore, vcBoost, completionPct }
 *   /users/{uid}/roadmap/*    (296 docs across 60/67 users) - card-style roadmap tiles
 *   /users/{uid}/mentor/*     (18 docs) - mentor action items
 *   /users/{uid}/discovery/*  (1 doc) - discovery Q&A answers
 *
 * The export-firebase.ts script dumps each subcollection to a flat array at
 *   _data/firestore-export/subcollections/{name}.json
 * with each row annotated with { _parent_collection, _parent_id, _doc_id, ...data }.
 *
 * Mapping:
 *   chat      -> chat_messages (schema matches: role, content, created_at, user_id, session_id)
 *   scores    -> investor_readiness_scores (overall_score = investorScore, category_scores = full doc)
 *   roadmap   -> profiles.enrichment_data.firebase_subcollections.roadmap (archive, no matching table)
 *   mentor    -> profiles.enrichment_data.firebase_subcollections.mentor (archive)
 *   discovery -> profiles.enrichment_data.firebase_subcollections.discovery (archive)
 *
 * Idempotency:
 *   chat_messages: uniqued on (user_id, session_id, created_at, content) hash. Re-running re-inserts.
 *                  To avoid dupes on re-run, we wipe any rows tagged with
 *                  session_id starting with 'fb-import:' before insert.
 *   investor_readiness_scores: no unique constraint. Wipe rows for user_id with metadata.imported_from='firebase_scores'.
 *   profiles archive: upsert, overwrites enrichment_data.firebase_subcollections.
 *
 * Usage:
 *   npx tsx scripts/migrations/firebase-to-supabase/import-subcollections.ts
 *   npx tsx scripts/migrations/firebase-to-supabase/import-subcollections.ts --dry-run
 *   npx tsx scripts/migrations/firebase-to-supabase/import-subcollections.ts --only chat,scores
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { readFile } from "node:fs/promises";
import { parseArgs } from "node:util";
import { config } from "dotenv";
import { resolve, join } from "node:path";

config({ path: resolve(process.cwd(), ".env.local"), override: true });

const SUBCOL_DIR = "scripts/migrations/firebase-to-supabase/_data/firestore-export/subcollections";

type SubcolRow = {
  _parent_collection: string;
  _parent_id: string; // firebase_uid of owning user
  _doc_id: string;
  [k: string]: unknown;
};

function mustEnv(k: string): string {
  const v = process.env[k];
  if (!v) { console.error(`Missing env: ${k}`); process.exit(1); }
  return v;
}

function makeClient(): SupabaseClient {
  return createClient(
    mustEnv("NEXT_PUBLIC_SUPABASE_URL"),
    mustEnv("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

async function buildFirebaseUidMap(db: SupabaseClient): Promise<Map<string, string>> {
  const m = new Map<string, string>();
  let page = 1;
  while (true) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    for (const u of data.users) {
      const fb = (u.user_metadata as Record<string, unknown> | undefined)?.firebase_uid;
      if (typeof fb === "string") m.set(fb, u.id);
    }
    if (data.users.length < 1000) break;
    page += 1;
  }
  return m;
}

async function load(name: string): Promise<SubcolRow[]> {
  const path = join(SUBCOL_DIR, `${name}.json`);
  try {
    const raw = await readFile(path, "utf-8");
    return JSON.parse(raw) as SubcolRow[];
  } catch (e) {
    console.log(`  ${name}: no export file at ${path}`);
    return [];
  }
}

async function importChat(
  db: SupabaseClient,
  uidMap: Map<string, string>,
  rows: SubcolRow[],
  dryRun: boolean
) {
  console.log(`\n== chat -> chat_messages (${rows.length} docs) ==`);
  // chat_messages.user_id is varchar — we store supabase uuid as string
  const IMPORT_TAG = "fb-import:"; // session_id prefix

  // Build insert rows
  const inserts: Array<{
    user_id: string;
    session_id: string;
    role: string;
    content: string;
    created_at: string | null;
  }> = [];
  let skippedNoUser = 0;
  let skippedNoContent = 0;

  for (const r of rows) {
    const supaId = uidMap.get(r._parent_id);
    if (!supaId) { skippedNoUser++; continue; }
    const role = String(r.role ?? "").trim();
    const content = String(r.content ?? "").trim();
    if (!role || !content) { skippedNoContent++; continue; }

    // Firebase createdAt may be ISO string OR {_seconds, _nanoseconds}
    let createdAt: string | null = null;
    const c = r.createdAt;
    if (typeof c === "string") {
      const d = new Date(c);
      if (!Number.isNaN(d.getTime())) createdAt = d.toISOString();
    } else if (c && typeof c === "object" && "_seconds" in c) {
      const secs = Number((c as Record<string, unknown>)._seconds);
      if (Number.isFinite(secs)) createdAt = new Date(secs * 1000).toISOString();
    }

    inserts.push({
      user_id: supaId,
      session_id: `${IMPORT_TAG}${r._parent_id}`,
      role,
      content,
      created_at: createdAt,
    });
  }

  console.log(`  prepared ${inserts.length} rows (skipped: ${skippedNoUser} no-user, ${skippedNoContent} no-content)`);
  if (dryRun) {
    console.log(`  [DRY] would delete session_id LIKE '${IMPORT_TAG}%' then insert ${inserts.length} rows`);
    console.log(`  [DRY] sample:`, JSON.stringify(inserts[0], null, 2));
    return;
  }

  // Idempotency: delete anything previously imported
  const { error: delErr } = await db.from("chat_messages").delete().like("session_id", `${IMPORT_TAG}%`);
  if (delErr) {
    console.log(`  delete prior imports failed: ${delErr.message} (continuing anyway)`);
  }

  // Chunk inserts
  const CHUNK = 500;
  let inserted = 0, errors = 0;
  for (let i = 0; i < inserts.length; i += CHUNK) {
    const chunk = inserts.slice(i, i + CHUNK);
    const { error } = await db.from("chat_messages").insert(chunk);
    if (error) { errors += chunk.length; console.log(`  chunk ${i} err: ${error.message}`); }
    else inserted += chunk.length;
  }
  console.log(`  inserted ${inserted} chat_messages, ${errors} errors`);
}

async function importScores(
  db: SupabaseClient,
  uidMap: Map<string, string>,
  rows: SubcolRow[],
  dryRun: boolean
) {
  console.log(`\n== scores -> investor_readiness_scores (${rows.length} docs) ==`);

  const inserts: Array<Record<string, unknown>> = [];
  let skipped = 0;
  for (const r of rows) {
    const supaId = uidMap.get(r._parent_id);
    if (!supaId) { skipped++; continue; }
    const ideaScore = Number(r.ideaScore ?? 0);
    const investorScore = Number(r.investorScore ?? 0);
    const vcBoost = Number(r.vcBoost ?? 0);
    const completionPct = Number(r.completionPct ?? 0);
    const updatedAt = typeof r.updatedAt === "string" ? r.updatedAt : new Date().toISOString();

    inserts.push({
      user_id: supaId,
      overall_score: investorScore,
      category_scores: { ideaScore, investorScore, vcBoost, completionPct },
      metadata: {
        firebase_uid: r._parent_id,
        firebase_doc_id: r._doc_id,
        firebase_updated_at: updatedAt,
        imported_from: "firebase_scores",
        imported_at: new Date().toISOString(),
      },
      created_at: updatedAt,
    });
  }
  console.log(`  prepared ${inserts.length} rows (skipped: ${skipped} no-user)`);
  if (dryRun) {
    console.log(`  [DRY] would delete metadata->>imported_from='firebase_scores' then insert ${inserts.length}`);
    if (inserts[0]) console.log(`  [DRY] sample:`, JSON.stringify(inserts[0], null, 2));
    return;
  }

  // Clear prior imports per user
  for (const r of inserts) {
    const { error: delErr } = await db.from("investor_readiness_scores")
      .delete()
      .eq("user_id", r.user_id as string)
      .eq("metadata->>imported_from", "firebase_scores");
    if (delErr) console.log(`  delete prior for ${r.user_id}: ${delErr.message}`);
  }

  const { error } = await db.from("investor_readiness_scores").insert(inserts);
  if (error) console.log(`  insert err: ${error.message}`);
  else console.log(`  inserted ${inserts.length} rows`);
}

async function archiveToProfile(
  db: SupabaseClient,
  uidMap: Map<string, string>,
  bucketName: string,
  rows: SubcolRow[],
  dryRun: boolean
) {
  console.log(`\n== ${bucketName} -> profiles.enrichment_data.firebase_subcollections.${bucketName} (${rows.length} docs) ==`);

  // Group rows by parent firebase_uid
  const byParent = new Map<string, SubcolRow[]>();
  for (const r of rows) {
    const list = byParent.get(r._parent_id) ?? [];
    list.push(r);
    byParent.set(r._parent_id, list);
  }

  let updated = 0, skipped = 0;
  for (const [fbUid, docs] of byParent) {
    const supaId = uidMap.get(fbUid);
    if (!supaId) { skipped++; continue; }

    // Load current enrichment_data
    const { data: prof, error: selErr } = await db.from("profiles").select("enrichment_data").eq("id", supaId).single();
    if (selErr) { console.log(`  skip ${supaId}: select err ${selErr.message}`); continue; }

    const current = (prof?.enrichment_data ?? {}) as Record<string, unknown>;
    const subcols = (current.firebase_subcollections ?? {}) as Record<string, unknown>;
    subcols[bucketName] = docs.map((d) => {
      // Strip the meta keys so the stored blob is clean
      const { _parent_collection, _parent_id, ...rest } = d;
      return rest;
    });
    const next = { ...current, firebase_subcollections: subcols, firebase_subcollections_imported_at: new Date().toISOString() };

    if (dryRun) {
      if (updated === 0) console.log(`  [DRY] sample profile ${supaId}.enrichment_data keys: ${Object.keys(next).join(', ')} (${docs.length} ${bucketName} docs)`);
      updated++;
      continue;
    }

    const { error: upErr } = await db.from("profiles").update({ enrichment_data: next }).eq("id", supaId);
    if (upErr) console.log(`  update ${supaId}: ${upErr.message}`);
    else updated++;
  }
  console.log(`  ${dryRun ? 'would update' : 'updated'} ${updated} profiles, skipped ${skipped}`);
}

async function main() {
  const { values } = parseArgs({
    options: {
      "dry-run": { type: "boolean", default: false },
      only: { type: "string" }, // comma list: chat,scores,roadmap,mentor,discovery
    },
  });
  const dryRun = values["dry-run"] ?? false;
  const only = values.only ? values.only.split(",").map((s) => s.trim()) : null;

  const db = makeClient();
  console.log("Building firebase_uid -> supabase_id index...");
  const uidMap = await buildFirebaseUidMap(db);
  console.log(`  indexed ${uidMap.size} users\n`);

  const tasks: Array<[string, () => Promise<void>]> = [
    ["chat", async () => importChat(db, uidMap, await load("chat"), dryRun)],
    ["scores", async () => importScores(db, uidMap, await load("scores"), dryRun)],
    ["roadmap", async () => archiveToProfile(db, uidMap, "roadmap", await load("roadmap"), dryRun)],
    ["mentor", async () => archiveToProfile(db, uidMap, "mentor", await load("mentor"), dryRun)],
    ["discovery", async () => archiveToProfile(db, uidMap, "discovery", await load("discovery"), dryRun)],
  ];

  for (const [name, run] of tasks) {
    if (only && !only.includes(name)) continue;
    await run();
  }
  console.log("\ndone.");
}

main().catch((e) => { console.error(e); process.exit(1); });
