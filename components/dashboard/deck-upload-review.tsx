"use client"

import { useState, useRef, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Upload, FileUp, Loader2, RotateCcw, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { DeckScoreCard } from "@/components/dashboard/deck-score-card"
import type { DeckScorecard } from "@/types/deck-review"

type UploadState = "idle" | "uploading" | "analyzing" | "complete" | "error"

interface DeckUploadReviewProps {
  onReviewComplete?: (scorecard: DeckScorecard) => void
}

export function DeckUploadReview({ onReviewComplete }: DeckUploadReviewProps) {
  const [state, setState] = useState<UploadState>("idle")
  const [dragActive, setDragActive] = useState(false)
  const [scorecard, setScorecard] = useState<DeckScorecard | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }, [])

  const processFile = useCallback(
    async (file: File) => {
      // Validate file type
      if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
        toast.error("Only PDF files are supported for deck scoring.")
        return
      }

      // Validate file size (10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error("File size exceeds 10MB limit.")
        return
      }

      setState("uploading")
      setErrorMessage(null)
      setScorecard(null)

      try {
        // Short delay then switch to "analyzing" to reflect actual state
        setTimeout(() => {
          setState((prev) => (prev === "uploading" ? "analyzing" : prev))
        }, 1000)

        const formData = new FormData()
        formData.append("file", file)

        const response = await fetch("/api/dashboard/deck-review", {
          method: "POST",
          body: formData,
        })

        const data = await response.json()

        if (!response.ok || !data.success) {
          throw new Error(data.error || "Failed to score the deck")
        }

        setScorecard(data.scorecard)
        setState("complete")
        onReviewComplete?.(data.scorecard)
      } catch (err) {
        const message = err instanceof Error ? err.message : "Something went wrong"
        setErrorMessage(message)
        setState("error")
        toast.error(message)
      }
    },
    [onReviewComplete]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setDragActive(false)

      const file = e.dataTransfer.files?.[0]
      if (file) processFile(file)
    },
    [processFile]
  )

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) processFile(file)
      if (inputRef.current) inputRef.current.value = ""
    },
    [processFile]
  )

  const handleReset = useCallback(() => {
    setState("idle")
    setScorecard(null)
    setErrorMessage(null)
  }, [])

  return (
    <div className="space-y-4">
      {/* Upload zone -- visible in idle and error states */}
      {(state === "idle" || state === "error") && (
        <Card
          className={cn(
            "border-2 border-dashed transition-all cursor-pointer",
            dragActive
              ? "border-[#ff6a1a] bg-[#ff6a1a]/5"
              : "border-gray-200 dark:border-gray-700 hover:border-[#ff6a1a]/50"
          )}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
        >
          <CardContent className="py-8">
            <div className="text-center">
              <Upload className="h-8 w-8 mx-auto text-[#ff6a1a]/60 mb-3" />
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Drop your pitch deck PDF here
              </p>
              <p className="text-xs text-muted-foreground mb-3">
                PDF files up to 10MB
              </p>
              <Button
                variant="outline"
                size="sm"
                className="border-[#ff6a1a]/30 text-[#ff6a1a] hover:bg-[#ff6a1a]/10"
                onClick={(e) => {
                  e.stopPropagation()
                  inputRef.current?.click()
                }}
              >
                <FileUp className="h-4 w-4 mr-1" />
                Choose PDF
              </Button>
              <input
                ref={inputRef}
                type="file"
                accept=".pdf,application/pdf"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>

            {state === "error" && errorMessage && (
              <div className="mt-4 flex items-center justify-center gap-2 text-red-600 dark:text-red-400">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">{errorMessage}</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Analyzing state */}
      {(state === "uploading" || state === "analyzing") && (
        <Card className="border-[#ff6a1a]/20">
          <CardContent className="py-12">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-10 w-10 animate-spin text-[#ff6a1a]" />
              <div className="text-center">
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {state === "uploading"
                    ? "Uploading your deck..."
                    : "Analyzing your deck..."}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  This takes about 30 seconds. We are scoring 7 investor dimensions.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {state === "complete" && scorecard && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Scorecard Results
            </h3>
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              className="border-[#ff6a1a]/30 text-[#ff6a1a] hover:bg-[#ff6a1a]/10"
            >
              <RotateCcw className="h-4 w-4 mr-1" />
              Upload Another
            </Button>
          </div>
          <DeckScoreCard scorecard={scorecard} />
        </div>
      )}
    </div>
  )
}
