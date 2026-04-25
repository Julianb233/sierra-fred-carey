/**
 * Re-dispatch password recovery emails to migrated Firebase users.
 *
 * Why: import-users.ts generated recovery links via auth.admin.generateLink,
 * but that admin call doesn't always trigger Supabase's configured mailer.
 * This script uses the public anon-key resetPasswordForEmail flow which goes
 * through whatever SMTP / Resend integration the Supabase project has wired,
 * with retry-on-failure and per-user audit logging.
 *
 * Usage:
 *   node scripts/migrations/firebase-to-supabase/redispatch-recovery.mjs           # all never-signed-in migrated users
 *   node scripts/migrations/firebase-to-supabase/redispatch-recovery.mjs --dry-run
 *   node scripts/migrations/firebase-to-supabase/redispatch-recovery.mjs --email fred@fredcary.com
 *   node scripts/migrations/firebase-to-supabase/redispatch-recovery.mjs --missing-only  # only users with recovery_sent_at IS NULL
 *   node scripts/migrations/firebase-to-supabase/redispatch-recovery.mjs --real-only     # skip obvious test accounts
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

// Manual env load — bypasses dotenvx wrapping which breaks SDK auth
for (const line of readFileSync(".env.local", "utf-8").split("\n")) {
  const m = line.match(/^(NEXT_PUBLIC_SUPABASE_URL|NEXT_PUBLIC_SUPABASE_ANON_KEY|SUPABASE_SERVICE_ROLE_KEY|NEXT_PUBLIC_SITE_URL)=(.*)$/);
  if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "").trim();
}

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://www.joinsahara.com";
const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SB_SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SB_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SB_URL || !SB_SERVICE || !SB_ANON) {
  console.error("Missing required env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_SUPABASE_ANON_KEY");
  process.exit(1);
}

// Service-role for listUsers / metadata read
const admin = createClient(SB_URL, SB_SERVICE, { auth: { autoRefreshToken: false, persistSession: false } });
// Anon-key for resetPasswordForEmail (goes through configured mailer)
const pub = createClient(SB_URL, SB_ANON, { auth: { autoRefreshToken: false, persistSession: false } });

const dryRun = process.argv.includes("--dry-run");
const realOnly = process.argv.includes("--real-only");
const missingOnly = process.argv.includes("--missing-only");
const emailArgIdx = process.argv.indexOf("--email");
const targetEmail = emailArgIdx >= 0 ? process.argv[emailArgIdx + 1] : null;

const TEST_PATTERNS = [/test/i, /example\.com$/i, /^gg@g/i, /^dev@/i, /browser\./i, /ux-test/i];
const isTest = (e) => TEST_PATTERNS.some((p) => p.test(e));

const RETRY_ATTEMPTS = 3;
const RETRY_BASE_MS = 500;

async function sendWithRetry(email) {
  let lastErr;
  for (let attempt = 1; attempt <= RETRY_ATTEMPTS; attempt++) {
    const { error } = await pub.auth.resetPasswordForEmail(email, {
      redirectTo: `${SITE}/api/auth/callback?next=/reset-password`,
    });
    if (!error) return { ok: true, attempt };
    lastErr = error;
    // Don't retry on "user not found" or rate-limit errors that won't recover quickly
    if (/not.found|invalid/i.test(error.message)) break;
    const delay = RETRY_BASE_MS * 2 ** (attempt - 1);
    await new Promise((r) => setTimeout(r, delay));
  }
  return { ok: false, attempt: RETRY_ATTEMPTS, error: lastErr?.message ?? "unknown error" };
}

async function loadMigratedUsers() {
  const { data: profiles, error } = await admin
    .from("profiles")
    .select("id, email")
    .eq("enrichment_source", "firebase_migration_2026_04_21");
  if (error) throw error;

  let page = 1;
  const all = [];
  while (true) {
    const { data, error: ue } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (ue) throw ue;
    all.push(...data.users);
    if (data.users.length < 1000) break;
    page += 1;
  }
  const byId = new Map(all.map((u) => [u.id, u]));
  return profiles.map((p) => byId.get(p.id)).filter(Boolean);
}

(async () => {
  const migrated = await loadMigratedUsers();

  let candidates;
  if (targetEmail) {
    candidates = migrated.filter((u) => u.email?.toLowerCase() === targetEmail.toLowerCase());
    if (candidates.length === 0) {
      console.error(`No migrated user found with email ${targetEmail}`);
      process.exit(1);
    }
  } else if (missingOnly) {
    candidates = migrated.filter((u) => !u.recovery_sent_at);
  } else {
    candidates = migrated.filter((u) => !u.last_sign_in_at);
  }
  if (realOnly) candidates = candidates.filter((u) => u.email && !isTest(u.email));

  console.log(
    `migrated=${migrated.length} candidates=${candidates.length} dry_run=${dryRun} mode=${
      targetEmail ? `email=${targetEmail}` : missingOnly ? "missing-only" : "never-signed-in"
    }`
  );
  console.log("targets:");
  candidates.forEach((u) => console.log(`  ${u.email}  (recovery_sent_at=${u.recovery_sent_at ?? "null"})`));
  if (dryRun) {
    console.log("\n--dry-run — no emails sent");
    return;
  }

  const report = { startedAt: new Date().toISOString(), results: [] };
  let ok = 0, fail = 0;

  for (const u of candidates) {
    const r = await sendWithRetry(u.email);
    report.results.push({ email: u.email, id: u.id, ...r });
    if (r.ok) {
      console.log(`  sent  ${u.email}  (attempt ${r.attempt})`);
      ok += 1;
    } else {
      console.error(`  FAIL  ${u.email}  (${r.error})`);
      fail += 1;
    }
    await new Promise((r) => setTimeout(r, 250)); // throttle ~4/s
  }

  report.finishedAt = new Date().toISOString();
  report.summary = { sent: ok, failed: fail, total: candidates.length };

  // Persist audit
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const dir = resolve(".planning/audits", new Date().toISOString().slice(0, 10));
  mkdirSync(dir, { recursive: true });
  const path = resolve(dir, `recovery-redispatch-${stamp}.json`);
  writeFileSync(path, JSON.stringify(report, null, 2));

  console.log(`\nsent=${ok} failed=${fail}`);
  console.log(`audit: ${path}`);

  process.exit(fail > 0 ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
