/**
 * Import Firestore **subcollections** under users/{firebaseUid} into
 * profiles.enrichment_data.firebase_subcollections — the shape expected by
 * bridge-roadmap-to-startup-process.ts (roadmap, mentor, discovery, scores).
 *
 * Root export-firebase.ts does not include subcollections; chat transcripts are
 * handled separately by import-firestore-chat-to-supabase.ts.
 *
 * Env:
 *   FIREBASE_SERVICE_ACCOUNT_PATH (default: _data/firebase-service-account.json)
 *   SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Usage:
 *   npx tsx scripts/migrations/firebase-to-supabase/import-firestore-subcollections.ts --dry-run
 *   npx tsx scripts/migrations/firebase-to-supabase/import-firestore-subcollections.ts
 */

import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore, Timestamp, type Firestore } from "firebase-admin/firestore";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { readFile } from "node:fs/promises";
import { parseArgs } from "node:util";
import { dirname, join, resolve } from "node:path";

const HERE = dirname(new URL(import.meta.url).pathname);
const DATA_DIR = join(HERE, "_data");
const DEFAULT_SA = join(DATA_DIR, "firebase-service-account.json");

const SUBCOLLECTIONS = ["roadmap", "mentor", "discovery", "scores"] as const;

function normalizeValue(v: unknown): unknown {
  if (v === null || v === undefined) return v;
  if (v instanceof Timestamp) return v.toDate().toISOString();
  if (v instanceof Date) return v.toISOString();
  if (Array.isArray(v)) return v.map(normalizeValue);
  if (typeof v === "object") {
    const maybeRef = v as { path?: string; _path?: unknown };
    if (typeof maybeRef.path === "string") return { __ref: maybeRef.path };
    if (maybeRef._path) return { __ref: String(maybeRef._path) };
    const out: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
      out[k] = normalizeValue(val);
    }
    return out;
  }
  return v;
}

function mustEnv(k: string): string {
  const v = process.env[k];
  if (!v) {
    console.error(`Missing env: ${k}`);
    process.exit(1);
  }
  return v;
}

function supabaseUrl(): string {
  const v = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!v) {
    console.error("Missing SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL");
    process.exit(1);
  }
  return v;
}

function makeClient(): SupabaseClient {
  return createClient(supabaseUrl(), mustEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function buildFirebaseUidIndex(db: SupabaseClient): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  let page = 1;
  while (true) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    for (const u of data.users) {
      const meta = (u.user_metadata ?? {}) as Record<string, unknown>;
      const fb = meta.firebase_uid;
      if (typeof fb === "string" && fb.length > 0) map.set(fb, u.id);
    }
    if (data.users.length < 1000) break;
    page += 1;
  }
  return map;
}

async function loadSubcollectionDocs(
  db: Firestore,
  firebaseUid: string,
  name: (typeof SUBCOLLECTIONS)[number]
): Promise<Record<string, unknown>[]> {
  const snap = await db.collection("users").doc(firebaseUid).collection(name).get();
  const out: Record<string, unknown>[] = [];
  for (const d of snap.docs) {
    const raw = normalizeValue(d.data()) as Record<string, unknown>;
    out.push({
      _doc_id: d.id,
      ...raw,
    });
  }
  return out;
}

async function main() {
  const { values } = parseArgs({
    options: {
      "dry-run": { type: "boolean", default: false },
      "service-account": { type: "string" },
      "limit-users": { type: "string" },
    },
  });
  const dryRun = values["dry-run"] ?? false;
  const saPath =
    values["service-account"] ??
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH ??
    DEFAULT_SA;
  const limitUsers = values["limit-users"] ? Number(values["limit-users"]) : undefined;

  const sa = JSON.parse(await readFile(resolve(saPath), "utf-8"));
  if (getApps().length === 0) {
    initializeApp({
      credential: cert({
        projectId: sa.project_id,
        clientEmail: sa.client_email,
        privateKey: sa.private_key,
      }),
      projectId: sa.project_id,
    });
  }

  const supabase = makeClient();
  const uidIndex = await buildFirebaseUidIndex(supabase);
  console.log(`Firebase project: ${sa.project_id}`);
  console.log(`Supabase: ${supabaseUrl()}`);
  console.log(`firebase_uid index size: ${uidIndex.size}\n`);

  const firestore = getFirestore();
  let userDocs = (await firestore.collection("users").get()).docs;
  if (limitUsers !== undefined) userDocs = userDocs.slice(0, limitUsers);

  let updated = 0;
  let skippedNoUser = 0;
  let skippedEmpty = 0;
  const tally: Record<string, number> = {
    roadmap: 0,
    mentor: 0,
    discovery: 0,
    scores: 0,
  };

  for (const doc of userDocs) {
    const firebaseUid = doc.id;
    const supabaseUserId = uidIndex.get(firebaseUid);
    if (!supabaseUserId) {
      skippedNoUser += 1;
      continue;
    }

    const firebase_subcollections: Record<string, unknown> = {};

    for (const name of SUBCOLLECTIONS) {
      const rows = await loadSubcollectionDocs(firestore, firebaseUid, name);
      if (rows.length > 0) {
        firebase_subcollections[name] = rows;
        tally[name] += 1;
      }
    }

    if (Object.keys(firebase_subcollections).length === 0) {
      skippedEmpty += 1;
      continue;
    }

    firebase_subcollections.imported_at = new Date().toISOString();
    firebase_subcollections.import_source = "import-firestore-subcollections.ts";

    const { data: prof, error: readErr } = await supabase
      .from("profiles")
      .select("id, enrichment_data")
      .eq("id", supabaseUserId)
      .maybeSingle();

    if (readErr) {
      console.error(`  read ${firebaseUid}: ${readErr.message}`);
      continue;
    }
    if (!prof) {
      console.error(`  no profile row for supabase user ${supabaseUserId} (firebase ${firebaseUid})`);
      continue;
    }

    const enr = {
      ...((prof.enrichment_data as Record<string, unknown> | null) ?? {}),
      firebase_subcollections,
    };

    if (dryRun) {
      console.log(
        `[DRY] ${firebaseUid} -> ${supabaseUserId} keys=${Object.keys(firebase_subcollections).join(",")}`
      );
      updated += 1;
      continue;
    }

    const { error: upErr } = await supabase
      .from("profiles")
      .update({
        enrichment_data: enr,
        updated_at: new Date().toISOString(),
      })
      .eq("id", supabaseUserId);

    if (upErr) {
      console.error(`  update ${firebaseUid}: ${upErr.message}`);
      continue;
    }
    updated += 1;
    if (updated % 10 === 0) console.log(`  ... updated ${updated}`);
  }

  console.log(
    JSON.stringify(
      {
        usersInFirestore: userDocs.length,
        profilesUpdated: updated,
        skippedNoSupabaseUser: skippedNoUser,
        skippedNoSubcollectionData: skippedEmpty,
        usersWithDataBySubcollection: tally,
        dryRun,
      },
      null,
      2
    )
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
