"use client"

/**
 * Bug Report Widget
 *
 * AI-8499: Floating "Report a Bug" button visible on all authenticated dashboard pages.
 * Opens a modal with: title, description, category, auto-attached page URL + user ID.
 * Submits to POST /api/bug-report which stores in Supabase and creates a Linear issue.
 */

import { useState } from "react"
import { usePathname } from "next/navigation"
import { Bug } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

const BUG_CATEGORIES = [
  { value: "ui", label: "UI / Visual" },
  { value: "functionality", label: "Broken Feature" },
  { value: "performance", label: "Slow / Laggy" },
  { value: "data", label: "Wrong Data" },
  { value: "other", label: "Other" },
] as const

type BugCategory = (typeof BUG_CATEGORIES)[number]["value"]

export function BugReportWidget() {
  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const pathname = usePathname()

  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [category, setCategory] = useState<BugCategory | "">("")

  function resetForm() {
    setTitle("")
    setDescription("")
    setCategory("")
    setSubmitted(false)
  }

  function handleOpen() {
    if (submitted) resetForm()
    setOpen(true)
  }

  async function handleSubmit() {
    if (!title.trim()) {
      toast.error("Please provide a short title for the bug")
      return
    }
    if (!description.trim()) {
      toast.error("Please describe what happened")
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch("/api/bug-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          category: category || "other",
          pageUrl: pathname,
          userAgent: navigator.userAgent,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "Failed to submit bug report")
      }

      toast.success("Bug reported! We'll look into it.")
      setSubmitted(true)
      setOpen(false)
      resetForm()
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to submit bug report"
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      {/* Floating bug report button -- bottom-left, above mobile nav */}
      <button
        onClick={handleOpen}
        aria-label="Report a bug"
        className={cn(
          "fixed z-50 left-4 lg:left-6",
          "bottom-[calc(5rem+env(safe-area-inset-bottom,0px))]",
          "md:bottom-[calc(1.5rem+env(safe-area-inset-bottom,0px))]",
          "flex items-center gap-2 rounded-full px-4 py-2.5",
          "bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900",
          "shadow-lg hover:shadow-xl transition-all duration-200",
          "hover:scale-105 active:scale-95",
          "text-sm font-medium"
        )}
      >
        <Bug className="h-4 w-4" />
        <span className="hidden sm:inline">Report Bug</span>
      </button>

      {/* Bug report modal */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Report a Bug</DialogTitle>
            <DialogDescription>
              Found something broken? Let us know and we&apos;ll fix it.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Title */}
            <div className="space-y-1.5">
              <label
                htmlFor="bug-title"
                className="text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                What went wrong? <span className="text-red-500">*</span>
              </label>
              <Input
                id="bug-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder='e.g. "Dashboard chart not loading"'
                maxLength={200}
              />
            </div>

            {/* Category */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Category
              </label>
              <div className="flex flex-wrap gap-2">
                {BUG_CATEGORIES.map((cat) => (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => setCategory(cat.value)}
                    className={cn(
                      "rounded-md border px-3 py-1.5 text-xs font-medium transition-colors",
                      category === cat.value
                        ? "border-[#ff6a1a] bg-[#ff6a1a]/10 text-[#ff6a1a]"
                        : "border-gray-200 text-gray-600 hover:border-gray-300 dark:border-gray-700 dark:text-gray-400"
                    )}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label
                htmlFor="bug-description"
                className="text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Details <span className="text-red-500">*</span>
              </label>
              <Textarea
                id="bug-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What were you doing? What happened vs. what you expected?"
                rows={4}
                maxLength={2000}
              />
              <p className="text-xs text-gray-400">
                {description.length}/2000
              </p>
            </div>

            {/* Auto-attached context note */}
            <p className="text-xs text-gray-400">
              Page URL and your account are automatically attached.
            </p>

            {/* Submit */}
            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full bg-[#ff6a1a] hover:bg-[#ea580c]"
            >
              {submitting ? "Submitting..." : "Submit Bug Report"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
