import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";
import { buildSystemPrompt, buildUserMessage } from "@/lib/report/prompt";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

(async () => {
  const { data: src } = await supabase.from("startup_processes").select("*").eq("id", 121).single();
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY!, baseURL: process.env.ANTHROPIC_BASE_URL });
  const r = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4000,
    system: buildSystemPrompt(),
    messages: [{ role: "user", content: buildUserMessage(src as any, { founderName: "Test", companyName: "Test Co", stage: "Idea" }) }],
  });
  const text = (r.content.find(b => b.type === "text") as any)?.text ?? "";
  console.log("=== STOP REASON:", r.stop_reason);
  console.log("=== USAGE:", JSON.stringify(r.usage));
  console.log("=== TEXT LENGTH:", text.length);
  console.log("=== FIRST 200:", JSON.stringify(text.slice(0, 200)));
  console.log("=== LAST 200:", JSON.stringify(text.slice(-200)));
})();
