"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { RedFlag, Severity } from "@/lib/fred/types";

// ============================================================================
// Constants
// ============================================================================

const SEVERITY_CONFIG: Record<Severity, { color: string; dotClass: string; label: string }> = {
  critical: { color: "text-red-500", dotClass: "bg-red-500", label: "Critical" },
  high: { color: "text-orange-500", dotClass: "bg-orange-500", label: "High" },
  medium: { color: "text-yellow-500", dotClass: "bg-yellow-500", label: "Medium" },
  low: { color: "text-blue-500", dotClass: "bg-blue-500", label: "Low" },
};

const CATEGORY_ICONS: Record<string, string> = {
  market: "M",
  financial: "$",
  team: "T",
  product: "P",
  legal: "L",
  competitive: "C",
};

// ============================================================================
// Component
// ============================================================================

export function RedFlagsWidget() {
  const [flags, setFlags] = useState<RedFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchFlags() {
      try {
        const res = await fetch("/api/red-flags?status=active");
        if (!res.ok) {
          throw new Error(`Failed to fetch: ${res.status}`);
        }
        const json = await res.json();
        if (json.success) {
          setFlags(json.data || []);
        }
      } catch (e) {
        console.error("[RedFlagsWidget] Fetch error:", e);
        setError("Unable to load risk alerts");
      } finally {
        setLoading(false);
      }
    }
    fetchFlags();
  }, []);

  const handleAcknowledge = async (flagId: string) => {
    try {
      const res = await fetch(`/api/red-flags/${flagId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "acknowledged" }),
      });
      if (res.ok) {
        setFlags((prev) => prev.filter((f) => f.id !== flagId));
      }
    } catch (e) {
      console.error("[RedFlagsWidget] Acknowledge error:", e);
    }
  };

  // Group flags by severity
  const grouped = groupBySeverity(flags);
  const totalCount = flags.length;

  return (
    <Card className="p-6 border-orange-100/20 dark:border-white/5 bg-white/50 dark:bg-black/20 backdrop-blur-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <svg
            className="h-5 w-5 text-[#ff6a1a]"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <h3 className="font-bold text-lg text-gray-900 dark:text-white">
            Risk Alerts
          </h3>
        </div>
        {totalCount > 0 && (
          <Badge
            variant="secondary"
            className="bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400"
          >
            {totalCount}
          </Badge>
        )}
      </div>

      {/* Loading state */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse flex items-center gap-3">
              <div className="h-3 w-3 rounded-full bg-gray-200 dark:bg-gray-700" />
              <div className="flex-1 h-4 bg-gray-200 dark:bg-gray-700 rounded" />
            </div>
          ))}
        </div>
      )}

      {/* Error state */}
      {!loading && error && (
        <p className="text-sm text-gray-500 dark:text-gray-400">{error}</p>
      )}

      {/* Empty state */}
      {!loading && !error && totalCount === 0 && (
        <div className="flex items-center gap-3 py-4 text-center">
          <svg
            className="h-6 w-6 text-green-500 mx-auto"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No active risk flags detected
          </p>
        </div>
      )}

      {/* Flags grouped by severity */}
      {!loading && !error && totalCount > 0 && (
        <div className="space-y-4">
          {(["critical", "high", "medium", "low"] as Severity[]).map((sev) => {
            const items = grouped[sev];
            if (!items || items.length === 0) return null;
            const config = SEVERITY_CONFIG[sev];

            return (
              <div key={sev}>
                <p className={`text-xs font-semibold uppercase tracking-wider mb-2 ${config.color}`}>
                  {config.label} ({items.length})
                </p>
                <div className="space-y-2">
                  {items.map((flag) => (
                    <div
                      key={flag.id}
                      className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                    >
                      <div className={`mt-1.5 h-2.5 w-2.5 rounded-full flex-shrink-0 ${config.dotClass}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
                            {CATEGORY_ICONS[flag.category] || "?"} {flag.category}
                          </span>
                        </div>
                        <p className="text-sm text-gray-900 dark:text-white mt-0.5 truncate">
                          {flag.title}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          {formatDetectedDate(flag.detectedAt)}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs h-7 px-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex-shrink-0"
                        onClick={() => flag.id && handleAcknowledge(flag.id)}
                      >
                        Acknowledge
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

// ============================================================================
// Helpers
// ============================================================================

function groupBySeverity(flags: RedFlag[]): Record<Severity, RedFlag[]> {
  const groups: Record<Severity, RedFlag[]> = {
    critical: [],
    high: [],
    medium: [],
    low: [],
  };

  for (const flag of flags) {
    if (groups[flag.severity]) {
      groups[flag.severity].push(flag);
    }
  }

  return groups;
}

function formatDetectedDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) return "Just now";
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  } catch {
    return "";
  }
}
