/**
 * AI Platform Cost Report (AI-7373 / AI-7363)
 *
 * Read-only report of AI usage and approximate spend, broken down by platform
 * (Claude vs Gemini vs OpenAI vs other), provider/model, and analyzer.
 *
 * This is a thin CLI over `lib/ai/cost-monitor.ts` — the SAME aggregation that
 * powers the admin dashboard at /admin/ai-costs, so the two never disagree.
 *
 * Cost basis: reports PERSISTED `estimated_cost` once the schema-fix migration
 * (supabase-migrations/003_ai_cost_telemetry.sql) is applied and rows carry it;
 * otherwise falls back to an in-script blended per-token approximation.
 *
 * No data is written. Safe to run anytime.
 *
 * Usage:
 *   npx tsx scripts/ai-cost-report.ts                 # last 30 days
 *   npx tsx scripts/ai-cost-report.ts --days 7        # last 7 days
 *   npx tsx scripts/ai-cost-report.ts --days 90 --json
 */
import * as dotenv from "dotenv";
import { getAICostBreakdown } from "../lib/ai/cost-monitor";

dotenv.config({ path: ".env.local" });
dotenv.config();

function parseArgs() {
  const args = process.argv.slice(2);
  const out: { days: number; json: boolean } = { days: 30, json: false };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--days")
      out.days = Math.max(1, parseInt(args[++i] || "30", 10) || 30);
    else if (args[i] === "--json") out.json = true;
  }
  return out;
}

const usd = (n: number) => `$${(n || 0).toFixed(4)}`;
const intf = (n: number) => (n || 0).toLocaleString("en-US");

async function main() {
  const { days, json } = parseArgs();

  let report;
  try {
    report = await getAICostBreakdown({ days });
  } catch (err) {
    console.error(
      "Cost report failed:",
      err instanceof Error ? err.message : err
    );
    process.exit(1);
  }

  if (json) {
    console.log(
      JSON.stringify(
        {
          window_days: report.windowDays,
          cost_basis: report.costBasis,
          telemetry_schema_missing: report.telemetrySchemaMissing,
          total_requests: report.totalRequests,
          total_tokens: report.totalTokens,
          total_estimated_cost_usd: Number(report.totalCost.toFixed(6)),
          by_platform: report.byPlatform,
          by_provider: report.byProvider,
          top_analyzers: report.topAnalyzers,
        },
        null,
        2
      )
    );
    return;
  }

  console.log(
    `\nAI Platform Cost Report — last ${report.windowDays} days  (${report.costBasis} cost)`
  );
  console.log("=".repeat(62));

  if (report.totalRequests === 0) {
    console.log(
      "\nNo AI response logs found in this window.\n\n" +
        "If the app IS making AI calls, telemetry is not being persisted —\n" +
        "apply supabase-migrations/003_ai_cost_telemetry.sql so lib/ai/logging.ts\n" +
        "can write usage rows. See docs/AI-7373-AI-COST-MONITORING.md.\n"
    );
    return;
  }

  console.log("\nBy platform (Claude vs Gemini vs ...):");
  for (const p of report.byPlatform) {
    const pct = (p.share * 100).toFixed(1);
    console.log(
      `  ${p.platform.padEnd(8)} | ${intf(p.requests).padStart(7)} req | ${intf(
        p.tokens
      ).padStart(12)} tok | ~${usd(p.cost).padStart(10)} | ${pct.padStart(5)}%`
    );
  }

  console.log("\nBy provider/model:");
  for (const r of report.byProvider) {
    console.log(
      `  ${r.provider.padEnd(28)} | ${intf(r.requests).padStart(7)} req | ${intf(
        r.tokens
      ).padStart(12)} tok | ~${usd(r.cost).padStart(10)}`
    );
  }

  console.log("\nTop analyzers by volume:");
  for (const a of report.topAnalyzers) {
    console.log(
      `  ${a.analyzer.padEnd(28)} | ${a.model.padEnd(26)} | ${intf(
        a.requests
      ).padStart(6)} req`
    );
  }

  console.log("\n" + "-".repeat(62));
  console.log(
    `  TOTAL: ${intf(report.totalRequests)} requests, ~${usd(
      report.totalCost
    )} ${report.costBasis} spend`
  );
  if (report.telemetrySchemaMissing) {
    console.log(
      "  NOTE: cost columns missing — apply migration 003 for exact persisted cost."
    );
  }
  console.log("");
}

main();
