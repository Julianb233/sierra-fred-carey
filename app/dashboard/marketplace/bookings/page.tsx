"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ShoppingBag, ArrowLeft } from "lucide-react"

// =============================================================================
// Bookings -- Coming Soon (AI-8891: disabled until ready)
// =============================================================================

export default function BookingsPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto flex flex-col items-center justify-center py-24 px-4 text-center">
        <div className="h-20 w-20 rounded-full bg-orange-500/10 flex items-center justify-center mb-6">
          <ShoppingBag className="h-10 w-10 text-orange-400" />
        </div>

        <h1 className="text-2xl font-bold tracking-tight mb-3">
          Bookings Coming Soon
        </h1>

        <p className="text-muted-foreground max-w-md mb-8">
          Once our marketplace launches you&apos;ll be able to manage your
          service bookings here.
        </p>

        <Button asChild variant="outline">
          <Link href="/dashboard" className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
        </Button>
      </div>
    </div>
  )
}
