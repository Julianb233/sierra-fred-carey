/**
 * AI Platform Cost Report (AI-7373)
 *
 * Read-only report of AI usage and approximate spend, broken down by platform
 * (Claude vs Gemini vs OpenAI vs other), provider/model, and analyzer.
 *
 * Reads the telemetry tables populated by `lib/ai/logging.ts`:
 *   - `ai_requests`  (model, analyzer, created_at)
 *   - `ai_responses` (provider, tokens_used, created_at)
 *
 * NOTE on cost: the live `ai_responses` table stores only `tokens_used`
 * (total), not an input/output split or a persisted `estimated_cost`. This
 * report therefore computes an APPROXIMATE cost in-script using a blended
 * (avg of input+output) per-token rate from PROVIDER_PRICING below. Once the
 * logging schema is repaired to persist `estimated_cost`/`output_tokens`
 * (tracked separately — the logging layer currently drops every row due to a
 * schema/column mismatch), switch this to read the stored values directly.
 *
 * No data is written. Safe to run anytime.
 *
 * Usage:
 *   npx tsx scripts/ai-cost-report.ts                 # last 30 days
 *   npx tsx scripts/ai-cost-report.ts --days 7        # last 7 days
 *   npx tsx scripts/ai-cost-report.ts --days 90 --json
 */
import postgres from "postgres";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config();

// Blended $/token (avg of input & output rates / 1e6), keyed by the provider
// display names stored in `ai_responses.provider`. Mirrors PROVIDER_METADATA
// in lib/ai/providers.ts. Unknown providers fall back to DEFAULT_BLENDED.
const PROVIDER_PRICING: Record<string, number> = {
  "Gemini 3 Flash Preview": (0.5 + 3) / 2 / 1_000_000,
  "Claude Sonnet 4.5": (3 + 15) / 2 / 1_000_000,
  "Gemini 2.0 Flash": (1.25 + 5) / 2 / 1_000_000,
  "Claude Sonnet 4.5 / Gemini 3 Flash": (3 + 15) / 2 / 1_000_000,
};
const DEFAULT_BLENDED = (1 + 5) / 2 / 1_000_000;

function parseArgs() {
  const args = process.argv.slice(2);
  const out: { days: number; json: boolean } = { days: 30, json: false };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--days") out.days = Math.max(1, parseInt(args[++i] || "30", 10) || 30);
    else if (args[i] === "--json") out.json = true;
  }
  return out;
}

function platformOf(name: string): "Claude" | "Gemini" | "OpenAI" | "Mixed" | "Other" {
  const n = (name || "").toLowerCase();
  const hasClaude = n.includes("claude") || n.includes("anthropic");
  const hasGemini = n.includes("gemini") || n.includes("google");
  if (hasClaude && hasGemini) return "Mixed";
  if (hasClaude) return "Claude";
  if (hasGemini) return "Gemini";
  if (n.includes("gpt") || n.includes("openai") || n.includes("text-embedding")) return "OpenAI";
  return "Other";
}

const costOf = (provider: string, tokens: number) =>
  (PROVIDER_PRICING[provider] ?? DEFAULT_BLENDED) * (tokens || 0);
const usd = (n: number) => `$${(n || 0).toFixed(4)}`;
const intf = (n: number) => (n || 0).toLocaleString("en-US");

async function main() {
  const { days, json } = parseArgs();
  const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!databaseUrl) {
    console.error("ERROR: DATABASE_URL (or POSTGRES_URL) is not set in .env.local");
    process.exit(1);
  }

  const sql = postgres(databaseUrl, { ssl: "require", max: 1 });

  try {
    const rows = await sql<
      { provider: string | null; requests: number; total_tokens: number | null }[]
    >`
      SELECT
        provider,
        COUNT(*)::int                          AS requests,
        COALESCE(SUM(tokens_used), 0)::bigint  AS total_tokens
      FROM ai_responses
      WHERE created_at >= NOW() - (${days} || ' days')::interval
      GROUP BY provider
      ORDER BY total_tokens DESC
    `;

    const analyzers = await sql<
      { analyzer: string | null; model: string | null; requests: number }[]
    >`
      SELECT analyzer, model, COUNT(*)::int AS requests
      FROM ai_requests
      WHERE created_at >= NOW() - (${days} || ' days')::interval
      GROUP BY analyzer, model
      ORDER BY requests DESC
      LIMIT 15
    `;

    const byPlatform = new Map<string, { requests: number; tokens: number; cost: number }>();
    for (const r of rows) {
      const provider = r.provider || "(unknown)";
      const tokens = Number(r.total_tokens || 0);
      const cost = costOf(provider, tokens);
      const p = platformOf(provider);
      const cur = byPlatform.get(p) || { requests: 0, tokens: 0, cost: 0 };
      cur.requests += Number(r.requests || 0);
      cur.tokens += tokens;
      cur.cost += cost;
      byPlatform.set(p, cur);
    }

    const totalCost = rows.reduce((a, r) => a + costOf(r.provider || "", Number(r.total_tokens || 0)), 0);
    const totalReq = rows.reduce((a, r) => a + Number(r.requests || 0), 0);

    if (json) {
      console.log(
        JSON.stringify(
          {
            window_days: days,
            cost_basis: "approximate (blended per-token rate; ai_responses has no input/output split)",
            total_requests: totalReq,
            total_estimated_cost_usd: Number(totalCost.toFixed(6)),
            by_platform: Object.fromEntries(byPlatform),
            by_provider: rows.map((r) => ({
              ...r,
              approx_cost_usd: Number(costOf(r.provider || "", Number(r.total_tokens || 0)).toFixed(6)),
            })),
            top_analyzers: analyzers,
          },
          null,
          2
        )
      );
      return;
    }

    console.log(`\nAI Platform Cost Report — last ${days} days  (approximate cost)`);
    console.log("=".repeat(62));

    if (totalReq === 0) {
      console.log(
        "\nNo AI response logs found in this window.\n\n" +
          "If the app IS making AI calls, telemetry is not being persisted —\n" +
          "lib/ai/logging.ts INSERTs columns that don't exist on ai_requests/\n" +
          "ai_responses (and omits the NOT NULL ai_requests.input_data), so every\n" +
          "log row is silently dropped. Cost monitoring stays empty until that\n" +
          "schema mismatch is fixed. See docs/AI-7373-AI-COST-MONITORING.md.\n"
      );
      return;
    }

    console.log("\nBy platform (Claude vs Gemini vs ...):");
    for (const [p, v] of [...byPlatform.entries()].sort((a, b) => b[1].cost - a[1].cost)) {
      const pct = totalCost > 0 ? ((v.cost / totalCost) * 100).toFixed(1) : "0.0";
      console.log(
        `  ${p.padEnd(8)} | ${intf(v.requests).padStart(7)} req | ${intf(v.tokens).padStart(
          12
        )} tok | ~${usd(v.cost).padStart(10)} | ${pct.padStart(5)}%`
      );
    }

    console.log("\nBy provider/model:");
    for (const r of rows) {
      const cost = costOf(r.provider || "", Number(r.total_tokens || 0));
      console.log(
        `  ${(r.provider || "(unknown)").padEnd(28)} | ${intf(Number(r.requests)).padStart(
          7
        )} req | ${intf(Number(r.total_tokens || 0)).padStart(12)} tok | ~${usd(cost).padStart(10)}`
      );
    }

    console.log("\nTop analyzers by volume:");
    for (const a of analyzers) {
      console.log(
        `  ${(a.analyzer || "(none)").padEnd(28)} | ${(a.model || "?").padEnd(26)} | ${intf(
          Number(a.requests)
        ).padStart(6)} req`
      );
    }

    console.log("\n" + "-".repeat(62));
    console.log(`  TOTAL: ${intf(totalReq)} requests, ~${usd(totalCost)} approx spend`);
    console.log("");
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((err) => {
  console.error("Cost report failed:", err.message || err);
  process.exit(1);
});
