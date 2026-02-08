"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Brain,
  Search,
  Trash2,
  Loader2,
  BookOpen,
  MessageSquare,
  Scale,
  Tag,
  Clock,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  AlertTriangle,
  Copy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { FeatureLock } from "@/components/tier/feature-lock";
import { MemoryManager } from "@/components/memory/memory-manager";
import { UserTier } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// ============================================================================
// Types
// ============================================================================

interface SemanticFact {
  id: string;
  category: string;
  key: string;
  value: Record<string, unknown>;
  confidence: number;
  updatedAt: string;
}

interface EpisodicItem {
  id: string;
  sessionId: string;
  eventType: string;
  content: Record<string, unknown>;
  importanceScore: number;
  createdAt: string;
}

interface DecisionItem {
  id: string;
  sessionId: string;
  decisionType: string;
  inputContext: Record<string, unknown>;
  recommendation?: Record<string, unknown>;
  confidence?: number;
  outcome?: Record<string, unknown>;
  createdAt: string;
}

type TabKey = "facts" | "episodes" | "decisions";

const TABS: { key: TabKey; label: string; icon: typeof BookOpen }[] = [
  { key: "facts", label: "Facts", icon: BookOpen },
  { key: "episodes", label: "Conversations", icon: MessageSquare },
  { key: "decisions", label: "Decisions", icon: Scale },
];

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

const PAGE_SIZE = 20;

// ============================================================================
// Page Component
// ============================================================================

export default function MemoryBrowserPage() {
  const [userTier, setUserTier] = useState<UserTier>(UserTier.FREE);
  const [tierLoaded, setTierLoaded] = useState(false);

  // Fetch the user's tier on mount
  useEffect(() => {
    async function loadTier() {
      try {
        const res = await fetch("/api/user/tier");
        if (res.ok) {
          const data = await res.json();
          const tierMap: Record<string, UserTier> = {
            free: UserTier.FREE,
            pro: UserTier.PRO,
            studio: UserTier.STUDIO,
          };
          setUserTier(tierMap[data.tier] ?? UserTier.FREE);
        }
      } catch {
        // Default to free
      } finally {
        setTierLoaded(true);
      }
    }
    loadTier();
  }, []);

  if (!tierLoaded) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-6 w-6 animate-spin text-[#ff6a1a]" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Brain className="h-6 w-6 text-[#ff6a1a]" />
          FRED Memory Browser
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Explore what FRED remembers about you and your startup.
        </p>
      </div>

      <FeatureLock
        requiredTier={UserTier.PRO}
        currentTier={userTier}
        featureName="Memory Browser"
        description="Browse and manage FRED's knowledge about your startup with the Pro plan."
        className="min-h-[400px]"
      >
        {/* Memory Manager: stats, usage bar, category filter, bulk delete */}
        <div className="mb-6">
          <MemoryManager />
        </div>

        {/* Memory Browser: search + tabs */}
        <MemoryBrowser />
      </FeatureLock>
    </div>
  );
}

// ============================================================================
// Memory Browser (inner component, only rendered for Pro+)
// ============================================================================

function MemoryBrowser() {
  const [activeTab, setActiveTab] = useState<TabKey>("facts");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Data stores
  const [facts, setFacts] = useState<SemanticFact[]>([]);
  const [episodes, setEpisodes] = useState<EpisodicItem[]>([]);
  const [decisions, setDecisions] = useState<DecisionItem[]>([]);

  // Pagination state per tab
  const [factsPage, setFactsPage] = useState(1);
  const [episodesPage, setEpisodesPage] = useState(1);
  const [decisionsPage, setDecisionsPage] = useState(1);

  // Delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState<{ category: string; key: string; factKey: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchData = useCallback(async (tab: TabKey) => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ type: tab, limit: "100" });
      const res = await fetch(`/api/fred/memory?${params}`);
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to fetch memory");
      }

      if (tab === "facts") {
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
      } else if (tab === "episodes") {
        setEpisodes(
          (json.data || []).map((r: Record<string, unknown>) => ({
            id: r.id as string,
            sessionId: r.sessionId as string,
            eventType: r.eventType as string,
            content: r.content as Record<string, unknown>,
            importanceScore: r.importanceScore as number,
            createdAt: r.createdAt as string,
          }))
        );
      } else if (tab === "decisions") {
        setDecisions(
          (json.data || []).map((r: Record<string, unknown>) => ({
            id: r.id as string,
            sessionId: r.sessionId as string,
            decisionType: r.decisionType as string,
            inputContext: r.inputContext as Record<string, unknown>,
            recommendation: r.recommendation as Record<string, unknown> | undefined,
            confidence: r.confidence as number | undefined,
            outcome: r.outcome as Record<string, unknown> | undefined,
            createdAt: r.createdAt as string,
          }))
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load data when tab changes
  useEffect(() => {
    fetchData(activeTab);
  }, [activeTab, fetchData]);

  // Reset pages when search query changes
  useEffect(() => {
    setFactsPage(1);
    setEpisodesPage(1);
    setDecisionsPage(1);
  }, [searchQuery]);

  // Delete fact with confirmation dialog
  const handleDeleteFact = async () => {
    if (!deleteTarget) return;
    const { category, key: factKey } = deleteTarget;

    // Optimistic removal
    const previousFacts = facts;
    setFacts((prev) => prev.filter((f) => !(f.category === category && f.key === factKey)));
    setIsDeleting(true);

    try {
      const res = await fetch("/api/fred/memory", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, key: factKey }),
      });
      if (res.ok) {
        toast.success(`Deleted "${factKey}"`);
      } else {
        // Restore on failure
        setFacts(previousFacts);
        toast.error("Failed to delete memory");
      }
    } catch {
      // Restore on failure
      setFacts(previousFacts);
      toast.error("Failed to delete memory");
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  };

  // Copy fact value to clipboard
  const handleCopyValue = async (value: Record<string, unknown>) => {
    try {
      const text = formatValue(value);
      await navigator.clipboard.writeText(text);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Failed to copy to clipboard");
    }
  };

  // Client-side text search filtering
  const filteredFacts = useMemo(() => {
    if (!searchQuery.trim()) return facts;
    const q = searchQuery.toLowerCase();
    return facts.filter(
      (f) =>
        f.key.toLowerCase().includes(q) ||
        f.category.toLowerCase().includes(q) ||
        JSON.stringify(f.value).toLowerCase().includes(q)
    );
  }, [facts, searchQuery]);

  const filteredEpisodes = useMemo(() => {
    if (!searchQuery.trim()) return episodes;
    const q = searchQuery.toLowerCase();
    return episodes.filter(
      (e) =>
        e.eventType.toLowerCase().includes(q) ||
        JSON.stringify(e.content).toLowerCase().includes(q)
    );
  }, [episodes, searchQuery]);

  const filteredDecisions = useMemo(() => {
    if (!searchQuery.trim()) return decisions;
    const q = searchQuery.toLowerCase();
    return decisions.filter(
      (d) =>
        d.decisionType.toLowerCase().includes(q) ||
        JSON.stringify(d.inputContext).toLowerCase().includes(q) ||
        JSON.stringify(d.recommendation).toLowerCase().includes(q)
    );
  }, [decisions, searchQuery]);

  // Paginated data
  const paginatedFacts = useMemo(() => {
    const start = (factsPage - 1) * PAGE_SIZE;
    return filteredFacts.slice(start, start + PAGE_SIZE);
  }, [filteredFacts, factsPage]);

  const paginatedEpisodes = useMemo(() => {
    const start = (episodesPage - 1) * PAGE_SIZE;
    return filteredEpisodes.slice(start, start + PAGE_SIZE);
  }, [filteredEpisodes, episodesPage]);

  const paginatedDecisions = useMemo(() => {
    const start = (decisionsPage - 1) * PAGE_SIZE;
    return filteredDecisions.slice(start, start + PAGE_SIZE);
  }, [filteredDecisions, decisionsPage]);

  // Page counts
  const factsPageCount = Math.max(1, Math.ceil(filteredFacts.length / PAGE_SIZE));
  const episodesPageCount = Math.max(1, Math.ceil(filteredEpisodes.length / PAGE_SIZE));
  const decisionsPageCount = Math.max(1, Math.ceil(filteredDecisions.length / PAGE_SIZE));

  // Group paginated facts by category
  const groupedFacts = useMemo(() => {
    const groups: Record<string, SemanticFact[]> = {};
    for (const fact of paginatedFacts) {
      if (!groups[fact.category]) groups[fact.category] = [];
      groups[fact.category].push(fact);
    }
    return groups;
  }, [paginatedFacts]);

  // Current page/total for active tab
  const currentPage = activeTab === "facts" ? factsPage : activeTab === "episodes" ? episodesPage : decisionsPage;
  const totalPages = activeTab === "facts" ? factsPageCount : activeTab === "episodes" ? episodesPageCount : decisionsPageCount;
  const totalItems = activeTab === "facts" ? filteredFacts.length : activeTab === "episodes" ? filteredEpisodes.length : filteredDecisions.length;
  const setCurrentPage = activeTab === "facts" ? setFactsPage : activeTab === "episodes" ? setEpisodesPage : setDecisionsPage;

  return (
    <div className="space-y-4">
      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search memories..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const count = tab.key === "facts" ? filteredFacts.length : tab.key === "episodes" ? filteredEpisodes.length : filteredDecisions.length;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                activeTab === tab.key
                  ? "bg-white dark:bg-gray-700 text-[#ff6a1a] shadow-sm"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              )}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
              <Badge variant="secondary" className="ml-1 text-[10px] h-5 min-w-5 px-1.5">
                {count}
              </Badge>
            </button>
          );
        })}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-[#ff6a1a]" />
        </div>
      )}

      {/* Content */}
      {!isLoading && (
        <ScrollArea className="h-[60vh]">
          <AnimatePresence mode="wait">
            {activeTab === "facts" && (
              <FactsPanel
                key="facts"
                grouped={groupedFacts}
                onRequestDelete={(category, factKey) =>
                  setDeleteTarget({ category, key: factKey, factKey })
                }
                onCopyValue={handleCopyValue}
              />
            )}
            {activeTab === "episodes" && (
              <EpisodesPanel key="episodes" episodes={paginatedEpisodes} />
            )}
            {activeTab === "decisions" && (
              <DecisionsPanel key="decisions" decisions={paginatedDecisions} />
            )}
          </AnimatePresence>
        </ScrollArea>
      )}

      {/* Pagination */}
      {!isLoading && totalItems > 0 && (
        <div className="flex items-center justify-between px-1 pt-2 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Showing {Math.min((currentPage - 1) * PAGE_SIZE + 1, totalItems)}&ndash;{Math.min(currentPage * PAGE_SIZE, totalItems)} of {totalItems}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="h-8 w-8 p-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-gray-700 dark:text-gray-300 min-w-[4rem] text-center">
              {currentPage} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="h-8 w-8 p-0"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Delete Memory?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deleteTarget?.factKey}&quot;?
              This action cannot be undone and FRED will no longer remember this fact.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteFact}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                  Deleting...
                </>
              ) : (
                "Yes, Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ============================================================================
// Facts Panel
// ============================================================================

function FactsPanel({
  grouped,
  onRequestDelete,
  onCopyValue,
}: {
  grouped: Record<string, SemanticFact[]>;
  onRequestDelete: (category: string, key: string) => void;
  onCopyValue: (value: Record<string, unknown>) => void;
}) {
  const categories = Object.keys(grouped);

  if (categories.length === 0) {
    return (
      <EmptyState message="No facts stored yet. Chat with FRED to build your knowledge base." />
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="space-y-4"
    >
      {categories.map((category) => (
        <CategoryGroup
          key={category}
          category={category}
          facts={grouped[category]}
          onRequestDelete={onRequestDelete}
          onCopyValue={onCopyValue}
        />
      ))}
    </motion.div>
  );
}

function CategoryGroup({
  category,
  facts,
  onRequestDelete,
  onCopyValue,
}: {
  category: string;
  facts: SemanticFact[];
  onRequestDelete: (category: string, key: string) => void;
  onCopyValue: (value: Record<string, unknown>) => void;
}) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      >
        <span className="flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-white">
          <Tag className="h-4 w-4 text-[#ff6a1a]" />
          {CATEGORY_LABELS[category] || category}
          <Badge variant="secondary" className="ml-1 text-xs">
            {facts.length}
          </Badge>
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-gray-500 transition-transform",
            expanded && "rotate-180"
          )}
        />
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {facts.map((fact) => (
                <div
                  key={fact.id}
                  className="flex items-start justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors group"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {fact.key}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5 line-clamp-2">
                      {formatValue(fact.value)}
                    </p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                      <span>Confidence: {Math.round(fact.confidence * 100)}%</span>
                      <span>{formatDate(fact.updatedAt)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onCopyValue(fact.value)}
                      className="h-8 w-8 p-0 text-gray-400 hover:text-[#ff6a1a]"
                      title="Copy value"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onRequestDelete(fact.category, fact.key)}
                      className="h-8 w-8 p-0 text-gray-400 hover:text-red-500"
                      title="Delete fact"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================================================
// Episodes Panel
// ============================================================================

function EpisodesPanel({ episodes }: { episodes: EpisodicItem[] }) {
  if (episodes.length === 0) {
    return <EmptyState message="No conversation episodes recorded yet." />;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="space-y-2"
    >
      {episodes.map((ep) => (
        <div
          key={ep.id}
          className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-[#ff6a1a]/30 transition-colors"
        >
          <div className="shrink-0 mt-0.5">
            <div
              className={cn(
                "h-8 w-8 rounded-full flex items-center justify-center text-xs font-medium",
                ep.eventType === "conversation"
                  ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                  : ep.eventType === "decision"
                    ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                    : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400"
              )}
            >
              {ep.eventType === "conversation" ? (
                <MessageSquare className="h-4 w-4" />
              ) : ep.eventType === "decision" ? (
                <Scale className="h-4 w-4" />
              ) : (
                <Clock className="h-4 w-4" />
              )}
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs capitalize">
                {ep.eventType}
              </Badge>
              <span className="text-xs text-gray-400">
                Importance: {Math.round(ep.importanceScore * 100)}%
              </span>
            </div>
            <p className="text-sm text-gray-700 dark:text-gray-300 mt-1 line-clamp-3">
              {formatValue(ep.content)}
            </p>
            <p className="text-xs text-gray-400 mt-1">{formatDate(ep.createdAt)}</p>
          </div>
        </div>
      ))}
    </motion.div>
  );
}

// ============================================================================
// Decisions Panel
// ============================================================================

function DecisionsPanel({ decisions }: { decisions: DecisionItem[] }) {
  if (decisions.length === 0) {
    return <EmptyState message="No decisions logged yet." />;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="space-y-2"
    >
      {decisions.map((d) => (
        <div
          key={d.id}
          className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-[#ff6a1a]/30 transition-colors"
        >
          <div className="flex items-center justify-between mb-2">
            <Badge
              variant="outline"
              className={cn(
                "text-xs capitalize",
                d.decisionType === "auto"
                  ? "border-green-400 text-green-700 dark:text-green-400"
                  : d.decisionType === "recommended"
                    ? "border-blue-400 text-blue-700 dark:text-blue-400"
                    : "border-amber-400 text-amber-700 dark:text-amber-400"
              )}
            >
              {d.decisionType}
            </Badge>
            {d.confidence !== undefined && (
              <span className="text-xs text-gray-500">
                {Math.round(d.confidence * 100)}% confidence
              </span>
            )}
          </div>

          <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">
            {formatValue(d.inputContext)}
          </p>

          {d.recommendation && (
            <div className="mt-2 p-2 rounded bg-blue-50 dark:bg-blue-900/20">
              <p className="text-xs font-medium text-blue-700 dark:text-blue-400 mb-0.5">
                Recommendation
              </p>
              <p className="text-xs text-blue-600 dark:text-blue-300 line-clamp-2">
                {formatValue(d.recommendation)}
              </p>
            </div>
          )}

          {d.outcome && (
            <div className="mt-2 p-2 rounded bg-green-50 dark:bg-green-900/20">
              <p className="text-xs font-medium text-green-700 dark:text-green-400 mb-0.5">
                Outcome
              </p>
              <p className="text-xs text-green-600 dark:text-green-300 line-clamp-2">
                {formatValue(d.outcome)}
              </p>
            </div>
          )}

          <p className="text-xs text-gray-400 mt-2">{formatDate(d.createdAt)}</p>
        </div>
      ))}
    </motion.div>
  );
}

// ============================================================================
// Shared Helpers
// ============================================================================

function EmptyState({ message }: { message: string }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center py-16 text-center"
    >
      <Brain className="h-12 w-12 text-gray-300 dark:text-gray-600 mb-4" />
      <p className="text-sm text-gray-500 dark:text-gray-400">{message}</p>
    </motion.div>
  );
}

function formatValue(value: Record<string, unknown>): string {
  if (typeof value === "string") return value;

  // Try to show a human-readable summary
  const str = JSON.stringify(value);
  if (str.length <= 200) return str.replace(/[{}"]/g, "").replace(/,/g, ", ");

  return str.slice(0, 200).replace(/[{}"]/g, "").replace(/,/g, ", ") + "...";
}

function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    });
  } catch {
    return dateStr;
  }
}
