"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Admin AI Cost Monitor (AI-7363).
 *
 * Surfaces the Claude vs Gemini platform split, per-provider spend, and top
 * analyzers from the AI telemetry. Strategy (Sahara Founders mtg, 2026-04-08):
 * Claude = system architect / high-reasoning; Gemini = cost-effective content &
 * report generation. Keep the split balanced to control spend.
 *
 * Data: GET /api/admin/ai-costs?days=N
 */

type Platform = "Claude" | "Gemini" | "OpenAI" | "Mixed" | "Other";

interface PlatformBreakdown {
  platform: Platform;
  requests: number;
  tokens: number;
  cost: number;
  share: number;
}
interface ProviderBreakdown {
  provider: string;
  platform: Platform;
  requests: number;
  tokens: number;
  cost: number;
}
interface AnalyzerUsage {
  analyzer: string;
  model: string;
  requests: number;
}
interface CostData {
  windowDays: number;
  costBasis: "persisted" | "approximate";
  totalRequests: number;
  totalTokens: number;
  totalCost: number;
  byPlatform: PlatformBreakdown[];
  byProvider: ProviderBreakdown[];
  topAnalyzers: AnalyzerUsage[];
  telemetrySchemaMissing: boolean;
  generatedAt: string;
}

const PLATFORM_COLOR: Record<Platform, string> = {
  Claude: "#d97757",
  Gemini: "#4285f4",
  OpenAI: "#10a37f",
  Mixed: "#a855f7",
  Other: "#6b7280",
};

const usd = (n: number) =>
  `$${(n || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: n < 1 ? 4 : 2,
  })}`;
const intf = (n: number) => (n || 0).toLocaleString("en-US");
const pct = (n: number) => `${((n || 0) * 100).toFixed(1)}%`;

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-900">
      <div className="text-xs uppercase tracking-wide text-gray-500">{label}</div>
      <div className="text-2xl font-semibold mt-1">{value}</div>
      {sub ? <div className="text-xs text-gray-500 mt-1">{sub}</div> : null}
    </div>
  );
}

export default function AdminAICostsPage() {
  const [data, setData] = useState<CostData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  const load = useCallback(async (windowDays: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/ai-costs?days=${windowDays}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as CostData;
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(days);
  }, [days, load]);

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">AI Platform Cost Monitor</h1>
          <p className="text-sm text-gray-500">
            Claude vs Gemini usage &amp; approximate spend (AI-7363)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-500" htmlFor="window">
            Window
          </label>
          <select
            id="window"
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-2 py-1 text-sm"
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
        </div>
      </div>

      <div className="rounded-lg border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/40 p-4 text-sm text-gray-700 dark:text-gray-300">
        <strong>Routing strategy:</strong> Claude handles system-architect /
        high-reasoning work; Gemini handles cost-effective content &amp; report
        generation (default). Keep the split tilted toward Gemini to control spend.
      </div>

      {loading && <div className="text-gray-500">Loading…</div>}
      {error && (
        <div className="rounded-lg border border-red-300 bg-red-50 dark:bg-red-950/40 p-4 text-red-700 dark:text-red-300">
          Failed to load cost data: {error}
        </div>
      )}

      {data && !loading && (
        <>
          {data.telemetrySchemaMissing && (
            <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/40 p-4 text-amber-800 dark:text-amber-300 text-sm">
              ⚠ Telemetry schema is missing the cost columns
              (<code>estimated_cost</code>, <code>output_tokens</code>). Showing an
              approximate blended-rate estimate. Apply{" "}
              <code>supabase-migrations/003_ai_cost_telemetry.sql</code> for exact
              persisted costs.
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Stat label="Total spend" value={usd(data.totalCost)} sub={`${data.costBasis} basis`} />
            <Stat label="Requests" value={intf(data.totalRequests)} />
            <Stat label="Tokens" value={intf(data.totalTokens)} />
            <Stat
              label="Claude share"
              value={pct(
                data.byPlatform.find((p) => p.platform === "Claude")?.share ?? 0
              )}
              sub="of spend"
            />
          </div>

          {/* Platform split bar */}
          <section className="space-y-2">
            <h2 className="text-lg font-semibold">Spend by platform</h2>
            {data.totalCost > 0 ? (
              <div className="flex h-5 w-full overflow-hidden rounded-full">
                {data.byPlatform.map((p) => (
                  <div
                    key={p.platform}
                    style={{
                      width: `${Math.max(p.share * 100, 0)}%`,
                      backgroundColor: PLATFORM_COLOR[p.platform],
                    }}
                    title={`${p.platform}: ${usd(p.cost)} (${pct(p.share)})`}
                  />
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">
                No AI usage recorded in this window.
              </p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-3">
              {data.byPlatform.map((p) => (
                <div
                  key={p.platform}
                  className="rounded-lg border border-gray-200 dark:border-gray-700 p-3 bg-white dark:bg-gray-900"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-block h-3 w-3 rounded-full"
                      style={{ backgroundColor: PLATFORM_COLOR[p.platform] }}
                    />
                    <span className="font-medium">{p.platform}</span>
                    <span className="ml-auto text-sm text-gray-500">
                      {pct(p.share)}
                    </span>
                  </div>
                  <div className="mt-2 text-lg font-semibold">{usd(p.cost)}</div>
                  <div className="text-xs text-gray-500">
                    {intf(p.requests)} req · {intf(p.tokens)} tok
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* By provider */}
          <section className="space-y-2">
            <h2 className="text-lg font-semibold">By provider / model</h2>
            <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800 text-left">
                  <tr>
                    <th className="px-3 py-2">Provider</th>
                    <th className="px-3 py-2">Platform</th>
                    <th className="px-3 py-2 text-right">Requests</th>
                    <th className="px-3 py-2 text-right">Tokens</th>
                    <th className="px-3 py-2 text-right">Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {data.byProvider.length === 0 && (
                    <tr>
                      <td className="px-3 py-3 text-gray-500" colSpan={5}>
                        No provider data.
                      </td>
                    </tr>
                  )}
                  {data.byProvider.map((r) => (
                    <tr
                      key={r.provider}
                      className="border-t border-gray-100 dark:border-gray-800"
                    >
                      <td className="px-3 py-2">{r.provider}</td>
                      <td className="px-3 py-2">{r.platform}</td>
                      <td className="px-3 py-2 text-right">{intf(r.requests)}</td>
                      <td className="px-3 py-2 text-right">{intf(r.tokens)}</td>
                      <td className="px-3 py-2 text-right">{usd(r.cost)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Top analyzers */}
          <section className="space-y-2">
            <h2 className="text-lg font-semibold">Top analyzers by volume</h2>
            <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800 text-left">
                  <tr>
                    <th className="px-3 py-2">Analyzer</th>
                    <th className="px-3 py-2">Model</th>
                    <th className="px-3 py-2 text-right">Requests</th>
                  </tr>
                </thead>
                <tbody>
                  {data.topAnalyzers.length === 0 && (
                    <tr>
                      <td className="px-3 py-3 text-gray-500" colSpan={3}>
                        No analyzer data.
                      </td>
                    </tr>
                  )}
                  {data.topAnalyzers.map((a, i) => (
                    <tr
                      key={`${a.analyzer}-${a.model}-${i}`}
                      className="border-t border-gray-100 dark:border-gray-800"
                    >
                      <td className="px-3 py-2">{a.analyzer}</td>
                      <td className="px-3 py-2">{a.model}</td>
                      <td className="px-3 py-2 text-right">{intf(a.requests)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <p className="text-xs text-gray-400">
            Cost basis: {data.costBasis}. Generated {data.generatedAt}.
          </p>
        </>
      )}
    </div>
  );
}
