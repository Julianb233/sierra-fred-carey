"use client"

import { useState, useEffect, useCallback } from "react"
import type { OasesProgress } from "@/types/oases"

export function useOasesProgress() {
  const [progress, setProgress] = useState<OasesProgress | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const res = await fetch("/api/oases/progress")
      if (!res.ok) throw new Error("Failed to load progress")
      const data = await res.json()
      if (data.success) setProgress(data.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { progress, isLoading, error, refresh }
}
