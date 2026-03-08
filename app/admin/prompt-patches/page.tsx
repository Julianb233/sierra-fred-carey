"use client"

import { useEffect, useState, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { PlusIcon } from "lucide-react"
import { PromptPatchCard } from "@/components/admin/prompt-patch-card"
import { PromptPatchReview } from "@/components/admin/prompt-patch-review"
import { toast } from "sonner"
import type { PromptPatch, PatchStatus } from "@/lib/rlhf/types"

type FilterTab = "all" | PatchStatus

export default function PromptPatchesPage() {
  const [patches, setPatches] = useState<PromptPatch[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterTab>("all")
  const [selectedPatch, setSelectedPatch] = useState<PromptPatch | null>(null)
  const [sourceInsight, setSourceInsight] = useState<Record<string, unknown> | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newPatch, setNewPatch] = useState({ title: "", content: "", topic: "" })
  const [isCreating, setIsCreating] = useState(false)

  const fetchPatches = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/prompt-patches")
      if (response.ok) {
        const data = await response.json()
        setPatches(data.patches || [])
      }
    } catch (error) {
      console.error("Error fetching patches:", error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPatches()
  }, [fetchPatches])

  async function handleViewDetails(id: string) {
    try {
      const response = await fetch(`/api/admin/prompt-patches/${id}`)
      if (response.ok) {
        const data = await response.json()
        setSelectedPatch(data.patch)
        setSourceInsight(data.sourceInsight)
      }
    } catch (error) {
      console.error("Error fetching patch:", error)
    }
  }

  async function handleApprove(id: string) {
    try {
      const response = await fetch(`/api/admin/prompt-patches/${id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approvedBy: "admin" }),
      })
      if (response.ok) {
        toast.success("Patch approved")
        setSelectedPatch(null)
        fetchPatches()
      } else {
        const data = await response.json()
        toast.error(data.error || "Failed to approve")
      }
    } catch (error) {
      console.error("Error approving:", error)
      toast.error("Failed to approve patch")
    }
  }

  async function handleReject(id: string, reason?: string) {
    try {
      const response = await fetch(`/api/admin/prompt-patches/${id}`, {
        method: "DELETE",
      })
      if (response.ok) {
        toast.success("Patch rejected")
        setSelectedPatch(null)
        fetchPatches()
      }
    } catch (error) {
      console.error("Error rejecting:", error)
      toast.error("Failed to reject patch")
    }
  }

  async function handleActivate(id: string) {
    try {
      // First approve if draft, then a custom activate call
      const patch = patches.find((p) => p.id === id)
      if (patch?.status === "approved") {
        // For now, activate by updating status via the PATCH endpoint
        const response = await fetch(`/api/admin/prompt-patches/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "active" }),
        })
        if (response.ok) {
          toast.success("Patch activated")
          setSelectedPatch(null)
          fetchPatches()
        }
      }
    } catch (error) {
      console.error("Error activating:", error)
      toast.error("Failed to activate patch")
    }
  }

  async function handleDeactivate(id: string) {
    try {
      const response = await fetch(`/api/admin/prompt-patches/${id}`, {
        method: "DELETE",
      })
      if (response.ok) {
        toast.success("Patch deactivated")
        fetchPatches()
      }
    } catch (error) {
      console.error("Error deactivating:", error)
      toast.error("Failed to deactivate patch")
    }
  }

  async function handleLaunchTest(id: string, experimentName?: string) {
    if (!experimentName) return
    try {
      const response = await fetch(`/api/admin/prompt-patches/${id}/launch-test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ experimentName }),
      })
      if (response.ok) {
        toast.success("A/B test launched")
        setSelectedPatch(null)
        fetchPatches()
      } else {
        const data = await response.json()
        toast.error(data.error || "Failed to launch test")
      }
    } catch (error) {
      console.error("Error launching test:", error)
      toast.error("Failed to launch test")
    }
  }

  async function handleCreatePatch() {
    if (!newPatch.title.trim() || !newPatch.content.trim()) {
      toast.error("Title and content are required")
      return
    }

    setIsCreating(true)
    try {
      const response = await fetch("/api/admin/prompt-patches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newPatch),
      })
      if (response.ok) {
        toast.success("Patch created")
        setShowCreateForm(false)
        setNewPatch({ title: "", content: "", topic: "" })
        fetchPatches()
      } else {
        const data = await response.json()
        toast.error(data.error || "Failed to create patch")
      }
    } catch (error) {
      console.error("Error creating:", error)
      toast.error("Failed to create patch")
    } finally {
      setIsCreating(false)
    }
  }

  // If viewing a specific patch
  if (selectedPatch) {
    return (
      <div className="max-w-2xl mx-auto">
        <PromptPatchReview
          patch={selectedPatch}
          sourceInsight={sourceInsight as { title: string; description: string | null; category: string | null; severity: string; signal_count: number } | null}
          onApprove={handleApprove}
          onReject={handleReject}
          onActivate={handleActivate}
          onLaunchTest={(id, name) => handleLaunchTest(id, name)}
          onBack={() => setSelectedPatch(null)}
        />
      </div>
    )
  }

  const filteredPatches = filter === "all"
    ? patches
    : patches.filter((p) => p.status === filter)

  // Summary stats
  const draftCount = patches.filter((p) => p.status === "draft").length
  const activeCount = patches.filter((p) => p.status === "active").length
  const testingCount = patches.filter((p) => p.status === "testing").length

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-40" />
        </div>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-24 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Prompt Patches
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Review, approve, and deploy supplemental prompt instructions
          </p>
        </div>
        <Button variant="orange" onClick={() => setShowCreateForm(true)}>
          <PlusIcon className="mr-2 h-4 w-4" />
          Create Manual Patch
        </Button>
      </div>

      {/* Create form */}
      {showCreateForm && (
        <Card>
          <CardContent className="pt-6 space-y-4">
            <input
              type="text"
              placeholder="Patch title"
              value={newPatch.title}
              onChange={(e) => setNewPatch({ ...newPatch, title: e.target.value })}
              className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
            />
            <textarea
              placeholder="Supplemental prompt instruction..."
              value={newPatch.content}
              onChange={(e) => setNewPatch({ ...newPatch, content: e.target.value })}
              className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm font-mono"
              rows={4}
            />
            <input
              type="text"
              placeholder="Topic (optional, e.g. fundraising)"
              value={newPatch.topic}
              onChange={(e) => setNewPatch({ ...newPatch, topic: e.target.value })}
              className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
            />
            <div className="flex gap-2">
              <Button variant="orange" onClick={handleCreatePatch} disabled={isCreating}>
                {isCreating ? "Creating..." : "Create Patch"}
              </Button>
              <Button variant="outline" onClick={() => setShowCreateForm(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg border border-gray-200 dark:border-gray-800 p-3 text-center">
          <div className="text-2xl font-bold">{draftCount}</div>
          <div className="text-xs text-muted-foreground">Pending Review</div>
        </div>
        <div className="rounded-lg border border-gray-200 dark:border-gray-800 p-3 text-center">
          <div className="text-2xl font-bold">{activeCount}</div>
          <div className="text-xs text-muted-foreground">Active</div>
        </div>
        <div className="rounded-lg border border-gray-200 dark:border-gray-800 p-3 text-center">
          <div className="text-2xl font-bold">{testingCount}</div>
          <div className="text-xs text-muted-foreground">Testing</div>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1">
        {(
          [
            ["all", "All"],
            ["draft", "Draft"],
            ["approved", "Approved"],
            ["active", "Active"],
            ["testing", "Testing"],
            ["archived", "Archived"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setFilter(key as FilterTab)}
            className={`text-sm px-3 py-1.5 rounded-md transition-colors ${
              filter === key
                ? "bg-[#ff6a1a]/10 text-[#ff6a1a] font-medium"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Patch list */}
      <div className="space-y-4">
        {filteredPatches.map((patch) => (
          <PromptPatchCard
            key={patch.id}
            patch={patch}
            onApprove={handleApprove}
            onReject={(id) => handleReject(id)}
            onActivate={handleActivate}
            onDeactivate={handleDeactivate}
            onLaunchTest={(id) => handleLaunchTest(id, `patch-test-${id.slice(0, 8)}`)}
            onViewDetails={handleViewDetails}
          />
        ))}

        {filteredPatches.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-gray-500 dark:text-gray-400">
                {filter === "all"
                  ? "No prompt patches yet. Patches are auto-generated from feedback clusters or created manually."
                  : `No ${filter} patches found.`}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
