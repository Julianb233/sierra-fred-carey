/**
 * AI Platform Cost Monitor (AI-7363)
 *
 * Shared, read-only aggregation of AI usage + approximate spend, broken down by
 * platform (Claude vs Gemini vs OpenAI vs other), provider/model, and analyzer.
 *
 * This is the single source of truth used by BOTH:
 *   - the CLI report  (`scripts/ai-cost-report.ts` / `npm run ai:cost-report`)
 *   - the admin dashboard (`/admin/ai-costs` via `/api/admin/ai-costs`)
 *
 * Data comes from the telemetry tables populated by `lib/ai/logging.ts`:
 *   - `ai_requests`  (analyzer, model, created_at)
 *   - `ai_responses` (provider, tokens_used, [output_tokens], [estimated_cost], created_at)
 *
 * Cost basis: when the `estimated_cost` column exists AND has priced rows in the
 * window, we report the PERSISTED cost (accurate input/output split, computed at
 * write-time in `logging.ts`). Otherwise we fall back to an APPROXIMATE cost
 * computed here from a blended (avg of input+output) per-token rate. The result
 * advertises which basis was used via `costBasis`.
 *
 * Nothing is written. Safe to call anytime.
 */
import postgres from "postgres";
import { PROVIDER_METADATA, type ProviderKey } from "./providers";

export type Platform = "Claude" | "Gemini" | "OpenAI" | "Mixed" | "Other";

export interface PlatformBreakdown {
  platform: Platform;
  requests: number;
  tokens: number;
  cost: number;
  /** share of total cost, 0..1 */
  share: number;
}

export interface ProviderBreakdown {
  provider: string;
  platform: Platform;
  requests: number;
  tokens: number;
  cost: number;
}

export interface AnalyzerUsage {
  analyzer: string;
  model: string;
  requests: number;
}

export interface AICostBreakdown {
  windowDays: number;
  costBasis: "persisted" | "approximate";
  totalRequests: number;
  totalTokens: number;
  totalCost: number;
  byPlatform: PlatformBreakdown[];
  byProvider: ProviderBreakdown[];
  topAnalyzers: AnalyzerUsage[];
  /** true when the schema-fix migration has not been applied yet */
  telemetrySchemaMissing: boolean;
  generatedAt: string;
}

// ----------------------------------------------------------------------------
// Pricing (pure, unit-testable)
// ----------------------------------------------------------------------------

/**
 * Blended $/token (avg of input & output rate / 1e6), keyed by the provider
 * display names stored in `ai_responses.provider`. Derived from
 * PROVIDER_METADATA so the rates never drift from the provider config.
 */
export const PROVIDER_BLENDED_RATE: Record<string, number> = (() => {
  const map: Record<string, number> = {};
  for (const key of Object.keys(PROVIDER_METADATA) as ProviderKey[]) {
    const meta = PROVIDER_METADATA[key];
    const blended =
      (meta.costPerMillionTokens.input + meta.costPerMillionTokens.output) /
      2 /
      1_000_000;
    map[meta.name] = blended;
  }
  return map;
})();

/** Fallback blended rate for providers not present in PROVIDER_METADATA. */
export const DEFAULT_BLENDED_RATE = (1 + 5) / 2 / 1_000_000;

/** Approximate cost for `tokens` produced by `provider` (blended rate). */
export function blendedCostOf(provider: string, tokens: number): number {
  const rate = PROVIDER_BLENDED_RATE[provider] ?? DEFAULT_BLENDED_RATE;
  return rate * (tokens || 0);
}

/** Map a provider/model display name to a platform bucket. */
export function platformOf(name: string): Platform {
  const n = (name || "").toLowerCase();
  const hasClaude = n.includes("claude") || n.includes("anthropic");
  const hasGemini = n.includes("gemini") || n.includes("google");
  if (hasClaude && hasGemini) return "Mixed";
  if (hasClaude) return "Claude";
  if (hasGemini) return "Gemini";
  if (n.includes("gpt") || n.includes("openai") || n.includes("text-embedding"))
    return "OpenAI";
  return "Other";
}

// ----------------------------------------------------------------------------
// Aggregation (pure, unit-testable)
// ----------------------------------------------------------------------------

export interface RawProviderRow {
  provider: string | null;
  requests: number;
  total_tokens: number | null;
  /** total persisted estimated_cost over the window (0 when column absent) */
  stored_cost?: number | null;
  /** number of rows that carried a non-null estimated_cost */
  priced_rows?: number | null;
}

/**
 * Fold raw per-provider rows into the structured breakdown. Decides the cost
 * basis: if any row carries persisted cost, use persisted costs; otherwise use
 * the blended approximation. Pure — no DB, no I/O.
 */
export function buildBreakdown(
  rows: RawProviderRow[],
  analyzers: AnalyzerUsage[],
  windowDays: number,
  generatedAt: string,
  telemetrySchemaMissing = false
): AICostBreakdown {
  const hasPersisted = rows.some((r) => Number(r.priced_rows || 0) > 0);
  const costBasis: "persisted" | "approximate" = hasPersisted
    ? "persisted"
    : "approximate";

  const costForRow = (r: RawProviderRow): number => {
    if (hasPersisted) return Number(r.stored_cost || 0);
    return blendedCostOf(r.provider || "", Number(r.total_tokens || 0));
  };

  const byProvider: ProviderBreakdown[] = rows.map((r) => ({
    provider: r.provider || "(unknown)",
    platform: platformOf(r.provider || ""),
    requests: Number(r.requests || 0),
    tokens: Number(r.total_tokens || 0),
    cost: costForRow(r),
  }));

  const totalCost = byProvider.reduce((a, r) => a + r.cost, 0);
  const totalTokens = byProvider.reduce((a, r) => a + r.tokens, 0);
  const totalRequests = byProvider.reduce((a, r) => a + r.requests, 0);

  const platformMap = new Map<Platform, PlatformBreakdown>();
  for (const r of byProvider) {
    const cur =
      platformMap.get(r.platform) ||
      ({
        platform: r.platform,
        requests: 0,
        tokens: 0,
        cost: 0,
        share: 0,
      } as PlatformBreakdown);
    cur.requests += r.requests;
    cur.tokens += r.tokens;
    cur.cost += r.cost;
    platformMap.set(r.platform, cur);
  }

  const byPlatform = [...platformMap.values()]
    .map((p) => ({
      ...p,
      share: totalCost > 0 ? p.cost / totalCost : 0,
    }))
    .sort((a, b) => b.cost - a.cost);

  return {
    windowDays,
    costBasis,
    totalRequests,
    totalTokens,
    totalCost,
    byPlatform,
    byProvider: byProvider.sort((a, b) => b.cost - a.cost),
    topAnalyzers: analyzers,
    telemetrySchemaMissing,
    generatedAt,
  };
}

// ----------------------------------------------------------------------------
// DB-backed entry point
// ----------------------------------------------------------------------------

export interface GetBreakdownOptions {
  days?: number;
  /** override the connection string (defaults to DATABASE_URL/POSTGRES_URL) */
  databaseUrl?: string;
  /** stamp for `generatedAt` (injected for deterministic tests) */
  now?: string;
}

/**
 * Connect to Postgres, aggregate the telemetry, and return the breakdown.
 * Resilient to the schema-fix migration not being applied yet: if the
 * `estimated_cost`/`output_tokens` columns are missing it transparently falls
 * back to a token-only query + blended approximation and flags
 * `telemetrySchemaMissing`.
 */
export async function getAICostBreakdown(
  opts: GetBreakdownOptions = {}
): Promise<AICostBreakdown> {
  const days = Math.max(1, Math.floor(opts.days ?? 30));
  const databaseUrl =
    opts.databaseUrl || process.env.DATABASE_URL || process.env.POSTGRES_URL;
  const generatedAt = opts.now || new Date().toISOString();

  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL (or POSTGRES_URL) is not set — cannot read AI cost telemetry"
    );
  }

  const sql = postgres(databaseUrl, { ssl: "require", max: 1 });
  let telemetrySchemaMissing = false;

  try {
    let rows: RawProviderRow[];
    try {
      // Rich query — uses the columns added by the schema-fix migration.
      rows = await sql<RawProviderRow[]>`
        SELECT
          provider,
          COUNT(*)::int                                    AS requests,
          COALESCE(SUM(tokens_used), 0)::bigint            AS total_tokens,
          COALESCE(SUM(estimated_cost), 0)::numeric        AS stored_cost,
          COUNT(estimated_cost)::int                       AS priced_rows
        FROM ai_responses
        WHERE created_at >= NOW() - (${days} || ' days')::interval
        GROUP BY provider
        ORDER BY total_tokens DESC
      `;
    } catch (err) {
      // 42703 = undefined_column → migration not applied yet. Fall back.
      const code = (err as { code?: string })?.code;
      if (code !== "42703") throw err;
      telemetrySchemaMissing = true;
      rows = await sql<RawProviderRow[]>`
        SELECT
          provider,
          COUNT(*)::int                          AS requests,
          COALESCE(SUM(tokens_used), 0)::bigint  AS total_tokens
        FROM ai_responses
        WHERE created_at >= NOW() - (${days} || ' days')::interval
        GROUP BY provider
        ORDER BY total_tokens DESC
      `;
    }

    const analyzers = await sql<AnalyzerUsage[]>`
      SELECT
        COALESCE(analyzer, '(none)') AS analyzer,
        COALESCE(model, '?')         AS model,
        COUNT(*)::int                AS requests
      FROM ai_requests
      WHERE created_at >= NOW() - (${days} || ' days')::interval
      GROUP BY analyzer, model
      ORDER BY requests DESC
      LIMIT 15
    `;

    return buildBreakdown(
      rows,
      analyzers.map((a) => ({
        analyzer: a.analyzer,
        model: a.model,
        requests: Number(a.requests || 0),
      })),
      days,
      generatedAt,
      telemetrySchemaMissing
    );
  } finally {
    await sql.end({ timeout: 5 });
  }
}
