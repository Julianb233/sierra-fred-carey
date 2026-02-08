"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Brain,
  Trash2,
  Loader2,
  AlertTriangle,
  HardDrive,
  Tag,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

// ============================================================================
// Types
// ============================================================================

interface MemoryStats {
  factsCount: number;
  episodesCount: number;
  decisionsCount: number;
  tierLimit: number;
  usagePercent: number;
}

interface SemanticFact {
  id: string;
  category: string;
  key: string;
  value: Record<string, unknown>;
  confidence: number;
  updatedAt: string;
}

const CATEGORY_OPTIONS = [
  { value: "all", label: "All Categories" },
  { value: "startup_facts", label: "Startup Facts" },
  { value: "user_preferences", label: "User Preferences" },
  { value: "market_knowledge", label: "Market Knowledge" },
  { value: "team_info", label: "Team Info" },
  { value: "investor_info", label: "Investor Info" },
  { value: "product_details", label: "Product Details" },
  { value: "metrics", label: "Metrics" },
  { value: "goals", label: "Goals" },
  { value: "challenges", label: "Challenges" },
  { value: "decisions", label: "Decisions" },
] as const;

const CATEGORY_LABELS: Record<string, string> = {
  startup_facts: "Startup Facts",
  user_preferences: "User Preferences",
  market_knowledge: "Market Knowledge",
  team_info: "Team Info",
  investor_info: "Investor Info",
  product_details: "Product Details",
  metrics: "Metrics",
  goals: "Goals",
  challenges: "Challenges",
  decisions: "Decisions",
};

// ============================================================================
// Component
// ============================================================================

export function MemoryManager() {
  const [stats, setStats] = useState<MemoryStats | null>(null);
  const [facts, setFacts] = useState<SemanticFact[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [isLoadingFacts, setIsLoadingFacts] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const [deletingFactId, setDeletingFactId] = useState<string | null>(null);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  // Fetch memory stats
  const fetchStats = useCallback(async () => {
    try {
      setIsLoadingStats(true);
      const res = await fetch("/api/fred/memory/stats");
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch {
      // Stats fetch failed silently
    } finally {
      setIsLoadingStats(false);
    }
  }, []);

  // Fetch facts (filtered by category)
  const fetchFacts = useCallback(async () => {
    try {
      setIsLoadingFacts(true);
      const params = new URLSearchParams({ type: "facts", limit: "100" });
      if (categoryFilter !== "all") {
        params.set("category", categoryFilter);
      }
      const res = await fetch(`/api/fred/memory?${params}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setFacts(
            (json.data || []).map((r: Record<string, unknown>) => ({
              id: r.id as string,
              category: r.category as string,
              key: r.key as string,
              value: r.value as Record<string, unknown>,
              confidence: r.confidence as number,
              updatedAt: r.updatedAt as string,
            }))
          );
        }
      }
    } catch {
      // Facts fetch failed silently
    } finally {
      setIsLoadingFacts(false);
    }
  }, [categoryFilter]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    fetchFacts();
  }, [fetchFacts]);

  // Delete a single fact
  const handleDeleteFact = async (category: string, key: string, factId: string) => {
    try {
      setDeletingFactId(factId);
      const res = await fetch("/api/fred/memory", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, key }),
      });
      if (res.ok) {
        setFacts((prev) => prev.filter((f) => f.id !== factId));
        toast.success(`Deleted "${key}"`);
        // Refresh stats
        fetchStats();
      } else {
        toast.error("Failed to delete memory");
      }
    } catch {
      toast.error("Failed to delete memory");
    } finally {
      setDeletingFactId(null);
    }
  };

  // Clear all memories
  const handleClearAll = async () => {
    try {
      setIsDeletingAll(true);
      // Delete all facts one by one (API only supports single fact deletion)
      const allRes = await fetch("/api/fred/memory?type=facts&limit=100");
      if (!allRes.ok) throw new Error("Failed to fetch facts");
      const allJson = await allRes.json();
      const allFacts = allJson.data || [];

      let deleted = 0;
      for (const fact of allFacts) {
        const res = await fetch("/api/fred/memory", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ category: fact.category, key: fact.key }),
        });
        if (res.ok) deleted++;
      }

      setFacts([]);
      toast.success(`Cleared ${deleted} memories`);
      fetchStats();
    } catch {
      toast.error("Failed to clear memories");
    } finally {
      setIsDeletingAll(false);
    }
  };

  // Bulk delete by category
  const handleBulkDeleteCategory = async (category: string) => {
    try {
      setBulkDeleting(true);
      const categoryFacts = facts.filter((f) => f.category === category);
      let deleted = 0;

      for (const fact of categoryFacts) {
        const res = await fetch("/api/fred/memory", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ category: fact.category, key: fact.key }),
        });
        if (res.ok) deleted++;
      }

      setFacts((prev) => prev.filter((f) => f.category !== category));
      toast.success(`Deleted ${deleted} facts from "${CATEGORY_LABELS[category] || category}"`);
      fetchStats();
    } catch {
      toast.error("Failed to bulk delete category");
    } finally {
      setBulkDeleting(false);
    }
  };

  const usageColor =
    (stats?.usagePercent ?? 0) >= 90
      ? "bg-red-500"
      : (stats?.usagePercent ?? 0) >= 70
        ? "bg-amber-500"
        : "bg-[#ff6a1a]";

  // Group facts by category for bulk delete
  const categoryGroups = facts.reduce<Record<string, number>>((acc, f) => {
    acc[f.category] = (acc[f.category] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      {/* Stats Section */}
      <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <HardDrive className="h-4 w-4 text-[#ff6a1a]" />
            Memory Usage
          </h3>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { fetchStats(); fetchFacts(); }}
              className="h-8 w-8 p-0"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 dark:border-red-800 dark:hover:bg-red-900/20"
                  disabled={isDeletingAll || !facts.length}
                >
                  {isDeletingAll ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5 mr-1" />
                  )}
                  Clear All
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                    Clear All Memories?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete all stored facts from FRED&apos;s memory.
                    FRED will no longer remember details about your startup, preferences,
                    or past decisions. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleClearAll}
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    Yes, Clear All Memories
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        {isLoadingStats ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-[#ff6a1a]" />
          </div>
        ) : stats ? (
          <div className="space-y-3">
            {/* Usage Bar */}
            <div>
              <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                <span>{stats.factsCount + stats.episodesCount + stats.decisionsCount} total items</span>
                <span>{stats.usagePercent}% of limit</span>
              </div>
              <Progress
                value={stats.usagePercent}
                className="h-2"
                indicatorClassName={usageColor}
              />
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-2 rounded-md bg-gray-50 dark:bg-gray-800/50">
                <p className="text-lg font-bold text-gray-900 dark:text-white">
                  {stats.factsCount}
                </p>
                <p className="text-xs text-gray-500">Facts</p>
              </div>
              <div className="text-center p-2 rounded-md bg-gray-50 dark:bg-gray-800/50">
                <p className="text-lg font-bold text-gray-900 dark:text-white">
                  {stats.episodesCount}
                </p>
                <p className="text-xs text-gray-500">Episodes</p>
              </div>
              <div className="text-center p-2 rounded-md bg-gray-50 dark:bg-gray-800/50">
                <p className="text-lg font-bold text-gray-900 dark:text-white">
                  {stats.decisionsCount}
                </p>
                <p className="text-xs text-gray-500">Decisions</p>
              </div>
            </div>

            <p className="text-xs text-gray-400 text-center">
              Tier limit: {stats.tierLimit} items
            </p>
          </div>
        ) : (
          <p className="text-sm text-gray-500 text-center py-2">
            Unable to load memory stats.
          </p>
        )}
      </div>

      {/* Category Filter & Bulk Delete */}
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="h-9">
              <Tag className="h-3.5 w-3.5 mr-1.5 text-gray-400" />
              <SelectValue placeholder="Filter by category" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORY_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Bulk delete per category */}
        {categoryFilter !== "all" && facts.length > 0 && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="text-red-600 border-red-200 hover:bg-red-50 dark:border-red-800"
                disabled={bulkDeleting}
              >
                {bulkDeleting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5 mr-1" />
                )}
                Delete Category
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  Delete all &quot;{CATEGORY_LABELS[categoryFilter] || categoryFilter}&quot; facts?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete {facts.length} fact(s) in this category.
                  This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => handleBulkDeleteCategory(categoryFilter)}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  Delete All in Category
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      {/* Category summary badges (when showing all) */}
      {categoryFilter === "all" && Object.keys(categoryGroups).length > 0 && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(categoryGroups).map(([cat, count]) => (
            <Badge
              key={cat}
              variant="secondary"
              className="text-xs cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700"
              onClick={() => setCategoryFilter(cat)}
            >
              {CATEGORY_LABELS[cat] || cat} ({count})
            </Badge>
          ))}
        </div>
      )}

      {/* Facts List */}
      {isLoadingFacts ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-[#ff6a1a]" />
        </div>
      ) : facts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <Brain className="h-10 w-10 text-gray-300 dark:text-gray-600 mb-3" />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {categoryFilter === "all"
              ? "No memories stored yet. Chat with FRED to build your knowledge base."
              : `No facts found in "${CATEGORY_LABELS[categoryFilter] || categoryFilter}".`}
          </p>
        </div>
      ) : (
        <div className="space-y-1">
          {facts.map((fact) => (
            <div
              key={fact.id}
              className="flex items-start justify-between px-3 py-2.5 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors group"
            >
              <div className="flex-1 min-w-0 mr-2">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {fact.key}
                  </p>
                  <Badge variant="outline" className="text-[10px] shrink-0">
                    {CATEGORY_LABELS[fact.category] || fact.category}
                  </Badge>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-1">
                  {formatValue(fact.value)}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDeleteFact(fact.category, fact.key, fact.id)}
                disabled={deletingFactId === fact.id}
                className="shrink-0 h-7 w-7 p-0 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                {deletingFactId === fact.id ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" />
                )}
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Helpers
// ============================================================================

function formatValue(value: Record<string, unknown>): string {
  if (typeof value === "string") return value;
  const str = JSON.stringify(value);
  if (str.length <= 150) return str.replace(/[{}"]/g, "").replace(/,/g, ", ");
  return str.slice(0, 150).replace(/[{}"]/g, "").replace(/,/g, ", ") + "...";
}
