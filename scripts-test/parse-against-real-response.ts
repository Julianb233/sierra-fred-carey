import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";
import { buildSystemPrompt, buildUserMessage, parseReportPayload } from "@/lib/report/prompt";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

(async () => {
  const { data: src } = await supabase.from("startup_processes").select("*").eq("id", 121).single();
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY!, baseURL: process.env.ANTHROPIC_BASE_URL });
  const r = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4000,
    system: buildSystemPrompt(),
    messages: [{ role: "user", content: buildUserMessage(src as any, { founderName: "Test", companyName: "Test", stage: "Idea" }) }],
  });
  const text = (r.content.find((b) => b.type === "text") as any)?.text ?? "";
  console.log("RAW length:", text.length);
  console.log("--- first 80 chars (escaped):", JSON.stringify(text.slice(0, 80)));
  console.log("--- last 80 chars (escaped):", JSON.stringify(text.slice(-80)));
  try {
    const r2 = parseReportPayload(text);
    console.log("PARSED OK: score=", r2.score, "tier=", r2.recommendedTier);
  } catch (e) {
    console.error("PARSE FAILED:", (e as Error).message);
    require("fs").writeFileSync("/tmp/raw-claude-output.txt", text);
    console.log("Raw text written to /tmp/raw-claude-output.txt");
  }
})();
