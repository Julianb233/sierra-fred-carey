"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  Plus,
  GripVertical,
  CalendarDays,
  Target,
  MessageSquare,
  ChevronDown,
  Check,
  X,
  Users,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FeatureLock } from "@/components/tier/feature-lock";
import { useUserTier } from "@/lib/context/tier-context";
import { UserTier } from "@/lib/constants";
import { cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

interface PipelineInvestor {
  id: string;
  name: string;
  firm: string | null;
  email: string | null;
  website: string | null;
  stageFocus: string[] | null;
  sectorFocus: string[] | null;
  location: string | null;
}

interface PipelineEntry {
  id: string;
  investorId: string;
  matchId: string | null;
  stage: string;
  notes: string | null;
  nextAction: string | null;
  nextActionDate: string | null;
  lastContactAt: string | null;
  createdAt: string;
  updatedAt: string;
  investor: PipelineInvestor | null;
  matchScore: number | null;
}

interface AddInvestorOption {
  id: string;
  name: string;
  firm: string | null;
}

// ============================================================================
// Stage configuration
// ============================================================================

const PIPELINE_STAGES = [
  {
    key: "identified",
    label: "Identified",
    color: "bg-gray-100 dark:bg-gray-800",
    textColor: "text-gray-600 dark:text-gray-400",
    headerColor: "border-gray-300 dark:border-gray-600",
  },
  {
    key: "contacted",
    label: "Contacted",
    color: "bg-blue-50 dark:bg-blue-900/20",
    textColor: "text-blue-600 dark:text-blue-400",
    headerColor: "border-blue-400 dark:border-blue-500",
  },
  {
    key: "meeting",
    label: "Meeting",
    color: "bg-purple-50 dark:bg-purple-900/20",
    textColor: "text-purple-600 dark:text-purple-400",
    headerColor: "border-purple-400 dark:border-purple-500",
  },
  {
    key: "due_diligence",
    label: "Due Diligence",
    color: "bg-yellow-50 dark:bg-yellow-900/20",
    textColor: "text-yellow-600 dark:text-yellow-400",
    headerColor: "border-yellow-400 dark:border-yellow-500",
  },
  {
    key: "term_sheet",
    label: "Term Sheet",
    color: "bg-orange-50 dark:bg-orange-900/20",
    textColor: "text-orange-600 dark:text-orange-400",
    headerColor: "border-orange-400 dark:border-orange-500",
  },
  {
    key: "committed",
    label: "Committed",
    color: "bg-green-50 dark:bg-green-900/20",
    textColor: "text-green-600 dark:text-green-400",
    headerColor: "border-green-400 dark:border-green-500",
  },
  {
    key: "passed",
    label: "Passed",
    color: "bg-red-50 dark:bg-red-900/20",
    textColor: "text-red-600 dark:text-red-400",
    headerColor: "border-red-400 dark:border-red-500",
  },
];

function getScoreColor(score: number): string {
  if (score >= 70) return "bg-green-500 text-white";
  if (score >= 40) return "bg-yellow-500 text-white";
  return "bg-red-500 text-white";
}

// ============================================================================
// Main Page
// ============================================================================

export default function PipelinePage() {
  const { tier, isLoading: isTierLoading } = useUserTier();

  if (isTierLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#ff6a1a]" />
      </div>
    );
  }

  return (
    <FeatureLock
      requiredTier={UserTier.STUDIO}
      currentTier={tier}
      featureName="Investor Pipeline"
      description="Track investor conversations through stages from first contact to commitment."
    >
      <PipelineContent />
    </FeatureLock>
  );
}

// ============================================================================
// Content Component
// ============================================================================

function PipelineContent() {
  const [pipeline, setPipeline] = useState<PipelineEntry[]>([]);
  const [grouped, setGrouped] = useState<Record<string, PipelineEntry[]>>({});
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Add investor modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [availableInvestors, setAvailableInvestors] = useState<
    AddInvestorOption[]
  >([]);
  const [addingInvestor, setAddingInvestor] = useState(false);
  const [selectedAddInvestor, setSelectedAddInvestor] = useState("");

  // Drag and drop state
  const [draggedEntry, setDraggedEntry] = useState<PipelineEntry | null>(null);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);

  // Stage change dropdown
  const [stageDropdown, setStageDropdown] = useState<string | null>(null);

  // Fetch pipeline data
  const fetchPipeline = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch("/api/investors/pipeline");
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to load pipeline");
        return;
      }

      setPipeline(data.pipeline || []);
      setGrouped(data.grouped || {});
      setCounts(data.counts || {});
      setTotal(data.total || 0);
    } catch {
      setError("Failed to load pipeline data");
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch available investors for adding
  const fetchInvestors = useCallback(async () => {
    try {
      const matchRes = await fetch("/api/investors/match");
      if (matchRes.ok) {
        const matchData = await matchRes.json();
        const investorOptions: AddInvestorOption[] = [];
        for (const m of matchData.matches || []) {
          if (!investorOptions.find((i) => i.id === m.investorId)) {
            investorOptions.push({
              id: m.investorId,
              name: m.investorName,
              firm: m.investorFirm,
            });
          }
        }
        setAvailableInvestors(investorOptions);
      }
    } catch {
      // Non-critical
    }
  }, []);

  useEffect(() => {
    fetchPipeline();
    fetchInvestors();
  }, [fetchPipeline, fetchInvestors]);

  // Handle stage change via API
  async function handleStageChange(entryId: string, newStage: string) {
    try {
      const res = await fetch("/api/investors/pipeline", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: entryId, stage: newStage }),
      });

      if (res.ok) {
        await fetchPipeline();
      } else {
        const data = await res.json();
        setError(data.error || "Failed to update stage");
      }
    } catch {
      setError("Failed to update pipeline stage");
    }
    setStageDropdown(null);
  }

  // Handle add investor to pipeline
  async function handleAddInvestor() {
    if (!selectedAddInvestor) return;

    try {
      setAddingInvestor(true);
      const res = await fetch("/api/investors/pipeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ investorId: selectedAddInvestor }),
      });

      if (res.ok) {
        setShowAddModal(false);
        setSelectedAddInvestor("");
        await fetchPipeline();
      } else {
        const data = await res.json();
        setError(data.error || "Failed to add investor");
      }
    } catch {
      setError("Failed to add investor to pipeline");
    } finally {
      setAddingInvestor(false);
    }
  }

  // Drag and drop handlers
  function handleDragStart(entry: PipelineEntry) {
    setDraggedEntry(entry);
  }

  function handleDragOver(e: React.DragEvent, stageKey: string) {
    e.preventDefault();
    setDragOverStage(stageKey);
  }

  function handleDragLeave() {
    setDragOverStage(null);
  }

  async function handleDrop(stageKey: string) {
    if (draggedEntry && draggedEntry.stage !== stageKey) {
      await handleStageChange(draggedEntry.id, stageKey);
    }
    setDraggedEntry(null);
    setDragOverStage(null);
  }

  function handleDragEnd() {
    setDraggedEntry(null);
    setDragOverStage(null);
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-full mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard/investor-targeting">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                Investor Pipeline
              </h1>
              <p className="text-sm text-gray-500">
                Track conversations from first contact to commitment
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/dashboard/investor-targeting/outreach">
              <Button variant="outline" size="sm" className="gap-2">
                <MessageSquare className="h-4 w-4" />
                Outreach
              </Button>
            </Link>
            <Button
              onClick={() => setShowAddModal(true)}
              className="bg-[#ff6a1a] hover:bg-[#ea580c] gap-2"
              size="sm"
            >
              <Plus className="h-4 w-4" />
              Add Investor
            </Button>
          </div>
        </div>
      </header>

      <main className="px-4 py-6">
        {/* Summary Stats */}
        <div className="flex flex-wrap items-center gap-4 mb-6">
          <div className="flex items-center gap-2 text-sm">
            <Users className="h-4 w-4 text-gray-400" />
            <span className="text-gray-600 dark:text-gray-400">
              <span className="font-semibold text-gray-900 dark:text-white">
                {total}
              </span>{" "}
              in pipeline
            </span>
          </div>
          {PIPELINE_STAGES.map((stage) => {
            const count = counts[stage.key] || 0;
            if (count === 0) return null;
            return (
              <div
                key={stage.key}
                className="flex items-center gap-1.5 text-xs"
              >
                <span
                  className={cn(
                    "w-2 h-2 rounded-full",
                    stage.headerColor.replace("border-", "bg-")
                  )}
                />
                <span className="text-gray-500">
                  {stage.label}: {count}
                </span>
              </div>
            );
          })}
        </div>

        {/* Error */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-3"
          >
            <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
            <p className="text-red-700 dark:text-red-400">{error}</p>
            <button
              onClick={() => setError(null)}
              className="ml-auto"
            >
              <X className="h-4 w-4 text-red-400" />
            </button>
          </motion.div>
        )}

        {loading ? (
          /* Loading skeleton */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4">
            {PIPELINE_STAGES.map((stage) => (
              <div key={stage.key} className="space-y-3">
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                <div className="h-24 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
              </div>
            ))}
          </div>
        ) : total === 0 ? (
          /* Empty state */
          <Card>
            <CardContent className="py-16 text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", delay: 0.1 }}
                className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-[#ff6a1a]/20 to-orange-400/20 flex items-center justify-center"
              >
                <TrendingUp className="h-8 w-8 text-[#ff6a1a]" />
              </motion.div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Start Your Pipeline
              </h3>
              <p className="text-gray-500 max-w-md mx-auto mb-6">
                Add investors from your matched list to begin tracking
                conversations. Move them through stages as your outreach
                progresses.
              </p>
              <Button
                onClick={() => setShowAddModal(true)}
                className="bg-[#ff6a1a] hover:bg-[#ea580c]"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add First Investor
              </Button>
            </CardContent>
          </Card>
        ) : (
          /* Kanban Board */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4">
            {PIPELINE_STAGES.map((stage) => {
              const entries = grouped[stage.key] || [];
              const isDragOver = dragOverStage === stage.key;

              return (
                <div
                  key={stage.key}
                  className="min-h-[200px]"
                  onDragOver={(e) => handleDragOver(e, stage.key)}
                  onDragLeave={handleDragLeave}
                  onDrop={() => handleDrop(stage.key)}
                >
                  {/* Stage header */}
                  <div
                    className={cn(
                      "border-t-2 rounded-t-lg px-3 py-2 mb-3",
                      stage.headerColor
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <h3
                        className={cn(
                          "text-sm font-semibold",
                          stage.textColor
                        )}
                      >
                        {stage.label}
                      </h3>
                      <span
                        className={cn(
                          "text-xs font-medium px-1.5 py-0.5 rounded-full",
                          stage.color,
                          stage.textColor
                        )}
                      >
                        {entries.length}
                      </span>
                    </div>
                  </div>

                  {/* Drop zone highlight */}
                  <div
                    className={cn(
                      "space-y-2 min-h-[100px] rounded-lg p-1 transition-colors",
                      isDragOver && "bg-[#ff6a1a]/10 ring-2 ring-[#ff6a1a]/30"
                    )}
                  >
                    {entries.map((entry) => (
                      <PipelineCard
                        key={entry.id}
                        entry={entry}
                        onDragStart={() => handleDragStart(entry)}
                        onDragEnd={handleDragEnd}
                        stageDropdownOpen={stageDropdown === entry.id}
                        onToggleStageDropdown={() =>
                          setStageDropdown(
                            stageDropdown === entry.id ? null : entry.id
                          )
                        }
                        onStageChange={(newStage) =>
                          handleStageChange(entry.id, newStage)
                        }
                        currentStage={stage.key}
                      />
                    ))}

                    {entries.length === 0 && !isDragOver && (
                      <div className="text-center py-6">
                        <p className="text-xs text-gray-400">
                          No investors at this stage
                        </p>
                      </div>
                    )}

                    {isDragOver && (
                      <div className="border-2 border-dashed border-[#ff6a1a]/40 rounded-lg p-4 text-center">
                        <p className="text-xs text-[#ff6a1a]">
                          Drop here to move to {stage.label}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Add Investor Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-md w-full p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Add Investor to Pipeline
                </h3>
                <button onClick={() => setShowAddModal(false)}>
                  <X className="h-5 w-5 text-gray-400" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Select Investor
                  </label>
                  <div className="relative">
                    <select
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm appearance-none pr-8"
                      value={selectedAddInvestor}
                      onChange={(e) => setSelectedAddInvestor(e.target.value)}
                    >
                      <option value="">Choose an investor...</option>
                      {availableInvestors
                        .filter(
                          (inv) =>
                            !pipeline.find(
                              (p) => p.investorId === inv.id
                            )
                        )
                        .map((inv) => (
                          <option key={inv.id} value={inv.id}>
                            {inv.name}
                            {inv.firm ? ` (${inv.firm})` : ""}
                          </option>
                        ))}
                    </select>
                    <ChevronDown className="absolute right-2.5 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>

                {availableInvestors.filter(
                  (inv) =>
                    !pipeline.find((p) => p.investorId === inv.id)
                ).length === 0 && (
                  <p className="text-sm text-gray-500">
                    All matched investors are already in the pipeline. Run AI
                    matching on more investor lists to add more.
                  </p>
                )}

                <div className="flex justify-end gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setShowAddModal(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleAddInvestor}
                    disabled={addingInvestor || !selectedAddInvestor}
                    className="bg-[#ff6a1a] hover:bg-[#ea580c]"
                  >
                    {addingInvestor ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Plus className="h-4 w-4 mr-2" />
                    )}
                    {addingInvestor ? "Adding..." : "Add to Pipeline"}
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </main>
    </div>
  );
}

// ============================================================================
// Pipeline Card Component
// ============================================================================

function PipelineCard({
  entry,
  onDragStart,
  onDragEnd,
  stageDropdownOpen,
  onToggleStageDropdown,
  onStageChange,
  currentStage,
}: {
  entry: PipelineEntry;
  onDragStart: () => void;
  onDragEnd: () => void;
  stageDropdownOpen: boolean;
  onToggleStageDropdown: () => void;
  onStageChange: (stage: string) => void;
  currentStage: string;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative"
    >
      <Card
        draggable
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        className="cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow"
      >
        <CardContent className="p-3">
          {/* Drag handle + Investor info */}
          <div className="flex items-start gap-2">
            <GripVertical className="h-4 w-4 text-gray-300 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                {entry.investor?.name || "Unknown Investor"}
              </h4>
              {entry.investor?.firm && (
                <p className="text-xs text-gray-500 truncate">
                  {entry.investor.firm}
                </p>
              )}
            </div>

            {/* Match score badge */}
            {entry.matchScore !== null && (
              <span
                className={cn(
                  "text-xs font-bold px-1.5 py-0.5 rounded",
                  getScoreColor(entry.matchScore)
                )}
              >
                {entry.matchScore}
              </span>
            )}
          </div>

          {/* Last contact */}
          {entry.lastContactAt && (
            <div className="flex items-center gap-1 mt-2 text-xs text-gray-400">
              <CalendarDays className="h-3 w-3" />
              {new Date(entry.lastContactAt).toLocaleDateString()}
            </div>
          )}

          {/* Next action */}
          {entry.nextAction && (
            <div className="mt-2 p-1.5 bg-gray-50 dark:bg-gray-800/50 rounded text-xs text-gray-600 dark:text-gray-400 truncate">
              Next: {entry.nextAction}
              {entry.nextActionDate && (
                <span className="text-gray-400 ml-1">
                  ({new Date(entry.nextActionDate).toLocaleDateString()})
                </span>
              )}
            </div>
          )}

          {/* Notes preview */}
          {entry.notes && (
            <p className="mt-1.5 text-xs text-gray-400 line-clamp-2">
              {entry.notes}
            </p>
          )}

          {/* Move stage button */}
          <div className="mt-2 relative">
            <button
              onClick={onToggleStageDropdown}
              className="text-xs text-[#ff6a1a] hover:underline flex items-center gap-1"
            >
              Move stage
              <ChevronDown className="h-3 w-3" />
            </button>

            {stageDropdownOpen && (
              <div className="absolute top-6 left-0 z-20 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 min-w-[140px]">
                {PIPELINE_STAGES.filter((s) => s.key !== currentStage).map(
                  (stage) => (
                    <button
                      key={stage.key}
                      onClick={() => onStageChange(stage.key)}
                      className="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                    >
                      <span
                        className={cn(
                          "w-2 h-2 rounded-full",
                          stage.headerColor.replace("border-", "bg-")
                        )}
                      />
                      {stage.label}
                    </button>
                  )
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
