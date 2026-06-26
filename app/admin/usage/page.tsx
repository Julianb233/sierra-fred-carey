"use client";

import { useEffect, useState } from "react";

/**
 * Admin Usage panel (AI-6487).
 * Surfaces credit/token consumption + the VC success metrics Fred outlined
 * (10+ min sessions, return-within-48h). Data from GET /api/admin/usage.
 */

interface UsageData {
  periodStart: string;
  usage: {
    totalCredits: number;
    totalActions: number;
    uniqueUsers: number;
    byAction: Record<string, { credits: number; count: number }>;
    topUsers: Array<{ userId: string; credits: number; actions: number }>;
  };
  metrics: {
    totalSessions: number;
    engagedSessions: number;
    engagedRate: number;
    avgDurationSeconds: number;
    returningUsers: number;
    usersWithSessions: number;
    returnWithin48hRate: number;
  };
  byTier?: Array<{
    tier: number;
    tierName: string;
    users: number;
    actions: number;
    credits: number;
  }>;
}

function pct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-900">
      <div className="text-xs uppercase tracking-wide text-gray-500">{label}</div>
      <div className="text-2xl font-semibold mt-1">{value}</div>
      {sub ? <div className="text-xs text-gray-500 mt-1">{sub}</div> : null}
    </div>
  );
}

export default function AdminUsagePage() {
  const [data, setData] = useState<UsageData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/admin/usage", { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as UsageData;
        if (!cancelled) setData(json);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) return <p className="text-gray-500">Loading usage…</p>;
  if (error)
    return <p className="text-red-500">Failed to load usage: {error}</p>;
  if (!data) return <p className="text-gray-500">No usage data.</p>;

  const { usage, metrics } = data;
  const byTier = data.byTier ?? [];
  const actionRows = Object.entries(usage.byAction).sort(
    (a, b) => b[1].credits - a[1].credits
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Usage &amp; Credits</h1>
        <p className="text-sm text-gray-500">
          Billing period since {new Date(data.periodStart).toLocaleDateString()}
        </p>
      </div>

      <section>
        <h2 className="text-lg font-semibold mb-3">Credit consumption</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Stat label="Total credits" value={usage.totalCredits.toLocaleString()} />
          <Stat label="Total actions" value={usage.totalActions.toLocaleString()} />
          <Stat label="Active users" value={usage.uniqueUsers.toLocaleString()} />
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3">
          Engagement metrics (for VC reporting)
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Stat
            label="10+ min sessions"
            value={pct(metrics.engagedRate)}
            sub={`${metrics.engagedSessions} / ${metrics.totalSessions} sessions`}
          />
          <Stat
            label="Avg session"
            value={`${Math.round(metrics.avgDurationSeconds / 60)} min`}
            sub={`${metrics.avgDurationSeconds}s`}
          />
          <Stat
            label="Return within 48h"
            value={pct(metrics.returnWithin48hRate)}
            sub={`${metrics.returningUsers} / ${metrics.usersWithSessions} users`}
          />
          <Stat label="Total sessions" value={metrics.totalSessions.toLocaleString()} />
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3">Usage by tier</h2>
        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800 text-left">
              <tr>
                <th className="px-4 py-2 font-medium">Tier</th>
                <th className="px-4 py-2 font-medium text-right">Active users</th>
                <th className="px-4 py-2 font-medium text-right">Actions</th>
                <th className="px-4 py-2 font-medium text-right">Credits</th>
              </tr>
            </thead>
            <tbody>
              {byTier.map((t) => (
                <tr key={t.tier} className="border-t border-gray-100 dark:border-gray-800">
                  <td className="px-4 py-2 font-medium">{t.tierName}</td>
                  <td className="px-4 py-2 text-right">{t.users.toLocaleString()}</td>
                  <td className="px-4 py-2 text-right">{t.actions.toLocaleString()}</td>
                  <td className="px-4 py-2 text-right">{t.credits.toLocaleString()}</td>
                </tr>
              ))}
              {byTier.length === 0 ? (
                <tr>
                  <td className="px-4 py-3 text-gray-500" colSpan={4}>
                    No usage recorded yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3">Credits by action</h2>
        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800 text-left">
              <tr>
                <th className="px-4 py-2 font-medium">Action</th>
                <th className="px-4 py-2 font-medium text-right">Count</th>
                <th className="px-4 py-2 font-medium text-right">Credits</th>
              </tr>
            </thead>
            <tbody>
              {actionRows.map(([action, v]) => (
                <tr key={action} className="border-t border-gray-100 dark:border-gray-800">
                  <td className="px-4 py-2 font-mono">{action}</td>
                  <td className="px-4 py-2 text-right">{v.count.toLocaleString()}</td>
                  <td className="px-4 py-2 text-right">{v.credits.toLocaleString()}</td>
                </tr>
              ))}
              {actionRows.length === 0 ? (
                <tr>
                  <td className="px-4 py-3 text-gray-500" colSpan={3}>
                    No usage recorded yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3">Top users by credits</h2>
        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800 text-left">
              <tr>
                <th className="px-4 py-2 font-medium">User ID</th>
                <th className="px-4 py-2 font-medium text-right">Actions</th>
                <th className="px-4 py-2 font-medium text-right">Credits</th>
              </tr>
            </thead>
            <tbody>
              {usage.topUsers.map((u) => (
                <tr key={u.userId} className="border-t border-gray-100 dark:border-gray-800">
                  <td className="px-4 py-2 font-mono text-xs">{u.userId}</td>
                  <td className="px-4 py-2 text-right">{u.actions.toLocaleString()}</td>
                  <td className="px-4 py-2 text-right">{u.credits.toLocaleString()}</td>
                </tr>
              ))}
              {usage.topUsers.length === 0 ? (
                <tr>
                  <td className="px-4 py-3 text-gray-500" colSpan={3}>
                    No usage recorded yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
