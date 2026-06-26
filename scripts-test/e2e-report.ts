/**
 * E2E test for /lib/report/generate-report.ts
 *
 * Creates a transient test user, copies a real founder's startup_processes data
 * into a new row, runs generateReport() against it, verifies DB writes + Resend
 * send, then cleans up. Runs against PRODUCTION Supabase + Resend (read .env.local).
 *
 * Usage: npx tsx scripts-test/e2e-report.ts [--keep-user] [--source-process-id=121]
 */

import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { generateReport } from "@/lib/report/generate-report";

const FLAGS = new Set(process.argv.slice(2));
const KEEP_USER = FLAGS.has("--keep-user");
const SOURCE_PROCESS_ID = Number(
  process.argv.find((a) => a.startsWith("--source-process-id="))?.split("=")[1] ?? "121"
);

const TEST_EMAIL = process.env.TEST_EMAIL || "aaron@lumati.com";
const TEST_PASSWORD = "TestReport2026!" + Math.random().toString(36).slice(2, 10);

function must(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`missing env: ${name}`);
  return v;
}

const supabase = createClient(must("NEXT_PUBLIC_SUPABASE_URL"), must("SUPABASE_SERVICE_ROLE_KEY"), {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  console.log("=== Sahara Report E2E Test ===");
  console.log(`Anthropic base: ${process.env.ANTHROPIC_BASE_URL ?? "(default Anthropic API)"}`);
  console.log(`Anthropic key prefix: ${(process.env.ANTHROPIC_API_KEY ?? "").slice(0, 10)}...`);
  console.log(`Resend key prefix: ${(process.env.RESEND_API_KEY ?? "").slice(0, 5)}...`);
  console.log(`Source startup_processes.id: ${SOURCE_PROCESS_ID}`);
  console.log(`Test email: ${TEST_EMAIL}`);

  // 1. Load source process
  const { data: src, error: srcErr } = await supabase
    .from("startup_processes")
    .select("*")
    .eq("id", SOURCE_PROCESS_ID)
    .single();
  if (srcErr || !src) throw new Error(`Source process load failed: ${srcErr?.message}`);
  console.log(`✓ Loaded source row (user=${src.user_id.slice(0, 8)}, current_step=${src.current_step})`);

  // 2. Create test user
  const { data: created, error: createErr } = await supabase.auth.admin.createUser({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
    email_confirm: true,
    user_metadata: { name: "E2E Report Tester", company_name: "E2E Test Co" },
  });
  if (createErr || !created.user) throw new Error(`User create failed: ${createErr?.message}`);
  const testUserId = created.user.id;
  console.log(`✓ Created test user ${testUserId.slice(0, 8)} <${TEST_EMAIL}>`);

  // 3. Insert profile (generator reads name + company_name from profiles)
  const { error: pErr } = await supabase.from("profiles").upsert({
    id: testUserId,
    email: TEST_EMAIL,
    name: "E2E Report Tester",
    company_name: "Test Snacks Co",
    stage: "Idea",
  });
  if (pErr) console.warn(`! Profile upsert warning: ${pErr.message}`);
  else console.log(`✓ Inserted profile`);

  // 4. Clone source startup_processes data into test user
  const cloned: any = { ...src };
  delete cloned.id;
  delete cloned.created_at;
  delete cloned.updated_at;
  cloned.user_id = testUserId;
  const { error: copyErr } = await supabase.from("startup_processes").insert(cloned);
  if (copyErr) throw new Error(`Clone process failed: ${copyErr.message}`);
  console.log(`✓ Cloned startup_processes data`);

  // 5. RUN THE GENERATOR (this is what the API route actually calls)
  console.log("\n=== Running generateReport() ===");
  const t0 = Date.now();
  const result = await generateReport(testUserId);
  const dt = Date.now() - t0;
  console.log(`generator returned in ${dt}ms:`, result);

  // 6. Verify the row in founder_reports
  if (result.reportId) {
    const { data: report } = await supabase
      .from("founder_reports")
      .select(
        "id, score, verdict_headline, verdict_subline, recommended_tier, generation_status, generation_duration_ms, emailed_at, emailed_to, email_send_id, model_used, generation_error, html"
      )
      .eq("id", result.reportId)
      .single();
    console.log("\n=== founder_reports row ===");
    console.log({
      id: report?.id,
      score: report?.score,
      verdict: report?.verdict_headline,
      verdict_subline: report?.verdict_subline,
      recommended_tier: report?.recommended_tier,
      generation_status: report?.generation_status,
      generation_duration_ms: report?.generation_duration_ms,
      emailed_at: report?.emailed_at,
      emailed_to: report?.emailed_to,
      email_send_id: report?.email_send_id,
      model_used: report?.model_used,
      generation_error: report?.generation_error,
      html_length: report?.html?.length,
    });

    if (report?.html) {
      const path = `/tmp/sahara-e2e-report-${result.reportId}.html`;
      const fs = await import("node:fs");
      fs.writeFileSync(path, report.html);
      console.log(`\n✓ HTML written to ${path} (${report.html.length} bytes)`);
    }
  }

  // 7. Cleanup (unless --keep-user)
  if (!KEEP_USER) {
    await supabase.from("founder_reports").delete().eq("user_id", testUserId);
    await supabase.from("startup_processes").delete().eq("user_id", testUserId);
    await supabase.from("profiles").delete().eq("id", testUserId);
    await supabase.auth.admin.deleteUser(testUserId);
    console.log(`\n✓ Cleaned up test user + data`);
  } else {
    console.log(`\n(retained test user ${testUserId} per --keep-user)`);
  }
}

main().catch((e) => {
  console.error("FAIL:", e?.message ?? e);
  console.error(e?.stack);
  process.exit(1);
});
