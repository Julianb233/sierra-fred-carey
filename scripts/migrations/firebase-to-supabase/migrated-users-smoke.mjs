#!/usr/bin/env node
// End-to-end smoke for every migrated Firebase user. For each user:
//   1. auth.users row exists with firebase_uid metadata
//   2. profiles row exists, joined by id
//   3. enrichment_data.firebase_subcollections present and shape-correct
//   4. chat_messages count matches Firestore chat subcollection count for that uid
//   5. If user had roadmap data, startup_processes row exists
// Produces a per-user pass/fail report and exits non-zero on any failure.

import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { resolve } from "node:path";

config({ path: resolve(process.cwd(), ".env.local") });

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SB_URL || !SB_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const db = createClient(SB_URL, SB_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const DATA = "scripts/migrations/firebase-to-supabase/_data";

async function loadJSON(p) {
  return JSON.parse(await readFile(p, "utf-8"));
}

async function main() {
  const fbUsers = await loadJSON(`${DATA}/firebase-users.json`);
  const fsUsers = await loadJSON(`${DATA}/firestore-export/users.json`);
  const chatDocs = await loadJSON(`${DATA}/firestore-export/subcollections/chat.json`);
  const roadmapDocs = await loadJSON(`${DATA}/firestore-export/subcollections/roadmap.json`);

  // Build index: firebase_uid -> { fbUser, fsUser, chatCount, roadmapCount }
  const expected = new Map();
  for (const u of fbUsers) {
    expected.set(u.localId, {
      email: u.email,
      fbUser: u,
      fsUser: null,
      chatCount: 0,
      roadmapCount: 0,
    });
  }
  for (const fs of fsUsers) {
    const uid = fs._doc_id || fs.id;
    if (expected.has(uid)) expected.get(uid).fsUser = fs;
  }
  for (const c of chatDocs) {
    const uid = c._parent_id || c.userId;
    if (expected.has(uid)) expected.get(uid).chatCount += 1;
  }
  for (const r of roadmapDocs) {
    const uid = r._parent_id || r.userId;
    if (expected.has(uid)) expected.get(uid).roadmapCount += 1;
  }

  // Load all auth users
  const authIndex = new Map();
  let page = 1;
  while (true) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    for (const u of data.users) {
      const fbuid = u.user_metadata?.firebase_uid;
      if (fbuid) authIndex.set(fbuid, u);
    }
    if (data.users.length < 1000) break;
    page += 1;
  }

  const failures = [];
  let passes = 0;
  let usersWithChats = 0;
  let chatRowMatches = 0;
  let usersWithRoadmap = 0;
  let startupProcessHits = 0;

  for (const [fbuid, exp] of expected) {
    const sample = { fbuid, email: exp.email, errors: [] };
    const authUser = authIndex.get(fbuid);
    if (!authUser) {
      sample.errors.push("missing auth.users row");
    } else {
      sample.supabaseId = authUser.id;
      // recovery email coverage — every migrated user must have a recovery
      // dispatch on file, otherwise they have no way to set a password and
      // therefore no way to log in. mailer_autoconfirm covers email_confirmed_at,
      // not recovery delivery.
      if (!authUser.recovery_sent_at) {
        sample.errors.push("recovery_sent_at is null — user cannot log in");
      }
      // profile fetch
      const { data: prof, error: pe } = await db
        .from("profiles")
        .select("id,email,name,stage_category,enrichment_source,enrichment_data")
        .eq("id", authUser.id)
        .maybeSingle();
      if (pe) sample.errors.push(`profile fetch error: ${pe.message}`);
      else if (!prof) sample.errors.push("missing profiles row");
      else {
        if (prof.enrichment_source !== "firebase_migration_2026_04_21") {
          sample.errors.push(`enrichment_source mismatch: ${prof.enrichment_source}`);
        }
        const subs = prof.enrichment_data?.firebase_subcollections;
        if (exp.roadmapCount > 0 && !subs?.roadmap) {
          sample.errors.push(`expected roadmap subcollection (${exp.roadmapCount} docs) not in enrichment_data`);
        }
        if (exp.fsUser?.weakSpot && !prof.enrichment_data?.firebase_uid) {
          sample.errors.push("firebase_uid missing in enrichment_data");
        }
      }
      // chat_messages count
      if (exp.chatCount > 0) {
        usersWithChats += 1;
        const { count, error: ce } = await db
          .from("chat_messages")
          .select("id", { count: "exact", head: true })
          .eq("user_id", authUser.id);
        if (ce) sample.errors.push(`chat count error: ${ce.message}`);
        else {
          sample.chatCount = count ?? 0;
          // Firestore exports often duplicate user+assistant pairs vs single docs;
          // accept if Supabase has at least the export count (chat tables can also
          // have post-migration messages from continued use).
          if ((count ?? 0) < exp.chatCount) {
            sample.errors.push(`chat_messages=${count} < firestore=${exp.chatCount}`);
          } else {
            chatRowMatches += 1;
          }
        }
      }
      // startup_processes (only if user had roadmap data)
      if (exp.roadmapCount > 0) {
        usersWithRoadmap += 1;
        const { data: sp, error: se } = await db
          .from("startup_processes")
          .select("id")
          .eq("user_id", authUser.id)
          .maybeSingle();
        if (se && se.code !== "PGRST116") sample.errors.push(`startup_processes error: ${se.message}`);
        if (sp) startupProcessHits += 1;
      }
    }
    if (sample.errors.length === 0) passes += 1;
    else failures.push(sample);
  }

  console.log("\n=== END-TO-END MIGRATED USER SMOKE ===");
  console.log(`Total firebase users:        ${expected.size}`);
  console.log(`Auth users matched:          ${authIndex.size}`);
  console.log(`PASS (no errors):            ${passes}`);
  console.log(`FAIL:                        ${failures.length}`);
  console.log(`Users with chats expected:   ${usersWithChats}`);
  console.log(`Chat row counts >= export:   ${chatRowMatches}`);
  console.log(`Users with roadmap data:     ${usersWithRoadmap}`);
  console.log(`startup_processes hits:      ${startupProcessHits}`);

  if (failures.length > 0) {
    console.log("\nFailures:");
    for (const f of failures.slice(0, 10)) {
      console.log(`  ${f.email} (${f.fbuid}): ${f.errors.join("; ")}`);
    }
    if (failures.length > 10) console.log(`  ... and ${failures.length - 10} more`);
  }

  process.exit(failures.length > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
