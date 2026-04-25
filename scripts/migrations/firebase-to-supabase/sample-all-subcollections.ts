import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore, Timestamp, type Firestore } from "firebase-admin/firestore";
import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";

const HERE = dirname(new URL(import.meta.url).pathname);
const SA = join(HERE, "_data", "firebase-service-account.json");

function norm(v: unknown): unknown {
  if (v instanceof Timestamp) return v.toDate().toISOString();
  if (Array.isArray(v)) return v.map(norm);
  if (v && typeof v === "object") {
    const o: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
      o[k] = norm(val);
    }
    return o;
  }
  return v;
}

async function firstDoc(db: Firestore, sub: string) {
  const users = await db.collection("users").limit(40).get();
  for (const u of users.docs) {
    const s = await u.ref.collection(sub).limit(1).get();
    if (!s.empty) {
      const d = s.docs[0];
      return { path: d.ref.path, data: norm(d.data()) };
    }
  }
  return null;
}

async function main() {
  const sa = JSON.parse(await readFile(resolve(SA), "utf-8"));
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
  const db = getFirestore();
  for (const sub of ["roadmap", "mentor", "scores", "discovery"]) {
    const x = await firstDoc(db, sub);
    console.log("\n===", sub, "===");
    console.log(JSON.stringify(x, null, 2)?.slice(0, 3500) ?? "null");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
