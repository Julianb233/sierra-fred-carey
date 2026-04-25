/**
 * Orchestrate Firebase → Supabase parity for Sahara legacy data:
 *
 *   1. import-firestore-subcollections.ts — roadmap, mentor, discovery, scores
 *      → profiles.enrichment_data.firebase_subcollections
 *   2. import-firestore-chat-to-supabase.ts — users/{uid}/chat → fred_episodic_memory
 *   3. bridge-roadmap-to-startup-process.ts — subcollections + profile → startup_processes
 *
 * Prerequisite: Firebase service account JSON at
 *   scripts/migrations/firebase-to-supabase/_data/firebase-service-account.json
 *
 * Env: SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL), SUPABASE_SERVICE_ROLE_KEY,
 *      DATABASE_URL (required for step 2 only)
 *
 * Usage:
 *   npx tsx scripts/migrations/firebase-to-supabase/bridge-all-firebase-to-supabase.ts --dry-run
 *   npx tsx scripts/migrations/firebase-to-supabase/bridge-all-firebase-to-supabase.ts
 *   npx tsx scripts/migrations/firebase-to-supabase/bridge-all-firebase-to-supabase.ts --skip-chat
 */

import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..", "..", "..");

function runStep(name: string, relScript: string, args: string[]) {
  const scriptPath = join(__dirname, relScript);
  console.log(`\n========== ${name} ==========\n`);
  const r = spawnSync("npx", ["--yes", "tsx", scriptPath, ...args], {
    cwd: ROOT,
    stdio: "inherit",
    env: process.env,
  });
  if (r.status !== 0) {
    console.error(`\nStep failed: ${name} (exit ${r.status})`);
    process.exit(r.status ?? 1);
  }
}

async function main() {
  const argv = process.argv.slice(2);
  const dryRun = argv.includes("--dry-run");
  const skipChat = argv.includes("--skip-chat");

  const dryFlag = dryRun ? ["--dry-run"] : [];

  runStep(
    "Import Firestore subcollections → profiles.enrichment_data",
    "import-firestore-subcollections.ts",
    dryFlag
  );

  if (!skipChat) {
    runStep(
      "Import Firestore chat → fred_episodic_memory",
      "import-firestore-chat-to-supabase.ts",
      dryFlag
    );
  }

  runStep(
    "Bridge roadmap / mentor / discovery → startup_processes",
    "bridge-roadmap-to-startup-process.ts",
    dryFlag
  );

  console.log("\n========== All steps completed ==========\n");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
