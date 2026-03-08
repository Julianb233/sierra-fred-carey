"use client"

/**
 * Patch Approval Queue
 *
 * Phase 76 Plan 02 (REQ-R4): Admin component for viewing and managing prompt
 * patches. Shows stat cards, a filterable table of patches, and a review
 * dialog with approve/reject/deploy/A-B-test/graduate actions.
 *
 * Uses the existing PromptPatch type from lib/feedback/types.ts and calls
 * the admin API routes at /api/admin/feedback/patches.
 */

import { useEffect, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"

// ---------------------------------------------------------------------------
// Types (matches PromptPatch from lib/feedback/types.ts)
// ---------------------------------------------------------------------------

interface PatchRow {
  id: string
  topic: string
  patch_type: string
  content: string
  status: string
  source_insight_id: string | null
  source_signal_ids: string[]
  generated_by: string
  approved_by: string | null
  approved_at: string | null
  experiment_id: string | null
  thumbs_up_before: number | null
  thumbs_up_after: number | null
  tracking_started_at: string | null
  tracking_ends_at: string | null
  version: number
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

type PatchStatus = "all" | "draft" | "pending_review" | "approved" | "active" | "rejected" | "retired"

// ---------------------------------------------------------------------------
// Status badge styling
// ---------------------------------------------------------------------------

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
  pending_review: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  approved: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  active: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  retired: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
}

function StatusBadge({ status }: { status: string }) {
  return (
    <Badge
      variant="outline"
      className={`capitalize ${STATUS_COLORS[status] || ""}`}
    >
      {status.replace("_", " ")}
    </Badge>
  )
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PatchApprovalQueue() {
  const [patches, setPatches] = useState<PatchRow[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<PatchStatus>("pending_review")
  const [selectedPatch, setSelectedPatch] = useState<PatchRow | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [rejectionReason, setRejectionReason] = useState("")
  const [actionLoading, setActionLoading] = useState(false)

  // -----------------------------------------------------------------------
  // Fetch patches
  // -----------------------------------------------------------------------

  const fetchPatches = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch(
        `/api/admin/feedback/patches?status=${statusFilter}&limit=100`
      )
      if (!res.ok) throw new Error("Failed to fetch patches")
      const data = await res.json()
      setPatches(data.patches || [])
    } catch (err) {
      console.error("[patch-queue] Fetch error:", err)
      toast.error("Failed to load patches")
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => {
    fetchPatches()
  }, [fetchPatches])

  // -----------------------------------------------------------------------
  // Stats
  // -----------------------------------------------------------------------

  const pendingCount = patches.filter(
    (p) => p.status === "pending_review" || p.status === "draft"
  ).length
  const activeCount = patches.filter((p) => p.status === "active").length
  const totalVersions = patches.reduce((sum, p) => sum + (p.version || 1), 0)

  // If viewing "all", compute stats from full list; otherwise show based on fetched
  const statsPatches = statusFilter === "all" ? patches : patches

  // -----------------------------------------------------------------------
  // Actions
  // -----------------------------------------------------------------------

  async function updatePatchStatus(
    id: string,
    newStatus: string,
    extra?: Record<string, unknown>
  ) {
    setActionLoading(true)
    try {
      const res = await fetch(`/api/admin/feedback/patches/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus, ...extra }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to update patch")
      }
      toast.success(`Patch ${newStatus.replace("_", " ")} successfully`)
      setDialogOpen(false)
      setSelectedPatch(null)
      setRejectionReason("")
      fetchPatches()
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Update failed"
      toast.error(msg)
    } finally {
      setActionLoading(false)
    }
  }

  async function startExperiment(id: string) {
    setActionLoading(true)
    try {
      const res = await fetch(
        `/api/admin/feedback/patches/${id}/experiment`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        }
      )
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to create experiment")
      }
      const data = await res.json()
      toast.success(`A/B test created: ${data.experimentName}`)
      setDialogOpen(false)
      setSelectedPatch(null)
      fetchPatches()
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Experiment creation failed"
      toast.error(msg)
    } finally {
      setActionLoading(false)
    }
  }

  // -----------------------------------------------------------------------
  // Helpers
  // -----------------------------------------------------------------------

  function getTitle(patch: PatchRow): string {
    const metaTitle = (patch.metadata as Record<string, unknown>)?.title
    if (typeof metaTitle === "string" && metaTitle) return metaTitle
    return patch.topic || "Untitled"
  }

  function getSignalCount(patch: PatchRow): number {
    const metaCount = (patch.metadata as Record<string, unknown>)?.signal_count
    if (typeof metaCount === "number") return metaCount
    return patch.source_signal_ids?.length || 0
  }

  function formatDate(dateStr: string): string {
    try {
      return new Date(dateStr).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    } catch {
      return dateStr
    }
  }

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pending Review</CardDescription>
            <CardTitle className="text-2xl">
              {loading ? <Skeleton className="h-8 w-12" /> : pendingCount}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active Patches</CardDescription>
            <CardTitle className="text-2xl">
              {loading ? <Skeleton className="h-8 w-12" /> : activeCount}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Versions</CardDescription>
            <CardTitle className="text-2xl">
              {loading ? <Skeleton className="h-8 w-12" /> : totalVersions}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-4">
        <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
          Filter by status:
        </label>
        <Select
          value={statusFilter}
          onValueChange={(val) => setStatusFilter(val as PatchStatus)}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Select status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="pending_review">Pending Review</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="retired">Retired</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={fetchPatches}>
          Refresh
        </Button>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Topic</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Signals</TableHead>
                <TableHead>Version</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 8 }).map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : patches.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="text-center py-8 text-gray-500"
                  >
                    No patches found for this status.
                  </TableCell>
                </TableRow>
              ) : (
                patches.map((patch) => (
                  <TableRow key={patch.id}>
                    <TableCell className="font-medium max-w-[200px] truncate">
                      {getTitle(patch)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {patch.topic || "general"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-gray-500">
                      {patch.generated_by}
                    </TableCell>
                    <TableCell>{getSignalCount(patch)}</TableCell>
                    <TableCell>v{patch.version || 1}</TableCell>
                    <TableCell>
                      <StatusBadge status={patch.status} />
                    </TableCell>
                    <TableCell className="text-xs text-gray-500">
                      {formatDate(patch.created_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedPatch(patch)
                          setDialogOpen(true)
                          setRejectionReason("")
                        }}
                      >
                        Review
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Review Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {selectedPatch && (
            <>
              <DialogHeader>
                <DialogTitle>{getTitle(selectedPatch)}</DialogTitle>
                <DialogDescription>
                  Review and manage this prompt patch
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                {/* Metadata badges */}
                <div className="flex flex-wrap gap-2">
                  <StatusBadge status={selectedPatch.status} />
                  <Badge variant="outline">
                    {selectedPatch.topic || "general"}
                  </Badge>
                  <Badge variant="outline">
                    v{selectedPatch.version || 1}
                  </Badge>
                  <Badge variant="outline">
                    {selectedPatch.patch_type}
                  </Badge>
                  {selectedPatch.experiment_id && (
                    <Badge variant="outline" className="bg-blue-50 dark:bg-blue-950">
                      Experiment: {selectedPatch.experiment_id}
                    </Badge>
                  )}
                </div>

                {/* Patch content */}
                <div>
                  <h4 className="text-sm font-medium mb-2">Patch Content</h4>
                  <pre className="rounded-md bg-gray-50 dark:bg-gray-900 p-4 font-mono text-sm whitespace-pre-wrap border-l-2 border-[#ff6a1a]">
                    {selectedPatch.content}
                  </pre>
                </div>

                {/* Generation metadata */}
                {selectedPatch.metadata && (
                  <div className="space-y-2 text-sm">
                    {(selectedPatch.metadata as Record<string, unknown>)?.rationale && (
                      <div>
                        <span className="font-medium text-gray-600 dark:text-gray-400">
                          Rationale:
                        </span>
                        <p className="mt-1">
                          {String((selectedPatch.metadata as Record<string, unknown>).rationale)}
                        </p>
                      </div>
                    )}
                    {(selectedPatch.metadata as Record<string, unknown>)?.confidence && (
                      <div>
                        <span className="font-medium text-gray-600 dark:text-gray-400">
                          Confidence:
                        </span>
                        <Badge variant="outline" className="ml-2 capitalize">
                          {String((selectedPatch.metadata as Record<string, unknown>).confidence)}
                        </Badge>
                      </div>
                    )}
                    {(selectedPatch.metadata as Record<string, unknown>)?.signal_count && (
                      <div>
                        <span className="font-medium text-gray-600 dark:text-gray-400">
                          Signal count:
                        </span>{" "}
                        {String((selectedPatch.metadata as Record<string, unknown>).signal_count)}
                      </div>
                    )}
                  </div>
                )}

                {/* Tracking metrics */}
                {selectedPatch.tracking_started_at && (
                  <div className="text-sm border rounded-md p-3 space-y-1">
                    <h4 className="font-medium">Tracking Window</h4>
                    <p>
                      Started: {formatDate(selectedPatch.tracking_started_at)}
                      {selectedPatch.tracking_ends_at &&
                        ` | Ends: ${formatDate(selectedPatch.tracking_ends_at)}`}
                    </p>
                    {selectedPatch.thumbs_up_before !== null && (
                      <p>Baseline thumbs ratio: {(selectedPatch.thumbs_up_before * 100).toFixed(1)}%</p>
                    )}
                    {selectedPatch.thumbs_up_after !== null && (
                      <p>Post-deployment ratio: {(selectedPatch.thumbs_up_after * 100).toFixed(1)}%</p>
                    )}
                  </div>
                )}

                {/* Source signals */}
                {selectedPatch.source_signal_ids?.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-1">
                      Source Signals ({selectedPatch.source_signal_ids.length})
                    </h4>
                    <div className="flex flex-wrap gap-1">
                      {selectedPatch.source_signal_ids.slice(0, 10).map((sid) => (
                        <Badge
                          key={sid}
                          variant="outline"
                          className="text-xs font-mono"
                        >
                          {sid.slice(0, 8)}...
                        </Badge>
                      ))}
                      {selectedPatch.source_signal_ids.length > 10 && (
                        <Badge variant="outline" className="text-xs">
                          +{selectedPatch.source_signal_ids.length - 10} more
                        </Badge>
                      )}
                    </div>
                  </div>
                )}

                {/* Rejection reason (for pending/draft patches) */}
                {(selectedPatch.status === "pending_review" ||
                  selectedPatch.status === "draft") && (
                  <div>
                    <h4 className="text-sm font-medium mb-1">
                      Rejection Reason (optional)
                    </h4>
                    <Textarea
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder="Enter reason for rejection..."
                      rows={2}
                    />
                  </div>
                )}
              </div>

              {/* Action buttons based on status */}
              <DialogFooter className="flex-col sm:flex-row gap-2">
                {/* Draft/Pending: Reject, Approve */}
                {(selectedPatch.status === "draft" ||
                  selectedPatch.status === "pending_review") && (
                  <>
                    <Button
                      variant="outline"
                      disabled={actionLoading}
                      onClick={() =>
                        updatePatchStatus(selectedPatch.id, "rejected", {
                          reason: rejectionReason || undefined,
                        })
                      }
                    >
                      Reject
                    </Button>
                    <Button
                      variant="outline"
                      disabled={actionLoading}
                      onClick={() =>
                        updatePatchStatus(selectedPatch.id, selectedPatch.status === "draft" ? "pending_review" : "approved")
                      }
                    >
                      {selectedPatch.status === "draft" ? "Submit for Review" : "Approve"}
                    </Button>
                  </>
                )}

                {/* Approved: Deploy, Start A/B Test */}
                {selectedPatch.status === "approved" && (
                  <>
                    <Button
                      variant="outline"
                      disabled={actionLoading}
                      onClick={() =>
                        updatePatchStatus(selectedPatch.id, "active")
                      }
                    >
                      Deploy (Start Tracking)
                    </Button>
                    <Button
                      variant="orange"
                      disabled={actionLoading}
                      onClick={() => startExperiment(selectedPatch.id)}
                    >
                      Start A/B Test
                    </Button>
                  </>
                )}

                {/* Active: Retire */}
                {selectedPatch.status === "active" && (
                  <Button
                    variant="outline"
                    disabled={actionLoading}
                    onClick={() =>
                      updatePatchStatus(selectedPatch.id, "retired")
                    }
                  >
                    Retire (Make Permanent)
                  </Button>
                )}

                {/* Rejected: Re-draft */}
                {selectedPatch.status === "rejected" && (
                  <Button
                    variant="outline"
                    disabled={actionLoading}
                    onClick={() =>
                      updatePatchStatus(selectedPatch.id, "draft")
                    }
                  >
                    Return to Draft
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
