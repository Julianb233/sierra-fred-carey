"use client"
import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { captureError } from "@/lib/sentry"

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { captureError(error) }, [error])
  return (
    <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4">
      <h2 className="text-lg font-semibold">Something went wrong</h2>
      <p className="text-sm text-muted-foreground">We hit an unexpected error. Try refreshing.</p>
      <Button onClick={reset} variant="outline">Try again</Button>
    </div>
  )
}
