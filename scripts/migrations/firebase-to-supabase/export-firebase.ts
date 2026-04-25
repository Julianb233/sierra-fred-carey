/**
 * Export Firebase Auth users + every **root** Firestore collection to JSON.
 * Subcollections (e.g. users/{uid}/chat) are NOT exported here; use
 * scan-firestore-subcollections.ts and import-firestore-chat-to-supabase.ts.
 *
 * Uses firebase-admin with the service account key. Output goes to
 * scripts/migrations/firebase-to-supabase/_data/ (gitignored).
 *
 * Usage:
 *   npx tsx scripts/migrations/firebase-to-supabase/export-firebase.ts
 *   npx tsx scripts/migrations/firebase-to-supabase/export-firebase.ts --auth-only
 *   npx tsx scripts/migrations/firebase-to-supabase/export-firebase.ts --firestore-only
 *   npx tsx scripts/migrations/firebase-to-supabase/export-firebase.ts --collection onboarding
 *
 * Env:
 *   FIREBASE_SERVICE_ACCOUNT_PATH  default: _data/firebase-service-account.json
 */

import { cert, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { parseArgs } from "node:util";
import { resolve, dirname, join } from "node:path";

const HERE = dirname(new URL(import.meta.url).pathname);
const DATA_DIR = join(HERE, "_data");
const DEFAULT_SA = join(DATA_DIR, "firebase-service-account.json");

type Args = {
  authOnly: boolean;
  firestoreOnly: boolean;
  collection: string | undefined;
  serviceAccount: string;
};

function parseCliArgs(): Args {
  const { values } = parseArgs({
    options: {
      "auth-only": { type: "boolean", default: false },
      "firestore-only": { type: "boolean", default: false },
      collection: { type: "string" },
      "service-account": { type: "string" },
    },
  });
  return {
    authOnly: values["auth-only"] ?? false,
    firestoreOnly: values["firestore-only"] ?? false,
    collection: values.collection,
    serviceAccount:
      values["service-account"] ??
      process.env.FIREBASE_SERVICE_ACCOUNT_PATH ??
      DEFAULT_SA,
  };
}

async function initFirebase(saPath: string) {
  const raw = await readFile(resolve(saPath), "utf-8");
  const sa = JSON.parse(raw);
  initializeApp({
    credential: cert({
      projectId: sa.project_id,
      clientEmail: sa.client_email,
      privateKey: sa.private_key,
    }),
    projectId: sa.project_id,
  });
  return sa.project_id as string;
}

async function exportAuth() {
  const auth = getAuth();
  const users: unknown[] = [];
  let pageToken: string | undefined;
  do {
    const page = await auth.listUsers(1000, pageToken);
    for (const u of page.users) {
      users.push({
        localId: u.uid,
        email: u.email,
        emailVerified: u.emailVerified,
        displayName: u.displayName,
        photoUrl: u.photoURL,
        disabled: u.disabled,
        createdAt: u.metadata.creationTime
          ? String(new Date(u.metadata.creationTime).getTime())
          : undefined,
        lastSignedInAt: u.metadata.lastSignInTime
          ? String(new Date(u.metadata.lastSignInTime).getTime())
          : undefined,
        passwordHash: u.passwordHash,
        salt: u.passwordSalt,
        providerUserInfo: u.providerData.map((p) => ({
          providerId: p.providerId,
          rawId: p.uid,
          email: p.email,
          displayName: p.displayName,
          photoUrl: p.photoURL,
        })),
        customAttributes: u.customClaims
          ? JSON.stringify(u.customClaims)
          : undefined,
      });
    }
    pageToken = page.pageToken;
  } while (pageToken);

  const out = join(DATA_DIR, "firebase-users.json");
  await writeFile(out, JSON.stringify(users, null, 2), "utf-8");
  console.log(`auth: wrote ${users.length} users to ${out}`);
  return users.length;
}

// Recursively normalize Firestore values -> plain JSON (Timestamps -> ISO, refs -> paths, etc.)
function normalize(v: unknown): unknown {
  if (v === null || v === undefined) return v;
  if (v instanceof Timestamp) return v.toDate().toISOString();
  if (v instanceof Date) return v.toISOString();
  if (Array.isArray(v)) return v.map(normalize);
  if (typeof v === "object") {
    // DocumentReference duck-type
    const maybeRef = v as { _path?: unknown; path?: unknown };
    if (maybeRef.path && typeof maybeRef.path === "string") {
      return { __ref: maybeRef.path };
    }
    if (maybeRef._path) return { __ref: String(maybeRef._path) };
    const out: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
      out[k] = normalize(val);
    }
    return out;
  }
  return v;
}

async function exportFirestore(onlyCollection?: string) {
  const db = getFirestore();
  const outDir = join(DATA_DIR, "firestore-export");
  await mkdir(outDir, { recursive: true });

  const root = await db.listCollections();
  const collections = onlyCollection
    ? root.filter((c) => c.id === onlyCollection)
    : root;

  if (collections.length === 0) {
    console.log("firestore: no collections matched");
    return { collections: 0, docs: 0 };
  }

  const summary: Record<string, { docs: number; sampleKeys: string[] }> = {};
  let totalDocs = 0;

  for (const col of collections) {
    const snap = await col.get();
    const docs: Record<string, unknown>[] = [];
    const keyCounts = new Map<string, number>();
    for (const d of snap.docs) {
      const data = normalize(d.data()) as Record<string, unknown>;
      docs.push({ id: d.id, ...data });
      for (const k of Object.keys(data)) {
        keyCounts.set(k, (keyCounts.get(k) ?? 0) + 1);
      }
    }
    const file = join(outDir, `${col.id}.json`);
    await writeFile(file, JSON.stringify(docs, null, 2), "utf-8");
    const sampleKeys = [...keyCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([k, c]) => `${k}(${c})`);
    summary[col.id] = { docs: docs.length, sampleKeys };
    totalDocs += docs.length;
    console.log(
      `firestore: ${col.id} -> ${file} (${docs.length} docs, keys: ${sampleKeys
        .slice(0, 10)
        .join(", ")}${sampleKeys.length > 10 ? ", ..." : ""})`
    );
  }

  await writeFile(
    join(outDir, "_summary.json"),
    JSON.stringify(summary, null, 2),
    "utf-8"
  );
  console.log(
    `firestore: ${collections.length} collections, ${totalDocs} total docs`
  );
  return { collections: collections.length, docs: totalDocs };
}

async function main() {
  const args = parseCliArgs();
  await mkdir(DATA_DIR, { recursive: true });
  const projectId = await initFirebase(args.serviceAccount);
  console.log(`firebase project: ${projectId}\n`);

  if (!args.firestoreOnly) await exportAuth();
  if (!args.authOnly) await exportFirestore(args.collection);
  console.log("\nexport done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
