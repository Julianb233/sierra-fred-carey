/**
 * Import legacy Firestore chat from users/{firebaseUid}/chat/{docId}
 * into public.fred_episodic_memory.
 *
 * Root Firestore export misses subcollections; chat lives here (e.g. 57 users
 * in sahara-6800a).
 *
 * Env:
 *   FIREBASE_SERVICE_ACCOUNT_PATH (default: _data/firebase-service-account.json)
 *   SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   DATABASE_URL
 *
 * Usage:
 *   npx tsx scripts/migrations/firebase-to-supabase/import-firestore-chat-to-supabase.ts --dry-run
 *   npx tsx scripts/migrations/firebase-to-supabase/import-firestore-chat-to-supabase.ts
 */

import { cert, initializeApp } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import postgres from "postgres";
import { parseArgs } from "node:util";
import { dirname, join, resolve } from "node:path";

const HERE = dirname(new URL(import.meta.url).pathname);
const DATA_DIR = join(HERE, "_data");
const DEFAULT_SA = join(DATA_DIR, "firebase-service-account.json");

const SESSION_NAMESPACE = "6ba7b812-9dad-11d1-80b4-00c04fd430c8";

type Args = {
  dryRun: boolean;
  limitUsers: number | undefined;
  limitMessages: number | undefined;
  serviceAccount: string;
};

function parseCliArgs(): Args {
  const { values } = parseArgs({
    options: {
      "dry-run": { type: "boolean", default: false },
      "limit-users": { type: "string" },
      "limit-messages": { type: "string" },
      "service-account": { type: "string" },
    },
  });
  return {
    dryRun: values["dry-run"] ?? false,
    limitUsers: values["limit-users"] ? Number(values["limit-users"]) : undefined,
    limitMessages: values["limit-messages"]
      ? Number(values["limit-messages"])
      : undefined,
    serviceAccount:
      values["service-account"] ??
      process.env.FIREBASE_SERVICE_ACCOUNT_PATH ??
      DEFAULT_SA,
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

function supabaseUrl(): string {
  const v = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!v) {
    console.error("Missing SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL");
    process.exit(1);
  }
  return v;
}

function makeSupabase(): SupabaseClient {
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

function parseCreatedAt(v: unknown): Date {
  if (v instanceof Timestamp) return v.toDate();
  if (v && typeof v === "object") {
    const s = (v as { _seconds?: number })._seconds;
    if (typeof s === "number") return new Date(s * 1000);
  }
  if (typeof v === "string") {
    const d = new Date(v);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return new Date();
}

function normalizeRole(r: unknown): "user" | "assistant" | null {
  if (r === "user" || r === "assistant") return r;
  return null;
}

function contentHash(role: string, content: string): string {
  return createHash("md5")
    .update(`conversation:${role}:${content}`, "utf8")
    .digest("hex");
}

async function main() {
  const args = parseCliArgs();
  const saRaw = await readFile(resolve(args.serviceAccount), "utf-8");
  const sa = JSON.parse(saRaw);
  initializeApp({
    credential: cert({
      projectId: sa.project_id,
      clientEmail: sa.client_email,
      privateKey: sa.private_key,
    }),
    projectId: sa.project_id,
  });

  const supabase = makeSupabase();
  const sql = postgres(mustEnv("DATABASE_URL"));

  console.log(`Firebase project: ${sa.project_id}`);
  console.log(`Supabase URL: ${supabaseUrl()}`);
  console.log("Building firebase_uid -> supabase user id index...");
  const uidIndex = await buildFirebaseUidIndex(supabase);
  console.log(`  indexed ${uidIndex.size} users with firebase_uid metadata\n`);

  const firestore = getFirestore();
  const usersSnap = await firestore.collection("users").get();

  const sessionCache = new Map<string, string>();
  async function sessionIdForFirebaseUid(firebaseUid: string): Promise<string> {
    const hit = sessionCache.get(firebaseUid);
    if (hit) return hit;
    const [row] = await sql<{ session_id: string }[]>`
      select extensions.uuid_generate_v5(
        ${SESSION_NAMESPACE}::uuid,
        ${firebaseUid + "|firestore-chat"}
      )::text as session_id
    `;
    sessionCache.set(firebaseUid, row.session_id);
    return row.session_id;
  }

  let usersScanned = 0;
  let usersWithChat = 0;
  let messagesSeen = 0;
  let messagesEligible = 0;
  let skippedNoSupabaseUser = 0;
  let skippedBadRole = 0;
  let skippedEmpty = 0;

  type Row = {
    userId: string;
    sessionId: string;
    role: "user" | "assistant";
    content: string;
    hash: string;
    createdAt: Date;
    metadata: Record<string, unknown>;
  };
  const pending: Row[] = [];

  const msgLimit = args.limitMessages ?? Number.POSITIVE_INFINITY;

  const userDocs =
    args.limitUsers !== undefined
      ? usersSnap.docs.slice(0, args.limitUsers)
      : usersSnap.docs;

  outer: for (const userDoc of userDocs) {
    usersScanned += 1;

    const firebaseUid = userDoc.id;
    const supabaseUserId = uidIndex.get(firebaseUid);
    if (!supabaseUserId) {
      skippedNoSupabaseUser += 1;
      continue;
    }

    const chatSnap = await userDoc.ref.collection("chat").get();
    if (chatSnap.empty) continue;
    usersWithChat += 1;

    const sessionId = await sessionIdForFirebaseUid(firebaseUid);

    for (const c of chatSnap.docs) {
      if (messagesSeen >= msgLimit) break outer;
      messagesSeen += 1;

      const data = c.data() as Record<string, unknown>;
      const role = normalizeRole(data.role);
      const content =
        typeof data.content === "string" ? data.content.trim() : "";
      if (!role) {
        skippedBadRole += 1;
        continue;
      }
      if (!content) {
        skippedEmpty += 1;
        continue;
      }

      messagesEligible += 1;
      pending.push({
        userId: supabaseUserId,
        sessionId,
        role,
        content,
        hash: contentHash(role, content),
        createdAt: parseCreatedAt(data.createdAt),
        metadata: {
          source: "firebase_firestore_chat_backfill",
          firebase_uid: firebaseUid,
          firestore_doc_id: c.id,
          firestore_path: c.ref.path,
        },
      });
    }
  }

  console.log(
    JSON.stringify(
      {
        firestoreUsersInCollection: usersSnap.size,
        usersScannedCap: usersScanned,
        usersWithChatSubcollection: usersWithChat,
        messagesSeenCap: messagesSeen,
        messagesEligibleForInsert: messagesEligible,
        skippedNoSupabaseUser,
        skippedBadRole,
        skippedEmpty,
        dryRun: args.dryRun,
      },
      null,
      2
    )
  );

  if (args.dryRun) {
    console.log("\n[DRY RUN] First 2 pending rows (content truncated):");
    for (const r of pending.slice(0, 2)) {
      console.log(
        JSON.stringify(
          {
            userId: r.userId,
            sessionId: r.sessionId,
            role: r.role,
            hash: r.hash,
            content: r.content.slice(0, 120) + (r.content.length > 120 ? "…" : ""),
          },
          null,
          2
        )
      );
    }
    await sql.end();
    return;
  }

  let attempted = 0;
  for (const r of pending) {
    await sql`
      insert into public.fred_episodic_memory (
        user_id,
        session_id,
        event_type,
        content,
        content_hash,
        importance_score,
        created_at,
        metadata,
        channel
      )
      values (
        ${r.userId}::uuid,
        ${r.sessionId}::uuid,
        ${"conversation"},
        ${sql.json({ role: r.role, content: r.content })},
        ${r.hash},
        ${0.35},
        ${r.createdAt.toISOString()}::timestamptz,
        ${sql.json(r.metadata)},
        ${"chat"}
      )
      on conflict (user_id, session_id, content_hash)
        where content_hash is not null
      do nothing
    `;
    attempted += 1;
    if (attempted % 500 === 0) {
      console.log(`  inserted batch progress: ${attempted}/${pending.length}`);
    }
  }

  console.log(`\nDone. Attempted inserts: ${attempted}`);
  await sql.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
