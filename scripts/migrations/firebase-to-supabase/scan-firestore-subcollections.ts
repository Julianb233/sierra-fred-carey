/**
 * List Firestore subcollections under each document in a root collection.
 * Root export only lists top-level collections; chat may live under users/{id}/...
 *
 * Usage:
 *   npx tsx scripts/migrations/firebase-to-supabase/scan-firestore-subcollections.ts
 *   npx tsx scripts/migrations/firebase-to-supabase/scan-firestore-subcollections.ts --collection users --limit-docs 20
 */

import { cert, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { readFile } from "node:fs/promises";
import { parseArgs } from "node:util";
import { dirname, join, resolve } from "node:path";

const HERE = dirname(new URL(import.meta.url).pathname);
const DATA_DIR = join(HERE, "_data");
const DEFAULT_SA = join(DATA_DIR, "firebase-service-account.json");

async function main() {
  const { values } = parseArgs({
    options: {
      collection: { type: "string", default: "users" },
      "limit-docs": { type: "string", default: "500" },
      "service-account": { type: "string" },
    },
  });
  const saPath =
    values["service-account"] ??
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH ??
    DEFAULT_SA;
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

  const colId = values.collection ?? "users";
  const limitDocs = Math.max(1, Number(values["limit-docs"] ?? 500));

  const db = getFirestore();
  const snap = await db.collection(colId).limit(limitDocs).get();

  const subcolCounts = new Map<string, number>();
  const samplePaths: string[] = [];

  for (const d of snap.docs) {
    const subs = await d.ref.listCollections();
    for (const sub of subs) {
      subcolCounts.set(sub.id, (subcolCounts.get(sub.id) ?? 0) + 1);
      if (samplePaths.length < 15) {
        samplePaths.push(`${d.ref.path}/${sub.id}/...`);
      }
    }
  }

  console.log(
    JSON.stringify(
      {
        projectId: sa.project_id,
        rootCollection: colId,
        docsScanned: snap.size,
        distinctSubcollectionsUnderDocs: [...subcolCounts.entries()].sort(
          (a, b) => b[1] - a[1]
        ),
        samplePaths,
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
