/**
 * Firebase -> Supabase field parity verifier.
 *
 * Re-runnable. For every user tagged enrichment_source='firebase_migration_2026_04_21',
 * compares each Firebase field (preserved in enrichment_data.firebase_raw) against
 * the first-class Supabase column. Exit 0 if every user has 100% parity, else exit 1.
 *
 * Writes a timestamped JSON report to .planning/audits/<date>/firebase-parity-report.json.
 *
 * Usage:
 *   node scripts/migrations/firebase-to-supabase/verify-parity.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { mkdirSync, writeFileSync } from "node:fs";
import { config } from "dotenv";
import { resolve } from "node:path";

config({ path: resolve(process.cwd(), ".env.local") });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

const FIELD_MAP = [
  ["email", "email"],
  ["name", "name"],
  ["ideaName", "company_name"],
  ["ideaPitch", "product_positioning"],
  ["phone", "phone"],
  ["location", "location"],
  ["targetMarket", "target_market"],
  ["stage", "stage"],
  ["stageCategory", "stage_category"],
  ["weakSpot", "weak_spot"],
  ["weakSpotCategory", "weak_spot_category"],
  ["ideaStatus", "idea_status"],
  ["passions", "passions"],
];

const norm = (v) => {
  if (v === null || v === undefined) return null;
  if (typeof v === "boolean") return v;
  const s = String(v).trim();
  return s.length ? s : null;
};

const { data: rows, error } = await supabase
  .from("profiles")
  .select("id, email, name, company_name, product_positioning, phone, location, target_market, stage, stage_category, weak_spot, weak_spot_category, has_partners, co_founder, idea_status, passions, oases_stage, enrichment_data")
  .eq("enrichment_source", "firebase_migration_2026_04_21")
  .order("email");

if (error) { console.error(error); process.exit(2); }

const report = {
  total_users: rows.length,
  timestamp: new Date().toISOString(),
  by_user: [],
  summary: {
    users_fully_preserved: 0,
    users_with_mismatches: 0,
    field_stats: {},
  },
};
for (const [fb] of FIELD_MAP) report.summary.field_stats[fb] = { had_value: 0, preserved: 0, missing: 0 };
report.summary.field_stats.hasPartners = { had_value: 0, preserved: 0, missing: 0 };

for (const r of rows) {
  const fb = r.enrichment_data?.firebase_raw ?? {};
  const user = { email: r.email, id: r.id, fb_uid: fb.id, mismatches: [] };
  let ok = true;
  for (const [fbKey, sbCol] of FIELD_MAP) {
    const fbVal = norm(fb[fbKey]);
    const sbVal = norm(r[sbCol]);
    const stats = report.summary.field_stats[fbKey];
    if (fbVal !== null) {
      stats.had_value++;
      if (sbVal === fbVal) stats.preserved++;
      else {
        stats.missing++;
        user.mismatches.push({ firebase_field: fbKey, supabase_column: sbCol, firebase_value: String(fbVal).slice(0, 80), supabase_value: sbVal ? String(sbVal).slice(0, 80) : null });
        ok = false;
      }
    }
  }
  const fbHp = fb.hasPartners;
  if (fbHp !== undefined && fbHp !== null) {
    const stats = report.summary.field_stats.hasPartners;
    stats.had_value++;
    if (fbHp === r.has_partners) stats.preserved++;
    else { stats.missing++; user.mismatches.push({ firebase_field: "hasPartners", supabase_column: "has_partners", firebase_value: fbHp, supabase_value: r.has_partners }); ok = false; }
  }
  ok ? report.summary.users_fully_preserved++ : report.summary.users_with_mismatches++;
  report.by_user.push(user);
}

const date = report.timestamp.slice(0, 10);
const dir = `.planning/audits/${date}`;
mkdirSync(dir, { recursive: true });
const path = `${dir}/firebase-parity-report.json`;
writeFileSync(path, JSON.stringify(report, null, 2));

console.log(`\n=== FIREBASE -> SUPABASE PARITY AUDIT (${date}) ===\n`);
console.log(`Total Firebase-migrated users:  ${report.total_users}`);
console.log(`100% parity:                    ${report.summary.users_fully_preserved}`);
console.log(`With mismatches:                ${report.summary.users_with_mismatches}`);
console.log();
console.log(`${"Firebase field".padEnd(20)} ${"had".padStart(6)} ${"ok".padStart(6)} ${"miss".padStart(6)} ${"%".padStart(8)}`);
for (const [fb, s] of Object.entries(report.summary.field_stats)) {
  const pct = s.had_value ? `${((100 * s.preserved) / s.had_value).toFixed(1)}%` : "-";
  console.log(`  ${fb.padEnd(18)} ${String(s.had_value).padStart(6)} ${String(s.preserved).padStart(6)} ${String(s.missing).padStart(6)} ${pct.padStart(8)}`);
}
if (report.summary.users_with_mismatches) {
  console.log("\nMismatches:");
  for (const u of report.by_user) if (u.mismatches.length) {
    console.log(`  ${u.email}`);
    for (const m of u.mismatches) console.log(`    ${m.firebase_field} -> ${m.supabase_column}: fb=${JSON.stringify(m.firebase_value)} sb=${JSON.stringify(m.supabase_value)}`);
  }
}
console.log(`\nFull report: ${path}\n`);
process.exit(report.summary.users_with_mismatches > 0 ? 1 : 0);
