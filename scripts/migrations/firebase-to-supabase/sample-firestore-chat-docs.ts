/**
 * Print a few documents from users/{uid}/chat/{msgId} for schema discovery.
 */
import { cert, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";

const HERE = dirname(new URL(import.meta.url).pathname);
const DATA_DIR = join(HERE, "_data");
const SA = join(DATA_DIR, "firebase-service-account.json");

async function main() {
  const sa = JSON.parse(await readFile(resolve(SA), "utf-8"));
  initializeApp({
    credential: cert({
      projectId: sa.project_id,
      clientEmail: sa.client_email,
      privateKey: sa.private_key,
    }),
    projectId: sa.project_id,
  });
  const db = getFirestore();
  const users = await db.collection("users").limit(5).get();
  const samples: unknown[] = [];
  for (const u of users.docs) {
    const chat = await u.ref.collection("chat").limit(3).get();
    for (const c of chat.docs) {
      samples.push({ path: c.ref.path, id: c.id, data: c.data() });
    }
  }
  console.log(JSON.stringify(samples, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
