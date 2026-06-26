/**
 * Test the actual /api/reports/generate and /api/reports/list HTTP routes against
 * a running dev server, using a real Supabase email-password session.
 */
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const URL = process.env.DEV_URL ?? "http://localhost:3005";
const TEST_EMAIL = `api-route-test-${Date.now()}@aiacrobatics.com`;
const TEST_PASSWORD = "ApiRouteTest2026!";
const SOURCE_PROCESS_ID = Number(process.env.SOURCE_PROCESS_ID ?? "121");

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

async function main() {
  // 1) Create user
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
    email_confirm: true,
  });
  if (createErr || !created.user) throw new Error(`create: ${createErr?.message}`);
  const userId = created.user.id;
  console.log(`✓ user created ${userId.slice(0, 8)} <${TEST_EMAIL}>`);

  // 2) Profile + cloned process
  await admin.from("profiles").upsert({
    id: userId, name: "API Route Test", company_name: "Test Co", stage: "Idea",
  });
  const { data: src } = await admin.from("startup_processes").select("*").eq("id", SOURCE_PROCESS_ID).single();
  const cloned: any = { ...(src as any) };
  delete cloned.id; delete cloned.created_at; delete cloned.updated_at;
  cloned.user_id = userId;
  await admin.from("startup_processes").insert(cloned);
  console.log(`✓ profile + process seeded`);

  // 3) Sign in to get JWT
  const { data: signed, error: signErr } = await anon.auth.signInWithPassword({
    email: TEST_EMAIL, password: TEST_PASSWORD,
  });
  if (signErr || !signed.session) throw new Error(`signin: ${signErr?.message}`);
  const accessToken = signed.session.access_token;
  console.log(`✓ signed in, JWT length=${accessToken.length}`);

  // 4) Build a Supabase auth cookie that the SSR client recognizes.
  // @supabase/ssr 0.8 writes `sb-<ref>-auth-token` (chunked .0, .1) as
  // `base64-<base64(JSON.stringify(session))>`.
  const supaUrl = new globalThis.URL(process.env.NEXT_PUBLIC_SUPABASE_URL!);
  const projectRef = supaUrl.host.split(".")[0];
  const sessionJson = JSON.stringify({
    access_token: signed.session.access_token,
    refresh_token: signed.session.refresh_token,
    expires_in: signed.session.expires_in,
    expires_at: signed.session.expires_at,
    token_type: signed.session.token_type,
    user: signed.session.user,
  });
  const encoded = "base64-" + Buffer.from(sessionJson, "utf-8").toString("base64");
  // Chunk to fit per-cookie size (4093 bytes safe; ssr chunks at ~3180)
  const chunkSize = 3180;
  const parts: string[] = [];
  for (let i = 0; i < encoded.length; i += chunkSize) parts.push(encoded.slice(i, i + chunkSize));
  const cookie = parts
    .map((part, i) => `sb-${projectRef}-auth-token.${i}=${encodeURIComponent(part)}`)
    .join("; ");

  // 5) POST /api/reports/generate
  console.log("\n--- POST /api/reports/generate ---");
  const t0 = Date.now();
  const genRes = await fetch(`${URL}/api/reports/generate`, {
    method: "POST",
    headers: { Cookie: cookie, "Content-Type": "application/json" },
  });
  const genJson = await genRes.json();
  console.log(`status=${genRes.status} duration=${Date.now() - t0}ms`);
  console.log(genJson);

  // 6) GET /api/reports/list
  console.log("\n--- GET /api/reports/list ---");
  const listRes = await fetch(`${URL}/api/reports/list`, { headers: { Cookie: cookie } });
  const listJson = await listRes.json();
  console.log(`status=${listRes.status}`);
  console.log(listJson);

  // 7) GET /reports/[id]
  if (genJson?.reportId) {
    console.log("\n--- GET /reports/[id] ---");
    const pageRes = await fetch(`${URL}/reports/${genJson.reportId}`, {
      headers: { Cookie: cookie }, redirect: "manual",
    });
    console.log(`status=${pageRes.status}, content-type=${pageRes.headers.get("content-type")}`);
    const text = await pageRes.text();
    console.log(`body length=${text.length}, has-h1=${text.includes("<h1>")}`);
  }

  // 7b) Pull the actual generation_error from DB before cleanup
  if (genJson?.reportId) {
    const { data: r } = await admin
      .from("founder_reports")
      .select("generation_error, model_used, score, generation_status")
      .eq("id", genJson.reportId)
      .single();
    console.log("\n[debug] generation row:", r);
  }

  // 8) Cleanup
  await admin.from("founder_reports").delete().eq("user_id", userId);
  await admin.from("startup_processes").delete().eq("user_id", userId);
  await admin.from("profiles").delete().eq("id", userId);
  await admin.auth.admin.deleteUser(userId);
  console.log("\n✓ cleaned up");
}

main().catch((e) => { console.error("FAIL:", e); process.exit(1); });
