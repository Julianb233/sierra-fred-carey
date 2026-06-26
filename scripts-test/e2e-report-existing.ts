/**
 * E2E test against an existing user (no create/delete cycle).
 * Inserts a startup_processes row for the given user_id, runs generateReport,
 * verifies DB + email, then optionally cleans up the cloned process row.
 *
 * Usage: USER_ID=<uuid> npx tsx scripts-test/e2e-report-existing.ts
 */
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { generateReport } from "@/lib/report/generate-report";

const USER_ID = process.env.USER_ID!;
const SOURCE_PROCESS_ID = Number(process.env.SOURCE_PROCESS_ID ?? "121");
if (!USER_ID) throw new Error("USER_ID required");

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  // Clean any existing process for this user (avoid stacking)
  await supabase.from("startup_processes").delete().eq("user_id", USER_ID);

  const { data: src } = await supabase
    .from("startup_processes")
    .select("*")
    .eq("id", SOURCE_PROCESS_ID)
    .single();

  const cloned: any = { ...(src as any) };
  delete cloned.id;
  delete cloned.created_at;
  delete cloned.updated_at;
  cloned.user_id = USER_ID;
  await supabase.from("startup_processes").insert(cloned);

  // Ensure profile exists
  await supabase.from("profiles").upsert({
    id: USER_ID,
    name: "Julian (Sahara E2E)",
    company_name: "Sahara E2E Co",
    stage: "Idea",
  });

  const result = await generateReport(USER_ID);
  console.log("generator result:", result);

  if (result.reportId) {
    const { data: report } = await supabase
      .from("founder_reports")
      .select(
        "id, score, verdict_headline, recommended_tier, generation_status, generation_duration_ms, emailed_at, emailed_to, email_send_id, generation_error"
      )
      .eq("id", result.reportId)
      .single();
    console.log("report row:", report);
  }

  // Tidy up the cloned process so we don't leave fixtures behind
  await supabase.from("startup_processes").delete().eq("user_id", USER_ID);
  console.log("(cleaned up cloned startup_processes for user)");
}

main().catch((e) => {
  console.error("FAIL:", e);
  process.exit(1);
});
